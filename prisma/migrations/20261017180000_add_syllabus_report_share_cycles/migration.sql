ALTER TABLE "FacultyReportShare" ADD COLUMN "batchCycleId" TEXT;

UPDATE "FacultyReportShare" AS share
SET "batchCycleId" = cycle."id"
FROM "BatchCycle" AS cycle
WHERE share."batchId" = cycle."batchId"
  AND cycle."cycleNumber" = 1
  AND share."batchCycleId" IS NULL;

CREATE INDEX "FacultyReportShare_batchCycleId_idx" ON "FacultyReportShare"("batchCycleId");
ALTER TABLE "FacultyReportShare" ADD CONSTRAINT "FacultyReportShare_batchCycleId_fkey" FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
