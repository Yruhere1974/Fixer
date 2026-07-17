-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecoveryIssueType" AS ENUM ('MISSED_CALLBACK', 'CONFUSING_MESSAGE', 'PROVIDER_CANCELLATION', 'DELAY', 'REPEATED_REQUEST', 'BILLING_SURPRISE', 'POOR_HANDOFF', 'FELT_UNHEARD', 'OTHER');

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "providerName" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "location" TEXT,
    "accessibilityArrangements" TEXT,
    "transportation" TEXT,
    "companion" TEXT,
    "whatToBring" TEXT,
    "clientQuestions" TEXT,
    "cancellationDeadline" TIMESTAMP(3),
    "cancellationFee" TEXT,
    "reminderPreference" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "locationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "transportConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "documentsReady" BOOLEAN NOT NULL DEFAULT false,
    "questionsPrepared" BOOLEAN NOT NULL DEFAULT false,
    "backupPlanned" BOOLEAN NOT NULL DEFAULT false,
    "outcomeNote" TEXT,
    "followUpAction" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handoff" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "commitment" TEXT,
    "permissionObtained" BOOLEAN NOT NULL DEFAULT false,
    "introduced" BOOLEAN NOT NULL DEFAULT false,
    "contextTransferred" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "primaryOwnerVisible" BOOLEAN NOT NULL DEFAULT true,
    "followedUp" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecovery" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "issueType" "RecoveryIssueType" NOT NULL,
    "description" TEXT NOT NULL,
    "acknowledgement" TEXT,
    "explanation" TEXT,
    "recoveryPlan" TEXT,
    "revisedCommitment" TEXT,
    "goodwillAction" TEXT,
    "learningNote" TEXT,
    "resolvedConfirmedWithClient" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_clientId_status_idx" ON "Appointment"("clientId", "status");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Handoff_clientId_idx" ON "Handoff"("clientId");

-- CreateIndex
CREATE INDEX "ServiceRecovery_clientId_idx" ON "ServiceRecovery"("clientId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecovery" ADD CONSTRAINT "ServiceRecovery_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecovery" ADD CONSTRAINT "ServiceRecovery_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
