"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { canAccessClient, canCoordinate } from "@/lib/access";
import { date, decimal, errState, str, strList, type FormState } from "@/lib/forms";
import type {
  ChangeStatus,
  ClientStatus,
  CommunicationChannel,
  ConsentMethod,
  ConsentType,
  ExpenseStatus,
  InfoCategory,
  Priority,
  RetentionCategory,
  User,
} from "@/generated/prisma/client";

/** Load + authorize a client for a coordination mutation. Returns null if not permitted. */
async function authorize(clientId: string): Promise<{ user: User; clientId: string } | null> {
  const user = await requireUser();
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedNavigatorId: true },
  });
  if (!client || !canCoordinate(user.role) || !canAccessClient(user, client)) return null;
  return { user, clientId: client.id };
}

function revalidate(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
}

// --- Step 4: service agreement ------------------------------------------------

export async function recordAgreement(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;

  const servicePackage = str(formData, "servicePackage");
  const versionAccepted = str(formData, "versionAccepted") || "SA-v1.0";
  const method = (str(formData, "method") || "ELECTRONIC_ACCEPTANCE") as ConsentMethod;
  if (!servicePackage) return;

  await prisma.serviceAgreement.upsert({
    where: { clientId },
    update: {
      servicePackage,
      versionAccepted,
      method,
      feesConfirmed: str(formData, "feesConfirmed") === "on",
      responseTimesConfirmed: str(formData, "responseTimesConfirmed") === "on",
      signedAt: new Date(),
    },
    create: {
      clientId,
      servicePackage,
      versionAccepted,
      method,
      feesConfirmed: str(formData, "feesConfirmed") === "on",
      responseTimesConfirmed: str(formData, "responseTimesConfirmed") === "on",
      signedAt: new Date(),
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "ServiceAgreement",
    clientId,
    summary: `Recorded service agreement (${servicePackage}).`,
  });
  revalidate(clientId);
}

// --- Step 6: structured intake -----------------------------------------------

export async function saveIntake(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;

  const serviceObjective = str(formData, "serviceObjective");
  if (!serviceObjective) return;

  const data = {
    serviceObjective,
    preferredName: str(formData, "preferredName") || null,
    pronouns: str(formData, "pronouns") || null,
    language: str(formData, "language") || null,
    accessibilityNeeds: str(formData, "accessibilityNeeds") || null,
    topPriorities: str(formData, "topPriorities") || null,
    deadlines: str(formData, "deadlines") || null,
    budgetRange: str(formData, "budgetRange") || null,
    knownRisks: str(formData, "knownRisks") || null,
    doNotShare: str(formData, "doNotShare") || null,
  };

  await prisma.intakeRecord.upsert({
    where: { clientId },
    update: data,
    create: { clientId, ...data },
  });

  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "IntakeRecord",
    clientId,
    summary: "Saved structured intake.",
  });
  revalidate(clientId);
}

// --- Step 5: approved contacts & consent -------------------------------------

