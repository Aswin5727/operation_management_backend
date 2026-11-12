import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const TIME_ZONE = "Asia/Kolkata";
const APPROVED = "APPROVED";
const WEEK_DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

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
function minutesAt(value) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
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
async function dailyExemption(user, date) {
  const email = text(user?.email).toLowerCase();
  const userCode = text(user?.userCode);
  const [faculty, leave, temporaryWeekOff, temporaryWeekOffAway] = await Promise.all([
    prisma.branchFaculty.findFirst({
      where: { status: "ACTIVE", OR: [{ facultyId: userCode }, ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : [])] },
      select: { weeklyOffDay: true },
    }),
    prisma.facultyLeaveRequest.findFirst({
      where: { facultyUserId: user.id, fromDate: { lte: date }, toDate: { gte: date }, status: APPROVED },
      select: { id: true, durationType: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.facultyWeekOffRequest.findFirst({
      where: { facultyUserId: user.id, requestedWeekOffDate: date, status: APPROVED },
      select: { id: true },
    }),
    prisma.facultyWeekOffRequest.findFirst({
      where: { facultyUserId: user.id, defaultWeekOffDate: date, status: APPROVED },
      select: { id: true },
    }),
  ]);
  const fullDayLeave = leave && !["HALF_DAY", "PERMISSION"].includes(text(leave.durationType).toUpperCase());
  if (fullDayLeave) return { exempt: true, reason: "APPROVED_LEAVE", leaveId: leave.id };
  if (temporaryWeekOff) return { exempt: true, reason: "APPROVED_TEMPORARY_WEEK_OFF", weekOffRequestId: temporaryWeekOff.id };
  const weekday = WEEK_DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (!temporaryWeekOffAway && faculty?.weeklyOffDay && text(faculty.weeklyOffDay).toUpperCase() === weekday) {
    return { exempt: true, reason: "REGULAR_WEEK_OFF" };
  }
  return { exempt: false, reason: null };
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
  const loginMinute = minutesAt(latest.loginAt);
  return loginMinute < lastEnd;
}
function dateTimeForMinutes(date, value) { const [year, month, day] = date.split("-").map(Number); const hour = Math.floor(value / 60); const minute = value % 60; return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30)); }
function workingSeconds(rows, records) {
  const now = Date.now();
  return rows.reduce((total, row) => {
    const start = new Date(row.loginAt).getTime(); let end = row.logoutAt ? new Date(row.logoutAt).getTime() : now;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return total;
    records.forEach(({ window }) => {
      const pauseEnd = dateTimeForMinutes(row.attendanceDate, window.end).getTime();
      if (!row.logoutAt && now >= pauseEnd && start < pauseEnd) end = Math.min(end, pauseEnd);
    });
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
  const date = today(); const rows = await sessions(user.id, date); const records = await findApprovedInterruptions(user.id, date); const exemption = await dailyExemption(user, date); const nowValue = currentMinutes(); const open = activeSession(rows); const active = interruptionState(rows, records, nowValue);
  const loginRequired = Boolean(open && !active && latestEndedNeedsLogin(rows, records, nowValue));
  const last = rows[rows.length - 1];
  const resumedAfterWebsiteLogout = Boolean(rows.length && !open && last?.logoutType === "WEBSITE_LOGOUT");
  const status = exemption.exempt && !open ? "NOT_LOGGED_IN" : rows.length && !open ? (resumedAfterWebsiteLogout ? "WEBSITE_LOGGED_OUT_WORKLOG_ACTIVE" : "WORKLOG_COMPLETED") : active ? "ON_PERMISSION" : loginRequired ? "LOGIN_REQUIRED" : open ? "LOGGED_IN" : "NOT_LOGGED_IN";
  const interruption = active || (loginRequired ? records.filter(({ window }) => nowValue >= window.end).sort((a, b) => b.window.end - a.window.end)[0] : null);
  const interruptionData = serializeInterruption(interruption);
  const remainingSeconds = active ? Math.max(0, (active.window.end - nowValue) * 60) : 0;
  const firstLoginAt = rows[0]?.loginAt || null;
  const finalLogoutAt = ["WORKLOG_COMPLETED", "AUTO_CLOSED"].includes(status) ? rows[rows.length - 1]?.logoutAt || null : null;
  if (persist) {
    await prisma.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: user.id, attendanceDate: date } }, create: { facultyUserId: user.id, attendanceDate: date, status, firstLoginAt, finalLogoutAt }, update: { status, firstLoginAt, finalLogoutAt } });
  }
  return { status, faculty: { id: user.id, name: user.fullName, facultyId: user.userCode }, attendanceDate: date, currentServerTime: new Date().toISOString(), firstLoginAt, finalLogoutAt, currentSession: open, sessions: rows, workingSeconds: workingSeconds(rows, records), remainingSeconds, ...interruptionData, exemption, mandatoryLoginRequired: !exemption.exempt && ["NOT_LOGGED_IN", "LOGIN_REQUIRED"].includes(status), canLogin: !exemption.exempt && (status === "NOT_LOGGED_IN" || status === "LOGIN_REQUIRED" || status === "WEBSITE_LOGGED_OUT_WORKLOG_ACTIVE"), canLogout: status === "LOGGED_IN" };
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

