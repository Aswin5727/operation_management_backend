-- The academic test cycle migration was marked applied after the unique
-- question-paper index failed to materialize in the target database.
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicQuestionPaper_academicTestItemId_branchBatchId_cycleId_key"
  ON "AcademicQuestionPaper"("academicTestItemId", "branchBatchId", "cycleId");
