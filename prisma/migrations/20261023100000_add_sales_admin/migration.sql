ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SALES_ADMIN';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;

CREATE TABLE "SalesAdminBranch" (
  "id" TEXT NOT NULL,
  "salesAdminId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesAdminBranch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesAdminBranch_salesAdminId_branchId_key" ON "SalesAdminBranch"("salesAdminId", "branchId");
CREATE INDEX "SalesAdminBranch_salesAdminId_idx" ON "SalesAdminBranch"("salesAdminId");
CREATE INDEX "SalesAdminBranch_branchId_idx" ON "SalesAdminBranch"("branchId");
ALTER TABLE "SalesAdminBranch" ADD CONSTRAINT "SalesAdminBranch_salesAdminId_fkey" FOREIGN KEY ("salesAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesAdminBranch" ADD CONSTRAINT "SalesAdminBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
