import assert from 'node:assert/strict'
import test from 'node:test'
import { courseOverlapsReportPeriod, filterPaymentsForReportPeriod, hasPeriodActivity, resolveReportPeriod } from '../src/modules/reports/branchMonthlyReport.service.js'

test('weekly report uses India Sunday through today and ignores stale month dates', () => {
  const result = resolveReportPeriod(
    { mode: 'week', fromDate: '2026-10-01', toDate: '2026-10-21' },
    new Date('2026-10-21T18:30:00.000Z'),
  )

  assert.deepEqual(result, { mode: 'week', fromDate: '2026-10-18', toDate: '2026-10-22' })
})

test('weekly report starts today when the current India date is Sunday', () => {
  const result = resolveReportPeriod(
    { mode: 'week', fromDate: '2026-10-01', toDate: '2026-10-17' },
    new Date('2026-10-17T19:00:00.000Z'),
  )

  assert.deepEqual(result, { mode: 'week', fromDate: '2026-10-18', toDate: '2026-10-18' })
})


test('monthly report period covers the selected month only', () => {
  const result = resolveReportPeriod(
    { mode: 'month', month: '9', year: '2026', fromDate: '2026-09-01', toDate: '2026-10-22' },
    new Date('2026-10-22T06:00:00.000Z'),
  )

  assert.deepEqual(result, { mode: 'month', fromDate: '2026-09-01', toDate: '2026-09-30' })
})

test('monthly payment data excludes transactions outside the selected month', () => {
  const payments = [
    { paymentDate: '2026-08-31T10:00:00.000Z', amount: 100 },
    { paymentDate: '2026-09-15T10:00:00.000Z', amount: 250 },
    { paymentDate: '2026-10-01T00:00:00.000Z', amount: 500 },
  ]

  assert.deepEqual(
    filterPaymentsForReportPeriod(payments, '2026-09-01', '2026-09-30').map((payment) => payment.amount),
    [250],
  )
})

test('studying course rows are included only when the course period overlaps the selected month', () => {
  assert.equal(courseOverlapsReportPeriod('2026-08-10', '2026-09-20', null, '2026-09-01', '2026-09-30'), true)
  assert.equal(courseOverlapsReportPeriod('2026-10-01', null, null, '2026-09-01', '2026-09-30'), false)
  assert.equal(courseOverlapsReportPeriod('2026-07-01', '2026-08-31', null, '2026-09-01', '2026-09-30'), false)
})


test('monthly collection reports treat a period with no activity as empty', () => {
  const student = {
    courseId: 'course-a',
    payments: [],
    installments: [{ courseId: 'course-a', dueDate: '2026-08-15' }],
    calendarAttendanceRecords: [],
  }
  const course = { courseId: 'course-a', batchId: 'batch-a', courseStartDate: '2026-08-01', courseEndDate: null }
  const studying = { rowStatusKey: 'studying', statusDate: '' }

  assert.equal(hasPeriodActivity(student, course, studying, '2026-09-01', '2026-09-30'), false)
  assert.equal(hasPeriodActivity({ ...student, payments: [{ courseId: 'course-a', paymentDate: '2026-09-12', amount: 500 }] }, course, studying, '2026-09-01', '2026-09-30'), true)
  assert.equal(hasPeriodActivity(student, { ...course, courseStartDate: '2026-09-05' }, studying, '2026-09-01', '2026-09-30'), true)
})
