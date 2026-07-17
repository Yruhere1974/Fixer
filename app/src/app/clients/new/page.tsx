import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canCoordinate } from "@/lib/access";
import { NewEngagementForm } from "./new-engagement-form";

export const dynamic = "force-dynamic";

export default async function NewEngagementPage() {
  const user = await requireUser();
  if (!canCoordinate(user.role)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/workspace" className="text-sm text-primary hover:underline">← Workspace</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New engagement</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Record the inquiry and the scope/safety screen (§17.4 steps 1–3). Emergencies bypass the
          sales process — direct the person to the appropriate resource first.
        </p>
      </div>
      <div className="card p-6">
        <NewEngagementForm />
      </div>
    </div>
  );
}
