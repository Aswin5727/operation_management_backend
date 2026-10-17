CREATE TABLE "AcademicTestCycle" (
  "id" TEXT NOT NULL, "academicTestItemId" TEXT NOT NULL, "branchBatchId" TEXT NOT NULL,
  "cycleNumber" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicTestCycle_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AcademicQuestionPaper" ADD COLUMN "cycleId" TEXT;
ALTER TABLE "AcademicTestProject" ADD COLUMN "cycleId" TEXT;
ALTER TABLE "AcademicScheduledTest" ADD COLUMN "cycleId" TEXT;
INSERT INTO "AcademicTestCycle" ("id","academicTestItemId","branchBatchId","cycleNumber","createdBy")
SELECT 'cycle_' || "academicTestItemId" || '_' || "branchBatchId", "academicTestItemId", "branchBatchId", 1, MIN("createdBy") FROM "AcademicQuestionPaper" GROUP BY "academicTestItemId","branchBatchId";
INSERT INTO "AcademicTestCycle" ("id","academicTestItemId","branchBatchId","cycleNumber","createdBy")
SELECT 'cycle_' || s."academicTestItemId" || '_' || s."branchBatchId", s."academicTestItemId", s."branchBatchId", 1, MIN(s."createdBy") FROM "AcademicScheduledTest" s WHERE NOT EXISTS (SELECT 1 FROM "AcademicTestCycle" c WHERE c."academicTestItemId"=s."academicTestItemId" AND c."branchBatchId"=s."branchBatchId") GROUP BY s."academicTestItemId", s."branchBatchId";
INSERT INTO "AcademicTestCycle" ("id","academicTestItemId","branchBatchId","cycleNumber","createdBy")
SELECT 'cycle_' || i."id" || '_' || b."branchBatchId", i."id", b."branchBatchId", 1, 'system' FROM "AcademicTestItem" i JOIN "AcademicTestBatch" b ON b."academicTestId"=i."academicTestId" WHERE NOT EXISTS (SELECT 1 FROM "AcademicTestCycle" c WHERE c."academicTestItemId"=i."id" AND c."branchBatchId"=b."branchBatchId");
UPDATE "AcademicQuestionPaper" p SET "cycleId"=c."id" FROM "AcademicTestCycle" c WHERE c."academicTestItemId"=p."academicTestItemId" AND c."branchBatchId"=p."branchBatchId";
UPDATE "AcademicTestProject" p SET "cycleId"=c."id" FROM "AcademicTestCycle" c WHERE c."academicTestItemId"=p."academicTestItemId" AND c."branchBatchId"=p."branchBatchId";
UPDATE "AcademicScheduledTest" s SET "cycleId"=c."id" FROM "AcademicTestCycle" c WHERE c."academicTestItemId"=s."academicTestItemId" AND c."branchBatchId"=s."branchBatchId";
ALTER TABLE "AcademicQuestionPaper" ALTER COLUMN "cycleId" SET NOT NULL;
ALTER TABLE "AcademicTestProject" ALTER COLUMN "cycleId" SET NOT NULL;
ALTER TABLE "AcademicScheduledTest" ALTER COLUMN "cycleId" SET NOT NULL;
DROP INDEX "AcademicQuestionPaper_academicTestItemId_branchBatchId_key";
DROP INDEX "AcademicTestProject_academicTestItemId_branchBatchId_key";
DROP INDEX "AcademicScheduledTest_academicTestItemId_branchBatchId_key";
CREATE UNIQUE INDEX "AcademicQuestionPaper_academicTestItemId_branchBatchId_cycleId_key" ON "AcademicQuestionPaper"("academicTestItemId","branchBatchId","cycleId");
CREATE UNIQUE INDEX "AcademicTestProject_academicTestItemId_branchBatchId_cycleId_key" ON "AcademicTestProject"("academicTestItemId","branchBatchId","cycleId");
CREATE UNIQUE INDEX "AcademicScheduledTest_academicTestItemId_branchBatchId_cycleId_key" ON "AcademicScheduledTest"("academicTestItemId","branchBatchId","cycleId");
CREATE UNIQUE INDEX "AcademicTestCycle_academicTestItemId_branchBatchId_cycleNumber_key" ON "AcademicTestCycle"("academicTestItemId","branchBatchId","cycleNumber");
CREATE INDEX "AcademicTestCycle_academicTestItemId_branchBatchId_status_idx" ON "AcademicTestCycle"("academicTestItemId","branchBatchId","status");
ALTER TABLE "AcademicTestCycle" ADD CONSTRAINT "AcademicTestCycle_academicTestItemId_fkey" FOREIGN KEY ("academicTestItemId") REFERENCES "AcademicTestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestCycle" ADD CONSTRAINT "AcademicTestCycle_branchBatchId_fkey" FOREIGN KEY ("branchBatchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicQuestionPaper" ADD CONSTRAINT "AcademicQuestionPaper_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AcademicTestCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestProject" ADD CONSTRAINT "AcademicTestProject_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AcademicTestCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicScheduledTest" ADD CONSTRAINT "AcademicScheduledTest_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AcademicTestCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
