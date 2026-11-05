DROP INDEX IF EXISTS "BranchStudentAttendance_branchStudentId_attendanceDate_key";

CREATE UNIQUE INDEX "BranchStudentAttendance_branchStudentId_attendanceDate_courseId_key"
ON "BranchStudentAttendance"("branchStudentId", "attendanceDate", "courseId");

ALTER TABLE "BranchStudentCourse"
ADD COLUMN "courseProgress" INTEGER,
ADD COLUMN "courseCompletedAt" TIMESTAMP(3);
