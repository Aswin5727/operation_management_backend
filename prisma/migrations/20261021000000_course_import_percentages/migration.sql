ALTER TABLE "BranchCourseModule" ADD COLUMN "percentageBasisPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BranchCourseSubmodule" ADD COLUMN "percentageBasisPoints" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
 SELECT id, row_number() OVER (PARTITION BY "branchCourseId" ORDER BY "sequenceNo", id) AS rn,
 count(*) OVER (PARTITION BY "branchCourseId") AS n FROM "BranchCourseModule"
)
UPDATE "BranchCourseModule" m SET "percentageBasisPoints" =
 CASE WHEN r.rn = r.n THEN 10000 - (10000 / r.n) * (r.n - 1) ELSE 10000 / r.n END
FROM ranked r WHERE m.id = r.id;
WITH ranked AS (
 SELECT id, row_number() OVER (PARTITION BY "branchCourseModuleId" ORDER BY "sequenceNo", id) AS rn,
 count(*) OVER (PARTITION BY "branchCourseModuleId") AS n FROM "BranchCourseSubmodule"
)
UPDATE "BranchCourseSubmodule" m SET "percentageBasisPoints" =
 CASE WHEN r.rn = r.n THEN 10000 - (10000 / r.n) * (r.n - 1) ELSE 10000 / r.n END
FROM ranked r WHERE m.id = r.id;

ALTER TABLE "BranchCourseModule" ADD CONSTRAINT "BranchCourseModule_percentage_range" CHECK ("percentageBasisPoints" BETWEEN 0 AND 10000);
ALTER TABLE "BranchCourseSubmodule" ADD CONSTRAINT "BranchCourseSubmodule_percentage_range" CHECK ("percentageBasisPoints" BETWEEN 0 AND 10000);

CREATE TABLE "BranchCourseImportReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY, "branchId" TEXT NOT NULL, "uploadHash" TEXT NOT NULL,
 "summary" JSONB NOT NULL, "createdBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "BranchCourseImportReceipt_branchId_uploadHash_key" ON "BranchCourseImportReceipt"("branchId", "uploadHash");
