import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import type {
  CommunicationChannel,
  ConsentRecord,
  ConsentType,
  InfoCategory,
} from "@/generated/prisma/client";

export type ConsentStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "WITHDRAWN";

/** Derive the lifecycle status of a consent record (plan §6.3). */
export function consentStatus(
  consent: Pick<ConsentRecord, "effectiveDate" | "expiryDate" | "withdrawnAt">,
  now: Date = new Date(),
): ConsentStatus {
  if (consent.withdrawnAt) return "WITHDRAWN";
  if (consent.effectiveDate > now) return "SCHEDULED";
  if (consent.expiryDate && consent.expiryDate <= now) return "EXPIRED";
  return "ACTIVE";
}

export interface DisclosureRequest {
  clientId: string;
  /** The category of information (or action) being disclosed. */
  category: InfoCategory;
  /** The permission that should authorize it. */
  consentType: ConsentType;
  /** Channel the disclosure would go out on. */
  channel: CommunicationChannel;
  /** For recipient-specific permissions (e.g. FAMILY_UPDATE), the approved contact. */
  recipientContactId?: string | null;
}

export interface DisclosureDecision {
  allowed: boolean;
  reason: string;
  matchedConsentId: string | null;
  /** Non-blocking cautions that require human judgement (e.g. free-text exclusions). */
  warnings: string[];
}

/**
 * The core guard (plan §3.2, §6.3): decide whether a proposed disclosure is authorized.
 * A disclosure is permitted only when an ACTIVE consent of the right type covers the
 * information category, permits the channel, and — where a recipient is named — lists that
 * recipient. Anything absent, expired, withdrawn, or narrower than the request is refused.
 *
 * This function only decides; it performs no side effects. Use {@link recordDisclosure} to
 * evaluate *and* persist the attempt (permitted or blocked) to the audit trail.
 */
export async function evaluateDisclosure(
  req: DisclosureRequest,
  now: Date = new Date(),
): Promise<DisclosureDecision> {
  const warnings: string[] = [];

  const candidates = await prisma.consentRecord.findMany({
    where: { clientId: req.clientId, type: req.consentType },
    include: { recipients: true },
  });

  if (candidates.length === 0) {
    return {
      allowed: false,
      reason: `No ${req.consentType} consent exists for this client.`,
      matchedConsentId: null,
      warnings,
    };
  }

  const active = candidates.filter((c) => consentStatus(c, now) === "ACTIVE");
  if (active.length === 0) {
    return {
      allowed: false,
      reason: `A ${req.consentType} consent exists but is not currently active (expired, withdrawn, or not yet effective).`,
      matchedConsentId: null,
      warnings,
    };
  }

  for (const consent of active) {
    if (!consent.coveredInfo.includes(req.category)) continue;
    if (!consent.channels.includes(req.channel)) continue;

    // Recipient-specific check: if a recipient is named, the consent must list it,
    // and that contact's own limits must permit the category.
    if (req.recipientContactId) {
      const recipient = consent.recipients.find(
        (r) => r.id === req.recipientContactId,
      );
      if (!recipient) continue;
      if (!recipient.permittedInfo.includes(req.category)) {
        warnings.push(
          `Approved contact does not list ${req.category} among permitted information.`,
        );
        continue;
      }
    }

    if (consent.excludedInfo && consent.excludedInfo.trim().length > 0) {
      warnings.push(
        `Consent has explicit exclusions ("${consent.excludedInfo}") — confirm this disclosure is not among them before sending.`,
      );
    }

    return {
      allowed: true,
      reason: "Authorized by an active consent covering this information and channel.",
      matchedConsentId: consent.id,
      warnings,
    };
  }

  return {
    allowed: false,
    reason: `No active ${req.consentType} consent covers "${req.category}" on channel "${req.channel}"${
      req.recipientContactId ? " for the named recipient" : ""
    }.`,
    matchedConsentId: null,
    warnings,
  };
}

export interface RecordDisclosureInput extends DisclosureRequest {
  recipientName: string;
  infoSummary: string;
  purpose: string;
  senderId?: string | null;
  followUp?: string | null;
}

/**
 * Evaluate a disclosure and persist the attempt regardless of outcome. A blocked attempt is
 * recorded (allowed=false) with its reason and audited as DISCLOSURE_BLOCKED, so the chain
 * between what the client approved and what the business did — or tried to do — is intact.
 */
export async function recordDisclosure(input: RecordDisclosureInput) {
  const decision = await evaluateDisclosure(input);

  const disclosure = await prisma.$transaction(async (tx) => {
    const created = await tx.disclosure.create({
      data: {
        clientId: input.clientId,
        recipientName: input.recipientName,
        recipientContactId: input.recipientContactId ?? null,
        category: input.category,
        channel: input.channel,
        infoSummary: input.infoSummary,
        purpose: input.purpose,
        consentId: decision.matchedConsentId,
        allowed: decision.allowed,
        blockedReason: decision.allowed ? null : decision.reason,
        senderId: input.senderId ?? null,
        followUp: input.followUp ?? null,
      },
    });

    await recordAudit(
      {
        actorId: input.senderId ?? null,
        action: decision.allowed ? "DISCLOSE" : "DISCLOSURE_BLOCKED",
        entityType: "Disclosure",
        entityId: created.id,
        clientId: input.clientId,
        summary: decision.allowed
          ? `Disclosed ${input.category} to ${input.recipientName} via ${input.channel}.`
          : `Blocked disclosure of ${input.category} to ${input.recipientName}: ${decision.reason}`,
        metadata: {
          consentType: input.consentType,
          matchedConsentId: decision.matchedConsentId,
          warnings: decision.warnings,
        },
      },
      tx,
    );

    return created;
  });

  return { decision, disclosure };
}
