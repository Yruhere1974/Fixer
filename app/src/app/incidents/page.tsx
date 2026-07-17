import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { listIncidents } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canHandleIncidents } from "@/lib/access";
import { formatDate, incidentStatusLabel, incidentTypeLabel, severityLabel } from "@/lib/labels";
import type { IncidentStatus, Severity } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export const severityTone: Record<Severity, "gray" | "blue" | "amber" | "red"> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "amber",
  CRITICAL: "red",
};

export const incidentStatusTone: Record<IncidentStatus, "red" | "amber" | "blue" | "green"> = {
  OPEN: "red",
  UNDER_REVIEW: "amber",
  CORRECTIVE_ACTION: "blue",
  CLOSED: "green",
};

export default async function IncidentsPage() {
  const user = await requireUser();
  if (!canHandleIncidents(user.role)) notFound();
  const incidents = await listIncidents();
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents &amp; complaints</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Restricted register (§6.12, §17.5). Review within 48 hours; verify corrective action before closure.
          </p>
        </div>
        <Link href="/incidents/new" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container">
          + Report incident
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant/50 bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Severity</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Discovered</th>
              <th className="px-5 py-3 font-medium">48h review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {incidents.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">No incidents recorded.</td></tr>
            ) : (
              incidents.map((i) => {
                const reviewOverdue = i.status !== "CLOSED" && i.reviewDueAt <= now;
                return (
                  <tr key={i.id} className="transition-colors hover:bg-surface-low">
                    <td className="px-5 py-4">
                      <Link href={`/incidents/${i.id}`} className="font-medium text-primary hover:underline">
                        {incidentTypeLabel[i.type]}
                      </Link>
                      {i.client && <div className="text-xs text-on-surface-variant">{i.client.displayName}</div>}
                    </td>
                    <td className="px-5 py-4"><Badge tone={severityTone[i.severity]}>{severityLabel[i.severity]}</Badge></td>
                    <td className="px-5 py-4"><Badge tone={incidentStatusTone[i.status]}>{incidentStatusLabel[i.status]}</Badge></td>
                    <td className="px-5 py-4 text-on-surface-variant">{formatDate(i.discoveredAt)}</td>
                    <td className="px-5 py-4">
                      <span className={reviewOverdue ? "font-medium text-error" : "text-on-surface-variant"}>
                        {formatDate(i.reviewDueAt)}{reviewOverdue && " · overdue"}
                      </span>
                    </td>
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
