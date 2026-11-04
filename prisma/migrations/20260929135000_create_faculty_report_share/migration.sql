-- The baseline migration omitted this legacy table, but the following
-- academic report-sharing migrations expect it to exist.
-- Keep this repair idempotent so databases that already contain the table
-- can safely run the migration history as well.
CREATE TABLE IF NOT EXISTS "FacultyReportShare" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "testModuleIds" JSONB NOT NULL DEFAULT '[]',
    "assessmentModuleIds" JSONB NOT NULL DEFAULT '[]',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyReportShare_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FacultyReportShare_branchId_sentAt_idx"
  ON "FacultyReportShare"("branchId", "sentAt");

CREATE INDEX IF NOT EXISTS "FacultyReportShare_facultyId_sentAt_idx"
  ON "FacultyReportShare"("facultyId", "sentAt");

CREATE INDEX IF NOT EXISTS "FacultyReportShare_batchId_courseId_idx"
  ON "FacultyReportShare"("batchId", "courseId");
