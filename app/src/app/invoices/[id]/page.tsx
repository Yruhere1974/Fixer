import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { Labeled, TextInput } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { getBillableExpenses, getInvoice } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { canManageBilling } from "@/lib/access";
import { formatDate, invoiceItemKindLabel, invoiceStatusLabel, money } from "@/lib/labels";
import { addExpenseToInvoice, addInvoiceItem, setInvoiceStatus } from "../actions";
import { invoiceStatusTone } from "../page";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!canManageBilling(user.role)) notFound();
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const isDraft = invoice.status === "DRAFT";
  const billable = isDraft ? await getBillableExpenses(invoice.clientId) : [];
  const total = invoice.items.reduce((s, i) => s + Number(i.amount), 0);
  const iid = <input type="hidden" name="invoiceId" value={invoice.id} />;
  const now = new Date();
  const overdue = invoice.status === "SENT" && invoice.dueDate != null && invoice.dueDate <= now;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/invoices" className="text-sm text-primary hover:underline">← Invoices</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.number}</h1>
          <Badge tone={overdue ? "red" : invoiceStatusTone[invoice.status]}>
            {overdue ? "Overdue" : invoiceStatusLabel[invoice.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          {invoice.client.displayName}
          {invoice.issueDate && ` · issued ${formatDate(invoice.issueDate)}`}
          {invoice.dueDate && ` · due ${formatDate(invoice.dueDate)}`}
          {invoice.paidAt && ` · paid ${formatDate(invoice.paidAt)}`}
        </p>
      </div>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant/50 bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {invoice.items.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-6 text-center text-on-surface-variant">No line items yet.</td></tr>
            ) : (
              invoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-5 py-3">
                    {it.description}
                    {it.quantity != null && it.unitAmount != null && (
                      <span className="text-xs text-on-surface-variant"> · {String(it.quantity)} × {money(it.unitAmount)}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{invoiceItemKindLabel[it.kind]}</td>
                  <td className="px-5 py-3 text-right">{money(it.amount)}</td>
                </tr>
              ))
            )}
            <tr className="bg-surface-low font-semibold">
              <td className="px-5 py-3" colSpan={2}>Total</td>
              <td className="px-5 py-3 text-right">{money(total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {isDraft && (
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Add line item</h2>
          <form action={addInvoiceItem} className="flex flex-wrap items-end gap-3">
            {iid}
            <Labeled label="Description (neutral)"><TextInput name="description" required className="w-72" placeholder="e.g. Coordination — 2 hours" /></Labeled>
            <Labeled label="Qty"><TextInput name="quantity" type="number" step="0.01" className="w-20" /></Labeled>
            <Labeled label="Unit (CAD)"><TextInput name="unitAmount" type="number" step="0.01" className="w-28" /></Labeled>
            <Labeled label="or Amount"><TextInput name="amount" type="number" step="0.01" className="w-28" /></Labeled>
            <SubmitButton pendingLabel="Adding…">Add line</SubmitButton>
          </form>

          {billable.length > 0 && (
            <div className="mt-5 border-t border-outline-variant/40 pt-4">
              <h3 className="mb-2 text-sm font-semibold">Approved expenses to bill</h3>
              <ul className="space-y-2">
                {billable.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{e.description} · {money(e.amount)}</span>
                    <form action={addExpenseToInvoice}>
                      {iid}
                      <input type="hidden" name="expenseId" value={e.id} />
                      <SubmitButton variant="outline">Add to invoice</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-primary">Status</h2>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "DRAFT" && (
            <StatusButton iid={iid} status="SENT" label="Mark sent" />
          )}
          {invoice.status === "SENT" && (
            <>
              <StatusButton iid={iid} status="PAID" label="Mark paid" />
              <StatusButton iid={iid} status="VOID" label="Void" variant="danger" />
            </>
          )}
          {(invoice.status === "PAID" || invoice.status === "VOID") && (
            <StatusButton iid={iid} status="DRAFT" label="Reopen as draft" variant="outline" />
          )}
        </div>
      </section>
    </div>
  );
}

function StatusButton({
  iid,
  status,
  label,
  variant = "primary",
}: {
  iid: React.ReactNode;
  status: string;
  label: string;
  variant?: "primary" | "outline" | "danger";
}) {
  return (
    <form action={setInvoiceStatus}>
      {iid}
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </form>
  );
}
