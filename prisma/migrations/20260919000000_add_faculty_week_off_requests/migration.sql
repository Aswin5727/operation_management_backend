CREATE TABLE "FacultyWeekOffRequest" (
  "id" TEXT NOT NULL,
  "facultyUserId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "facultyId" TEXT NOT NULL,
  "facultyName" TEXT NOT NULL,
  "facultyEmail" TEXT NOT NULL,
  "requestedWeekStartDate" TEXT NOT NULL,
  "requestedWeekEndDate" TEXT NOT NULL,
  "defaultWeekOffDay" TEXT NOT NULL,
  "defaultWeekOffDate" TEXT NOT NULL,
  "requestedWeekOffDay" TEXT NOT NULL,
  "requestedWeekOffDate" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectionReason" TEXT,
  CONSTRAINT "FacultyWeekOffRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FacultyWeekOffRequest_facultyId_requestedWeekStartDate_requestedWeekEndDate_key" ON "FacultyWeekOffRequest"("facultyId", "requestedWeekStartDate", "requestedWeekEndDate");
CREATE INDEX "FacultyWeekOffRequest_branchId_status_createdAt_idx" ON "FacultyWeekOffRequest"("branchId", "status", "createdAt");
CREATE INDEX "FacultyWeekOffRequest_facultyUserId_requestedWeekStartDate_idx" ON "FacultyWeekOffRequest"("facultyUserId", "requestedWeekStartDate");
CREATE INDEX "FacultyWeekOffRequest_facultyId_requestedWeekOffDate_idx" ON "FacultyWeekOffRequest"("facultyId", "requestedWeekOffDate");
