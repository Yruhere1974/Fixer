import Link from "next/link";
import { Badge } from "@/components/badge";
import { listProviders } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canManageDirectory } from "@/lib/access";
import { effectiveProviderStatus } from "@/lib/providers";
import { formatDate, providerStatusLabel, serviceCategoryLabel } from "@/lib/labels";
import type { ProviderStatus, ServiceCategory } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export const statusTone: Record<ProviderStatus, "green" | "amber" | "red" | "gray"> = {
  ACTIVE: "green",
  PENDING_VERIFICATION: "amber",
  STALE: "amber",
  RESTRICTED: "red",
  INACTIVE: "gray",
};

const CATEGORIES: ServiceCategory[] = [
  "FAMILY_PHYSICIAN", "NURSE_PRACTITIONER", "PHYSIOTHERAPY", "COUNSELLING", "NUTRITION",
  "FITNESS", "HOME_SUPPORT", "TRANSPORTATION", "MEALS", "RECREATION", "SENIORS_SERVICES", "OTHER",
];

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const category = CATEGORIES.includes(sp.category as ServiceCategory) ? (sp.category as ServiceCategory) : undefined;
  const q = sp.q?.trim() || undefined;
  const providers = await listProviders({ category, q });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Provider directory</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Curated, verified options. Selection criteria are factual — no rankings, no pay-to-play (§17.7).
          </p>
        </div>
        {canManageDirectory(user.role) && (
          <Link href="/providers/new" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container">
            + New provider
          </Link>
        )}
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-on-surface-variant">Category</span>
          <select name="category" defaultValue={category ?? ""} className="field px-3 py-2">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{serviceCategoryLabel[c]}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-on-surface-variant">Search</span>
          <input name="q" defaultValue={q ?? ""} placeholder="Name or organization" className="field px-3 py-2" />
        </label>
        <button className="rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-low">
          Filter
        </button>
        {(category || q) && (
          <Link href="/providers" className="text-sm text-on-surface-variant hover:underline">Clear</Link>
        )}
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant/50 bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-5 py-3 font-medium">Provider</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Next review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {providers.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant">No providers found.</td></tr>
            ) : (
              providers.map((p) => {
                const status = effectiveProviderStatus(p);
                return (
                  <tr key={p.id} className="transition-colors hover:bg-surface-low">
                    <td className="px-5 py-4">
                      <Link href={`/providers/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                      {p.organization && <div className="text-xs text-on-surface-variant">{p.organization}</div>}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{serviceCategoryLabel[p.category]}</td>
                    <td className="px-5 py-4"><Badge tone={statusTone[status]}>{providerStatusLabel[status]}</Badge></td>
                    <td className="px-5 py-4 text-on-surface-variant">{formatDate(p.nextReviewDate)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
