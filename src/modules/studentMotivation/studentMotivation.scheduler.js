import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import { sendStudentMotivationEmail } from "../../common/services/resendEmail.js";
import { createNotification } from "../notifications/notifications.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const STAGES = ["MOTIVATION_MAIL_1", "MOTIVATION_MAIL_2", "MOTIVATION_MAIL_3"];
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function dateText(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(date);
}

function parseDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(text + "T00:00:00Z");
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, amount) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function normalizeWeekOff(value) {
  return String(value || "").trim().toLowerCase().replace(/day$/, "");
}

function isWorkingDay(date, student, holidayDates, leaveDates) {
  const value = dateText(date);
  const dayName = DAY_NAMES[date.getUTCDay()];
  const weekOff = normalizeWeekOff(student.weeklyOffDay);
  if (dayName === "sunday" || (weekOff && weekOff === dayName)) return false;
  if (holidayDates.has(value)) return false;
  if (leaveDates.has(value) || leaveDates.has(value + ":" + (student.batchId || ""))) return false;
  return true;
}

function countWorkingDays(startDate, endDate, student, holidayDates, leaveDates) {
  let count = 0;
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (isWorkingDay(cursor, student, holidayDates, leaveDates)) count += 1;
  }
  return count;
}

function getLatestAbsenceStreak(records = [], student, holidayDates, leaveDates, todayValue) {
  const sorted = [...records]
    .filter((record) => parseDate(record.attendanceDate))
    .sort((left, right) => left.attendanceDate.localeCompare(right.attendanceDate));
  if (!sorted.length) return null;

  const latest = sorted[sorted.length - 1];
  if (String(latest.status).toUpperCase() !== "ABSENT") return null;

  // Unmarked dates are ignored. A present record is the only event that
  // resets the absence run, so total absent records drive the mail stages.
  let lastPresentIndex = -1;
  for (let index = sorted.length - 2; index >= 0; index -= 1) {
    if (String(sorted[index].status).toUpperCase() === "PRESENT") {
      lastPresentIndex = index;
      break;
    }
  }
  const absenceRecords = sorted
    .slice(lastPresentIndex + 1)
    .filter((record) => String(record.status).toUpperCase() === "ABSENT");
  if (!absenceRecords.length) return null;
  return {
    startDate: absenceRecords[0].attendanceDate,
    endDate: latest.attendanceDate,
    absenceCount: absenceRecords.length,
  };
}
function buildHolidayDates(holidays = [], branchId) {
  return new Set(
    holidays
      .filter((item) => !item.branchId || item.branchId === branchId)
      .map((item) => item.holidayDate),
  );
}

function buildLeaveDates(leaves = [], branchId) {
  const result = new Set();
  leaves
    .filter((item) => item.branchId === branchId)
    .forEach((item) => {
      result.add(item.leaveDate);
      if (item.batchId) result.add(item.leaveDate + ":" + item.batchId);
    });
  return result;
}

function stageForDays(days) {
  const thresholds = config.motivationMailThresholds;
  let stageIndex = -1;
  thresholds.forEach((threshold, index) => {
    if (days >= threshold) stageIndex = index;
  });
  return stageIndex >= 0 ? { stage: STAGES[stageIndex] } : null;
}

async function createBranchFollowUpNotification(student, branch, absenceStartDate, absenceWorkingDays) {
  if (!branch?.id) return false;
  // Repair the request if an earlier motivation-mail run sent the mail but
  // failed before the discontinuation request was persisted.
  await ensureMotivationDiscontinuationRequest(student, absenceStartDate, absenceWorkingDays);
  const requestDescription = "MOTIVATION_FOLLOW_UP:" + student.id + ":" + absenceStartDate;
  const existing = await prisma.notification.findFirst({
    where: {
      kind: "STUDENT_MOTIVATION",
      targetBranchId: branch.id,
      requestDescription,
    },
    select: { id: true },
  });
  if (existing) return false;

  await createNotification({
    kind: "STUDENT_MOTIVATION",
    tone: "red",
    title: "Student long absence follow-up required",
    message: student.studentName + " has reached " + absenceWorkingDays + " working days of consecutive absence. Please contact the student and record the outcome.",
    actionLabel: "Review student",
    targetUserId: branch.adminUserId || null,
    targetBranchId: branch.id,
    targetBranchEmail: branch.branchEmail,
    targetBranchName: branch.branchName,
    batchId: student.batchId || null,
    requestDescription,
    createdBy: "SYSTEM",
  });
  return true;
}

