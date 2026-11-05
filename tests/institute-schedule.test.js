import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSchedule, localClock, validDate, timeMinutes } from '../src/modules/instituteLeave/instituteSchedule.js';
const student = { id: 's1', studentId: 'S1', courseStartDate: '2026-09-11', classSchedule: 'Weekday', batchId: 'b1', course: { hours: 2 } };
const batch = { id: 'batch-record', batchId: 'b1', startTime: '11:30', startPeriod: 'AM', endTime: '01:30', endPeriod: 'PM' };
const leave = (date = '2026-09-11', extra = {}) => ({ id: 'l1', status: 'ACTIVE', isInstitute: true, leaveDate: date, reason: 'Closure', declaredAt: '2026-09-09T05:30:00Z', ...extra });
const run = (options = {}) => generateSchedule({ student, batch, leaves: [leave()], now: new Date('2026-09-09T05:30:00Z'), ...options });
test('Friday full-day leave recovers on Monday, skipping weekend', () => {
  const result = run();
  assert.equal(result.events[0].code, 'INSTITUTE_LEAVE');
  assert.equal(result.endDate, '2026-09-14');
  assert.equal(result.replacementHours, 2);
  assert.deepEqual(result.events.slice(1, 3).map(e => e.code), ['NO_CLASS', 'NO_CLASS']);
});
test('Weekend schedule continues Sunday and replaces on the next weekend', () => {
  const result = run({ student: { ...student, courseStartDate: '2026-09-12', classSchedule: 'Weekend', course: { hours: 4 } }, leaves: [leave('2026-09-12')] });
  assert.equal(result.endDate, '2026-09-19');
  assert.equal(result.events.find(e => e.date === '2026-09-13').classHours, 2);
  assert.ok(result.events.filter(e => e.isCourseDay).every(e => [0, 6].includes(new Date(e.date).getUTCDay())));
});
test('11 AM declaration preserves 9 AM and exactly 11 AM starts; cancels 11:30 AM and 2 PM', () => {
  for (const [startTime, startPeriod, endTime, endPeriod, affected] of [['09:00','AM','11:00','AM',false], ['11:00','AM','01:00','PM',false], ['11:30','AM','01:30','PM',true], ['02:00','PM','04:00','PM',true]]) {
    const result = run({ student: { ...student, courseStartDate: '2026-09-09' }, batch: { ...batch, startTime, startPeriod, endTime, endPeriod }, leaves: [leave('2026-09-09')] });
    assert.equal(result.events[0].code === 'INSTITUTE_LEAVE', affected);
    assert.equal(result.cancelledHours, affected ? 2 : 0);
    assert.equal(result.replacementHours, affected ? 2 : 0);
  }
});
test('Required 100 hours remain 100, including partial final sessions', () => {
  const result = run({ student: { ...student, course: { hours: 100 } }, batch: { ...batch, endTime: '02:30' } });
  assert.equal(result.requiredHours, 100);
  assert.equal(result.events.reduce((sum, e) => sum + e.classHours, 0), 100);
  assert.equal(result.events.at(-1).classHours, 1);
  assert.equal(result.events.at(-1).endTime, '12:30');
});
test('Two eligible leaves recover two class days, holidays also excluded', () => {
  const result = run({ student: { ...student, course: { hours: 4 } }, leaves: [leave(), leave('2026-09-14', { id: 'l2' })], holidays: [{ holidayDate: '2026-09-15', name: 'Holiday' }] });
  assert.equal(result.cancelledHours, 4);
  assert.equal(result.replacementHours, 4);
  assert.equal(result.endDate, '2026-09-17');
});
test('Attendance is Not Applicable on leave; existing attendance remains untouched', () => {
  assert.equal(run().events[0].attendanceStatus, 'NOT_APPLICABLE');
  const record = { attendanceDate: '2026-09-11', status: 'PRESENT' };
  const result = run({ student: { ...student, calendarAttendanceRecords: [record] } });
  assert.equal(result.events[0].code, 'COMPLETED');
  assert.equal(result.completedHours, 2);
  assert.equal(result.pendingHours, 0);
  assert.deepEqual(record, { attendanceDate: '2026-09-11', status: 'PRESENT' });
});
test('Cancel and date edit restore originals and recalculate replacements', () => {
  const baseline = run({ leaves: [] });
  const cancelled = run({ leaves: [leave(undefined, { status: 'INACTIVE' })] });
  assert.deepEqual(cancelled, baseline);
  const edited = run({ leaves: [leave('2026-09-14')] });
  assert.deepEqual(edited, baseline);
});
test('Branch timezone defines same-day cutoff across UTC date boundaries', () => {
  assert.deepEqual(localClock(new Date('2026-09-08T20:00:00Z'), 'Asia/Kolkata'), { date: '2026-09-09', seconds: 5400 });
  const result = run({ student: { ...student, courseStartDate: '2026-09-09' }, leaves: [leave('2026-09-09', { declaredAt: '2026-09-08T20:00:00Z' })] });
  assert.equal(result.events[0].code, 'INSTITUTE_LEAVE');
});
test('Strict dates, noon/midnight and invalid timing validation', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(timeMinutes('12:00 AM'), 0);
  assert.equal(timeMinutes('12:00 PM'), 720);
  assert.equal(timeMinutes('25:00 AM'), null);
  assert.throws(() => run({ batch: {} }), /timing/);
});
test('Leave on an ineligible day or outside course dates has no effect', () => {
  assert.deepEqual(run({ leaves: [leave('2026-09-12')] }), run({ leaves: [] }));
});
