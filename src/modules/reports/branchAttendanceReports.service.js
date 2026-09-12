import AppError from "../../common/errors/AppError.js";
import { buildExcelReport } from "./reports.excel.service.js";
import { parseDateRange, buildReportFileName } from "./reports.utils.js";
import {
  findBranchBatchAttendanceReportData,
  findBranchStudentAttendanceReportData,
  resolveBranchId,
} from "./branchAttendanceReports.repository.js";

const count = (records, status) => records.filter((row) => String(row.status || "").toUpperCase() === status).length;
const display = (value) => value === null || value === undefined || value === "" ? "-" : value;

function attendanceDateOf(record) {
  const value = String(record?.attendanceDate || record?.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }
  const markedAt = record?.markedAt ? new Date(record.markedAt) : null;
  return markedAt && Number.isFinite(markedAt.getTime())
    ? markedAt.toLocaleDateString("en-GB", { timeZone: "Asia/Calcutta" })
    : "-";
}

function attendanceTimeOf(record) {
  const markedAt = record?.markedAt ? new Date(record.markedAt) : null;
  return markedAt && Number.isFinite(markedAt.getTime())
    ? markedAt.toLocaleTimeString("en-US", { timeZone: "Asia/Calcutta", hour: "2-digit", minute: "2-digit", hour12: true })
    : "-";
}

function detailRows(records, studentsById) {
  return records.map((record, index) => {
    const student = studentsById.get(record.branchStudentId);
    return {
      serialNo: index + 1,
      attendanceDate: attendanceDateOf(record),
      attendanceTime: attendanceTimeOf(record),
      studentId: student?.studentId || "",
      studentName: student?.studentName || "",
      courseName: student?.courseName || "",
      batchName: student?.batchName || "",
      batchTiming: student?.batchTiming || "",
      status: record.status,
      // Older attendance rows may not have facultyUserId; keep the report useful
      // by falling back to the faculty assigned to the student's batch.
      markedBy: record.facultyUser?.fullName || record.facultyUser?.email || student?.facultyName || "-",
      notes: record.notes || "",
    };
  });
}

const summaryColumns = [
  { header: "Attendance Date", key: "attendanceDate", width: 20 },
  { header: "Student ID", key: "studentId", width: 20 },
  { header: "Student Name", key: "studentName", width: 26 },
  { header: "Course", key: "courseName", width: 24 },
  { header: "Batch", key: "batchName", width: 24 },
  { header: "Timing", key: "batchTiming", width: 24 },
  { header: "Status", key: "status", width: 14 },
  { header: "Marked Time", key: "attendanceTime", width: 18 },
  { header: "Marked By", key: "markedBy", width: 24 },
];

const detailColumns = [
  { header: "S.No", key: "serialNo", width: 10 },
  { header: "Date", key: "attendanceDate", width: 16 },
  { header: "Student ID", key: "studentId", width: 20 },
  { header: "Student Name", key: "studentName", width: 26 },
  { header: "Course", key: "courseName", width: 24 },
  { header: "Batch", key: "batchName", width: 24 },
  { header: "Timing", key: "batchTiming", width: 24 },
  { header: "Status", key: "status", width: 14 },
  { header: "Marked Time", key: "attendanceTime", width: 18 },
  { header: "Marked By", key: "markedBy", width: 24 },
  { header: "Notes", key: "notes", width: 30 },
];

function buildReport({ title, fileName, students, records, fromDate, toDate, scopeLabel, addDateGaps = false }) {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  // Keep one summary row per attendance date, rather than combining dates into
  // a comma-separated value. This makes Present/Absent auditable day by day.
  const summaryRows = detailRows(records, studentMap).map((row) => ({
    attendanceDate: row.attendanceDate,
    attendanceTime: row.attendanceTime,
    studentId: row.studentId,
    studentName: row.studentName,
    courseName: row.courseName,
    batchName: row.batchName,
    batchTiming: row.batchTiming,
    status: row.status,
    markedBy: row.markedBy,
  }));

  return buildExcelReport({
    fileName,
    title,
    filters: [
      { label: "Scope", value: scopeLabel },
      { label: "From Date", value: fromDate },
      { label: "To Date", value: toDate },
    ],
    summary: [
      { label: "Students", value: students.length },
      { label: "Total Classes", value: records.length },
      { label: "Present", value: count(records, "PRESENT") },
      { label: "Absent", value: count(records, "ABSENT") },
    ],
    includeOverviewSheet: false,
    sheets: [
      {
        name: "Attendance Summary",
        title: "Attendance Summary",
        columns: summaryColumns,
        rows: summaryRows,
        groupByKey: addDateGaps ? "attendanceDate" : "",
        spacerRowsBetweenGroups: addDateGaps ? 1 : 0,
      },
      {
        name: "Attendance Details",
        title: "Attendance Details",
        columns: detailColumns,
        rows: detailRows(records, studentMap),
        groupByKey: addDateGaps ? "attendanceDate" : "",
        spacerRowsBetweenGroups: addDateGaps ? 1 : 0,
      },
    ],
  });
}

export async function generateBranchStudentAttendanceReport(query, user) {
  const studentId = String(query?.studentId || "").trim();
  if (!studentId) throw new AppError("studentId is required", 400);
  const { fromDate, toDate } = parseDateRange(query);
  const branchId = await resolveBranchId(user, query?.branchId);
  const { student, records } = await findBranchStudentAttendanceReportData({ studentId, branchId, fromDate, toDate });
  return buildReport({
    title: "Student Attendance Report",
    fileName: buildReportFileName([student.studentName, "attendance-report", fromDate, toDate]),
    students: [student], records, fromDate, toDate,
    scopeLabel: `${student.studentId} - ${student.studentName}`,
    addDateGaps: false,
  });
}

export async function generateBranchBatchAttendanceReport(query, user) {
  const batchId = String(query?.batchId || "").trim();
  if (!batchId) throw new AppError("batchId is required", 400);
  const { fromDate, toDate } = parseDateRange(query);
  const branchId = await resolveBranchId(user, query?.branchId);
  const { batch, students, records } = await findBranchBatchAttendanceReportData({ batchId, branchId, fromDate, toDate });
  return buildReport({
    title: "Batch Attendance Report",
    fileName: buildReportFileName([batch.batchName, "attendance-report", fromDate, toDate]),
    students, records, fromDate, toDate,
    scopeLabel: `${batch.batchId} - ${batch.batchName}`,
    addDateGaps: true,
  });
}
