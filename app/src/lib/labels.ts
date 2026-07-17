// Human-readable labels for enum values and small formatting helpers.
import type {
  ActionStatus,
  ApprovalStatus,
  ClientStatus,
  CommunicationChannel,
  ConsentType,
  FitDecision,
  InfoCategory,
  Priority,
  ProviderStatus,
  ScreenOutcome,
  ServiceCategory,
} from "@/generated/prisma/client";
import type { ConsentStatus } from "@/lib/consent";

export const clientStatusLabel: Record<ClientStatus, string> = {
  PROSPECT: "Prospect",
  ACTIVE: "Active",
  PAUSED: "Paused",
  CLOSED: "Closed",
};

export const consentTypeLabel: Record<ConsentType, string> = {
  SERVICE: "Provide the service",
  CONTACT_PROVIDER: "Contact a provider",
  BOOK_APPOINTMENT: "Book / change appointments",
  RECEIVE_FROM_PROVIDER: "Receive info from a provider",
  FAMILY_UPDATE: "Share updates with family",
  ATTEND_APPOINTMENT: "Attend an appointment",
  HANDLE_DOCUMENTS: "Handle documents",
  TESTIMONIAL: "Use a testimonial",
  MARKETING: "Marketing communications",
};

export const infoCategoryLabel: Record<InfoCategory, string> = {
  CONTACT_DETAILS: "Contact details",
  SCHEDULING: "Scheduling",
  PROVIDER_COORDINATION: "Provider coordination",
  GENERAL_WELLBEING: "General wellbeing",
  ACCESSIBILITY: "Accessibility",
  FINANCIAL: "Financial",
  HEALTH_SENSITIVE: "Health (sensitive)",
  SAFEGUARDING: "Safeguarding",
  IDENTITY_DOCUMENT: "Identity document",
};

export const channelLabel: Record<CommunicationChannel, string> = {
  SECURE_PORTAL: "Secure portal",
  EMAIL: "Email",
  PHONE: "Phone",
  SMS: "SMS",
  IN_PERSON: "In person",
  MAIL: "Mail",
};

export const actionStatusLabel: Record<ActionStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  AWAITING_APPROVAL: "Awaiting approval",
  DONE: "Done",
};

export const approvalStatusLabel: Record<ApprovalStatus, string> = {
  NOT_REQUIRED: "Not required",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const priorityLabel: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const fitDecisionLabel: Record<FitDecision, string> = {
  PENDING: "Pending",
  IN_SCOPE: "In scope",
  OUT_OF_SCOPE: "Out of scope",
};

export const screenOutcomeLabel: Record<ScreenOutcome, string> = {
  PROCEED: "Proceed",
  REFERRED: "Referred",
  CLOSED: "Closed",
};

export const consentStatusLabel: Record<ConsentStatus, string> = {
  ACTIVE: "Active",
  SCHEDULED: "Scheduled",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
};

export const serviceCategoryLabel: Record<ServiceCategory, string> = {
  FAMILY_PHYSICIAN: "Family physician",
  NURSE_PRACTITIONER: "Nurse practitioner",
  PHYSIOTHERAPY: "Physiotherapy",
  COUNSELLING: "Counselling",
  NUTRITION: "Nutrition",
  FITNESS: "Fitness",
  HOME_SUPPORT: "Home support",
  TRANSPORTATION: "Transportation",
  MEALS: "Meals",
  RECREATION: "Recreation",
  SENIORS_SERVICES: "Seniors' services",
  OTHER: "Other",
};

export const providerStatusLabel: Record<ProviderStatus, string> = {
  PENDING_VERIFICATION: "Pending verification",
  ACTIVE: "Verified",
  STALE: "Stale",
  RESTRICTED: "Restricted",
  INACTIVE: "Inactive",
};

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "—";
}

export function money(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n)
    : "—";
}
