"use client";

import { useActionState } from "react";
import { attemptDisclosure, type DisclosureFormState } from "./actions";
import { channelLabel, infoCategoryLabel } from "@/lib/labels";
import type { CommunicationChannel, InfoCategory } from "@/generated/prisma/client";

const CATEGORIES: InfoCategory[] = [
  "SCHEDULING",
  "PROVIDER_COORDINATION",
  "GENERAL_WELLBEING",
  "FINANCIAL",
  "HEALTH_SENSITIVE",
];
const CHANNELS: CommunicationChannel[] = ["EMAIL", "SECURE_PORTAL", "SMS", "PHONE"];

export function DisclosureForm({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: { id: string; name: string; relationship: string }[];
}) {
  const action = attemptDisclosure.bind(null, clientId);
  const [state, formAction, pending] = useActionState<DisclosureFormState | null, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Test a family update against the client&apos;s consent. The guard permits or refuses it,
        and records the attempt either way.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-on-surface-variant">Recipient</span>
          <select name="recipientContactId" className="field w-full px-2.5 py-1.5" required>
            <option value="">Select…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.relationship})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-on-surface-variant">Information</span>
          <select name="category" className="field w-full px-2.5 py-1.5">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {infoCategoryLabel[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-on-surface-variant">Channel</span>
          <select name="channel" className="field w-full px-2.5 py-1.5">
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {channelLabel[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-on-surface-variant">What would be shared</span>
          <input
            name="infoSummary"
            className="field w-full px-2.5 py-1.5"
            placeholder="e.g. Physio appointment is Tuesday 2pm"
            required
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container disabled:opacity-50"
      >
        {pending ? "Checking…" : "Check & record"}
      </button>

      {state && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            state.allowed
              ? "border-primary/30 bg-primary-fixed/40 text-on-primary-fixed"
              : "border-error/30 bg-error-container text-on-error-container"
          }`}
        >
          <p className="font-medium">{state.allowed ? "Permitted" : "Blocked"}</p>
          <p>{state.message}</p>
          {state.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-on-warning-container">
              {state.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
