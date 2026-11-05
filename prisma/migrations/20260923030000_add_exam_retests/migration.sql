ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'EXAM_RETEST_ASSIGNED';

ALTER TABLE "Exam"
  ADD COLUMN "isRetest" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "originalTestId" TEXT,
  ADD COLUMN "retestStudentId" TEXT;

CREATE INDEX "Exam_originalTestId_idx" ON "Exam"("originalTestId");
CREATE INDEX "Exam_retestStudentId_idx" ON "Exam"("retestStudentId");
CREATE INDEX "Exam_isRetest_retestStudentId_idx" ON "Exam"("isRetest", "retestStudentId");

ALTER TABLE "Exam"
  ADD CONSTRAINT "Exam_originalTestId_fkey"
  FOREIGN KEY ("originalTestId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Exam"
  ADD CONSTRAINT "Exam_retestStudentId_fkey"
  FOREIGN KEY ("retestStudentId") REFERENCES "BranchStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
