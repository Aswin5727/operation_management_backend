ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'LEAD_FOLLOW_UP_DUE';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'LEAD_FOLLOW_UP_OVERDUE';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'SALES_CRM_MONTHLY_REPORT';

CREATE TABLE IF NOT EXISTS "FollowUpReminder" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notificationId" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FollowUpReminder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FollowUpReminder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FollowUpReminder_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FollowUpReminder_leadId_recipientUserId_dueDate_key"
  ON "FollowUpReminder"("leadId", "recipientUserId", "dueDate");
CREATE INDEX IF NOT EXISTS "FollowUpReminder_status_scheduledFor_idx"
  ON "FollowUpReminder"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "FollowUpReminder_recipientUserId_status_idx"
  ON "FollowUpReminder"("recipientUserId", "status");
