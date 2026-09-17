import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createFacultyLeaveRequestChangeNotification, createFacultyLeaveRequestNotification, createNotification } from "../notifications/notifications.service.js";
import { sendFacultyCombinedClassEmail, sendFacultyLeaveApprovalEmail, sendFacultyReplacementBatchEmail, sendStudentCombinedClassEmail, sendStudentFacultyReassignmentEmail } from "../../common/services/resendEmail.js";

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

export async function listReplacementFaculty(user, leaveId, sessionId, assignmentType = "") {
  const { branchId, request } = await getScopedLeave(user, leaveId);
  const session = await prisma.facultyLeaveAffectedSession.findFirst({ where: { id: sessionId, leaveRequestId: request.id, branchId } });
  if (!session) throw new AppError("Affected class not found", 404);
  if (text(assignmentType).toUpperCase() === "COMBINED") {
    const defaultModule = await prisma.branchCourseModule.findFirst({
      where: { branchCourseId: session.courseId, status: "ACTIVE" },
      orderBy: { sequenceNo: "asc" },
      select: { id: true, title: true },
    });
    const getBatchProgress = async (batchId) => {
      const work = await prisma.facultyTodayWorkEntry.findFirst({
        where: { branchId, courseId: session.courseId, batchId },
        orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
        select: { moduleId: true, moduleName: true, moduleProgress: true, courseProgress: true },
      });
      if (work) return work;
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
      if (!sameModule(progress?.moduleId, progress?.moduleName) || !sameProgress(candidateProgress)) continue;
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
        moduleProgress: progress?.moduleProgress ?? null,
        courseProgress: progress?.courseProgress ?? null,
        resolutionStatus: "COMBINE_CANDIDATE",
      }));
    return {
      faculty: facultyRows,
      combineSessions,
      source: { courseId: session.courseId, moduleId: sourceProgress?.moduleId || null, moduleName: sourceProgress?.moduleName || null, moduleProgress: sourceProgress?.moduleProgress ?? null, courseProgress: sourceProgress?.courseProgress ?? null, startTime: session.originalStartTime, endTime: session.originalEndTime },
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
  for (const item of availableFaculty) {
    const conflicts = await prisma.branchBatch.findMany({ where: { branchId, facultyId: item.facultyId, status: "ACTIVE" }, select: { startTime: true, endTime: true, weekType: true, weeklyOffDay: true, courseName: true, batchName: true } });
    const busy = conflicts.some((batch) => batchRunsOnDate(batch, session.sessionDate) && overlaps(start, end, parseTime(batch.startTime), parseTime(batch.endTime)));
    if (!busy) available.push({ ...item, availableTime: `${displayTime(start)} - ${displayTime(end)}` });
  }
  const combineBatches = await prisma.branchBatch.findMany({ where: { branchId, courseId: session.courseId, status: "ACTIVE", facultyId: { not: request.facultyId }, startTime: session.originalStartTime, endTime: session.originalEndTime }, orderBy: [{ batchName: "asc" }], select: { id: true, batchId: true, batchName: true, facultyId: true, facultyName: true, courseId: true, courseName: true, startTime: true, endTime: true, weekType: true, weeklyOffDay: true } });
  const combineSessions = [];
  for (const batch of combineBatches) {
    if (!batchRunsOnDate(batch, session.sessionDate)) continue;
    const progress = await prisma.facultyTodayWorkEntry.findFirst({ where: { branchId, courseId: session.courseId, batchId: batch.batchId }, orderBy: [{ workDate: "desc" }, { createdAt: "desc" }], select: { moduleId: true, moduleName: true, moduleProgress: true, courseProgress: true } });
    combineSessions.push({ id: batch.id, batchRecordId: batch.id, batchId: batch.batchId, batchName: batch.batchName, facultyId: batch.facultyId, facultyName: batch.facultyName, courseId: batch.courseId, courseName: batch.courseName, sessionDate: session.sessionDate, originalStartTime: batch.startTime, originalEndTime: batch.endTime, resolutionStatus: "COMBINE_CANDIDATE", moduleId: progress?.moduleId || null, moduleName: progress?.moduleName || null, moduleProgress: progress?.moduleProgress ?? null, courseProgress: progress?.courseProgress ?? null });
  }
  return { faculty: available, combineSessions };
}

