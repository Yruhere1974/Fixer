"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { canHandlePrivacy } from "@/lib/access";
import { errState, str, type FormState } from "@/lib/forms";
import type { PrivacyRequestStatus, PrivacyRequestType } from "@/generated/prisma/client";

const RESPONSE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // policy default; confirm per approved policy

/** Log an incoming client-rights request (§6.13). Sets the policy response-due clock. */
export async function logPrivacyRequest(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) return errState("Your role does not permit handling privacy requests.");

  const type = str(formData, "type") as PrivacyRequestType;
  const requesterName = str(formData, "requesterName");
  const scope = str(formData, "scope");
  if (!type) return errState("Choose a request type.");
  if (!requesterName) return errState("Record the requester's name.");
  if (!scope) return errState("Describe what is requested.");

  const clientId = str(formData, "clientId") || null;
  const now = new Date();
  const request = await prisma.privacyRequest.create({
    data: {
      type,
      requesterName,
      scope,
      clientId,
      responseDueDate: new Date(now.getTime() + RESPONSE_WINDOW_MS),
      assignedToId: user.id,
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "PrivacyRequest",
    entityId: request.id,
    clientId,
    summary: `Logged ${type} privacy request from ${requesterName}.`,
  });
  redirect(`/privacy/${request.id}`);
}

/** Record identity verification before disclosing anything (§8.5 verify recipients). */
export async function verifyRequester(formData: FormData) {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) return;
  const id = str(formData, "requestId");
  const method = str(formData, "verificationMethod");
  const existing = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!existing || !method) return;

  await prisma.privacyRequest.update({
    where: { id },
    data: { requesterVerified: true, verificationMethod: method },
  });
  await recordAudit({
    actorId: user.id,
    action: "APPROVE",
    entityType: "PrivacyRequest",
    entityId: id,
    clientId: existing.clientId,
    summary: `Verified requester identity via ${method}.`,
  });
  revalidatePath(`/privacy/${id}`);
}

/** Update handling: records searched, outcome, reason/advice, status, client communication. */
export async function updatePrivacyRequest(formData: FormData) {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) return;
  const id = str(formData, "requestId");
  const existing = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.privacyRequest.update({
    where: { id },
    data: {
      status: (str(formData, "status") || existing.status) as PrivacyRequestStatus,
      recordsSearched: str(formData, "recordsSearched") || null,
      outcome: str(formData, "outcome") || null,
      reason: str(formData, "reason") || null,
      clientCommunication: str(formData, "clientCommunication") || null,
    },
  });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "PrivacyRequest",
    entityId: id,
    clientId: existing.clientId,
    summary: "Updated privacy-request handling.",
  });
  revalidatePath(`/privacy/${id}`);
}

/** Complete the request — requires the requester's identity to be verified first (§8.5). */
export async function completePrivacyRequest(formData: FormData) {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) return;
  const id = str(formData, "requestId");
  const existing = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!existing || !existing.requesterVerified) return; // do not complete without verified identity

  await prisma.privacyRequest.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "PrivacyRequest",
    entityId: id,
    clientId: existing.clientId,
    summary: "Completed privacy request.",
  });
  revalidatePath(`/privacy/${id}`);
}
