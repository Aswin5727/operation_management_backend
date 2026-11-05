ALTER TABLE "BranchStudentCourse"
ADD COLUMN IF NOT EXISTS "importedAcademicResults" JSONB;
