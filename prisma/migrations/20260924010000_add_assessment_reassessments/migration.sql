ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'ASSESSMENT_REASSESSMENT_ASSIGNED';

ALTER TABLE "Assessment"
  ADD COLUMN "isReassessment" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "originalAssessmentId" TEXT,
  ADD COLUMN "reassessmentStudentId" TEXT;

CREATE INDEX "Assessment_originalAssessmentId_idx" ON "Assessment"("originalAssessmentId");
CREATE INDEX "Assessment_reassessmentStudentId_idx" ON "Assessment"("reassessmentStudentId");
CREATE INDEX "Assessment_isReassessment_reassessmentStudentId_idx" ON "Assessment"("isReassessment", "reassessmentStudentId");

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_originalAssessmentId_fkey"
  FOREIGN KEY ("originalAssessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_reassessmentStudentId_fkey"
  FOREIGN KEY ("reassessmentStudentId") REFERENCES "BranchStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
