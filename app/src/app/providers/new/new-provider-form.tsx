"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createProvider } from "../actions";
import { Checkbox, FormError, Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { serviceCategoryLabel } from "@/lib/labels";
import type { FormState } from "@/lib/forms";
import type { ServiceCategory } from "@/generated/prisma/client";

const CATEGORIES: ServiceCategory[] = [
  "FAMILY_PHYSICIAN", "NURSE_PRACTITIONER", "PHYSIOTHERAPY", "COUNSELLING", "NUTRITION",
  "FITNESS", "HOME_SUPPORT", "TRANSPORTATION", "MEALS", "RECREATION", "SENIORS_SERVICES", "OTHER",
];

export function NewProviderForm() {
  const [state, formAction] = useActionState<FormState | null, FormData>(createProvider, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Provider name"><TextInput name="name" required /></Labeled>
        <Labeled label="Organization (optional)"><TextInput name="organization" /></Labeled>
        <Labeled label="Category">
          <Select name="category" defaultValue="">
            <option value="" disabled>Select…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{serviceCategoryLabel[c]}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Wait time (optional)"><TextInput name="waitTime" /></Labeled>
      </div>

      <Labeled label="Exact services & client fit"><TextArea name="servicesOffered" required rows={2} /></Labeled>
      <Labeled label="Notes on client fit (optional)"><TextInput name="clientFit" /></Labeled>

      <div className="grid gap-4 sm:grid-cols-3">
        <Labeled label="Email"><TextInput name="contactEmail" type="email" /></Labeled>
        <Labeled label="Phone"><TextInput name="contactPhone" /></Labeled>
        <Labeled label="Website"><TextInput name="website" /></Labeled>
        <Labeled label="Location"><TextInput name="location" /></Labeled>
        <Labeled label="Service area"><TextInput name="serviceArea" /></Labeled>
        <Labeled label="Languages"><TextInput name="languages" /></Labeled>
        <Labeled label="Pricing"><TextInput name="pricing" /></Labeled>
        <Labeled label="Cancellation policy"><TextInput name="cancellationPolicy" /></Labeled>
        <Labeled label="Accessibility"><TextInput name="accessibility" /></Labeled>
      </div>

      <div className="flex flex-wrap gap-6">
        <Checkbox name="virtualOptions" label="Offers virtual options" />
        <Checkbox name="referralRequired" label="Referral required" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Registration / licence details"><TextInput name="registration" /></Labeled>
        <Labeled label="Conflict / affiliation / commission disclosure"><TextInput name="conflictDisclosure" /></Labeled>
      </div>

      <FormError message={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Adding…">Add provider</SubmitButton>
        <Link href="/providers" className="text-sm text-on-surface-variant hover:underline">Cancel</Link>
      </div>
      <p className="text-xs text-on-surface-variant/70">
        New entries start as <strong>pending verification</strong> and must have credentials verified before a first referral.
      </p>
    </form>
  );
}
