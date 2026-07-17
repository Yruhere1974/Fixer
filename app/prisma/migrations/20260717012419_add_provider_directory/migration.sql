-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('FAMILY_PHYSICIAN', 'NURSE_PRACTITIONER', 'PHYSIOTHERAPY', 'COUNSELLING', 'NUTRITION', 'FITNESS', 'HOME_SUPPORT', 'TRANSPORTATION', 'MEALS', 'RECREATION', 'SENIORS_SERVICES', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'STALE', 'RESTRICTED', 'INACTIVE');

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "category" "ServiceCategory" NOT NULL,
    "servicesOffered" TEXT NOT NULL,
    "clientFit" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "location" TEXT,
    "serviceArea" TEXT,
    "virtualOptions" BOOLEAN NOT NULL DEFAULT false,
    "accessibility" TEXT,
    "languages" TEXT,
    "culturalSafety" TEXT,
    "pricing" TEXT,
    "cancellationPolicy" TEXT,
    "waitTime" TEXT,
    "referralRequired" BOOLEAN NOT NULL DEFAULT false,
    "registration" TEXT,
    "insuranceNote" TEXT,
    "privacyPractices" TEXT,
    "conflictDisclosure" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verificationSource" TEXT,
    "verifiedById" TEXT,
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Provider_category_idx" ON "Provider"("category");

-- CreateIndex
CREATE INDEX "Provider_status_idx" ON "Provider"("status");

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
