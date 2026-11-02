-- Attendance is unique per student, date, course, and batch.
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "branchStudentId", "attendanceDate", "courseId", "batchId"
    ORDER BY "markedAt" DESC, "updatedAt" DESC, "createdAt" DESC, id DESC
  ) AS row_number
  FROM "BranchStudentAttendance"
)
DELETE FROM "BranchStudentAttendance" attendance
USING duplicates
WHERE attendance.id = duplicates.id AND duplicates.row_number > 1;

DROP INDEX IF EXISTS "BranchStudentAttendance_branchStudentId_attendanceDate_courseId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "BranchStudentAttendance_branchStudentId_attendanceDate_courseId_batchId_key"
  ON "BranchStudentAttendance"("branchStudentId", "attendanceDate", "courseId", "batchId");
