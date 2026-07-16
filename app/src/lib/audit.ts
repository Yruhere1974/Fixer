import { prisma } from "@/lib/db";
import type { AuditAction, Prisma, PrismaClient } from "@/generated/prisma/client";

/** A Prisma client or an interactive-transaction client. */
type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  clientId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Records an attributable audit event (plan §3.5, §6.10). Every important add, change,
 * approval, disclosure, and deletion must pass through here so the history is reconstructable.
 * Pass a transaction client (`db`) to make the audit atomic with the mutation it describes.
 */
export async function recordAudit(input: AuditInput, db: Db = prisma) {
  return db.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      clientId: input.clientId ?? null,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}
