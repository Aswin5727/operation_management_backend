DROP INDEX IF EXISTS "AcademicTest_branchCourseId_key";

CREATE INDEX IF NOT EXISTS "AcademicTest_branchCourseId_idx" ON "AcademicTest"("branchCourseId");
