import type { Provider, ProviderStatus } from "@/generated/prisma/client";

/** Review cadence for verified providers (ops §17.7: at least quarterly). */
export const REVIEW_INTERVAL_DAYS = 90;

/**
 * Effective directory status (ops §17.7). A verified provider whose review date has passed is
 * shown as STALE — it must not be presented as verified until reviewed again. The stored status
 * otherwise governs (pending, restricted, inactive).
 */
export function effectiveProviderStatus(
  p: Pick<Provider, "status" | "nextReviewDate">,
  now: Date = new Date(),
): ProviderStatus {
  if (p.status === "ACTIVE" && p.nextReviewDate && p.nextReviewDate <= now) return "STALE";
  return p.status;
}

/** True when a provider may be presented to a client as a verified option. */
export function isPresentable(p: Pick<Provider, "status" | "nextReviewDate">, now: Date = new Date()): boolean {
  return effectiveProviderStatus(p, now) === "ACTIVE";
}
