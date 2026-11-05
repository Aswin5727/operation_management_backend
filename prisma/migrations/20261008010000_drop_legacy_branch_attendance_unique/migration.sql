-- Branch student attendance is unique per student, date, and course.
-- Remove the legacy student/date-only index, which rejects attendance for a
-- second course on the same day even though the Prisma schema is course-scoped.
DROP INDEX IF EXISTS "BranchStudentAttendance_branchStudentId_attendanceDate_key";
