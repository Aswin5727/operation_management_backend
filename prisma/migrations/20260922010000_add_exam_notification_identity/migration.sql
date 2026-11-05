ALTER TABLE "public"."Notification"
  ADD COLUMN IF NOT EXISTS "examId" TEXT,
  ADD COLUMN IF NOT EXISTS "examScheduleId" TEXT,
  ADD COLUMN IF NOT EXISTS "batchId" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_targetUserId_examId_examScheduleId_idx"
  ON "public"."Notification"("targetUserId", "examId", "examScheduleId");
