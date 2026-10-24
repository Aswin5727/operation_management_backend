ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "lastCallStatus" TEXT;

ALTER TABLE "LeadFollowUp"
  ADD COLUMN IF NOT EXISTS "callStatus" TEXT NOT NULL DEFAULT 'CONNECTED';

CREATE INDEX IF NOT EXISTS "LeadRecording_followUpId_idx"
  ON "LeadRecording"("followUpId");
