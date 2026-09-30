ALTER TABLE "FacultyReportShare"
  ADD COLUMN IF NOT EXISTS "academicTestIds" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "reportType" TEXT NOT NULL DEFAULT 'MODULE';

CREATE INDEX IF NOT EXISTS "FacultyReportShare_reportType_branchId_sentAt_idx"
  ON "FacultyReportShare" ("reportType", "branchId", "sentAt");
