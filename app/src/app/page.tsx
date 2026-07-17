import Link from "next/link";
import { Badge } from "@/components/badge";
import { getExceptions, listClients } from "@/lib/queries";
import { clientStatusLabel, consentTypeLabel, formatDate } from "@/lib/labels";
import type { ClientStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/session";
import { canCoordinate } from "@/lib/access";

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
  const [clients, exceptions] = await Promise.all([listClients(user), getExceptions(user)]);
  const exceptionCount =
    exceptions.overdue.length +
    exceptions.blocked.length +
    exceptions.awaitingApproval.length +
    exceptions.expiring.length;

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
              clientId: i.plan.client.id,
              label: i.title,
              meta: `${i.plan.client.displayName} · due ${formatDate(i.dueDate)}`,
            }))}
          />
          <ExceptionCard
            title="Awaiting approval"
            tone="amber"
            items={exceptions.awaitingApproval.map((i) => ({
              id: i.id,
              clientId: i.plan.client.id,
              label: i.title,
              meta: i.plan.client.displayName,
            }))}
          />
          <ExceptionCard
            title="Blocked work"
            tone="amber"
            items={exceptions.blocked.map((i) => ({
              id: i.id,
              clientId: i.plan.client.id,
              label: i.title,
              meta: i.plan.client.displayName,
            }))}
          />
          <ExceptionCard
            title="Permissions expiring (30 days)"
            tone="amber"
            items={exceptions.expiring.map((c) => ({
              id: c.id,
              clientId: c.client.id,
              label: consentTypeLabel[c.type],
              meta: `${c.client.displayName} · expires ${formatDate(c.expiryDate)}`,
            }))}
          />
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
  items: { id: string; clientId: string; label: string; meta: string }[];
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
                href={`/clients/${item.clientId}`}
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
