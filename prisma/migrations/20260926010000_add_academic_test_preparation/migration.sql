ALTER TABLE "AcademicTestItem" ADD COLUMN "requiredProgress" INTEGER NOT NULL DEFAULT 0;
CREATE TYPE "AcademicPreparationStatus" AS ENUM ('DRAFT', 'PREPARED');
CREATE TABLE "AcademicQuestionPaper" (
  "id" TEXT NOT NULL, "academicTestItemId" TEXT NOT NULL, "branchCourseId" TEXT NOT NULL, "branchBatchId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL, "status" "AcademicPreparationStatus" NOT NULL DEFAULT 'DRAFT', "marksPerQuestion" INTEGER NOT NULL DEFAULT 1,
  "totalQuestions" INTEGER NOT NULL DEFAULT 0, "totalMarks" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicQuestionPaper_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AcademicQuestion" (
  "id" TEXT NOT NULL, "questionPaperId" TEXT NOT NULL, "questionNumber" INTEGER NOT NULL, "questionText" TEXT NOT NULL,
  "optionA" TEXT NOT NULL, "optionB" TEXT NOT NULL, "optionC" TEXT NOT NULL, "optionD" TEXT NOT NULL, "correctAnswer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicQuestion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AcademicTestProject" (
  "id" TEXT NOT NULL, "academicTestItemId" TEXT NOT NULL, "branchCourseId" TEXT NOT NULL, "branchBatchId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL, "status" "AcademicPreparationStatus" NOT NULL DEFAULT 'DRAFT', "projectTitle" TEXT NOT NULL DEFAULT '',
  "projectDescription" TEXT NOT NULL DEFAULT '', "projectRequirements" TEXT, "projectMarks" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicTestProject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademicQuestionPaper_academicTestItemId_branchBatchId_key" ON "AcademicQuestionPaper"("academicTestItemId", "branchBatchId");
CREATE INDEX "AcademicQuestionPaper_branchCourseId_branchBatchId_idx" ON "AcademicQuestionPaper"("branchCourseId", "branchBatchId");
CREATE INDEX "AcademicQuestionPaper_createdBy_idx" ON "AcademicQuestionPaper"("createdBy");
CREATE UNIQUE INDEX "AcademicQuestion_questionPaperId_questionNumber_key" ON "AcademicQuestion"("questionPaperId", "questionNumber");
CREATE INDEX "AcademicQuestion_questionPaperId_idx" ON "AcademicQuestion"("questionPaperId");
CREATE UNIQUE INDEX "AcademicTestProject_academicTestItemId_branchBatchId_key" ON "AcademicTestProject"("academicTestItemId", "branchBatchId");
CREATE INDEX "AcademicTestProject_branchCourseId_branchBatchId_idx" ON "AcademicTestProject"("branchCourseId", "branchBatchId");
CREATE INDEX "AcademicTestProject_createdBy_idx" ON "AcademicTestProject"("createdBy");
ALTER TABLE "AcademicQuestionPaper" ADD CONSTRAINT "AcademicQuestionPaper_academicTestItemId_fkey" FOREIGN KEY ("academicTestItemId") REFERENCES "AcademicTestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicQuestionPaper" ADD CONSTRAINT "AcademicQuestionPaper_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicQuestionPaper" ADD CONSTRAINT "AcademicQuestionPaper_branchBatchId_fkey" FOREIGN KEY ("branchBatchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicQuestion" ADD CONSTRAINT "AcademicQuestion_questionPaperId_fkey" FOREIGN KEY ("questionPaperId") REFERENCES "AcademicQuestionPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestProject" ADD CONSTRAINT "AcademicTestProject_academicTestItemId_fkey" FOREIGN KEY ("academicTestItemId") REFERENCES "AcademicTestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestProject" ADD CONSTRAINT "AcademicTestProject_branchCourseId_fkey" FOREIGN KEY ("branchCourseId") REFERENCES "BranchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTestProject" ADD CONSTRAINT "AcademicTestProject_branchBatchId_fkey" FOREIGN KEY ("branchBatchId") REFERENCES "BranchBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
