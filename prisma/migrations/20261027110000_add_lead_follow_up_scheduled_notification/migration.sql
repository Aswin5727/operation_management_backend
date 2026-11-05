-- Create an immediate notification when a lead follow-up is scheduled.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'LEAD_FOLLOW_UP_SCHEDULED';
