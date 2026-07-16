import Link from "next/link";
import { Badge } from "@/components/badge";
import { getExceptions, listClients } from "@/lib/queries";
import { clientStatusLabel, consentTypeLabel, formatDate } from "@/lib/labels";
import type { ClientStatus } from "@/generated/prisma/client";

const statusTone: Record<ClientStatus, "gray" | "green" | "amber" | "blue"> = {
  PROSPECT: "blue",
  ACTIVE: "green",
  PAUSED: "amber",
  CLOSED: "gray",
};

export default async function DashboardPage() {
  const [clients, exceptions] = await Promise.all([listClients(), getExceptions()]);
  const exceptionCount =
    exceptions.overdue.length +
    exceptions.blocked.length +
    exceptions.awaitingApproval.length +
    exceptions.expiring.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Daily exception view</h1>
        <p className="mt-1 text-sm text-zinc-500">
          What needs attention now — overdue work, blocks, missing approvals, and expiring
          permissions.
        </p>
      </div>

      {exceptionCount === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Nothing flagged. Seed data with <code>npm run db:seed</code> to populate a fictional
          client.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ExceptionCard title="Overdue actions" tone="red" items={
            exceptions.overdue.map((i) => ({
              id: i.id,
              clientId: i.plan.client.id,
              label: i.title,
              meta: `${i.plan.client.displayName} · due ${formatDate(i.dueDate)}`,
            }))
          } />
          <ExceptionCard title="Awaiting approval" tone="amber" items={
            exceptions.awaitingApproval.map((i) => ({
              id: i.id,
              clientId: i.plan.client.id,
              label: i.title,
              meta: i.plan.client.displayName,
            }))
          } />
          <ExceptionCard title="Blocked work" tone="amber" items={
            exceptions.blocked.map((i) => ({
              id: i.id,
              clientId: i.plan.client.id,
              label: i.title,
              meta: i.plan.client.displayName,
            }))
          } />
          <ExceptionCard title="Permissions expiring (30 days)" tone="amber" items={
            exceptions.expiring.map((c) => ({
              id: c.id,
              clientId: c.client.id,
              label: consentTypeLabel[c.type],
              meta: `${c.client.displayName} · expires ${formatDate(c.expiryDate)}`,
            }))
          } />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Clients</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Navigator</th>
                <th className="px-4 py-2 font-medium">Consents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                    No clients yet.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium text-sky-700 hover:underline">
                        {c.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[c.status]}>{clientStatusLabel[c.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{c.assignedNavigator?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{c._count.consents}</td>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge tone={items.length ? tone : "gray"}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">None.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <Link href={`/clients/${item.clientId}`} className="text-zinc-800 hover:underline">
                {item.label}
              </Link>
              <div className="text-xs text-zinc-500">{item.meta}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
