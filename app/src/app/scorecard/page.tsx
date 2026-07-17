import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getScorecard } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canViewAllClients } from "@/lib/access";

export const dynamic = "force-dynamic";

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((100 * n) / d)}%` : "—";
}

export default async function ScorecardPage() {
  const user = await requireUser();
  if (!canViewAllClients(user.role)) notFound();
  const s = await getScorecard();
  const promisesResolved = s.promisesKept + s.promisesMissed;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">White-glove scorecard</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Service-experience and operational measures. Measure coordination quality and client
          experience — not medical outcomes.
        </p>
      </div>

      <Group title="Relationship & contact">
        <Tile label="Active clients" value={String(s.clientsActive)} sub={`${s.clientsTotal} total`} />
        <Tile label="Have a primary lead" value={pct(s.withPrimary, s.clientsTotal)} />
        <Tile label="Have a named backup" value={pct(s.withBackup, s.clientsTotal)} />
        <Tile label="Overdue for contact" value={String(s.contactOverdue)} tone={s.contactOverdue > 0 ? "bad" : "good"} />
      </Group>

      <Group title="Promises to clients">
        <Tile label="Promises kept" value={pct(s.promisesKept, promisesResolved)} sub={`${s.promisesKept}/${promisesResolved} resolved`} tone={s.promisesKept === promisesResolved ? "good" : undefined} />
        <Tile label="Open promises" value={String(s.promisesOpen)} />
        <Tile label="Missed" value={String(s.promisesMissed)} tone={s.promisesMissed > 0 ? "bad" : "good"} />
        <Tile label="Delays told before deadline" value={pct(s.missedToldBefore, s.promisesMissed)} sub="of missed promises" />
      </Group>

      <Group title="Continuity & recovery">
        <Tile label="Warm handoffs completed" value={pct(s.handoffsCompleted, s.handoffsTotal)} sub={`${s.handoffsCompleted}/${s.handoffsTotal}`} />
        <Tile label="Open service recovery" value={String(s.recoveriesOpen)} tone={s.recoveriesOpen > 0 ? "bad" : "good"} />
        <Tile label="Recovery resolved with client" value={pct(s.recoveriesConfirmed, s.recoveriesTotal)} sub={`${s.recoveriesConfirmed}/${s.recoveriesTotal}`} />
        <Tile label="Upcoming appointments (7d)" value={String(s.appointmentsUpcoming)} />
      </Group>

      <Group title="Client experience">
        <Tile
          label="Client effort (ease)"
          value={s.avgEffort != null ? `${s.avgEffort.toFixed(1)}/5` : "—"}
          sub="“How easy was it to get this handled?”"
          tone={s.avgEffort != null ? (s.avgEffort >= 4 ? "good" : s.avgEffort <= 2.5 ? "bad" : undefined) : undefined}
        />
        <Tile
          label="Client confidence"
          value={s.avgConfidence != null ? `${s.avgConfidence.toFixed(1)}/5` : "—"}
          sub="“Did you know what would happen next?”"
          tone={s.avgConfidence != null ? (s.avgConfidence >= 4 ? "good" : s.avgConfidence <= 2.5 ? "bad" : undefined) : undefined}
        />
        <Tile label="Feedback responses" value={String(s.feedbackCount)} />
      </Group>

      <Group title="Compliance & finance">
        <Tile label="Providers verified (not stale)" value={pct(s.providersPresentable, s.providersTotal)} sub={`${s.providersPresentable}/${s.providersTotal}`} />
        <Tile label="Open incidents" value={String(s.incidentsOpen)} tone={s.incidentsOpen > 0 ? "bad" : "good"} />
        <Tile label="Open privacy requests" value={String(s.privacyOpen)} tone={s.privacyOpen > 0 ? "bad" : "good"} />
        <Tile label="Invoices overdue" value={String(s.invoicesOverdue)} tone={s.invoicesOverdue > 0 ? "bad" : "good"} />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const valueColor = tone === "bad" ? "text-error" : tone === "good" ? "text-primary" : "text-on-surface";
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-on-surface-variant/70">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-on-surface-variant">{sub}</div>}
    </div>
  );
}
