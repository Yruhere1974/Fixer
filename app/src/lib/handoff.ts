import { prisma } from "@/lib/db";
import { canAccessClient } from "@/lib/access";
import {
  actionStatusLabel,
  changeStatusLabel,
  formatDate,
  invoiceStatusLabel,
  money,
} from "@/lib/labels";
import type { User } from "@/generated/prisma/client";

/**
 * Assemble the closeout handoff package for a client (§6.14): outcome, completed and outstanding
 * work, decisions, approved costs, retention, and next-steps guidance. Access-checked.
 */
export async function getHandoffData(id: string, user: Pick<User, "id" | "role">) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      assignedNavigator: { select: { name: true } },
      agreement: true,
      intake: true,
      actionPlan: { include: { items: { orderBy: { createdAt: "asc" } } } },
      decisions: { orderBy: { createdAt: "asc" } },
      changeRequests: { where: { status: { not: "REJECTED" } }, orderBy: { createdAt: "asc" } },
      invoices: { include: { items: true }, orderBy: { createdAt: "asc" } },
      expenses: { where: { status: "APPROVED" }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!client || !canAccessClient(user, client)) return null;
  return client;
}

export type HandoffData = NonNullable<Awaited<ReturnType<typeof getHandoffData>>>;

function invoiceTotal(items: { amount: unknown }[]): number {
  return items.reduce((s, i) => s + Number(i.amount), 0);
}

/** Render the handoff package as Markdown (the downloadable deliverable). */
export function buildHandoffMarkdown(c: HandoffData): string {
  const items = c.actionPlan?.items ?? [];
  const completed = items.filter((i) => i.status === "DONE");
  const outstanding = items.filter((i) => i.status !== "DONE");
  const lines: string[] = [];

  lines.push(`# Handoff summary — ${c.displayName}`, "");
  lines.push(`- **Navigator:** ${c.assignedNavigator?.name ?? "—"}`);
  lines.push(`- **Engagement:** ${formatDate(c.createdAt)} – ${c.closedAt ? formatDate(c.closedAt) : "ongoing"}`);
  if (c.agreement) lines.push(`- **Service package:** ${c.agreement.servicePackage}`);
  lines.push(`- **Status:** ${c.status}`, "");

  lines.push(`## Desired outcome`, c.actionPlan?.desiredOutcome ?? "—", "");

  lines.push(`## Completed`);
  if (completed.length === 0) lines.push("_None recorded._");
  else completed.forEach((i) => lines.push(`- ${i.title}${i.evidence ? ` — evidence: ${i.evidence}` : ""}`));
  lines.push("");

  lines.push(`## Outstanding items`);
  if (outstanding.length === 0) lines.push("_None._");
  else
    outstanding.forEach((i) =>
      lines.push(`- ${i.title} — ${actionStatusLabel[i.status]}${i.dueDate ? `, due ${formatDate(i.dueDate)}` : ""}${i.nextAction ? ` (next: ${i.nextAction})` : ""}`),
    );
  lines.push("");

  if (c.decisions.length > 0) {
    lines.push(`## Decisions`);
    c.decisions.forEach((d) => lines.push(`- **${d.question}** → ${d.decision} (by ${d.decisionMaker}, ${formatDate(d.createdAt)})`));
    lines.push("");
  }

  if (c.changeRequests.length > 0) {
    lines.push(`## Scope / cost changes`);
    c.changeRequests.forEach((cr) => lines.push(`- ${cr.description} — ${changeStatusLabel[cr.status]}`));
    lines.push("");
  }

  lines.push(`## Costs`);
  if (c.invoices.length === 0) lines.push("_No invoices._");
  else c.invoices.forEach((inv) => lines.push(`- Invoice ${inv.number}: ${money(invoiceTotal(inv.items))} — ${invoiceStatusLabel[inv.status]}`));
  if (c.expenses.length > 0) {
    lines.push(`- Approved third-party expenses: ${money(c.expenses.reduce((s, e) => s + Number(e.amount), 0))}`);
  }
  lines.push("");

  lines.push(`## Records & retention`);
  lines.push(`- Retention category: ${c.retentionCategory ?? "—"}`);
  if (c.retentionReviewDate) lines.push(`- Retention review: ${formatDate(c.retentionReviewDate)}`);
  lines.push("");

  lines.push(`## Next steps & maintenance guidance`, c.maintenanceGuidance ?? "_None recorded._", "");

  lines.push("---", `_Alongside — non-clinical coordination. Generated ${formatDate(new Date())}._`);
  return lines.join("\n");
}
