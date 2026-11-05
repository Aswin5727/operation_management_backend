CREATE TYPE "SalesCrmBatchRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "SalesCrmBatchRequest" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "assignedToId" TEXT,
  "requestedMode" TEXT,
  "requestedSchedule" TEXT,
  "requestDetails" TEXT NOT NULL,
  "status" "SalesCrmBatchRequestStatus" NOT NULL DEFAULT 'PENDING',
  "activeKey" TEXT,
  "resolvedBatchId" TEXT,
  "statusUpdatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesCrmBatchRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesCrmBatchRequest_activeKey_key" ON "SalesCrmBatchRequest"("activeKey");
CREATE INDEX "SalesCrmBatchRequest_branchId_status_createdAt_idx" ON "SalesCrmBatchRequest"("branchId", "status", "createdAt");
CREATE INDEX "SalesCrmBatchRequest_requestedById_status_createdAt_idx" ON "SalesCrmBatchRequest"("requestedById", "status", "createdAt");
CREATE INDEX "SalesCrmBatchRequest_leadId_courseId_idx" ON "SalesCrmBatchRequest"("leadId", "courseId");

ALTER TABLE "SalesCrmBatchRequest" ADD CONSTRAINT "SalesCrmBatchRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCrmBatchRequest" ADD CONSTRAINT "SalesCrmBatchRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCrmBatchRequest" ADD CONSTRAINT "SalesCrmBatchRequest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "BranchCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesCrmBatchRequest" ADD CONSTRAINT "SalesCrmBatchRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesCrmBatchRequest" ADD CONSTRAINT "SalesCrmBatchRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesCrmBatchRequest" ADD CONSTRAINT "SalesCrmBatchRequest_resolvedBatchId_fkey" FOREIGN KEY ("resolvedBatchId") REFERENCES "BranchBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
