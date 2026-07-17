import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/db";
import { getIncident } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canHandleIncidents } from "@/lib/access";
import { formatDate, incidentStatusLabel, incidentTypeLabel, severityLabel } from "@/lib/labels";
import { closeIncident, updateInvestigation, verifyCorrective } from "../actions";
import { incidentStatusTone, severityTone } from "../page";

export const dynamic = "force-dynamic";

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!canHandleIncidents(user.role)) notFound();
  const incident = await getIncident(id);
  if (!incident) notFound();

  const handlers = await prisma.user.findMany({
    where: { active: true, role: { in: ["FOUNDER", "LEAD_NAVIGATOR", "PRIVACY_LEAD"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const iid = <input type="hidden" name="incidentId" value={incident.id} />;
  const now = new Date();
  const reviewOverdue = incident.status !== "CLOSED" && incident.reviewDueAt <= now;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/incidents" className="text-sm text-primary hover:underline">← Incidents</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{incidentTypeLabel[incident.type]}</h1>
          <Badge tone={severityTone[incident.severity]}>{severityLabel[incident.severity]}</Badge>
          <Badge tone={incidentStatusTone[incident.status]}>{incidentStatusLabel[incident.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          Discovered {formatDate(incident.discoveredAt)}
          {incident.client && ` · ${incident.client.displayName}`} · reported by {incident.reportedByName}
        </p>
        <p className={`mt-1 text-sm ${reviewOverdue ? "font-medium text-error" : "text-on-surface-variant"}`}>
          48-hour review due {formatDate(incident.reviewDueAt)}{reviewOverdue && " — overdue"}
        </p>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Report</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Objective description">{incident.description}</Field>
          <Field label="Immediate action">{incident.immediateAction ?? "—"}</Field>
          <Field label="People affected">{incident.peopleAffected ?? "—"}</Field>
          <Field label="Information affected">{incident.infoAffected ?? "—"}</Field>
          <Field label="Notifications / referrals">{incident.notifications ?? "—"}</Field>
          <Field label="Occurred">{formatDate(incident.occurredAt)}</Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Investigation &amp; corrective action</h2>
        <form action={updateInvestigation} className="space-y-4">
          {iid}
          <div className="grid gap-4 sm:grid-cols-3">
            <Labeled label="Severity">
              <Select name="severity" defaultValue={incident.severity}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
              </Select>
            </Labeled>
            <Labeled label="Status">
              <Select name="status" defaultValue={incident.status}>
                <option value="OPEN">Open</option><option value="UNDER_REVIEW">Under review</option>
                <option value="CORRECTIVE_ACTION">Corrective action</option><option value="CLOSED">Closed</option>
              </Select>
            </Labeled>
            <Labeled label="Escalation owner">
              <Select name="escalationOwnerId" defaultValue={incident.escalationOwnerId ?? ""}>
                <option value="">—</option>
                {handlers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            </Labeled>
          </div>
          <Labeled label="Investigation findings">
            <TextArea name="findings" rows={2} defaultValue={incident.findings ?? ""} />
          </Labeled>
          <Labeled label="Corrective actions">
            <TextArea name="correctiveActions" rows={2} defaultValue={incident.correctiveActions ?? ""} />
          </Labeled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Corrective owner"><TextInput name="correctiveOwner" defaultValue={incident.correctiveOwner ?? ""} /></Labeled>
            <Labeled label="Corrective deadline">
              <TextInput name="correctiveDeadline" type="date" defaultValue={incident.correctiveDeadline ? incident.correctiveDeadline.toISOString().slice(0, 10) : ""} />
            </Labeled>
          </div>
          <Labeled label="Related policy / training / vendor / system change">
            <TextInput name="relatedChange" defaultValue={incident.relatedChange ?? ""} />
          </Labeled>
          <SubmitButton pendingLabel="Saving…">Save investigation</SubmitButton>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Closure</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge tone={incident.correctiveVerified ? "green" : "amber"}>
            {incident.correctiveVerified ? "Corrective action verified" : "Corrective action not verified"}
          </Badge>
          {incident.status === "CLOSED" ? (
            <span className="text-on-surface-variant">
              Closed {formatDate(incident.closedAt)} · approved by {incident.closureApprovedBy?.name ?? "—"}
            </span>
          ) : (
            <>
              {!incident.correctiveVerified && (
                <form action={verifyCorrective}>
                  {iid}
                  <SubmitButton variant="outline">Verify corrective action</SubmitButton>
                </form>
              )}
              <form action={closeIncident}>
                {iid}
                <button
                  disabled={!incident.correctiveVerified}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container disabled:opacity-50"
                >
                  Close (approve)
                </button>
              </form>
            </>
          )}
        </div>
        {!incident.correctiveVerified && incident.status !== "CLOSED" && (
          <p className="mt-2 text-xs text-on-surface-variant/70">Closure is blocked until corrective action is verified (§6.12).</p>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-on-surface-variant/70">{label}</div>
      <div className="mt-1 text-on-surface">{children}</div>
    </div>
  );
}
