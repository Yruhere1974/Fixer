import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { getPrivacyRequest } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canHandlePrivacy } from "@/lib/access";
import { formatDate, privacyRequestStatusLabel, privacyRequestTypeLabel } from "@/lib/labels";
import { completePrivacyRequest, updatePrivacyRequest, verifyRequester } from "../actions";
import { privacyStatusTone } from "../page";

export const dynamic = "force-dynamic";

export default async function PrivacyRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) notFound();
  const req = await getPrivacyRequest(id);
  if (!req) notFound();

  const rid = <input type="hidden" name="requestId" value={req.id} />;
  const now = new Date();
  const overdue = req.status !== "COMPLETED" && req.responseDueDate <= now;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/privacy" className="text-sm text-primary hover:underline">← Privacy requests</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{privacyRequestTypeLabel[req.type]} request</h1>
          <Badge tone={privacyStatusTone[req.status]}>{privacyRequestStatusLabel[req.status]}</Badge>
          <Badge tone={req.requesterVerified ? "green" : "amber"}>{req.requesterVerified ? "Identity verified" : "Identity unverified"}</Badge>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          From {req.requesterName} · received {formatDate(req.receivedAt)}
          {req.client && ` · ${req.client.displayName}`}
        </p>
        <p className={`mt-1 text-sm ${overdue ? "font-medium text-error" : "text-on-surface-variant"}`}>
          Response due {formatDate(req.responseDueDate)}{overdue && " — overdue"}
        </p>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Request</h2>
        <Field label="Scope">{req.scope}</Field>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Identity verification</h2>
        {req.requesterVerified ? (
          <p className="text-sm text-on-surface-variant">Verified via {req.verificationMethod ?? "—"}.</p>
        ) : (
          <form action={verifyRequester} className="flex flex-wrap items-end gap-2">
            {rid}
            <Labeled label="Verification method" hint="How the requester's identity was confirmed.">
              <TextInput name="verificationMethod" required className="w-72" />
            </Labeled>
            <SubmitButton variant="outline">Verify identity</SubmitButton>
          </form>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Handling</h2>
        <form action={updatePrivacyRequest} className="space-y-4">
          {rid}
          <Labeled label="Status">
            <Select name="status" defaultValue={req.status} className="sm:w-64">
              <option value="RECEIVED">Received</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="ESCALATED">Escalated</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </Labeled>
          <Labeled label="Records searched"><TextArea name="recordsSearched" rows={2} defaultValue={req.recordsSearched ?? ""} /></Labeled>
          <Labeled label="Outcome (provided / corrected / withheld / escalated)">
            <TextArea name="outcome" rows={2} defaultValue={req.outcome ?? ""} />
          </Labeled>
          <Labeled label="Reason / professional advice"><TextArea name="reason" rows={2} defaultValue={req.reason ?? ""} /></Labeled>
          <Labeled label="Client communication"><TextInput name="clientCommunication" defaultValue={req.clientCommunication ?? ""} /></Labeled>
          <SubmitButton pendingLabel="Saving…">Save handling</SubmitButton>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-outline-variant/40 pt-5 text-sm">
          {req.status === "COMPLETED" ? (
            <span className="text-on-surface-variant">Completed {formatDate(req.completedAt)}.</span>
          ) : (
            <form action={completePrivacyRequest}>
              {rid}
              <button
                disabled={!req.requesterVerified}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container disabled:opacity-50"
              >
                Mark completed
              </button>
            </form>
          )}
          {!req.requesterVerified && req.status !== "COMPLETED" && (
            <span className="text-xs text-on-surface-variant/70">Cannot complete until identity is verified (§8.5).</span>
          )}
        </div>
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
