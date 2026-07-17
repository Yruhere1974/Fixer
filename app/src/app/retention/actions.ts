"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { canHandlePrivacy } from "@/lib/access";
import { str } from "@/lib/forms";

/**
 * Securely destroy a client record whose retention period has passed (§8.8). Re-checks that no
 * legal hold or open exception applies, writes a content-free tombstone, then deletes the client —
 * cascading its coordination content while the audit, incident, and privacy registers survive.
 */
export async function destroyClientRecord(formData: FormData) {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) return;

  const clientId = str(formData, "clientId");
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { incidents: { select: { status: true } }, privacyRequests: { select: { status: true } } },
  });
  if (!client) return;

  // Re-verify eligibility server-side — never trust the button.
  const now = new Date();
  if (!client.retentionReviewDate || client.retentionReviewDate > now) return;
  if (client.legalHold) return;
  if (client.incidents.some((i) => i.status !== "CLOSED")) return;
  if (client.privacyRequests.some((p) => p.status !== "COMPLETED")) return;

  await prisma.$transaction(async (tx) => {
    await tx.destructionRecord.create({
      data: {
        subjectLabel: "Client coordination record",
        subjectRef: client.id, // opaque former id — not content
        retentionCategory: client.retentionCategory,
        method: str(formData, "method") || "Deleted from workspace",
        note: str(formData, "note") || null,
        destroyedById: user.id,
      },
    });
    // Neutral audit summary; no clientId (the client is being deleted) and no content.
    await recordAudit(
      {
        actorId: user.id,
        action: "DELETE",
        entityType: "Client",
        entityId: client.id,
        summary: `Securely destroyed a client record under retention rule ${client.retentionCategory ?? "—"}.`,
      },
      tx,
    );
    await tx.client.delete({ where: { id: client.id } });
  });

  revalidatePath("/retention");
  revalidatePath("/workspace");
}
