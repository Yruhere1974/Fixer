"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { canManageBilling } from "@/lib/access";
import { decimal, errState, str, type FormState } from "@/lib/forms";
import type { InvoiceItemKind, InvoiceStatus } from "@/generated/prisma/client";

const DUE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Create a draft invoice for a client. Neutral descriptions only (§6.11). */
export async function createInvoice(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canManageBilling(user.role)) return errState("Your role does not permit managing invoices.");

  const clientId = str(formData, "clientId");
  if (!clientId) return errState("Choose a client.");
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return errState("Unknown client.");

  const count = await prisma.invoice.count();
  const number = `INV-${String(count + 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: { clientId, number, notes: str(formData, "notes") || null, createdById: user.id },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "Invoice",
    entityId: invoice.id,
    clientId,
    summary: `Created invoice ${number}.`,
  });
  redirect(`/invoices/${invoice.id}`);
}

/** Add a service-fee line to a draft invoice. Amount = quantity × unit, or an explicit amount. */
export async function addInvoiceItem(formData: FormData) {
  const user = await requireUser();
  if (!canManageBilling(user.role)) return;
  const invoiceId = str(formData, "invoiceId");
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status !== "DRAFT") return;

  const description = str(formData, "description");
  const quantity = decimal(formData, "quantity");
  const unitAmount = decimal(formData, "unitAmount");
  const explicit = decimal(formData, "amount");
  const amount = explicit ?? (quantity != null && unitAmount != null ? quantity * unitAmount : null);
  if (!description || amount == null) return;

  await prisma.invoiceItem.create({
    data: {
      invoiceId,
      description,
      kind: (str(formData, "kind") || "SERVICE_FEE") as InvoiceItemKind,
      quantity: quantity ?? undefined,
      unitAmount: unitAmount ?? undefined,
      amount,
    },
  });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Invoice",
    entityId: invoiceId,
    clientId: invoice.clientId,
    summary: `Added line "${description}" to ${invoice.number}.`,
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

/** Attach an approved third-party expense to a draft invoice as a separate expense line (§6.11). */
export async function addExpenseToInvoice(formData: FormData) {
  const user = await requireUser();
  if (!canManageBilling(user.role)) return;
  const invoiceId = str(formData, "invoiceId");
  const expenseId = str(formData, "expenseId");
  const [invoice, expense] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId } }),
    prisma.expense.findUnique({ where: { id: expenseId }, include: { invoiceItem: true } }),
  ]);
  if (!invoice || invoice.status !== "DRAFT") return;
  if (!expense || expense.status !== "APPROVED" || expense.invoiceItem || expense.clientId !== invoice.clientId) return;

  await prisma.invoiceItem.create({
    data: {
      invoiceId,
      description: expense.description,
      kind: "THIRD_PARTY_EXPENSE",
      amount: expense.amount,
      sourceExpenseId: expense.id,
    },
  });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Invoice",
    entityId: invoiceId,
    clientId: invoice.clientId,
    summary: `Billed approved expense "${expense.description}" on ${invoice.number}.`,
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

/** Advance invoice status: send (sets issue+due), mark paid, void, or back to draft (§6.11). */
export async function setInvoiceStatus(formData: FormData) {
  const user = await requireUser();
  if (!canManageBilling(user.role)) return;
  const invoiceId = str(formData, "invoiceId");
  const status = str(formData, "status") as InvoiceStatus;
  if (!["DRAFT", "SENT", "PAID", "VOID"].includes(status)) return;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

  const now = new Date();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      issueDate: status === "SENT" && !invoice.issueDate ? now : invoice.issueDate,
      dueDate: status === "SENT" && !invoice.dueDate ? new Date(now.getTime() + DUE_WINDOW_MS) : invoice.dueDate,
      paidAt: status === "PAID" ? now : status === "DRAFT" || status === "VOID" ? null : invoice.paidAt,
    },
  });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Invoice",
    entityId: invoiceId,
    clientId: invoice.clientId,
    summary: `Set ${invoice.number} to ${status}.`,
  });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
