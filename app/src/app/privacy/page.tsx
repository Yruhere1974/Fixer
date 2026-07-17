import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { listPrivacyRequests } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canHandlePrivacy } from "@/lib/access";
import { formatDate, privacyRequestStatusLabel, privacyRequestTypeLabel } from "@/lib/labels";
import type { PrivacyRequestStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export const privacyStatusTone: Record<PrivacyRequestStatus, "red" | "amber" | "green" | "blue"> = {
  RECEIVED: "amber",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  ESCALATED: "red",
};

export default async function PrivacyPage() {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) notFound();
  const requests = await listPrivacyRequests();
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Privacy requests</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Client rights: access, correction, consent withdrawal, complaint, export (§6.13). Verify identity before disclosing.
          </p>
        </div>
        <Link href="/privacy/new" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container">
          + Log request
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant/50 bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Requester</th>
              <th className="px-5 py-3 font-medium">Identity</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Response due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {requests.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">No requests recorded.</td></tr>
            ) : (
              requests.map((r) => {
                const overdue = r.status !== "COMPLETED" && r.responseDueDate <= now;
                return (
                  <tr key={r.id} className="transition-colors hover:bg-surface-low">
                    <td className="px-5 py-4">
                      <Link href={`/privacy/${r.id}`} className="font-medium text-primary hover:underline">
                        {privacyRequestTypeLabel[r.type]}
                      </Link>
                      {r.client && <div className="text-xs text-on-surface-variant">{r.client.displayName}</div>}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{r.requesterName}</td>
                    <td className="px-5 py-4">
                      <Badge tone={r.requesterVerified ? "green" : "amber"}>{r.requesterVerified ? "Verified" : "Unverified"}</Badge>
                    </td>
                    <td className="px-5 py-4"><Badge tone={privacyStatusTone[r.status]}>{privacyRequestStatusLabel[r.status]}</Badge></td>
                    <td className="px-5 py-4">
                      <span className={overdue ? "font-medium text-error" : "text-on-surface-variant"}>
                        {formatDate(r.responseDueDate)}{overdue && " · overdue"}
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