function amount(value) {
  const parsed = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

async function motivationFinancialSnapshot(student) {
  const course = student.courseId ? await prisma.branchCourse.findUnique({
    where: { id: student.courseId },
    select: { actualFees: true, registrationFees: true, discount: true, afterDiscount: true },
  }) : null;
  const installmentTotal = (student.installments || []).reduce((sum, item) => sum + amount(item.amount), 0);
  const installmentPaid = (student.installments || []).reduce((sum, item) => sum + amount(item.amountPaid), 0);
  const paymentTotal = (student.payments || []).reduce((sum, item) => sum + amount(item.amount), 0);
  const actualCourseAmount = amount(course?.actualFees || student.courseAmount);
  const registrationFee = amount(course?.registrationFees);
  const discount = Math.min(amount(course?.discount), actualCourseAmount);
  const finalCourseFee = Math.max(amount(course?.afterDiscount) || actualCourseAmount - discount, 0);
  const gstAmount = Math.round((actualCourseAmount * 18) / 118);
  const totalCourseFee = installmentTotal || finalCourseFee;
  const totalPaid = paymentTotal || installmentPaid;
  const courseProgress = Math.min(Math.max(amount(student.courseProgress), 0), 100);
  const completedCourseAmount = Math.round(finalCourseFee * (courseProgress / 100));
  const payableBeforeDiscontinuation = gstAmount + registrationFee + completedCourseAmount;
  const balanceDue = Math.max(totalCourseFee - totalPaid, 0);
  const eligibleAmount = Math.max(payableBeforeDiscontinuation - totalPaid, 0);
  const refundEligibleAmount = Math.max(totalPaid - payableBeforeDiscontinuation, 0);
  return {
    courseProgress,
    progressEarnedAmount: completedCourseAmount,
    balanceDue,
    totalCourseFee,
    actualCourseAmount,
    gstAmount,
    registrationFee,
    discountAmount: discount,
    finalCourseFee,
    completedCourseAmount,
    totalPaid,
    outstandingAmount: eligibleAmount,
    refundEligibleAmount,
    waiverAmount: 0,
    finalOutstandingAmount: eligibleAmount,
    settlementStatus: refundEligibleAmount > 0 ? "REFUND_PENDING" : eligibleAmount > 0 ? "SETTLEMENT_PENDING" : "SETTLED",
  };
}
async function ensureMotivationDiscontinuationRequest(student, absenceStartDate, absenceWorkingDays) {
  const existing = await prisma.studentDiscontinuationRequest.findFirst({
    where: {
      branchStudentId: student.id,
      reason: "Long absence follow-up after motivation email",
      status: { in: ["PENDING", "SUPER_ADMIN_REVIEW"] },
    },
    select: { id: true },
  });
  const snapshot = await motivationFinancialSnapshot(student);
  if (existing) {
    await prisma.studentDiscontinuationRequest.update({
      where: { id: existing.id },
      data: snapshot,
    });
    return false;
  }

  await prisma.studentDiscontinuationRequest.create({
    data: {
      branchStudentId: student.id,
      branchId: student.branchId,
      reason: "Long absence follow-up after motivation email",
      details: "Motivation email follow-up started after " + absenceWorkingDays + " working days of consecutive absence (from " + absenceStartDate + ").",
      ...snapshot,
      status: "PENDING",
    },
  });
  return true;
}

async function clearMotivationDiscontinuationRequest(studentId) {
  const result = await prisma.studentDiscontinuationRequest.updateMany({
    where: {
      branchStudentId: studentId,
      reason: "Long absence follow-up after motivation email",
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
      contactNotes: "Automatically closed because the student was marked present.",
      updatedAt: new Date(),
    },
  });
  return result.count;
}
async function processStudent(student, today, holidays, leaves) {
  const holidayDates = buildHolidayDates(holidays, student.branchId);
  const leaveDates = buildLeaveDates(leaves, student.branchId);
  const streak = getLatestAbsenceStreak(
    student.calendarAttendanceRecords,
    student,
    holidayDates,
    leaveDates,
    today,
  );
  if (!streak) {
    await clearMotivationDiscontinuationRequest(student.id);
    return { scanned: 1, sent: 0, failed: 0, notified: 0 };
  }
  const startDate = parseDate(streak.startDate);
  if (!startDate) return { scanned: 1, sent: 0, failed: 0, notified: 0 };
  const absenceWorkingDays = streak.absenceCount;
  const stageData = stageForDays(absenceWorkingDays);
  if (!stageData) return { scanned: 1, sent: 0, failed: 0, notified: 0 };

  let sent = 0;
  let failed = 0;
  for (let index = 0; index <= STAGES.indexOf(stageData.stage); index += 1) {
    const stage = STAGES[index];
    const existing = await prisma.motivationMailHistory.findUnique({
      where: {
        branchStudentId_absenceStartDate_stage: {
          branchStudentId: student.id,
          absenceStartDate: streak.startDate,
          stage,
        },
      },
    });
    if (existing?.status === "SENT") {
      if (stage === STAGES[0]) await ensureMotivationDiscontinuationRequest(student, streak.startDate, absenceWorkingDays);
      continue;
    }

    try {
      await sendStudentMotivationEmail({
        to: student.emailAddress,
        fullName: student.studentName,
        studentId: student.studentId,
        courseName: student.courseName,
        absenceWorkingDays,
        stage: stage.replaceAll("_", " "),
      });
      await prisma.motivationMailHistory.upsert({
        where: {
          branchStudentId_absenceStartDate_stage: {
            branchStudentId: student.id,
            absenceStartDate: streak.startDate,
            stage,
          },
        },
        create: {
          branchStudentId: student.id,
          branchId: student.branchId,
          stage,
          absenceStartDate: streak.startDate,
          absenceWorkingDays,
          status: "SENT",
        },
        update: { absenceWorkingDays, status: "SENT", sentAt: new Date(), failureReason: null },
      });
      sent += 1;
      if (stage === STAGES[0]) await ensureMotivationDiscontinuationRequest(student, streak.startDate, absenceWorkingDays);
    } catch (error) {
      failed += 1;
      await prisma.motivationMailHistory.upsert({
        where: {
          branchStudentId_absenceStartDate_stage: {
            branchStudentId: student.id,
            absenceStartDate: streak.startDate,
            stage,
          },
        },
        create: {
          branchStudentId: student.id,
          branchId: student.branchId,
          stage,
          absenceStartDate: streak.startDate,
          absenceWorkingDays,
          status: "FAILED",
          failureReason: String(error?.message || error).slice(0, 500),
        },
        update: {
          absenceWorkingDays,
          status: "FAILED",
          failureReason: String(error?.message || error).slice(0, 500),
        },
      });
      console.warn("Motivation mail " + stage + " failed for " + student.id + ":", error?.message || error);
      break;
    }
  }

  const notified = absenceWorkingDays >= config.motivationMailThresholds[2]
    ? await createBranchFollowUpNotification(student, student.branch, streak.startDate, absenceWorkingDays)
    : false;
  return { scanned: 1, sent, failed, notified: notified ? 1 : 0 };
}

export async function runStudentMotivationSweep({ today = dateText(new Date()) } = {}) {
  const todayDate = parseDate(today);
  if (!todayDate) throw new Error("Invalid motivation sweep date");

  const students = await prisma.branchStudent.findMany({
    where: {
      recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } },
      emailAddress: { not: "" },
      calendarAttendanceRecords: { some: { status: "ABSENT" } },
    },
    include: {
      branch: { select: { id: true, branchName: true, branchEmail: true, adminUserId: true } },
      calendarAttendanceRecords: {
        orderBy: { attendanceDate: "asc" },
        select: { attendanceDate: true, status: true },
      },
      installments: { select: { amount: true, amountPaid: true } },
      payments: { select: { amount: true } },
    },
  });
  const branchIds = [...new Set(students.map((student) => student.branchId))];
  const [holidays, leaves] = await Promise.all([
    prisma.branchCalendarHoliday.findMany({
      where: { status: "ACTIVE", OR: [{ branchId: null }, { branchId: { in: branchIds } }] },
      select: { branchId: true, holidayDate: true },
    }),
    prisma.branchCalendarLeave.findMany({
      where: { status: "ACTIVE", branchId: { in: branchIds } },
      select: { branchId: true, batchId: true, leaveDate: true },
    }),
  ]);

  const summary = { scanned: 0, sent: 0, failed: 0, notified: 0 };
  for (const student of students) {
    const result = await processStudent(student, todayDate, holidays, leaves);
    summary.scanned += result.scanned;
    summary.sent += result.sent;
    summary.failed += result.failed;
    summary.notified += result.notified;
  }
  return summary;
}

export function startStudentMotivationScheduler() {
  const runSweep = () => {
    void runStudentMotivationSweep().catch((error) => {
      console.warn("Student motivation sweep failed", error);
    });
  };
  runSweep();
  const timer = setInterval(runSweep, config.motivationMailSweepIntervalMs);
  timer.unref?.();
  return timer;
}
