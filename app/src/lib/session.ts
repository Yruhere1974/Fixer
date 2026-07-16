import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

/**
 * Placeholder actor resolution. Real authentication is a dedicated follow-up (ADR 0002).
 * For now the acting user is chosen by the `fixer_actor` cookie (a user id) and falls back to
 * the founder, so every mutation still attributes an actor to the audit trail (plan §8.4:
 * "give each worker an individual account").
 */
export async function getActor(): Promise<User | null> {
  const cookieStore = await cookies();
  const actorId = cookieStore.get("fixer_actor")?.value;

  if (actorId) {
    const user = await prisma.user.findUnique({ where: { id: actorId } });
    if (user?.active) return user;
  }

  return prisma.user.findFirst({
    where: { role: "FOUNDER", active: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireActor(): Promise<User> {
  const actor = await getActor();
  if (!actor) {
    throw new Error("No acting user available. Seed users before using the app.");
  }
  return actor;
}
