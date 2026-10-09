-- StudentAttendance upsert requires a unique key for one student per date.
-- Older databases may have been created without the baseline index, and may
-- already contain duplicate rows. Keep the latest row before restoring it.
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "studentId", "attendanceDate"
      ORDER BY "markedAt" DESC, "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS row_number
  FROM "StudentAttendance"
)
DELETE FROM "StudentAttendance" attendance
USING duplicates
WHERE attendance.id = duplicates.id
  AND duplicates.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "StudentAttendance_studentId_attendanceDate_key"
  ON "StudentAttendance"("studentId", "attendanceDate");