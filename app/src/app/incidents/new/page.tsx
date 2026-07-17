import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canReportIncident } from "@/lib/access";
import { listClients } from "@/lib/queries";
import { ReportIncidentForm } from "./report-incident-form";

export const dynamic = "force-dynamic";

export default async function NewIncidentPage() {
  const user = await requireUser();
  if (!canReportIncident(user.role)) notFound();
  const clients = await listClients(user);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-primary hover:underline">← Workspace</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Report an incident</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Complaints, incidents, near misses, and privacy events (§6.12, §17.5). Restricted record — do not
          investigate beyond your authority.
        </p>
      </div>
      <div className="card p-6">
        <ReportIncidentForm clients={clients.map((c) => ({ id: c.id, displayName: c.displayName }))} />
      </div>
    </div>
  );
}
