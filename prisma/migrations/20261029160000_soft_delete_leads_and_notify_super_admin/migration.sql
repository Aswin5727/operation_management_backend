ALTER TYPE "NotificationKind" ADD VALUE 'LEAD_DELETED';

ALTER TABLE "Lead"
  ADD COLUMN "deletedById" TEXT,
  ADD COLUMN "deletedByName" TEXT,
  ADD COLUMN "deletedByRole" TEXT;

CREATE INDEX "Lead_deletedAt_branchId_idx" ON "Lead"("deletedAt", "branchId");
