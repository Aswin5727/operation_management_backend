import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const TIME_ZONE = "Asia/Kolkata";
const APPROVED = "APPROVED";

function text(value) { return String(value ?? "").trim(); }
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date()); }
function minutes(value) {
  const match = text(value).match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]); const minute = Number(match[2]); const period = text(match[3]).toUpperCase();
  if (period) { if (hour < 1 || hour > 12) return null; if (period === "AM" && hour === 12) hour = 0; if (period === "PM" && hour !== 12) hour += 12; }
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}
function currentMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "hour")?.value || 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value || 0);
}
function approvedWindow(record) {
  const isHalfDay = text(record.durationType).toUpperCase() === "HALF_DAY";
  const start = minutes(isHalfDay ? record.halfDayStart : record.permissionStart);
  const end = minutes(isHalfDay ? record.halfDayEnd : record.permissionEnd);
  if (start == null || end == null || end <= start) return null;
  return { type: isHalfDay ? "HALF_DAY" : "PERMISSION", start, end, startTime: isHalfDay ? record.halfDayStart : record.permissionStart, endTime: isHalfDay ? record.halfDayEnd : record.permissionEnd, reason: record.reason || "" };
}
async function findApprovedInterruptions(userId, date) {
  const rows = await prisma.facultyLeaveRequest.findMany({ where: { facultyUserId: userId, fromDate: { lte: date }, toDate: { gte: date }, status: APPROVED, durationType: { in: ["HALF_DAY", "PERMISSION"] } }, orderBy: { createdAt: "asc" } });
  return rows.map((row) => ({ row, window: approvedWindow(row) })).filter((item) => item.window);
}
async function sessions(userId, date) { return prisma.facultyAttendanceSession.findMany({ where: { facultyUserId: userId, attendanceDate: date, sessionSource: "ATTENDANCE" }, orderBy: [{ loginAt: "asc" }, { createdAt: "asc" }] }); }
function activeSession(rows) { return [...rows].reverse().find((row) => !row.logoutAt) || null; }
function interruptionState(rows, records, nowValue) {
  const open = activeSession(rows); if (!open) return null;
  const latestLogin = new Date(open.loginAt).getTime();
  const current = records.find(({ window }) => nowValue >= window.start && nowValue < window.end && latestLogin <= Date.now());
  return current || null;
}
function latestEndedNeedsLogin(rows, records, nowValue) {
  const latest = rows[rows.length - 1]; if (!latest || latest.logoutAt) return false;
  const ended = records.some(({ window }) => nowValue >= window.end && new Date(latest.loginAt).getTime() < Date.now() && window.end <= nowValue);
  if (!ended) return false;
  const lastEnd = Math.max(...records.filter(({ window }) => nowValue >= window.end).map(({ window }) => window.end));
  const loginDate = new Date(latest.loginAt);
  const loginMinute = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(loginDate).replace(":", "."));
  return loginMinute < lastEnd;
}
function dateTimeForMinutes(date, value) { const [year, month, day] = date.split("-").map(Number); const hour = Math.floor(value / 60); const minute = value % 60; return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30)); }
function workingSeconds(rows, records) {
  const now = Date.now();
  return rows.reduce((total, row) => {
    const start = new Date(row.loginAt).getTime(); const end = row.logoutAt ? new Date(row.logoutAt).getTime() : now;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return total;
    let value = Math.max(0, end - start);
    records.forEach(({ window }) => {
      const pauseStart = dateTimeForMinutes(row.attendanceDate, window.start).getTime(); const pauseEnd = dateTimeForMinutes(row.attendanceDate, window.end).getTime();
      value -= Math.max(0, Math.min(end, pauseEnd) - Math.max(start, pauseStart));
    });
    return total + Math.max(0, Math.floor(value / 1000));
  }, 0);
}
function serializeInterruption(item) { return item ? { interruptionType: item.window.type, interruptionStartTime: item.window.startTime, interruptionEndTime: item.window.endTime, interruptionReason: item.window.reason } : { interruptionType: "NONE", interruptionStartTime: null, interruptionEndTime: null, interruptionReason: "" }; }

