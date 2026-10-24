import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import { createNotification } from "../notifications/notifications.service.js";

const REMINDER_HOUR = 9;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const CLOSED_STAGES = new Set(["CLOSED"]);
const CLOSED_STATUSES = new Set(["CLOSED", "CONVERTED"]);

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(date);
}

function scheduledFor(date, timeZone = "Asia/Kolkata") {
  const key = dateKey(date);
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  const assumedUtc = Date.UTC(year, month - 1, day, REMINDER_HOUR, 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(assumedUtc));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const localAtAssumedUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour === 24 ? 0 : values.hour, values.minute, values.second);
  return new Date(assumedUtc - (localAtAssumedUtc - assumedUtc));
}

function reminderDescription(prefix, leadId, dueDate) {
  return `${prefix}:${leadId}:${dateKey(dueDate)}`;
}

export async function syncLeadFollowUpReminder(leadId, prismaClient = prisma) {
  const rows = await prismaClient.$queryRawUnsafe(`
    SELECT l."id", l."leadId", l."assignedToId", l."nextFollowUpDate", l."stage", l."status", b."timezone"
    FROM "Lead" l JOIN "Branch" b ON b."id" = l."branchId"
    WHERE l."id" = $1 AND l."deletedAt" IS NULL
  `, leadId);
  const lead = rows[0];
  if (!lead) return null;

  await prismaClient.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "leadId" = $1 AND "status" = 'PENDING'`, lead.id);
  const stage = String(lead.stage || "").toUpperCase();
  const status = String(lead.status || "").toUpperCase();
  if (!lead.assignedToId || !lead.nextFollowUpDate || CLOSED_STAGES.has(stage) || CLOSED_STATUSES.has(status)) return null;

  const dueDate = new Date(lead.nextFollowUpDate);
  const scheduled = scheduledFor(dueDate, lead.timezone || "Asia/Kolkata");
  if (!scheduled) return null;
  const id = crypto.randomUUID();
  const inserted = await prismaClient.$queryRawUnsafe(`
    INSERT INTO "FollowUpReminder" ("id", "leadId", "recipientUserId", "dueDate", "scheduledFor", "timezone", "status", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("leadId", "recipientUserId", "dueDate") DO UPDATE SET
      "scheduledFor" = EXCLUDED."scheduledFor",
      "timezone" = EXCLUDED."timezone",
      "status" = CASE WHEN "FollowUpReminder"."status" = 'SENT' THEN "FollowUpReminder"."status" ELSE 'PENDING' END,
      "cancelledAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "id", "status", "scheduledFor"
  `, id, lead.id, lead.assignedToId, dueDate, scheduled, lead.timezone || "Asia/Kolkata");
  return inserted[0] || null;
}

async function sendDueReminder(reminder) {
  const claimed = await prisma.$queryRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'PROCESSING', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 AND "status" = 'PENDING' RETURNING *`, reminder.id);
  if (!claimed[0]) return;
  try {
    const lead = await prisma.lead.findFirst({ where: { id: reminder.leadId, deletedAt: null }, include: { assignedTo: { select: { id: true, fullName: true } }, branch: { select: { id: true, branchName: true } } } });
    if (!lead || !lead.assignedToId || CLOSED_STAGES.has(String(lead.stage).toUpperCase()) || CLOSED_STATUSES.has(String(lead.status).toUpperCase()) || !lead.nextFollowUpDate) {
      await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, reminder.id);
      return;
    }
    const description = reminderDescription("LEAD_FOLLOW_UP_REMINDER", lead.id, lead.nextFollowUpDate);
    const existing = await prisma.notification.findFirst({ where: { kind: "LEAD_FOLLOW_UP_DUE", targetUserId: lead.assignedToId, requestDescription: description }, select: { id: true } });
    let notification = existing;
    if (!notification) {
      notification = await createNotification({ kind: "LEAD_FOLLOW_UP_DUE", tone: "blue", title: `Follow-up Reminder — ${lead.studentName}`, message: `You have a scheduled follow-up with ${lead.studentName} (${lead.leadId}) today. Please contact the student and update the follow-up details.`, actionLabel: "View Lead", targetUserId: lead.assignedToId, targetBranchId: lead.branch?.id || null, targetBranchName: lead.branch?.branchName || null, requestDescription: description });
    }
    await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'SENT', "notificationId" = $2, "deliveredAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, reminder.id, notification.id);
  } catch (error) {
    await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'PENDING', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, reminder.id).catch(() => {});
    throw error;
  }
}

