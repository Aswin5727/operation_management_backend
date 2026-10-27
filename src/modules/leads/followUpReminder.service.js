import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import { createNotification } from "../notifications/notifications.service.js";

const REMINDER_HOUR = 9;
const SWEEP_INTERVAL_MS = 60 * 1000;
const ACTIVE_STAGES = new Set(["COLD", "WARM"]);
const CLOSED_STAGES = new Set(["HOT", "CLOSED"]);
const CLOSED_STATUSES = new Set(["CONVERTED"]);

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

function scheduledAtLocalTime(date, time, timeZone = "Asia/Kolkata") {
  const key = dateKey(date);
  if (!key || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ""))) return null;
  const [year, month, day] = key.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const assumedUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(assumedUtc));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const localAtAssumedUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour === 24 ? 0 : values.hour, values.minute, values.second);
  return new Date(assumedUtc - (localAtAssumedUtc - assumedUtc));
}

function reminderDescription(prefix, leadId, dueDate, time = "") {
  return `${prefix}:${leadId}:${dateKey(dueDate)}${time ? `:${time}` : ""}`;
}

function dateKeyInZone(value, timeZone = "Asia/Kolkata") {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function dateFromKey(key) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? new Date(`${key}T00:00:00.000Z`) : null;
}

function addDaysToKey(key, days) {
  const date = dateFromKey(key);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function isReminderEligible(lead) {
  const stage = String(lead?.stage || "").toUpperCase();
  const status = String(lead?.status || "").toUpperCase();
  const assignedRole = String(lead?.assignedTo?.role || "").toUpperCase();
  const combinedBranchAdmin = assignedRole === "BRANCH_ADMIN" && lead?.branch?.roleAccess === "BRANCH_ADMIN_SALES_ADMIN";
  return ACTIVE_STAGES.has(stage) && !CLOSED_STATUSES.has(status) && Boolean(lead?.assignedToId) && lead?.assignedTo?.active !== false && (assignedRole === "SALES_ADMIN" || combinedBranchAdmin) && lead?.branch?.status !== "INACTIVE";
}

function localTimeLabel(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!match) return "";
  const hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

export async function syncLeadFollowUpReminder(leadId, prismaClient = prisma) {
  const rows = await prismaClient.$queryRawUnsafe(`
    SELECT l."id", l."leadId", l."assignedToId", l."nextFollowUpDate", l."nextFollowUpTime", l."stage", l."status", l."createdById", l."updatedById", b."timezone", b."status" AS "branchStatus", b."roleAccess" AS "branchRoleAccess", u."role" AS "assignedRole", u."active" AS "assignedActive"
    FROM "Lead" l JOIN "Branch" b ON b."id" = l."branchId" LEFT JOIN "User" u ON u."id" = l."assignedToId"
    WHERE l."id" = $1 AND l."deletedAt" IS NULL
  `, leadId);
  const lead = rows[0];
  if (!lead) return null;

  const previousRows = await prismaClient.$queryRawUnsafe(`SELECT "dueDate", "scheduledFor", "status" FROM "FollowUpReminder" WHERE "leadId" = $1 AND "status" <> 'CANCELLED' ORDER BY "updatedAt" DESC LIMIT 1`, lead.id);
  const previous = previousRows[0];
  const currentStage = String(lead.stage || "").toUpperCase();
  const currentStatus = String(lead.status || "").toUpperCase();
  const currentTimezone = lead.timezone || "Asia/Kolkata";
  const canReceiveReminder = Boolean(lead.assignedToId) && lead.assignedActive && (lead.assignedRole === "SALES_ADMIN" || (lead.assignedRole === "BRANCH_ADMIN" && lead.branchRoleAccess === "BRANCH_ADMIN_SALES_ADMIN")) && lead.branchStatus === "ACTIVE" && ACTIVE_STAGES.has(currentStage) && !CLOSED_STATUSES.has(currentStatus);
  const pendingRows = await prismaClient.$queryRawUnsafe(`SELECT "dueDate", "scheduledFor", "status" FROM "FollowUpReminder" WHERE "leadId" = $1 AND "status" = 'PENDING' ORDER BY "scheduledFor" ASC LIMIT 1`, lead.id);
  const pending = pendingRows[0];
  const currentDateKey = lead.nextFollowUpDate ? dateKey(lead.nextFollowUpDate) : "";
  if (canReceiveReminder && pending && currentDateKey && dateKey(pending.dueDate) === currentDateKey) {
    const expectedForCurrentDate = lead.nextFollowUpTime
      ? scheduledAtLocalTime(dateFromKey(currentDateKey), lead.nextFollowUpTime, currentTimezone)
      : scheduledFor(dateFromKey(currentDateKey), currentTimezone);
    if (expectedForCurrentDate && expectedForCurrentDate.getTime() === new Date(pending.scheduledFor).getTime()) return pending;
  }
  await prismaClient.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "leadId" = $1 AND "status" = 'PENDING'`, lead.id);
  const stage = String(lead.stage || "").toUpperCase();
  const status = String(lead.status || "").toUpperCase();
  const timezone = lead.timezone || "Asia/Kolkata";
  if (!lead.assignedToId || !lead.assignedActive || !(["SALES_ADMIN", "BRANCH_ADMIN"].includes(lead.assignedRole)) || (lead.assignedRole === "BRANCH_ADMIN" && lead.branchRoleAccess !== "BRANCH_ADMIN_SALES_ADMIN") || lead.branchStatus !== "ACTIVE" || !ACTIVE_STAGES.has(stage) || CLOSED_STAGES.has(stage) || CLOSED_STATUSES.has(status)) {
    if (previous && ["PENDING", "PROCESSING"].includes(previous.status) && (lead.updatedById || lead.createdById)) await prismaClient.leadActivity.create({ data: { leadId: lead.id, action: "REMINDER_LOOP_STOPPED", previousValue: { scheduledFor: previous.scheduledFor.toISOString() }, newValue: { stage, status }, createdById: lead.updatedById || lead.createdById } });
    return null;
  }

  const todayKey = dateKeyInZone(new Date(), timezone);
  const leadDateKey = lead.nextFollowUpDate ? dateKey(lead.nextFollowUpDate) : "";
  let reminderDateKey;
  let scheduled;
  if (!leadDateKey) {
    reminderDateKey = addDaysToKey(todayKey, 1);
    scheduled = scheduledFor(dateFromKey(reminderDateKey), timezone);
  } else if (leadDateKey > todayKey) {
    reminderDateKey = leadDateKey;
    scheduled = scheduledFor(dateFromKey(reminderDateKey), timezone);
  } else if (leadDateKey === todayKey) {
    const todaySchedule = lead.nextFollowUpTime
      ? scheduledAtLocalTime(dateFromKey(leadDateKey), lead.nextFollowUpTime, timezone)
      : scheduledFor(dateFromKey(leadDateKey), timezone);
    if (todaySchedule && todaySchedule.getTime() > Date.now()) {
      reminderDateKey = todayKey;
      scheduled = todaySchedule;
    } else {
      reminderDateKey = addDaysToKey(todayKey, 1);
      scheduled = scheduledFor(dateFromKey(reminderDateKey), timezone);
    }
  } else {
    reminderDateKey = addDaysToKey(todayKey, 1);
    scheduled = scheduledFor(dateFromKey(reminderDateKey), timezone);
  }
  const dueDate = dateFromKey(reminderDateKey);
  if (!scheduled) return null;
  const id = crypto.randomUUID();
  const inserted = await prismaClient.$queryRawUnsafe(`
    INSERT INTO "FollowUpReminder" ("id", "leadId", "recipientUserId", "dueDate", "scheduledFor", "timezone", "status", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("leadId", "recipientUserId", "dueDate") DO UPDATE SET
      "scheduledFor" = EXCLUDED."scheduledFor",
      "timezone" = EXCLUDED."timezone",
      "status" = 'PENDING',
      "notificationId" = CASE WHEN "FollowUpReminder"."scheduledFor" IS DISTINCT FROM EXCLUDED."scheduledFor" THEN NULL ELSE "FollowUpReminder"."notificationId" END,
      "deliveredAt" = CASE WHEN "FollowUpReminder"."scheduledFor" IS DISTINCT FROM EXCLUDED."scheduledFor" THEN NULL ELSE "FollowUpReminder"."deliveredAt" END,
      "cancelledAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "id", "status", "scheduledFor"
  `, id, lead.id, lead.assignedToId, dueDate, scheduled, lead.timezone || "Asia/Kolkata");
  const priorSchedule = previous?.scheduledFor ? new Date(previous.scheduledFor).getTime() : null;
  const nextSchedule = new Date(scheduled).getTime();
  if (priorSchedule !== nextSchedule && (lead.updatedById || lead.createdById)) {
    const action = previous?.status === "SENT" && priorSchedule <= Date.now() ? "DAILY_REMINDER_SCHEDULED" : previous ? "FOLLOW_UP_REMINDER_RESCHEDULED" : "REMINDER_LOOP_ACTIVATED";
    await prismaClient.leadActivity.create({ data: { leadId: lead.id, action, previousValue: previous ? { scheduledFor: new Date(previous.scheduledFor).toISOString() } : null, newValue: { scheduledFor: scheduled.toISOString(), reminderDate: reminderDateKey }, createdById: lead.updatedById || lead.createdById } });
  }
  return inserted[0] || null;
}

async function sendDueReminder(reminder) {
  const claimed = await prisma.$queryRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'PROCESSING', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 AND "status" = 'PENDING' RETURNING *`, reminder.id);
  if (!claimed[0]) return;
  try {
    const lead = await prisma.lead.findFirst({ where: { id: reminder.leadId, deletedAt: null }, include: { assignedTo: { select: { id: true, fullName: true, role: true, active: true } }, branch: { select: { id: true, branchName: true, timezone: true, status: true, roleAccess: true } }, followUps: { orderBy: { createdAt: "desc" }, take: 1, select: { callStatus: true, createdAt: true } } } });
    if (!lead || !isReminderEligible(lead) || lead.assignedToId !== reminder.recipientUserId) {
      await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, reminder.id);
      return;
    }
    const timezone = lead.branch?.timezone || "Asia/Kolkata";
    const reminderDateKey = dateKey(reminder.dueDate);
    const todayKey = dateKeyInZone(new Date(), timezone);
    const leadDateKey = lead.nextFollowUpDate ? dateKey(lead.nextFollowUpDate) : "";
    const scheduledDateIsCurrent = Boolean(leadDateKey && leadDateKey === reminderDateKey);
    const reminderIsSuperseded = reminderDateKey > todayKey || (leadDateKey && leadDateKey > reminderDateKey);
    const expectedSchedule = scheduledDateIsCurrent && lead.nextFollowUpTime
      ? scheduledAtLocalTime(dateFromKey(reminderDateKey), lead.nextFollowUpTime, timezone)
      : scheduledFor(dateFromKey(reminderDateKey), timezone);
    if (reminderIsSuperseded || !expectedSchedule || expectedSchedule.getTime() !== new Date(reminder.scheduledFor).getTime()) {
      await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, reminder.id);
      return;
    }
    const isDaily = !scheduledDateIsCurrent;
    const isTimed = scheduledDateIsCurrent && Boolean(lead.nextFollowUpTime);
    const description = reminderDescription(isDaily ? "LEAD_FOLLOW_UP_DAILY" : "LEAD_FOLLOW_UP_REMINDER", lead.id, reminder.dueDate, isTimed ? lead.nextFollowUpTime : "");
    const existing = await prisma.notification.findFirst({ where: { kind: "LEAD_FOLLOW_UP_DUE", targetUserId: lead.assignedToId, requestDescription: description }, select: { id: true } });
    let notification = existing;
    if (!notification && isDaily) {
      const lastCallStatus = lead.lastCallStatus || lead.followUps[0]?.callStatus || "";
      const statusText = lastCallStatus ? ` Last call status: ${String(lastCallStatus).replaceAll("_", " ").toLowerCase()}.` : ` Current lead stage: ${String(lead.stage).toLowerCase()}.`;
      notification = await createNotification({ kind: "LEAD_FOLLOW_UP_DUE", tone: "blue", title: `Daily Follow-up Reminder — ${lead.studentName}`, message: `A follow-up is still due for ${lead.studentName} (${lead.leadId}).${statusText} Please contact the student and update the follow-up details.`, actionLabel: "View Lead", targetUserId: lead.assignedToId, targetBranchId: lead.branch?.id || null, targetBranchName: lead.branch?.branchName || null, requestDescription: description });
    }
    if (!notification && !isDaily) {
      const timeLabel = isTimed ? localTimeLabel(lead.nextFollowUpTime) : "";
      notification = await createNotification({ kind: "LEAD_FOLLOW_UP_DUE", tone: "blue", title: `Follow-up Reminder - ${lead.studentName}`, message: timeLabel ? `You scheduled a follow-up call with ${lead.studentName} (${lead.leadId}) for today at ${timeLabel}. Please contact the student and update the follow-up details.` : `You have a scheduled follow-up with ${lead.studentName} (${lead.leadId}) today. Please contact the student and update the follow-up details.`, actionLabel: "View Lead", targetUserId: lead.assignedToId, targetBranchId: lead.branch?.id || null, targetBranchName: lead.branch?.branchName || null, requestDescription: description });
    }
    await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'SENT', "notificationId" = $2, "deliveredAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, reminder.id, notification.id);
    await syncLeadFollowUpReminder(lead.id);
  } catch (error) {
    await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'PENDING', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, reminder.id).catch(() => {});
    throw error;
  }
}

