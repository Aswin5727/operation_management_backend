import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createFacultyLeaveRequestChangeNotification, createFacultyLeaveRequestNotification, createNotification } from "../notifications/notifications.service.js";
import { sendEmergencySessionResolutionEmail, sendFacultyCombinedClassEmail, sendFacultyLeaveApprovalEmail, sendFacultyReplacementBatchEmail, sendFacultyRescheduledClassEmail, sendStudentCombinedClassEmail, sendStudentFacultyReassignmentEmail, sendStudentRescheduledClassEmail } from "../../common/services/resendEmail.js";

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
  if (type === "WEEKDAY") {
    const weeklyOffIndex = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(text(batch.weeklyOffDay).toUpperCase());
    return day >= 1 && day <= 5 && day !== weeklyOffIndex;
  }
  if (type === "WEEKEND") return day === 0 || day === 6;
  return true;
}

function scheduleTypeForDate(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 ? "WEEKEND" : "WEEKDAY";
}

function batchIsInCourseWindow(batch, date) {
  const start = text(batch.courseStartDate);
  const end = text(batch.courseEndDate);
  return (!start || date >= start) && (!end || date <= end);
}

function jsonArray(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return [];
}

async function findRescheduleCombineTarget({ branchId, session, date, startTime, endTime }) {
  const sourceProgress = await prisma.facultyTodayWorkEntry.findFirst({
    where: { branchId, courseId: session.courseId, batchId: session.batchId },
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    select: { moduleId: true, submoduleIds: true, submodules: true },
  });
  const defaultModule = await prisma.branchCourseModule.findFirst({
    where: { branchCourseId: session.courseId, status: "ACTIVE" },
    orderBy: { sequenceNo: "asc" },
    select: { id: true, submodules: { where: { status: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: { id: true } } },
  });
  const sourceModuleId = text(sourceProgress?.moduleId) || text(defaultModule?.id);
  if (!sourceModuleId) return null;

  const targetScheduleType = scheduleTypeForDate(date);
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  const candidates = await prisma.branchBatch.findMany({
    where: {
      branchId,
      courseId: session.courseId,
      status: "ACTIVE",
    },
    orderBy: [{ batchName: "asc" }],
    select: {
      id: true, batchId: true, batchName: true, courseId: true, courseName: true,
      facultyId: true, facultyName: true, startTime: true, startPeriod: true,
      endTime: true, endPeriod: true, weekType: true, weeklyOffDay: true,
      courseStartDate: true, courseEndDate: true, mode: true,
    },
  });
  const sourceSubmoduleIds = new Set([
    ...jsonArray(sourceProgress?.submoduleIds),
    ...(Array.isArray(sourceProgress?.submodules)
      ? sourceProgress.submodules.map((item) => text(item?.id || item?.submoduleId)).filter(Boolean)
      : []),
    ...(Array.isArray(defaultModule?.submodules) ? defaultModule.submodules.map((item) => text(item.id)).filter(Boolean) : []),
  ]);
  if (!sourceSubmoduleIds.size) return null;

  for (const candidate of candidates) {
    if (text(candidate.weekType).toUpperCase() !== targetScheduleType || !batchRunsOnDate(candidate, date) || !batchIsInCourseWindow(candidate, date)) continue;
    const candidateStart = parseTime(`${candidate.startTime} ${candidate.startPeriod || ""}`);
    const candidateEnd = parseTime(`${candidate.endTime} ${candidate.endPeriod || ""}`);
    if (candidateStart !== startMinutes || candidateEnd !== endMinutes) continue;
    const targetProgress = await prisma.facultyTodayWorkEntry.findFirst({
      where: { branchId, courseId: session.courseId, batchId: candidate.batchId },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      select: { moduleId: true, submoduleIds: true, submodules: true },
    });
    const targetModuleId = text(targetProgress?.moduleId) || text(defaultModule?.id);
    if (targetModuleId !== sourceModuleId) continue;
    const targetSubmoduleIds = new Set([
      ...jsonArray(targetProgress?.submoduleIds),
      ...(Array.isArray(targetProgress?.submodules)
        ? targetProgress.submodules.map((item) => text(item?.id || item?.submoduleId)).filter(Boolean)
        : []),
      ...(Array.isArray(defaultModule?.submodules) ? defaultModule.submodules.map((item) => text(item.id)).filter(Boolean) : []),
    ]);
    if ([...sourceSubmoduleIds].some((id) => targetSubmoduleIds.has(id))) return candidate;
  }
  return null;
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
  const include = { branch: { select: { id: true, branchId: true, branchName: true, adminUserId: true } } };
  const active = { status: "ACTIVE" };

  // Prefer the authenticated email and only fall back to the faculty code when
  // the token has no email or the email has no matching active profile. Using
  // one OR/findFirst query can select another faculty when codes/emails are
  // stale or duplicated in legacy data.
  let faculty = email
    ? await prisma.branchFaculty.findFirst({
      where: { ...active, email: { equals: email, mode: "insensitive" } },
      include,
    })
    : null;

  if (!faculty && userCode) {
    faculty = await prisma.branchFaculty.findFirst({
      where: { ...active, facultyId: { equals: userCode, mode: "insensitive" } },
      include,
    });
  }

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

function leaveRequestsOverlap(existing, next) {
  if (existing.toDate < next.fromDate || existing.fromDate > next.toDate) return false;
  if (existing.durationType === "FULL_DAY" || next.durationType === "FULL_DAY") return true;
  const existingStart = existing.durationType === "PERMISSION" ? existing.permissionStart : existing.halfDayStart;
  const existingEnd = existing.durationType === "PERMISSION" ? existing.permissionEnd : existing.halfDayEnd;
  const nextStart = next.durationType === "PERMISSION" ? next.permissionStart : next.halfDayStart;
  const nextEnd = next.durationType === "PERMISSION" ? next.permissionEnd : next.halfDayEnd;
  return overlaps(parseTime(existingStart), parseTime(existingEnd), parseTime(nextStart), parseTime(nextEnd));
}

function leaveOverlapMessage(existing) {
  const date = existing.fromDate === existing.toDate
    ? displayDate(existing.fromDate)
    : `${displayDate(existing.fromDate)} - ${displayDate(existing.toDate)}`;
  if (existing.durationType === "FULL_DAY") return `You already have a ${String(existing.status || "pending").toLowerCase()} leave request for ${date} (Full Day).`;
  const start = existing.durationType === "PERMISSION" ? existing.permissionStart : existing.halfDayStart;
  const end = existing.durationType === "PERMISSION" ? existing.permissionEnd : existing.halfDayEnd;
  return `You already have a ${String(existing.status || "pending").toLowerCase()} leave request for ${date}, from ${displayTime(start)} to ${displayTime(end)}.`;
}

async function calculateAffectedClasses(branchId, facultyId, leave) {
  const batches = await prisma.branchBatch.findMany({
    where: { branchId, facultyId, status: "ACTIVE" },
    orderBy: [{ courseName: "asc" }, { batchName: "asc" }],
    select: { id: true, batchId: true, batchName: true, courseId: true, courseName: true, facultyId: true, facultyName: true, startTime: true, endTime: true, batchTiming: true, weekType: true, mode: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true },
  });
  const affected = [];
  for (const date of dateRange(leave.fromDate, leave.toDate)) {
    for (const batch of batches) {
      if (!batchIsInCourseWindow(batch, date)) continue;
      // Affected classes are session/date specific. A full-day leave still
      // affects only batches that actually run on this exact calendar date.
      if (!batchRunsOnDate(batch, date)) continue;
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

function affectedSessionData(leaveRequest, item) {
  return {
    leaveRequestId: leaveRequest.id,
    branchId: leaveRequest.branchId,
    batchRecordId: item.batchRecordId,
    batchId: item.batchId,
    batchName: item.batchName,
    courseId: item.courseId || null,
    courseName: item.courseName || null,
    originalFacultyId: leaveRequest.facultyId,
    originalFacultyName: leaveRequest.facultyName,
    sessionDate: item.date,
    originalStartTime: item.startTime,
    originalEndTime: item.endTime,
  };
}

function mapRequest(item) {
  return { ...item, affectedClassCount: Array.isArray(item.affectedClasses) ? item.affectedClasses.length : 0 };
}

async function resolveBranchId(user) {
  if (String(user?.role || "").toUpperCase() === "SUPER_ADMIN" && text(user?.impersonatedBranchId)) {
    return text(user.impersonatedBranchId);
  }
  const userId = text(user?.userId || user?.id);
  const normalizedEmail = text(user?.email).toLowerCase();
  const branch = await prisma.branch.findFirst({
    where: {
      OR: [
        ...(userId ? [{ adminUserId: userId }] : []),
        ...(normalizedEmail
          ? [{ branchEmail: { equals: normalizedEmail, mode: "insensitive" } }]
          : []),
      ],
    },
    select: { id: true },
  });
  if (!branch) throw new AppError("Branch profile not found", 404);
  return branch.id;
}

async function getScopedLeave(user, leaveId) {
  const branchId = await resolveBranchId(user);
  const request = await prisma.facultyLeaveRequest.findFirst({ where: { id: leaveId, branchId } });
  if (!request) throw new AppError("Leave request not found", 404);
  return { branchId, request };
}

async function getDelegatedFacultyLeave(user, leaveId) {
  const faculty = await resolveFacultyContext(user);
  const request = await prisma.facultyLeaveRequest.findFirst({
    where: { id: leaveId, facultyUserId: user.id, branchId: faculty.branchId, leaveType: "EMERGENCY", status: "APPROVED", isDelegated: true },
  });
  if (!request) throw new AppError("This emergency leave is not delegated to you", 403);
  return { branchId: faculty.branchId, request, faculty };
}

function sessionStatusLabel(session) {
  if (session.resolutionStatus === "REPLACEMENT_ASSIGNED") return session.replacementStatus === "PENDING_CONFIRMATION" ? "Awaiting replacement confirmation" : "Replacement assigned";
  if (session.resolutionStatus === "COMBINED") return "Combined with another class";
  if (session.resolutionStatus === "RESCHEDULED") return "Rescheduled";
  if (session.resolutionStatus === "CANCELLED") return "Class cancelled";
  return "Needs resolution";
}

function mapSession(session) {
  return { ...session, statusLabel: sessionStatusLabel(session) };
}

export async function getBranchFacultyLeaveRequest(user, leaveId) {
  await getScopedLeave(user, leaveId);
  const request = await prisma.facultyLeaveRequest.findUnique({ where: { id: leaveId } });
  let sessions = await prisma.facultyLeaveAffectedSession.findMany({ where: { leaveRequestId: leaveId }, orderBy: [{ sessionDate: "asc" }, { originalStartTime: "asc" }] });
  let affectedClasses = Array.isArray(request.affectedClasses) ? request.affectedClasses : [];
  // Older requests were created before full-day leave included every active
  // faculty batch. Backfill their real affected-session rows when the branch
  // admin opens the review, so the existing request also gets working actions.
  if (!sessions.length && ["PENDING", "UNDER_REVIEW"].includes(request.status)) {
    affectedClasses = await calculateAffectedClasses(request.branchId, request.facultyId, request);
    if (affectedClasses.length) {
      await prisma.facultyLeaveAffectedSession.createMany({ data: affectedClasses.map(item => affectedSessionData(request, item)) });
      await prisma.facultyLeaveRequest.update({ where: { id: request.id }, data: { affectedClasses } });
      sessions = await prisma.facultyLeaveAffectedSession.findMany({ where: { leaveRequestId: leaveId }, orderBy: [{ sessionDate: "asc" }, { originalStartTime: "asc" }] });
    }
  }
  if (sessions.length) {
    const batchRecordIds = [...new Set(sessions.map((session) => session.batchRecordId).filter(Boolean))];
    const scheduledBatches = batchRecordIds.length
      ? await prisma.branchBatch.findMany({
        where: { branchId: request.branchId, id: { in: batchRecordIds } },
        select: { id: true, batchId: true, weekType: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true },
      })
      : [];
    const scheduledByRecordId = new Map(scheduledBatches.map((batch) => [batch.id, batch]));
    const isScheduledSession = (session) => {
      const batch = scheduledByRecordId.get(session.batchRecordId);
      return !batch || (batchIsInCourseWindow(batch, session.sessionDate) && batchRunsOnDate(batch, session.sessionDate));
    };
    sessions = sessions.filter(isScheduledSession);
    const visibleSessionKeys = new Set(sessions.map((session) => `${session.batchRecordId}:${session.sessionDate}`));
    affectedClasses = affectedClasses.filter((item) => !item.batchRecordId || visibleSessionKeys.has(`${item.batchRecordId}:${item.date || item.sessionDate}`));
  }
  return { ...mapRequest({ ...request, affectedClasses }), affectedSessions: sessions.map(mapSession), unresolvedSessionCount: sessions.filter((session) => session.resolutionStatus === "UNRESOLVED").length };
}

async function notifyLeaveReview(request, branchId, actor, message, status) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, branchId: true, branchName: true, branchEmail: true } });
  if (!branch) return;
  try {
    await createFacultyLeaveRequestChangeNotification({ request: { ...request, status }, branch, faculty: { name: request.facultyName, facultyId: request.facultyId }, action: "edited", changes: [message], actor: { id: actor?.id } });
  } catch (error) {
    console.warn("Faculty leave review notification failed to save", error);
  }
}

export async function listReplacementFaculty(user, leaveId, sessionId, assignmentType = "", options = {}) {
  const { branchId, request } = String(user?.role || "").toUpperCase() === "FACULTY"
    ? await getDelegatedFacultyLeave(user, leaveId)
    : await getScopedLeave(user, leaveId);
  const session = await prisma.facultyLeaveAffectedSession.findFirst({ where: { id: sessionId, leaveRequestId: request.id, branchId } });
  if (!session) throw new AppError("Affected class not found", 404);
  if (text(assignmentType).toUpperCase() === "RESCHEDULED") {
    const targetDate = text(options.targetDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { availability: [], source: { facultyId: request.facultyId, courseId: session.courseId } };
    const requestedStart = parseTime(options.targetStartTime);
    const requestedEnd = parseTime(options.targetEndTime);
    const batches = await prisma.branchBatch.findMany({ where: { branchId, facultyId: request.facultyId, status: "ACTIVE", weekType: scheduleTypeForDate(targetDate) }, orderBy: [{ startTime: "asc" }, { batchName: "asc" }], select: { id: true, batchId: true, batchName: true, courseId: true, courseName: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, weekType: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true } });
    const availability = [];
    for (const batch of batches) {
      const defaultModule = await prisma.branchCourseModule.findFirst({ where: { branchCourseId: batch.courseId, status: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: { id: true, title: true, submodules: { where: { status: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: { id: true, title: true } } } });
      const work = await prisma.facultyTodayWorkEntry.findFirst({ where: { branchId, courseId: batch.courseId, batchId: batch.batchId }, orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], select: { moduleName: true, moduleProgress: true, courseProgress: true, submodules: true } });
      const students = work ? [] : await prisma.branchStudent.findMany({ where: { branchId, batchId: batch.batchId, recordStatus: "ACTIVE" }, select: { courseProgress: true } });
      const progressValues = students.map(student => Number(student.courseProgress)).filter(Number.isFinite);
      const courseProgress = work?.courseProgress ?? (progressValues.length ? progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length : 0);
      const submodules = Array.isArray(work?.submodules) && work.submodules.length
        ? work.submodules.map(item => { const statuses = Object.values(item?.studentStatuses || {}).map(value => String(value || '').toUpperCase()).filter(Boolean); const completed = statuses.filter(value => value === 'COMPLETED').length; const status = item?.completionStatus || item?.status || (statuses.length && completed === statuses.length ? 'COMPLETED' : statuses.length ? `${completed}/${statuses.length} COMPLETED` : 'NOT STARTED'); return { name: item?.name || item?.title || item?.submoduleName || 'Sub-module', status }; })
        : (defaultModule?.submodules || []).map(item => ({ name: item.title, status: 'NOT STARTED' }));
      const runs = batchRunsOnDate(batch, targetDate) && batchIsInCourseWindow(batch, targetDate);
      const batchStart = parseTime(`${batch.startTime} ${batch.startPeriod || ''}`);
      const batchEnd = parseTime(`${batch.endTime} ${batch.endPeriod || ''}`);
      const timingConflict = runs && requestedStart != null && requestedEnd != null && batchStart != null && batchEnd != null && overlaps(batchStart, batchEnd, requestedStart, requestedEnd);
      availability.push({ batchId: batch.batchId, batchRecordId: batch.id, batchName: batch.batchName, courseName: batch.courseName, moduleName: work?.moduleName || defaultModule?.title || null, moduleId: defaultModule?.id || null, submodules, courseProgress: Math.round(Number(courseProgress) || 0), moduleProgress: work?.moduleProgress ?? null, startTime: batch.startTime, startPeriod: batch.startPeriod, endTime: batch.endTime, endPeriod: batch.endPeriod, weekType: batch.weekType, availabilityStatus: timingConflict ? "ALREADY_SCHEDULED" : "AVAILABLE" });
    }
    const combineTarget = requestedStart != null && requestedEnd != null
      ? await findRescheduleCombineTarget({
        branchId,
        session,
        date: targetDate,
        startTime: options.targetStartTime,
        endTime: options.targetEndTime,
      })
      : null;
    return { availability, combineTarget, source: { facultyId: request.facultyId, courseId: session.courseId, originalDate: session.sessionDate } };
  }
  if (text(assignmentType).toUpperCase() === "COMBINED") {
    const defaultModule = await prisma.branchCourseModule.findFirst({
      where: { branchCourseId: session.courseId, status: "ACTIVE" },
      orderBy: { sequenceNo: "asc" },
      select: { id: true, title: true, submodules: { where: { status: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, select: { id: true, title: true } } },
    });
    const getBatchProgress = async (batchId) => {
      const work = await prisma.facultyTodayWorkEntry.findFirst({
        where: { branchId, courseId: session.courseId, batchId },
        orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
        select: { moduleId: true, moduleName: true, submoduleIds: true, submodules: true, moduleProgress: true, courseProgress: true },
      });
      if (work) {
        const currentSubmodule = Array.isArray(work.submodules)
          ? work.submodules.find(item => item?.isCurrent || item?.current || ["IN_PROGRESS", "STARTED"].includes(text(item?.status || item?.completionStatus).toUpperCase())) || work.submodules[0]
          : null;
        return { ...work, currentSubmoduleId: text(currentSubmodule?.id || currentSubmodule?.submoduleId || work.submoduleIds?.[0]), currentSubmoduleName: text(currentSubmodule?.name || currentSubmodule?.title || currentSubmodule?.submoduleName) };
      }
      const students = await prisma.branchStudent.findMany({
        where: { branchId, courseId: session.courseId, batchId, recordStatus: "ACTIVE" },
        select: { courseProgress: true },
      });
      const progressValues = students.map((student) => Number(student.courseProgress)).filter(Number.isFinite);
      const courseProgress = progressValues.length
        ? progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length
        : 0;
      return {
        moduleId: defaultModule?.id || null,
        moduleName: defaultModule?.title || null,
        moduleProgress: 0,
        courseProgress,
        currentSubmoduleId: defaultModule?.submodules?.[0]?.id || null,
        currentSubmoduleName: defaultModule?.submodules?.[0]?.title || null,
      };
    };
    const sourceProgress = await getBatchProgress(session.batchId);
    const sourceModuleId = text(sourceProgress?.moduleId).toLowerCase();
    const sourceModuleName = text(sourceProgress?.moduleName).toLowerCase();
    const sourceProgressValue = sourceProgress?.courseProgress ?? sourceProgress?.moduleProgress ?? null;
    const sameProgress = (candidate) => {
      if (sourceProgressValue === null || sourceProgressValue === undefined) return candidate === null || candidate === undefined;
      return Number(candidate) === Number(sourceProgressValue);
    };
    const sameModule = (moduleId, moduleName) => {
      const candidateModuleId = text(moduleId).toLowerCase();
      const candidateModuleName = text(moduleName).toLowerCase();
      if (sourceModuleId && candidateModuleId) return candidateModuleId === sourceModuleId;
      return Boolean(sourceModuleName && candidateModuleName) && candidateModuleName === sourceModuleName;
    };
    const sameSubmodule = (candidateId, candidateName) => {
      const sourceSubmoduleId = text(sourceProgress?.currentSubmoduleId).toLowerCase();
      const sourceSubmoduleName = text(sourceProgress?.currentSubmoduleName).toLowerCase();
      const candidateSubmoduleId = text(candidateId).toLowerCase();
      const candidateSubmoduleName = text(candidateName).toLowerCase();
      if (sourceSubmoduleId && candidateSubmoduleId) return sourceSubmoduleId === candidateSubmoduleId;
      return Boolean(sourceSubmoduleName && candidateSubmoduleName) && sourceSubmoduleName === candidateSubmoduleName;
    };
    const candidateBatches = await prisma.branchBatch.findMany({
      where: { branchId, courseId: session.courseId, status: "ACTIVE", facultyId: { not: request.facultyId } },
      orderBy: [{ batchName: "asc" }],
      select: { id: true, batchId: true, batchName: true, facultyId: true, facultyName: true, courseId: true, courseName: true, startTime: true, endTime: true, weekType: true, weeklyOffDay: true },
    });
    const matchingBatches = [];
    for (const batch of candidateBatches) {
      if (!batchRunsOnDate(batch, session.sessionDate)) continue;
      const progress = await getBatchProgress(batch.batchId);
      const candidateProgress = progress?.courseProgress ?? progress?.moduleProgress ?? null;
      if (!sameModule(progress?.moduleId, progress?.moduleName) || !sameSubmodule(progress?.currentSubmoduleId, progress?.currentSubmoduleName) || !sameProgress(candidateProgress)) continue;
      matchingBatches.push({ batch, progress });
    }
    const facultyIds = [...new Set(matchingBatches.map(({ batch }) => batch.facultyId).filter(Boolean))];
    const facultyRows = facultyIds.length
      ? await prisma.branchFaculty.findMany({ where: { branchId, status: "ACTIVE", facultyId: { in: facultyIds } }, select: { id: true, facultyId: true, name: true, email: true, weeklyOffDay: true }, orderBy: { name: "asc" } })
      : [];
    const facultyById = new Map(facultyRows.map((faculty) => [faculty.facultyId, faculty]));
    const combineSessions = matchingBatches
      .filter(({ batch }) => batch.startTime === session.originalStartTime && batch.endTime === session.originalEndTime)
      .map(({ batch, progress }) => ({
        id: batch.id,
        batchRecordId: batch.id,
        batchId: batch.batchId,
        batchName: batch.batchName,
        facultyId: batch.facultyId,
        facultyName: batch.facultyName || facultyById.get(batch.facultyId)?.name || "",
        courseId: batch.courseId,
        courseName: batch.courseName,
        sessionDate: session.sessionDate,
        originalStartTime: batch.startTime,
        originalEndTime: batch.endTime,
        moduleId: progress?.moduleId || null,
        moduleName: progress?.moduleName || null,
        currentSubmoduleId: progress?.currentSubmoduleId || null,
        currentSubmoduleName: progress?.currentSubmoduleName || null,
        moduleProgress: progress?.moduleProgress ?? null,
        courseProgress: progress?.courseProgress ?? null,
        resolutionStatus: "COMBINE_CANDIDATE",
      }));
    return {
      faculty: facultyRows,
      combineSessions,
      source: { batchName: session.batchName || null, batchId: session.batchId || null, courseId: session.courseId, courseName: session.courseName || null, moduleId: sourceProgress?.moduleId || null, moduleName: sourceProgress?.moduleName || null, currentSubmoduleId: sourceProgress?.currentSubmoduleId || null, currentSubmoduleName: sourceProgress?.currentSubmoduleName || null, moduleProgress: sourceProgress?.moduleProgress ?? null, courseProgress: sourceProgress?.courseProgress ?? null, startTime: session.originalStartTime, endTime: session.originalEndTime },
    };
  }
  const sameCourseBatches = await prisma.branchBatch.findMany({ where: { branchId, courseId: session.courseId, status: "ACTIVE" }, select: { facultyId: true } });
  const sameCourseFacultyIds = [...new Set(sameCourseBatches.map((item) => item.facultyId).filter((id) => id && id !== request.facultyId))];
  const faculty = await prisma.branchFaculty.findMany({
    where: {
      branchId,
      status: "ACTIVE",
      OR: [
        ...(sameCourseFacultyIds.length ? [{ facultyId: { in: sameCourseFacultyIds } }] : []),
        { courseId: session.courseId },
        { branchCourseId: session.courseId },
        { courseAssignments: { some: { branchCourseId: session.courseId } } },
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, facultyId: true, name: true, email: true, weeklyOffDay: true },
  });
  const start = parseTime(session.originalStartTime);
  const end = parseTime(session.originalEndTime);
  const availableFaculty = faculty.filter((item) => item.facultyId !== request.facultyId).filter((item) => {
    const leaveDay = new Date(`${session.sessionDate}T00:00:00Z`).getUTCDay();
    const off = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].indexOf(text(item.weeklyOffDay).toUpperCase());
    return off !== leaveDay;
  });
  const available = [];
  const delegatedFacultySelection = String(user?.role || "").toUpperCase() === "FACULTY";
  for (const item of availableFaculty) {
    const conflicts = await prisma.branchBatch.findMany({ where: { branchId, facultyId: item.facultyId, status: "ACTIVE" }, select: { startTime: true, endTime: true, weekType: true, weeklyOffDay: true, courseName: true, batchName: true } });
    const busy = conflicts.some((batch) => batchRunsOnDate(batch, session.sessionDate) && overlaps(start, end, parseTime(batch.startTime), parseTime(batch.endTime)));
    if (!busy || delegatedFacultySelection) available.push({ ...item, availabilityStatus: busy ? "HAS_TIMING_CONFLICT" : "AVAILABLE", availableTime: `${displayTime(start)} - ${displayTime(end)}` });
  }
  const selectedReplacementFacultyId = text(options.replacementFacultyId);
  let replacementBatches = [];
  if (selectedReplacementFacultyId) {
    const requestedStart = parseTime(options.replacementStartTime);
    const requestedEnd = parseTime(options.replacementEndTime);
    const batches = await prisma.branchBatch.findMany({
      where: { branchId, facultyId: selectedReplacementFacultyId, courseId: session.courseId, status: "ACTIVE", weekType: scheduleTypeForDate(session.sessionDate) },
      orderBy: [{ startTime: "asc" }, { batchName: "asc" }],
      select: { id: true, batchId: true, batchName: true, courseId: true, courseName: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, weekType: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true },
    });
    replacementBatches = batches.filter((batch) => batchRunsOnDate(batch, session.sessionDate) && batchIsInCourseWindow(batch, session.sessionDate)).map((batch) => {
      const batchStart = parseTime(`${batch.startTime} ${batch.startPeriod || ""}`);
      const batchEnd = parseTime(`${batch.endTime} ${batch.endPeriod || ""}`);
      return { ...batch, availabilityStatus: requestedStart != null && requestedEnd != null && overlaps(batchStart, batchEnd, requestedStart, requestedEnd) ? "ALREADY_SCHEDULED" : "AVAILABLE" };
    });
  }
  const combineBatches = await prisma.branchBatch.findMany({ where: { branchId, courseId: session.courseId, status: "ACTIVE", facultyId: { not: request.facultyId }, startTime: session.originalStartTime, endTime: session.originalEndTime }, orderBy: [{ batchName: "asc" }], select: { id: true, batchId: true, batchName: true, facultyId: true, facultyName: true, courseId: true, courseName: true, startTime: true, endTime: true, weekType: true, weeklyOffDay: true } });
  const combineSessions = [];
  for (const batch of combineBatches) {
    if (!batchRunsOnDate(batch, session.sessionDate)) continue;
    const progress = await prisma.facultyTodayWorkEntry.findFirst({ where: { branchId, courseId: session.courseId, batchId: batch.batchId }, orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], select: { moduleId: true, moduleName: true, moduleProgress: true, courseProgress: true } });
    combineSessions.push({ id: batch.id, batchRecordId: batch.id, batchId: batch.batchId, batchName: batch.batchName, facultyId: batch.facultyId, facultyName: batch.facultyName, courseId: batch.courseId, courseName: batch.courseName, sessionDate: session.sessionDate, originalStartTime: batch.startTime, originalEndTime: batch.endTime, resolutionStatus: "COMBINE_CANDIDATE", moduleId: progress?.moduleId || null, moduleName: progress?.moduleName || null, moduleProgress: progress?.moduleProgress ?? null, courseProgress: progress?.courseProgress ?? null });
  }
  return { faculty: available, combineSessions, replacementBatches };
}

export async function resolveBranchFacultyLeaveSession(user, leaveId, sessionId, payload = {}) {
  const delegatedFaculty = String(user?.role || "").toUpperCase() === "FACULTY";
  const { branchId, request } = delegatedFaculty
    ? await getDelegatedFacultyLeave(user, leaveId)
    : await getScopedLeave(user, leaveId);
  if (["REJECTED", "CANCELLED"].includes(request.status)) throw new AppError("This leave request is no longer actionable", 409);
  const session = await prisma.facultyLeaveAffectedSession.findFirst({ where: { id: sessionId, leaveRequestId: leaveId, branchId } });
  if (!session) throw new AppError("Affected class not found", 404);
  if (session.resolutionStatus !== "UNRESOLVED") throw new AppError("This affected class has already been resolved", 409);
  const assignmentType = text(payload.assignmentType).toUpperCase();
  if (!["REPLACEMENT", "COMBINED", "RESCHEDULED", "CANCELLED"].includes(assignmentType)) throw new AppError("Select a valid class resolution", 400);
  if (delegatedFaculty && !["REPLACEMENT", "COMBINED"].includes(assignmentType)) throw new AppError("Delegated emergency leave supports Replace or Combine only", 403);
  const data = { assignmentType, resolvedBy: user.id, resolvedAt: new Date(), resolutionReason: text(payload.reason) || null, resolutionStatus: assignmentType === "REPLACEMENT" ? "REPLACEMENT_ASSIGNED" : assignmentType };
  let rescheduleCombineTarget = null;
  if (assignmentType === "REPLACEMENT") {
    const replacementFacultyId = text(payload.replacementFacultyId);
    const replacementDate = text(payload.replacementDate) || session.sessionDate;
    const replacementStartTime = text(payload.replacementStartTime);
    const replacementEndTime = text(payload.replacementEndTime);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(replacementDate)) throw new AppError("Select a valid replacement date", 400);
    const replacementStart = parseTime(replacementStartTime);
    const replacementEnd = parseTime(replacementEndTime);
    const originalStart = parseTime(session.originalStartTime);
    const originalEnd = parseTime(session.originalEndTime);
    if (replacementStart == null || replacementEnd == null || replacementEnd <= replacementStart) throw new AppError("Select a valid replacement time range", 400);
    if (originalStart != null && originalEnd != null && replacementEnd - replacementStart !== originalEnd - originalStart) throw new AppError("Replacement duration must match the original class duration", 400);
    const replacement = await prisma.branchFaculty.findFirst({ where: { branchId, facultyId: replacementFacultyId, status: "ACTIVE" }, select: { facultyId: true, name: true, email: true } });
    if (!replacement || replacement.facultyId === request.facultyId) throw new AppError("Select an active replacement faculty from this branch", 400);
    const replacementBatchRecordId = text(payload.replacementBatchRecordId);
    if (replacementBatchRecordId) {
      const selectedBatch = await prisma.branchBatch.findFirst({ where: { id: replacementBatchRecordId, branchId, facultyId: replacement.facultyId, courseId: session.courseId, status: "ACTIVE" }, select: { id: true, weekType: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true } });
      if (!selectedBatch || text(selectedBatch.weekType).toUpperCase() !== scheduleTypeForDate(replacementDate) || !batchRunsOnDate(selectedBatch, replacementDate) || !batchIsInCourseWindow(selectedBatch, replacementDate)) throw new AppError("Select a valid same-course batch for the selected date", 400);
    }
    const conflict = await prisma.facultyLeaveRequest.findFirst({ where: { branchId, facultyId: replacement.facultyId, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: replacementDate }, toDate: { gte: replacementDate }, ...(request.leaveType ? { NOT: { id: request.id } } : {}) }, select: { id: true } });
    if (conflict) throw new AppError("The selected faculty is on leave for this class date", 409);
    const assignedBatches = await prisma.branchBatch.findMany({ where: { branchId, facultyId: replacement.facultyId, status: "ACTIVE" }, select: { startTime: true, endTime: true, startPeriod: true, endPeriod: true, weekType: true, weeklyOffDay: true } });
    const busy = assignedBatches.some(batch => batchRunsOnDate(batch, replacementDate) && overlaps(parseTime(`${batch.startTime} ${batch.startPeriod || ''}`), parseTime(`${batch.endTime} ${batch.endPeriod || ''}`), replacementStart, replacementEnd));
    if (busy) throw new AppError("Replacement timing conflicts with an existing faculty batch", 409);
    data.replacementFacultyId = replacement.facultyId;
    data.replacementFacultyName = replacement.name;
    data.replacementStatus = "CONFIRMED";
    data.replacementDate = replacementDate;
    data.replacementStartTime = formatTime(replacementStart);
    data.replacementEndTime = formatTime(replacementEnd);
  }
  if (assignmentType === "RESCHEDULED") {
    const date = parseDate(payload.rescheduledDate, "Rescheduled date");
    const start = text(payload.rescheduledStartTime);
    const end = text(payload.rescheduledEndTime);
    const requestedScheduleType = text(payload.scheduleType).toUpperCase();
    if (date <= session.sessionDate) throw new AppError("Select a future date after the original class date", 400);
    if (requestedScheduleType && !["WEEKDAY", "WEEKEND"].includes(requestedScheduleType)) throw new AppError("Select a valid schedule type", 400);
    if (requestedScheduleType && requestedScheduleType !== scheduleTypeForDate(date)) throw new AppError("The selected date does not match the schedule type", 400);
    if (parseTime(start) == null || parseTime(end) == null || parseTime(end) <= parseTime(start)) throw new AppError("Select a valid rescheduled time", 400);
    const originalBatch = await prisma.branchBatch.findFirst({ where: { branchId, status: "ACTIVE", OR: [{ id: session.batchRecordId }, { batchId: session.batchId }], facultyId: session.originalFacultyId }, select: { id: true, batchId: true, courseId: true, courseName: true, batchName: true, facultyId: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, weekType: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true } });
    if (!originalBatch) throw new AppError("Original batch schedule not found", 409);
    const originalBatchStart = parseTime(`${originalBatch.startTime} ${originalBatch.startPeriod || ''}`);
    const originalBatchEnd = parseTime(`${originalBatch.endTime} ${originalBatch.endPeriod || ''}`);
    if (batchRunsOnDate(originalBatch, date) && batchIsInCourseWindow(originalBatch, date) && overlaps(originalBatchStart, originalBatchEnd, parseTime(start), parseTime(end))) throw new AppError("This batch already has a scheduled class at the selected time", 409);
    if (!batchIsInCourseWindow(originalBatch, date)) throw new AppError("The selected date is outside the batch course period", 400);
    const holiday = await prisma.branchCalendarHoliday.findFirst({ where: { status: "ACTIVE", holidayDate: date, OR: [{ branchId }, { branchId: null }] }, select: { id: true } });
    if (holiday) throw new AppError("The selected date is a holiday", 409);
    const facultyLeave = await prisma.facultyLeaveRequest.findFirst({ where: { branchId, facultyId: session.originalFacultyId, status: { in: ["PENDING", "APPROVED", "UNDER_REVIEW"] }, fromDate: { lte: date }, toDate: { gte: date }, NOT: { id: request.id } }, select: { id: true } });
    if (facultyLeave) throw new AppError("The faculty is unavailable on the selected date", 409);
    // Find the auto-combine target before occupancy validation. The target may
    // belong to the same faculty when their weekday/weekend batches overlap.
    rescheduleCombineTarget = await findRescheduleCombineTarget({ branchId, session, date, startTime: start, endTime: end });
    const existingSessions = await prisma.facultyLeaveAffectedSession.findMany({ where: { branchId, originalFacultyId: session.originalFacultyId, sessionDate: date, resolutionStatus: { notIn: ["CANCELLED", "RESCHEDULED"] }, NOT: { id: session.id } }, select: { originalStartTime: true, originalEndTime: true, replacementStartTime: true, replacementEndTime: true } });
    if (existingSessions.some(item => overlaps(parseTime(item.replacementStartTime || item.originalStartTime), parseTime(item.replacementEndTime || item.originalEndTime), parseTime(start), parseTime(end)))) throw new AppError("The faculty already has another affected session at this time", 409);
    const facultyBatches = await prisma.branchBatch.findMany({ where: { branchId, facultyId: session.originalFacultyId, status: "ACTIVE", id: { not: originalBatch.id } }, select: { startTime: true, startPeriod: true, endTime: true, endPeriod: true, weekType: true, weeklyOffDay: true, batchId: true } });
    const hasFacultyBatchConflict = facultyBatches.some(batch => batchRunsOnDate(batch, date) && overlaps(parseTime(`${batch.startTime} ${batch.startPeriod || ""}`), parseTime(`${batch.endTime} ${batch.endPeriod || ""}`), parseTime(start), parseTime(end)));
    if (hasFacultyBatchConflict && !rescheduleCombineTarget) throw new AppError("The faculty already has a batch at this time", 409);
    data.rescheduledDate = date; data.rescheduledStartTime = start; data.rescheduledEndTime = end;

    // Reschedule-only rule: combine only with an opposite-schedule batch
    // that has the same course, module and submodule at the selected time.
    // The existing manual COMBINED resolution is intentionally untouched.
    if (rescheduleCombineTarget) {
      const combined = await prisma.facultyLeaveCombinedSession.upsert({
        where: {
          branchId_sessionDate_startTime_endTime_facultyId: {
            branchId,
            sessionDate: date,
            startTime: start,
            endTime: end,
            facultyId: rescheduleCombineTarget.facultyId,
          },
        },
        update: { status: "ACTIVE", courseName: rescheduleCombineTarget.courseName, facultyName: rescheduleCombineTarget.facultyName },
        create: {
          branchId,
          sessionDate: date,
          startTime: start,
          endTime: end,
          courseId: rescheduleCombineTarget.courseId,
          courseName: rescheduleCombineTarget.courseName,
          facultyId: rescheduleCombineTarget.facultyId,
          facultyName: rescheduleCombineTarget.facultyName,
          mode: rescheduleCombineTarget.mode,
          createdBy: user.id,
        },
      });
      data.combinedSessionId = combined.id;
    }
  }
  if (assignmentType === "COMBINED") {
    const target = await prisma.branchBatch.findFirst({ where: { OR: [{ id: text(payload.targetSessionId) }, { batchId: text(payload.targetSessionId) }], branchId, status: "ACTIVE" } });
    if (!target || target.courseId !== session.courseId || target.startTime !== session.originalStartTime || target.endTime !== session.originalEndTime || !batchRunsOnDate(target, session.sessionDate)) throw new AppError("Combine is allowed only for the same course, date, and timing", 400);
    const combined = await prisma.facultyLeaveCombinedSession.upsert({
      where: { branchId_sessionDate_startTime_endTime_facultyId: { branchId, sessionDate: session.sessionDate, startTime: session.originalStartTime, endTime: session.originalEndTime, facultyId: target.facultyId } },
      update: { status: "ACTIVE", facultyName: target.facultyName, courseName: target.courseName },
      create: { branchId, sessionDate: session.sessionDate, startTime: session.originalStartTime, endTime: session.originalEndTime, courseId: target.courseId, courseName: target.courseName, facultyId: target.facultyId, facultyName: target.facultyName, mode: target.mode, createdBy: user.id },
    });
    data.combinedSessionId = combined.id;
  }
  let updated;
  if (assignmentType === "RESCHEDULED") {
    [updated] = await prisma.$transaction([
      prisma.facultyLeaveAffectedSession.update({ where: { id: session.id }, data }),
      prisma.facultyLeaveRequest.update({ where: { id: request.id }, data: { status: delegatedFaculty ? "APPROVED" : "UNDER_REVIEW", reviewedBy: user.id, reviewedAt: new Date() } }),
    ]);
  } else {
    updated = await prisma.facultyLeaveAffectedSession.update({ where: { id: session.id }, data });
    await prisma.facultyLeaveRequest.update({ where: { id: request.id }, data: { status: delegatedFaculty ? "APPROVED" : "UNDER_REVIEW", reviewedBy: user.id, reviewedAt: new Date() } });
  }
  if (assignmentType === "RESCHEDULED") await notifyRescheduledClass(updated, branchId, rescheduleCombineTarget);
  if (assignmentType === "REPLACEMENT") {
    const saved = await prisma.facultyLeaveAffectedSession.findUnique({ where: { id: updated.id } });
    const replacementFaculty = await prisma.branchFaculty.findFirst({ where: { branchId, facultyId: saved.replacementFacultyId }, select: { facultyId: true, name: true, email: true } });
    const replacementUser = replacementFaculty?.email ? await prisma.user.findFirst({ where: { email: { equals: replacementFaculty.email, mode: "insensitive" }, active: true }, select: { id: true } }) : null;
    let existingNotification = null;
    if (replacementUser) {
      const notificationKey = `replacement-session:${saved.id}`;
      existingNotification = await prisma.notification.findFirst({ where: { kind: "FACULTY_LEAVE_REQUEST", leaveRequestId: request.id, targetUserId: replacementUser.id, requestDescription: notificationKey }, select: { id: true } });
      if (!existingNotification) {
        await createNotification({ kind: "FACULTY_LEAVE_REQUEST", tone: "blue", title: "Replacement Batch Assigned", message: `${saved.batchName} has been assigned to you for ${displayDate(saved.replacementDate)}, from ${displayTime(saved.replacementStartTime)} to ${displayTime(saved.replacementEndTime)}.`, actionLabel: "View Class", targetUserId: replacementUser.id, targetBranchId: branchId, facultyId: replacementFaculty.facultyId, facultyName: replacementFaculty.name, leaveRequestId: request.id, requestStatus: "REPLACEMENT_ASSIGNED", requestDescription: notificationKey });
      }
    }
    try {
      if (!existingNotification && replacementFaculty?.email) await sendFacultyReplacementBatchEmail({ to: replacementFaculty.email, fullName: replacementFaculty.name, courseName: saved.courseName, batchName: saved.batchName, replacementDate: saved.replacementDate, replacementStartTime: saved.replacementStartTime, replacementEndTime: saved.replacementEndTime });
    } catch (error) {
      console.error("[REPLACE] Replacement email failed:", error?.message || error);
    }

    // Notify only the active students registered in the affected batch. The
    // temporary replacement never changes their permanent batch/faculty data.
    const affectedStudents = saved.batchId
      ? await prisma.branchStudent.findMany({
          where: { branchId, batchId: saved.batchId, recordStatus: "ACTIVE" },
          select: { id: true, studentId: true, studentName: true, emailAddress: true },
        })
      : [];
    if (!saved.batchId) console.error(`[REPLACE] Student notification skipped: affected session ${saved.id} has no batchId`);
    const studentEmails = affectedStudents.map((student) => String(student.emailAddress || "").trim().toLowerCase()).filter(Boolean);
    const studentUsers = studentEmails.length
      ? await prisma.user.findMany({
          where: { active: true, OR: studentEmails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) },
          select: { id: true, email: true },
        })
      : [];
    const usersByEmail = new Map(studentUsers.map((studentUser) => [String(studentUser.email || "").trim().toLowerCase(), studentUser]));
    const replacementKeyPrefix = `student-faculty-reassigned:${saved.id}:`;
    const studentNotificationMessage = `Your batch ${saved.batchName || "your batch"} has been reassigned to another faculty for ${displayDate(saved.replacementDate)}, from ${displayTime(saved.replacementStartTime)} to ${displayTime(saved.replacementEndTime)}.`;

    await Promise.all(affectedStudents.map(async (student) => {
      const email = String(student.emailAddress || "").trim().toLowerCase();
      const targetUser = usersByEmail.get(email);
      const notificationKey = `${replacementKeyPrefix}${student.id}`;
      const alreadySent = targetUser
        ? await prisma.notification.findFirst({
            where: { kind: "INSTITUTE_LEAVE", targetUserId: targetUser.id, requestDescription: notificationKey },
            select: { id: true },
          })
        : null;
      if (!alreadySent) {
        if (targetUser) {
          await createNotification({
            kind: "INSTITUTE_LEAVE",
            tone: "blue",
            title: "Faculty Reassigned",
            message: studentNotificationMessage,
            actionLabel: "View Schedule",
            targetUserId: targetUser.id,
            targetBranchId: branchId,
            leaveRequestId: request.id,
            requestStatus: "REPLACEMENT_ASSIGNED",
            requestDescription: notificationKey,
          });
        } else {
          console.warn(`[REPLACE] No active student user found for ${student.studentId || student.id}; sending email only`);
        }
      }

      try {
        await sendStudentFacultyReassignmentEmail({
          to: student.emailAddress,
          fullName: student.studentName,
          batchName: saved.batchName,
          replacementDate: saved.replacementDate,
          replacementStartTime: saved.replacementStartTime,
          replacementEndTime: saved.replacementEndTime,
        });
      } catch (error) {
        console.error(`[REPLACE] Student reassignment email failed for ${student.studentId || student.id}:`, error?.message || error);
      }
    }));
    if (text(request.leaveType).toUpperCase() === "EMERGENCY") await notifyBranchAdminSessionResolution(request, branchId, saved, replacementFaculty?.name, "Replacement");
  }
  if (assignmentType === "COMBINED") {
    const saved = await prisma.facultyLeaveAffectedSession.findUnique({ where: { id: updated.id } });
    const combined = saved?.combinedSessionId
      ? await prisma.facultyLeaveCombinedSession.findUnique({ where: { id: saved.combinedSessionId } })
      : null;
    const combinedFaculty = combined?.facultyId
      ? await prisma.branchFaculty.findFirst({ where: { branchId, facultyId: combined.facultyId, status: "ACTIVE" }, select: { facultyId: true, name: true, email: true } })
      : null;
    const combinedDate = combined?.sessionDate || saved?.sessionDate;
    const combinedStartTime = combined?.startTime || saved?.originalStartTime;
    const combinedEndTime = combined?.endTime || saved?.originalEndTime;
    const targetBatch = await prisma.branchBatch.findFirst({ where: { OR: [{ id: text(payload.targetSessionId) }, { batchId: text(payload.targetSessionId) }], branchId, status: "ACTIVE" }, select: { batchId: true, batchName: true } });
    const targetBatchName = targetBatch?.batchName || "Target Batch";
    const facultyUser = combinedFaculty?.email
      ? await prisma.user.findFirst({ where: { email: { equals: combinedFaculty.email, mode: "insensitive" }, active: true }, select: { id: true } })
      : null;
    const facultyNotificationKey = `combined-session:${saved.id}`;
    const existingFacultyNotification = facultyUser
      ? await prisma.notification.findFirst({ where: { kind: "FACULTY_LEAVE_REQUEST", targetUserId: facultyUser.id, requestDescription: facultyNotificationKey }, select: { id: true } })
      : null;
    if (facultyUser && !existingFacultyNotification) {
      await createNotification({
        kind: "FACULTY_LEAVE_REQUEST",
        tone: "blue",
        title: "Combined Class Assigned",
        message: `Batch ${targetBatchName} has been assigned to you for a combined class on ${displayDate(combinedDate)}, from ${displayTime(combinedStartTime)} to ${displayTime(combinedEndTime)}. Course: ${saved.courseName || "-"}. Original Batch: ${saved.batchName || "-"}. Original Faculty: ${saved.originalFacultyName || "-"}.`,
        actionLabel: "View Class",
        targetUserId: facultyUser.id,
        targetBranchId: branchId,
        facultyId: combinedFaculty.facultyId,
        facultyName: combinedFaculty.name,
        leaveRequestId: request.id,
        requestStatus: "COMBINED",
        requestDescription: facultyNotificationKey,
      });
    }
    try {
      if (combinedFaculty?.email) await sendFacultyCombinedClassEmail({ to: combinedFaculty.email, fullName: combinedFaculty.name, courseName: saved.courseName, batchName: saved.batchName, originalFacultyName: saved.originalFacultyName, combinedDate, combinedStartTime, combinedEndTime });
    } catch (error) {
      console.error("[COMBINE] Combined faculty email failed:", error?.message || error);
    }

    const combinedStudentBatchIds = [...new Set([saved.batchId, targetBatch?.batchId].filter(Boolean))];
    const affectedStudents = combinedStudentBatchIds.length
      ? await prisma.branchStudent.findMany({ where: { branchId, batchId: { in: combinedStudentBatchIds }, recordStatus: "ACTIVE" }, select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true } })
      : [];
    const studentEmails = affectedStudents.map((student) => String(student.emailAddress || "").trim().toLowerCase()).filter(Boolean);
    const studentUsers = studentEmails.length
      ? await prisma.user.findMany({ where: { active: true, OR: studentEmails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } })
      : [];
    const usersByEmail = new Map(studentUsers.map((studentUser) => [String(studentUser.email || "").trim().toLowerCase(), studentUser]));
    await Promise.all(affectedStudents.map(async (student) => {
      const email = String(student.emailAddress || "").trim().toLowerCase();
      const targetUser = usersByEmail.get(email);
      const studentBatchName = student.batchId === targetBatch?.batchId ? targetBatchName : saved.batchName || "batch";
      const notificationKey = `student-faculty-combined:${saved.id}:${student.id}`;
      const alreadySent = targetUser
        ? await prisma.notification.findFirst({ where: { kind: "INSTITUTE_LEAVE", targetUserId: targetUser.id, requestDescription: notificationKey }, select: { id: true } })
        : null;
      if (!alreadySent) {
        if (targetUser) {
          await createNotification({
            kind: "INSTITUTE_LEAVE",
            tone: "blue",
            title: "Class Combined",
            message: `Your ${saved.courseName || "course"} - ${studentBatchName} class on ${displayDate(combinedDate)}, from ${displayTime(combinedStartTime)} to ${displayTime(combinedEndTime)} will be handled by ${combinedFaculty?.name || "the assigned faculty"} instead of ${saved.originalFacultyName || "your regular faculty"}.`,
            actionLabel: "View Schedule",
            targetUserId: targetUser.id,
            targetBranchId: branchId,
            leaveRequestId: request.id,
            requestStatus: "COMBINED",
            requestDescription: notificationKey,
          });
        }
      }
      try {
        if (student.emailAddress) await sendStudentCombinedClassEmail({ to: student.emailAddress, fullName: student.studentName, courseName: saved.courseName, batchName: studentBatchName, originalFacultyName: saved.originalFacultyName, combinedFacultyName: combinedFaculty?.name, combinedDate, combinedStartTime, combinedEndTime });
      } catch (error) {
        console.error(`[COMBINE] Student combined email failed for ${student.studentId || student.id}:`, error?.message || error);
      }
    }));
    if (text(request.leaveType).toUpperCase() === "EMERGENCY") await notifyBranchAdminSessionResolution(request, branchId, saved, combinedFaculty?.name, "Combination", targetBatchName, combinedDate, combinedStartTime, combinedEndTime);
  }
  return mapSession(updated);
}

