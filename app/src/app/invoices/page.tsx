import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { listInvoices } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canManageBilling } from "@/lib/access";
import { formatDate, invoiceStatusLabel, money } from "@/lib/labels";
import type { InvoiceStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export const invoiceStatusTone: Record<InvoiceStatus, "gray" | "amber" | "green" | "red"> = {
  DRAFT: "gray",
  SENT: "amber",
  PAID: "green",
  VOID: "red",
};

function total(items: { amount: unknown }[]): number {
  return items.reduce((sum, i) => sum + Number(i.amount), 0);
}

export default async function InvoicesPage() {
  const user = await requireUser();
  if (!canManageBilling(user.role)) notFound();
  const invoices = await listInvoices();
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Neutral service descriptions only — no health, family, or provider detail (§6.11).
          </p>
        </div>
        <Link href="/invoices/new" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container">
          + New invoice
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant/50 bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant">No invoices yet.</td></tr>
            ) : (
              invoices.map((inv) => {
                const overdue = inv.status === "SENT" && inv.dueDate != null && inv.dueDate <= now;
                return (
                  <tr key={inv.id} className="transition-colors hover:bg-surface-low">
                    <td className="px-5 py-4">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">{inv.number}</Link>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{inv.client.displayName}</td>
                    <td className="px-5 py-4 text-on-surface-variant">{money(total(inv.items))}</td>
                    <td className="px-5 py-4">
                      <Badge tone={overdue ? "red" : invoiceStatusTone[inv.status]}>
                        {overdue ? "Overdue" : invoiceStatusLabel[inv.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">{formatDate(inv.dueDate)}</td>
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
