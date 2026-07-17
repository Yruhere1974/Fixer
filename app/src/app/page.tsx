import { redirect } from "next/navigation";

// Nothing lives at the root — send everyone to the workspace (proxy.ts sends the
// unauthenticated to /login first).
export const dynamic = "force-dynamic";

export default function RootPage() {
  redirect("/workspace");
}
