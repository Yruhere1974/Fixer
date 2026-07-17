import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { Labeled, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { getProvider } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canManageDirectory } from "@/lib/access";
import { effectiveProviderStatus, isPresentable } from "@/lib/providers";
import { formatDate, providerStatusLabel, serviceCategoryLabel } from "@/lib/labels";
import { markProviderReviewed, setProviderStatus, verifyProvider } from "../actions";
import { statusTone } from "../page";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const provider = await getProvider(id);
  if (!provider) notFound();

  const status = effectiveProviderStatus(provider);
  const manage = canManageDirectory(user.role);
  const pid = <input type="hidden" name="providerId" value={provider.id} />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/providers" className="text-sm text-primary hover:underline">← Directory</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{provider.name}</h1>
          <Badge tone={statusTone[status]}>{providerStatusLabel[status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          {serviceCategoryLabel[provider.category]}
          {provider.organization && ` · ${provider.organization}`}
        </p>
        {status === "STALE" && (
          <p className="mt-2 rounded-lg border border-amber-300/50 bg-warning-container px-3 py-2 text-sm text-on-warning-container">
            Review is overdue — do not present this provider as verified until reviewed again (§17.7).
          </p>
        )}
        {!isPresentable(provider) && status !== "STALE" && (
          <p className="mt-2 text-sm text-on-surface-variant">Not presentable to clients as a verified option in its current status.</p>
        )}
      </div>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Services & client fit">{provider.servicesOffered}{provider.clientFit && <div className="text-on-surface-variant">{provider.clientFit}</div>}</Field>
          <Field label="Contact">
            {[provider.contactPhone, provider.contactEmail, provider.website].filter(Boolean).join(" · ") || "—"}
          </Field>
          <Field label="Location / area">{[provider.location, provider.serviceArea].filter(Boolean).join(" · ") || "—"}{provider.virtualOptions && " · virtual available"}</Field>
          <Field label="Accessibility">{provider.accessibility ?? "—"}</Field>
          <Field label="Languages">{provider.languages ?? "—"}</Field>
          <Field label="Pricing / cancellation">{[provider.pricing, provider.cancellationPolicy].filter(Boolean).join(" · ") || "—"}</Field>
          <Field label="Wait time / referral">{[provider.waitTime, provider.referralRequired ? "referral required" : null].filter(Boolean).join(" · ") || "—"}</Field>
          <Field label="Registration / licence">{provider.registration ?? "—"}</Field>
          <Field label="Conflict / affiliation disclosure">{provider.conflictDisclosure ?? "None recorded"}</Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Verification</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <Field label="Verified">{provider.verifiedAt ? `${formatDate(provider.verifiedAt)} by ${provider.verifiedBy?.name ?? "—"}` : "Not yet verified"}</Field>
          <Field label="Source">{provider.verificationSource ?? "—"}</Field>
          <Field label="Last review">{formatDate(provider.lastReviewDate)}</Field>
          <Field label="Next review">{formatDate(provider.nextReviewDate)}</Field>
        </div>

        {manage && (
          <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-outline-variant/40 pt-5">
            <form action={verifyProvider} className="flex items-end gap-2">
              {pid}
              <Labeled label="Verification source" hint="e.g. College of Physical Therapists register">
                <TextInput name="verificationSource" required className="w-72" defaultValue={provider.verificationSource ?? ""} />
              </Labeled>
              <SubmitButton pendingLabel="Verifying…">Verify credentials</SubmitButton>
            </form>
            {provider.status === "ACTIVE" && (
              <form action={markProviderReviewed}>
                {pid}
                <SubmitButton variant="outline">Mark reviewed</SubmitButton>
              </form>
            )}
            <form action={setProviderStatus} className="flex items-end gap-2">
              {pid}
              <Labeled label="Status">
                <select name="status" defaultValue={provider.status} className="field px-3 py-2">
                  <option value="PENDING_VERIFICATION">Pending verification</option>
                  <option value="ACTIVE">Verified</option>
                  <option value="RESTRICTED">Restricted</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Labeled>
              <SubmitButton variant="outline">Set</SubmitButton>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-on-surface-variant/70">{label}</div>
      <div className="mt-1 text-on-surface">{children}</div>
    </div>
  );
}
