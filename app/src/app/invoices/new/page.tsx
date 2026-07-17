import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canManageBilling } from "@/lib/access";
import { CreateInvoiceForm } from "./create-invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const user = await requireUser();
  if (!canManageBilling(user.role)) notFound();
  // Billing sees client display names only (neutral) — not health data (§5, §6.11).
  const clients = await prisma.client.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/invoices" className="text-sm text-primary hover:underline">← Invoices</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Create a draft, then add service lines and approved expenses.</p>
      </div>
      <div className="card p-6"><CreateInvoiceForm clients={clients} /></div>
    </div>
  );
}
