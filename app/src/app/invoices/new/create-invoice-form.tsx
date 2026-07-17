"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createInvoice } from "../actions";
import { FormError, Labeled, Select, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function CreateInvoiceForm({ clients }: { clients: { id: string; displayName: string }[] }) {
  const [state, formAction] = useActionState<FormState | null, FormData>(createInvoice, null);

  return (
    <form action={formAction} className="space-y-4">
      <Labeled label="Client">
        <Select name="clientId" defaultValue="">
          <option value="" disabled>Select…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </Select>
      </Labeled>
      <Labeled label="Notes (optional)"><TextInput name="notes" placeholder="Neutral note only" /></Labeled>
      <FormError message={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Creating…">Create draft invoice</SubmitButton>
        <Link href="/invoices" className="text-sm text-on-surface-variant hover:underline">Cancel</Link>
      </div>
    </form>
  );
}