function validAttendanceDate(value, fallback) {
  const candidate = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return fallback;
  const parsed = new Date(candidate + "T00:00:00Z");
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate ? fallback : candidate;
}

function firstDayOfMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year + "-" + month + "-01";
}

function dateDistanceInDays(from, to) {
  const start = new Date(from + "T00:00:00Z").getTime();
  const end = new Date(to + "T00:00:00Z").getTime();
  return Number.isFinite(start) && Number.isFinite(end) ? Math.floor((end - start) / 86400000) : 0;
}

function serializeHistorySession(row, batchNames = new Map()) {
  return {
    id: row.id,
    attendanceDate: row.attendanceDate,
    loginAt: row.loginAt,
    logoutAt: row.logoutAt,
    logoutType: row.logoutType,
    logoutReason: row.logoutReason,
    workReport: row.workReport,
    workCompleted: row.workCompleted,
    workingSeconds: workingSeconds([row], []),
    batchWork: (row.batchWork || []).map((item) => ({
      id: item.id,
      batchId: item.batchId,
      batchName: batchNames.get(item.batchId) || item.batchId,
      workSummary: item.workSummary,
      attendanceDate: item.attendanceDate,
    })),
  };
}

export async function getBranchFacultyAttendanceHistory(actor, facultyReference, query = {}) {
  const branch = await getCurrentBranchProfile(actor);
  if (!branch?.id) throw new AppError("Branch profile not found.", 404);

  const reference = text(facultyReference);
  if (!reference) throw new AppError("Faculty reference is required.", 400);
  const branchFaculty = await prisma.branchFaculty.findFirst({
    where: { branchId: branch.id, OR: [{ id: reference }, { facultyId: reference }] },
    select: { facultyId: true, email: true, name: true },
  });
  if (!branchFaculty) throw new AppError("Faculty not found in this branch.", 404);

  const facultyUser = await prisma.user.findFirst({
    where: { role: "FACULTY", OR: [{ userCode: branchFaculty.facultyId }, { email: { equals: branchFaculty.email, mode: "insensitive" } }] },
    select: { id: true, userCode: true, fullName: true, email: true },
  });
  const todayDate = today();
  let fromDate = validAttendanceDate(query?.from || query?.startDate, firstDayOfMonth());
  let toDate = validAttendanceDate(query?.to || query?.endDate, todayDate);
  if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
  if (dateDistanceInDays(fromDate, toDate) > 366) throw new AppError("Attendance history range cannot exceed 12 months.", 400);

  const base = {
    faculty: { id: facultyUser?.id || null, facultyId: branchFaculty.facultyId, name: facultyUser?.fullName || branchFaculty.name, email: facultyUser?.email || branchFaculty.email },
    branch: { id: branch.id, branchId: branch.branchId, branchName: branch.branchName },
    range: { fromDate, toDate },
  };
  if (!facultyUser) return { ...base, summary: { totalDays: 0, presentDays: 0, loggedOutDays: 0, notLoggedInDays: 0, permissionDays: 0, totalSessions: 0, totalWorkingSeconds: 0, averageWorkingSeconds: 0 }, days: [] };

  const [sessionsRows, dayRows] = await Promise.all([
    prisma.facultyAttendanceSession.findMany({
      where: { facultyUserId: facultyUser.id, attendanceDate: { gte: fromDate, lte: toDate }, sessionSource: "ATTENDANCE" },
      orderBy: [{ attendanceDate: "desc" }, { loginAt: "asc" }, { createdAt: "asc" }],
      include: { batchWork: { orderBy: { createdAt: "asc" }, select: { id: true, batchId: true, attendanceDate: true, workSummary: true } } },
    }),
    prisma.facultyAttendanceDay.findMany({ where: { facultyUserId: facultyUser.id, attendanceDate: { gte: fromDate, lte: toDate } }, orderBy: { attendanceDate: "desc" } }),
  ]);
  const batchIds = [...new Set(sessionsRows.flatMap((row) => (row.batchWork || []).map((item) => item.batchId)).filter(Boolean))];
  const batchRows = batchIds.length ? await prisma.branchBatch.findMany({ where: { branchId: branch.id, OR: [{ id: { in: batchIds } }, { batchId: { in: batchIds } }] }, select: { id: true, batchId: true, batchName: true } }) : [];
  const batchNames = new Map(batchRows.flatMap((item) => [[item.id, item.batchName], [item.batchId, item.batchName]]));
  const grouped = new Map();
  sessionsRows.forEach((row) => {
    const item = grouped.get(row.attendanceDate) || { attendanceDate: row.attendanceDate, status: "LOGGED_OUT", firstLoginAt: null, finalLogoutAt: null, totalWorkingSeconds: 0, sessions: [], batchWork: [] };
    const session = serializeHistorySession(row, batchNames);
    item.sessions.push(session); item.firstLoginAt = item.firstLoginAt || row.loginAt; if (row.logoutAt) item.finalLogoutAt = row.logoutAt;
    item.totalWorkingSeconds += session.workingSeconds; item.batchWork.push(...session.batchWork); if (!row.logoutAt) item.status = "LOGGED_IN"; grouped.set(row.attendanceDate, item);
  });
  dayRows.forEach((row) => {
    const item = grouped.get(row.attendanceDate) || { attendanceDate: row.attendanceDate, status: row.status, firstLoginAt: row.firstLoginAt, finalLogoutAt: row.finalLogoutAt, totalWorkingSeconds: 0, sessions: [], batchWork: [] };
    item.status = row.status || item.status; item.firstLoginAt = item.firstLoginAt || row.firstLoginAt; item.finalLogoutAt = item.finalLogoutAt || row.finalLogoutAt; grouped.set(row.attendanceDate, item);
  });
  const days = [...grouped.values()].sort((left, right) => right.attendanceDate.localeCompare(left.attendanceDate));
  const totalWorkingSeconds = days.reduce((total, day) => total + day.totalWorkingSeconds, 0);
  const loggedOutDays = days.filter((day) => day.status === "LOGGED_OUT").length;
  const permissionDays = days.filter((day) => ["ON_PERMISSION", "HALF_DAY", "LOGIN_REQUIRED"].includes(day.status)).length;
  return {
    ...base,
    summary: { totalDays: days.length, presentDays: days.filter((day) => ["LOGGED_IN", "LOGGED_OUT"].includes(day.status)).length, loggedOutDays, notLoggedInDays: days.filter((day) => day.status === "NOT_LOGGED_IN").length, permissionDays, totalSessions: sessionsRows.length, totalWorkingSeconds, averageWorkingSeconds: days.length ? Math.floor(totalWorkingSeconds / days.length) : 0 },
    days,
  };
}

