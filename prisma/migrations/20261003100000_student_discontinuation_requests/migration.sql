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
  'STUDENT_DISCONTINUATION',
  'STUDENT_DISCOUNT_APPLIED',
  'SEQUENTIAL_COURSE_SCHEDULING_REQUIRED'
);

ALTER TABLE "Notification" ALTER COLUMN "kind" TYPE "NotificationKind_new"
  USING ("kind"::text::"NotificationKind_new");
ALTER TYPE "NotificationKind" RENAME TO "NotificationKind_old";
ALTER TYPE "NotificationKind_new" RENAME TO "NotificationKind";
DROP TYPE "NotificationKind_old";

CREATE TYPE "DiscontinuationRequestStatus" AS ENUM (
  'PENDING',
  'SUPER_ADMIN_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "StudentDiscontinuationRequest" (
  "id" TEXT NOT NULL,
  "branchStudentId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "requestedByUserId" TEXT,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "DiscontinuationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "branchReviewedBy" TEXT,
  "branchReviewedAt" TIMESTAMP(3),
  "branchReviewNote" TEXT,
  "superAdminReviewedBy" TEXT,
  "superAdminReviewedAt" TIMESTAMP(3),
  "superAdminReviewNote" TEXT,
  "totalCourseFee" INTEGER NOT NULL DEFAULT 0,
  "totalPaid" INTEGER NOT NULL DEFAULT 0,
  "outstandingAmount" INTEGER NOT NULL DEFAULT 0,
  "refundEligibleAmount" INTEGER NOT NULL DEFAULT 0,
  "waiverAmount" INTEGER NOT NULL DEFAULT 0,
  "finalOutstandingAmount" INTEGER,
  "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "financeNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentDiscontinuationRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StudentDiscontinuationRequest"
  ADD CONSTRAINT "StudentDiscontinuationRequest_branchStudentId_fkey"
  FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "StudentDiscontinuationRequest_branchId_status_createdAt_idx"
  ON "StudentDiscontinuationRequest"("branchId", "status", "createdAt");
CREATE INDEX "StudentDiscontinuationRequest_branchStudentId_status_idx"
  ON "StudentDiscontinuationRequest"("branchStudentId", "status");
CREATE INDEX "StudentDiscontinuationRequest_requestedByUserId_status_idx"
  ON "StudentDiscontinuationRequest"("requestedByUserId", "status");
