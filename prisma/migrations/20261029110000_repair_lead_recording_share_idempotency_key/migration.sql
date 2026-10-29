ALTER TABLE "LeadRecordingShare"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

UPDATE "LeadRecordingShare"
SET "idempotencyKey" = 'legacy-' || "id"
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "LeadRecordingShare"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "LeadRecordingShare_idempotencyKey_key"
  ON "LeadRecordingShare"("idempotencyKey");