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
      <p className="text-sm text-zinc-500">
        Test a family update against the client&apos;s consent. The guard permits or refuses it,
        and records the attempt either way.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Recipient</span>
          <select name="recipientContactId" className="w-full rounded-md border border-zinc-300 px-2 py-1.5" required>
            <option value="">Select…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.relationship})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Information</span>
          <select name="category" className="w-full rounded-md border border-zinc-300 px-2 py-1.5">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {infoCategoryLabel[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Channel</span>
          <select name="channel" className="w-full rounded-md border border-zinc-300 px-2 py-1.5">
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {channelLabel[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-zinc-700">What would be shared</span>
          <input
            name="infoSummary"
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5"
            placeholder="e.g. Physio appointment is Tuesday 2pm"
            required
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Check & record"}
      </button>

      {state && (
        <div
          className={`rounded-md border p-3 text-sm ${
            state.allowed
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-medium">{state.allowed ? "Permitted" : "Blocked"}</p>
          <p>{state.message}</p>
          {state.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-amber-800">
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
