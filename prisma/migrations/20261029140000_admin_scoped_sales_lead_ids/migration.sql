DROP INDEX IF EXISTS "Lead_branchId_leadId_key";
CREATE UNIQUE INDEX "Lead_createdById_leadId_key" ON "Lead"("createdById", "leadId");
CREATE INDEX "Lead_createdById_createdAt_idx" ON "Lead"("createdById", "createdAt");

CREATE TABLE "LeadIdSequence" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeadIdSequence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeadIdSequence_ownerId_key" UNIQUE ("ownerId"),
    CONSTRAINT "LeadIdSequence_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
