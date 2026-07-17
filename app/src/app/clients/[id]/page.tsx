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
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Workspace
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Client
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
            {client.displayName}
          </h1>
          <Badge tone={client.status === "ACTIVE" ? "green" : "gray"}>
            {clientStatusLabel[client.status]}
          </Badge>
        </div>
        <p className="mt-2 text-on-surface-variant">
          Navigator <span className="text-on-surface">{client.assignedNavigator?.name ?? "—"}</span>{" "}
          · Retention {client.retentionCategory ?? "—"}
          {client.legalHold && " · Legal hold"}
        </p>
      </div>

      {/* Journey (workflow.md) */}
      <Section title="Journey">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Inquiry">
            {client.inquiry ? (
              <>
                {client.inquiry.source} · {fitDecisionLabel[client.inquiry.fitDecision]}
                <div className="text-on-surface-variant">{client.inquiry.generalReason}</div>
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
                <div className="text-on-surface-variant">{client.screening.objectiveFacts}</div>
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
              <div className="mt-1 font-medium text-error">
                Do not share: {client.intake.doNotShare}
              </div>
            )}
          </Field>
        </div>
      </Section>

      {/* Consents */}
      <Section title="Consents & authority">
        {client.consents.length === 0 ? (
          <p className="text-sm text-on-surface-variant/70">No consents recorded.</p>
        ) : (
          <ul className="space-y-3">
            {client.consents.map((c) => {
              const status = consentStatus(c);
              return (
                <li key={c.id} className="rounded-xl border border-outline-variant/50 bg-surface-low p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{consentTypeLabel[c.type]}</span>
                    <Badge tone={consentTone[status]}>{consentStatusLabel[status]}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.coveredInfo.map((i) => (
                      <span
                        key={i}
                        className="rounded-full bg-primary-fixed/60 px-2 py-0.5 text-xs text-on-primary-fixed"
                      >
                        {infoCategoryLabel[i]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-on-surface-variant">
                    Channels: {c.channels.map((ch) => channelLabel[ch]).join(", ") || "—"}
                    {c.recipients.length > 0 &&
                      ` · Recipients: ${c.recipients.map((r) => r.name).join(", ")}`}
                  </div>
                  {c.excludedInfo && (
                    <div className="font-medium text-error">Excludes: {c.excludedInfo}</div>
                  )}
                  <div className="mt-1 text-xs text-on-surface-variant/70">
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
          <p className="text-sm text-on-surface-variant/70">No action plan yet.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-on-surface-variant">
              Desired outcome:{" "}
              <span className="text-on-surface">{client.actionPlan.desiredOutcome}</span>
            </p>
            <ul className="space-y-3">
              {client.actionPlan.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-outline-variant/50 bg-surface-low p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{item.title}</span>
                    <Badge tone={actionTone[item.status]}>{actionStatusLabel[item.status]}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    {priorityLabel[item.priority]} · Owner {item.owner?.name ?? "—"} · Due{" "}
                    {formatDate(item.dueDate)} · Approval {approvalStatusLabel[item.approvalStatus]}
                    {item.estimatedCost != null && ` · Est. ${money(item.estimatedCost)}`}
                  </div>
                  {item.evidence && (
                    <div className="mt-1 text-xs font-medium text-primary">
                      Evidence: {item.evidence}
                    </div>
                  )}

                  {item.status !== "DONE" && (
                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-outline-variant/40 pt-4">
                      {item.approvalStatus === "PENDING" && (
                        <form action={approveActionItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button className="rounded-full border-2 border-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary-container/40">
                            Approve
                          </button>
                        </form>
                      )}
                      <form action={completeActionItem} className="flex items-end gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <label className="text-xs">
                          <span className="mb-1 block font-medium text-on-surface-variant">
                            Evidence of completion (required)
                          </span>
                          <input
                            name="evidence"
                            required
                            className="field w-64 px-2.5 py-1.5"
                            placeholder="e.g. Booking confirmed #1234"
                          />
                        </label>
                        <button className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container">
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
      <Section title="Family update — consent guard">
        {client.approvedContacts.length === 0 ? (
          <p className="text-sm text-on-surface-variant/70">No approved contacts recorded.</p>
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
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">Recent disclosure attempts</h3>
            <ul className="space-y-1.5 text-sm">
              {client.disclosures.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone={d.allowed ? "green" : "red"}>{d.allowed ? "Sent" : "Blocked"}</Badge>
                  <span className="text-on-surface-variant">
                    {infoCategoryLabel[d.category]} → {d.recipientName} via {channelLabel[d.channel]}
                  </span>
                  <span className="text-xs text-on-surface-variant/60">
                    {formatDate(d.disclosedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Audit */}
      <Section title="Audit trail">
        <ul className="space-y-2 text-sm">
          {client.auditEvents.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-2 text-on-surface-variant">
              <span className="text-xs text-on-surface-variant/60">{formatDate(e.createdAt)}</span>
              <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
                {e.action}
              </span>
              <span className="text-on-surface">{e.summary}</span>
              <span className="text-xs text-on-surface-variant/60">— {e.actor?.name ?? "system"}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-on-surface-variant/70">
        {label}
      </div>
      <div className="mt-1 text-on-surface">{children}</div>
    </div>
  );
}
