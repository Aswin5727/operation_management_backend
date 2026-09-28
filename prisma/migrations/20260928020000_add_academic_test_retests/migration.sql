ALTER TABLE "AcademicScheduledTest"
  ADD COLUMN "isRetest" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "originalScheduleId" TEXT,
  ADD COLUMN "retestStudentId" TEXT;

CREATE INDEX "AcademicScheduledTest_originalScheduleId_retestStudentId_idx"
  ON "AcademicScheduledTest"("originalScheduleId", "retestStudentId");
