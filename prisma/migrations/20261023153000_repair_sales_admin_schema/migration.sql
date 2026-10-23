ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;

CREATE TABLE IF NOT EXISTS "SalesAdminBranch" (
  "id" TEXT NOT NULL,
  "salesAdminId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesAdminBranch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SalesAdminBranch_salesAdminId_branchId_key"
  ON "SalesAdminBranch"("salesAdminId", "branchId");
CREATE INDEX IF NOT EXISTS "SalesAdminBranch_salesAdminId_idx"
  ON "SalesAdminBranch"("salesAdminId");
CREATE INDEX IF NOT EXISTS "SalesAdminBranch_branchId_idx"
  ON "SalesAdminBranch"("branchId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesAdminBranch_salesAdminId_fkey') THEN
    ALTER TABLE "SalesAdminBranch"
      ADD CONSTRAINT "SalesAdminBranch_salesAdminId_fkey"
      FOREIGN KEY ("salesAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesAdminBranch_branchId_fkey') THEN
    ALTER TABLE "SalesAdminBranch"
      ADD CONSTRAINT "SalesAdminBranch_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
