-- Repair the constraint required by StudentAttendance.upsert.
-- The Prisma schema already declares @@unique([studentId, attendanceDate]),
-- but some databases were created without the corresponding index.
CREATE UNIQUE INDEX IF NOT EXISTS "StudentAttendance_studentId_attendanceDate_key"
ON "StudentAttendance"("studentId", "attendanceDate");

-- Branch faculty attendance uses this course-scoped composite key.
CREATE UNIQUE INDEX IF NOT EXISTS "BranchStudentAttendance_branchStudentId_attendanceDate_courseId_key"
ON "BranchStudentAttendance"("branchStudentId", "attendanceDate", "courseId");