async function notifyBranchAdminSessionResolution(request, branchId, session, assignedFacultyName, resolutionType, targetBatchName = "Target Batch", resolvedDate = null, resolvedStartTime = null, resolvedEndTime = null) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { adminUserId: true, branchEmail: true } });
  const admin = branch?.adminUserId ? await prisma.user.findUnique({ where: { id: branch.adminUserId }, select: { id: true, email: true } }) : null;
  const email = String(admin?.email || branch?.branchEmail || '').trim();
  const key = `emergency-session-resolution:${session.id}:${resolutionType}`;
  const date = resolvedDate || session.replacementDate || session.sessionDate;
  const startTime = resolvedStartTime || session.replacementStartTime || session.originalStartTime;
  const endTime = resolvedEndTime || session.replacementEndTime || session.originalEndTime;
  const message = resolutionType === "Combination"
    ? `Batch ${session.batchName || '-'} has been successfully combined with Batch ${targetBatchName} on ${displayDate(date)}, from ${displayTime(startTime)} to ${displayTime(endTime)}. Course: ${session.courseName || '-'}. Original Faculty: ${session.originalFacultyName || '-'}. Assigned Faculty: ${assignedFacultyName || '-'}.`
    : `The affected batch ${session.batchName || '-'} was ${resolutionType.toLowerCase()} by ${request.facultyName || 'the requesting faculty'} for ${displayDate(date)} from ${displayTime(startTime)} to ${displayTime(endTime)}. Assigned faculty: ${assignedFacultyName || '-'}.`;
  if (admin?.id) {
    const existing = await prisma.notification.findFirst({ where: { kind: 'FACULTY_LEAVE_REQUEST', targetUserId: admin.id, requestDescription: key }, select: { id: true } });
    if (!existing) await createNotification({ kind: 'FACULTY_LEAVE_REQUEST', tone: 'blue', title: `Emergency Faculty ${resolutionType} Completed`, message, actionLabel: 'View Faculty Leave', targetUserId: admin.id, targetBranchId: branchId, leaveRequestId: request.id, requestStatus: session.resolutionStatus, requestDescription: key });
  }
  if (email) {
    try { await sendEmergencySessionResolutionEmail({ to: email, batchName: session.batchName, courseName: session.courseName, originalFacultyName: session.originalFacultyName, replacementFacultyName: assignedFacultyName, date: session.replacementDate || session.sessionDate, startTime: session.replacementStartTime || session.originalStartTime, endTime: session.replacementEndTime || session.originalEndTime, resolutionType }); } catch (error) { console.warn('[EMERGENCY] Branch admin email failed:', error?.message || error); }
  }
}

