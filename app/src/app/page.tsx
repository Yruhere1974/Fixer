import Link from "next/link";
import { Badge } from "@/components/badge";
import { getExceptions, getIncidentExceptions, getInvoiceExceptions, getPrivacyExceptions, getProviderExceptions, listClients } from "@/lib/queries";
import { clientStatusLabel, consentTypeLabel, formatDate, incidentTypeLabel, money, privacyRequestTypeLabel, serviceCategoryLabel } from "@/lib/labels";
import type { ClientStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/session";
import { canCoordinate, canHandleIncidents, canHandlePrivacy, canManageBilling, canManageDirectory } from "@/lib/access";

// Reads live data every request; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

const statusTone: Record<ClientStatus, "gray" | "green" | "amber" | "blue"> = {
  PROSPECT: "blue",
  ACTIVE: "green",
  PAUSED: "amber",
  CLOSED: "gray",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const manageDirectory = canManageDirectory(user.role);
  const handleIncidents = canHandleIncidents(user.role);
  const handlePrivacy = canHandlePrivacy(user.role);
  const manageBilling = canManageBilling(user.role);
  const [clients, exceptions, providerExceptions, incidentExceptions, privacyOverdue, invoicesOverdue] = await Promise.all([
    listClients(user),
    getExceptions(user),
    manageDirectory ? getProviderExceptions() : Promise.resolve({ pending: [], due: [] }),
    handleIncidents ? getIncidentExceptions() : Promise.resolve({ reviewDue: [], correctiveOverdue: [] }),
    handlePrivacy ? getPrivacyExceptions() : Promise.resolve([]),
    manageBilling ? getInvoiceExceptions() : Promise.resolve([]),
  ]);
  const providerAttention = [...providerExceptions.pending, ...providerExceptions.due];
  const incidentAttention = Array.from(
    new Map([...incidentExceptions.reviewDue, ...incidentExceptions.correctiveOverdue].map((i) => [i.id, i])).values(),
  );
  const exceptionCount =
    exceptions.overdue.length +
    exceptions.blocked.length +
    exceptions.awaitingApproval.length +
    exceptions.expiring.length +
    exceptions.pendingChanges.length +
    exceptions.pendingExpenses.length +
    providerAttention.length +
    incidentAttention.length +
    privacyOverdue.length +
    invoicesOverdue.length;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Daily exception view
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-on-surface">
          What needs attention
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Overdue work, blocks, missing approvals, and expiring permissions — the things to act on
          before the day runs away.
        </p>
      </div>

      {exceptionCount === 0 ? (
        <p className="card p-5 text-sm text-on-surface-variant">
          Nothing flagged. Seed data with <code>npm run db:seed</code> to populate a fictional
          client.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <ExceptionCard
            title="Overdue actions"
            tone="red"
            items={exceptions.overdue.map((i) => ({
              id: i.id,
              href: `/clients/${i.plan.client.id}`,
              label: i.title,
              meta: `${i.plan.client.displayName} · due ${formatDate(i.dueDate)}`,
            }))}
          />
          <ExceptionCard
            title="Awaiting approval"
            tone="amber"
            items={exceptions.awaitingApproval.map((i) => ({
              id: i.id,
              href: `/clients/${i.plan.client.id}`,
              label: i.title,
              meta: i.plan.client.displayName,
            }))}
          />
          <ExceptionCard
            title="Blocked work"
            tone="amber"
            items={exceptions.blocked.map((i) => ({
              id: i.id,
              href: `/clients/${i.plan.client.id}`,
              label: i.title,
              meta: i.plan.client.displayName,
            }))}
          />
          <ExceptionCard
            title="Permissions expiring (30 days)"
            tone="amber"
            items={exceptions.expiring.map((c) => ({
              id: c.id,
              href: `/clients/${c.client.id}`,
              label: consentTypeLabel[c.type],
              meta: `${c.client.displayName} · expires ${formatDate(c.expiryDate)}`,
            }))}
          />
          <ExceptionCard
            title="Change requests pending"
            tone="amber"
            items={exceptions.pendingChanges.map((cr) => ({
              id: cr.id,
              href: `/clients/${cr.client.id}`,
              label: cr.description,
              meta: `${cr.client.displayName} · requested by ${cr.requestedByName}`,
            }))}
          />
          <ExceptionCard
            title="Expenses awaiting approval"
            tone="amber"
            items={exceptions.pendingExpenses.map((e) => ({
              id: e.id,
              href: `/clients/${e.client.id}`,
              label: `${e.description} · ${money(e.amount)}`,
              meta: e.client.displayName,
            }))}
          />
          {manageBilling && (
            <ExceptionCard
              title="Invoices overdue"
              tone="red"
              items={invoicesOverdue.map((inv) => ({
                id: inv.id,
                href: `/invoices/${inv.id}`,
                label: inv.number,
                meta: `${inv.client.displayName} · due ${formatDate(inv.dueDate)}`,
              }))}
            />
          )}
          {manageDirectory && (
            <ExceptionCard
              title="Providers to verify / review"
              tone="amber"
              items={providerAttention.map((p) => ({
                id: p.id,
                href: `/providers/${p.id}`,
                label: p.name,
                meta:
                  p.status === "PENDING_VERIFICATION"
                    ? `${serviceCategoryLabel[p.category]} · pending verification`
                    : `${serviceCategoryLabel[p.category]} · review due ${formatDate(p.nextReviewDate)}`,
              }))}
            />
          )}
          {handleIncidents && (
            <ExceptionCard
              title="Incidents to review / correct"
              tone="red"
              items={incidentAttention.map((i) => ({
                id: i.id,
                href: `/incidents/${i.id}`,
                label: incidentTypeLabel[i.type],
                meta: `48h review due ${formatDate(i.reviewDueAt)}`,
              }))}
            />
          )}
          {handlePrivacy && (
            <ExceptionCard
              title="Privacy requests overdue"
              tone="red"
              items={privacyOverdue.map((r) => ({
                id: r.id,
                href: `/privacy/${r.id}`,
                label: privacyRequestTypeLabel[r.type],
                meta: `${r.requesterName} · due ${formatDate(r.responseDueDate)}`,
              }))}
            />
          )}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Clients</h2>
          {canCoordinate(user.role) && (
            <Link
              href="/clients/new"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container"
            >
              + New engagement
            </Link>
          )}
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-outline-variant/50 bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Navigator</th>
                <th className="px-5 py-3 font-medium">Consents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant">
                    No clients yet.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-low">
                    <td className="px-5 py-4">
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.displayName}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone[c.status]}>{clientStatusLabel[c.status]}</Badge>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {c.assignedNavigator?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{c._count.consents}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ExceptionCard({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "red" | "amber";
  items: { id: string; href: string; label: string; meta: string }[];
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge tone={items.length ? tone : "gray"}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-on-surface-variant/70">None.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <Link
                href={item.href}
                className="font-medium text-on-surface hover:text-primary hover:underline"
              >
                {item.label}
              </Link>
              <div className="text-xs text-on-surface-variant">{item.meta}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
