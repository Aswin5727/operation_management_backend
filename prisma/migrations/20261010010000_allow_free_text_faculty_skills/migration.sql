ALTER TABLE "FacultySkillAssignment" ADD COLUMN "skillName" TEXT NOT NULL DEFAULT '';
UPDATE "FacultySkillAssignment" assignment SET "skillName" = skill."name" FROM "FacultySkill" skill WHERE assignment."skillId" = skill."id" AND assignment."skillName" = '';
ALTER TABLE "FacultySkillAssignment" ALTER COLUMN "skillId" DROP NOT NULL;
DROP INDEX IF EXISTS "FacultySkillAssignment_branchFacultyId_skillId_startDate_key";
CREATE UNIQUE INDEX "FacultySkillAssignment_branchFacultyId_skillName_startDate_key" ON "FacultySkillAssignment"("branchFacultyId", "skillName", "startDate");
