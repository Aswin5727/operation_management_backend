ALTER TABLE "BranchStudent"
  ADD COLUMN IF NOT EXISTS "batchId" TEXT,
  ADD COLUMN IF NOT EXISTS "batchName" TEXT,
  ADD COLUMN IF NOT EXISTS "batchTiming" TEXT;

ALTER TABLE "FacultyTodayWorkEntry"
  ADD COLUMN IF NOT EXISTS "batchId" TEXT,
  ADD COLUMN IF NOT EXISTS "batchName" TEXT,
  ADD COLUMN IF NOT EXISTS "batchTiming" TEXT;

CREATE INDEX IF NOT EXISTS "BranchStudent_branchId_batchId_idx"
  ON "BranchStudent" ("branchId", "batchId");

CREATE INDEX IF NOT EXISTS "BranchStudent_branchId_courseId_facultyId_batchId_idx"
  ON "BranchStudent" ("branchId", "courseId", "facultyId", "batchId");

CREATE INDEX IF NOT EXISTS "FacultyTodayWorkEntry_branchId_courseId_batchId_idx"
  ON "FacultyTodayWorkEntry" ("branchId", "courseId", "batchId");
