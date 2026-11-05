ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "classSchedule" TEXT,
  ADD COLUMN IF NOT EXISTS "courseMode" TEXT;

CREATE INDEX IF NOT EXISTS "Lead_classSchedule_idx" ON "Lead"("classSchedule");
CREATE INDEX IF NOT EXISTS "Lead_courseMode_idx" ON "Lead"("courseMode");
