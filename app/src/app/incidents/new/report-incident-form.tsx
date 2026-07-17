"use client";

import Link from "next/link";
import { useActionState } from "react";
import { reportIncident } from "../actions";
import { FormError, Labeled, Select, TextArea, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { incidentTypeLabel, severityLabel } from "@/lib/labels";
import type { FormState } from "@/lib/forms";
import type { IncidentType, Severity } from "@/generated/prisma/client";

const TYPES: IncidentType[] = ["COMPLAINT", "INCIDENT", "NEAR_MISS", "PRIVACY_EVENT", "SAFEGUARDING"];
const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function ReportIncidentForm({ clients }: { clients: { id: string; displayName: string }[] }) {
  const [state, formAction] = useActionState<FormState | null, FormData>(reportIncident, null);

  return (
    <form action={formAction} className="space-y-4">
      <p className="rounded-lg border border-error/30 bg-error-container px-3 py-2 text-sm text-on-error-container">
        Emergencies bypass this form — call <strong>9-1-1</strong> for immediate danger, <strong>9-8-8</strong> for
        suicide crisis, or direct non-emergency health questions to <strong>8-1-1</strong>. Record objective facts only.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Event type">
          <Select name="type" defaultValue="">
            <option value="" disabled>Select…</option>
            {TYPES.map((t) => <option key={t} value={t}>{incidentTypeLabel[t]}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Severity">
          <Select name="severity" defaultValue="MEDIUM">
            {SEVERITIES.map((s) => <option key={s} value={s}>{severityLabel[s]}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Reported by"><TextInput name="reportedByName" required /></Labeled>
        <Labeled label="When it occurred (optional)"><TextInput name="occurredAt" type="date" /></Labeled>
        <Labeled label="Linked client (optional)">
          <Select name="clientId" defaultValue="">
            <option value="">— none —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </Select>
        </Labeled>
      </div>

      <Labeled label="Objective description"><TextArea name="description" required rows={3} /></Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="People affected"><TextInput name="peopleAffected" /></Labeled>
        <Labeled label="Information affected"><TextInput name="infoAffected" /></Labeled>
      </div>
      <Labeled label="Immediate containment / safety action"><TextInput name="immediateAction" /></Labeled>
      <Labeled label="Notifications or referrals made"><TextInput name="notifications" /></Labeled>

      <FormError message={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton variant="danger" pendingLabel="Reporting…">Report</SubmitButton>
        <Link href="/" className="text-sm text-on-surface-variant hover:underline">Cancel</Link>
      </div>
      <p className="text-xs text-on-surface-variant/70">Incidents are reviewed within 48 hours (§17.5).</p>
    </form>
  );
}
