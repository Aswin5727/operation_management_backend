-- Repair schema drift: the original enrollment migration is recorded as
-- applied, but its BranchStudent columns and course table are missing.
ALTER TABLE "BranchStudent"
  ADD COLUMN IF NOT EXISTS "enrollmentType" TEXT NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN IF NOT EXISTS "arrangementType" TEXT NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN IF NOT EXISTS "firstCourseId" TEXT;

CREATE TABLE IF NOT EXISTS "BranchStudentCourse" (
  "id" TEXT NOT NULL,
  "branchStudentId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseName" TEXT,
  "facultyId" TEXT,
  "facultyName" TEXT,
  "batchId" TEXT,
  "batchName" TEXT,
  "batchTiming" TEXT,
  "scheduleType" TEXT,
  "mode" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  "arrangementType" TEXT NOT NULL DEFAULT 'SINGLE',
  "sequenceOrder" INTEGER NOT NULL DEFAULT 1,
  "totalCourseAmount" INTEGER,
  "paymentPlanId" TEXT,
  "paymentPlan" TEXT,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchStudentCourse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BranchStudentCourse_branchStudentId_fkey"
    FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BranchStudentCourse_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BranchStudentCourse_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "BranchCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BranchStudentCourse_branchStudentId_courseId_key"
  ON "BranchStudentCourse"("branchStudentId", "courseId");
CREATE INDEX IF NOT EXISTS "BranchStudentCourse_branchId_courseId_idx"
  ON "BranchStudentCourse"("branchId", "courseId");
CREATE INDEX IF NOT EXISTS "BranchStudentCourse_branchStudentId_idx"
  ON "BranchStudentCourse"("branchStudentId");
