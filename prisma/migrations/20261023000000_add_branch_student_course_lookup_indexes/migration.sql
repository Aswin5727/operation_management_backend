CREATE INDEX IF NOT EXISTS "BranchStudentCourse_batchCycleId_status_idx"
  ON "BranchStudentCourse" ("batchCycleId", "status");

CREATE INDEX IF NOT EXISTS "BranchStudentCourse_batchId_status_idx"
  ON "BranchStudentCourse" ("batchId", "status");

CREATE INDEX IF NOT EXISTS "BranchStudentCourse_branchStudentId_status_idx"
  ON "BranchStudentCourse" ("branchStudentId", "status");