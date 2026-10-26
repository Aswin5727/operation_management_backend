ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'SALES_CRM_ADMISSION';

ALTER TABLE "BranchStudent"
  ADD COLUMN "sourceLeadId" TEXT,
  ADD COLUMN "admissionSource" TEXT;

CREATE UNIQUE INDEX "BranchStudent_sourceLeadId_key" ON "BranchStudent"("sourceLeadId");
ALTER TABLE "BranchStudent"
  ADD CONSTRAINT "BranchStudent_sourceLeadId_fkey"
  FOREIGN KEY ("sourceLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD COLUMN "admissionStatus" TEXT NOT NULL DEFAULT 'PENDING';
