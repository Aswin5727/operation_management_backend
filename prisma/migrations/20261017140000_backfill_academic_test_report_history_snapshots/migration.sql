WITH legacy AS (
  SELECT rs."id" AS "submissionId", h."id" AS "historyId", h."batchId", rs."scheduleId", st."testNumber", st."questionPaperId"
  FROM "AcademicTestReportSubmission" rs
  JOIN "AcademicTestReportHistory" h ON h."id" = rs."historyId"
  JOIN "AcademicScheduledTest" st ON st."id" = rs."scheduleId"
  WHERE rs."reportData"->>'legacyShareId' IS NOT NULL
), snapshots AS (
  SELECT l."submissionId",
    jsonb_build_object(
      'batch', jsonb_build_object('id', bb."id", 'batchId', bb."batchId", 'batchName', bb."batchName", 'batchTiming', bb."batchTiming", 'courseName', bb."courseName"),
      'course', jsonb_build_object('name', bb."courseName"),
      'tests', jsonb_build_array(jsonb_build_object('testNumber', l."testNumber", 'scheduleId', l."scheduleId", 'totalQuestions', COALESCE(qp."totalQuestions", 0), 'totalMarks', COALESCE(qp."totalMarks", 0), 'passMark', COALESCE(qp."passMark", 0))),
      'hasProject', false,
      'projectItems', '[]'::jsonb,
      'students', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'student', jsonb_build_object('id', bs."id", 'studentId', bs."studentId", 'studentName', bs."studentName", 'emailAddress', bs."emailAddress"),
          'tests', jsonb_build_array(jsonb_build_object(
            'testNumber', l."testNumber", 'scheduleId', l."scheduleId",
            'final', CASE WHEN sub."id" IS NULL THEN jsonb_build_object('status', 'NOT_ATTENDED', 'marksObtained', NULL, 'totalMarks', COALESCE(qp."totalMarks", 0), 'percentage', NULL, 'result', NULL)
              ELSE jsonb_build_object('status', sub."status", 'marksObtained', sub."obtainedMarks", 'totalMarks', sub."totalMarks", 'percentage', sub."percentage", 'result', sub."resultStatus") END
          )),
          'overallTestPercentage', sub."percentage"
        ) ORDER BY bs."studentName")
        FROM "BranchStudent" bs
        LEFT JOIN "AcademicTestSubmission" sub ON sub."academicTestId" = l."scheduleId" AND sub."branchStudentId" = bs."id"
        WHERE bs."recordStatus" = 'ACTIVE'
          AND (bs."batchId" IN (l."batchId", bb."batchId") OR sub."id" IS NOT NULL)
      ), '[]'::jsonb)
    ) AS "reportData"
  FROM legacy l
  JOIN "BranchBatch" bb ON bb."id" = l."batchId"
  LEFT JOIN "AcademicQuestionPaper" qp ON qp."id" = l."questionPaperId"
)
UPDATE "AcademicTestReportSubmission" rs
SET "reportData" = snapshots."reportData", "updatedAt" = CURRENT_TIMESTAMP
FROM snapshots
WHERE rs."id" = snapshots."submissionId";
