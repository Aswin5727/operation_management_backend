ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'PENDING_STUDENT_ADMISSION_REMINDER';

CREATE TABLE "SalesAdminAdmissionReminder" (
    "id" TEXT NOT NULL,
    "salesAdminId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL DEFAULT 'PENDING_HOT_ADMISSIONS',
    "reminderDate" VARCHAR(10) NOT NULL,
    "notificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesAdminAdmissionReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesAdminAdmissionReminder_daily_key"
ON "SalesAdminAdmissionReminder"("salesAdminId", "notificationType", "reminderDate");

CREATE UNIQUE INDEX "SalesAdminAdmissionReminder_notificationId_key"
ON "SalesAdminAdmissionReminder"("notificationId");

CREATE INDEX "SalesAdminAdmissionReminder_salesAdminId_reminderDate_idx"
ON "SalesAdminAdmissionReminder"("salesAdminId", "reminderDate");
