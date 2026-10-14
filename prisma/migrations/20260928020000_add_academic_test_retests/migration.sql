CREATE TABLE IF NOT EXISTS "AcademicScheduledTest" (
  "id" TEXT NOT NULL,
  "academicTestItemId" TEXT NOT NULL,
  "branchCourseId" TEXT NOT NULL,
  "branchBatchId" TEXT NOT NULL,
  "facultyId" TEXT NOT NULL,
  "questionPaperId" TEXT NOT NULL,
  "testNumber" INTEGER NOT NULL,
  "testDate" TEXT,
  "startTime" TEXT,
  "endTime" TEXT,
  "projectStartDate" TEXT,
  "projectEndDate" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicScheduledTest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicScheduledTest_academicTestItemId_branchBatchId_key"
  ON "AcademicScheduledTest"("academicTestItemId", "branchBatchId");
CREATE INDEX IF NOT EXISTS "AcademicScheduledTest_branchBatchId_testDate_idx"
  ON "AcademicScheduledTest"("branchBatchId", "testDate");
CREATE INDEX IF NOT EXISTS "AcademicScheduledTest_facultyId_idx"
  ON "AcademicScheduledTest"("facultyId");
CREATE INDEX IF NOT EXISTS "AcademicScheduledTest_questionPaperId_idx"
  ON "AcademicScheduledTest"("questionPaperId");
ALTER TABLE "AcademicScheduledTest"
  ADD COLUMN "isRetest" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "originalScheduleId" TEXT,
  ADD COLUMN "retestStudentId" TEXT;

CREATE INDEX "AcademicScheduledTest_originalScheduleId_retestStudentId_idx"
  ON "AcademicScheduledTest"("originalScheduleId", "retestStudentId");
