CREATE TABLE IF NOT EXISTS "FacultyTodayWorkStudentEntry" (
  "id" TEXT NOT NULL,
  "facultyTodayWorkEntryId" TEXT NOT NULL,
  "branchStudentId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "submoduleId" TEXT NOT NULL,
  "workDate" TEXT NOT NULL,
  "attendanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "completionStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FacultyTodayWorkStudentEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FacultyTodayWorkStudentEntry_facultyTodayWorkEntryId_fkey"
    FOREIGN KEY ("facultyTodayWorkEntryId") REFERENCES "FacultyTodayWorkEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FacultyTodayWorkStudentEntry_branchStudentId_fkey"
    FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FacultyTodayWorkStudentEntry_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FacultyTodayWorkStudentEntry_branchStudentId_courseId_batchId_submoduleId_idx"
  ON "FacultyTodayWorkStudentEntry" ("branchStudentId", "courseId", "batchId", "submoduleId");
CREATE INDEX IF NOT EXISTS "FacultyTodayWorkStudentEntry_branchStudentId_workDate_idx"
  ON "FacultyTodayWorkStudentEntry" ("branchStudentId", "workDate");
CREATE INDEX IF NOT EXISTS "FacultyTodayWorkStudentEntry_batchId_workDate_idx"
  ON "FacultyTodayWorkStudentEntry" ("batchId", "workDate");
CREATE INDEX IF NOT EXISTS "FacultyTodayWorkStudentEntry_courseId_moduleId_submoduleId_idx"
  ON "FacultyTodayWorkStudentEntry" ("courseId", "moduleId", "submoduleId");
