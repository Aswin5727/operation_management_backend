ALTER TYPE "public"."NotificationKind" ADD VALUE IF NOT EXISTS 'ACCOUNT_ROLE_UPDATED';
ALTER TYPE "public"."NotificationKind" ADD VALUE IF NOT EXISTS 'EMAIL_CHANGED';
ALTER TYPE "public"."NotificationKind" ADD VALUE IF NOT EXISTS 'BRANCH_ADMIN_REPLACED';

CREATE TABLE "EmailChangeVerification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "oldEmail" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailChangeVerification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailChangeVerification_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "EmailChangeVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EmailChangeVerification_userId_expiresAt_idx" ON "EmailChangeVerification"("userId", "expiresAt");
CREATE INDEX "EmailChangeVerification_newEmail_idx" ON "EmailChangeVerification"("newEmail");

CREATE TABLE "AdminChangeHistory" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "previousAdminId" TEXT,
  "newAdminId" TEXT,
  "previousAccountType" TEXT,
  "newAccountType" TEXT,
  "oldEmail" TEXT,
  "newEmail" TEXT,
  "changedBy" TEXT,
  "operationType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminChangeHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminChangeHistory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AdminChangeHistory_previousAdminId_fkey" FOREIGN KEY ("previousAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdminChangeHistory_newAdminId_fkey" FOREIGN KEY ("newAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdminChangeHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AdminChangeHistory_branchId_createdAt_idx" ON "AdminChangeHistory"("branchId", "createdAt");
CREATE INDEX "AdminChangeHistory_previousAdminId_idx" ON "AdminChangeHistory"("previousAdminId");
CREATE INDEX "AdminChangeHistory_newAdminId_idx" ON "AdminChangeHistory"("newAdminId");
