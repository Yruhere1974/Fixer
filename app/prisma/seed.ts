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
      retentionCategory: "STANDARD_SERVICE",
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
