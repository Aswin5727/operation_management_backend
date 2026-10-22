import assert from 'node:assert/strict'
import test from 'node:test'
import { isCompletedStudentImportRecord, isAdmissionInRange } from '../src/modules/dashboard/dashboardAdmissions.js'

test('admissions use Admission Date first and fall back to Course Start Date', () => {
  assert.equal(isAdmissionInRange({ admissionDate: '2026-10-08', courseStartDate: '2026-09-01' }, '2026-10-01', '2026-10-22'), true)
  assert.equal(isAdmissionInRange({ admissionDate: '2026-09-30', courseStartDate: '2026-10-01' }, '2026-10-01', '2026-10-22'), false)
  assert.equal(isAdmissionInRange({ courseStartDate: '2026-10-01' }, '2026-10-01', '2026-10-22'), true)
  assert.equal(isAdmissionInRange({ admissionDate: 'N/A', courseStartDate: '2026-10-01' }, '2026-10-01', '2026-10-22'), true)
  assert.equal(isAdmissionInRange({ createdAt: '2026-10-10' }, '2026-10-01', '2026-10-22'), false)
  assert.equal(isAdmissionInRange({ id: 'approved-discontinued', admissionDate: '2026-10-08' }, '2026-10-01', '2026-10-22', new Set(['approved-discontinued'])), false)
})

test('completed-student Excel imports count only when their admission or course-start date is in range', () => {
  const completedUpload = {
    admissionDate: '2026-10-08',
    courseStartDate: '2026-09-01',
    courseEnrollments: [{ importedLifecycleStatus: 'COMPLETED' }],
  }
  const oldCompletedUpload = {
    courseStartDate: '2026-09-01',
    courseEnrollments: [{ importedLifecycleStatus: 'COMPLETED' }],
  }

  assert.equal(isCompletedStudentImportRecord(completedUpload), true)
  assert.equal(isAdmissionInRange(completedUpload, '2026-10-01', '2026-10-22'), true)
  assert.equal(isAdmissionInRange(oldCompletedUpload, '2026-10-01', '2026-10-22'), false)
})