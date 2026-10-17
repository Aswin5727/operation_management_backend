CREATE TABLE IF NOT EXISTS "BatchCycle" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "cycleNumber" INTEGER NOT NULL,
  "cycleName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startDate" TEXT,
  "endDate" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BatchCycle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BatchCycle_batchId_cycleNumber_key" ON "BatchCycle"("batchId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "BatchCycle_batchId_status_idx" ON "BatchCycle"("batchId", "status");
ALTER TABLE "BatchCycle" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "BatchCycle" ADD COLUMN IF NOT EXISTS "freezeUntil" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "BatchCycle_status_freezeUntil_idx" ON "BatchCycle"("status", "freezeUntil");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BatchCycle_batchId_fkey') THEN
    ALTER TABLE "BatchCycle" ADD CONSTRAINT "BatchCycle_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
INSERT INTO "BatchCycle" ("id", "batchId", "cycleNumber", "cycleName", "status", "startDate")
SELECT 'batch_cycle_' || md5(batch."id" || ':1'), batch."id", 1, 'Cycle 1', 'ACTIVE', batch."courseStartDate"
FROM "BranchBatch" batch
WHERE NOT EXISTS (SELECT 1 FROM "BatchCycle" cycle WHERE cycle."batchId" = batch."id");

CREATE TABLE IF NOT EXISTS "AcademicTestCycle" (
  "id" TEXT NOT NULL,
  "academicTestItemId" TEXT NOT NULL,
  "branchBatchId" TEXT NOT NULL,
  "cycleNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicTestCycle_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AcademicQuestionPaper" ADD COLUMN IF NOT EXISTS "cycleId" TEXT;
ALTER TABLE "AcademicTestProject" ADD COLUMN IF NOT EXISTS "cycleId" TEXT;
ALTER TABLE "AcademicScheduledTest" ADD COLUMN IF NOT EXISTS "cycleId" TEXT;
INSERT INTO "AcademicTestCycle" ("id", "academicTestItemId", "branchBatchId", "cycleNumber", "createdBy")
SELECT 'cycle_' || item."id" || '_' || assignment."branchBatchId", item."id", assignment."branchBatchId", 1, 'system'
FROM "AcademicTestItem" item
JOIN "AcademicTestBatch" assignment ON assignment."academicTestId" = item."academicTestId"
WHERE NOT EXISTS (
  SELECT 1 FROM "AcademicTestCycle" cycle
  WHERE cycle."academicTestItemId" = item."id" AND cycle."branchBatchId" = assignment."branchBatchId"
);
UPDATE "AcademicQuestionPaper" paper SET "cycleId" = cycle."id"
FROM "AcademicTestCycle" cycle
WHERE paper."cycleId" IS NULL AND cycle."academicTestItemId" = paper."academicTestItemId" AND cycle."branchBatchId" = paper."branchBatchId";
UPDATE "AcademicTestProject" project SET "cycleId" = cycle."id"
FROM "AcademicTestCycle" cycle
WHERE project."cycleId" IS NULL AND cycle."academicTestItemId" = project."academicTestItemId" AND cycle."branchBatchId" = project."branchBatchId";
UPDATE "AcademicScheduledTest" scheduled SET "cycleId" = cycle."id"
FROM "AcademicTestCycle" cycle
WHERE scheduled."cycleId" IS NULL AND cycle."academicTestItemId" = scheduled."academicTestItemId" AND cycle."branchBatchId" = scheduled."branchBatchId";
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTestCycle_academicTestItemId_branchBatchId_cycleNumber_key" ON "AcademicTestCycle"("academicTestItemId", "branchBatchId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "AcademicTestCycle_academicTestItemId_branchBatchId_status_idx" ON "AcademicTestCycle"("academicTestItemId", "branchBatchId", "status");
ALTER TABLE "AcademicTestCycle" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;
UPDATE "AcademicTestCycle" test_cycle
SET "batchCycleId" = batch_cycle."id"
FROM "BatchCycle" batch_cycle
WHERE test_cycle."batchCycleId" IS NULL
  AND batch_cycle."batchId" = test_cycle."branchBatchId"
  AND batch_cycle."cycleNumber" = test_cycle."cycleNumber";
CREATE INDEX IF NOT EXISTS "AcademicTestCycle_batchCycleId_idx" ON "AcademicTestCycle"("batchCycleId");

ALTER TABLE "ExamSchedule" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;
ALTER TABLE "FacultyReportShare" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;
UPDATE "ExamSchedule" schedule SET "batchCycleId" = cycle."id"
FROM "BatchCycle" cycle
WHERE schedule."batchCycleId" IS NULL AND cycle."batchId" = schedule."branchBatchId";
UPDATE "Assessment" assessment SET "batchCycleId" = cycle."id"
FROM "BatchCycle" cycle
WHERE assessment."batchCycleId" IS NULL AND cycle."batchId" = assessment."branchBatchId";
UPDATE "FacultyReportShare" share SET "batchCycleId" = cycle."id"
FROM "BatchCycle" cycle
WHERE share."batchCycleId" IS NULL AND cycle."batchId" = share."batchId";
CREATE INDEX IF NOT EXISTS "ExamSchedule_batchCycleId_idx" ON "ExamSchedule"("batchCycleId");
CREATE INDEX IF NOT EXISTS "Assessment_batchCycleId_idx" ON "Assessment"("batchCycleId");
CREATE INDEX IF NOT EXISTS "FacultyReportShare_batchCycleId_idx" ON "FacultyReportShare"("batchCycleId");

ALTER TABLE "BranchStudentCourse" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;

UPDATE "BranchStudentCourse" enrollment
SET "batchCycleId" = cycle."id"
FROM "BatchCycle" cycle
JOIN "BranchBatch" batch ON batch."id" = cycle."batchId"
WHERE enrollment."batchCycleId" IS NULL
  AND (
    enrollment."batchId" = batch."id"
    OR enrollment."batchId" = batch."batchId"
  )
  AND cycle."cycleNumber" = (
    SELECT MIN(first_cycle."cycleNumber")
    FROM "BatchCycle" first_cycle
    WHERE first_cycle."batchId" = cycle."batchId"
  );

CREATE INDEX IF NOT EXISTS "BranchStudentCourse_batchCycleId_idx"
  ON "BranchStudentCourse"("batchCycleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BranchStudentCourse_batchCycleId_fkey'
  ) THEN
    ALTER TABLE "BranchStudentCourse"
      ADD CONSTRAINT "BranchStudentCourse_batchCycleId_fkey"
      FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
