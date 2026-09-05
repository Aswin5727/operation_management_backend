-- Flatten the legacy parent/row batch structure into one BranchBatch row per batch.
ALTER TABLE "BranchBatch"
  ADD COLUMN "batchName" TEXT,
  ADD COLUMN "startTime" TEXT,
  ADD COLUMN "startPeriod" TEXT,
  ADD COLUMN "endTime" TEXT,
  ADD COLUMN "endPeriod" TEXT,
  ADD COLUMN "batchTiming" TEXT,
  ADD COLUMN "totalSeats" INTEGER,
  ADD COLUMN "sequenceNo" INTEGER;

-- The legacy group key is not needed for copied child rows and is removed below.
ALTER TABLE "BranchBatch" ALTER COLUMN "batchGroupId" DROP NOT NULL;

-- Keep the first legacy row on its existing parent record.
UPDATE "BranchBatch" AS parent
SET
  "batchId" = row."batchId",
  "batchName" = row."batchName",
  "startTime" = row."startTime",
  "startPeriod" = row."startPeriod",
  "endTime" = row."endTime",
  "endPeriod" = row."endPeriod",
  "batchTiming" = row."batchTiming",
  "totalSeats" = row."totalSeats",
  "sequenceNo" = row."sequenceNo",
  "status" = row."status",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "BranchBatchRow" AS row
WHERE row."branchBatchId" = parent."id"
  AND row."sequenceNo" = (
    SELECT MIN(first_row."sequenceNo")
    FROM "BranchBatchRow" AS first_row
    WHERE first_row."branchBatchId" = parent."id"
  );

-- Materialize every additional legacy row as its own BranchBatch record.
INSERT INTO "BranchBatch" (
  "id", "branchId", "branchCourseId", "branchFacultyId", "batchId",
  "courseId", "courseName", "facultyId", "facultyName", "facultyEmail",
  "batchName", "startTime", "startPeriod", "endTime", "endPeriod",
  "batchTiming", "totalSeats", "sequenceNo", "status", "createdBy",
  "updatedBy", "createdAt", "updatedAt"
)
SELECT
  'flat-' || md5(random()::text || clock_timestamp()::text || row."id"),
  parent."branchId", parent."branchCourseId", parent."branchFacultyId", row."batchId",
  parent."courseId", parent."courseName", parent."facultyId", parent."facultyName", parent."facultyEmail",
  row."batchName", row."startTime", row."startPeriod", row."endTime", row."endPeriod",
  row."batchTiming", row."totalSeats", row."sequenceNo", row."status", row."createdBy",
  row."updatedBy", row."createdAt", row."updatedAt"
FROM "BranchBatchRow" AS row
JOIN "BranchBatch" AS parent ON parent."id" = row."branchBatchId"
WHERE row."sequenceNo" > (
  SELECT MIN(first_row."sequenceNo")
  FROM "BranchBatchRow" AS first_row
  WHERE first_row."branchBatchId" = row."branchBatchId"
);

ALTER TABLE "BranchBatch"
  ALTER COLUMN "batchName" SET NOT NULL,
  ALTER COLUMN "startTime" SET NOT NULL,
  ALTER COLUMN "startPeriod" SET NOT NULL,
  ALTER COLUMN "endTime" SET NOT NULL,
  ALTER COLUMN "endPeriod" SET NOT NULL,
  ALTER COLUMN "batchTiming" SET NOT NULL,
  ALTER COLUMN "totalSeats" SET NOT NULL,
  ALTER COLUMN "sequenceNo" SET NOT NULL;

-- Legacy group edits could create the same batch ID more than once in one
-- branch/course/faculty scope. Keep the newest flattened record.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "branchId", "courseId", "facultyId", "batchId"
    ORDER BY "createdAt" DESC, "id" DESC
  ) AS row_number
  FROM "BranchBatch"
)
DELETE FROM "BranchBatch" AS duplicate
USING ranked
WHERE duplicate."id" = ranked."id"
  AND ranked.row_number > 1;

ALTER TABLE "BranchBatch" DROP CONSTRAINT IF EXISTS "BranchBatch_branchId_batchGroupId_key";
ALTER TABLE "BranchBatch" DROP COLUMN "batchGroupId";
ALTER TABLE "BranchBatch" DROP COLUMN "batchCount";
DROP TABLE "BranchBatchRow";

CREATE UNIQUE INDEX "BranchBatch_branchId_courseId_facultyId_batchId_key"
  ON "BranchBatch" ("branchId", "courseId", "facultyId", "batchId");
CREATE INDEX "BranchBatch_branchId_batchId_idx"
  ON "BranchBatch" ("branchId", "batchId");