export async function addApprovedContact(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;

  const name = str(formData, "name");
  const relationship = str(formData, "relationship");
  if (!name || !relationship) return;

  const contact = await prisma.approvedContact.create({
    data: {
      clientId,
      name,
      relationship,
      permittedInfo: strList(formData, "permittedInfo") as InfoCategory[],
      channels: strList(formData, "channels") as CommunicationChannel[],
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "ApprovedContact",
    entityId: contact.id,
    clientId,
    summary: `Added approved contact ${name} (${relationship}).`,
  });
  revalidate(clientId);
}

export async function addConsent(
  clientId: string,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize(clientId);
  if (!auth) return errState("You are not authorized for this action.");
  const { user } = auth;

  const type = str(formData, "type") as ConsentType;
  const grantedByName = str(formData, "grantedByName");
  const purpose = str(formData, "purpose");
  const coveredInfo = strList(formData, "coveredInfo") as InfoCategory[];
  const channels = strList(formData, "channels") as CommunicationChannel[];
  const method = (str(formData, "method") || "ELECTRONIC_ACCEPTANCE") as ConsentMethod;

  if (!type) return errState("Choose a consent type.");
  if (!grantedByName) return errState("Record who is granting the consent.");
  if (!purpose) return errState("State the purpose.");
  if (coveredInfo.length === 0) return errState("Select at least one information category.");
  if (channels.length === 0) return errState("Select at least one permitted channel.");

  const recipientIds = strList(formData, "recipientIds");
  const consent = await prisma.consentRecord.create({
    data: {
      clientId,
      type,
      grantedByName,
      purpose,
      coveredInfo,
      channels,
      method,
      versionAccepted: str(formData, "versionAccepted") || "CONSENT-v1.0",
      excludedInfo: str(formData, "excludedInfo") || null,
      expiryDate: date(formData, "expiryDate"),
      recordedById: user.id,
      recipients: recipientIds.length ? { connect: recipientIds.map((id) => ({ id })) } : undefined,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "ConsentRecord",
    entityId: consent.id,
    clientId,
    summary: `Recorded ${type} consent.`,
  });
  revalidate(clientId);
  return { ok: true };
}

export async function withdrawConsent(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;
  const consentId = str(formData, "consentId");

  const consent = await prisma.consentRecord.findFirst({ where: { id: consentId, clientId } });
  if (!consent || consent.withdrawnAt) return;

  await prisma.consentRecord.update({
    where: { id: consentId },
    data: { withdrawnAt: new Date(), withdrawnById: user.id },
  });

  await recordAudit({
    actorId: user.id,
    action: "WITHDRAW_CONSENT",
    entityType: "ConsentRecord",
    entityId: consentId,
    clientId,
    summary: `Withdrew ${consent.type} consent.`,
  });
  revalidate(clientId);
}

// --- Step 8: action plan authoring -------------------------------------------

export async function createActionPlan(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;
  const desiredOutcome = str(formData, "desiredOutcome");
  if (!desiredOutcome) return;

  await prisma.actionPlan.upsert({
    where: { clientId },
    update: { desiredOutcome },
    create: { clientId, desiredOutcome },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "ActionPlan",
    clientId,
    summary: "Created action plan.",
  });
  revalidate(clientId);
}

export async function addActionItem(
  clientId: string,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize(clientId);
  if (!auth) return errState("You are not authorized for this action.");
  const { user } = auth;

  const title = str(formData, "title");
  if (!title) return errState("Enter an action title.");

  const plan = await prisma.actionPlan.findUnique({ where: { clientId } });
  if (!plan) return errState("Create the action plan first.");

  const estimatedCost = decimal(formData, "estimatedCost");
  const item = await prisma.actionItem.create({
    data: {
      planId: plan.id,
      title,
      priority: (str(formData, "priority") || "MEDIUM") as Priority,
      ownerId: user.id,
      dueDate: date(formData, "dueDate"),
      estimatedCost: estimatedCost ?? undefined,
      approvalStatus: estimatedCost && estimatedCost > 0 ? "PENDING" : "NOT_REQUIRED",
      backupOption: str(formData, "backupOption") || null,
      nextAction: str(formData, "nextAction") || null,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "ActionItem",
    entityId: item.id,
    clientId,
    summary: `Added action "${title}".`,
  });
  revalidate(clientId);
  return { ok: true };
}

// --- Step 12: scope/cost change control --------------------------------------

export async function createChangeRequest(
  clientId: string,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize(clientId);
  if (!auth) return errState("You are not authorized for this action.");
  const { user } = auth;

  const description = str(formData, "description");
  const requestedByName = str(formData, "requestedByName");
  if (!description) return errState("Describe the requested change.");
  if (!requestedByName) return errState("Record who requested the change.");

  const change = await prisma.changeRequest.create({
    data: {
      clientId,
      requestedByName,
      description,
      reason: str(formData, "reason") || null,
      serviceImpact: str(formData, "serviceImpact") || null,
      scheduleImpact: str(formData, "scheduleImpact") || null,
      costImpact: str(formData, "costImpact") || null,
      privacyImpact: str(formData, "privacyImpact") || null,
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "ChangeRequest",
    entityId: change.id,
    clientId,
    summary: `Logged scope/cost change request: ${description}`,
  });
  revalidate(clientId);
  return { ok: true };
}

/** Approve or reject a change request (journey step 12: approval before work proceeds). */
export async function decideChangeRequest(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;

  const changeId = str(formData, "changeId");
  const decision = str(formData, "decision") as ChangeStatus;
  if (!["APPROVED", "REJECTED"].includes(decision)) return;

  const existing = await prisma.changeRequest.findFirst({ where: { id: changeId, clientId } });
  if (!existing || existing.status !== "PENDING") return;

  await prisma.changeRequest.update({
    where: { id: changeId },
    data: {
      status: decision,
      decisionNote: str(formData, "decisionNote") || null,
      tasksUpdated: str(formData, "tasksUpdated") || null,
      decidedById: user.id,
      decidedAt: new Date(),
    },
  });

  await recordAudit({
    actorId: user.id,
    action: decision === "APPROVED" ? "APPROVE" : "REJECT",
    entityType: "ChangeRequest",
    entityId: changeId,
    clientId,
    summary: `${decision === "APPROVED" ? "Approved" : "Rejected"} change request: ${existing.description}`,
  });
  revalidate(clientId);
}

// --- §6.10: decision log ------------------------------------------------------

export async function logDecision(
  clientId: string,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize(clientId);
  if (!auth) return errState("You are not authorized for this action.");
  const { user } = auth;

  const question = str(formData, "question");
  const decision = str(formData, "decision");
  const decisionMaker = str(formData, "decisionMaker");
  if (!question) return errState("State the question requiring a decision.");
  if (!decision) return errState("Record the decision made.");
  if (!decisionMaker) return errState("Record who made the decision.");

  const record = await prisma.decision.create({
    data: {
      clientId,
      question,
      decision,
      decisionMaker,
      optionsPresented: str(formData, "optionsPresented") || null,
      reason: str(formData, "reason") || null,
      affectedTasks: str(formData, "affectedTasks") || null,
      recordedById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "Decision",
    entityId: record.id,
    clientId,
    summary: `Recorded decision: ${question}`,
  });
  revalidate(clientId);
  return { ok: true };
}

// --- §6.11: third-party expense requests (client approval) --------------------

export async function requestExpense(
  clientId: string,
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize(clientId);
  if (!auth) return errState("You are not authorized for this action.");
  const { user } = auth;

  const description = str(formData, "description");
  const amount = decimal(formData, "amount");
  if (!description) return errState("Describe the expense (neutral — no health detail).");
  if (amount == null || amount <= 0) return errState("Enter a valid amount.");

  const expense = await prisma.expense.create({
    data: {
      clientId,
      description,
      amount,
      incurredOn: date(formData, "incurredOn"),
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    clientId,
    summary: `Requested third-party expense "${description}" ($${amount}).`,
  });
  revalidate(clientId);
  return { ok: true };
}

/** Record the client's approval/rejection of a third-party expense (§6.11). */
export async function decideExpense(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;

  const expenseId = str(formData, "expenseId");
  const decision = str(formData, "decision") as ExpenseStatus;
  if (!["APPROVED", "REJECTED"].includes(decision)) return;

  const existing = await prisma.expense.findFirst({ where: { id: expenseId, clientId } });
  if (!existing || existing.status !== "REQUESTED") return;

  await prisma.expense.update({
    where: { id: expenseId },
    data: { status: decision, decisionNote: str(formData, "decisionNote") || null, decidedById: user.id, decidedAt: new Date() },
  });

  await recordAudit({
    actorId: user.id,
    action: decision === "APPROVED" ? "APPROVE" : "REJECT",
    entityType: "Expense",
    entityId: expenseId,
    clientId,
    summary: `${decision === "APPROVED" ? "Approved" : "Rejected"} expense "${existing.description}".`,
  });
  revalidate(clientId);
}

// --- Steps 13–15: status lifecycle & closeout --------------------------------

export async function updateClientStatus(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;
  const status = str(formData, "status") as ClientStatus;
  if (!["PROSPECT", "ACTIVE", "PAUSED", "CLOSED"].includes(status)) return;

  await prisma.client.update({
    where: { id: clientId },
    data: { status, closedAt: status === "CLOSED" ? new Date() : null },
  });

  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Client",
    entityId: clientId,
    clientId,
    summary: `Set status to ${status}.`,
  });
  revalidate(clientId);
}

export async function closeoutClient(formData: FormData) {
  const auth = await authorize(str(formData, "clientId"));
  if (!auth) return;
  const { user, clientId } = auth;

  const retentionCategory = (str(formData, "retentionCategory") || "STANDARD_SERVICE") as RetentionCategory;
  const feedback = str(formData, "feedback");

  await prisma.client.update({
    where: { id: clientId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      retentionCategory,
      retentionReviewDate: date(formData, "retentionReviewDate"),
      maintenanceGuidance: str(formData, "maintenanceGuidance") || null,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Client",
    entityId: clientId,
    clientId,
    summary: `Closed engagement. Retention: ${retentionCategory}.${feedback ? ` Feedback: ${feedback}` : ""}`,
    metadata: feedback ? { feedback } : undefined,
  });
  revalidate(clientId);
}