export async function resolveBranchFacultyLeaveSession(user, leaveId, sessionId, payload = {}) {
  const { branchId, request } = await getScopedLeave(user, leaveId);
  if (["REJECTED", "CANCELLED"].includes(request.status)) throw new AppError("This leave request is no longer actionable", 409);
  const session = await prisma.facultyLeaveAffectedSession.findFirst({ where: { id: sessionId, leaveRequestId: leaveId, branchId } });
  if (!session) throw new AppError("Affected class not found", 404);
  const assignmentType = text(payload.assignmentType).toUpperCase();
  if (!["REPLACEMENT", "COMBINED", "RESCHEDULED", "CANCELLED"].includes(assignmentType)) throw new AppError("Select a valid class resolution", 400);
  const data = { assignmentType, resolvedBy: user.id, resolvedAt: new Date(), resolutionReason: text(payload.reason) || null, resolutionStatus: assignmentType === "REPLACEMENT" ? "REPLACEMENT_ASSIGNED" : assignmentType };
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
    if (parseTime(start) == null || parseTime(end) == null || parseTime(end) <= parseTime(start)) throw new AppError("Select a valid rescheduled time", 400);
    data.rescheduledDate = date; data.rescheduledStartTime = start; data.rescheduledEndTime = end;
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
  const updated = await prisma.facultyLeaveAffectedSession.update({ where: { id: session.id }, data });
  await prisma.facultyLeaveRequest.update({ where: { id: request.id }, data: { status: "UNDER_REVIEW", reviewedBy: user.id, reviewedAt: new Date() } });
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
      if (alreadySent) return;

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
        message: `${saved.batchName || "Batch"} Batch is assigned to you for a Combined Class on ${displayDate(combinedDate)}, from ${displayTime(combinedStartTime)} to ${displayTime(combinedEndTime)}. Course: ${saved.courseName || "-"}. Original Faculty: ${saved.originalFacultyName || "-"}.`,
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
      if (!existingFacultyNotification && combinedFaculty?.email) await sendFacultyCombinedClassEmail({ to: combinedFaculty.email, fullName: combinedFaculty.name, courseName: saved.courseName, batchName: saved.batchName, originalFacultyName: saved.originalFacultyName, combinedDate, combinedStartTime, combinedEndTime });
    } catch (error) {
      console.error("[COMBINE] Combined faculty email failed:", error?.message || error);
    }

    const affectedStudents = saved.batchId
      ? await prisma.branchStudent.findMany({ where: { branchId, batchId: saved.batchId, recordStatus: "ACTIVE" }, select: { id: true, studentId: true, studentName: true, emailAddress: true } })
      : [];
    const studentEmails = affectedStudents.map((student) => String(student.emailAddress || "").trim().toLowerCase()).filter(Boolean);
    const studentUsers = studentEmails.length
      ? await prisma.user.findMany({ where: { active: true, OR: studentEmails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } })
      : [];
    const usersByEmail = new Map(studentUsers.map((studentUser) => [String(studentUser.email || "").trim().toLowerCase(), studentUser]));
    await Promise.all(affectedStudents.map(async (student) => {
      const email = String(student.emailAddress || "").trim().toLowerCase();
      const targetUser = usersByEmail.get(email);
      const notificationKey = `student-faculty-combined:${saved.id}:${student.id}`;
      const alreadySent = targetUser
        ? await prisma.notification.findFirst({ where: { kind: "INSTITUTE_LEAVE", targetUserId: targetUser.id, requestDescription: notificationKey }, select: { id: true } })
        : null;
      if (alreadySent) return;
      if (targetUser) {
        await createNotification({
          kind: "INSTITUTE_LEAVE",
          tone: "blue",
          title: "Class Combined",
          message: `Your ${saved.courseName || "course"} - ${saved.batchName || "batch"} class on ${displayDate(combinedDate)}, from ${displayTime(combinedStartTime)} to ${displayTime(combinedEndTime)} will be handled by ${combinedFaculty?.name || "the assigned faculty"} instead of ${saved.originalFacultyName || "your regular faculty"}.`,
          actionLabel: "View Schedule",
          targetUserId: targetUser.id,
          targetBranchId: branchId,
          leaveRequestId: request.id,
          requestStatus: "COMBINED",
          requestDescription: notificationKey,
        });
      }
      try {
        if (student.emailAddress) await sendStudentCombinedClassEmail({ to: student.emailAddress, fullName: student.studentName, courseName: saved.courseName, batchName: saved.batchName, originalFacultyName: saved.originalFacultyName, combinedFacultyName: combinedFaculty?.name, combinedDate, combinedStartTime, combinedEndTime });
      } catch (error) {
        console.error(`[COMBINE] Student combined email failed for ${student.studentId || student.id}:`, error?.message || error);
      }
    }));
  }
  return mapSession(updated);
}

