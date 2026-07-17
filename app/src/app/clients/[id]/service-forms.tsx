"use client";

import { useActionState } from "react";
import { addAppointment, addHandoff, addRecovery } from "./journey-actions";
import { FormError, Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { recoveryIssueTypeLabel } from "@/lib/labels";
import type { FormState } from "@/lib/forms";
import type { RecoveryIssueType } from "@/generated/prisma/client";

const ISSUE_TYPES: RecoveryIssueType[] = [
  "MISSED_CALLBACK", "CONFUSING_MESSAGE", "PROVIDER_CANCELLATION", "DELAY",
  "REPEATED_REQUEST", "BILLING_SURPRISE", "POOR_HANDOFF", "FELT_UNHEARD", "OTHER",
];

export function AddAppointmentForm({ clientId }: { clientId: string }) {
  const action = addAppointment.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Appointment title (neutral)" hint="No clinical detail — e.g. “Physiotherapy appointment”.">
          <TextInput name="purpose" required />
        </Labeled>
        <Labeled label="Provider (optional)"><TextInput name="providerName" /></Labeled>
        <Labeled label="Date & time"><TextInput name="scheduledAt" type="datetime-local" /></Labeled>
        <Labeled label="Location"><TextInput name="location" /></Labeled>
        <Labeled label="Transportation"><TextInput name="transportation" /></Labeled>
        <Labeled label="Companion"><TextInput name="companion" /></Labeled>
        <Labeled label="Accessibility arrangements"><TextInput name="accessibilityArrangements" /></Labeled>
        <Labeled label="What to bring"><TextInput name="whatToBring" /></Labeled>
      </div>
      <Labeled label="Client questions for the provider"><TextArea name="clientQuestions" rows={2} /></Labeled>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Adding…">Add appointment</SubmitButton>
    </form>
  );
}

export function AddHandoffForm({ clientId }: { clientId: string }) {
  const action = addHandoff.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Handing off to"><TextInput name="toName" required placeholder="Name of the person receiving" /></Labeled>
        <Labeled label="Reason another person is involved"><TextInput name="reason" required /></Labeled>
      </div>
      <Labeled label="What the new person will do, and by when"><TextInput name="commitment" /></Labeled>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Starting…">Start warm handoff</SubmitButton>
    </form>
  );
}

export function AddRecoveryForm({ clientId }: { clientId: string }) {
  const action = addRecovery.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Issue type">
          <Select name="issueType" defaultValue="">
            <option value="" disabled>Select…</option>
            {ISSUE_TYPES.map((t) => <option key={t} value={t}>{recoveryIssueTypeLabel[t]}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Immediate acknowledgement (optional)"><TextInput name="acknowledgement" /></Labeled>
      </div>
      <Labeled label="What happened"><TextArea name="description" required rows={2} /></Labeled>
      <FormError message={state?.error} />
      <SubmitButton variant="danger" pendingLabel="Opening…">Open recovery</SubmitButton>
    </form>
  );
}
