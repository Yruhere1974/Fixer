"use client";

import { useActionState } from "react";
import { recordFeedback } from "./journey-actions";
import { FormError, Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function AddFeedbackForm({ clientId }: { clientId: string }) {
  const action = recordFeedback.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="How easy was it to get this handled?">
          <Select name="effortScore" defaultValue="">
            <option value="" disabled>Select…</option>
            <option value="1">1 — Very hard</option>
            <option value="2">2</option>
            <option value="3">3 — Neutral</option>
            <option value="4">4</option>
            <option value="5">5 — Very easy</option>
          </Select>
        </Labeled>
        <Labeled label="Did you know what would happen next?">
          <Select name="confidenceScore" defaultValue="">
            <option value="" disabled>Select…</option>
            <option value="1">1 — No idea</option>
            <option value="2">2</option>
            <option value="3">3 — Somewhat</option>
            <option value="4">4</option>
            <option value="5">5 — Fully knew</option>
          </Select>
        </Labeled>
      </div>
      <Labeled label="Context (optional)"><TextInput name="context" placeholder="e.g. Closeout, after appointment" /></Labeled>
      <Labeled label="Comment (optional)"><TextArea name="comment" rows={2} /></Labeled>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Recording…">Record feedback</SubmitButton>
    </form>
  );
}
