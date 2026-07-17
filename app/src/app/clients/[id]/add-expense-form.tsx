"use client";

import { useActionState } from "react";
import { requestExpense } from "./journey-actions";
import { FormError, Labeled, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function AddExpenseForm({ clientId }: { clientId: string }) {
  const action = requestExpense.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Labeled label="Expense (neutral description)" hint="No health or provider detail beyond what billing needs.">
            <TextInput name="description" required placeholder="e.g. Accessible transportation to appointment" />
          </Labeled>
        </div>
        <Labeled label="Amount (CAD)"><TextInput name="amount" type="number" step="0.01" min="0" required /></Labeled>
      </div>
      <Labeled label="Incurred on (optional)"><TextInput name="incurredOn" type="date" /></Labeled>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Requesting…">Request expense</SubmitButton>
    </form>
  );
}