export async function facultyAttendanceLogin(user) {
  const state = await getFacultyAttendanceStatus(user);
  if (!state.canLogin) throw new AppError(["WORKLOG_COMPLETED", "AUTO_CLOSED"].includes(state.status) ? "Attendance day is already closed" : state.status === "ON_PERMISSION" ? "Cannot login during an active interruption" : state.exemption?.exempt ? "Work Log login is not required for this date" : "Faculty attendance is already logged in", 409);
  const date = today();
  const existingRows = await sessions(user.id, date);
  const open = activeSession(existingRows);
  if (open && state.status === "LOGIN_REQUIRED") {
    const records = await findApprovedInterruptions(user.id, date);
    const loginAt = new Date(open.loginAt).getTime();
    const endedWindows = records
      .filter(({ window }) => currentMinutes() >= window.end && dateTimeForMinutes(date, window.end).getTime() > loginAt)
      .sort((left, right) => right.window.end - left.window.end);
    const pauseEnd = endedWindows[0] ? dateTimeForMinutes(date, endedWindows[0].window.end) : null;
    if (pauseEnd) {
      await prisma.facultyAttendanceSession.update({ where: { id: open.id }, data: { logoutAt: pauseEnd, logoutType: "permission_pause", logoutReason: "Permission or half-day completed" } });
    }
  }
  const created = await prisma.facultyAttendanceSession.create({ data: { facultyUserId: user.id, attendanceDate: date, loginAt: new Date(), sessionSource: "ATTENDANCE" } });
  await prisma.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: user.id, attendanceDate: date } }, create: { facultyUserId: user.id, attendanceDate: date, status: "LOGGED_IN", firstLoginAt: created.loginAt }, update: { status: "LOGGED_IN" } });
  return getFacultyAttendanceStatus(user, created);
}