async function createOverdueNotifications() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT r."id", r."leadId", r."recipientUserId", l."leadId" AS "displayLeadId", l."studentName", l."nextFollowUpDate", l."branchId", b."branchName"
    FROM "FollowUpReminder" r JOIN "Lead" l ON l."id" = r."leadId" JOIN "Branch" b ON b."id" = l."branchId"
    WHERE r."status" = 'SENT' AND l."deletedAt" IS NULL AND l."nextFollowUpDate" < CURRENT_TIMESTAMP
      AND l."stage" <> 'CLOSED' AND l."status" <> 'CONVERTED'
  `);
  for (const row of rows) {
    const description = reminderDescription("LEAD_FOLLOW_UP_OVERDUE", row.leadId, row.nextFollowUpDate);
    const existing = await prisma.notification.findFirst({ where: { kind: "LEAD_FOLLOW_UP_OVERDUE", targetUserId: row.recipientUserId, requestDescription: description }, select: { id: true } });
    if (existing) continue;
    await createNotification({ kind: "LEAD_FOLLOW_UP_OVERDUE", tone: "amber", title: `Overdue follow-up — ${row.studentName}`, message: `The scheduled follow-up for ${row.studentName} (${row.displayLeadId}) is overdue. Please update the lead.`, actionLabel: "View Lead", targetUserId: row.recipientUserId, targetBranchId: row.branchId, targetBranchName: row.branchName, requestDescription: description });
    await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'OVERDUE', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 AND "status" = 'SENT'`, row.id);
  }
}

async function createMonthlyReportNotifications() {
  const now = new Date();
  const localParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  if (localParts.day !== 1) return;
  const reportMonth = localParts.month === 1 ? 12 : localParts.month - 1;
  const reportYear = localParts.month === 1 ? localParts.year - 1 : localParts.year;
  const marker = `SALES_CRM_MONTHLY_REPORT:${reportYear}-${String(reportMonth).padStart(2, "0")}`;
  const admins = await prisma.user.findMany({ where: { role: "SALES_ADMIN", active: true }, select: { id: true, fullName: true } });
  for (const admin of admins) {
    const existing = await prisma.notification.findFirst({ where: { kind: "SALES_CRM_MONTHLY_REPORT", targetUserId: admin.id, requestDescription: marker }, select: { id: true } });
    if (existing) continue;
    await createNotification({ kind: "SALES_CRM_MONTHLY_REPORT", tone: "green", title: `${new Date(Date.UTC(reportYear, reportMonth - 1, 1)).toLocaleString("en-US", { month: "long" })} ${reportYear} — Sales CRM Monthly Report`, message: `Your monthly Sales CRM report is ready. View your new leads, conversions, and follow-up performance.`, actionLabel: "View Report", targetUserId: admin.id, requestDescription: marker });
  }
}

export async function reconcileLeadFollowUpReminders() {
  const due = await prisma.$queryRawUnsafe(`SELECT "id", "leadId" FROM "FollowUpReminder" WHERE "status" = 'PENDING' AND "scheduledFor" <= CURRENT_TIMESTAMP ORDER BY "scheduledFor" ASC LIMIT 100`);
  for (const reminder of due) {
    await sendDueReminder(reminder).catch((error) => console.warn(`Lead follow-up reminder failed for ${reminder.id}: ${error?.message || error}`));
  }
  await createOverdueNotifications().catch((error) => console.warn(`Lead overdue reminder sweep failed: ${error?.message || error}`));
  await createMonthlyReportNotifications().catch((error) => console.warn(`Sales CRM monthly report notification failed: ${error?.message || error}`));
}

export function startLeadFollowUpReminderScheduler() {
  const run = () => void reconcileLeadFollowUpReminders().catch((error) => console.warn(`Lead follow-up reminder sweep failed: ${error?.message || error}`));
  run();
  const timer = setInterval(run, SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
