import prisma from '../../config/prisma.js';
import AppError from '../../common/errors/AppError.js';
import { generateSchedule, localClock, timeMinutes, validDate } from './instituteSchedule.js';

function notificationDate(value) {
  const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value || '-';
}

function notificationTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value || '-';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export async function scheduleContext(db, branchId) {
  const [branch, batches] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId } }),
    db.branchBatch.findMany({ where: { branchId }, include: { branchCourse: true } }),
  ]);
  const [holidays, leaves] = await Promise.all([
    db.branchCalendarHoliday.findMany({ where: { status: 'ACTIVE', OR: [{ branchId }, { branchId: null }] } }),
    db.branchCalendarLeave.findMany({ where: { branchId, status: 'ACTIVE' } }),
  ]);
  return { branch, batches, holidays, leaves };
}

function branchToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function datesBetween(from, to) {
  if (!validDate(from) || !validDate(to) || from > to) return [];
  const dates = [];
  for (let cursor = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) dates.push(cursor.toISOString().slice(0, 10));
  return dates;
}
export function studentSchedule(student, context, now = new Date()) {
  const batch = context.batches.find(b => [b.batchId, b.id].includes(student.batchId) && [b.courseId, b.branchCourseId].includes(student.courseId) && [b.facultyId, b.branchFacultyId].includes(student.facultyId));
  if (!batch) throw new AppError(`Student ${student.studentId} has no valid assigned batch`, 409);
  try { return generateSchedule({ student, batch, ...context, timezone: context.branch.timezone, now }); }
  catch (error) { throw new AppError(error.message, 409); }
}
export async function studentCalendar(user, query = {}) {
  const student = await prisma.branchStudent.findFirst({ where: { emailAddress: { equals: user.email, mode: 'insensitive' } }, include: { course: true, calendarAttendanceRecords: true } });
  if (!student) throw new AppError('Student profile not found', 404);
  const calculation = studentSchedule(student, await scheduleContext(prisma, student.branchId));
  const studentBatchRecord = student.batchId
    ? await prisma.branchBatch.findFirst({ where: { branchId: student.branchId, OR: [{ id: student.batchId }, { batchId: student.batchId }], status: 'ACTIVE' }, select: { id: true, batchId: true } })
    : null;
  const affectedSessions = await prisma.facultyLeaveAffectedSession.findMany({
    where: {
      branchId: student.branchId,
      OR: [
        ...(student.batchId ? [{ batchId: student.batchId }] : []),
        ...(studentBatchRecord?.id ? [{ batchRecordId: studentBatchRecord.id }] : []),
      ],
    },
    select: { id: true, leaveRequestId: true, batchRecordId: true, batchId: true, batchName: true, courseId: true, courseName: true, originalFacultyId: true, originalFacultyName: true, sessionDate: true, originalStartTime: true, originalEndTime: true, resolutionStatus: true, replacementFacultyId: true, replacementFacultyName: true, replacementDate: true, replacementStartTime: true, replacementEndTime: true, rescheduledDate: true, rescheduledStartTime: true, rescheduledEndTime: true, combinedSessionId: true, resolutionReason: true },
  });
  const combinedRows = await prisma.facultyLeaveCombinedSession.findMany({ where: { id: { in: affectedSessions.map(session => session.combinedSessionId).filter(Boolean) }, status: 'ACTIVE' } });
  const combinedById = new Map(combinedRows.map(row => [row.id, row]));
  const assignmentEvents = affectedSessions.flatMap(session => {
    if (session.resolutionStatus === 'RESCHEDULED') {
      const original = { id: `faculty-leave-session:${session.id}:original`, sessionId: session.id, leaveRequestId: session.leaveRequestId, date: session.sessionDate, code: 'RESCHEDULED_ORIGINAL', status: 'Rescheduled', courseId: session.courseId || student.courseId, courseName: session.courseName || student.courseName || student.course?.name || '', batchId: session.batchId, batchName: session.batchName || student.batchName, batchRecordId: session.batchRecordId || null, originalFacultyId: session.originalFacultyId, originalFacultyName: session.originalFacultyName, originalDate: session.sessionDate, originalStartTime: session.originalStartTime, originalEndTime: session.originalEndTime, rescheduledDate: session.rescheduledDate, rescheduledStartTime: session.rescheduledStartTime, rescheduledEndTime: session.rescheduledEndTime, assignmentType: 'RESCHEDULED', startTime: session.originalStartTime, endTime: session.originalEndTime, reason: session.resolutionReason || '' };
      const moved = { ...original, id: `faculty-leave-session:${session.id}`, date: session.rescheduledDate, code: 'RESCHEDULED', status: 'Rescheduled', startTime: session.rescheduledStartTime, endTime: session.rescheduledEndTime };
      return [original, moved].filter(event => validDate(event.date) && (!validDate(query.from) || event.date >= query.from) && (!validDate(query.to) || event.date <= query.to));
    }
    const combined = session.resolutionStatus === 'COMBINED' ? combinedById.get(session.combinedSessionId) : null;
    const date = session.resolutionStatus === 'COMBINED' ? combined?.sessionDate || session.sessionDate : session.replacementDate || session.sessionDate;
    if (!validDate(date) || (validDate(query.from) && date < query.from) || (validDate(query.to) && date > query.to)) return [];
    const assignedFacultyName = session.resolutionStatus === 'COMBINED' ? combined?.facultyName : session.replacementFacultyName;
    const assignedFacultyId = session.resolutionStatus === 'COMBINED' ? combined?.facultyId : session.replacementFacultyId;
    const isCombined = session.resolutionStatus === 'COMBINED' && combined;
    const isAssigned = isCombined || session.resolutionStatus === 'REPLACEMENT_ASSIGNED';
    return [{
      id: `faculty-leave-session:${session.id}`,
      sessionId: session.id,
      leaveRequestId: session.leaveRequestId,
      date,
      code: isCombined ? 'COMBINED' : isAssigned ? 'REASSIGNED' : 'LEAVE',
      status: isCombined ? 'Combined' : isAssigned ? 'Reassigned' : 'Leave',
      courseId: session.courseId || student.courseId,
      courseName: session.courseName || student.courseName || student.course?.name || '',
      batchId: session.batchId,
      batchName: session.batchName || student.batchName,
      batchRecordId: session.batchRecordId || null,
      originalFacultyId: session.originalFacultyId,
      originalFacultyName: session.originalFacultyName,
      replacementFacultyId: assignedFacultyId || null,
      replacementFacultyName: assignedFacultyName || null,
      combinedFacultyId: isCombined ? assignedFacultyId || null : null,
      combinedFacultyName: isCombined ? assignedFacultyName || null : null,
      assignmentType: isCombined ? 'COMBINED' : isAssigned ? 'REPLACEMENT' : 'LEAVE',
      startTime: isCombined ? combined.startTime : session.replacementStartTime || session.originalStartTime,
      endTime: isCombined ? combined.endTime : session.replacementEndTime || session.originalEndTime,
      reason: session.resolutionReason || '',
    }];
  });
  const movedOriginals = new Set(affectedSessions.filter(session => session.resolutionStatus === 'RESCHEDULED').map(session => `${session.sessionDate}:${session.batchId}:${session.originalStartTime}`));
  const eventMap = new Map(calculation.events.filter(event => !movedOriginals.has(`${event.date}:${event.batchId || ''}:${event.startTime || ''}`)).map(event => [`${event.date}:${event.batchId || ''}:${event.startTime || ''}`, event]));
  assignmentEvents.forEach(event => eventMap.set(`assignment:${event.id}`, event));
  return { ...calculation, studentId: student.studentId, course: { ...student.course, totalHours: calculation.totalHours },
    batch: { id: student.batchId, name: student.batchName, timing: student.batchTiming },
    courseMode: student.courseMode || student.course?.mode,
    events: [...eventMap.values()].filter(e => (!validDate(query.from) || e.date >= query.from) && (!validDate(query.to) || e.date <= query.to)) };
}
async function adminBranch(user, db = prisma) {
  const role = String(user?.role || '').trim().toUpperCase();
  const impersonatedBranchId = String(user?.impersonatedBranchId || '').trim();

  if (role === 'SUPER_ADMIN' && impersonatedBranchId) {
    const branch = await db.branch.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ id: impersonatedBranchId }, { branchId: impersonatedBranchId }],
      },
    });
    if (!branch) throw new AppError('Authorized branch not found', 404);
    return branch;
  }

  if (role !== 'BRANCH_ADMIN') throw new AppError('Only Branch Admin can manage Institute Leave', 403);
  const branch = await db.branch.findFirst({ where: { adminUserId: user.id, status: 'ACTIVE' } });
  if (!branch) throw new AppError('Authorized branch not found', 403);
  return branch;
}
const classesFor = effects => [...new Map(effects.map(e => [`${e.batchRecordId}:${e.date}:${e.startTime}`, e])).values()];
function present(leave, today) {
  const effects = Array.isArray(leave.affectedClasses) ? leave.affectedClasses : [];
  return { ...leave, affectedClassCount: classesFor(effects).length, affectedStudentCount: new Set(effects.map(e => e.studentId)).size,
    affectedFacultyCount: new Set(effects.map(e => e.facultyId)).size,
    canEdit: leave.status === 'ACTIVE' && leave.leaveDate > today };
}
export async function listLeaves(user, query = {}, client = prisma) {
  const branch = await adminBranch(user, client), today = localClock(new Date(), branch.timezone).date;
  const leaves = await client.branchCalendarLeave.findMany({ where: { branchId: branch.id, isInstitute: true }, orderBy: [{ leaveDate: 'desc' }, { createdAt: 'desc' }] });
  const active = leaves.filter(l => l.status === 'ACTIVE');
  return { today, timezone: branch.timezone, summary: { today: active.filter(l => l.leaveDate === today).length,
    upcoming: active.filter(l => l.leaveDate > today).length, thisMonth: active.filter(l => l.leaveDate.startsWith(today.slice(0, 7))).length,
    affectedClasses: active.reduce((sum, l) => sum + classesFor(l.affectedClasses || []).length, 0) },
    leaves: leaves.filter(l => (!query.search || `${l.leaveDate} ${l.reason}`.toLowerCase().includes(String(query.search).toLowerCase())) && (!query.status || l.status === query.status)).map(l => present(l, today)) };
}
export async function getLeave(user, id, client = prisma) {
  const branch = await adminBranch(user, client);
  const leave = await client.branchCalendarLeave.findFirst({ where: { id, branchId: branch.id, isInstitute: true } });
  if (!leave) throw new AppError('Institute Leave not found', 404);
  return present(leave, localClock(new Date(), branch.timezone).date);
}
export async function mutateLeave(user, id, payload = {}, cancel = false, client = prisma) {
  const branch = await adminBranch(user, client);
  try { return await client.$transaction(async db => {
    // Serializes leave mutations and branch attendance writes. No partial schedules/notifications.
    await db.$queryRaw`SELECT id FROM "Branch" WHERE id = ${branch.id} FOR UPDATE`;
    const now = new Date(), today = localClock(now, branch.timezone).date;
    const existing = id ? await db.branchCalendarLeave.findFirst({ where: { id, branchId: branch.id, isInstitute: true } }) : null;
    if (id && !existing) throw new AppError('Institute Leave not found', 404);
    if (existing && (existing.status !== 'ACTIVE' || existing.leaveDate < today)) throw new AppError('Only active current or future leaves can be changed', 409);
    const date = payload.leaveDate, reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
    const leaveStartTime = payload.leaveStartTime ? String(payload.leaveStartTime).trim() : null;
    const leaveEndTime = payload.leaveEndTime ? String(payload.leaveEndTime).trim() : null;
    const startMinutes = leaveStartTime == null ? null : timeMinutes(leaveStartTime);
    const endMinutes = leaveEndTime == null ? null : timeMinutes(leaveEndTime);
    if (!cancel && (!validDate(date) || date < today || (existing && date < today))) throw new AppError('Select a valid leave date; edited leaves cannot be historical', 400);
    if (!cancel && (!reason || reason.length > 1000)) throw new AppError('Reason is required and must be at most 1000 characters', 400);
    if (!cancel && ((leaveStartTime && startMinutes === null) || (leaveEndTime && endMinutes === null) || (leaveStartTime && !leaveEndTime) || (!leaveStartTime && leaveEndTime) || (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes))) throw new AppError('Leave start and end times must be a valid range', 400);
    const context = await scheduleContext(db, branch.id);
    if (!cancel && context.leaves.some(l => l.id !== id && l.isInstitute && l.leaveDate === date)) throw new AppError('Active Institute Leave already exists for this date', 409);
    const students = await db.branchStudent.findMany({ where: { branchId: branch.id, recordStatus: 'ACTIVE', batchId: { not: null }, courseId: { not: null } }, include: { course: true, calendarAttendanceRecords: true } });
    const before = new Map(students.map(s => [s.id, studentSchedule(s, context, now)]));
    const leaveData = { leaveDate: date, leaveStartTime, leaveEndTime, reason, declaredAt: now, declaredBy: user.id };
    const record = existing ? await db.branchCalendarLeave.update({ where: { id }, data: cancel ? { status: 'INACTIVE' } : leaveData })
      : await db.branchCalendarLeave.create({ data: { branchId: branch.id, isInstitute: true, ...leaveData } });
    context.leaves = context.leaves.filter(l => l.id !== id);
    if (!cancel) context.leaves.push(record);
    const effects = [], after = new Map();
    for (const student of students) {
      const schedule = studentSchedule(student, context, now);
      after.set(student.id, schedule);
      effects.push(...schedule.events.filter(e => e.leaveId === record.id).map(e => ({ ...e, studentName: student.studentName })));
      if (schedule.endDate !== before.get(student.id).endDate) await db.branchStudent.update({ where: { id: student.id }, data: { courseEndDate: schedule.endDate } });
    }
    for (const batch of context.batches) {
      if (!batch.courseStartDate || !batch.branchCourse) continue;
      const schedule = generateSchedule({ student: { id: batch.id, studentId: batch.batchId, batchId: batch.batchId, batchName: batch.batchName, courseStartDate: batch.courseStartDate, course: batch.branchCourse, classSchedule: batch.weekType === 'WEEKEND' ? 'Weekend' : 'Weekday', facultyId: batch.facultyId, batchTiming: batch.batchTiming }, batch, ...context, timezone: context.branch.timezone, now });
      if (schedule.actualCourseEndDate !== batch.courseEndDate) await db.branchBatch.update({ where: { id: batch.id }, data: { courseEndDate: schedule.actualCourseEndDate } });
    }
    // Recompute snapshots for other active leaves: earlier edits can move later affected sessions.
    for (const leave of context.leaves.filter(l => l.isInstitute && l.id !== record.id && l.leaveDate > today)) {
      const affectedClasses = students.flatMap(s => after.get(s.id).events.filter(e => e.leaveId === leave.id).map(e => ({ ...e, studentName: s.studentName })));
      await db.branchCalendarLeave.update({ where: { id: leave.id }, data: { affectedClasses } });
    }
    if (!cancel) await db.branchCalendarLeave.update({ where: { id: record.id }, data: { affectedClasses: effects } });
    const changed = students.filter(s => JSON.stringify(before.get(s.id).events) !== JSON.stringify(after.get(s.id).events));
    const batches = new Map(context.batches.map(b => [b.id, b]));
    const notices = new Map();
    for (const student of changed) {
      const changedEvents = [...before.get(student.id).events, ...after.get(student.id).events].filter(e => e.leaveId === record.id || (e.date === (existing?.leaveDate || date) && e.isCourseDay));
      const details = [...new Map(changedEvents.map(e => [`${e.date}:${e.startTime}:${e.endTime}`, { date: e.date, startTime: e.startTime, endTime: e.endTime }])).values()];
      if (!details.length) continue;
      const emails = [student.emailAddress, ...changedEvents.map(e => batches.get(e.batchRecordId)?.facultyEmail)].filter(Boolean);
      for (const email of emails) {
        const key = email.toLowerCase();
        if (!notices.has(key)) notices.set(key, new Set());
        details.forEach(detail => notices.get(key).add(JSON.stringify(detail)));
      }
    }
    const users = notices.size ? await db.user.findMany({ where: { active: true, role: { in: ['STUDENT', 'FACULTY'] }, email: { in: [...notices.keys()], mode: 'insensitive' } } }) : [];
    if (users.length) {
      const notificationRows = users.flatMap(recipient => [...(notices.get(recipient.email.toLowerCase()) || [])].map(rawDetail => {
        const detail = JSON.parse(rawDetail);
        const leaveReason = cancel ? existing.reason : reason;
        const title = cancel ? 'Institute Leave Cancelled' : 'Institute Leave Declared';
        const dateLabel = notificationDate(detail.date);
        const startLabel = notificationTime(detail.startTime);
        const endLabel = notificationTime(detail.endTime);
        const message = cancel
          ? `The institute leave scheduled for ${dateLabel}, from ${startLabel} to ${endLabel} has been cancelled. Your class will proceed as scheduled. Your calendar has been updated accordingly.`
          : `An institute leave has been declared for ${dateLabel}, from ${startLabel} to ${endLabel} due to ${leaveReason}. Your calendar has been updated accordingly.`;
        return { kind: 'INSTITUTE_LEAVE', title, message, targetUserId: recipient.id, targetBranchId: branch.id, createdBy: user.id, tone: 'amber' };
      }));
      if (notificationRows.length) await db.notification.createMany({ data: notificationRows });
    }
    return present({ ...record, affectedClasses: cancel ? existing.affectedClasses : effects }, today);
  }, { timeout: 60000 }); } catch (error) {
    if (error.code === 'P2002') throw new AppError('Active Institute Leave already exists for this date', 409);
    throw error;
  }
}
export async function facultyCalendar(user, query = {}) {
  const facultyIdentity = [user?.userCode, user?.id].map(value => String(value || '').trim()).filter(Boolean);
  const faculties = await prisma.branchFaculty.findMany({ where: { status: 'ACTIVE', OR: [
    ...(user?.email ? [{ email: { equals: user.email, mode: 'insensitive' } }] : []),
    ...(facultyIdentity.length ? [{ facultyId: { in: facultyIdentity } }, { id: { in: facultyIdentity } }] : []),
  ] } });
  const events = new Map();
  const from = validDate(query.from) ? query.from : '';
  const to = validDate(query.to) ? query.to : '';
  const loginRows = from && to ? await prisma.facultyAttendanceSession.findMany({ where: { facultyUserId: user.id, attendanceDate: { gte: from, lte: to }, sessionSource: { in: ['AUTH', 'ATTENDANCE'] } }, orderBy: [{ attendanceDate: 'asc' }, { loginAt: 'asc' }], select: { attendanceDate: true, loginAt: true } }) : [];
  const loginsByDate = new Map();
  for (const row of loginRows) if (!loginsByDate.has(row.attendanceDate)) loginsByDate.set(row.attendanceDate, row);
  const today = branchToday();
  for (const date of datesBetween(from, to)) {
    if (date > today) continue;
    const login = loginsByDate.get(date);
    events.set(`faculty-attendance:${date}`, { id: `faculty-attendance:${date}`, date, code: login ? 'FACULTY_PRESENT' : 'FACULTY_ABSENT', status: login ? 'Present' : 'Absent', attendanceStatus: login ? 'PRESENT' : 'ABSENT', loginAt: login?.loginAt || null, facultyId: user.userCode || user.id, facultyUserId: user.id });
  }
  for (const branchId of new Set(faculties.map(f => f.branchId))) {
    const context = await scheduleContext(prisma, branchId);
    const ids = faculties.filter(f => f.branchId === branchId).flatMap(f => [f.id, f.facultyId]);
    const students = await prisma.branchStudent.findMany({ where: { branchId, facultyId: { in: ids }, recordStatus: 'ACTIVE', batchId: { not: null } }, include: { course: true, calendarAttendanceRecords: true } });
    for (const student of students) for (const event of studentSchedule(student, context).events) {
      if (event.code === 'HOLIDAY') continue;
      if ((validDate(query.from) && event.date < query.from) || (validDate(query.to) && event.date > query.to)) continue;
      const key = `${event.batchRecordId}:${event.date}:${event.startTime}:${event.code}`;
      const previous = events.get(key);
      const batch = context.batches.find(item => item.id === event.batchRecordId);
      events.set(key, { ...event, courseId: batch?.courseId || student.courseId, courseName: batch?.courseName || student.course?.name || null, mode: batch?.mode || student.courseMode || null, studentCount: (previous?.studentCount || 0) + 1 });
    }
    const facultyBatches = context.batches.filter(batch => ids.includes(batch.id) || ids.includes(batch.facultyId) || ids.includes(batch.branchFacultyId));
    for (const holiday of context.holidays) {
      if (!validDate(holiday.holidayDate)) continue;
      const affectedBatch = facultyBatches.find(batch => (!validDate(batch.courseStartDate) || holiday.holidayDate >= batch.courseStartDate) && (!validDate(batch.courseEndDate) || holiday.holidayDate <= batch.courseEndDate));
      if (!affectedBatch || (validDate(query.from) && holiday.holidayDate < query.from) || (validDate(query.to) && holiday.holidayDate > query.to)) continue;
      const key = `holiday:${holiday.holidayDate}`;
      events.set(key, { id: holiday.id, date: holiday.holidayDate, code: 'HOLIDAY', status: 'General Holiday', holidayName: holiday.name, name: holiday.name, holidayType: 'GENERAL', affectedBatchIds: facultyBatches.filter(batch => (!validDate(batch.courseStartDate) || holiday.holidayDate >= batch.courseStartDate) && (!validDate(batch.courseEndDate) || holiday.holidayDate <= batch.courseEndDate)).map(batch => batch.batchId) });
    }
    const approved = await prisma.facultyLeaveRequest.findMany({ where: { branchId, facultyId: { in: ids }, status: 'APPROVED' }, orderBy: [{ fromDate: 'asc' }, { createdAt: 'asc' }] });
    for (const leave of approved) {
      for (let cursor = new Date(`${leave.fromDate}T00:00:00Z`), end = new Date(`${leave.toDate}T00:00:00Z`); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const date = cursor.toISOString().slice(0, 10);
        if ((validDate(query.from) && date < query.from) || (validDate(query.to) && date > query.to)) continue;
        const code = leave.durationType === 'PERMISSION' ? 'PERMISSION' : leave.durationType === 'HALF_DAY' ? 'HALF_DAY' : 'LEAVE';
        const key = `faculty-leave:${leave.id}:${date}`;
        events.set(key, { id: leave.id, date, code, status: 'Approved', leaveType: leave.leaveType, durationType: leave.durationType, durationDays: leave.durationDays, halfDayStart: leave.halfDayStart, halfDayEnd: leave.halfDayEnd, permissionStart: leave.permissionStart, permissionEnd: leave.permissionEnd, permissionHours: leave.permissionHours, reason: leave.reason, facultyId: leave.facultyId, facultyName: leave.facultyName, affectedClasses: leave.affectedClasses || [] });
      }
    }

    const facultyIds = faculties.filter(f => f.branchId === branchId).flatMap(f => [f.id, f.facultyId]).filter(Boolean);
    const affectedSessions = await prisma.facultyLeaveAffectedSession.findMany({
      where: {
        branchId,
        OR: [
          { originalFacultyId: { in: facultyIds } },
          { replacementFacultyId: { in: facultyIds }, replacementStatus: 'CONFIRMED', resolutionStatus: 'REPLACEMENT_ASSIGNED' },
          { resolutionStatus: 'COMBINED', combinedSessionId: { not: null } },
        ],
      },
      select: { id: true, leaveRequestId: true, batchRecordId: true, batchId: true, batchName: true, courseId: true, courseName: true, originalFacultyId: true, originalFacultyName: true, sessionDate: true, originalStartTime: true, originalEndTime: true, resolutionStatus: true, replacementFacultyId: true, replacementFacultyName: true, replacementStatus: true, replacementDate: true, replacementStartTime: true, replacementEndTime: true, rescheduledDate: true, rescheduledStartTime: true, rescheduledEndTime: true, combinedSessionId: true, resolutionReason: true },
    });
    const combinedRows = await prisma.facultyLeaveCombinedSession.findMany({
      where: { id: { in: affectedSessions.map(session => session.combinedSessionId).filter(Boolean) }, status: 'ACTIVE' },
    });
    const combinedById = new Map(combinedRows.map(row => [row.id, row]));
    const rescheduledSessions = affectedSessions.filter(session => session.resolutionStatus === 'RESCHEDULED');
    for (const session of rescheduledSessions) {
      if (!faculties.some(faculty => [faculty.id, faculty.facultyId].includes(session.originalFacultyId))) continue;
      for (const key of [...events.keys()]) {
        const event = events.get(key);
        if (event?.batchRecordId === session.batchRecordId && event?.date === session.sessionDate && event?.startTime === session.originalStartTime) events.delete(key);
      }
      const base = { sessionId: session.id, leaveRequestId: session.leaveRequestId, batchRecordId: session.batchRecordId, batchId: session.batchId, batchName: session.batchName, courseId: session.courseId, courseName: session.courseName, originalFacultyId: session.originalFacultyId, originalFacultyName: session.originalFacultyName, originalDate: session.sessionDate, originalStartTime: session.originalStartTime, originalEndTime: session.originalEndTime, rescheduledDate: session.rescheduledDate, rescheduledStartTime: session.rescheduledStartTime, rescheduledEndTime: session.rescheduledEndTime, assignmentType: 'RESCHEDULED', resolutionType: 'RESCHEDULED', reason: session.resolutionReason || '' };
      events.set(`faculty-leave-session:${session.id}:original`, { ...base, id: `faculty-leave-session:${session.id}:original`, date: session.sessionDate, code: 'RESCHEDULED_ORIGINAL', status: 'Rescheduled', startTime: session.originalStartTime, endTime: session.originalEndTime });
      if (validDate(session.rescheduledDate) && (!from || session.rescheduledDate >= from) && (!to || session.rescheduledDate <= to)) events.set(`faculty-leave-session:${session.id}`, { ...base, id: `faculty-leave-session:${session.id}`, date: session.rescheduledDate, code: 'RESCHEDULED', status: 'Rescheduled', startTime: session.rescheduledStartTime, endTime: session.rescheduledEndTime });
    }
    for (const session of affectedSessions.filter(item => item.resolutionStatus !== 'RESCHEDULED')) {
      const combined = session.resolutionStatus === 'COMBINED' ? combinedById.get(session.combinedSessionId) : null;
      const isOriginalFaculty = facultyIds.includes(session.originalFacultyId);
      if (session.resolutionStatus === 'COMBINED' && (!combined || (!facultyIds.includes(combined.facultyId) && !isOriginalFaculty))) continue;
      const temporaryFacultyId = session.resolutionStatus === 'COMBINED' ? combined?.facultyId : session.replacementFacultyId;
      const isTemporaryFaculty = temporaryFacultyId && facultyIds.includes(temporaryFacultyId);
      const eventDate = session.resolutionStatus === 'COMBINED' ? combined?.sessionDate || session.sessionDate : session.replacementDate || session.sessionDate;
      if (!validDate(eventDate) || (from && eventDate < from) || (to && eventDate > to)) continue;
      const startTime = session.resolutionStatus === 'COMBINED' ? combined?.startTime : session.replacementStartTime || session.originalStartTime;
      const endTime = session.resolutionStatus === 'COMBINED' ? combined?.endTime : session.replacementEndTime || session.originalEndTime;
      const assignmentType = session.resolutionStatus === 'COMBINED' ? 'COMBINED' : 'REPLACEMENT';
      const code = isTemporaryFaculty ? (assignmentType === 'COMBINED' ? 'COMBINED' : 'REASSIGNED') : 'LEAVE';
      const batchRecord = context.batches.find(batch => batch.id === session.batchRecordId || batch.batchId === session.batchId);
      const event = {
        id: `faculty-leave-session:${session.id}`,
        leaveRequestId: session.leaveRequestId || session.requestId || null,
        sessionId: session.id,
        batchRecordId: session.batchRecordId || batchRecord?.id || null,
        batchId: session.batchId || batchRecord?.batchId || null,
        batchName: session.batchName || batchRecord?.batchName || null,
        courseId: session.courseId || batchRecord?.courseId || null,
        courseName: session.courseName || batchRecord?.courseName || null,
        date: eventDate,
        code,
        status: code === 'COMBINED' ? 'Combined' : code === 'REASSIGNED' ? 'Reassigned' : 'Leave',
        startTime,
        endTime,
        originalFacultyId: session.originalFacultyId || null,
        originalFacultyName: session.originalFacultyName || null,
        replacementFacultyId: assignmentType === 'COMBINED' ? combined?.facultyId || null : session.replacementFacultyId || null,
        replacementFacultyName: assignmentType === 'COMBINED' ? combined?.facultyName || null : session.replacementFacultyName || null,
        combinedFacultyId: assignmentType === 'COMBINED' ? combined?.facultyId || null : null,
        combinedFacultyName: assignmentType === 'COMBINED' ? combined?.facultyName || null : null,
        assignmentType,
        resolutionType: assignmentType,
        reason: session.resolutionReason || '',
        durationType: session.durationType || null,
        permissionStart: session.permissionStart || null,
        permissionEnd: session.permissionEnd || null,
      };
      events.set(event.id, event);
    }
  }
  const permanentFacultyIds = faculties.flatMap(f => [f.id, f.facultyId]);
  const temporarySessionIds = [...events.values()].filter(event => ['REASSIGNED', 'COMBINED'].includes(event.code)).map(event => event.batchRecordId).filter(Boolean);
  const batchRows = faculties.length ? await prisma.branchBatch.findMany({ where: { branchId: { in: [...new Set(faculties.map(f => f.branchId))] }, OR: [
    { facultyId: { in: permanentFacultyIds } },
    ...(temporarySessionIds.length ? [{ id: { in: temporarySessionIds } }] : []),
  ], status: 'ACTIVE' }, select: { id: true, batchId: true, batchName: true, courseId: true, courseName: true, facultyId: true, courseStartDate: true, courseEndDate: true, weeklyOffDay: true, weekType: true, mode: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, batchTiming: true } }) : [];
  const batchStudentRows = batchRows.length ? await prisma.branchStudent.findMany({
    where: { branchId: { in: [...new Set(faculties.map(f => f.branchId))] }, batchId: { in: batchRows.map(row => row.batchId) }, recordStatus: 'ACTIVE' },
    select: { batchId: true },
  }) : [];
  const studentCountByBatch = batchStudentRows.reduce((counts, student) => {
    counts.set(student.batchId, (counts.get(student.batchId) || 0) + 1);
    return counts;
  }, new Map());
  const calendarBatchRows = batchRows.map(row => ({ ...row, studentCount: studentCountByBatch.get(row.batchId) || 0 }));
  const starts = calendarBatchRows.map(row => row.courseStartDate).filter(validDate).sort();
  const ends = calendarBatchRows.map(row => row.courseEndDate).filter(validDate).sort();
  return { faculty: faculties[0] ? { id: faculties[0].facultyId, name: faculties[0].name, email: faculties[0].email } : null, batches: calendarBatchRows, startDate: starts[0] || null, endDate: ends.at(-1) || null, events: [...events.values()].sort((a, b) => `${a.date}${a.startTime || ''}`.localeCompare(`${b.date}${b.startTime || ''}`)) };
}
export async function assertAttendanceAllowed(db, students, date, branchId) {
  const context = await scheduleContext(db, branchId);
  const records = await db.branchStudent.findMany({ where: { id: { in: students.map(s => s.id) }, branchId }, include: { course: true, calendarAttendanceRecords: true } });
  for (const student of records) {
    if (studentSchedule(student, context).events.some(e => e.date === date && e.code === 'INSTITUTE_LEAVE')) throw new AppError('Institute Leave: attendance is Not Applicable', 409);
  }
}

export async function attendanceExclusions(db, students, date) {
  const excluded = new Set();
  for (const branchId of new Set(students.map(s => s.branchId))) {
    const context = await scheduleContext(db, branchId);
    if (!context.leaves.some(l => l.isInstitute && l.leaveDate === date)) continue;
    const records = await db.branchStudent.findMany({ where: { id: { in: students.filter(s => s.branchId === branchId).map(s => s.id) } }, include: { course: true, calendarAttendanceRecords: true } });
    for (const student of records) if (studentSchedule(student, context).events.some(e => e.date === date && e.code === 'INSTITUTE_LEAVE')) excluded.add(student.id);
  }
  return excluded;
}

export async function syncStudentCourseEnd(db, student) {
  if (!student.batchId || !student.courseId || !student.facultyId) return;
  const record = await db.branchStudent.findUnique({ where: { id: student.id }, include: { course: true, calendarAttendanceRecords: true } });
  const schedule = studentSchedule(record, await scheduleContext(db, student.branchId));
  await db.branchStudent.update({ where: { id: student.id }, data: { courseEndDate: schedule.endDate } });
  student.courseEndDate = schedule.endDate;
}