export async function recordFacultyWebsiteLogoutSession(userId, attendanceDate = today()) {
  const open = await prisma.facultyAttendanceSession.findFirst({
    where: { facultyUserId: userId, attendanceDate, sessionSource: "ATTENDANCE", logoutAt: null },
    orderBy: { loginAt: "desc" },
  });
  if (!open) return null;
  const logoutAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.facultyAttendanceSession.update({ where: { id: open.id }, data: { logoutAt, logoutType: "WEBSITE_LOGOUT", logoutReason: "Website logout; Work Log remains resumable" } });
    await tx.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: userId, attendanceDate } }, create: { facultyUserId: userId, attendanceDate, status: "WEBSITE_LOGGED_OUT_WORKLOG_ACTIVE", firstLoginAt: open.loginAt }, update: { status: "WEBSITE_LOGGED_OUT_WORKLOG_ACTIVE", finalLogoutAt: null } });
  });
  return open.id;
}

export async function resumeFacultyAttendanceSession(user, attendanceDate = today()) {
  const rows = await sessions(user.id, attendanceDate);
  if (activeSession(rows) || rows[rows.length - 1]?.logoutType !== "WEBSITE_LOGOUT") return null;
  const created = await prisma.facultyAttendanceSession.create({ data: { facultyUserId: user.id, attendanceDate, loginAt: new Date(), sessionSource: "ATTENDANCE" } });
  await prisma.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: user.id, attendanceDate } }, create: { facultyUserId: user.id, attendanceDate, status: "LOGGED_IN", firstLoginAt: rows[0]?.loginAt || created.loginAt }, update: { status: "LOGGED_IN", firstLoginAt: rows[0]?.loginAt || created.loginAt, finalLogoutAt: null } });
  return created.id;
}

