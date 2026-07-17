import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PrintButton } from "@/components/print-button";
import { getHandoffData } from "@/lib/handoff";
import { requireUser } from "@/lib/session";
import { actionStatusLabel, changeStatusLabel, formatDate, invoiceStatusLabel, money } from "@/lib/labels";

export const dynamic = "force-dynamic";

function total(items: { amount: unknown }[]) {
  return items.reduce((s, i) => s + Number(i.amount), 0);
}

export default async function HandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getHandoffData(id, user);
  if (!c) notFound();

  const items = c.actionPlan?.items ?? [];
  const completed = items.filter((i) => i.status === "DONE");
  const outstanding = items.filter((i) => i.status !== "DONE");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/clients/${c.id}`} className="text-sm text-primary hover:underline">← Client</Link>
        <div className="flex items-center gap-3">
          <a
            href={`/clients/${c.id}/handoff/export`}
            className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-low"
          >
            Download .md
          </a>
          <PrintButton />
        </div>
      </div>

      <article className="card space-y-6 p-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Handoff summary</h1>
          <p className="mt-1 text-lg text-on-surface">{c.displayName}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Navigator {c.assignedNavigator?.name ?? "—"} · {formatDate(c.createdAt)} –{" "}
            {c.closedAt ? formatDate(c.closedAt) : "ongoing"}
            {c.agreement && ` · ${c.agreement.servicePackage}`}
          </p>
        </header>

        <Block title="Desired outcome">
          <p>{c.actionPlan?.desiredOutcome ?? "—"}</p>
        </Block>

        <Block title="Completed">
          {completed.length === 0 ? (
            <p className="text-on-surface-variant">None recorded.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {completed.map((i) => (
                <li key={i.id}>{i.title}{i.evidence && <span className="text-on-surface-variant"> — evidence: {i.evidence}</span>}</li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Outstanding items">
          {outstanding.length === 0 ? (
            <p className="text-on-surface-variant">None.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {outstanding.map((i) => (
                <li key={i.id}>
                  {i.title} — {actionStatusLabel[i.status]}
                  {i.dueDate && `, due ${formatDate(i.dueDate)}`}
                  {i.nextAction && <span className="text-on-surface-variant"> (next: {i.nextAction})</span>}
                </li>
              ))}
            </ul>
          )}
        </Block>

        {c.decisions.length > 0 && (
          <Block title="Decisions">
            <ul className="list-disc space-y-1 pl-5">
              {c.decisions.map((d) => (
                <li key={d.id}><strong>{d.question}</strong> → {d.decision} <span className="text-on-surface-variant">(by {d.decisionMaker}, {formatDate(d.createdAt)})</span></li>
              ))}
            </ul>
          </Block>
        )}

        {c.changeRequests.length > 0 && (
          <Block title="Scope / cost changes">
            <ul className="list-disc space-y-1 pl-5">
              {c.changeRequests.map((cr) => <li key={cr.id}>{cr.description} — {changeStatusLabel[cr.status]}</li>)}
            </ul>
          </Block>
        )}

        <Block title="Costs">
          {c.invoices.length === 0 ? (
            <p className="text-on-surface-variant">No invoices.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {c.invoices.map((inv) => <li key={inv.id}>Invoice {inv.number}: {money(total(inv.items))} — {invoiceStatusLabel[inv.status]}</li>)}
            </ul>
          )}
          {c.expenses.length > 0 && (
            <p className="mt-1 text-sm text-on-surface-variant">
              Approved third-party expenses: {money(c.expenses.reduce((s, e) => s + Number(e.amount), 0))}
            </p>
          )}
        </Block>

        <Block title="Records & retention">
          <p>Retention category: {c.retentionCategory ?? "—"}</p>
          {c.retentionReviewDate && <p>Retention review: {formatDate(c.retentionReviewDate)}</p>}
        </Block>

        <Block title="Next steps & maintenance guidance">
          <p>{c.maintenanceGuidance ?? "None recorded."}</p>
        </Block>

        <footer className="border-t border-outline-variant/40 pt-4 text-xs text-on-surface-variant">
          Alongside — non-clinical coordination. Generated {formatDate(new Date())}.
        </footer>
      </article>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-primary">{title}</h2>
      <div className="text-sm text-on-surface">{children}</div>
    </section>
  );
}
