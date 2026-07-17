"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logPrivacyRequest } from "../actions";
import { FormError, Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { privacyRequestTypeLabel } from "@/lib/labels";
import type { FormState } from "@/lib/forms";
import type { PrivacyRequestType } from "@/generated/prisma/client";

const TYPES: PrivacyRequestType[] = ["ACCESS", "CORRECTION", "WITHDRAW_CONSENT", "COMPLAINT", "EXPORT"];

export function LogPrivacyForm({ clients }: { clients: { id: string; displayName: string }[] }) {
  const [state, formAction] = useActionState<FormState | null, FormData>(logPrivacyRequest, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Request type">
          <Select name="type" defaultValue="">
            <option value="" disabled>Select…</option>
            {TYPES.map((t) => <option key={t} value={t}>{privacyRequestTypeLabel[t]}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Requester name"><TextInput name="requesterName" required /></Labeled>
        <Labeled label="Linked client (optional)">
          <Select name="clientId" defaultValue="">
            <option value="">— none —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </Select>
        </Labeled>
      </div>
      <Labeled label="What is requested (scope)" hint="e.g. access to all coordination notes; correction of a phone number.">
        <TextArea name="scope" required rows={3} />
      </Labeled>
      <FormError message={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Logging…">Log request</SubmitButton>
        <Link href="/privacy" className="text-sm text-on-surface-variant hover:underline">Cancel</Link>
      </div>
      <p className="text-xs text-on-surface-variant/70">
        Verify the requester&apos;s identity before disclosing anything. Corrections preserve what changed, when, and why.
      </p>
    </form>
  );
}
