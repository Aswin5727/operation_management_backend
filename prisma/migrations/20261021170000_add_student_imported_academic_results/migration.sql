ALTER TABLE "BranchStudent"
ADD COLUMN IF NOT EXISTS "importedAcademicResults" JSONB;
