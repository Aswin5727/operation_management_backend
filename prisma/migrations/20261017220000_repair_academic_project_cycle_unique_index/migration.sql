-- The Prisma schema uses this compound key for project upserts.
-- Keep all existing project rows and restore the missing database constraint.
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTestProject_academicTestItemId_branchBatchId_cycleId_key"
ON "AcademicTestProject"("academicTestItemId", "branchBatchId", "cycleId");
