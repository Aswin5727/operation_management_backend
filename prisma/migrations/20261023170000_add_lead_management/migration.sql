CREATE TYPE "LeadStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FOLLOW_UP', 'CONVERTED', 'CLOSED');
CREATE TYPE "LeadStage" AS ENUM ('COLD', 'WARM', 'HOT', 'CLOSED');

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "alternativeNumber" TEXT,
    "email" TEXT,
    "qualification" TEXT,
    "location" TEXT,
    "callType" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'DRAFT',
    "stage" "LeadStage" NOT NULL DEFAULT 'COLD',
    "courseId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "leadSource" TEXT NOT NULL,
    "referredBy" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_PAID',
    "trainingMode" TEXT,
    "classSchedule" TEXT,
    "courseMode" TEXT,
    "locationDistance" TEXT,
    "leadDate" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadFollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3) NOT NULL,
    "followUpType" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "nextFollowUpDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeadFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadStageHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStage" "LeadStage",
    "toStage" "LeadStage" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadStageHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadRecording" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "followUpId" TEXT,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadRecording_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_leadId_key" ON "Lead"("leadId");
CREATE UNIQUE INDEX "LeadRecording_storageKey_key" ON "LeadRecording"("storageKey");
CREATE INDEX "Lead_branchId_createdAt_idx" ON "Lead"("branchId", "createdAt");
CREATE INDEX "Lead_courseId_idx" ON "Lead"("courseId");
CREATE INDEX "Lead_stage_status_idx" ON "Lead"("stage", "status");
CREATE INDEX "Lead_assignedToId_status_idx" ON "Lead"("assignedToId", "status");
CREATE INDEX "Lead_phoneNumber_idx" ON "Lead"("phoneNumber");
CREATE INDEX "Lead_leadDate_idx" ON "Lead"("leadDate");
CREATE INDEX "LeadFollowUp_leadId_followUpDate_idx" ON "LeadFollowUp"("leadId", "followUpDate");
CREATE INDEX "LeadFollowUp_nextFollowUpDate_idx" ON "LeadFollowUp"("nextFollowUpDate");
CREATE INDEX "LeadStageHistory_leadId_createdAt_idx" ON "LeadStageHistory"("leadId", "createdAt");
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");
CREATE INDEX "LeadRecording_leadId_createdAt_idx" ON "LeadRecording"("leadId", "createdAt");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "BranchCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadRecording" ADD CONSTRAINT "LeadRecording_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadRecording" ADD CONSTRAINT "LeadRecording_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
