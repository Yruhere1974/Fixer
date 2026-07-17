import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { Checkbox, Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { DisclosureForm } from "./disclosure-form";
import { AddConsentForm } from "./add-consent-form";
import { AddActionItemForm } from "./add-item-form";
import { approveActionItem, completeActionItem } from "./actions";
import {
  addApprovedContact,
  closeoutClient,
  createActionPlan,
  recordAgreement,
  saveIntake,
  updateClientStatus,
  withdrawConsent,
} from "./journey-actions";
import { getClientDetail } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canCoordinate } from "@/lib/access";
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
import type { ActionStatus, CommunicationChannel, InfoCategory } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

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

const INFO_CATEGORIES: InfoCategory[] = [
  "CONTACT_DETAILS", "SCHEDULING", "PROVIDER_COORDINATION", "GENERAL_WELLBEING",
  "ACCESSIBILITY", "FINANCIAL", "HEALTH_SENSITIVE", "SAFEGUARDING", "IDENTITY_DOCUMENT",
];
const CHANNELS: CommunicationChannel[] = ["SECURE_PORTAL", "EMAIL", "PHONE", "SMS", "IN_PERSON", "MAIL"];

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const client = await getClientDetail(id, user);
  if (!client) notFound();
  const mayCoordinate = canCoordinate(user.role);
  const hidden = <input type="hidden" name="clientId" value={client.id} />;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-primary hover:underline">← Workspace</Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Client</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">{client.displayName}</h1>
          <Badge tone={client.status === "ACTIVE" ? "green" : "gray"}>{clientStatusLabel[client.status]}</Badge>
        </div>
        <p className="mt-2 text-on-surface-variant">
          Navigator <span className="text-on-surface">{client.assignedNavigator?.name ?? "—"}</span>{" "}
          · Retention {client.retentionCategory ?? "—"}
          {client.legalHold && " · Legal hold"}
        </p>

        {mayCoordinate && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <form action={updateClientStatus} className="flex items-end gap-2">
              {hidden}
              <Labeled label="Status">
                <Select name="status" defaultValue={client.status} className="w-40">
                  <option value="PROSPECT">Prospect</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </Labeled>
              <SubmitButton variant="outline">Update</SubmitButton>
            </form>
          </div>
        )}
      </div>

      {/* Journey */}
      <Section title="Journey">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Inquiry">
            {client.inquiry ? (
              <>
                {client.inquiry.source} · {fitDecisionLabel[client.inquiry.fitDecision]}
                <div className="text-on-surface-variant">{client.inquiry.generalReason}</div>
              </>
            ) : "—"}
          </Field>
          <Field label="Scope & safety screen">
            {client.screening ? (
              <>
                {screenOutcomeLabel[client.screening.outcome]} ·{" "}
                {client.screening.immediateConcern ? "Immediate concern" : "No immediate concern"}
                <div className="text-on-surface-variant">{client.screening.objectiveFacts}</div>
              </>
            ) : "—"}
          </Field>
          <Field label="Agreement">
            {client.agreement ? (
              <>
                {client.agreement.servicePackage} ({client.agreement.versionAccepted}) ·{" "}
                {client.agreement.feesConfirmed ? "Fees confirmed" : "Fees pending"}
              </>
            ) : "—"}
          </Field>
          <Field label="Intake objective">
            {client.intake ? client.intake.serviceObjective : "—"}
            {client.intake?.doNotShare && (
              <div className="mt-1 font-medium text-error">Do not share: {client.intake.doNotShare}</div>
            )}
          </Field>
        </div>

        {mayCoordinate && (
          <>
            <Editor label="Record / update agreement (step 4)">
              <form action={recordAgreement} className="space-y-3">
                {hidden}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Labeled label="Service package">
                    <TextInput name="servicePackage" required defaultValue={client.agreement?.servicePackage ?? ""} placeholder="e.g. Clarity Session" />
                  </Labeled>
                  <Labeled label="Version accepted">
                    <TextInput name="versionAccepted" defaultValue={client.agreement?.versionAccepted ?? "SA-v1.0"} />
                  </Labeled>
                </div>
                <div className="flex flex-wrap gap-6">
                  <Checkbox name="feesConfirmed" label="Fees confirmed" defaultChecked={client.agreement?.feesConfirmed} />
                  <Checkbox name="responseTimesConfirmed" label="Response times confirmed" defaultChecked={client.agreement?.responseTimesConfirmed} />
                </div>
                <SubmitButton pendingLabel="Saving…">Save agreement</SubmitButton>
              </form>
            </Editor>

            <Editor label="Edit intake (step 6)">
              <form action={saveIntake} className="space-y-3">
                {hidden}
                <Labeled label="Service objective">
                  <TextInput name="serviceObjective" required defaultValue={client.intake?.serviceObjective ?? ""} />
                </Labeled>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Labeled label="Preferred name"><TextInput name="preferredName" defaultValue={client.intake?.preferredName ?? ""} /></Labeled>
                  <Labeled label="Pronouns"><TextInput name="pronouns" defaultValue={client.intake?.pronouns ?? ""} /></Labeled>
                  <Labeled label="Top priorities"><TextInput name="topPriorities" defaultValue={client.intake?.topPriorities ?? ""} /></Labeled>
                  <Labeled label="Budget range"><TextInput name="budgetRange" defaultValue={client.intake?.budgetRange ?? ""} /></Labeled>
                  <Labeled label="Accessibility needs"><TextInput name="accessibilityNeeds" defaultValue={client.intake?.accessibilityNeeds ?? ""} /></Labeled>
                  <Labeled label="Deadlines"><TextInput name="deadlines" defaultValue={client.intake?.deadlines ?? ""} /></Labeled>
                </div>
                <Labeled label="Do not share" hint="Information the client does not want shared.">
                  <TextInput name="doNotShare" defaultValue={client.intake?.doNotShare ?? ""} />
                </Labeled>
                <SubmitButton pendingLabel="Saving…">Save intake</SubmitButton>
              </form>
            </Editor>
          </>
        )}
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
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{consentTypeLabel[c.type]}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={consentTone[status]}>{consentStatusLabel[status]}</Badge>
                      {mayCoordinate && status === "ACTIVE" && (
                        <form action={withdrawConsent}>
                          {hidden}
                          <input type="hidden" name="consentId" value={c.id} />
                          <button className="rounded-full border border-error/50 px-2.5 py-0.5 text-xs font-medium text-error hover:bg-error-container/40">
                            Withdraw
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.coveredInfo.map((i) => (
                      <span key={i} className="rounded-full bg-primary-fixed/60 px-2 py-0.5 text-xs text-on-primary-fixed">
                        {infoCategoryLabel[i]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-on-surface-variant">
                    Channels: {c.channels.map((ch) => channelLabel[ch]).join(", ") || "—"}
                    {c.recipients.length > 0 && ` · Recipients: ${c.recipients.map((r) => r.name).join(", ")}`}
                  </div>
                  {c.excludedInfo && <div className="font-medium text-error">Excludes: {c.excludedInfo}</div>}
                  <div className="mt-1 text-xs text-on-surface-variant/70">
                    Effective {formatDate(c.effectiveDate)}
                    {c.expiryDate && ` · expires ${formatDate(c.expiryDate)}`} · recorded by {c.recordedBy?.name ?? "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {mayCoordinate && (
          <>
            <Editor label="Add approved contact">
              <form action={addApprovedContact} className="space-y-3">
                {hidden}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Labeled label="Name"><TextInput name="name" required /></Labeled>
                  <Labeled label="Relationship"><TextInput name="relationship" required placeholder="e.g. Daughter" /></Labeled>
                </div>
                <fieldset>
                  <legend className="mb-1 text-sm font-medium text-on-surface-variant">Permitted information</legend>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {INFO_CATEGORIES.map((i) => <Checkbox key={i} name="permittedInfo" value={i} label={infoCategoryLabel[i]} />)}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-1 text-sm font-medium text-on-surface-variant">Channels</legend>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {CHANNELS.map((ch) => <Checkbox key={ch} name="channels" value={ch} label={channelLabel[ch]} />)}
                  </div>
                </fieldset>
                <SubmitButton pendingLabel="Adding…">Add contact</SubmitButton>
              </form>
            </Editor>

            <Editor label="Record consent (step 5)">
              <AddConsentForm clientId={client.id} contacts={client.approvedContacts.map((c) => ({ id: c.id, name: c.name }))} />
            </Editor>
          </>
        )}
      </Section>

      {/* Action plan */}
      <Section title="Action plan">
        {!client.actionPlan ? (
          <>
            <p className="text-sm text-on-surface-variant/70">No action plan yet.</p>
            {mayCoordinate && (
              <form action={createActionPlan} className="mt-3 space-y-3">
                {hidden}
                <Labeled label="Desired outcome">
                  <TextInput name="desiredOutcome" required placeholder="A clear, approved plan the client can follow." />
                </Labeled>
                <SubmitButton pendingLabel="Creating…">Create plan</SubmitButton>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-on-surface-variant">
              Desired outcome: <span className="text-on-surface">{client.actionPlan.desiredOutcome}</span>
            </p>
            <ul className="space-y-3">
              {client.actionPlan.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-outline-variant/50 bg-surface-low p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{item.title}</span>
                    <Badge tone={actionTone[item.status]}>{actionStatusLabel[item.status]}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    {priorityLabel[item.priority]} · Owner {item.owner?.name ?? "—"} · Due {formatDate(item.dueDate)} ·
                    Approval {approvalStatusLabel[item.approvalStatus]}
                    {item.estimatedCost != null && ` · Est. ${money(item.estimatedCost)}`}
                  </div>
                  {item.evidence && <div className="mt-1 text-xs font-medium text-primary">Evidence: {item.evidence}</div>}

                  {item.status !== "DONE" && mayCoordinate && (
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
                          <span className="mb-1 block font-medium text-on-surface-variant">Evidence of completion (required)</span>
                          <input name="evidence" required className="field w-64 px-2.5 py-1.5" placeholder="e.g. Booking confirmed #1234" />
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

            {mayCoordinate && (
              <Editor label="Add action (step 8)">
                <AddActionItemForm clientId={client.id} />
              </Editor>
            )}
          </>
        )}
      </Section>

      {/* Disclosure guard */}
      <Section title="Family update — consent guard">
        {!mayCoordinate ? (
          <p className="text-sm text-on-surface-variant/70">
            Your role has read-only access to this client; disclosures are performed by an assigned navigator.
          </p>
        ) : client.approvedContacts.length === 0 ? (
          <p className="text-sm text-on-surface-variant/70">No approved contacts recorded.</p>
        ) : (
          <DisclosureForm
            clientId={client.id}
            contacts={client.approvedContacts.map((c) => ({ id: c.id, name: c.name, relationship: c.relationship }))}
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
                  <span className="text-xs text-on-surface-variant/60">{formatDate(d.disclosedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Closeout */}
      {mayCoordinate && (
        <Section title="Closeout (steps 13–15)">
          <form action={closeoutClient} className="space-y-3">
            {hidden}
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Retention category">
                <Select name="retentionCategory" defaultValue={client.retentionCategory ?? "STANDARD_SERVICE"}>
                  <option value="SHORT_TERM">Short term</option>
                  <option value="STANDARD_SERVICE">Standard service</option>
                  <option value="FINANCIAL">Financial</option>
                  <option value="INCIDENT_LEGAL">Incident / legal</option>
                  <option value="CONSENT_RECORD">Consent record</option>
                </Select>
              </Labeled>
              <Labeled label="Retention review date">
                <TextInput name="retentionReviewDate" type="date" />
              </Labeled>
            </div>
            <Labeled label="Closeout feedback (optional)">
              <TextArea name="feedback" rows={2} placeholder="Client feedback / closeout notes." />
            </Labeled>
            <SubmitButton variant="danger" pendingLabel="Closing…">Close engagement</SubmitButton>
          </form>
        </Section>
      )}

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">{title}</h2>
      {children}
    </section>
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

function Editor({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-4 rounded-xl border border-outline-variant/50 bg-surface-low p-3">
      <summary className="cursor-pointer text-sm font-medium text-primary">{label}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
