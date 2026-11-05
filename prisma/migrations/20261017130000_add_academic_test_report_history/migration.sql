CREATE TABLE IF NOT EXISTS "AcademicTestReportHistory" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "academicTestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicTestReportHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AcademicTestReportHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademicTestReportHistory_academicTestId_fkey" FOREIGN KEY ("academicTestId") REFERENCES "AcademicTestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTestReportHistory_batchId_academicTestId_key" ON "AcademicTestReportHistory" ("batchId", "academicTestId");
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
  CONSTRAINT "AcademicTestReportSubmission_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "AcademicTestReportHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AcademicTestReportSubmission_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AcademicTestReportSubmission_historyId_submittedAt_idx" ON "AcademicTestReportSubmission" ("historyId", "submittedAt");
CREATE INDEX IF NOT EXISTS "AcademicTestReportSubmission_facultyId_submittedAt_idx" ON "AcademicTestReportSubmission" ("facultyId", "submittedAt");
CREATE INDEX IF NOT EXISTS "AcademicTestReportSubmission_sourceShareId_idx" ON "AcademicTestReportSubmission" ("sourceShareId");

INSERT INTO "AcademicTestReportHistory" ("id", "batchId", "academicTestId", "createdAt", "updatedAt")
SELECT 'legacy_history_' || md5(s."batchId" || ':' || st."academicTestItemId"), s."batchId", st."academicTestItemId", MIN(s."createdAt"), MAX(s."updatedAt")
FROM "FacultyReportShare" s
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(s."academicTestIds") = 'array' THEN s."academicTestIds" ELSE '[]'::jsonb END) ids(value)
JOIN "AcademicScheduledTest" st ON st."id" = ids.value
WHERE s."reportType" = 'ACADEMIC_TEST' AND s."status" = 'SENT'
GROUP BY s."batchId", st."academicTestItemId"
ON CONFLICT ("batchId", "academicTestId") DO NOTHING;

INSERT INTO "AcademicTestReportSubmission" ("id", "historyId", "facultyId", "sourceShareId", "scheduleId", "reportData", "submittedAt", "createdAt", "updatedAt")
SELECT 'legacy_submission_' || md5(s."id" || ':' || ids.value), h."id", s."facultyId", s."id", ids.value,
       jsonb_build_object('legacyShareId', s."id", 'academicTestId', ids.value, 'academicTestIds', s."academicTestIds"),
       s."sentAt", s."createdAt", s."updatedAt"
FROM "FacultyReportShare" s
CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(s."academicTestIds") = 'array' THEN s."academicTestIds" ELSE '[]'::jsonb END) ids(value)
JOIN "AcademicScheduledTest" st ON st."id" = ids.value
JOIN "AcademicTestReportHistory" h ON h."batchId" = s."batchId" AND h."academicTestId" = st."academicTestItemId"
WHERE s."reportType" = 'ACADEMIC_TEST' AND s."status" = 'SENT'
ON CONFLICT ("id") DO NOTHING;