async function buildFacultyAttendanceStatus(user, persist = true) {
  const date = today(); const rows = await sessions(user.id, date); const records = await findApprovedInterruptions(user.id, date); const nowValue = currentMinutes(); const open = activeSession(rows); const active = interruptionState(rows, records, nowValue);
  const loginRequired = Boolean(open && !active && latestEndedNeedsLogin(rows, records, nowValue));
  const status = rows.length && !open ? "LOGGED_OUT" : active ? "ON_PERMISSION" : loginRequired ? "LOGIN_REQUIRED" : open ? "LOGGED_IN" : "NOT_LOGGED_IN";
  const interruption = active || (loginRequired ? records.filter(({ window }) => nowValue >= window.end).sort((a, b) => b.window.end - a.window.end)[0] : null);
  const interruptionData = serializeInterruption(interruption);
  const remainingSeconds = active ? Math.max(0, (active.window.end - nowValue) * 60) : 0;
  const firstLoginAt = rows[0]?.loginAt || null;
  const finalLogoutAt = status === "LOGGED_OUT" ? rows[rows.length - 1]?.logoutAt || null : null;
  if (persist) {
    await prisma.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: user.id, attendanceDate: date } }, create: { facultyUserId: user.id, attendanceDate: date, status, firstLoginAt, finalLogoutAt }, update: { status, firstLoginAt, finalLogoutAt } });
  }
  return { status, faculty: { id: user.id, name: user.fullName, facultyId: user.userCode }, attendanceDate: date, currentServerTime: new Date().toISOString(), firstLoginAt, finalLogoutAt, currentSession: open, workingSeconds: workingSeconds(rows, records), remainingSeconds, ...interruptionData, canLogin: status === "NOT_LOGGED_IN" || status === "LOGIN_REQUIRED", canLogout: status === "LOGGED_IN" };
}

export async function getFacultyAttendanceStatus(user) {
  return buildFacultyAttendanceStatus(user);
}

