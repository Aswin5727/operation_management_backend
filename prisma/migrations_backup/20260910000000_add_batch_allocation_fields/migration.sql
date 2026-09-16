ALTER TABLE "BranchBatch" ADD COLUMN IF NOT EXISTS "weekType" TEXT;
ALTER TABLE "BranchBatch" ADD COLUMN IF NOT EXISTS "mode" TEXT;
ALTER TABLE "BranchBatch" ADD COLUMN IF NOT EXISTS "courseStartDate" TEXT;
ALTER TABLE "BranchBatch" ADD COLUMN IF NOT EXISTS "courseEndDate" TEXT;
CREATE INDEX IF NOT EXISTS "BranchBatch_courseId_weekType_mode_idx" ON "BranchBatch"("courseId", "weekType", "mode");
