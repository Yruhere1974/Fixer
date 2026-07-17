"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export interface LoginState {
  error: string;
}

export async function login(_prev: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic message whether the account is missing, inactive, or the password is wrong.
  if (!user || !user.active || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "Session",
    summary: `${user.name} signed in.`,
  });

  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
