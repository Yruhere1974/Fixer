"use client";

import { useActionState } from "react";
import { createChangeRequest } from "./journey-actions";
import { FormError, Labeled, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function AddChangeForm({ clientId }: { clientId: string }) {
  const action = createChangeRequest.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Requested by"><TextInput name="requestedByName" required placeholder="Client or navigator" /></Labeled>
        <Labeled label="Reason (optional)"><TextInput name="reason" /></Labeled>
      </div>
      <Labeled label="Requested change"><TextArea name="description" required rows={2} /></Labeled>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Service impact"><TextInput name="serviceImpact" /></Labeled>
        <Labeled label="Schedule impact"><TextInput name="scheduleImpact" /></Labeled>
        <Labeled label="Cost impact"><TextInput name="costImpact" /></Labeled>
        <Labeled label="Privacy impact"><TextInput name="privacyImpact" /></Labeled>
      </div>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Logging…">Log change request</SubmitButton>
    </form>
  );
}
