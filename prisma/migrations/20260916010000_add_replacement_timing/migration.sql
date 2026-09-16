ALTER TABLE "FacultyLeaveAffectedSession"
  ADD COLUMN IF NOT EXISTS "replacementDate" TEXT,
  ADD COLUMN IF NOT EXISTS "replacementStartTime" TEXT,
  ADD COLUMN IF NOT EXISTS "replacementEndTime" TEXT;
