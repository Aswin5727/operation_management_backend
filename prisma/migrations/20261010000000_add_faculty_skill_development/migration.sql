CREATE TABLE "FacultySkill" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "FacultySkill_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "FacultySkill_name_key" ON "FacultySkill"("name");
CREATE INDEX "FacultySkill_active_name_idx" ON "FacultySkill"("active","name");
CREATE TABLE "FacultySkillAssignment" ("id" TEXT NOT NULL,"branchId" TEXT NOT NULL,"branchFacultyId" TEXT NOT NULL,"facultyUserId" TEXT NOT NULL,"skillId" TEXT NOT NULL,"durationValue" INTEGER NOT NULL,"durationUnit" TEXT NOT NULL DEFAULT 'MONTH',"startDate" TEXT NOT NULL,"endDate" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'NOT_STARTED',"completedAt" TIMESTAMP(3),"overdueMarkedAt" TIMESTAMP(3),"createdBy" TEXT NOT NULL,"updatedBy" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "FacultySkillAssignment_pkey" PRIMARY KEY ("id"),CONSTRAINT "FacultySkillAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,CONSTRAINT "FacultySkillAssignment_branchFacultyId_fkey" FOREIGN KEY ("branchFacultyId") REFERENCES "BranchFaculty"("id") ON DELETE CASCADE ON UPDATE CASCADE,CONSTRAINT "FacultySkillAssignment_facultyUserId_fkey" FOREIGN KEY ("facultyUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,CONSTRAINT "FacultySkillAssignment_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "FacultySkill"("id") ON UPDATE CASCADE);
CREATE INDEX "FacultySkillAssignment_branchId_status_endDate_idx" ON "FacultySkillAssignment"("branchId","status","endDate");
CREATE INDEX "FacultySkillAssignment_facultyUserId_status_idx" ON "FacultySkillAssignment"("facultyUserId","status");
CREATE INDEX "FacultySkillAssignment_branchFacultyId_createdAt_idx" ON "FacultySkillAssignment"("branchFacultyId","createdAt");
CREATE UNIQUE INDEX "FacultySkillAssignment_branchFacultyId_skillId_startDate_key" ON "FacultySkillAssignment"("branchFacultyId","skillId","startDate");
CREATE TABLE "FacultySkillTopic" ("id" TEXT NOT NULL,"assignmentId" TEXT NOT NULL,"topicName" TEXT NOT NULL,"displayOrder" INTEGER NOT NULL,"status" TEXT NOT NULL DEFAULT 'NOT_STARTED',"startDate" TEXT,"expectedDate" TEXT,"completedDate" TEXT,"learningSummary" TEXT,"referenceType" TEXT,"referenceName" TEXT,"referenceUrl" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "FacultySkillTopic_pkey" PRIMARY KEY ("id"),CONSTRAINT "FacultySkillTopic_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FacultySkillAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "FacultySkillTopic_assignmentId_displayOrder_key" ON "FacultySkillTopic"("assignmentId","displayOrder");
CREATE UNIQUE INDEX "FacultySkillTopic_assignmentId_topicName_key" ON "FacultySkillTopic"("assignmentId","topicName");
CREATE INDEX "FacultySkillTopic_assignmentId_status_idx" ON "FacultySkillTopic"("assignmentId","status");
INSERT INTO "FacultySkill" ("id","name","active","updatedAt") VALUES
  ('faculty-skill-java','Java',true,CURRENT_TIMESTAMP),
  ('faculty-skill-python','Python',true,CURRENT_TIMESTAMP),
  ('faculty-skill-react','React',true,CURRENT_TIMESTAMP),
  ('faculty-skill-nextjs','Next.js',true,CURRENT_TIMESTAMP),
  ('faculty-skill-django','Django',true,CURRENT_TIMESTAMP),
  ('faculty-skill-sql','SQL',true,CURRENT_TIMESTAMP),
  ('faculty-skill-powerbi','Power BI',true,CURRENT_TIMESTAMP),
  ('faculty-skill-business-analytics','Business Analytics',true,CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