export async function autoCloseStaleFacultyAttendanceSessions() {
  const currentDate = today();
  const openSessions = await prisma.facultyAttendanceSession.findMany({
    where: { sessionSource: "ATTENDANCE", logoutAt: null, attendanceDate: { lt: currentDate } },
    include: { facultyUser: { select: { lastLogoutAt: true } } },
  });
  let closed = 0;
  for (const session of openSessions) {
    const lastLogout = session.facultyUser?.lastLogoutAt;
    const fallback = lastLogout && new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(lastLogout) === session.attendanceDate
      ? lastLogout
      : dateTimeForMinutes(session.attendanceDate, 1439);
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.facultyAttendanceSession.updateMany({ where: { id: session.id, logoutAt: null }, data: { logoutAt: fallback, logoutType: "AUTO_CLOSED", logoutReason: "Automatically closed after confirmed website logout/day rollover" } });
      if (updated.count) {
        await tx.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: session.facultyUserId, attendanceDate: session.attendanceDate } }, create: { facultyUserId: session.facultyUserId, attendanceDate: session.attendanceDate, status: "AUTO_CLOSED", firstLoginAt: session.loginAt, finalLogoutAt: fallback }, update: { status: "AUTO_CLOSED", finalLogoutAt: fallback } });
      }
      return updated.count;
    });
    closed += result;
  }
  return { closed };
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
  if (state.status !== "LOGGED_IN") throw new AppError(["WORKLOG_COMPLETED", "AUTO_CLOSED"].includes(state.status) ? "Attendance day is already closed" : "No active faculty attendance login session found", 409);
  const open = await prisma.facultyAttendanceSession.findFirst({ where: { facultyUserId: user.id, attendanceDate: today(), sessionSource: "ATTENDANCE", logoutAt: null }, orderBy: { loginAt: "desc" } });
  if (!open) throw new AppError("No active faculty attendance login session found", 409);
  const assigned = await facultyAttendanceBatches(user); const allowed = new Map(assigned.flatMap((batch) => [[batch.id, batch], [batch.batchId, batch]])); const submitted = Array.isArray(payload.batchWork) ? payload.batchWork : [];
  const invalid = submitted.find((item) => !allowed.has(text(item?.batchId))); if (invalid) throw new AppError("Unauthorized batch work submission", 403);
  const report = submitted.map((item) => `${allowed.get(text(item.batchId)).batchName}: ${text(item.workSummary)}`).join("\n");
  const logoutAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.facultyAttendanceSession.update({ where: { id: open.id }, data: { logoutAt, logoutType: "MANUAL", workReport: report || null } });
    for (const item of submitted) {
      const batch = allowed.get(text(item.batchId));
      await tx.facultyAttendanceBatchWork.upsert({ where: { attendanceSessionId_batchId: { attendanceSessionId: open.id, batchId: batch.batchId || batch.id } }, create: { attendanceSessionId: open.id, facultyUserId: user.id, attendanceDate: today(), branchId: batch.branchId, batchId: batch.batchId || batch.id, workSummary: text(item.workSummary) }, update: { workSummary: text(item.workSummary), updatedAt: logoutAt } });
    }
    await tx.facultyAttendanceDay.upsert({ where: { facultyUserId_attendanceDate: { facultyUserId: user.id, attendanceDate: today() } }, create: { facultyUserId: user.id, attendanceDate: today(), status: "WORKLOG_COMPLETED", firstLoginAt: open.loginAt, finalLogoutAt: logoutAt }, update: { status: "WORKLOG_COMPLETED", finalLogoutAt: logoutAt } });
  });
  return getFacultyAttendanceStatus(user);
}
export async function facultyAttendancePermission(user) { const date = today(); return (await findApprovedInterruptions(user.id, date)).map(({ row, window }) => ({ id: row.id, type: window.type, startTime: window.startTime, endTime: window.endTime, reason: window.reason, status: row.status, date })); }
