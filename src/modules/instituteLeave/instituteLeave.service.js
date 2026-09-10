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
  const [branch, batches, holidays, leaves] = await Promise.all([
    db.branch.findUnique({ where: { id: branchId } }),
    db.branchBatch.findMany({ where: { branchId }, include: { branchCourse: true } }),
    db.branchCalendarHoliday.findMany({ where: { status: 'ACTIVE', OR: [{ branchId }, { branchId: null }] } }),
    db.branchCalendarLeave.findMany({ where: { branchId, status: 'ACTIVE' } }),
  ]);
  return { branch, batches, holidays, leaves };
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
  return { ...calculation, studentId: student.studentId, course: { ...student.course, totalHours: calculation.totalHours },
    batch: { id: student.batchId, name: student.batchName, timing: student.batchTiming },
    courseMode: student.courseMode || student.course?.mode,
    events: calculation.events.filter(e => (!validDate(query.from) || e.date >= query.from) && (!validDate(query.to) || e.date <= query.to)) };
}
async function adminBranch(user, db = prisma) {
  if (user.role !== 'BRANCH_ADMIN') throw new AppError('Only Branch Admin can manage Institute Leave', 403);
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
  const faculties = await prisma.branchFaculty.findMany({ where: { email: { equals: user.email, mode: 'insensitive' }, status: 'ACTIVE' } });
  const events = new Map();
  for (const branchId of new Set(faculties.map(f => f.branchId))) {
    const context = await scheduleContext(prisma, branchId);
    const ids = faculties.filter(f => f.branchId === branchId).flatMap(f => [f.id, f.facultyId]);
    const students = await prisma.branchStudent.findMany({ where: { branchId, facultyId: { in: ids }, recordStatus: 'ACTIVE', batchId: { not: null } }, include: { course: true, calendarAttendanceRecords: true } });
    for (const student of students) for (const event of studentSchedule(student, context).events) {
      if (!event.scheduledHours || (validDate(query.from) && event.date < query.from) || (validDate(query.to) && event.date > query.to)) continue;
      const key = `${event.batchRecordId}:${event.date}:${event.startTime}:${event.code}`;
      const previous = events.get(key);
      events.set(key, { ...event, studentCount: (previous?.studentCount || 0) + 1 });
    }
  }
  return { events: [...events.values()].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)) };
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
