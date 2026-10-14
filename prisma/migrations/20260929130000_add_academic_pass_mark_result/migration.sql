ALTER TABLE "AcademicQuestionPaper"
  ADD COLUMN IF NOT EXISTS "passMark" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AcademicTestSubmission"
  ADD COLUMN IF NOT EXISTS "resultStatus" TEXT;
