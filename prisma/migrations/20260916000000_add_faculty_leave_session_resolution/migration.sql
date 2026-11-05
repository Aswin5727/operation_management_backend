CREATE TABLE IF NOT EXISTS "FacultyLeaveAffectedSession" (
  "id" TEXT NOT NULL,
  "leaveRequestId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "batchRecordId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "batchName" TEXT NOT NULL,
  "courseId" TEXT,
  "courseName" TEXT,
  "originalFacultyId" TEXT NOT NULL,
  "originalFacultyName" TEXT,
  "sessionDate" TEXT NOT NULL,
  "originalStartTime" TEXT NOT NULL,
  "originalEndTime" TEXT NOT NULL,
  "resolutionStatus" TEXT NOT NULL DEFAULT 'UNRESOLVED',
  "assignmentType" TEXT,
  "replacementFacultyId" TEXT,
  "replacementFacultyName" TEXT,
  "replacementStatus" TEXT,
  "combinedSessionId" TEXT,
  "rescheduledDate" TEXT,
  "rescheduledStartTime" TEXT,
  "rescheduledEndTime" TEXT,
  "resolutionReason" TEXT,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacultyLeaveAffectedSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FacultyLeaveRequest"
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "FacultyLeaveAffectedSession_leaveRequestId_batchRecordId_sessionDate_key" ON "FacultyLeaveAffectedSession"("leaveRequestId", "batchRecordId", "sessionDate");
CREATE INDEX IF NOT EXISTS "FacultyLeaveAffectedSession_branchId_resolutionStatus_idx" ON "FacultyLeaveAffectedSession"("branchId", "resolutionStatus");
CREATE INDEX IF NOT EXISTS "FacultyLeaveAffectedSession_leaveRequestId_resolutionStatus_idx" ON "FacultyLeaveAffectedSession"("leaveRequestId", "resolutionStatus");
CREATE INDEX IF NOT EXISTS "FacultyLeaveAffectedSession_batchRecordId_sessionDate_idx" ON "FacultyLeaveAffectedSession"("batchRecordId", "sessionDate");

CREATE TABLE IF NOT EXISTS "FacultyLeaveCombinedSession" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "sessionDate" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "courseId" TEXT,
  "courseName" TEXT,
  "facultyId" TEXT NOT NULL,
  "facultyName" TEXT,
  "mode" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacultyLeaveCombinedSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FacultyLeaveCombinedSession_branchId_sessionDate_startTime_endTime_facultyId_key" ON "FacultyLeaveCombinedSession"("branchId", "sessionDate", "startTime", "endTime", "facultyId");
CREATE INDEX IF NOT EXISTS "FacultyLeaveCombinedSession_branchId_sessionDate_idx" ON "FacultyLeaveCombinedSession"("branchId", "sessionDate");
