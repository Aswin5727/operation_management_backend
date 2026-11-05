CREATE TABLE IF NOT EXISTS "AcademicTestReportHistory" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "batchCycleId" TEXT NOT NULL,
  "academicTestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicTestReportHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicTestReportHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE,
  CONSTRAINT "AcademicTestReportHistory_batchCycleId_fkey" FOREIGN KEY ("batchCycleId") REFERENCES "BatchCycle"("id") ON DELETE CASCADE,
  CONSTRAINT "AcademicTestReportHistory_academicTestId_fkey" FOREIGN KEY ("academicTestId") REFERENCES "AcademicTestItem"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTestReportHistory_batchCycleId_academicTestId_key" ON "AcademicTestReportHistory" ("batchCycleId", "academicTestId");
CREATE INDEX IF NOT EXISTS "AcademicTestReportHistory_batchId_updatedAt_idx" ON "AcademicTestReportHistory" ("batchId", "updatedAt");

CREATE TABLE IF NOT EXISTS "AcademicTestReportSubmission" (
  "id" TEXT NOT NULL,
  "historyId" TEXT NOT NULL,
  "facultyId" TEXT,
  "sourceShareId" TEXT,
  "scheduleId" TEXT,
  "reportData" JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicTestReportSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicTestReportSubmission_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "AcademicTestReportHistory"("id") ON DELETE CASCADE,
  CONSTRAINT "AcademicTestReportSubmission_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "AcademicTestReportSubmission_historyId_submittedAt_idx" ON "AcademicTestReportSubmission" ("historyId", "submittedAt");
CREATE INDEX IF NOT EXISTS "AcademicTestReportSubmission_facultyId_submittedAt_idx" ON "AcademicTestReportSubmission" ("facultyId", "submittedAt");
CREATE INDEX IF NOT EXISTS "AcademicTestReportSubmission_sourceShareId_idx" ON "AcademicTestReportSubmission" ("sourceShareId");