async function notifyFacultyLeaveApproval(request, branchId, actor) {
  const facultyUser = request.facultyUserId
    ? await prisma.user.findUnique({ where: { id: request.facultyUserId }, select: { id: true, email: true, fullName: true } })
    : null;
  const facultyProfile = !facultyUser?.email && request.facultyId
    ? await prisma.branchFaculty.findFirst({ where: { branchId, facultyId: request.facultyId, status: "ACTIVE" }, select: { email: true, name: true } })
    : null;
  const targetUserId = facultyUser?.id || null;
  const facultyEmail = String(facultyUser?.email || request.facultyEmail || facultyProfile?.email || "").trim();
  const facultyName = facultyUser?.fullName || request.facultyName || facultyProfile?.name || "Faculty";
  const dayType = request.durationType === "HALF_DAY" ? "Half Day" : request.durationType === "PERMISSION" ? "Permission" : "Full Day";
  const startTime = request.durationType === "PERMISSION" ? request.permissionStart : request.halfDayStart;
  const endTime = request.durationType === "PERMISSION" ? request.permissionEnd : request.halfDayEnd;
  const emergency = text(request.leaveType).toUpperCase() === "EMERGENCY";
  const delegated = emergency && request.isDelegated === true;
  const notificationKey = `faculty-leave-approval:${request.id}:${delegated ? "delegated" : "admin"}`;
  const title = delegated ? "Emergency Leave Approved & Delegated" : emergency ? "Emergency Leave Approved" : "Leave Request Approved";
  const message = delegated
    ? `${facultyName}, your emergency leave request has been approved. You have been allowed to handle the affected sessions. You can now use Replace or Combine for the affected batches.`
    : emergency
      ? `${facultyName}, your emergency leave request has been approved. The Branch Admin will handle the affected sessions by arranging the required replacement, rescheduling, or combination.`
      : `${facultyName}, your ${dayType.toLowerCase()} leave request has been approved for ${displayDate(request.fromDate)}${startTime && endTime ? `, from ${displayTime(startTime)} to ${displayTime(endTime)}` : "."}`;
  if (targetUserId) {
    const existing = await prisma.notification.findFirst({ where: { kind: "INSTITUTE_LEAVE", targetUserId, requestDescription: notificationKey }, select: { id: true } });
    if (!existing) await createNotification({
      kind: "INSTITUTE_LEAVE", tone: "green", title,
      message,
      actionLabel: "View Leave Request", targetUserId, targetBranchId: branchId, leaveRequestId: request.id,
      facultyId: request.facultyId || "", facultyName, requestStatus: "APPROVED", requestReason: request.reason || "",
      requestDescription: notificationKey, createdBy: actor?.id || null,
    });
  }
  if (facultyEmail) {
    try { await sendFacultyLeaveApprovalEmail({ to: facultyEmail, fullName: facultyName, leaveDate: request.fromDate, leaveType: request.leaveType, dayType, startTime, endTime, isDelegated: delegated }); }
    catch (error) { console.warn("Faculty leave approval email failed", error?.message || error); }
  }
}

