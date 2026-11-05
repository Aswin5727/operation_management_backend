-- The original AcademicTestItem migration created the base row but omitted
-- schedule fields that are part of the current Prisma model.
ALTER TABLE "AcademicTestItem"
  ADD COLUMN IF NOT EXISTS "testDate" TEXT,
  ADD COLUMN IF NOT EXISTS "testStartTime" TEXT,
  ADD COLUMN IF NOT EXISTS "testEndTime" TEXT,
  ADD COLUMN IF NOT EXISTS "projectStartDate" TEXT,
  ADD COLUMN IF NOT EXISTS "projectEndDate" TEXT;