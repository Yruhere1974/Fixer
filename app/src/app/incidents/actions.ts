"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { canAccessClient, canHandleIncidents, canReportIncident } from "@/lib/access";
import { date, errState, str, type FormState } from "@/lib/forms";
import type { IncidentStatus, IncidentType, Severity } from "@/generated/prisma/client";

const REVIEW_WINDOW_MS = 48 * 60 * 60 * 1000; // ops §17.5: review within 48 hours

/** Raise an incident (broad access). Sets the 48-hour review clock. */
export async function reportIncident(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canReportIncident(user.role)) return errState("Your role does not permit reporting incidents.");

  const type = str(formData, "type") as IncidentType;
  const description = str(formData, "description");
  const reportedByName = str(formData, "reportedByName");
  if (!type) return errState("Choose an event type.");
  if (!description) return errState("Record an objective description.");
  if (!reportedByName) return errState("Record who is reporting.");

  // If a client is linked, the reporter must be allowed to access it.
  const clientId = str(formData, "clientId") || null;
  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { assignedNavigatorId: true } });
    if (!client || !canAccessClient(user, client)) return errState("You cannot link that client.");
  }

  const now = new Date();
  const incident = await prisma.incidentRecord.create({
    data: {
      type,
      severity: (str(formData, "severity") || "MEDIUM") as Severity,
      clientId,
      reportedByName,
      occurredAt: date(formData, "occurredAt"),
      peopleAffected: str(formData, "peopleAffected") || null,
      infoAffected: str(formData, "infoAffected") || null,
      description,
      immediateAction: str(formData, "immediateAction") || null,
      notifications: str(formData, "notifications") || null,
      reviewDueAt: new Date(now.getTime() + REVIEW_WINDOW_MS),
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "IncidentRecord",
    entityId: incident.id,
    clientId,
    summary: `Reported ${type} (severity ${incident.severity}).`,
  });

  // Reporters who cannot handle incidents return to the workspace; handlers go to the record.
  redirect(canHandleIncidents(user.role) ? `/incidents/${incident.id}` : "/");
}

/** Record investigation + corrective plan (restricted). */
export async function updateInvestigation(formData: FormData) {
  const user = await requireUser();
  if (!canHandleIncidents(user.role)) return;
  const id = str(formData, "incidentId");
  const existing = await prisma.incidentRecord.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.incidentRecord.update({
    where: { id },
    data: {
      severity: (str(formData, "severity") || existing.severity) as Severity,
      status: (str(formData, "status") || existing.status) as IncidentStatus,
      escalationOwnerId: str(formData, "escalationOwnerId") || null,
      findings: str(formData, "findings") || null,
      correctiveActions: str(formData, "correctiveActions") || null,
      correctiveOwner: str(formData, "correctiveOwner") || null,
      correctiveDeadline: date(formData, "correctiveDeadline"),
      relatedChange: str(formData, "relatedChange") || null,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "IncidentRecord",
    entityId: id,
    clientId: existing.clientId,
    summary: "Updated incident investigation / corrective plan.",
  });
  revalidatePath(`/incidents/${id}`);
}

/** Verify that the corrective action worked (§6.12) — required before closure. */
export async function verifyCorrective(formData: FormData) {
  const user = await requireUser();
  if (!canHandleIncidents(user.role)) return;
  const id = str(formData, "incidentId");
  const existing = await prisma.incidentRecord.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.incidentRecord.update({ where: { id }, data: { correctiveVerified: true } });
  await recordAudit({
    actorId: user.id,
    action: "APPROVE",
    entityType: "IncidentRecord",
    entityId: id,
    clientId: existing.clientId,
    summary: "Verified corrective action worked.",
  });
  revalidatePath(`/incidents/${id}`);
}

/** Close with approval — only once corrective action is verified (§6.12). */
export async function closeIncident(formData: FormData) {
  const user = await requireUser();
  if (!canHandleIncidents(user.role)) return;
  const id = str(formData, "incidentId");
  const existing = await prisma.incidentRecord.findUnique({ where: { id } });
  if (!existing || !existing.correctiveVerified) return; // cannot close unverified

  await prisma.incidentRecord.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date(), closureApprovedById: user.id },
  });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "IncidentRecord",
    entityId: id,
    clientId: existing.clientId,
    summary: "Closed incident (closure approved).",
  });
  revalidatePath(`/incidents/${id}`);
}
