ALTER TABLE "BranchCourse"
ADD COLUMN IF NOT EXISTS "courseType" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "BranchCourse_branchId_courseType_idx"
ON "BranchCourse"("branchId", "courseType");
