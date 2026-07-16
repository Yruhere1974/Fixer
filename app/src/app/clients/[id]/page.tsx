import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { DisclosureForm } from "./disclosure-form";
import { approveActionItem, completeActionItem } from "./actions";
import { getClientDetail } from "@/lib/queries";
import { consentStatus, type ConsentStatus } from "@/lib/consent";
import {
  actionStatusLabel,
  approvalStatusLabel,
  channelLabel,
  clientStatusLabel,
  consentStatusLabel,
  consentTypeLabel,
  fitDecisionLabel,
  formatDate,
  infoCategoryLabel,
  money,
  priorityLabel,
  screenOutcomeLabel,
} from "@/lib/labels";
import type { ActionStatus } from "@/generated/prisma/client";

const consentTone: Record<ConsentStatus, "green" | "amber" | "red" | "gray" | "blue"> = {
  ACTIVE: "green",
  SCHEDULED: "blue",
  EXPIRED: "red",
  WITHDRAWN: "red",
};

const actionTone: Record<ActionStatus, "gray" | "blue" | "amber" | "green"> = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "blue",
  BLOCKED: "amber",
  AWAITING_APPROVAL: "amber",
  DONE: "green",
};

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientDetail(id);
  if (!client) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← All clients
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{client.displayName}</h1>
          <Badge tone={client.status === "ACTIVE" ? "green" : "gray"}>
            {clientStatusLabel[client.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Navigator: {client.assignedNavigator?.name ?? "—"} · Retention:{" "}
          {client.retentionCategory ?? "—"}
          {client.legalHold && " · Legal hold"}
        </p>
      </div>

      {/* Journey (workflow.md) */}
      <Section title="Journey">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Inquiry">
            {client.inquiry ? (
              <>
                {client.inquiry.source} · {fitDecisionLabel[client.inquiry.fitDecision]}
                <div className="text-zinc-500">{client.inquiry.generalReason}</div>
              </>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Scope & safety screen">
            {client.screening ? (
              <>
                {screenOutcomeLabel[client.screening.outcome]} ·{" "}
                {client.screening.immediateConcern ? "Immediate concern" : "No immediate concern"}
                <div className="text-zinc-500">{client.screening.objectiveFacts}</div>
              </>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Agreement">
            {client.agreement ? (
              <>
                {client.agreement.servicePackage} ({client.agreement.versionAccepted}) ·{" "}
                {client.agreement.feesConfirmed ? "Fees confirmed" : "Fees pending"}
              </>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Intake objective">
            {client.intake ? client.intake.serviceObjective : "—"}
            {client.intake?.doNotShare && (
              <div className="mt-1 text-red-700">Do not share: {client.intake.doNotShare}</div>
            )}
          </Field>
        </div>
      </Section>

      {/* Consents */}
      <Section title="Consents & authority">
        {client.consents.length === 0 ? (
          <p className="text-sm text-zinc-400">No consents recorded.</p>
        ) : (
          <ul className="space-y-3">
            {client.consents.map((c) => {
              const status = consentStatus(c);
              return (
                <li key={c.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{consentTypeLabel[c.type]}</span>
                    <Badge tone={consentTone[status]}>{consentStatusLabel[status]}</Badge>
                  </div>
                  <div className="mt-1 text-zinc-600">
                    Covers: {c.coveredInfo.map((i) => infoCategoryLabel[i]).join(", ") || "—"}
                  </div>
                  <div className="text-zinc-600">
                    Channels: {c.channels.map((ch) => channelLabel[ch]).join(", ") || "—"}
                  </div>
                  {c.recipients.length > 0 && (
                    <div className="text-zinc-600">
                      Recipients: {c.recipients.map((r) => r.name).join(", ")}
                    </div>
                  )}
                  {c.excludedInfo && <div className="text-red-700">Excludes: {c.excludedInfo}</div>}
                  <div className="mt-1 text-xs text-zinc-400">
                    Effective {formatDate(c.effectiveDate)}
                    {c.expiryDate && ` · expires ${formatDate(c.expiryDate)}`} · recorded by{" "}
                    {c.recordedBy?.name ?? "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Action plan */}
      <Section title="Action plan">
        {!client.actionPlan ? (
          <p className="text-sm text-zinc-400">No action plan yet.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-zinc-600">
              Desired outcome: {client.actionPlan.desiredOutcome}
            </p>
            <ul className="space-y-3">
              {client.actionPlan.items.map((item) => (
                <li key={item.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{item.title}</span>
                    <Badge tone={actionTone[item.status]}>{actionStatusLabel[item.status]}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {priorityLabel[item.priority]} · Owner {item.owner?.name ?? "—"} · Due{" "}
                    {formatDate(item.dueDate)} · Approval {approvalStatusLabel[item.approvalStatus]}
                    {item.estimatedCost != null && ` · Est. ${money(item.estimatedCost)}`}
                  </div>
                  {item.evidence && (
                    <div className="mt-1 text-xs text-emerald-700">Evidence: {item.evidence}</div>
                  )}

                  {item.status !== "DONE" && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3">
                      {item.approvalStatus === "PENDING" && (
                        <form action={approveActionItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">
                            Approve
                          </button>
                        </form>
                      )}
                      <form action={completeActionItem} className="flex items-end gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <label className="text-xs">
                          <span className="mb-1 block text-zinc-600">
                            Evidence of completion (required)
                          </span>
                          <input
                            name="evidence"
                            required
                            className="w-64 rounded-md border border-zinc-300 px-2 py-1"
                            placeholder="e.g. Booking confirmed #1234"
                          />
                        </label>
                        <button className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800">
                          Mark done
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {/* Disclosure guard */}
      <Section title="Family update (consent guard)">
        {client.approvedContacts.length === 0 ? (
          <p className="text-sm text-zinc-400">No approved contacts recorded.</p>
        ) : (
          <DisclosureForm
            clientId={client.id}
            contacts={client.approvedContacts.map((c) => ({
              id: c.id,
              name: c.name,
              relationship: c.relationship,
            }))}
          />
        )}

        {client.disclosures.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-700">Recent disclosure attempts</h3>
            <ul className="space-y-1 text-sm">
              {client.disclosures.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Badge tone={d.allowed ? "green" : "red"}>{d.allowed ? "Sent" : "Blocked"}</Badge>
                  <span className="text-zinc-700">
                    {infoCategoryLabel[d.category]} → {d.recipientName} via {channelLabel[d.channel]}
                  </span>
                  <span className="text-xs text-zinc-400">{formatDate(d.disclosedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Audit */}
      <Section title="Audit trail">
        <ul className="space-y-1 text-sm">
          {client.auditEvents.map((e) => (
            <li key={e.id} className="flex gap-2 text-zinc-600">
              <span className="text-xs text-zinc-400">{formatDate(e.createdAt)}</span>
              <span className="font-mono text-xs text-zinc-500">{e.action}</span>
              <span>{e.summary}</span>
              <span className="text-xs text-zinc-400">— {e.actor?.name ?? "system"}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-0.5 text-zinc-800">{children}</div>
    </div>
  );
}
