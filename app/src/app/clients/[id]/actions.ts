"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { recordDisclosure } from "@/lib/consent";
import { requireUser } from "@/lib/session";
import { canAccessClient, canCoordinate } from "@/lib/access";
import type { CommunicationChannel, InfoCategory } from "@/generated/prisma/client";

export interface DisclosureFormState {
  ok: boolean;
  allowed: boolean;
  message: string;
  warnings: string[];
}

/**
 * Attempt a family-update disclosure. Server Actions are directly reachable, so authentication,
 * coordination capability, and client-access are all re-checked here — never trust the UI (§8.4,
 * ADR 0003). Always runs through the consent guard; a refusal is recorded and audited (§3.2, §6.3).
 */
export async function attemptDisclosure(
  clientId: string,
  _prev: DisclosureFormState | null,
  formData: FormData,
): Promise<DisclosureFormState> {
  const user = await requireUser();
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { assignedNavigatorId: true },
  });
  if (!client || !canCoordinate(user.role) || !canAccessClient(user, client)) {
    return { ok: false, allowed: false, message: "You are not authorized for this action.", warnings: [] };
  }

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
    senderId: user.id,
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

/** Approve an action item's cost/scope (plan §6.5). Re-checks capability + client access. */
export async function approveActionItem(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));

  const existing = await prisma.actionItem.findUnique({
    where: { id: itemId },
    include: { plan: { include: { client: { select: { id: true, assignedNavigatorId: true } } } } },
  });
  if (!existing || !canCoordinate(user.role) || !canAccessClient(user, existing.plan.client)) return;

  await prisma.actionItem.update({
    where: { id: itemId },
    data: { approvalStatus: "APPROVED", status: "IN_PROGRESS" },
  });

  await recordAudit({
    actorId: user.id,
    action: "APPROVE",
    entityType: "ActionItem",
    entityId: itemId,
    clientId: existing.plan.clientId,
    summary: `Approved action "${existing.title}".`,
  });

  revalidatePath(`/clients/${existing.plan.clientId}`);
}

/**
 * Mark an action item done. Requires evidence of completion (plan §3.9). Re-checks capability +
 * client access before writing.
 */
export async function completeActionItem(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));
  const evidence = String(formData.get("evidence") || "").trim();

  const existing = await prisma.actionItem.findUnique({
    where: { id: itemId },
    include: { plan: { include: { client: { select: { id: true, assignedNavigatorId: true } } } } },
  });
  if (!existing || !canCoordinate(user.role) || !canAccessClient(user, existing.plan.client)) return;
  if (!evidence) return; // no evidence -> refuse to close (guarded in UI too)

  await prisma.actionItem.update({
    where: { id: itemId },
    data: { status: "DONE", evidence },
  });

  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "ActionItem",
    entityId: itemId,
    clientId: existing.plan.clientId,
    summary: `Completed action "${existing.title}" with evidence.`,
    metadata: { evidence },
  });

  revalidatePath(`/clients/${existing.plan.clientId}`);
}
