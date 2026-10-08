CREATE TYPE "NotificationKind_new" AS ENUM (
  'ACADEMIC_TEST_CREATED',
  'INSTITUTE_LEAVE',
  'BRANCH_CREATED',
  'BRANCH_INVITATION_RESENT',
  'BRANCH_LOGIN',
  'BRANCH_FACULTY_LOGIN',
  'FACULTY_COURSE_ASSIGNED',
  'COURSE_EDIT_REQUEST',
  'COURSE_EDIT_REQUEST_ACCEPTED',
  'COURSE_EDIT_REQUEST_REJECTED',
  'COURSE_EDIT_MODULE_UPDATED',
  'FACULTY_LEAVE_REQUEST',
  'EXAM_SCHEDULED',
  'ASSESSMENT_AVAILABLE',
  'FACULTY_REPORT_SHARED',
  'EXAM_RETEST_ASSIGNED',
  'ASSESSMENT_REASSESSMENT_ASSIGNED',
  'EXAM_CANCELLED',
  'ASSESSMENT_CANCELLED',
  'STUDENT_MOTIVATION',
  'STUDENT_DISCOUNT_APPLIED',
  'SEQUENTIAL_COURSE_SCHEDULING_REQUIRED'
);

ALTER TABLE "Notification" ALTER COLUMN "kind" TYPE "NotificationKind_new"
  USING ("kind"::text::"NotificationKind_new");
ALTER TYPE "NotificationKind" RENAME TO "NotificationKind_old";
ALTER TYPE "NotificationKind_new" RENAME TO "NotificationKind";
DROP TYPE "NotificationKind_old";

CREATE TABLE "MotivationMailHistory" (
  "id" TEXT NOT NULL,
  "branchStudentId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "absenceStartDate" TEXT NOT NULL,
  "absenceWorkingDays" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MotivationMailHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MotivationMailHistory"
  ADD CONSTRAINT "MotivationMailHistory_branchStudentId_fkey"
  FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MotivationMailHistory_branchStudentId_absenceStartDate_stage_key"
  ON "MotivationMailHistory"("branchStudentId", "absenceStartDate", "stage");
CREATE INDEX "MotivationMailHistory_branchId_status_sentAt_idx"
  ON "MotivationMailHistory"("branchId", "status", "sentAt");
CREATE INDEX "MotivationMailHistory_branchStudentId_absenceStartDate_idx"
  ON "MotivationMailHistory"("branchStudentId", "absenceStartDate");
