ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'CALL_RECORDING_SHARED';

CREATE TABLE "LeadRecordingShare" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientRole" TEXT NOT NULL,
    "message" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadRecordingShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadRecordingShareItem" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadRecordingShareItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadRecordingShare_shareId_recordingId_key" ON "LeadRecordingShareItem"("shareId", "recordingId");
CREATE UNIQUE INDEX "LeadRecordingShare_idempotencyKey_key" ON "LeadRecordingShare"("idempotencyKey");
CREATE INDEX "LeadRecordingShare_leadId_createdAt_idx" ON "LeadRecordingShare"("leadId", "createdAt");
CREATE INDEX "LeadRecordingShare_recipientUserId_createdAt_idx" ON "LeadRecordingShare"("recipientUserId", "createdAt");
CREATE INDEX "LeadRecordingShare_senderUserId_createdAt_idx" ON "LeadRecordingShare"("senderUserId", "createdAt");
CREATE INDEX "LeadRecordingShare_branchId_createdAt_idx" ON "LeadRecordingShare"("branchId", "createdAt");
CREATE INDEX "LeadRecordingShareItem_recordingId_createdAt_idx" ON "LeadRecordingShareItem"("recordingId", "createdAt");
ALTER TABLE "LeadRecordingShareItem" ADD CONSTRAINT "LeadRecordingShareItem_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "LeadRecordingShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadRecordingShare" ADD CONSTRAINT "LeadRecordingShare_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadRecordingShare" ADD CONSTRAINT "LeadRecordingShare_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadRecordingShare" ADD CONSTRAINT "LeadRecordingShare_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadRecordingShare" ADD CONSTRAINT "LeadRecordingShare_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadRecordingShareItem" ADD CONSTRAINT "LeadRecordingShareItem_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "LeadRecording"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
