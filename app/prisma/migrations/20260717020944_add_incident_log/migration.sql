-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('COMPLAINT', 'INCIDENT', 'NEAR_MISS', 'PRIVACY_EVENT', 'SAFEGUARDING');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'CORRECTIVE_ACTION', 'CLOSED');

-- CreateTable
CREATE TABLE "IncidentRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "type" "IncidentType" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurredAt" TIMESTAMP(3),
    "reportedByName" TEXT NOT NULL,
    "peopleAffected" TEXT,
    "infoAffected" TEXT,
    "description" TEXT NOT NULL,
    "immediateAction" TEXT,
    "notifications" TEXT,
    "reviewDueAt" TIMESTAMP(3) NOT NULL,
    "escalationOwnerId" TEXT,
    "findings" TEXT,
    "correctiveActions" TEXT,
    "correctiveOwner" TEXT,
    "correctiveDeadline" TIMESTAMP(3),
    "correctiveVerified" BOOLEAN NOT NULL DEFAULT false,
    "relatedChange" TEXT,
    "closureApprovedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentRecord_status_idx" ON "IncidentRecord"("status");

-- CreateIndex
CREATE INDEX "IncidentRecord_severity_idx" ON "IncidentRecord"("severity");

-- AddForeignKey
ALTER TABLE "IncidentRecord" ADD CONSTRAINT "IncidentRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRecord" ADD CONSTRAINT "IncidentRecord_escalationOwnerId_fkey" FOREIGN KEY ("escalationOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRecord" ADD CONSTRAINT "IncidentRecord_closureApprovedById_fkey" FOREIGN KEY ("closureApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRecord" ADD CONSTRAINT "IncidentRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
