ALTER TABLE "BranchStudentCourse"
ADD COLUMN IF NOT EXISTS "importedLifecycleStatus" TEXT;

CREATE INDEX IF NOT EXISTS "BranchStudentCourse_importedLifecycleStatus_idx"
ON "BranchStudentCourse"("importedLifecycleStatus");
