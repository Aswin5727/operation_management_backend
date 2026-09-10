// Shared, deterministic calendar calculation. Dates are branch-local ISO dates.
import { batchDailyHours } from '../branchBatches/batchAllocation.js';
export function localClock(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, seconds: +parts.hour * 3600 + +parts.minute * 60 + +parts.second };
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
export function timeMinutes(value, period = '') {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = +match[1];
  const minute = +match[2], meridiem = (match[3] || period).toUpperCase();
  if (minute > 59 || hour > 23 || hour < 0) return null;
  // Existing batches store both 12-hour values (09:00 + AM) and 24-hour
  // values (16:00 + PM); accept either representation.
  if (meridiem && hour >= 1 && hour <= 12) hour = hour % 12 + (meridiem === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}
export function leaveOverlapsBatch(leave, batch) {
  const leaveStart = leave.leaveStartTime == null ? null : timeMinutes(leave.leaveStartTime);
  const leaveEnd = leave.leaveEndTime == null ? null : timeMinutes(leave.leaveEndTime);
  if (leaveStart === null || leaveEnd === null) return true;
  const batchStart = timeMinutes(batch?.startTime, batch?.startPeriod);
  const batchEnd = timeMinutes(batch?.endTime, batch?.endPeriod);
  return batchStart !== null && batchEnd !== null && batchStart < leaveEnd && batchEnd > leaveStart;
}
const timeLabel = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(Math.round(minutes % 60)).padStart(2, '0')}`;
export function timingFor(student, batch) {
  const split = String(student.batchTiming || batch?.batchTiming || '').split(/\s*[-–—]\s*/);
  const start = timeMinutes(batch?.startTime || split[0], batch?.startPeriod);
  const end = timeMinutes(batch?.endTime || split[1], batch?.endPeriod);
  if (start === null || end === null || end <= start) throw new Error(`Configure valid same-day batch timing for ${student.studentId || student.id}`);
  return { start, end, hours: (end - start) / 60 };
}
export function isAffected(leave, date, batch) {
  return leave.leaveDate === date && leaveOverlapsBatch(leave, batch);
}
const nextDay = date => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
export function generateSchedule({ student, batch, holidays = [], leaves = [], timezone = 'Asia/Kolkata', now = new Date() }) {
  const startDate = student.courseStartDate || student.admissionDate;
  if (!validDate(startDate)) throw new Error(`Configure course start date for ${student.studentId || student.id}`);
  const timing = timingFor(student, batch);
  const weekend = String(batch?.weekType || '').toUpperCase() === 'WEEKEND' || /weekend/i.test(student.classSchedule || '');
  const eligible = date => weekend ? [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) : ![0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
  const holidayMap = new Map(holidays.map(h => [h.holidayDate, h]));
  const configuredDailyHours = batch?.weekType && batch?.mode ? batchDailyHours(batch.weekType, batch.mode) : timing.hours;
  let requiredHours = Number(student.course?.hours || 0);
  if (!(requiredHours > 0)) {
    let days = Number(student.totalWorkingDays || 0);
    if (!days) {
      const end = new Date(`${startDate}T00:00:00Z`);
      end.setUTCMonth(end.getUTCMonth() + Number(student.course?.duration || 0));
      for (let date = startDate; date < end.toISOString().slice(0, 10); date = nextDay(date)) if (eligible(date)) days++;
    }
    requiredHours = days * timing.hours;
  }
  if (!(requiredHours > 0)) throw new Error(`Configure required course hours or duration for ${student.studentId || student.id}`);
  const attendance = new Map((student.calendarAttendanceRecords || []).map(a => [a.attendanceDate, a]));
  const today = localClock(now, timezone);
  const activeLeaves = leaves.filter(l => l.status === 'ACTIVE' && (!l.batchId || [student.batchId, batch?.id].includes(l.batchId)));
  function build(applyInstitute) {
    let remaining = requiredHours, completedHours = 0;
    const events = [];
    for (let date = startDate, guard = 0; remaining > 0.000001 && guard < 3660; date = nextDay(date), guard++) {
      const mark = attendance.get(date);
      const scheduledHours = Math.min(configuredDailyHours, remaining);
      const legacy = activeLeaves.find(l => !l.isInstitute && l.leaveDate === date);
      const leave = applyInstitute && activeLeaves.find(l => l.isInstitute && isAffected(l, date, batch));
      const holiday = holidayMap.get(date);
      const isClassDay = eligible(date);
      // Attendance already recorded is immutable and takes precedence over a later declaration.
      const excluded = isClassDay && !mark && (leave || legacy || holiday);
      const classHours = isClassDay && !excluded ? scheduledHours : 0;
      if (classHours) remaining = Math.max(0, remaining - classHours);
      if (classHours && mark?.status === 'PRESENT') completedHours += classHours;
      const finished = date < today.date || (date === today.date && timing.end * 60 <= today.seconds);
      const code = !isClassDay ? 'NO_CLASS' : excluded ? (leave ? 'INSTITUTE_LEAVE' : legacy ? 'LEAVE' : 'HOLIDAY') : mark?.status === 'PRESENT' ? 'COMPLETED' : finished ? 'CLASS' : 'SCHEDULED';
      events.push({ date, code, status: ({ NO_CLASS: 'No Class', INSTITUTE_LEAVE: 'Institute Leave', LEAVE: 'Leave', HOLIDAY: 'Government Holiday', COMPLETED: 'Completed', CLASS: 'Class', SCHEDULED: 'Scheduled' })[code],
        studentId: student.id, batchId: student.batchId, batchRecordId: batch?.id || null, batchName: student.batchName || batch?.batchName,
        facultyId: student.facultyId || batch?.facultyId, startTime: timeLabel(timing.start), endTime: timeLabel(timing.start + scheduledHours * 60),
        scheduledHours: isClassDay ? scheduledHours : 0, classHours, isCourseDay: classHours > 0,
        attendanceStatus: excluded ? 'NOT_APPLICABLE' : mark?.status || null,
        leaveId: excluded && leave ? leave.id : null, reason: excluded ? (leave?.reason || legacy?.reason || holiday?.name || '') : '',
        moduleName: mark?.moduleName || null, submoduleName: mark?.submoduleName || null, progress: mark?.progress ?? null });
    }
    if (remaining > 0.000001) throw new Error('Schedule exceeds the supported ten-year range');
    return { events, completedHours, endDate: events.at(-1)?.date };
  }
  const baseline = build(false), result = build(true);
  let replacementHours = 0, cancelledHours = 0;
  for (const event of result.events) {
    event.isReplacement = event.isCourseDay && event.date > baseline.endDate;
    if (event.isReplacement) replacementHours += event.classHours;
    if (event.code === 'INSTITUTE_LEAVE') cancelledHours += event.scheduledHours;
  }
  return { ...result, startDate, expectedEndDate: baseline.endDate, actualCourseEndDate: result.endDate,
    requiredHours, totalHours: requiredHours, completedHours: result.completedHours,
    pendingHours: requiredHours - result.completedHours, cancelledHours, replacementHours, hoursPerDay: configuredDailyHours,
    requiredTeachingDays: Math.ceil(requiredHours / configuredDailyHours), totalWorkingDays: Math.ceil(requiredHours / configuredDailyHours),
    actualTeachingDays: result.events.filter(e => e.isCourseDay).length,
    calendarDurationDays: (Date.parse(result.endDate) - Date.parse(startDate)) / 86400000 + 1,
    schedule: weekend ? 'Weekend' : 'Weekday', timezone };
}