async function notifyRescheduledClass(session, branchId, combinedBatch = null) {
  const originalDate = session.sessionDate;
  const newDate = session.rescheduledDate;
  const originalStartTime = session.originalStartTime;
  const originalEndTime = session.originalEndTime;
  const newStartTime = session.rescheduledStartTime;
  const newEndTime = session.rescheduledEndTime;
  const faculty = await prisma.branchFaculty.findFirst({ where: { branchId, facultyId: session.originalFacultyId, status: "ACTIVE" }, select: { name: true, email: true } });
  const facultyUser = faculty?.email ? await prisma.user.findFirst({ where: { email: { equals: faculty.email, mode: "insensitive" }, active: true }, select: { id: true, email: true, fullName: true } }) : null;
  const facultyMessage = `Your ${session.courseName || "class"} - ${session.batchName} class has been rescheduled from ${displayDate(originalDate)} to ${displayDate(newDate)}, from ${displayTime(newStartTime)} to ${displayTime(newEndTime)}.`;
  if (facultyUser) {
    const key = `rescheduled-session:${session.id}:faculty`;
    const existing = await prisma.notification.findFirst({ where: { kind: "FACULTY_LEAVE_REQUEST", targetUserId: facultyUser.id, requestDescription: key }, select: { id: true } });
    if (!existing) await createNotification({ kind: "FACULTY_LEAVE_REQUEST", tone: "blue", title: "Class Rescheduled", message: facultyMessage, actionLabel: "View Calendar", targetUserId: facultyUser.id, targetBranchId: branchId, facultyId: session.originalFacultyId, facultyName: faculty?.name || session.originalFacultyName || "", requestDescription: key });
    if (facultyUser.email) {
      try { await sendFacultyRescheduledClassEmail({ to: facultyUser.email, fullName: facultyUser.fullName || faculty?.name, courseName: session.courseName, batchName: session.batchName, originalDate, originalStartTime, originalEndTime, newDate, newStartTime, newEndTime }); } catch (error) { console.warn("[RESCHEDULE] Faculty email failed:", error?.message || error); }
    }
  }
  const linkedBatch = session.batchRecordId
    ? await prisma.branchBatch.findFirst({ where: { id: session.batchRecordId, branchId }, select: { batchId: true } })
    : null;
  const affectedBatchIds = [...new Set([session.batchId, linkedBatch?.batchId, combinedBatch?.batchId].map(value => text(value)).filter(Boolean))];
  const students = affectedBatchIds.length
    ? await prisma.branchStudent.findMany({ where: { branchId, batchId: { in: affectedBatchIds }, recordStatus: "ACTIVE" }, select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true } })
    : [];
  for (const student of students) {
    const user = student.emailAddress ? await prisma.user.findFirst({ where: { email: { equals: student.emailAddress, mode: "insensitive" }, active: true }, select: { id: true, email: true, fullName: true } }) : null;
    const isCombinedTarget = Boolean(combinedBatch?.batchId && student.batchId === combinedBatch.batchId);
    const studentBatchName = isCombinedTarget ? combinedBatch.batchName : session.batchName;
    const studentMessage = isCombinedTarget
      ? "Your " + (session.courseName || "course") + " - " + (studentBatchName || "batch") + " class on " + displayDate(newDate) + " at " + displayTime(newStartTime) + " - " + displayTime(newEndTime) + " will be combined with " + (session.batchName || "another batch") + "."
      : combinedBatch
        ? "Your " + (session.courseName || "course") + " - " + (studentBatchName || "batch") + " class has been rescheduled from " + displayDate(originalDate) + " to " + displayDate(newDate) + ", from " + displayTime(newStartTime) + " to " + displayTime(newEndTime) + ", and combined with " + (combinedBatch.batchName || "another batch") + "."
        : "Your " + (session.courseName || "class") + " - " + (studentBatchName || "batch") + " class has been rescheduled from " + displayDate(originalDate) + " to " + displayDate(newDate) + ", from " + displayTime(newStartTime) + " to " + displayTime(newEndTime) + ".";
    const key = `rescheduled-session:${session.id}:student:${student.id}:${isCombinedTarget ? "combined" : "source"}`;
    if (user) {
      const existing = await prisma.notification.findFirst({ where: { kind: "INSTITUTE_LEAVE", targetUserId: user.id, requestDescription: key }, select: { id: true } });
      if (!existing) await createNotification({ kind: "INSTITUTE_LEAVE", tone: "blue", title: combinedBatch ? "Class Rescheduled and Combined" : "Class Rescheduled", message: studentMessage, actionLabel: "View Calendar", targetUserId: user.id, targetBranchId: branchId, requestDescription: key });
    } else {
      console.warn(`[RESCHEDULE] No active student user found for ${student.studentId || student.id}; email will still be sent`);
    }
    if (student.emailAddress) {
      try {
        if (isCombinedTarget) {
          await sendStudentCombinedClassEmail({ to: student.emailAddress, fullName: user?.fullName || student.studentName, courseName: session.courseName, batchName: studentBatchName, originalFacultyName: combinedBatch.facultyName, combinedFacultyName: session.originalFacultyName, combinedDate: newDate, combinedStartTime: newStartTime, combinedEndTime: newEndTime });
        } else {
          await sendStudentRescheduledClassEmail({ to: student.emailAddress, fullName: user?.fullName || student.studentName, courseName: session.courseName, batchName: studentBatchName, facultyName: session.originalFacultyName, originalDate, originalStartTime, originalEndTime, newDate, newStartTime, newEndTime });
        }
      } catch (error) { console.warn("[RESCHEDULE] Student email failed for " + student.studentId + ":", error?.message || error); }
    }
  }
}

