-- The baseline omitted course-scoped payment fields used by the current Prisma schema.
ALTER TABLE "BranchStudentInstallment"
  ADD COLUMN IF NOT EXISTS "courseId" TEXT;

ALTER TABLE "BranchStudentPayment"
  ADD COLUMN IF NOT EXISTS "courseId" TEXT;

CREATE INDEX IF NOT EXISTS "BranchStudentInstallment_branchStudentId_courseId_status_idx"
  ON "BranchStudentInstallment"("branchStudentId", "courseId", "status");

CREATE INDEX IF NOT EXISTS "BranchStudentPayment_branchStudentId_courseId_idx"
  ON "BranchStudentPayment"("branchStudentId", "courseId");
