"use client";

import { useActionState } from "react";
import { addActionItem } from "./journey-actions";
import { FormError, Labeled, Select, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function AddActionItemForm({ clientId }: { clientId: string }) {
  const action = addActionItem.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <Labeled label="Action">
        <TextInput name="title" required placeholder="e.g. Shortlist three physiotherapists" />
      </Labeled>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Priority">
          <Select name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </Labeled>
        <Labeled label="Due date (optional)">
          <TextInput name="dueDate" type="date" />
        </Labeled>
        <Labeled label="Estimated cost (optional)" hint="A cost above $0 flags client approval as pending.">
          <TextInput name="estimatedCost" type="number" step="0.01" min="0" />
        </Labeled>
        <Labeled label="Backup option (optional)">
          <TextInput name="backupOption" />
        </Labeled>
      </div>
      <Labeled label="Next action (optional)">
        <TextInput name="nextAction" />
      </Labeled>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Adding…">Add action</SubmitButton>
    </form>
  );
}
