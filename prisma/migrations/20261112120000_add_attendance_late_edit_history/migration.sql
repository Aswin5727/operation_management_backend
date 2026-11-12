ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'LATE';
ALTER TABLE "BranchStudentAttendance"
  ADD COLUMN IF NOT EXISTS "lateReason" TEXT,
  ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "editedByUserId" TEXT;
CREATE TABLE IF NOT EXISTS "BranchStudentAttendanceEdit" (
  "id" TEXT NOT NULL,
  "attendanceId" TEXT,
  "branchStudentId" TEXT NOT NULL,
  "studentId" TEXT,
  "studentName" TEXT,
  "courseId" TEXT,
  "courseName" TEXT,
  "batchId" TEXT,
  "batchName" TEXT,
  "batchTiming" TEXT,
  "attendanceDate" TEXT NOT NULL,
  "previousStatus" TEXT NOT NULL,
  "updatedStatus" TEXT NOT NULL,
  "attendanceType" TEXT NOT NULL,
  "lateReason" TEXT,
  "editedByUserId" TEXT,
  "editedByName" TEXT,
  "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editReason" TEXT NOT NULL,
  CONSTRAINT "BranchStudentAttendanceEdit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BranchStudentAttendanceEdit_branchStudentId_attendanceDate_idx" ON "BranchStudentAttendanceEdit" ("branchStudentId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "BranchStudentAttendanceEdit_attendanceDate_batchId_idx" ON "BranchStudentAttendanceEdit" ("attendanceDate", "batchId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchStudentAttendanceEdit_branchStudentId_fkey') THEN
    ALTER TABLE "BranchStudentAttendanceEdit" ADD CONSTRAINT "BranchStudentAttendanceEdit_branchStudentId_fkey" FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
