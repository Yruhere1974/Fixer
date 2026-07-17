// §5 role capability model (ADR 0003). Enforced server-side, never in the client.
import type { Role, User } from "@/generated/prisma/client";

const VIEW_ALL_CLIENTS: Role[] = ["FOUNDER", "LEAD_NAVIGATOR", "PRIVACY_LEAD"];
const COORDINATE: Role[] = ["FOUNDER", "LEAD_NAVIGATOR", "NAVIGATOR", "ASSISTANT"];

/** May this role see every client, or only the ones assigned to them? */
export function canViewAllClients(role: Role): boolean {
  return VIEW_ALL_CLIENTS.includes(role);
}

/** May this role perform coordination mutations (approve/complete actions, attempt disclosures)? */
export function canCoordinate(role: Role): boolean {
  return COORDINATE.includes(role);
}

/** May this user access this specific client's record? */
export function canAccessClient(
  user: Pick<User, "id" | "role">,
  client: { assignedNavigatorId: string | null },
): boolean {
  return canViewAllClients(user.role) || client.assignedNavigatorId === user.id;
}

/** Throw if the user may not coordinate — used to guard server actions. */
export function assertCanCoordinate(user: Pick<User, "role">): void {
  if (!canCoordinate(user.role)) {
    throw new Error("Your role does not permit this action.");
  }
}
