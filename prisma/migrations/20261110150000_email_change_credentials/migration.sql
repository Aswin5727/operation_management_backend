ALTER TABLE "EmailChangeVerification"
ADD COLUMN IF NOT EXISTS "temporaryPasswordHash" TEXT;
