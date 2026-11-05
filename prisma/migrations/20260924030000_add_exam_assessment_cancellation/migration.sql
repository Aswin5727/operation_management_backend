-- Persist cancellation state and audit metadata for tests and assessments.
ALTER TABLE "Assessment"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledBy" TEXT;

ALTER TABLE "Exam"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledBy" TEXT;

ALTER TYPE "NotificationKind" ADD VALUE 'EXAM_CANCELLED';
ALTER TYPE "NotificationKind" ADD VALUE 'ASSESSMENT_CANCELLED';

CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");
CREATE INDEX "Exam_status_idx" ON "Exam"("status");
