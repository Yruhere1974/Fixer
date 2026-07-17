import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { getRetentionCandidates, listDestructions } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canHandlePrivacy } from "@/lib/access";
import { formatDate } from "@/lib/labels";
import { destroyClientRecord } from "./actions";

export const dynamic = "force-dynamic";

export default async function RetentionPage() {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) notFound();
  const [{ eligible, onHold }, destructions] = await Promise.all([
    getRetentionCandidates(),
    listDestructions(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Retention &amp; secure destruction</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Records past their retention date (§8.8). Destruction is stopped by a legal hold, an open
          incident, or an open privacy request. Destruction is irreversible and records a content-free
          tombstone.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-primary">Eligible for destruction</h2>
        {eligible.length === 0 ? (
          <p className="text-sm text-on-surface-variant/70">Nothing eligible.</p>
        ) : (
          <ul className="space-y-3">
            {eligible.map((c) => (
              <li key={c.id} className="rounded-xl border border-outline-variant/50 bg-surface-low p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{c.displayName}</span>
                  <span className="text-xs text-on-surface-variant">
                    {c.retentionCategory ?? "—"} · review {formatDate(c.retentionReviewDate)}
                  </span>
                </div>
                <form action={destroyClientRecord} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="clientId" value={c.id} />
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-on-surface-variant">Method</span>
                    <TextInput name="method" defaultValue="Deleted from workspace" className="w-56" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-medium text-on-surface-variant">Note (optional)</span>
                    <TextInput name="note" className="w-56" />
                  </label>
                  <SubmitButton variant="danger" pendingLabel="Destroying…">Destroy record</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-primary">On hold — preserved</h2>
        {onHold.length === 0 ? (
          <p className="text-sm text-on-surface-variant/70">None.</p>
        ) : (
          <ul className="space-y-2">
            {onHold.map(({ client, reasons }) => (
              <li key={client.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{client.displayName}</span>
                <span className="text-xs text-on-surface-variant">review {formatDate(client.retentionReviewDate)}</span>
                {reasons.map((r) => <Badge key={r} tone="amber">{r}</Badge>)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-primary">Destruction log</h2>
        {destructions.length === 0 ? (
          <p className="text-sm text-on-surface-variant/70">No destructions recorded.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {destructions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-2 text-on-surface-variant">
                <span className="text-xs text-on-surface-variant/60">{formatDate(d.destroyedAt)}</span>
                <span className="text-on-surface">{d.subjectLabel}</span>
                <span className="text-xs">rule: {d.retentionCategory ?? "—"} · {d.method ?? "—"}</span>
                <span className="text-xs text-on-surface-variant/60">— {d.destroyedBy?.name ?? "system"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
