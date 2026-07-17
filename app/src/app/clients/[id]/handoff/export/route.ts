import { getSessionUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { buildHandoffMarkdown, getHandoffData } from "@/lib/handoff";

/** Download the handoff package as a Markdown file (§6.14). Access-checked and audited. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const data = await getHandoffData(id, user);
  if (!data) return new Response("Not found", { status: 404 });

  const markdown = buildHandoffMarkdown(data);
  const safeName = data.displayName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();

  await recordAudit({
    actorId: user.id,
    action: "DOWNLOAD",
    entityType: "Client",
    entityId: data.id,
    clientId: data.id,
    summary: "Exported handoff package.",
  });

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="handoff-${safeName || "client"}.md"`,
    },
  });
}
