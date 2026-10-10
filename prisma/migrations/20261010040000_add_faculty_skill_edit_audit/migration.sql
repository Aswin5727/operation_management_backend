ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "facultySkillAssignmentId" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_facultySkillAssignmentId_idx"
  ON "Notification"("facultySkillAssignmentId");

CREATE TABLE IF NOT EXISTS "FacultySkillAssignmentAudit" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "facultyId" TEXT NOT NULL,
  "editedBy" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "topicId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacultySkillAssignmentAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FacultySkillAssignmentAudit_assignmentId_createdAt_idx"
  ON "FacultySkillAssignmentAudit"("assignmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "FacultySkillAssignmentAudit_branchId_createdAt_idx"
  ON "FacultySkillAssignmentAudit"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "FacultySkillAssignmentAudit_facultyId_createdAt_idx"
  ON "FacultySkillAssignmentAudit"("facultyId", "createdAt");
