import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const LEAVE_TYPES = new Set(["PLANNED", "UNPLANNED", "EMERGENCY"]);
const DURATIONS = new Set(["FULL_DAY", "HALF_DAY"]);
const PERIODS = new Set(["MORNING", "AFTERNOON"]);

// One source of truth until the product has branch-level working-hour settings.
const HALF_DAY_WINDOWS = {
  MORNING: { start: "09:00", end: "13:00" },
  AFTERNOON: { start: "14:00", end: "18:00" },
};

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

function dateRange(fromDate, toDate) {
  const result = [];
  for (let cursor = new Date(`${fromDate}T00:00:00Z`); cursor <= new Date(`${toDate}T00:00:00Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    result.push(cursor.toISOString().slice(0, 10));
  }
  return result;
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
    halfDayPeriod: leave.halfDayPeriod || null,
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
  const halfDayPeriod = text(payload.halfDayPeriod).toUpperCase() || null;
  const fromDate = parseDate(payload.fromDate, "From date");
  const toDate = parseDate(payload.toDate, "To date");
  if (!LEAVE_TYPES.has(leaveType)) throw new AppError("Select a valid leave type", 400);
  if (!DURATIONS.has(durationType)) throw new AppError("Select a valid leave duration", 400);
  if (toDate < fromDate) throw new AppError("To date cannot be before from date", 400);
  if (durationType === "FULL_DAY" && halfDayPeriod) throw new AppError("Full-day leave cannot have a half-day period", 400);
  if (durationType === "HALF_DAY" && !PERIODS.has(halfDayPeriod)) throw new AppError("Select Morning or Afternoon for half-day leave", 400);
  const reason = text(payload.reason);
  if (!reason) throw new AppError("Reason is required", 400);
  if (reason.length > 1000) throw new AppError("Reason cannot exceed 1000 characters", 400);
  return { leaveType, durationType, halfDayPeriod, fromDate, toDate, reason };
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
      const window = HALF_DAY_WINDOWS[leave.halfDayPeriod];
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

export async function listMyFacultyLeaveRequests(user) {
  await resolveFacultyContext(user);
  const rows = await prisma.facultyLeaveRequest.findMany({ where: { facultyUserId: user.id }, orderBy: { createdAt: "desc" } });
  return { requests: rows.map(mapRequest) };
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
      halfDayStart: leave.halfDayPeriod ? HALF_DAY_WINDOWS[leave.halfDayPeriod].start : null,
      halfDayEnd: leave.halfDayPeriod ? HALF_DAY_WINDOWS[leave.halfDayPeriod].end : null,
      affectedClasses,
    },
  });
  return mapRequest(created);
}

export async function listBranchFacultyLeaveRequests(user, query = {}) {
  const branchId = user?.impersonatedBranchId || (await prisma.branch.findFirst({ where: { adminUserId: user.id }, select: { id: true } }))?.id;
  if (!branchId) throw new AppError("Branch profile not found", 404);
  const status = text(query.status).toUpperCase();
  const rows = await prisma.facultyLeaveRequest.findMany({ where: { branchId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" } });
  return { requests: rows.map(mapRequest) };
}

export { HALF_DAY_WINDOWS };
