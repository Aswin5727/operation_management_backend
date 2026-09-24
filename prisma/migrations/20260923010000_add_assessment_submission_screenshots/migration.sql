ALTER TABLE "AssessmentSubmission"
  ADD COLUMN "screenshotUrl" TEXT,
  ADD COLUMN "screenshotFileName" TEXT,
  ADD COLUMN "screenshotMimeType" TEXT,
  ADD COLUMN "evaluationStatus" TEXT NOT NULL DEFAULT 'Pending';

UPDATE "AssessmentSubmission"
SET "evaluationStatus" = CASE WHEN "status" = 'EVALUATED' THEN 'Evaluated' ELSE 'Pending' END;
