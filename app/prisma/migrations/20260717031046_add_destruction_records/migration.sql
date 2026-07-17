-- CreateTable
CREATE TABLE "DestructionRecord" (
    "id" TEXT NOT NULL,
    "subjectLabel" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "retentionCategory" "RetentionCategory",
    "method" TEXT,
    "note" TEXT,
    "destroyedById" TEXT,
    "destroyedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestructionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DestructionRecord_destroyedAt_idx" ON "DestructionRecord"("destroyedAt");

-- AddForeignKey
ALTER TABLE "DestructionRecord" ADD CONSTRAINT "DestructionRecord_destroyedById_fkey" FOREIGN KEY ("destroyedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
