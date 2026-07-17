import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canManageDirectory } from "@/lib/access";
import { NewProviderForm } from "./new-provider-form";

export const dynamic = "force-dynamic";

export default async function NewProviderPage() {
  const user = await requireUser();
  if (!canManageDirectory(user.role)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/providers" className="text-sm text-primary hover:underline">← Directory</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New provider</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Add a directory entry (§17.7). Verify credentials before any referral.</p>
      </div>
      <div className="card p-6"><NewProviderForm /></div>
    </div>
  );
}
