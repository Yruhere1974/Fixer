import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canHandlePrivacy } from "@/lib/access";
import { listClients } from "@/lib/queries";
import { LogPrivacyForm } from "./log-privacy-form";

export const dynamic = "force-dynamic";

export default async function NewPrivacyRequestPage() {
  const user = await requireUser();
  if (!canHandlePrivacy(user.role)) notFound();
  const clients = await listClients(user);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/privacy" className="text-sm text-primary hover:underline">← Privacy requests</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Log a privacy request</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Access, correction, consent withdrawal, complaint, or export (§6.13).
        </p>
      </div>
      <div className="card p-6">
        <LogPrivacyForm clients={clients.map((c) => ({ id: c.id, displayName: c.displayName }))} />
      </div>
    </div>
  );
}
