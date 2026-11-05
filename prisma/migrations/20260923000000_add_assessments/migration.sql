ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'ASSESSMENT_AVAILABLE';

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "assessmentId" TEXT;
CREATE INDEX IF NOT EXISTS "Notification_targetUserId_assessmentId_idx" ON "Notification"("targetUserId", "assessmentId");

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL,
  "assessmentName" TEXT NOT NULL,
  "branchCourseId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "branchBatchId" TEXT NOT NULL,
  "totalMarks" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "details" TEXT,
  "facultyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Assessment_facultyId_createdAt_idx" ON "Assessment"("facultyId", "createdAt");
CREATE INDEX "Assessment_branchBatchId_startDate_endDate_idx" ON "Assessment"("branchBatchId", "startDate", "endDate");
CREATE INDEX "Assessment_branchCourseId_moduleId_idx" ON "Assessment"("branchCourseId", "moduleId");
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BranchCourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_branchBatchId_fkey" FOREIGN KEY ("branchBatchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AssessmentSubmission" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "branchStudentId" TEXT NOT NULL,
  "response" TEXT,
  "submittedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
  "marksObtained" INTEGER,
  "feedback" TEXT,
  "evaluatedBy" TEXT,
  "evaluatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentSubmission_assessmentId_branchStudentId_key" ON "AssessmentSubmission"("assessmentId", "branchStudentId");
CREATE INDEX "AssessmentSubmission_assessmentId_status_idx" ON "AssessmentSubmission"("assessmentId", "status");
CREATE INDEX "AssessmentSubmission_branchStudentId_idx" ON "AssessmentSubmission"("branchStudentId");
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_branchStudentId_fkey" FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_evaluatedBy_fkey" FOREIGN KEY ("evaluatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