async function notifyFacultyLeaveApproval(request, branchId, actor) {
  const facultyUser = request.facultyUserId
    ? await prisma.user.findUnique({ where: { id: request.facultyUserId }, select: { id: true, email: true, fullName: true } })
    : null;
  const targetUserId = facultyUser?.id || null;
  const facultyEmail = String(facultyUser?.email || request.facultyEmail || "").trim();
  const facultyName = facultyUser?.fullName || request.facultyName || "Faculty";
  const dayType = request.durationType === "HALF_DAY" ? "Half Day" : request.durationType === "PERMISSION" ? "Permission" : "Full Day";
  const startTime = request.durationType === "PERMISSION" ? request.permissionStart : request.halfDayStart;
  const endTime = request.durationType === "PERMISSION" ? request.permissionEnd : request.halfDayEnd;
  const notificationKey = `faculty-leave-approval:${request.id}`;
  if (targetUserId) {
    const existing = await prisma.notification.findFirst({ where: { kind: "INSTITUTE_LEAVE", targetUserId, requestDescription: notificationKey }, select: { id: true } });
    if (!existing) await createNotification({
      kind: "INSTITUTE_LEAVE", tone: "green", title: "Leave Request Approved",
      message: `${facultyName}, your ${dayType.toLowerCase()} leave request has been approved for ${displayDate(request.fromDate)}${startTime && endTime ? `, from ${displayTime(startTime)} to ${displayTime(endTime)}` : "."}`,
      actionLabel: "View Leave Request", targetUserId, targetBranchId: branchId, leaveRequestId: request.id,
      facultyId: request.facultyId || "", facultyName, requestStatus: "APPROVED", requestReason: request.reason || "",
      requestDescription: notificationKey, createdBy: actor?.id || null,
    });
  }
  if (facultyEmail) {
    try { await sendFacultyLeaveApprovalEmail({ to: facultyEmail, fullName: facultyName, leaveDate: request.fromDate, leaveType: request.leaveType, dayType, startTime, endTime }); }
    catch (error) { console.warn("Faculty leave approval email failed", error?.message || error); }
  }
}

