ALTER TABLE "ExamSchedule" ADD COLUMN "batchCycleId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN "batchCycleId" TEXT;

UPDATE "ExamSchedule" AS schedule
SET "batchCycleId" = cycle."id"
FROM "BatchCycle" AS cycle
WHERE schedule."branchBatchId" = cycle."batchId"
  AND cycle."cycleNumber" = 1
  AND schedule."batchCycleId" IS NULL;

UPDATE "Assessment" AS assessment
SET "batchCycleId" = cycle."id"
FROM "BatchCycle" AS cycle
WHERE assessment."branchBatchId" = cycle."batchId"
  AND cycle."cycleNumber" = 1
  AND assessment."batchCycleId" IS NULL;

CREATE INDEX "ExamSchedule_batchCycleId_idx" ON "ExamSchedule"("batchCycleId");
CREATE INDEX "Assessment_batchCycleId_idx" ON "Assessment"("batchCycleId");
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_batchCycleId_fkey" FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_batchCycleId_fkey" FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
