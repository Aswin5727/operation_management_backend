ALTER TABLE "BranchCourse"
  ADD COLUMN "academicTestCount" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "AcademicTestType" AS ENUM ('TEST', 'PROJECT', 'TEST_AND_PROJECT');

CREATE TABLE "AcademicTest" (
  "id" TEXT NOT NULL,
  "branchCourseId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicTestItem" (
  "id" TEXT NOT NULL,
  "academicTestId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "testType" "AcademicTestType" NOT NULL,
  CONSTRAINT "AcademicTestItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicTestBatch" (
  "id" TEXT NOT NULL,
  "academicTestId" TEXT NOT NULL,
  "branchBatchId" TEXT NOT NULL,
  CONSTRAINT "AcademicTestBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicTest_branchCourseId_key" ON "AcademicTest"("branchCourseId");
CREATE INDEX "AcademicTest_createdBy_idx" ON "AcademicTest"("createdBy");
CREATE UNIQUE INDEX "AcademicTestItem_academicTestId_sequence_key" ON "AcademicTestItem"("academicTestId", "sequence");
CREATE INDEX "AcademicTestItem_academicTestId_idx" ON "AcademicTestItem"("academicTestId");
CREATE UNIQUE INDEX "AcademicTestBatch_academicTestId_branchBatchId_key" ON "AcademicTestBatch"("academicTestId", "branchBatchId");
CREATE INDEX "AcademicTestBatch_branchBatchId_idx" ON "AcademicTestBatch"("branchBatchId");

ALTER TABLE "AcademicTest" ADD CONSTRAINT "AcademicTest_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestItem" ADD CONSTRAINT "AcademicTestItem_academicTestId_fkey" FOREIGN KEY ("academicTestId") REFERENCES "AcademicTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestBatch" ADD CONSTRAINT "AcademicTestBatch_academicTestId_fkey" FOREIGN KEY ("academicTestId") REFERENCES "AcademicTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestBatch" ADD CONSTRAINT "AcademicTestBatch_branchBatchId_fkey" FOREIGN KEY ("branchBatchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