async function createOverdueNotifications() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT r."id", r."status" AS "reminderStatus", l."id" AS "leadId", l."assignedToId" AS "recipientUserId", l."leadId" AS "displayLeadId", l."studentName", l."nextFollowUpDate", l."branchId", b."branchName", b."timezone"
    FROM "Lead" l JOIN "Branch" b ON b."id" = l."branchId"
    LEFT JOIN LATERAL (
      SELECT fr."id", fr."status"
      FROM "FollowUpReminder" fr
      WHERE fr."leadId" = l."id"
      ORDER BY fr."updatedAt" DESC
      LIMIT 1
    ) r ON TRUE
    WHERE l."deletedAt" IS NULL
      AND l."assignedToId" IS NOT NULL
      AND l."nextFollowUpDate"::date < (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(b."timezone", ''), 'Asia/Kolkata'))::date
      AND (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(NULLIF(b."timezone", ''), 'Asia/Kolkata'))::time >= TIME '09:00'
      AND l."stage" IN ('COLD', 'WARM') AND l."status" <> 'CONVERTED'
  `);
  for (const row of rows) {
    const description = `${reminderDescription("LEAD_FOLLOW_UP_OVERDUE", row.leadId, row.nextFollowUpDate)}:${encodeURIComponent(row.timezone || "Asia/Kolkata")}`;
    const legacyDescription = reminderDescription("LEAD_FOLLOW_UP_OVERDUE", row.leadId, row.nextFollowUpDate);
    const existing = await prisma.notification.findFirst({ where: { kind: "LEAD_FOLLOW_UP_OVERDUE", targetUserId: row.recipientUserId, requestDescription: { in: [description, legacyDescription] } }, select: { id: true } });
    if (!existing) {
      await createNotification({ kind: "LEAD_FOLLOW_UP_OVERDUE", tone: "amber", title: `Overdue follow-up — ${row.studentName}`, message: `The scheduled follow-up for ${row.studentName} (${row.displayLeadId}) is overdue. Please update the lead.`, actionLabel: "View Lead", targetUserId: row.recipientUserId, targetBranchId: row.branchId, targetBranchName: row.branchName, requestDescription: description });
    }
    if (row.id) await prisma.$executeRawUnsafe(`UPDATE "FollowUpReminder" SET "status" = 'OVERDUE', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1 AND "status" = 'SENT'`, row.id);
  }
}

async function createMonthlyReportNotifications() {
  const now = new Date();
  const localParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  if (localParts.day !== 1) return;
  const reportMonth = localParts.month === 1 ? 12 : localParts.month - 1;
  const reportYear = localParts.month === 1 ? localParts.year - 1 : localParts.year;
  const marker = `SALES_CRM_MONTHLY_REPORT:${reportYear}-${String(reportMonth).padStart(2, "0")}`;
  const admins = await prisma.user.findMany({ where: { active: true, OR: [{ role: "SALES_ADMIN" }, { role: "BRANCH_ADMIN", managedBranch: { status: "ACTIVE", roleAccess: "BRANCH_ADMIN_SALES_ADMIN" } }] }, select: { id: true, fullName: true, role: true, managedBranch: { select: { id: true, branchName: true } } } });
  for (const admin of admins) {
    const branchMarker = admin.managedBranch?.id ? `:${admin.managedBranch.id}` : "";
    const notificationMarker = `${marker}${branchMarker}`;
    const existing = await prisma.notification.findFirst({ where: { kind: "SALES_CRM_MONTHLY_REPORT", targetUserId: admin.id, requestDescription: notificationMarker }, select: { id: true } });
    if (existing) continue;
    await createNotification({ kind: "SALES_CRM_MONTHLY_REPORT", tone: "green", title: `${new Date(Date.UTC(reportYear, reportMonth - 1, 1)).toLocaleString("en-US", { month: "long" })} ${reportYear} — Sales CRM Monthly Report`, message: `Your monthly Sales CRM report is ready. View your new leads, conversions, and follow-up performance.`, actionLabel: "View Report", targetUserId: admin.id, targetBranchId: admin.managedBranch?.id || null, targetBranchName: admin.managedBranch?.branchName || null, requestDescription: notificationMarker });
  }
}

export async function reconcileLeadFollowUpReminders() {
  const unscheduled = await prisma.$queryRawUnsafe(`
    SELECT l."id" FROM "Lead" l
    JOIN "Branch" b ON b."id" = l."branchId" AND b."status" = 'ACTIVE'
    JOIN "User" u ON u."id" = l."assignedToId" AND u."role" = 'SALES_ADMIN' AND u."active" = TRUE
    WHERE l."deletedAt" IS NULL AND l."stage" IN ('COLD', 'WARM') AND l."status" <> 'CONVERTED'
      AND NOT EXISTS (SELECT 1 FROM "FollowUpReminder" r WHERE r."leadId" = l."id" AND r."status" IN ('PENDING', 'PROCESSING'))
    ORDER BY l."updatedAt" ASC LIMIT 500
  `);
  for (const lead of unscheduled) await syncLeadFollowUpReminder(lead.id).catch((error) => console.warn(`Lead reminder schedule recovery failed for ${lead.id}: ${error?.message || error}`));
  const due = await prisma.$queryRawUnsafe(`SELECT "id", "leadId", "recipientUserId", "dueDate", "scheduledFor" FROM "FollowUpReminder" WHERE "status" = 'PENDING' AND "scheduledFor" <= CURRENT_TIMESTAMP ORDER BY "scheduledFor" ASC LIMIT 100`);
  for (const reminder of due) {
    await sendDueReminder(reminder).catch((error) => console.warn(`Lead follow-up reminder failed for ${reminder.id}: ${error?.message || error}`));
  }
  await createOverdueNotifications().catch((error) => console.warn(`Lead overdue reminder sweep failed: ${error?.message || error}`));
  await createMonthlyReportNotifications().catch((error) => console.warn(`Sales CRM monthly report notification failed: ${error?.message || error}`));
}

export function startLeadFollowUpReminderScheduler() {
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    void reconcileLeadFollowUpReminders()
      .catch((error) => console.warn(`Lead follow-up reminder sweep failed: ${error?.message || error}`))
      .finally(() => { running = false; });
  };
  run();
  const timer = setInterval(run, SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
