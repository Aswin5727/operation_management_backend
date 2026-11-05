ALTER TABLE "AcademicTestBatch"
  ADD COLUMN IF NOT EXISTS "configuration" JSONB NOT NULL DEFAULT '[]'::jsonb;