export async function approveBranchFacultyLeave(user, leaveId) {
  const { branchId, request } = await getScopedLeave(user, leaveId);
  if (!["PENDING", "UNDER_REVIEW"].includes(request.status)) throw new AppError("Only pending leave requests can be approved", 409);
  const unresolved = await prisma.facultyLeaveAffectedSession.count({ where: { leaveRequestId: leaveId, branchId, resolutionStatus: "UNRESOLVED" } });
  if (unresolved) throw new AppError("Resolve all affected classes before approving this leave request", 409);
  const approved = await prisma.facultyLeaveRequest.update({ where: { id: leaveId }, data: { status: "APPROVED", approvedBy: user.id, approvedAt: new Date(), reviewedBy: user.id, reviewedAt: new Date() } });
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

export async function listMyTemporaryFacultyBatches(user) {
  const faculty = await resolveFacultyContext(user);
  const today = new Date().toISOString().slice(0, 10);
  const sessions = await prisma.facultyLeaveAffectedSession.findMany({
    where: {
      branchId: faculty.branchId,
      sessionDate: { gte: today },
      resolutionStatus: { in: ["REPLACEMENT_ASSIGNED", "COMBINED"] },
      OR: [
        { replacementFacultyId: faculty.facultyId },
        { combinedSessionId: { not: null } },
      ],
    },
    orderBy: [{ sessionDate: "asc" }, { originalStartTime: "asc" }],
  });
  const combinedIds = sessions.map(session => session.combinedSessionId).filter(Boolean);
  const combined = combinedIds.length ? await prisma.facultyLeaveCombinedSession.findMany({ where: { id: { in: combinedIds }, facultyId: faculty.facultyId, status: "ACTIVE", sessionDate: { gte: today } } }) : [];
  const combinedById = new Map(combined.map(item => [item.id, item]));
  return { batches: sessions.filter(session => (session.resolutionStatus === "REPLACEMENT_ASSIGNED" && session.replacementFacultyId === faculty.facultyId) || combinedById.has(session.combinedSessionId)).map(session => ({
    ...mapSession(session),
    assignmentType: session.resolutionStatus === "COMBINED" ? "COMBINED" : "REPLACEMENT",
    assignmentLabel: session.resolutionStatus === "COMBINED" ? "Combined Class" : "Replacement",
    combinedFacultyName: session.resolutionStatus === "COMBINED" ? combinedById.get(session.combinedSessionId)?.facultyName || null : null,
    temporary: true,
    effectiveDate: session.replacementDate || session.sessionDate,
    effectiveStartTime: session.resolutionStatus === "COMBINED" ? combinedById.get(session.combinedSessionId)?.startTime : session.replacementStartTime || session.rescheduledStartTime || session.originalStartTime,
    effectiveEndTime: session.resolutionStatus === "COMBINED" ? combinedById.get(session.combinedSessionId)?.endTime : session.replacementEndTime || session.rescheduledEndTime || session.originalEndTime,
  })) };
}

export async function listMyTemporaryBatchStudents(user, sessionId) {
  const faculty = await resolveFacultyContext(user);
  const today = new Date().toISOString().slice(0, 10);
  const session = await prisma.facultyLeaveAffectedSession.findFirst({
    where: { id: text(sessionId), branchId: faculty.branchId, sessionDate: { gte: today }, OR: [
      { replacementFacultyId: faculty.facultyId, replacementStatus: "CONFIRMED", resolutionStatus: "REPLACEMENT_ASSIGNED", replacementDate: { gte: today } },
      { resolutionStatus: "COMBINED", combinedSessionId: { not: null } },
    ] },
    select: { id: true, batchId: true, batchName: true, courseId: true, courseName: true, sessionDate: true, replacementDate: true, replacementStartTime: true, replacementEndTime: true, originalFacultyId: true, originalFacultyName: true, replacementFacultyName: true, resolutionStatus: true, combinedSessionId: true },
  });
  if (!session) throw new AppError("This replacement assignment is no longer available", 403);
  let combined = null;
  if (session.resolutionStatus === "COMBINED") {
    combined = await prisma.facultyLeaveCombinedSession.findFirst({ where: { id: session.combinedSessionId, facultyId: faculty.facultyId, status: "ACTIVE", sessionDate: { gte: today } } });
    if (!combined) throw new AppError("This combined assignment is no longer available", 403);
    session.replacementDate = combined.sessionDate;
    session.replacementStartTime = combined.startTime;
    session.replacementEndTime = combined.endTime;
    session.replacementFacultyName = combined.facultyName;
  }
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
    select: { id: true, fromDate: true, toDate: true, durationType: true, halfDayStart: true, halfDayEnd: true, permissionStart: true, permissionEnd: true },
  });
  const overlap = existingLeaves.find((existing) => leaveRequestsOverlap(existing, leave));
  if (overlap) throw new AppError("You already have a pending or approved leave request overlapping this date/time", 409);
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
    select: { id: true, fromDate: true, toDate: true, durationType: true, halfDayStart: true, halfDayEnd: true, permissionStart: true, permissionEnd: true },
  });
  if (existingLeaves.some((existing) => leaveRequestsOverlap(existing, leave))) throw new AppError("You already have a pending or approved leave request overlapping this date/time", 409);
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
