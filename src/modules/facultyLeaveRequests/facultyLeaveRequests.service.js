import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createFacultyLeaveRequestChangeNotification, createFacultyLeaveRequestNotification } from "../notifications/notifications.service.js";

const LEAVE_TYPES = new Set(["PLANNED", "UNPLANNED", "EMERGENCY"]);
const DURATIONS = new Set(["FULL_DAY", "HALF_DAY", "PERMISSION"]);
const FULL_DAY_DURATION_MINUTES = 10 * 60;
const MAX_HALF_DAY_DURATION_MINUTES = FULL_DAY_DURATION_MINUTES / 2;

function text(value) {
  return String(value ?? "").trim();
}

function parseDate(value, field) {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError(`${field} must be a valid date`, 400);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) throw new AppError(`${field} must be a valid date`, 400);
  return date;
}

function parseTime(value) {
  const match = text(value).match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > 23) return null;
  if (match[3]) {
    const period = match[3].toUpperCase();
    if (hour < 1 || hour > 12) return null;
    if (period === "AM" && hour === 12) hour = 0;
    if (period === "PM" && hour !== 12) hour += 12;
  }
  return hour * 60 + minute;
}

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60) % 24;
  return `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function dateRange(fromDate, toDate) {
  const result = [];
  for (let cursor = new Date(`${fromDate}T00:00:00Z`); cursor <= new Date(`${toDate}T00:00:00Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    result.push(cursor.toISOString().slice(0, 10));
  }
  return result;
}

function dateCount(fromDate, toDate) {
  return Math.round((new Date(`${toDate}T00:00:00Z`) - new Date(`${fromDate}T00:00:00Z`)) / 86400000) + 1;
}

function overlaps(start, end, windowStart, windowEnd) {
  return start != null && end != null && start < windowEnd && end > windowStart;
}

function batchRunsOnDate(batch, date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const type = text(batch.weekType).toUpperCase();
  if (type === "WEEKDAY") return day >= 1 && day <= 5;
  if (type === "WEEKEND") return day === 0 || day === 6;
  return true;
}

function batchIsInCourseWindow(batch, date) {
  const start = text(batch.courseStartDate);
  const end = text(batch.courseEndDate);
  return (!start || date >= start) && (!end || date <= end);
}

function serializeBatch(batch, date, leave) {
  const startTime = text(batch.startTime);
  const endTime = text(batch.endTime);
  return {
    date,
    batchRecordId: batch.id,
    batchId: batch.batchId,
    batchName: batch.batchName,
    courseId: batch.courseId,
    courseName: batch.courseName,
    startTime,
    endTime,
    batchTiming: batch.batchTiming,
    durationType: leave.durationType,
    halfDayPeriod: null,
    halfDayStart: leave.halfDayStart || null,
    halfDayEnd: leave.halfDayEnd || null,
    permissionHours: leave.permissionHours || null,
    permissionStart: leave.permissionStart || null,
    permissionEnd: leave.permissionEnd || null,
  };
}

async function resolveFacultyContext(user) {
  const email = text(user?.email).toLowerCase();
  const userCode = text(user?.userCode);
  const faculty = await prisma.branchFaculty.findFirst({
    where: {
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : []),
        ...(userCode ? [{ facultyId: { equals: userCode, mode: "insensitive" } }] : []),
      ],
      status: "ACTIVE",
    },
    include: { branch: { select: { id: true, branchId: true, branchName: true } } },
  });
  if (!faculty) throw new AppError("Active faculty profile not found", 404);
  return faculty;
}

