CREATE TABLE "CompletedStudentImportJob" (
  "id" TEXT NOT NULL,
  "uploadId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdBy" TEXT,
  "fileName" TEXT,
  "fileHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "readyRows" INTEGER NOT NULL DEFAULT 0,
  "processedRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "batchSize" INTEGER NOT NULL DEFAULT 50,
  "allowMissingContact" BOOLEAN NOT NULL DEFAULT false,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompletedStudentImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompletedStudentImportRow" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "errors" JSONB,
  "warnings" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "importedId" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompletedStudentImportRow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompletedStudentImportRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CompletedStudentImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompletedStudentImportJob_uploadId_key" ON "CompletedStudentImportJob"("uploadId");
CREATE INDEX "CompletedStudentImportJob_branchId_status_idx" ON "CompletedStudentImportJob"("branchId", "status");
CREATE INDEX "CompletedStudentImportJob_status_updatedAt_idx" ON "CompletedStudentImportJob"("status", "updatedAt");
CREATE UNIQUE INDEX "CompletedStudentImportRow_jobId_rowNumber_key" ON "CompletedStudentImportRow"("jobId", "rowNumber");
CREATE INDEX "CompletedStudentImportRow_jobId_status_idx" ON "CompletedStudentImportRow"("jobId", "status");
