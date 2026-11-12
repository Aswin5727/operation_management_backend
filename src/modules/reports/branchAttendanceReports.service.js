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
const displayReportDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : display(value);
};

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
  const rows = [];
  records.forEach((record) => {
    const student = studentsById.get(record.branchStudentId);
    const histories = Array.isArray(record.editHistory) ? record.editHistory : [];
    const baseStatus = histories.length ? histories[0].previousStatus : (record.status || "UNMARKED");
    const displayStatus = (status) => status === "LATE" ? "PRESENT" : status;
    const baseLateReason = record.lateReason || histories[0]?.lateReason || record.notes || "";
    const baseRow = {
      serialNo: 0,
      attendanceDate: attendanceDateOf(record),
      attendanceTime: attendanceTimeOf(record),
      studentId: student?.studentId || "",
      studentName: student?.studentName || "",
      courseName: student?.courseName || "",
      batchName: student?.batchName || "",
      batchTiming: student?.batchTiming || "",
      status: displayStatus(baseStatus),
      previousStatus: "-",
      currentStatus: displayStatus(baseStatus),
      attendanceType: baseLateReason ? "Late Attendance" : "Normal Attendance",
      lateReason: baseLateReason,
      editedBy: "-",
      editedTime: "-",
      // Older attendance rows may not have facultyUserId; keep the report useful
      // by falling back to the faculty assigned to the student's batch.
      markedBy: record.facultyUser?.fullName || record.facultyUser?.email || student?.facultyName || "-",
      notes: record.notes || "",
    };
    const eventRows = [];
    histories.forEach((history) => {
      const updatedStatus = history.updatedStatus || "UNMARKED";
      const editTime = history.editedAt ? new Date(history.editedAt).toLocaleTimeString("en-US", { timeZone: "Asia/Calcutta", hour: "2-digit", minute: "2-digit", hour12: true }) : "-";
      eventRows.push({
        ...baseRow,
        status: displayStatus(updatedStatus),
        currentStatus: displayStatus(updatedStatus),
        attendanceType: history.attendanceType === "LATE_ATTENDANCE" ? "Late Attendance" : "Edited Attendance",
        attendanceTime: editTime,
        previousStatus: history.previousStatus || baseStatus,
        lateReason: history.attendanceType === "LATE_ATTENDANCE" || updatedStatus === "LATE" ? (history.lateReason || "") : "",
        editedBy: history.attendanceType === "LATE_ATTENDANCE" ? "-" : (history.editedByName || "-"),
        editedTime: history.attendanceType === "LATE_ATTENDANCE" ? "-" : editTime,
      });
    });
    rows.push(...eventRows.filter((row) => row.attendanceType === "Late Attendance"));
    rows.push(baseRow);
    rows.push(...eventRows.filter((row) => row.attendanceType !== "Late Attendance"));
  });
  return rows.map((row, index) => ({ ...row, serialNo: index + 1 }));
}

const summaryColumns = [
  { header: "Attendance Date", key: "attendanceDate", width: 20 },
  { header: "Student ID", key: "studentId", width: 20 },
  { header: "Student Name", key: "studentName", width: 26 },
  { header: "Course", key: "courseName", width: 24 },
  { header: "Batch", key: "batchName", width: 24 },
  { header: "Timing", key: "batchTiming", width: 24 },
  { header: "Status", key: "status", width: 14 },
  { header: "Previous Status", key: "previousStatus", width: 18 },
  { header: "Current Status", key: "currentStatus", width: 18 },
  { header: "Attendance Type", key: "attendanceType", width: 18 },
  { header: "Marked Time", key: "attendanceTime", width: 18 },
  { header: "Marked By", key: "markedBy", width: 24 },
  { header: "Edited By", key: "editedBy", width: 24 },
  { header: "Edited Time", key: "editedTime", width: 18 },
  { header: "Late Reason", key: "lateReason", width: 30 },
];

