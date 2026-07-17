-- CreateEnum
CREATE TYPE "PromiseStatus" AS ENUM ('OPEN', 'KEPT', 'MISSED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "backupNavigatorId" TEXT,
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "nextContactDueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClientPromise" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "madeToName" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "clientWaiting" BOOLEAN NOT NULL DEFAULT true,
    "status" "PromiseStatus" NOT NULL DEFAULT 'OPEN',
    "keptAt" TIMESTAMP(3),
    "toldBeforeDeadline" BOOLEAN NOT NULL DEFAULT false,
    "recoveryAction" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPromise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientPromise_clientId_status_idx" ON "ClientPromise"("clientId", "status");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_backupNavigatorId_fkey" FOREIGN KEY ("backupNavigatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPromise" ADD CONSTRAINT "ClientPromise_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPromise" ADD CONSTRAINT "ClientPromise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
