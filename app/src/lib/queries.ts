import { prisma } from "@/lib/db";
import { consentStatus } from "@/lib/consent";
import { canAccessClient, canViewAllClients } from "@/lib/access";
import type { ServiceCategory, User } from "@/generated/prisma/client";

/**
 * Dashboard client list, scoped to what the user may see (§5, ADR 0003). Navigators and
 * assistants receive only clients assigned to them; the filter is applied in the query so
 * unauthorized records never leave the database.
 */
export async function listClients(user: Pick<User, "id" | "role">) {
  return prisma.client.findMany({
    where: canViewAllClients(user.role) ? undefined : { assignedNavigatorId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      assignedNavigator: { select: { name: true } },
      _count: { select: { consents: true, approvedContacts: true } },
    },
  });
}

/**
 * The exception view (plan §6.5): the things that need attention, not the happy path.
 * Kept deliberately small for the first slice — overdue, blocked, awaiting approval,
 * and permissions about to expire.
 */
export async function getExceptions(user: Pick<User, "id" | "role">, now: Date = new Date()) {
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Scope every exception list to the clients this user may see (§5).
  const clientScope = canViewAllClients(user.role) ? {} : { assignedNavigatorId: user.id };
  const itemScope = { plan: { is: { client: { is: clientScope } } } };

  const [overdue, blocked, awaitingApproval, activeConsents, pendingChanges, pendingExpenses, contactDue, promisesDue, upcomingAppointments, openRecoveries] = await Promise.all([
    prisma.actionItem.findMany({
      where: { dueDate: { lt: now }, status: { not: "DONE" }, ...itemScope },
      include: { plan: { include: { client: { select: { id: true, displayName: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: { status: "BLOCKED", ...itemScope },
      include: { plan: { include: { client: { select: { id: true, displayName: true } } } } },
    }),
    prisma.actionItem.findMany({
      where: { OR: [{ status: "AWAITING_APPROVAL" }, { approvalStatus: "PENDING" }], ...itemScope },
      include: { plan: { include: { client: { select: { id: true, displayName: true } } } } },
    }),
    prisma.consentRecord.findMany({
      where: { withdrawnAt: null, expiryDate: { not: null, lte: soon }, client: { is: clientScope } },
      include: { client: { select: { id: true, displayName: true } } },
    }),
    prisma.changeRequest.findMany({
      where: { status: "PENDING", client: { is: clientScope } },
      include: { client: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { status: "REQUESTED", client: { is: clientScope } },
      include: { client: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.client.findMany({
      where: { status: { not: "CLOSED" }, nextContactDueAt: { not: null, lte: now }, ...clientScope },
      select: { id: true, displayName: true, nextContactDueAt: true },
      orderBy: { nextContactDueAt: "asc" },
    }),
    prisma.clientPromise.findMany({
      where: { status: "OPEN", dueAt: { not: null, lte: now }, client: { is: clientScope } },
      include: { client: { select: { id: true, displayName: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        status: { in: ["REQUESTED", "CONFIRMED"] },
        scheduledAt: { not: null, gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        client: { is: clientScope },
      },
      include: { client: { select: { id: true, displayName: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.serviceRecovery.findMany({
      where: { resolvedAt: null, client: { is: clientScope } },
      include: { client: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const expiring = activeConsents.filter((c) => consentStatus(c, now) === "ACTIVE");

  return { overdue, blocked, awaitingApproval, expiring, pendingChanges, pendingExpenses, contactDue, promisesDue, upcomingAppointments, openRecoveries };
}

/**
 * Everything the client-detail page renders — but only if the user may access this client
 * (§5). Returns null on no-access so the page renders not-found without leaking existence.
 */
export async function getClientDetail(id: string, user: Pick<User, "id" | "role">) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      assignedNavigator: true,
      backupNavigator: { select: { name: true } },
      promises: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { scheduledAt: "asc" } },
      handoffs: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      serviceRecoveries: { include: { owner: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      feedback: { include: { recordedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      inquiry: { include: { handledBy: { select: { name: true } } } },
      screening: { include: { screenedBy: { select: { name: true } } } },
      agreement: true,
      intake: true,
      approvedContacts: true,
      consents: {
        include: { recipients: true, recordedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      actionPlan: {
        include: {
          items: {
            include: { owner: { select: { name: true } }, reviewer: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      disclosures: {
        include: { sender: { select: { name: true } } },
        orderBy: { disclosedAt: "desc" },
        take: 10,
      },
      changeRequests: {
        include: { createdBy: { select: { name: true } }, decidedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      expenses: {
        include: { decidedBy: { select: { name: true } }, invoiceItem: { select: { invoiceId: true } } },
        orderBy: { createdAt: "desc" },
      },
      decisions: {
        include: { recordedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      auditEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });

  if (!client || !canAccessClient(user, client)) return null;
  return client;
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;

// --- Provider directory (§17.7) ----------------------------------------------

export async function listProviders(filter?: { category?: ServiceCategory; q?: string }) {
  return prisma.provider.findMany({
    where: {
      category: filter?.category,
      ...(filter?.q
        ? { OR: [{ name: { contains: filter.q, mode: "insensitive" } }, { organization: { contains: filter.q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    include: { verifiedBy: { select: { name: true } } },
  });
}

export async function getProvider(id: string) {
  return prisma.provider.findUnique({
    where: { id },
    include: { verifiedBy: { select: { name: true } }, createdBy: { select: { name: true } } },
  });
}

// --- White-glove scorecard (Tier 3) ------------------------------------------

/** Aggregate service-experience + operational measures across all clients. */
export async function getScorecard(now: Date = new Date()) {
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [
    clientsTotal, clientsActive, withPrimary, withBackup, contactOverdue,
    promisesKept, promisesMissed, promisesOpen, missedToldBefore,
    handoffsTotal, handoffsCompleted,
    recoveriesTotal, recoveriesOpen, recoveriesConfirmed,
    providersTotal, providersPresentable,
    incidentsOpen, privacyOpen, invoicesOverdue, appointmentsUpcoming,
    feedbackAgg,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.client.count({ where: { assignedNavigatorId: { not: null } } }),
    prisma.client.count({ where: { backupNavigatorId: { not: null } } }),
    prisma.client.count({ where: { status: { not: "CLOSED" }, nextContactDueAt: { not: null, lte: now } } }),
    prisma.clientPromise.count({ where: { status: "KEPT" } }),
    prisma.clientPromise.count({ where: { status: "MISSED" } }),
    prisma.clientPromise.count({ where: { status: "OPEN" } }),
    prisma.clientPromise.count({ where: { status: "MISSED", toldBeforeDeadline: true } }),
    prisma.handoff.count(),
    prisma.handoff.count({ where: { completedAt: { not: null } } }),
    prisma.serviceRecovery.count(),
    prisma.serviceRecovery.count({ where: { resolvedAt: null } }),
    prisma.serviceRecovery.count({ where: { resolvedAt: { not: null }, resolvedConfirmedWithClient: true } }),
    prisma.provider.count(),
    prisma.provider.count({ where: { status: "ACTIVE", OR: [{ nextReviewDate: null }, { nextReviewDate: { gt: now } }] } }),
    prisma.incidentRecord.count({ where: { status: { not: "CLOSED" } } }),
    prisma.privacyRequest.count({ where: { status: { not: "COMPLETED" } } }),
    prisma.invoice.count({ where: { status: "SENT", dueDate: { not: null, lte: now } } }),
    prisma.appointment.count({ where: { status: { in: ["REQUESTED", "CONFIRMED"] }, scheduledAt: { not: null, gte: now, lte: soon } } }),
    prisma.clientFeedback.aggregate({ _avg: { effortScore: true, confidenceScore: true }, _count: true }),
  ]);

  return {
    clientsTotal, clientsActive, withPrimary, withBackup, contactOverdue,
    promisesKept, promisesMissed, promisesOpen, missedToldBefore,
    handoffsTotal, handoffsCompleted,
    recoveriesTotal, recoveriesOpen, recoveriesConfirmed,
    providersTotal, providersPresentable,
    incidentsOpen, privacyOpen, invoicesOverdue, appointmentsUpcoming,
    feedbackCount: feedbackAgg._count,
    avgEffort: feedbackAgg._avg.effortScore,
    avgConfidence: feedbackAgg._avg.confidenceScore,
  };
}

// --- Billing (§6.11) ---------------------------------------------------------

export async function listInvoices() {
  return prisma.invoice.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { client: { select: { displayName: true } }, items: { select: { amount: true } } },
  });
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      createdBy: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Approved expenses for a client not yet attached to any invoice — billable. */
export async function getBillableExpenses(clientId: string) {
  return prisma.expense.findMany({
    where: { clientId, status: "APPROVED", invoiceItem: { is: null } },
    orderBy: { createdAt: "asc" },
  });
}

/** Overdue invoices: sent, past due date, not paid/void (§6.11). */
export async function getInvoiceExceptions(now: Date = new Date()) {
  return prisma.invoice.findMany({
    where: { status: "SENT", dueDate: { not: null, lte: now } },
    include: { client: { select: { displayName: true } } },
    orderBy: { dueDate: "asc" },
  });
}

// --- Retention & secure destruction (§8.8) -----------------------------------

/**
 * Records whose retention review date has passed, split into those eligible for destruction and
 * those on hold. Destruction is stopped by a legal hold, an open incident, or an open privacy
 * request (§8.8 — preserve until authorized).
 */
export async function getRetentionCandidates(now: Date = new Date()) {
  const candidates = await prisma.client.findMany({
    where: { retentionReviewDate: { not: null, lte: now } },
    include: {
      incidents: { select: { status: true } },
      privacyRequests: { select: { status: true } },
    },
    orderBy: { retentionReviewDate: "asc" },
  });

  const eligible: typeof candidates = [];
  const onHold: { client: (typeof candidates)[number]; reasons: string[] }[] = [];
  for (const c of candidates) {
    const reasons: string[] = [];
    if (c.legalHold) reasons.push("Legal hold");
    if (c.incidents.some((i) => i.status !== "CLOSED")) reasons.push("Open incident");
    if (c.privacyRequests.some((p) => p.status !== "COMPLETED")) reasons.push("Open privacy request");
    if (reasons.length) onHold.push({ client: c, reasons });
    else eligible.push(c);
  }
  return { eligible, onHold };
}

export async function listDestructions() {
  return prisma.destructionRecord.findMany({
    orderBy: { destroyedAt: "desc" },
    take: 50,
    include: { destroyedBy: { select: { name: true } } },
  });
}

// --- Privacy requests (§6.13) ------------------------------------------------

export async function listPrivacyRequests() {
  return prisma.privacyRequest.findMany({
    orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
    include: { client: { select: { displayName: true } }, assignedTo: { select: { name: true } } },
  });
}

export async function getPrivacyRequest(id: string) {
  return prisma.privacyRequest.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

/** Open requests whose policy response date has passed (§6.13). */
export async function getPrivacyExceptions(now: Date = new Date()) {
  return prisma.privacyRequest.findMany({
    where: { status: { notIn: ["COMPLETED"] }, responseDueDate: { lte: now } },
    orderBy: { responseDueDate: "asc" },
    include: { client: { select: { displayName: true } } },
  });
}

// --- Incident log (§6.12, §17.5) ---------------------------------------------

export async function listIncidents() {
  return prisma.incidentRecord.findMany({
    orderBy: [{ status: "asc" }, { discoveredAt: "desc" }],
    include: { client: { select: { displayName: true } }, escalationOwner: { select: { name: true } } },
  });
}

export async function getIncident(id: string) {
  return prisma.incidentRecord.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      escalationOwner: { select: { name: true } },
      closureApprovedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

/** Open incidents whose 48-hour review is due, plus overdue corrective actions (§17.5). */
export async function getIncidentExceptions(now: Date = new Date()) {
  const [reviewDue, correctiveOverdue] = await Promise.all([
    prisma.incidentRecord.findMany({
      where: { status: { not: "CLOSED" }, reviewDueAt: { lte: now } },
      orderBy: { reviewDueAt: "asc" },
    }),
    prisma.incidentRecord.findMany({
      where: { status: { not: "CLOSED" }, correctiveVerified: false, correctiveDeadline: { not: null, lte: now } },
      orderBy: { correctiveDeadline: "asc" },
    }),
  ]);
  return { reviewDue, correctiveOverdue };
}

/** Providers needing attention: awaiting first verification, or a review that is due. */
export async function getProviderExceptions(now: Date = new Date()) {
  const [pending, due] = await Promise.all([
    prisma.provider.findMany({
      where: { status: "PENDING_VERIFICATION" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.provider.findMany({
      where: { status: "ACTIVE", nextReviewDate: { not: null, lte: now } },
      orderBy: { nextReviewDate: "asc" },
    }),
  ]);
  return { pending, due };
}
