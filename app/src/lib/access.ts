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

/** May this role manage the provider directory (create/edit/verify)? Coordinators may. */
export function canManageDirectory(role: Role): boolean {
  return COORDINATE.includes(role);
}

// Incident/complaint records are the most sensitive class (§7.1) — restricted access (§6.12).
const HANDLE_INCIDENTS: Role[] = ["FOUNDER", "LEAD_NAVIGATOR", "PRIVACY_LEAD"];

/** May this role view and investigate incidents? Restricted to founder, lead navigator, privacy lead. */
export function canHandleIncidents(role: Role): boolean {
  return HANDLE_INCIDENTS.includes(role);
}

/** May this role report (raise) an incident? Any coordinator may — reporting must be easy (§8.9). */
export function canReportIncident(role: Role): boolean {
  return COORDINATE.includes(role) || HANDLE_INCIDENTS.includes(role);
}

// Client-rights requests are a privacy-lead function (§5, §6.13).
const HANDLE_PRIVACY: Role[] = ["FOUNDER", "PRIVACY_LEAD"];

/** May this role handle privacy access/correction/complaint requests? Founder + privacy lead. */
export function canHandlePrivacy(role: Role): boolean {
  return HANDLE_PRIVACY.includes(role);
}
