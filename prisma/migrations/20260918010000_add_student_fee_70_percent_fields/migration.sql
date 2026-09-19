ALTER TABLE "BranchStudent"
ADD COLUMN IF NOT EXISTS "feeScheduleMode" TEXT NOT NULL DEFAULT 'MONTHLY_FIXED_DATE',
ADD COLUMN IF NOT EXISTS "feeFirstPaymentDate" TEXT,
ADD COLUMN IF NOT EXISTS "fee70ProgressDate" TEXT,
ADD COLUMN IF NOT EXISTS "fee70TargetHours" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "feePaymentDeadline" TEXT,
ADD COLUMN IF NOT EXISTS "feeComplianceStatus" TEXT NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "BranchStudent_fee70ProgressDate_idx"
ON "BranchStudent"("fee70ProgressDate");

CREATE INDEX IF NOT EXISTS "BranchStudent_feeComplianceStatus_idx"
ON "BranchStudent"("feeComplianceStatus");
