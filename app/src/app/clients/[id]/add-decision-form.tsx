"use client";

import { useActionState } from "react";
import { logDecision } from "./journey-actions";
import { FormError, Labeled, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function AddDecisionForm({ clientId }: { clientId: string }) {
  const action = logDecision.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <Labeled label="Question requiring a decision"><TextInput name="question" required /></Labeled>
      <Labeled label="Options presented (optional)"><TextArea name="optionsPresented" rows={2} /></Labeled>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Decision made"><TextInput name="decision" required /></Labeled>
        <Labeled label="Decision-maker"><TextInput name="decisionMaker" required placeholder="Client or representative" /></Labeled>
      </div>
      <Labeled label="Reason (optional)"><TextInput name="reason" /></Labeled>
      <Labeled label="Affected tasks (optional)"><TextInput name="affectedTasks" /></Labeled>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Recording…">Record decision</SubmitButton>
    </form>
  );
}
