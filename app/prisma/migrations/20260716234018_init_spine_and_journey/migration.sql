-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FOUNDER', 'LEAD_NAVIGATOR', 'NAVIGATOR', 'ASSISTANT', 'PRIVACY_LEAD', 'REVIEWER', 'BOOKKEEPER', 'EXTERNAL_ADVISOR');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('SECURE_PORTAL', 'EMAIL', 'PHONE', 'SMS', 'IN_PERSON', 'MAIL');

-- CreateEnum
CREATE TYPE "InfoCategory" AS ENUM ('CONTACT_DETAILS', 'SCHEDULING', 'PROVIDER_COORDINATION', 'GENERAL_WELLBEING', 'ACCESSIBILITY', 'FINANCIAL', 'HEALTH_SENSITIVE', 'SAFEGUARDING', 'IDENTITY_DOCUMENT');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('SERVICE', 'CONTACT_PROVIDER', 'BOOK_APPOINTMENT', 'RECEIVE_FROM_PROVIDER', 'FAMILY_UPDATE', 'ATTEND_APPOINTMENT', 'HANDLE_DOCUMENTS', 'TESTIMONIAL', 'MARKETING');

-- CreateEnum
CREATE TYPE "ConsentMethod" AS ENUM ('WRITTEN_SIGNATURE', 'ELECTRONIC_ACCEPTANCE', 'VERBAL_DOCUMENTED', 'EMAIL_CONFIRMATION');

-- CreateEnum
CREATE TYPE "FitDecision" AS ENUM ('PENDING', 'IN_SCOPE', 'OUT_OF_SCOPE');

-- CreateEnum
CREATE TYPE "ScreenOutcome" AS ENUM ('PROCEED', 'REFERRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'AWAITING_APPROVAL', 'DONE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RetentionCategory" AS ENUM ('SHORT_TERM', 'STANDARD_SERVICE', 'FINANCIAL', 'INCIDENT_LEGAL', 'CONSENT_RECORD');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'DISCLOSE', 'DISCLOSURE_BLOCKED', 'WITHDRAW_CONSENT', 'DOWNLOAD', 'DELETE', 'SCREEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "preferredChannel" "CommunicationChannel",
    "status" "ClientStatus" NOT NULL DEFAULT 'PROSPECT',
    "assignedNavigatorId" TEXT,
    "retentionCategory" "RetentionCategory",
    "retentionReviewDate" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "generalReason" TEXT NOT NULL,
    "locationEligible" BOOLEAN NOT NULL DEFAULT true,
    "urgencyNote" TEXT,
    "fitDecision" "FitDecision" NOT NULL DEFAULT 'PENDING',
    "fitReason" TEXT,
    "packageDiscussed" TEXT,
    "followUpDate" TIMESTAMP(3),
    "becameClient" BOOLEAN NOT NULL DEFAULT false,
    "notProceedReason" TEXT,
    "referralOutcome" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "withinScope" BOOLEAN NOT NULL,
    "immediateConcern" BOOLEAN NOT NULL,
    "resourceProvided" TEXT,
    "objectiveFacts" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "outcome" "ScreenOutcome" NOT NULL,
    "screenedById" TEXT,
    "screenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAgreement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "servicePackage" TEXT NOT NULL,
    "versionAccepted" TEXT NOT NULL,
    "feesConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "responseTimesConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "method" "ConsentMethod" NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "preferredName" TEXT,
    "pronouns" TEXT,
    "language" TEXT,
    "communicationMethod" "CommunicationChannel",
    "accessibilityNeeds" TEXT,
    "serviceObjective" TEXT NOT NULL,
    "topPriorities" TEXT,
    "deadlines" TEXT,
    "budgetRange" TEXT,
    "expenseLimit" DECIMAL(10,2),
    "existingProviders" TEXT,
    "transportationConstraints" TEXT,
    "culturalPreferences" TEXT,
    "knownRisks" TEXT,
    "doNotShare" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "permittedInfo" "InfoCategory"[],
    "channels" "CommunicationChannel"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovedContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "grantedByName" TEXT NOT NULL,
    "coveredInfo" "InfoCategory"[],
    "purpose" TEXT NOT NULL,
    "excludedInfo" TEXT,
    "channels" "CommunicationChannel"[],
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "method" "ConsentMethod" NOT NULL,
    "versionAccepted" TEXT NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnById" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disclosure" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientContactId" TEXT,
    "category" "InfoCategory" NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "infoSummary" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "consentId" TEXT,
    "allowed" BOOLEAN NOT NULL,
    "blockedReason" TEXT,
    "senderId" TEXT,
    "followUp" TEXT,
    "disclosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disclosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "desiredOutcome" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "clientApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desiredOutcome" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "ownerId" TEXT,
    "reviewerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ActionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dependencyId" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "approvedCost" DECIMAL(10,2),
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "backupOption" TEXT,
    "evidence" TEXT,
    "nextAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "clientId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_consentRecipients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_consentRecipients_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_assignedNavigatorId_idx" ON "Client"("assignedNavigatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_clientId_key" ON "Inquiry"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningRecord_clientId_key" ON "ScreeningRecord"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAgreement_clientId_key" ON "ServiceAgreement"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeRecord_clientId_key" ON "IntakeRecord"("clientId");

-- CreateIndex
CREATE INDEX "ApprovedContact_clientId_idx" ON "ApprovedContact"("clientId");

-- CreateIndex
CREATE INDEX "ConsentRecord_clientId_type_idx" ON "ConsentRecord"("clientId", "type");

-- CreateIndex
CREATE INDEX "Disclosure_clientId_idx" ON "Disclosure"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionPlan_clientId_key" ON "ActionPlan"("clientId");

-- CreateIndex
CREATE INDEX "ActionItem_planId_idx" ON "ActionItem"("planId");

-- CreateIndex
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");

-- CreateIndex
CREATE INDEX "AuditEvent_clientId_idx" ON "AuditEvent"("clientId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "_consentRecipients_B_index" ON "_consentRecipients"("B");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedNavigatorId_fkey" FOREIGN KEY ("assignedNavigatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRecord" ADD CONSTRAINT "ScreeningRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRecord" ADD CONSTRAINT "ScreeningRecord_screenedById_fkey" FOREIGN KEY ("screenedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAgreement" ADD CONSTRAINT "ServiceAgreement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeRecord" ADD CONSTRAINT "IntakeRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedContact" ADD CONSTRAINT "ApprovedContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_withdrawnById_fkey" FOREIGN KEY ("withdrawnById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disclosure" ADD CONSTRAINT "Disclosure_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disclosure" ADD CONSTRAINT "Disclosure_recipientContactId_fkey" FOREIGN KEY ("recipientContactId") REFERENCES "ApprovedContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disclosure" ADD CONSTRAINT "Disclosure_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "ConsentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disclosure" ADD CONSTRAINT "Disclosure_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "ActionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_consentRecipients" ADD CONSTRAINT "_consentRecipients_A_fkey" FOREIGN KEY ("A") REFERENCES "ApprovedContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_consentRecipients" ADD CONSTRAINT "_consentRecipients_B_fkey" FOREIGN KEY ("B") REFERENCES "ConsentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
