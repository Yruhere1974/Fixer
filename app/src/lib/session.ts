import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import type { User } from "@/generated/prisma/client";

/**
 * Data Access Layer (ADR 0003). The authoritative "who is acting" for pages and server actions.
 * `currentUser()` returns null when signed out; `requireUser()` redirects to /login.
 */
export async function currentUser(): Promise<User | null> {
  return getSessionUser();
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
