"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { canManageDirectory } from "@/lib/access";
import { REVIEW_INTERVAL_DAYS } from "@/lib/providers";
import { errState, str, type FormState } from "@/lib/forms";
import type { ProviderStatus, ServiceCategory } from "@/generated/prisma/client";

/** Create a directory entry. Enters PENDING_VERIFICATION until credentials are verified (§17.7). */
export async function createProvider(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canManageDirectory(user.role)) return errState("Your role does not permit managing the directory.");

  const name = str(formData, "name");
  const category = str(formData, "category") as ServiceCategory;
  const servicesOffered = str(formData, "servicesOffered");
  if (!name) return errState("Enter the provider name.");
  if (!category) return errState("Choose a service category.");
  if (!servicesOffered) return errState("Describe the exact services and client fit.");

  const provider = await prisma.provider.create({
    data: {
      name,
      category,
      servicesOffered,
      organization: str(formData, "organization") || null,
      clientFit: str(formData, "clientFit") || null,
      contactEmail: str(formData, "contactEmail") || null,
      contactPhone: str(formData, "contactPhone") || null,
      website: str(formData, "website") || null,
      location: str(formData, "location") || null,
      serviceArea: str(formData, "serviceArea") || null,
      virtualOptions: str(formData, "virtualOptions") === "on",
      accessibility: str(formData, "accessibility") || null,
      languages: str(formData, "languages") || null,
      pricing: str(formData, "pricing") || null,
      cancellationPolicy: str(formData, "cancellationPolicy") || null,
      waitTime: str(formData, "waitTime") || null,
      referralRequired: str(formData, "referralRequired") === "on",
      registration: str(formData, "registration") || null,
      conflictDisclosure: str(formData, "conflictDisclosure") || null,
      status: "PENDING_VERIFICATION",
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: "Provider",
    entityId: provider.id,
    summary: `Added provider "${name}" (pending verification).`,
  });
  redirect(`/providers/${provider.id}`);
}

/**
 * Verify credentials (ops §17.7: before first referral). Records the source and date, sets the
 * entry ACTIVE, and schedules the next review. Refuses without a stated source.
 */
export async function verifyProvider(formData: FormData) {
  const user = await requireUser();
  if (!canManageDirectory(user.role)) return;
  const id = str(formData, "providerId");
  const source = str(formData, "verificationSource");
  if (!id || !source) return; // a source is required to claim verification

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + REVIEW_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.provider.update({
    where: { id },
    data: {
      status: "ACTIVE",
      verifiedAt: now,
      verificationSource: source,
      verifiedById: user.id,
      lastReviewDate: now,
      nextReviewDate,
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "APPROVE",
    entityType: "Provider",
    entityId: id,
    summary: `Verified credentials via ${source}.`,
  });
  revalidatePath(`/providers/${id}`);
  revalidatePath("/providers");
}

/** Record a periodic review — refreshes the review clock without changing verification source. */
export async function markProviderReviewed(formData: FormData) {
  const user = await requireUser();
  if (!canManageDirectory(user.role)) return;
  const id = str(formData, "providerId");
  if (!id) return;

  const now = new Date();
  await prisma.provider.update({
    where: { id },
    data: {
      status: "ACTIVE",
      lastReviewDate: now,
      nextReviewDate: new Date(now.getTime() + REVIEW_INTERVAL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Provider",
    entityId: id,
    summary: "Recorded periodic review.",
  });
  revalidatePath(`/providers/${id}`);
  revalidatePath("/providers");
}

/** Restrict or deactivate an entry. */
export async function setProviderStatus(formData: FormData) {
  const user = await requireUser();
  if (!canManageDirectory(user.role)) return;
  const id = str(formData, "providerId");
  const status = str(formData, "status") as ProviderStatus;
  if (!id || !["PENDING_VERIFICATION", "ACTIVE", "RESTRICTED", "INACTIVE"].includes(status)) return;

  await prisma.provider.update({ where: { id }, data: { status } });
  await recordAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Provider",
    entityId: id,
    summary: `Set directory status to ${status}.`,
  });
  revalidatePath(`/providers/${id}`);
  revalidatePath("/providers");
}