export async function approveBranchFacultyLeave(user, leaveId, options = {}) {
  const { branchId, request } = await getScopedLeave(user, leaveId);
  if (!["PENDING", "UNDER_REVIEW"].includes(request.status)) throw new AppError("Only pending leave requests can be approved", 409);
  const unresolved = await prisma.facultyLeaveAffectedSession.count({ where: { leaveRequestId: leaveId, branchId, resolutionStatus: "UNRESOLVED" } });
  if (unresolved && text(request.leaveType).toUpperCase() !== "EMERGENCY") throw new AppError("Resolve all affected classes before approving this leave request", 409);
  const delegated = text(request.leaveType).toUpperCase() === "EMERGENCY" && options.delegate === true;
  const approved = await prisma.facultyLeaveRequest.update({ where: { id: leaveId }, data: { status: "APPROVED", isDelegated: delegated, approvedBy: user.id, approvedAt: new Date(), reviewedBy: user.id, reviewedAt: new Date() } });
  await notifyFacultyLeaveApproval(approved, branchId, user);
  return mapRequest(approved);
}

export async function rejectBranchFacultyLeave(user, leaveId, reason) {
  const { branchId, request } = await getScopedLeave(user, leaveId);
  if (!["PENDING", "UNDER_REVIEW"].includes(request.status)) throw new AppError("Only pending leave requests can be rejected", 409);
  const rejected = await prisma.facultyLeaveRequest.update({ where: { id: leaveId }, data: { status: "REJECTED", rejectedBy: user.id, rejectedAt: new Date(), rejectionReason: text(reason) || "Rejected by Branch Admin" , reviewedBy: user.id, reviewedAt: new Date() } });
  await notifyLeaveReview(rejected, branchId, user, "Leave request rejected", "REJECTED");
  return mapRequest(rejected);
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

export async function listMyDelegatedEmergencySessions(user) {
  const faculty = await resolveFacultyContext(user);
  const requests = await prisma.facultyLeaveRequest.findMany({
    where: { facultyUserId: user.id, branchId: faculty.branchId, leaveType: "EMERGENCY", status: "APPROVED", isDelegated: true },
    orderBy: { createdAt: "desc" },
  });
  const result = [];
  for (const request of requests) {
    const sessions = await prisma.facultyLeaveAffectedSession.findMany({
      where: { leaveRequestId: request.id, branchId: faculty.branchId, resolutionStatus: "UNRESOLVED" },
      orderBy: [{ sessionDate: "asc" }, { originalStartTime: "asc" }],
    });
    for (const session of sessions) result.push({ ...mapSession(session), leaveRequestId: request.id, leaveRequestStatus: request.status, isDelegated: true, leaveReason: request.reason });
  }
  return { sessions: result };
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

function displayDate(value) {
  const date = new Date(`${text(value)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return text(value) || "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function temporaryAssignmentIsActive(dateValue, startTime, endTime) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const date = text(dateValue);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (date > today) return true;
  if (date < today) return false;
  const end = parseTime(endTime);
  return end == null || end > currentMinutes;
}

export async function listMyTemporaryFacultyBatches(user) {
  const faculty = await resolveFacultyContext(user);
  const sessions = await prisma.facultyLeaveAffectedSession.findMany({
    where: {
      branchId: faculty.branchId,
      OR: [
        { replacementFacultyId: faculty.facultyId, replacementStatus: "CONFIRMED", resolutionStatus: "REPLACEMENT_ASSIGNED" },
        { resolutionStatus: "COMBINED", combinedSessionId: { not: null } },
      ],
    },
    orderBy: [{ sessionDate: "asc" }, { originalStartTime: "asc" }],
  });
  const combinedIds = sessions.map(session => session.combinedSessionId).filter(Boolean);
  const combined = combinedIds.length ? await prisma.facultyLeaveCombinedSession.findMany({ where: { id: { in: combinedIds }, facultyId: faculty.facultyId, status: "ACTIVE" } }) : [];
  const combinedById = new Map(combined.map(item => [item.id, item]));
  return { batches: sessions.filter(session => (session.resolutionStatus === "REPLACEMENT_ASSIGNED" && session.replacementFacultyId === faculty.facultyId) || combinedById.has(session.combinedSessionId)).map(session => ({
    ...mapSession(session),
    assignmentType: session.resolutionStatus === "COMBINED" ? "COMBINED" : "REPLACEMENT",
    assignmentLabel: session.resolutionStatus === "COMBINED" ? "Combined Class" : "Replacement",
    combinedFacultyName: session.resolutionStatus === "COMBINED" ? combinedById.get(session.combinedSessionId)?.facultyName || null : null,
    temporary: true,
    effectiveDate: session.resolutionStatus === "COMBINED" ? combinedById.get(session.combinedSessionId)?.sessionDate : session.replacementDate || session.sessionDate,
    effectiveStartTime: session.resolutionStatus === "COMBINED" ? combinedById.get(session.combinedSessionId)?.startTime : session.replacementStartTime || session.rescheduledStartTime || session.originalStartTime,
    effectiveEndTime: session.resolutionStatus === "COMBINED" ? combinedById.get(session.combinedSessionId)?.endTime : session.replacementEndTime || session.rescheduledEndTime || session.originalEndTime,
  })).filter(item => temporaryAssignmentIsActive(item.effectiveDate, item.effectiveStartTime, item.effectiveEndTime)) };
}

export async function listMyTemporaryBatchStudents(user, sessionId) {
  const faculty = await resolveFacultyContext(user);
  const session = await prisma.facultyLeaveAffectedSession.findFirst({
    where: { id: text(sessionId), branchId: faculty.branchId, OR: [
      { replacementFacultyId: faculty.facultyId, replacementStatus: "CONFIRMED", resolutionStatus: "REPLACEMENT_ASSIGNED" },
      { resolutionStatus: "COMBINED", combinedSessionId: { not: null } },
    ] },
    select: { id: true, batchId: true, batchName: true, courseId: true, courseName: true, sessionDate: true, replacementDate: true, replacementStartTime: true, replacementEndTime: true, originalFacultyId: true, originalFacultyName: true, replacementFacultyName: true, resolutionStatus: true, combinedSessionId: true },
  });
  if (!session) throw new AppError("This replacement assignment is no longer available", 403);
  let combined = null;
  if (session.resolutionStatus === "COMBINED") {
    combined = await prisma.facultyLeaveCombinedSession.findFirst({ where: { id: session.combinedSessionId, facultyId: faculty.facultyId, status: "ACTIVE" } });
    if (!combined) throw new AppError("This combined assignment is no longer available", 403);
    session.replacementDate = combined.sessionDate;
    session.replacementStartTime = combined.startTime;
    session.replacementEndTime = combined.endTime;
    session.replacementFacultyName = combined.facultyName;
  }
  if (!temporaryAssignmentIsActive(session.replacementDate, session.replacementStartTime, session.replacementEndTime)) throw new AppError("This temporary assignment is no longer available", 403);
  const students = await prisma.branchStudent.findMany({ where: { branchId: faculty.branchId, batchId: session.batchId, recordStatus: "ACTIVE" }, orderBy: { studentName: "asc" }, include: { course: { select: { id: true, name: true, duration: true, hours: true, mode: true } }, installments: { select: { amount: true, amountPaid: true } }, calendarAttendanceRecords: { where: { attendanceDate: session.replacementDate }, select: { status: true } } } });
  return {
    session,
    students: students.map((student) => {
      const totalAmount = student.installments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const paidAmount = student.installments.reduce((sum, item) => sum + Math.min(Number(item.amountPaid || 0), Number(item.amount || 0)), 0);
      return {
        id: student.id,
        studentId: student.studentId,
        studentName: student.studentName,
        emailAddress: student.emailAddress,
        mobileNumber: student.mobileNumber,
        courseId: student.courseId,
        courseName: student.courseName || student.course?.name || "",
        course: student.course,
        courseMode: student.courseMode || student.course?.mode || "",
        courseStartDate: student.courseStartDate,
        admissionDate: student.admissionDate,
        courseEndDate: student.courseEndDate,
        classSchedule: student.classSchedule,
        batchId: student.batchId,
        batchName: student.batchName,
        batchTiming: student.batchTiming,
        totalWorkingDays: student.totalWorkingDays,
        paidProgress: totalAmount ? Math.round((paidAmount / totalAmount) * 100) : 0,
        courseProgress: student.courseProgress ?? 0,
        attendance: student.calendarAttendanceRecords[0]?.status || "UNMARKED",
        calendarEvents: [{
          date: session.replacementDate,
          status: "Scheduled",
          isCourseDay: true,
          isReplacement: true,
          classTime: `${session.replacementStartTime} - ${session.replacementEndTime}`,
          courseName: student.courseName || student.course?.name || "",
          batchName: student.batchName || "",
          facultyName: session.replacementFacultyName || faculty.facultyName || "",
        }],
      };
    }),
  };
}

export async function createFacultyLeaveRequest(user, payload) {
  const faculty = await resolveFacultyContext(user);
  const leave = validatePayload(payload);
  const existingLeaves = await prisma.facultyLeaveRequest.findMany({
    where: { facultyUserId: user.id, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: leave.toDate }, toDate: { gte: leave.fromDate } },
    select: { id: true, status: true, fromDate: true, toDate: true, durationType: true, halfDayStart: true, halfDayEnd: true, permissionStart: true, permissionEnd: true },
  });
  const overlap = existingLeaves.find((existing) => leaveRequestsOverlap(existing, leave));
  if (overlap) throw new AppError(leaveOverlapMessage(overlap), 409);
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
  if (affectedClasses.length) {
    await prisma.facultyLeaveAffectedSession.createMany({ data: affectedClasses.map(item => affectedSessionData(created, item)) });
  }
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
  const existingLeaves = await prisma.facultyLeaveRequest.findMany({
    where: { id: { not: requestId }, facultyUserId: user.id, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: leave.toDate }, toDate: { gte: leave.fromDate } },
    select: { id: true, status: true, fromDate: true, toDate: true, durationType: true, halfDayStart: true, halfDayEnd: true, permissionStart: true, permissionEnd: true },
  });
  const overlap = existingLeaves.find((existing) => leaveRequestsOverlap(existing, leave));
  if (overlap) throw new AppError(leaveOverlapMessage(overlap), 409);
  const affectedClasses = await calculateAffectedClasses(faculty.branchId, faculty.facultyId, leave);
  const updated = await prisma.facultyLeaveRequest.update({
    where: { id: requestId },
    data: { ...leave, affectedClasses, status: "PENDING", cancelledAt: null },
  });
  await prisma.facultyLeaveAffectedSession.deleteMany({ where: { leaveRequestId: requestId } });
  if (affectedClasses.length) {
    await prisma.facultyLeaveAffectedSession.createMany({ data: affectedClasses.map(item => affectedSessionData(updated, item)) });
  }
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
  const branchId = await resolveBranchId(user);
  const status = text(query.status).toUpperCase();
  const rows = await prisma.facultyLeaveRequest.findMany({ where: { branchId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" } });
  const requests = await Promise.all(rows.map(async (row) => {
    const affectedClasses = await calculateAffectedClasses(row.branchId, row.facultyId, row);
    const unresolvedSessionCount = await prisma.facultyLeaveAffectedSession.count({ where: { leaveRequestId: row.id, resolutionStatus: "UNRESOLVED" } });
    return mapRequest({ ...row, affectedClasses, unresolvedSessionCount });
  }));
  return { requests };
}

export { FULL_DAY_DURATION_MINUTES, MAX_HALF_DAY_DURATION_MINUTES };
