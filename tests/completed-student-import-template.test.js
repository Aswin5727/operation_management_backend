import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'
import { completedStudentTemplate } from '../src/modules/reports/completedStudentImport.service.js'
import { COMPLETED_STUDENT_COLUMNS } from '../src/modules/reports/completedStudentReportColumns.js'
import { reportColumns } from '../src/modules/reports/branchMonthlyReport.service.js'

test('completed-student upload template includes Admission Date without changing shared monthly-report columns', async () => {
  const template = await completedStudentTemplate()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(template.buffer)

  const headers = workbook.worksheets[0].getRow(3).values.slice(1).map((value) => String(value || '').trim())
  assert.ok(headers.includes('Admission Date'))
  assert.equal(COMPLETED_STUDENT_COLUMNS.some(([key]) => key === 'admissionDate'), false)
})
test('Admission Date is available in Student Status exports only, not monthly report columns', () => {
  const monthlyColumnKeys = reportColumns([{}]).map(([key]) => key)
  const studentStatusColumnKeys = reportColumns([{}], true).map(([key]) => key)

  assert.equal(monthlyColumnKeys.includes('admissionDate'), false)
  assert.equal(studentStatusColumnKeys.includes('admissionDate'), true)
})