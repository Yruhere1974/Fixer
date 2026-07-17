-- AlterTable
ALTER TABLE "ServiceAgreement" ADD COLUMN     "afterHoursPolicy" TEXT,
ADD COLUMN     "authorizedFamilyRecipients" INTEGER,
ADD COLUMN     "contactCadenceDays" INTEGER,
ADD COLUMN     "includedHours" DECIMAL(10,2),
ADD COLUMN     "includedProactiveContacts" INTEGER,
ADD COLUMN     "overageRate" DECIMAL(10,2),
ADD COLUMN     "responseWindowHours" INTEGER,
ADD COLUMN     "travelRadiusKm" INTEGER;
