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

  const [overdue, blocked, awaitingApproval, activeConsents] = await Promise.all([
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
  ]);

  const expiring = activeConsents.filter((c) => consentStatus(c, now) === "ACTIVE");

  return { overdue, blocked, awaitingApproval, expiring };
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
