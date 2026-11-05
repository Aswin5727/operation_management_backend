CREATE TABLE "SalesCrmReportSubmission" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "salesAdminId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "branchId" TEXT,
    "reportName" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "fromDate" TEXT NOT NULL,
    "toDate" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileFormat" TEXT NOT NULL DEFAULT 'xlsx',
    "fileData" BYTEA NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "viewedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCrmReportSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesCrmReportSubmission_idempotencyKey_key" ON "SalesCrmReportSubmission"("idempotencyKey");
CREATE INDEX "SalesCrmReportSubmission_salesAdminId_createdAt_idx" ON "SalesCrmReportSubmission"("salesAdminId", "createdAt");
CREATE INDEX "SalesCrmReportSubmission_submittedById_createdAt_idx" ON "SalesCrmReportSubmission"("submittedById", "createdAt");
CREATE INDEX "SalesCrmReportSubmission_branchId_createdAt_idx" ON "SalesCrmReportSubmission"("branchId", "createdAt");
CREATE INDEX "SalesCrmReportSubmission_status_createdAt_idx" ON "SalesCrmReportSubmission"("status", "createdAt");
