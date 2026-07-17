/**
 * Seeds staff roles and ONE fictional client, then exercises the consent guard end-to-end.
 * Uses only fictional data — never real client PII (plan Phase 5, §4 "Not Included").
 * Run with: npm run db:seed
 */
import { evaluateDisclosure, recordDisclosure } from "@/lib/consent";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const FICTIONAL_MARKER = "[FICTIONAL]";
const DEV_PASSWORD = "password123"; // fictional/dev only

async function main() {
  // --- Staff (plan §5): individual accounts, distinct roles. All share a dev password. ---
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const staff = [
    { email: "founder@fixer.local", name: "Founder (fictional)", role: "FOUNDER" as const },
    { email: "navigator@fixer.local", name: "Navigator (fictional)", role: "NAVIGATOR" as const },
    { email: "navigator2@fixer.local", name: "Second Navigator (fictional)", role: "NAVIGATOR" as const },
    { email: "privacy@fixer.local", name: "Privacy Lead (fictional)", role: "PRIVACY_LEAD" as const },
    { email: "bookkeeper@fixer.local", name: "Bookkeeper (fictional)", role: "BOOKKEEPER" as const },
  ];
  for (const s of staff) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash, name: s.name, role: s.role, active: true },
      create: { ...s, passwordHash },
    });
  }
  const navigator = await prisma.user.findUniqueOrThrow({ where: { email: "navigator@fixer.local" } });
  const navigator2 = await prisma.user.findUniqueOrThrow({ where: { email: "navigator2@fixer.local" } });

  // --- Reset any prior fictional client so the seed is idempotent ---
  await prisma.client.deleteMany({ where: { displayName: { startsWith: FICTIONAL_MARKER } } });

  // --- One fictional client walked through the journey (workflow.md) ---
  const client = await prisma.client.create({
    data: {
      displayName: `${FICTIONAL_MARKER} Jordan Rivers`,
      contactEmail: "jordan.fictional@example.com",
      preferredChannel: "SECURE_PORTAL",
      status: "ACTIVE",
      assignedNavigatorId: navigator.id,
      backupNavigatorId: navigator2.id,
      lastContactAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      nextContactDueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // overdue -> contact-due exception
      retentionCategory: "STANDARD_SERVICE",
      maintenanceGuidance:
        "Attend the booked physiotherapy sessions; call the navigator if transportation falls through. Review supports again in 3 months.",
      inquiry: {
        create: {
          source: "Website enquiry",
          generalReason: "Feeling overwhelmed coordinating supports for an aging parent.",
          fitDecision: "IN_SCOPE",
          fitReason: "Non-clinical coordination is within scope.",
          packageDiscussed: "Clarity Session",
          becameClient: true,
          handledById: navigator.id,
        },
      },
      screening: {
        create: {
          withinScope: true,
          immediateConcern: false,
          objectiveFacts: "No immediate safety or medical concern reported during fit call.",
          actionTaken: "Proceeded to normal intake.",
          outcome: "PROCEED",
          screenedById: navigator.id,
        },
      },
      agreement: {
        create: {
          servicePackage: "Clarity Session",
          versionAccepted: "SA-v1.0",
          feesConfirmed: true,
          responseTimesConfirmed: true,
          method: "ELECTRONIC_ACCEPTANCE",
          signedAt: new Date(),
          contactCadenceDays: 7,
          includedProactiveContacts: 4,
          responseWindowHours: 4,
          includedHours: 5,
          overageRate: 90,
          authorizedFamilyRecipients: 2,
          travelRadiusKm: 25,
          afterHoursPolicy: "No after-hours contact except safety escalation.",
        },
      },
      intake: {
        create: {
          preferredName: "Jordan",
          pronouns: "they/them",
          language: "English",
          communicationMethod: "SECURE_PORTAL",
          serviceObjective: "Organize appointments and supports into one clear plan.",
          topPriorities: "Find a physiotherapist; arrange transportation.",
          budgetRange: "$500–$1000",
          doNotShare: "Do not share financial details with family.",
        },
      },
      actionPlan: {
        create: {
          desiredOutcome: "A clear, approved plan the client can follow.",
          items: {
            create: [
              {
                title: "Shortlist three physiotherapists and verify registration.",
                priority: "HIGH",
                ownerId: navigator.id,
                status: "IN_PROGRESS",
                estimatedCost: 0,
                approvalStatus: "NOT_REQUIRED",
                nextAction: "Confirm College of Physical Therapists registration for each.",
              },
              {
                title: "Arrange transportation for first appointment.",
                priority: "MEDIUM",
                ownerId: navigator.id,
                status: "NOT_STARTED",
                approvalStatus: "PENDING",
                estimatedCost: 60,
                backupOption: "Family member drives if HandyDART unavailable.",
              },
            ],
          },
        },
      },
    },
  });

  // Approved contact (daughter) with explicit information limits (plan §6.4).
  const daughter = await prisma.approvedContact.create({
    data: {
      clientId: client.id,
      name: "Alex Rivers (fictional)",
      relationship: "Daughter",
      permittedInfo: ["SCHEDULING", "PROVIDER_COORDINATION"],
      channels: ["EMAIL"],
    },
  });

  // Active FAMILY_UPDATE consent — scoped to scheduling/coordination, email only, this recipient.
  await prisma.consentRecord.create({
    data: {
      clientId: client.id,
      type: "FAMILY_UPDATE",
      grantedByName: "Jordan Rivers",
      coveredInfo: ["SCHEDULING", "PROVIDER_COORDINATION"],
      purpose: "Keep daughter informed of appointment logistics.",
      excludedInfo: "No financial information.",
      channels: ["EMAIL"],
      method: "ELECTRONIC_ACCEPTANCE",
      versionAccepted: "CONSENT-v1.0",
      recordedById: navigator.id,
      recipients: { connect: { id: daughter.id } },
    },
  });

  // --- Provider directory (§17.7): a verified, a pending, and a stale entry ---
  await prisma.provider.deleteMany({ where: { name: { startsWith: FICTIONAL_MARKER } } });
  const DAY = 24 * 60 * 60 * 1000;
  await prisma.provider.create({
    data: {
      name: `${FICTIONAL_MARKER} Okanagan Physiotherapy`,
      category: "PHYSIOTHERAPY",
      servicesOffered: "Orthopaedic and post-surgical physiotherapy; home visits available.",
      location: "Kelowna",
      status: "ACTIVE",
      verifiedAt: new Date(),
      verificationSource: "College of Physical Therapists of BC register",
      verifiedById: navigator.id,
      lastReviewDate: new Date(),
      nextReviewDate: new Date(Date.now() + 90 * DAY),
    },
  });
  await prisma.provider.create({
    data: {
      name: `${FICTIONAL_MARKER} Lakeview Counselling`,
      category: "COUNSELLING",
      servicesOffered: "Individual and family counselling; sliding-scale fees.",
      location: "Kelowna",
      status: "PENDING_VERIFICATION",
    },
  });
  await prisma.provider.create({
    data: {
      name: `${FICTIONAL_MARKER} Valley HandyDART Rides`,
      category: "TRANSPORTATION",
      servicesOffered: "Accessible transportation to appointments.",
      location: "Central Okanagan",
      status: "ACTIVE",
      verifiedAt: new Date(Date.now() - 120 * DAY),
      verificationSource: "Business licence + insurance certificate",
      verifiedById: navigator.id,
      lastReviewDate: new Date(Date.now() - 120 * DAY),
      nextReviewDate: new Date(Date.now() - 30 * DAY), // review overdue -> displays stale
    },
  });

  // --- Incident log (§6.12, §17.5): one open privacy near-miss, review overdue ---
  await prisma.incidentRecord.deleteMany({ where: { reportedByName: { startsWith: FICTIONAL_MARKER } } });
  await prisma.incidentRecord.create({
    data: {
      type: "PRIVACY_EVENT",
      severity: "MEDIUM",
      status: "OPEN",
      clientId: client.id,
      reportedByName: `${FICTIONAL_MARKER} Navigator (fictional)`,
      description: "An appointment reminder email was nearly sent to the wrong recipient; caught before sending.",
      immediateAction: "Cancelled the draft; re-checked the recipient list.",
      reviewDueAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // review overdue -> exception
      createdById: navigator.id,
    },
  });

  // --- Privacy request (§6.13): an access request, response overdue ---
  await prisma.privacyRequest.deleteMany({ where: { requesterName: { startsWith: FICTIONAL_MARKER } } });
  await prisma.privacyRequest.create({
    data: {
      type: "ACCESS",
      status: "RECEIVED",
      clientId: client.id,
      requesterName: `${FICTIONAL_MARKER} Jordan Rivers`,
      scope: "Access to all coordination notes and the current action plan.",
      receivedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      responseDueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // overdue -> exception
      assignedToId: navigator.id,
      createdById: navigator.id,
    },
  });

  // --- Client promises (white-glove #4) ---
  await prisma.clientPromise.create({
    data: {
      clientId: client.id,
      description: "Confirm the physio slot and email you by Tuesday 3pm.",
      madeToName: "Client",
      dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue -> promises-due exception
      createdById: navigator.id,
    },
  });
  await prisma.clientPromise.create({
    data: {
      clientId: client.id,
      description: "Send the verified provider shortlist.",
      madeToName: "Client",
      status: "KEPT",
      keptAt: new Date(),
      toldBeforeDeadline: true,
      clientWaiting: false,
      createdById: navigator.id,
    },
  });

  // --- Tier 2: appointment, warm handoff, service recovery ---
  await prisma.appointment.create({
    data: {
      clientId: client.id,
      purpose: "Physiotherapy appointment",
      providerName: "Okanagan Physiotherapy",
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // upcoming -> exception
      location: "Kelowna",
      transportation: "HandyDART booked",
      whatToBring: "Referral letter, list of medications.",
      clientQuestions: "What exercises can I do at home?",
      status: "CONFIRMED",
      locationConfirmed: true,
      transportConfirmed: true,
      createdById: navigator.id,
    },
  });
  await prisma.handoff.create({
    data: {
      clientId: client.id,
      toName: "Bookkeeper (fictional)",
      reason: "Bookkeeper will prepare the monthly invoice.",
      commitment: "Issue the invoice by Friday.",
      permissionObtained: true,
      introduced: true,
      createdById: navigator.id,
    },
  });
  await prisma.serviceRecovery.create({
    data: {
      clientId: client.id,
      issueType: "MISSED_CALLBACK",
      description: "A promised callback on Monday was missed.",
      acknowledgement: "Apologised same day and explained the cause.",
      ownerId: navigator.id, // open -> exception
    },
  });

  // --- Client feedback (white-glove scorecard) ---
  await prisma.clientFeedback.create({
    data: {
      clientId: client.id,
      effortScore: 5,
      confidenceScore: 4,
      context: "After first appointment",
      comment: "Everything was arranged for me and I knew exactly what to expect.",
      recordedById: navigator.id,
    },
  });

  // --- Decision log (§6.10) ---
  await prisma.decision.create({
    data: {
      clientId: client.id,
      question: "Which physiotherapy option should we pursue first?",
      optionsPresented: "Okanagan Physiotherapy (home visits) vs a clinic-based provider.",
      decision: "Start with Okanagan Physiotherapy for home visits.",
      decisionMaker: "Jordan Rivers",
      reason: "Home visits reduce transportation burden.",
      affectedTasks: "Shortlist physiotherapists.",
      recordedById: navigator.id,
    },
  });

  // --- Billing (§6.11): a pending + an approved expense, and an overdue sent invoice ---
  await prisma.invoice.deleteMany({ where: { number: { startsWith: "SEED-" } } });
  await prisma.expense.create({
    data: {
      clientId: client.id,
      description: "Accessible transportation to first appointment",
      amount: 60,
      status: "REQUESTED", // awaiting client approval -> exception
      createdById: navigator.id,
    },
  });
  const approvedExpense = await prisma.expense.create({
    data: {
      clientId: client.id,
      description: "Courier of intake documents",
      amount: 24.5,
      status: "APPROVED",
      decidedById: navigator.id,
      decidedAt: new Date(),
      createdById: navigator.id,
    },
  });
  await prisma.invoice.create({
    data: {
      clientId: client.id,
      number: "SEED-0001",
      status: "SENT",
      issueDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // overdue -> exception
      createdById: navigator.id,
      items: {
        create: [
          { description: "Clarity Session — coordination", kind: "SERVICE_FEE", quantity: 3, unitAmount: 90, amount: 270 },
          { description: approvedExpense.description, kind: "THIRD_PARTY_EXPENSE", amount: 24.5, sourceExpenseId: approvedExpense.id },
        ],
      },
    },
  });

  // --- A closed client past its retention date, eligible for destruction (§8.8) ---
  await prisma.client.create({
    data: {
      displayName: `${FICTIONAL_MARKER} Past Client (retention due)`,
      status: "CLOSED",
      closedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      assignedNavigatorId: navigator.id,
      retentionCategory: "STANDARD_SERVICE",
      retentionReviewDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // past -> eligible
    },
  });
  await prisma.client.create({
    data: {
      displayName: `${FICTIONAL_MARKER} Held Client (legal hold)`,
      status: "CLOSED",
      closedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      assignedNavigatorId: navigator.id,
      retentionCategory: "INCIDENT_LEGAL",
      retentionReviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      legalHold: true, // past review date but preserved -> on hold
    },
  });

  // --- Prove the guard both ways (this is the slice-1 verification) ---
  console.log(`\nSeeded fictional client ${client.displayName} (${client.id})\n`);

  const allowed = await evaluateDisclosure({
    clientId: client.id,
    category: "SCHEDULING",
    consentType: "FAMILY_UPDATE",
    channel: "EMAIL",
    recipientContactId: daughter.id,
  });
  console.log("Scheduling update to daughter via email:");
  console.log(`  allowed=${allowed.allowed} — ${allowed.reason}`);

  const blockedCategory = await recordDisclosure({
    clientId: client.id,
    category: "HEALTH_SENSITIVE",
    consentType: "FAMILY_UPDATE",
    channel: "EMAIL",
    recipientContactId: daughter.id,
    recipientName: daughter.name,
    infoSummary: "Attempted to share a health detail with family.",
    purpose: "Family update",
    senderId: navigator.id,
  });
  console.log("\nHealth-sensitive detail to daughter via email:");
  console.log(
    `  allowed=${blockedCategory.decision.allowed} — ${blockedCategory.decision.reason}`,
  );

  const blockedChannel = await recordDisclosure({
    clientId: client.id,
    category: "SCHEDULING",
    consentType: "FAMILY_UPDATE",
    channel: "SMS",
    recipientContactId: daughter.id,
    recipientName: daughter.name,
    infoSummary: "Attempted to text an appointment time.",
    purpose: "Family update",
    senderId: navigator.id,
  });
  console.log("\nScheduling update to daughter via SMS (channel not permitted):");
  console.log(
    `  allowed=${blockedChannel.decision.allowed} — ${blockedChannel.decision.reason}`,
  );

  const auditCount = await prisma.auditEvent.count({ where: { clientId: client.id } });
  const blockedCount = await prisma.disclosure.count({
    where: { clientId: client.id, allowed: false },
  });
  console.log(
    `\nAudit events for client: ${auditCount}. Blocked disclosures recorded: ${blockedCount}.`,
  );
  console.log("\nSeed complete.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
