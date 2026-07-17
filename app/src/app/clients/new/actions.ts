"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { canCoordinate } from "@/lib/access";
import { errState, str, type FormState } from "@/lib/forms";
import type { CommunicationChannel, ScreenOutcome } from "@/generated/prisma/client";

/**
 * Create a new engagement: Client + Inquiry + scope/safety screen in one step (journey §17.4
 * steps 1–3). Collects minimal PII, records the fit decision and the safety screen, and assigns
 * the creating navigator. If the screen does not proceed, the client is opened as CLOSED.
 */
export async function createEngagement(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  if (!canCoordinate(user.role)) return errState("Your role does not permit creating engagements.");

  const displayName = str(formData, "displayName");
  const source = str(formData, "source");
  const generalReason = str(formData, "generalReason");
  const objectiveFacts = str(formData, "objectiveFacts");
  const actionTaken = str(formData, "actionTaken");
  const outcome = str(formData, "outcome") as ScreenOutcome;

  if (!displayName) return errState("Enter a client display name.");
  if (!source) return errState("Enter the inquiry source.");
  if (!generalReason) return errState("Enter the general reason for the inquiry (no unnecessary health detail).");
  if (!objectiveFacts) return errState("Record the objective facts of the safety screen.");
  if (!["PROCEED", "REFERRED", "CLOSED"].includes(outcome)) return errState("Choose a screen outcome.");

  const withinScope = str(formData, "withinScope") === "on";
  const immediateConcern = str(formData, "immediateConcern") === "on";
  const contactEmail = str(formData, "contactEmail") || null;
  const contactPhone = str(formData, "contactPhone") || null;
  const preferredChannel = (str(formData, "preferredChannel") || null) as CommunicationChannel | null;
  const resourceProvided = str(formData, "resourceProvided") || null;
  const proceeds = outcome === "PROCEED";

  const client = await prisma.client.create({
    data: {
      displayName,
      contactEmail,
      contactPhone,
      preferredChannel,
      status: proceeds ? "PROSPECT" : "CLOSED",
      closedAt: proceeds ? null : new Date(),
      assignedNavigatorId: user.id,
      inquiry: {
        create: {
          source,
          generalReason,
          fitDecision: withinScope ? "IN_SCOPE" : "OUT_OF_SCOPE",
          becameClient: proceeds,
          notProceedReason: proceeds ? null : `Screen outcome: ${outcome}`,
          handledById: user.id,
        },
      },
      screening: {
        create: {
          withinScope,
          immediateConcern,
          resourceProvided,
          objectiveFacts,
          actionTaken: actionTaken || "—",
          outcome,
          screenedById: user.id,
        },
      },
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    clientId: client.id,
    summary: `Created engagement "${displayName}" (screen: ${outcome}).`,
  });

  redirect(`/clients/${client.id}`);
}
