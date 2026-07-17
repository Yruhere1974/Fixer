"use client";

import { useActionState } from "react";
import { addPromise } from "./journey-actions";
import { FormError, Labeled, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function AddPromiseForm({ clientId }: { clientId: string }) {
  const action = addPromise.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <Labeled label="What was promised">
        <TextInput name="description" required placeholder="e.g. I will confirm the physio slot and email you by Tuesday 3pm." />
      </Labeled>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Made to"><TextInput name="madeToName" defaultValue="Client" /></Labeled>
        <Labeled label="Promised by (date)"><TextInput name="dueAt" type="date" /></Labeled>
      </div>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Recording…">Record promise</SubmitButton>
    </form>
  );
}
