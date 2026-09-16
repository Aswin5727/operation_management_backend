CREATE TABLE "FacultyAttendanceDay" (
  "id" TEXT NOT NULL,
  "facultyUserId" TEXT NOT NULL,
  "attendanceDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_LOGGED_IN',
  "firstLoginAt" TIMESTAMP(3),
  "finalLogoutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacultyAttendanceDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacultyAttendanceBatchWork" (
  "id" TEXT NOT NULL,
  "attendanceSessionId" TEXT NOT NULL,
  "facultyUserId" TEXT NOT NULL,
  "attendanceDate" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "workSummary" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacultyAttendanceBatchWork_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacultyAttendanceDay_facultyUserId_attendanceDate_key" ON "FacultyAttendanceDay"("facultyUserId", "attendanceDate");
CREATE INDEX "FacultyAttendanceDay_attendanceDate_status_idx" ON "FacultyAttendanceDay"("attendanceDate", "status");
CREATE UNIQUE INDEX "FacultyAttendanceBatchWork_attendanceSessionId_batchId_key" ON "FacultyAttendanceBatchWork"("attendanceSessionId", "batchId");
CREATE INDEX "FacultyAttendanceBatchWork_facultyUserId_attendanceDate_idx" ON "FacultyAttendanceBatchWork"("facultyUserId", "attendanceDate");
CREATE INDEX "FacultyAttendanceBatchWork_batchId_attendanceDate_idx" ON "FacultyAttendanceBatchWork"("batchId", "attendanceDate");

ALTER TABLE "FacultyAttendanceDay" ADD CONSTRAINT "FacultyAttendanceDay_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacultyAttendanceBatchWork" ADD CONSTRAINT "FacultyAttendanceBatchWork_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "FacultyAttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacultyAttendanceBatchWork" ADD CONSTRAINT "FacultyAttendanceBatchWork_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
