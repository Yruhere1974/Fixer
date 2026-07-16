"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { recordDisclosure } from "@/lib/consent";
import { requireActor } from "@/lib/session";
import type { CommunicationChannel, InfoCategory } from "@/generated/prisma/client";

export interface DisclosureFormState {
  ok: boolean;
  allowed: boolean;
  message: string;
  warnings: string[];
}

/**
 * Attempt a family-update disclosure. Always runs through the consent guard; a refusal is
 * recorded and audited just like a success (plan §3.2, §6.3). Wired to useActionState.
 */
export async function attemptDisclosure(
  clientId: string,
  _prev: DisclosureFormState | null,
  formData: FormData,
): Promise<DisclosureFormState> {
  const actor = await requireActor();
  const category = String(formData.get("category")) as InfoCategory;
  const channel = String(formData.get("channel")) as CommunicationChannel;
  const recipientContactId = String(formData.get("recipientContactId") || "") || null;
  const infoSummary = String(formData.get("infoSummary") || "").trim();
  const purpose = String(formData.get("purpose") || "").trim() || "Family update";

  if (!recipientContactId) {
    return { ok: false, allowed: false, message: "Choose a recipient.", warnings: [] };
  }
  if (!infoSummary) {
    return { ok: false, allowed: false, message: "Describe what would be shared.", warnings: [] };
  }

  const recipient = await prisma.approvedContact.findUnique({ where: { id: recipientContactId } });
  if (!recipient || recipient.clientId !== clientId) {
    return { ok: false, allowed: false, message: "Unknown recipient.", warnings: [] };
  }

  const { decision } = await recordDisclosure({
    clientId,
    category,
    consentType: "FAMILY_UPDATE",
    channel,
    recipientContactId,
    recipientName: recipient.name,
    infoSummary,
    purpose,
    senderId: actor.id,
  });

  revalidatePath(`/clients/${clientId}`);
  return {
    ok: true,
    allowed: decision.allowed,
    message: decision.allowed
      ? "Authorized and recorded — the disclosure is permitted."
      : `Blocked and recorded: ${decision.reason}`,
    warnings: decision.warnings,
  };
}

/** Approve an action item's cost/scope (plan §6.5 client-approval status). */
export async function approveActionItem(formData: FormData) {
  const actor = await requireActor();
  const itemId = String(formData.get("itemId"));

  const item = await prisma.actionItem.update({
    where: { id: itemId },
    data: { approvalStatus: "APPROVED", status: "IN_PROGRESS" },
    include: { plan: true },
  });

  await recordAudit({
    actorId: actor.id,
    action: "APPROVE",
    entityType: "ActionItem",
    entityId: item.id,
    clientId: item.plan.clientId,
    summary: `Approved action "${item.title}".`,
  });

  revalidatePath(`/clients/${item.plan.clientId}`);
}

/**
 * Mark an action item done. Requires evidence of completion (plan §3.9: "require evidence
 * before completion") — an item cannot be closed on an empty result.
 */
export async function completeActionItem(formData: FormData) {
  const actor = await requireActor();
  const itemId = String(formData.get("itemId"));
  const evidence = String(formData.get("evidence") || "").trim();

  const existing = await prisma.actionItem.findUnique({
    where: { id: itemId },
    include: { plan: true },
  });
  if (!existing) return;

  if (!evidence) {
    // No evidence -> refuse to close. Surfaced by the disabled-submit UI; guarded here too.
    return;
  }

  await prisma.actionItem.update({
    where: { id: itemId },
    data: { status: "DONE", evidence },
  });

  await recordAudit({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "ActionItem",
    entityId: itemId,
    clientId: existing.plan.clientId,
    summary: `Completed action "${existing.title}" with evidence.`,
    metadata: { evidence },
  });

  revalidatePath(`/clients/${existing.plan.clientId}`);
}
