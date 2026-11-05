CREATE TABLE IF NOT EXISTS "BranchFacultyCourse" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "branchFacultyId" TEXT NOT NULL,
  "branchCourseId" TEXT NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchFacultyCourse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BranchFacultyCourse_branchFacultyId_fkey" FOREIGN KEY ("branchFacultyId") REFERENCES "BranchFaculty"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BranchFacultyCourse_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BranchFacultyCourse_branchFacultyId_branchCourseId_key" ON "BranchFacultyCourse"("branchFacultyId", "branchCourseId");
CREATE INDEX IF NOT EXISTS "BranchFacultyCourse_branchId_branchFacultyId_idx" ON "BranchFacultyCourse"("branchId", "branchFacultyId");
CREATE INDEX IF NOT EXISTS "BranchFacultyCourse_branchId_branchCourseId_idx" ON "BranchFacultyCourse"("branchId", "branchCourseId");

INSERT INTO "BranchFacultyCourse" ("id", "branchId", "branchFacultyId", "branchCourseId", "createdAt", "updatedAt")
SELECT md5("BranchBatch"."branchFacultyId" || ':' || "BranchBatch"."branchCourseId"), "BranchBatch"."branchId", "BranchBatch"."branchFacultyId", "BranchBatch"."branchCourseId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "BranchBatch"
WHERE "BranchBatch"."status" = 'ACTIVE'
ON CONFLICT ("branchFacultyId", "branchCourseId") DO NOTHING;