const detailColumns = [
  { header: "S.No", key: "serialNo", width: 10 },
  { header: "Date", key: "attendanceDate", width: 16 },
  { header: "Student ID", key: "studentId", width: 20 },
  { header: "Student Name", key: "studentName", width: 26 },
  { header: "Course", key: "courseName", width: 24 },
  { header: "Batch", key: "batchName", width: 24 },
  { header: "Timing", key: "batchTiming", width: 24 },
  { header: "Attendance Type", key: "attendanceType", width: 20 },
  { header: "Status", key: "status", width: 14 },
  { header: "Marked Time", key: "attendanceTime", width: 18 },
  { header: "Marked By / Faculty Name", key: "markedBy", width: 28 },
  { header: "Edited By", key: "editedBy", width: 24 },
  { header: "Edited Time", key: "editedTime", width: 18 },
  { header: "Late Reason", key: "lateReason", width: 30 },
];

const editHistoryColumns = [
  { header: "Date", key: "attendanceDate", width: 16 },
  { header: "Student ID", key: "studentId", width: 20 },
  { header: "Student Name", key: "studentName", width: 26 },
  { header: "Previous Status", key: "previousStatus", width: 18 },
  { header: "Updated Status", key: "updatedStatus", width: 18 },
  { header: "Edited By", key: "editedBy", width: 24 },
  { header: "Edited Time", key: "editedTime", width: 18 },
  { header: "Edit Reason", key: "editReason", width: 32 },
];

function buildReport({ title, fileName, students, records, fromDate, toDate, scopeLabel, addDateGaps = false }) {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const editHistoryRows = records.flatMap((record) => (record.editHistory || []).map((history) => {
    const student = studentMap.get(record.branchStudentId);
    return {
      attendanceDate: attendanceDateOf(history),
      studentId: history.studentId || student?.studentId || "",
      studentName: history.studentName || student?.studentName || "",
      previousStatus: history.previousStatus === "LATE" ? "PRESENT" : (history.previousStatus || "UNMARKED"),
      updatedStatus: history.updatedStatus === "LATE" ? "PRESENT" : (history.updatedStatus || "UNMARKED"),
      editedBy: history.editedByName || "-",
      editedTime: history.editedAt ? new Date(history.editedAt).toLocaleTimeString("en-US", { timeZone: "Asia/Calcutta", hour: "2-digit", minute: "2-digit", hour12: true }) : "-",
      editReason: history.editReason || "",
    };
  }));
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
    previousStatus: row.previousStatus,
    currentStatus: row.currentStatus,
    attendanceType: row.attendanceType,
    markedBy: row.markedBy,
    editedBy: row.editedBy,
    editedTime: row.editedTime,
    lateReason: row.lateReason,
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
        name: "Attendance Details",
        title: `Attendance Details | From Date: ${displayReportDate(fromDate)} | To Date: ${displayReportDate(toDate)}`,
        columns: detailColumns,
        rows: detailRows(records, studentMap),
        groupByKey: addDateGaps ? "attendanceDate" : "",
        spacerRowsBetweenGroups: addDateGaps ? 1 : 0,
      },
      {
        name: "Attendance Edit History",
        title: `Attendance Edit History | From Date: ${displayReportDate(fromDate)} | To Date: ${displayReportDate(toDate)}`,
        columns: editHistoryColumns,
        rows: editHistoryRows,
        groupByKey: addDateGaps ? "attendanceDate" : "",
        spacerRowsBetweenGroups: addDateGaps ? 1 : 0,
      },
    ],
  });
}

export async function generateBranchStudentAttendanceReport(query, user) {
  const studentId = String(query?.studentId || "").trim();
  if (!studentId) throw new AppError("studentId is required", 400);
  const courseId = String(query?.courseId || "").trim();
  const { fromDate, toDate } = parseDateRange(query);
  const branchId = await resolveBranchId(user, query?.branchId);
  const { student, records } = await findBranchStudentAttendanceReportData({ studentId, branchId, fromDate, toDate, courseId });
  const courseLabel = String(student.courseName || "").trim();
  return buildReport({
    title: "Student Attendance Report",
    fileName: buildReportFileName([student.studentName, courseLabel, "attendance-report", fromDate, toDate]),
    students: [student], records, fromDate, toDate,
    scopeLabel: `${student.studentId} - ${student.studentName}${courseLabel ? ` - ${courseLabel}` : ""}`,
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
