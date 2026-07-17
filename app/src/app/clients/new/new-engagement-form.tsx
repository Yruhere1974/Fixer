"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createEngagement } from "./actions";
import { Checkbox, FormError, Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/forms";

export function NewEngagementForm() {
  const [state, formAction] = useActionState<FormState | null, FormData>(createEngagement, null);

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-primary">Inquiry (minimal information)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Client display name">
            <TextInput name="displayName" required placeholder="e.g. Jordan Rivers" />
          </Labeled>
          <Labeled label="Inquiry source">
            <TextInput name="source" required placeholder="e.g. Website enquiry, referral" />
          </Labeled>
          <Labeled label="Contact email (optional)">
            <TextInput name="contactEmail" type="email" />
          </Labeled>
          <Labeled label="Contact phone (optional)">
            <TextInput name="contactPhone" />
          </Labeled>
          <Labeled label="Preferred channel (optional)">
            <Select name="preferredChannel" defaultValue="">
              <option value="">—</option>
              <option value="SECURE_PORTAL">Secure portal</option>
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
              <option value="SMS">SMS</option>
              <option value="IN_PERSON">In person</option>
              <option value="MAIL">Mail</option>
            </Select>
          </Labeled>
        </div>
        <Labeled label="General reason for inquiry" hint="No unnecessary health detail (§17.1).">
          <TextArea name="generalReason" required rows={2} />
        </Labeled>
      </fieldset>

      <fieldset className="space-y-4 border-t border-outline-variant/40 pt-5">
        <legend className="text-sm font-semibold text-primary">Scope &amp; safety screen</legend>
        <div className="flex flex-wrap gap-6">
          <Checkbox name="withinScope" label="Request is within non-clinical scope" defaultChecked />
          <Checkbox name="immediateConcern" label="Immediate safety or medical concern" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Resource provided (if any)" hint="e.g. 9-1-1, 9-8-8, 8-1-1, clinician">
            <TextInput name="resourceProvided" />
          </Labeled>
          <Labeled label="Screen outcome">
            <Select name="outcome" defaultValue="PROCEED" required>
              <option value="PROCEED">Proceed to intake</option>
              <option value="REFERRED">Referred out of scope</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </Labeled>
        </div>
        <Labeled label="Objective facts">
          <TextArea name="objectiveFacts" required rows={2} placeholder="What was reported, factually." />
        </Labeled>
        <Labeled label="Action taken">
          <TextInput name="actionTaken" placeholder="e.g. Proceeded to normal intake." />
        </Labeled>
      </fieldset>

      <FormError message={state?.error} />

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Creating…">Create engagement</SubmitButton>
        <Link href="/workspace" className="text-sm text-on-surface-variant hover:underline">Cancel</Link>
      </div>
    </form>
  );
}
