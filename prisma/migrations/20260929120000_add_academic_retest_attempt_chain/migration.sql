ALTER TABLE "AcademicScheduledTest"
  ADD COLUMN "parentScheduleId" TEXT,
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "AcademicScheduledTest_parentScheduleId_idx"
  ON "AcademicScheduledTest"("parentScheduleId");
