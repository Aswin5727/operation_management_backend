DROP INDEX IF EXISTS "Lead_leadId_key";
CREATE UNIQUE INDEX "Lead_branchId_leadId_key" ON "Lead"("branchId", "leadId");