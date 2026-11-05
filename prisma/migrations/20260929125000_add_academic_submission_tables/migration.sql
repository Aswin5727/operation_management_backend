CREATE TABLE IF NOT EXISTS "AcademicTestSubmission" (
  "id" TEXT NOT NULL,
  "academicTestId" TEXT NOT NULL,
  "branchStudentId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "totalQuestions" INTEGER NOT NULL,
  "attemptedCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "wrongCount" INTEGER NOT NULL DEFAULT 0,
  "unmarkedCount" INTEGER NOT NULL DEFAULT 0,
  "totalMarks" INTEGER NOT NULL,
  "obtainedMarks" INTEGER NOT NULL DEFAULT 0,
  "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicTestSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTestSubmission_academicTestId_branchStudentId_key" ON "AcademicTestSubmission"("academicTestId", "branchStudentId");
CREATE INDEX IF NOT EXISTS "AcademicTestSubmission_branchStudentId_status_idx" ON "AcademicTestSubmission"("branchStudentId", "status");

CREATE TABLE IF NOT EXISTS "AcademicProjectSubmission" (
  "id" TEXT NOT NULL,
  "academicTestId" TEXT NOT NULL,
  "branchStudentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
  "submissionText" TEXT,
  "fileName" TEXT,
  "fileMimeType" TEXT,
  "filePath" TEXT,
  "link" TEXT,
  "marksAwarded" INTEGER,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicProjectSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicProjectSubmission_academicTestId_branchStudentId_key" ON "AcademicProjectSubmission"("academicTestId", "branchStudentId");
CREATE INDEX IF NOT EXISTS "AcademicProjectSubmission_branchStudentId_status_idx" ON "AcademicProjectSubmission"("branchStudentId", "status");

CREATE TABLE IF NOT EXISTS "AcademicTestAnswer" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "answerText" TEXT,
  "selectedAnswer" TEXT,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "marksAwarded" INTEGER NOT NULL DEFAULT 0,
  "evaluationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "evaluatedBy" TEXT,
  "evaluatedAt" TIMESTAMP(3),
  CONSTRAINT "AcademicTestAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTestAnswer_submissionId_questionId_key" ON "AcademicTestAnswer"("submissionId", "questionId");
CREATE INDEX IF NOT EXISTS "AcademicTestAnswer_submissionId_idx" ON "AcademicTestAnswer"("submissionId");