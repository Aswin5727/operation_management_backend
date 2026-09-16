ALTER TABLE "Branch" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "BranchCalendarLeave" ADD COLUMN "isInstitute" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "declaredBy" TEXT,
  ADD COLUMN "affectedClasses" JSONB NOT NULL DEFAULT '[]';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'INSTITUTE_LEAVE';
CREATE UNIQUE INDEX "BranchCalendarLeave_active_institute_date_key" ON "BranchCalendarLeave"("branchId", "leaveDate") WHERE "status" = 'ACTIVE' AND "isInstitute" = true;
ALTER TABLE "BranchCalendarLeave" ADD CONSTRAINT "BranchCalendarLeave_institute_branch_scope" CHECK (NOT "isInstitute" OR "batchId" IS NULL);
