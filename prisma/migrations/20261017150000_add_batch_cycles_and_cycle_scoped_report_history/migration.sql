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
  CONSTRAINT "BatchCycle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchCycle_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BatchCycle_batchId_cycleNumber_key" ON "BatchCycle" ("batchId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "BatchCycle_batchId_status_idx" ON "BatchCycle" ("batchId", "status");

INSERT INTO "BatchCycle" ("id", "batchId", "cycleNumber", "cycleName", "status", "createdAt", "updatedAt")
SELECT 'batch_cycle_' || md5(x."batchId" || ':' || x."cycleNumber"), x."batchId", x."cycleNumber", 'Cycle ' || x."cycleNumber",
  CASE WHEN bool_or(x."status" = 'ACTIVE') THEN 'ACTIVE' ELSE 'COMPLETED' END, MIN(x."createdAt"), MAX(x."updatedAt")
FROM (
  SELECT "branchBatchId" AS "batchId", "cycleNumber", "status", "createdAt", "createdAt" AS "updatedAt" FROM "AcademicTestCycle"
  UNION
  SELECT bb."id", 1, 'ACTIVE', bb."createdAt", bb."updatedAt" FROM "BranchBatch" bb
) x
GROUP BY x."batchId", x."cycleNumber"
ON CONFLICT ("batchId", "cycleNumber") DO NOTHING;

ALTER TABLE "AcademicTestCycle" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;
UPDATE "AcademicTestCycle" ac SET "batchCycleId" = bc."id"
FROM "BatchCycle" bc WHERE bc."batchId" = ac."branchBatchId" AND bc."cycleNumber" = ac."cycleNumber";
ALTER TABLE "AcademicTestCycle" ALTER COLUMN "batchCycleId" SET NOT NULL;
ALTER TABLE "AcademicTestCycle" ADD CONSTRAINT "AcademicTestCycle_batchCycleId_fkey" FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "AcademicTestCycle_batchCycleId_idx" ON "AcademicTestCycle" ("batchCycleId");

ALTER TABLE "BranchStudentCourse" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;
UPDATE "BranchStudentCourse" e SET "batchCycleId" = bc."id"
FROM "BatchCycle" bc, "BranchBatch" bb
WHERE bc."batchId" = bb."id" AND bc."cycleNumber" = 1 AND e."batchId" IN (bb."id", bb."batchId");
ALTER TABLE "BranchStudentCourse" ADD CONSTRAINT "BranchStudentCourse_batchCycleId_fkey" FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "BranchStudentCourse_batchCycleId_idx" ON "BranchStudentCourse" ("batchCycleId");

ALTER TABLE "AcademicTestReportHistory" ADD COLUMN IF NOT EXISTS "batchCycleId" TEXT;
UPDATE "AcademicTestReportHistory" h SET "batchCycleId" = bc."id"
FROM "AcademicTestReportSubmission" rs
JOIN "AcademicScheduledTest" st ON st."id" = rs."scheduleId"
JOIN "AcademicTestCycle" ac ON ac."id" = st."cycleId"
JOIN "BatchCycle" bc ON bc."id" = ac."batchCycleId"
WHERE rs."historyId" = h."id";
UPDATE "AcademicTestReportHistory" h SET "batchCycleId" = bc."id"
FROM "BatchCycle" bc
WHERE h."batchId" = bc."batchId" AND bc."cycleNumber" = 1 AND h."batchCycleId" IS NULL;
ALTER TABLE "AcademicTestReportHistory" ALTER COLUMN "batchCycleId" SET NOT NULL;
ALTER TABLE "AcademicTestReportHistory" ADD CONSTRAINT "AcademicTestReportHistory_batchCycleId_fkey" FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "AcademicTestReportHistory_batchId_academicTestId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTestReportHistory_batchCycleId_academicTestId_key" ON "AcademicTestReportHistory" ("batchCycleId", "academicTestId");
