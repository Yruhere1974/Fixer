import { prisma } from "@/lib/db";
import { consentStatus } from "@/lib/consent";

/** Dashboard client list with the fields the overview needs. */
export async function listClients() {
  return prisma.client.findMany({
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
export async function getExceptions(now: Date = new Date()) {
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [overdue, blocked, awaitingApproval, activeConsents] = await Promise.all([
    prisma.actionItem.findMany({
      where: { dueDate: { lt: now }, status: { not: "DONE" } },
      include: { plan: { include: { client: { select: { id: true, displayName: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: { status: "BLOCKED" },
      include: { plan: { include: { client: { select: { id: true, displayName: true } } } } },
    }),
    prisma.actionItem.findMany({
      where: { OR: [{ status: "AWAITING_APPROVAL" }, { approvalStatus: "PENDING" }] },
      include: { plan: { include: { client: { select: { id: true, displayName: true } } } } },
    }),
    prisma.consentRecord.findMany({
      where: { withdrawnAt: null, expiryDate: { not: null, lte: soon } },
      include: { client: { select: { id: true, displayName: true } } },
    }),
  ]);

  const expiring = activeConsents.filter((c) => consentStatus(c, now) === "ACTIVE");

  return { overdue, blocked, awaitingApproval, expiring };
}

/** Everything the client-detail page renders. */
export async function getClientDetail(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      assignedNavigator: true,
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
      auditEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;