export async function getBranchFacultyAttendanceStatus(actor, facultyReference) {
  const branch = await getCurrentBranchProfile(actor);
  if (!branch?.id) throw new AppError("Branch profile not found.", 404);

  const reference = text(facultyReference);
  if (!reference) throw new AppError("Faculty reference is required.", 400);

  const branchFaculty = await prisma.branchFaculty.findFirst({
    where: {
      branchId: branch.id,
      OR: [{ id: reference }, { facultyId: reference }],
    },
    select: { facultyId: true, email: true, name: true },
  });
  if (!branchFaculty) throw new AppError("Faculty not found in this branch.", 404);

  const facultyUser = await prisma.user.findFirst({
    where: {
      role: "FACULTY",
      active: true,
      OR: [
        { userCode: branchFaculty.facultyId },
        { email: { equals: branchFaculty.email, mode: "insensitive" } },
      ],
    },
  });
  if (!facultyUser) {
    return {
      status: "NOT_LOGGED_IN",
      faculty: { id: null, name: branchFaculty.name, facultyId: branchFaculty.facultyId },
      attendanceDate: today(),
      currentServerTime: new Date().toISOString(),
      firstLoginAt: null,
      finalLogoutAt: null,
      currentSession: null,
      workingSeconds: 0,
      remainingSeconds: 0,
      interruptionType: "NONE",
      interruptionStartTime: null,
      interruptionEndTime: null,
      interruptionReason: "",
      canLogin: false,
      canLogout: false,
    };
  }

  return buildFacultyAttendanceStatus(facultyUser, false);
}
export async function facultyAttendanceLogin(user) {
  const state = await getFacultyAttendanceStatus(user);
  if (!state.canLogin) throw new AppError(state.status === "LOGGED_OUT" ? "Attendance day is already closed" : state.status === "ON_PERMISSION" ? "Cannot login during an active interruption" : "Faculty attendance is already logged in", 409);
  const date = today();
  const created = await prisma.facultyAttendanceSession.create({ data: { facultyUserId: user.id, attendanceDate: date, loginAt: new Date(), sessionSource: "ATTENDANCE" } });
  await prisma.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: user.id, attendanceDate: date } }, create: { facultyUserId: user.id, attendanceDate: date, status: "LOGGED_IN", firstLoginAt: created.loginAt }, update: { status: "LOGGED_IN", firstLoginAt: { set: created.loginAt } } });
  return getFacultyAttendanceStatus(user, created);
}
export async function facultyAttendanceBatches(user) {
  const email = text(user.email).toLowerCase();
  const profile = await prisma.branchFaculty.findFirst({ where: { OR: [{ facultyId: user.userCode }, { email: { equals: email, mode: "insensitive" } }] }, select: { facultyId: true } });
  const rows = await prisma.branchBatch.findMany({ where: { status: "ACTIVE", OR: [{ facultyId: user.userCode }, { facultyId: user.id }, ...(email ? [{ facultyEmail: { equals: email, mode: "insensitive" } }] : [])] }, orderBy: [{ courseName: "asc" }, { sequenceNo: "asc" }], select: { id: true, batchId: true, batchName: true, branchId: true, courseId: true, courseName: true, batchTiming: true, facultyId: true, facultyEmail: true, branch: { select: { branchName: true, branchId: true } } } });
  if (profile?.facultyId) {
    const assignments = await prisma.facultyLeaveAffectedSession.findMany({ where: { replacementFacultyId: profile.facultyId, replacementStatus: "CONFIRMED", resolutionStatus: "REPLACEMENT_ASSIGNED", sessionDate: today() }, select: { batchRecordId: true } });
    if (assignments.length) {
      const replacementRows = await prisma.branchBatch.findMany({ where: { id: { in: assignments.map((item) => item.batchRecordId) }, status: "ACTIVE" }, select: { id: true, batchId: true, batchName: true, branchId: true, courseId: true, courseName: true, batchTiming: true, facultyId: true, facultyEmail: true, branch: { select: { branchName: true, branchId: true } } } });
      rows.push(...replacementRows);
    }
  }
  const unique = new Map();
  rows.forEach((batch) => {
    const key = `${text(batch.branchId).toLowerCase()}::${text(batch.batchId || batch.id).toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, { ...batch, branchName: batch.branch?.branchName || batch.branch?.branchId || "" });
  });
  return Array.from(unique.values());
}
export async function facultyAttendanceLogout(user, payload = {}) {
  const state = await getFacultyAttendanceStatus(user);
  if (state.status === "ON_PERMISSION") throw new AppError("Cannot logout during Permission or Half Day", 409);
  if (state.status !== "LOGGED_IN") throw new AppError(state.status === "LOGGED_OUT" ? "Attendance day is already closed" : "No active faculty attendance login session found", 409);
  const open = await prisma.facultyAttendanceSession.findFirst({ where: { facultyUserId: user.id, attendanceDate: today(), sessionSource: "ATTENDANCE", logoutAt: null }, orderBy: { loginAt: "desc" } });
  if (!open) throw new AppError("No active faculty attendance login session found", 409);
  const assigned = await facultyAttendanceBatches(user); const allowed = new Map(assigned.flatMap((batch) => [[batch.id, batch], [batch.batchId, batch]])); const submitted = Array.isArray(payload.batchWork) ? payload.batchWork : [];
  const invalid = submitted.find((item) => !allowed.has(text(item?.batchId))); if (invalid) throw new AppError("Unauthorized batch work submission", 403);
  const report = submitted.map((item) => `${allowed.get(text(item.batchId)).batchName}: ${text(item.workSummary)}`).join("\n");
  const logoutAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.facultyAttendanceSession.update({ where: { id: open.id }, data: { logoutAt, logoutType: "normal", workReport: report || null } });
    for (const item of submitted) {
      const batch = allowed.get(text(item.batchId));
      await tx.facultyAttendanceBatchWork.upsert({ where: { attendanceSessionId_batchId: { attendanceSessionId: open.id, batchId: batch.batchId || batch.id } }, create: { attendanceSessionId: open.id, facultyUserId: user.id, attendanceDate: today(), branchId: batch.branchId, batchId: batch.batchId || batch.id, workSummary: text(item.workSummary) }, update: { workSummary: text(item.workSummary), updatedAt: logoutAt } });
    }
    await tx.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: user.id, attendanceDate: today() } }, create: { facultyUserId: user.id, attendanceDate: today(), status: "LOGGED_OUT", firstLoginAt: open.loginAt, finalLogoutAt: logoutAt }, update: { status: "LOGGED_OUT", finalLogoutAt: logoutAt } });
  });
  return getFacultyAttendanceStatus(user);
}
export async function facultyAttendancePermission(user) { const date = today(); return (await findApprovedInterruptions(user.id, date)).map(({ row, window }) => ({ id: row.id, type: window.type, startTime: window.startTime, endTime: window.endTime, reason: window.reason, status: row.status, date })); }
