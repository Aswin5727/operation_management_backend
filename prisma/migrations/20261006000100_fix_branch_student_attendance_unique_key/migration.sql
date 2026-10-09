-- The Prisma schema upserts BranchStudentAttendance by
-- (branchStudentId, attendanceDate). Older databases used an incompatible
-- three-column unique index that PostgreSQL cannot use for that upsert.
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "branchStudentId", "attendanceDate"
      ORDER BY "markedAt" DESC, "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS row_number
  FROM "BranchStudentAttendance"
)
DELETE FROM "BranchStudentAttendance" attendance
USING duplicates
WHERE attendance.id = duplicates.id
  AND duplicates.row_number > 1;

DROP INDEX IF EXISTS "BranchStudentAttendance_branchStudentId_attendanceDate_courseId";

CREATE UNIQUE INDEX IF NOT EXISTS "BranchStudentAttendance_branchStudentId_attendanceDate_key"
  ON "BranchStudentAttendance"("branchStudentId", "attendanceDate");