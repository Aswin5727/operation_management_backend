ALTER TYPE "DiscontinuationRequestStatus" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN_WAIT';

ALTER TABLE "StudentDiscontinuationRequest"
  ADD COLUMN IF NOT EXISTS "contactAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "installmentOverdueCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextInstallmentDueDate" TEXT,
  ADD COLUMN IF NOT EXISTS "contactHistory" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "escalationReason" TEXT;