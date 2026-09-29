ALTER TABLE "AcademicQuestionPaper"
  ADD COLUMN "passMark" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AcademicTestSubmission"
  ADD COLUMN "resultStatus" TEXT;