function validatePayload(payload = {}) {
  const leaveType = text(payload.leaveType).toUpperCase();
  const durationType = text(payload.durationType).toUpperCase();
  const halfDayStart = text(payload.halfDayStart) || null;
  const halfDayEnd = text(payload.halfDayEnd) || null;
  let permissionHours = payload.permissionHours == null || payload.permissionHours === "" ? null : Number(payload.permissionHours);
  let permissionStart = text(payload.permissionStart) || null;
  const permissionEndInput = text(payload.permissionEnd) || null;
  const fromDate = parseDate(payload.fromDate, "From date");
  const toDate = parseDate(payload.toDate, "To date");
  if (!LEAVE_TYPES.has(leaveType)) throw new AppError("Select a valid leave type", 400);
  if (!DURATIONS.has(durationType)) throw new AppError("Select a valid leave duration", 400);
  if (toDate < fromDate) throw new AppError("To date cannot be before from date", 400);
  const durationDays = durationType === "FULL_DAY" ? dateCount(fromDate, toDate) : null;
  if (durationType === "PERMISSION" && toDate !== fromDate) throw new AppError("Permission leave must use one date", 400);
  if (durationType === "HALF_DAY") {
    const startMinutes = parseTime(halfDayStart);
    const endMinutes = parseTime(halfDayEnd);
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) throw new AppError("Select a valid half-day start and end time", 400);
    if (endMinutes - startMinutes > MAX_HALF_DAY_DURATION_MINUTES) throw new AppError("Half-day leave cannot exceed 5 hours", 400);
  } else if (halfDayStart || halfDayEnd || payload.halfDayPeriod) {
    throw new AppError("Half-day times are only valid for half-day leave", 400);
  }
  let permissionEnd = null;
  if (durationType === "PERMISSION") {
    const startMinutes = parseTime(permissionStart);
    const endMinutes = parseTime(permissionEndInput);
    if (startMinutes == null || endMinutes == null) throw new AppError("Select valid permission start and end times", 400);
    if (endMinutes <= startMinutes) throw new AppError("Permission end time must be after start time", 400);
    permissionEnd = formatTime(endMinutes);
    const calculatedHours = (endMinutes - startMinutes) / 60;
    if (!Number.isFinite(calculatedHours) || calculatedHours <= 0) throw new AppError("Select a valid permission time range", 400);
    if (permissionHours != null && permissionHours !== calculatedHours) throw new AppError("Permission total hours do not match the selected times", 400);
    permissionHours = calculatedHours;
    permissionStart = formatTime(startMinutes);
  } else if (permissionHours != null || permissionStart || permissionEndInput) {
    throw new AppError("Permission duration and time are only valid for permission leave", 400);
  }
  const reason = text(payload.reason);
  if (!reason) throw new AppError("Reason is required", 400);
  if (reason.length > 1000) throw new AppError("Reason cannot exceed 1000 characters", 400);
  return { leaveType, durationType, durationDays, halfDayPeriod: null, halfDayStart: durationType === "HALF_DAY" ? halfDayStart : null, halfDayEnd: durationType === "HALF_DAY" ? halfDayEnd : null, permissionHours: durationType === "PERMISSION" ? permissionHours : null, permissionStart: durationType === "PERMISSION" ? permissionStart : null, permissionEnd, fromDate, toDate, reason };
}

async function calculateAffectedClasses(branchId, facultyId, leave) {
  const batches = await prisma.branchBatch.findMany({
    where: { branchId, facultyId, status: "ACTIVE" },
    orderBy: [{ courseName: "asc" }, { batchName: "asc" }],
    select: { id: true, batchId: true, batchName: true, courseId: true, courseName: true, startTime: true, endTime: true, batchTiming: true, weekType: true, courseStartDate: true, courseEndDate: true },
  });
  const affected = [];
  for (const date of dateRange(leave.fromDate, leave.toDate)) {
    for (const batch of batches) {
      if (!batchRunsOnDate(batch, date) || !batchIsInCourseWindow(batch, date)) continue;
      if (leave.durationType === "FULL_DAY") {
        affected.push(serializeBatch(batch, date, leave));
        continue;
      }
      const window = leave.durationType === "PERMISSION"
        ? { start: leave.permissionStart, end: leave.permissionEnd }
        : { start: leave.halfDayStart, end: leave.halfDayEnd };
      if (overlaps(parseTime(batch.startTime), parseTime(batch.endTime), parseTime(window.start), parseTime(window.end))) {
        affected.push(serializeBatch(batch, date, leave));
      }
    }
  }
  return affected;
}

function mapRequest(item) {
  return { ...item, affectedClassCount: Array.isArray(item.affectedClasses) ? item.affectedClasses.length : 0 };
}

