"use client";

import { useActionState } from "react";
import { addConsent } from "./journey-actions";
import { Checkbox, FormError, Labeled, Select, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { channelLabel, consentTypeLabel, infoCategoryLabel } from "@/lib/labels";
import type { FormState } from "@/lib/forms";
import type { CommunicationChannel, ConsentType, InfoCategory } from "@/generated/prisma/client";

const CONSENT_TYPES: ConsentType[] = [
  "SERVICE", "CONTACT_PROVIDER", "BOOK_APPOINTMENT", "RECEIVE_FROM_PROVIDER",
  "FAMILY_UPDATE", "ATTEND_APPOINTMENT", "HANDLE_DOCUMENTS", "TESTIMONIAL", "MARKETING",
];
const INFO: InfoCategory[] = [
  "CONTACT_DETAILS", "SCHEDULING", "PROVIDER_COORDINATION", "GENERAL_WELLBEING",
  "ACCESSIBILITY", "FINANCIAL", "HEALTH_SENSITIVE", "SAFEGUARDING", "IDENTITY_DOCUMENT",
];
const CHANNELS: CommunicationChannel[] = ["SECURE_PORTAL", "EMAIL", "PHONE", "SMS", "IN_PERSON", "MAIL"];

export function AddConsentForm({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: { id: string; name: string }[];
}) {
  const action = addConsent.bind(null, clientId);
  const [state, formAction] = useActionState<FormState | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Consent type">
          <Select name="type" defaultValue="FAMILY_UPDATE">
            {CONSENT_TYPES.map((t) => (
              <option key={t} value={t}>{consentTypeLabel[t]}</option>
            ))}
          </Select>
        </Labeled>
        <Labeled label="Granted by">
          <TextInput name="grantedByName" required placeholder="Client or representative name" />
        </Labeled>
      </div>

      <Labeled label="Purpose">
        <TextInput name="purpose" required placeholder="Why this permission is needed" />
      </Labeled>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-on-surface-variant">Covered information</legend>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {INFO.map((i) => (
            <Checkbox key={i} name="coveredInfo" value={i} label={infoCategoryLabel[i]} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-on-surface-variant">Permitted channels</legend>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <Checkbox key={c} name="channels" value={c} label={channelLabel[c]} />
          ))}
        </div>
      </fieldset>

      {contacts.length > 0 && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-on-surface-variant">Permitted recipients</legend>
          <div className="grid grid-cols-2 gap-1">
            {contacts.map((c) => (
              <Checkbox key={c.id} name="recipientIds" value={c.id} label={c.name} />
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Excluded information (optional)">
          <TextInput name="excludedInfo" placeholder="e.g. No financial information" />
        </Labeled>
        <Labeled label="Expiry date (optional)">
          <TextInput name="expiryDate" type="date" />
        </Labeled>
        <Labeled label="Method">
          <Select name="method" defaultValue="ELECTRONIC_ACCEPTANCE">
            <option value="WRITTEN_SIGNATURE">Written signature</option>
            <option value="ELECTRONIC_ACCEPTANCE">Electronic acceptance</option>
            <option value="VERBAL_DOCUMENTED">Verbal (documented)</option>
            <option value="EMAIL_CONFIRMATION">Email confirmation</option>
          </Select>
        </Labeled>
        <Labeled label="Version accepted">
          <TextInput name="versionAccepted" defaultValue="CONSENT-v1.0" />
        </Labeled>
      </div>

      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Recording…">Record consent</SubmitButton>
    </form>
  );
}