function displayTime(value) {
  const minutes = parseTime(value);
  if (minutes == null) return text(value) || "-";
  const hour = Math.floor(minutes / 60) % 24;
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function leaveChanges(previous, next) {
  const changes = [];
  if (previous.fromDate !== next.fromDate || previous.toDate !== next.toDate) changes.push(`Date changed: ${previous.fromDate}${previous.fromDate !== previous.toDate ? ` - ${previous.toDate}` : ""} → ${next.fromDate}${next.fromDate !== next.toDate ? ` - ${next.toDate}` : ""}`);
  if (previous.durationType !== next.durationType) changes.push(`Day Type changed: ${previous.durationType} → ${next.durationType}`);
  const previousStart = previous.permissionStart || previous.halfDayStart;
  const previousEnd = previous.permissionEnd || previous.halfDayEnd;
  const nextStart = next.permissionStart || next.halfDayStart;
  const nextEnd = next.permissionEnd || next.halfDayEnd;
  if (previousStart !== nextStart || previousEnd !== nextEnd) changes.push(`Time changed: ${displayTime(previousStart)}-${displayTime(previousEnd)} → ${displayTime(nextStart)}-${displayTime(nextEnd)}`);
  if (previous.leaveType !== next.leaveType) changes.push(`Leave Type changed: ${previous.leaveType} → ${next.leaveType}`);
  if (previous.reason !== next.reason) changes.push("Reason changed");
  return changes;
}

export async function listMyFacultyLeaveRequests(user) {
  await resolveFacultyContext(user);
  const rows = await prisma.facultyLeaveRequest.findMany({ where: { facultyUserId: user.id }, orderBy: { createdAt: "desc" } });
  return { requests: rows.map(mapRequest) };
}

export async function listMyFacultySchedule(user) {
  const faculty = await resolveFacultyContext(user);
  const batches = await prisma.branchBatch.findMany({
    where: { branchId: faculty.branchId, facultyId: faculty.facultyId, status: "ACTIVE" },
    orderBy: [{ startTime: "asc" }, { batchName: "asc" }],
    select: { id: true, batchName: true, batchTiming: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true },
  });
  const slots = [];
  const seen = new Set();
  for (const batch of batches) {
    const start = text(batch.startTime);
    const end = text(batch.endTime);
    const startMinutes = parseTime(`${start} ${text(batch.startPeriod)}`);
    const endMinutes = parseTime(`${end} ${text(batch.endPeriod)}`);
    if (!start || !end || startMinutes == null || endMinutes == null || endMinutes <= startMinutes) continue;
    const key = `${start}|${end}|${batch.startPeriod}|${batch.endPeriod}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push({ id: key, batchName: batch.batchName, batchTiming: batch.batchTiming, startTime: start, startPeriod: batch.startPeriod, endTime: end, endPeriod: batch.endPeriod, durationMinutes: endMinutes - startMinutes });
  }
  return { slots };
}

export async function createFacultyLeaveRequest(user, payload) {
  const faculty = await resolveFacultyContext(user);
  const leave = validatePayload(payload);
  const overlap = await prisma.facultyLeaveRequest.findFirst({
    where: { facultyUserId: user.id, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: leave.toDate }, toDate: { gte: leave.fromDate } },
    select: { id: true },
  });
  if (overlap) throw new AppError("You already have a pending or approved leave request for this date range", 409);
  const affectedClasses = await calculateAffectedClasses(faculty.branchId, faculty.facultyId, leave);
  const created = await prisma.facultyLeaveRequest.create({
    data: {
      facultyUserId: user.id, branchId: faculty.branchId, facultyId: faculty.facultyId,
      facultyName: faculty.name, facultyEmail: faculty.email, ...leave,
      halfDayStart: leave.halfDayStart,
      halfDayEnd: leave.halfDayEnd,
      permissionHours: leave.permissionHours,
      permissionStart: leave.permissionStart,
      permissionEnd: leave.permissionEnd,
      affectedClasses,
    },
  });
  try {
    await createFacultyLeaveRequestNotification({ request: created, branch: faculty.branch, faculty });
  } catch (error) {
    // The leave request remains valid even if notification persistence is temporarily unavailable.
    console.warn("Faculty leave request notification failed to save", error);
  }
  return mapRequest(created);
}

export async function updateFacultyLeaveRequest(user, requestId, payload) {
  const faculty = await resolveFacultyContext(user);
  const existing = await prisma.facultyLeaveRequest.findFirst({ where: { id: requestId, facultyUserId: user.id } });
  if (!existing) throw new AppError("Leave request not found", 404);
  if (existing.status !== "PENDING") throw new AppError("Only pending leave requests can be edited", 409);
  const leave = validatePayload(payload);
  const overlap = await prisma.facultyLeaveRequest.findFirst({
    where: { id: { not: requestId }, facultyUserId: user.id, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: leave.toDate }, toDate: { gte: leave.fromDate } },
    select: { id: true },
  });
  if (overlap) throw new AppError("You already have a pending or approved leave request for this date range", 409);
  const affectedClasses = await calculateAffectedClasses(faculty.branchId, faculty.facultyId, leave);
  const updated = await prisma.facultyLeaveRequest.update({
    where: { id: requestId },
    data: { ...leave, affectedClasses, status: "PENDING", cancelledAt: null },
  });
  try {
    await createFacultyLeaveRequestChangeNotification({ request: updated, branch: faculty.branch, faculty, action: "edited", changes: leaveChanges(existing, updated) });
  } catch (error) {
    console.warn("Faculty leave edit notification failed to save", error);
  }
  return mapRequest(updated);
}

export async function cancelFacultyLeaveRequest(user, requestId) {
  const faculty = await resolveFacultyContext(user);
  const existing = await prisma.facultyLeaveRequest.findFirst({ where: { id: requestId, facultyUserId: user.id } });
  if (!existing) throw new AppError("Leave request not found", 404);
  if (existing.status !== "PENDING") throw new AppError("Only pending leave requests can be cancelled", 409);
  const cancelled = await prisma.facultyLeaveRequest.update({ where: { id: requestId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  try {
    await createFacultyLeaveRequestChangeNotification({ request: cancelled, branch: faculty.branch, faculty, action: "cancelled" });
  } catch (error) {
    console.warn("Faculty leave cancellation notification failed to save", error);
  }
  return mapRequest(cancelled);
}

export async function listBranchFacultyLeaveRequests(user, query = {}) {
  const branchId = user?.impersonatedBranchId || (await prisma.branch.findFirst({ where: { adminUserId: user.id }, select: { id: true } }))?.id;
  if (!branchId) throw new AppError("Branch profile not found", 404);
  const status = text(query.status).toUpperCase();
  const rows = await prisma.facultyLeaveRequest.findMany({ where: { branchId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" } });
  return { requests: rows.map(mapRequest) };
}

export { FULL_DAY_DURATION_MINUTES, MAX_HALF_DAY_DURATION_MINUTES };
