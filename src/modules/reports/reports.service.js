import {
  findAllFacultyAttendanceReportData,
  findBatchAttendanceReportData,
  findFacultyAttendanceReportData,
  findStudentAttendanceReportData,
} from "./reports.repository.js";
import AppError from "../../common/errors/AppError.js";
import { buildExcelReport } from "./reports.excel.service.js";
import {
  buildReportFileName,
  formatDateTime,
  formatDuration,
  parseDateRange,
  parseRequiredId,
  toDisplayValue,
} from "./reports.utils.js";

function countByStatus(records = [], status) {
  return records.filter((record) => String(record?.status || "").toUpperCase() === status).length;
}

function buildStudentAttendanceRows(records = [], student) {
  return records.map((record, index) => ({
    serialNo: index + 1,
    attendanceDate: record.attendanceDate,
    studentCode: student.studentCode,
    studentName: student.studentName,
    courseName: student.course?.name || student.courseInterested || "",
    batchName: student.batchName || "",
    status: record.status,
    markedAt: formatDateTime(record.markedAt),
    markedBy: record.facultyUser?.fullName || "",
    notes: record.notes || "",
  }));
}

function buildBatchAttendanceRows(records = []) {
  return records.map((record, index) => ({
    serialNo: index + 1,
    attendanceDate: record.attendanceDate,
    studentCode: record.student?.studentCode || "",
    studentName: record.student?.studentName || "",
    courseName: record.student?.course?.name || record.student?.courseInterested || "",
    batchName: record.student?.batchName || record.batchName || "",
    status: record.status,
    markedAt: formatDateTime(record.markedAt),
    markedBy: record.facultyUser?.fullName || "",
    notes: record.notes || "",
  }));
}

function buildBatchStudentSummaryRows(students = [], records = []) {
  const grouped = new Map();

  records.forEach((record) => {
    const key = record.studentId;
    const current = grouped.get(key) || { present: 0, absent: 0, total: 0 };
    current.total += 1;
    if (String(record.status || "").toUpperCase() === "PRESENT") current.present += 1;
    if (String(record.status || "").toUpperCase() === "ABSENT") current.absent += 1;
    grouped.set(key, current);
  });

  return students.map((student, index) => {
    const stats = grouped.get(student.id) || { present: 0, absent: 0, total: 0 };

    return {
      serialNo: index + 1,
      studentCode: student.studentCode,
      studentName: student.studentName,
      emailAddress: student.emailAddress,
      batchName: student.batchName || "",
      presentCount: stats.present,
      absentCount: stats.absent,
      totalMarkedDays: stats.total,
    };
  });
}

function buildFacultySessionRows(sessions = [], facultyProfile, facultyUser) {
  return sessions.map((session, index) => ({
    serialNo: index + 1,
    attendanceDate: session.attendanceDate,
    facultyCode: facultyUser?.userCode || "",
    facultyName: facultyProfile?.facultyName || facultyUser?.fullName || "",
    facultyEmail: facultyProfile?.facultyEmail || facultyUser?.email || "",
    loginAt: formatDateTime(session.loginAt),
    logoutAt: formatDateTime(session.logoutAt),
    duration: formatDuration(session.loginAt, session.logoutAt),
    logoutType: toDisplayValue(session.logoutType, ""),
    logoutReason: session.logoutReason || "",
    workReport: session.workReport || "",
    workCompleted: session.workCompleted || "",
  }));
}

function buildAllFacultySummaryRows(sessions = [], facultyProfiles = []) {
  const profileByEmail = new Map(
    facultyProfiles.map((profile) => [String(profile.facultyEmail || "").toLowerCase(), profile]),
  );
  const grouped = new Map();

  sessions.forEach((session) => {
    const email = String(session.facultyUser?.email || "").toLowerCase();
    const current =
      grouped.get(email) ||
      {
        facultyCode: session.facultyUser?.userCode || "",
        facultyName:
          profileByEmail.get(email)?.facultyName || session.facultyUser?.fullName || "",
        facultyEmail: session.facultyUser?.email || profileByEmail.get(email)?.facultyEmail || "",
        totalSessions: 0,
        completedSessions: 0,
        openSessions: 0,
      };

    current.totalSessions += 1;
    if (session.logoutAt) {
      current.completedSessions += 1;
    } else {
      current.openSessions += 1;
    }

    grouped.set(email, current);
  });

  return Array.from(grouped.values()).map((item, index) => ({
    serialNo: index + 1,
    facultyCode: item.facultyCode,
    facultyName: item.facultyName,
    facultyEmail: item.facultyEmail,
    totalSessions: item.totalSessions,
    completedSessions: item.completedSessions,
    openSessions: item.openSessions,
  }));
}

function buildAllFacultySessionRows(sessions = [], facultyProfiles = []) {
  const profileByEmail = new Map(
    facultyProfiles.map((profile) => [String(profile.facultyEmail || "").toLowerCase(), profile]),
  );

  return sessions.map((session, index) => {
    const email = String(session.facultyUser?.email || "").toLowerCase();
    const facultyProfile = profileByEmail.get(email);

    return {
      serialNo: index + 1,
      attendanceDate: session.attendanceDate,
      facultyCode: session.facultyUser?.userCode || "",
      facultyName: facultyProfile?.facultyName || session.facultyUser?.fullName || "",
      facultyEmail: session.facultyUser?.email || facultyProfile?.facultyEmail || "",
      loginAt: formatDateTime(session.loginAt),
      logoutAt: formatDateTime(session.logoutAt),
      duration: formatDuration(session.loginAt, session.logoutAt),
      logoutType: toDisplayValue(session.logoutType, ""),
      logoutReason: session.logoutReason || "",
      workReport: session.workReport || "",
      workCompleted: session.workCompleted || "",
    };
  });
}

async function generateStudentAttendanceReport(query = {}) {
  const studentId = parseRequiredId(query.studentId, "studentId");
  const { fromDate, toDate } = parseDateRange(query);
  const { student, records } = await findStudentAttendanceReportData({ studentId, fromDate, toDate });
  const dataRows = buildStudentAttendanceRows(records, student);

  return buildExcelReport({
    fileName: buildReportFileName([
      "student-attendance",
      student.studentCode || student.studentName,
      fromDate,
      toDate,
    ]),
    title: "Student Attendance Report",
    filters: [
      { label: "Student ID", value: student.id },
      { label: "Student Code", value: student.studentCode },
      { label: "Student Name", value: student.studentName },
      { label: "Course", value: student.course?.name || student.courseInterested || "-" },
      { label: "Batch", value: student.batchName || "-" },
      { label: "From Date", value: fromDate },
      { label: "To Date", value: toDate },
    ],
    summary: [
      { label: "Total Attendance Records", value: records.length },
      { label: "Present Count", value: countByStatus(records, "PRESENT") },
      { label: "Absent Count", value: countByStatus(records, "ABSENT") },
    ],
    sheets: [
      {
        name: "Attendance",
        title: "Student Attendance Details",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Attendance Date", key: "attendanceDate", width: 16 },
          { header: "Student Code", key: "studentCode", width: 16 },
          { header: "Student Name", key: "studentName", width: 24 },
          { header: "Course", key: "courseName", width: 24 },
          { header: "Batch", key: "batchName", width: 20 },
          { header: "Status", key: "status", width: 14 },
          { header: "Marked At", key: "markedAt", width: 24 },
          { header: "Marked By", key: "markedBy", width: 24 },
          { header: "Notes", key: "notes", width: 32 },
        ],
        rows: dataRows,
      },
    ],
  });
}

async function generateBatchAttendanceReport(query = {}) {
  const batchId = String(query.batchId || "").trim();
  const batchName = String(query.batchName || "").trim();
  const courseId = String(query.courseId || "").trim();

  if (!batchId && !batchName) {
    throw new AppError("batchId or batchName is required", 400);
  }

  const { fromDate, toDate } = parseDateRange(query);
  const { batch, students, records } = await findBatchAttendanceReportData({
    batchId,
    batchName,
    courseId,
    fromDate,
    toDate,
  });

  return buildExcelReport({
    fileName: buildReportFileName([
      "batch-attendance",
      batch.batchName,
      fromDate,
      toDate,
    ]),
    title: "Batch Attendance Report",
    filters: [
      { label: "Batch ID", value: batch.id },
      { label: "Batch Name", value: batch.batchName },
      { label: "Course", value: batch.course?.name || "-" },
      { label: "From Date", value: fromDate },
      { label: "To Date", value: toDate },
    ],
    summary: [
      { label: "Total Students in Batch", value: students.length },
      { label: "Total Attendance Records", value: records.length },
      { label: "Present Count", value: countByStatus(records, "PRESENT") },
      { label: "Absent Count", value: countByStatus(records, "ABSENT") },
    ],
    sheets: [
      {
        name: "Student Summary",
        title: "Batch Student Attendance Summary",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Student Code", key: "studentCode", width: 16 },
          { header: "Student Name", key: "studentName", width: 24 },
          { header: "Email", key: "emailAddress", width: 28 },
          { header: "Batch", key: "batchName", width: 20 },
          { header: "Present Count", key: "presentCount", width: 16 },
          { header: "Absent Count", key: "absentCount", width: 16 },
          { header: "Total Marked Days", key: "totalMarkedDays", width: 18 },
        ],
        rows: buildBatchStudentSummaryRows(students, records),
      },
      {
        name: "Attendance",
        title: "Batch Attendance Details",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Attendance Date", key: "attendanceDate", width: 16 },
          { header: "Student Code", key: "studentCode", width: 16 },
          { header: "Student Name", key: "studentName", width: 24 },
          { header: "Course", key: "courseName", width: 24 },
          { header: "Batch", key: "batchName", width: 20 },
          { header: "Status", key: "status", width: 14 },
          { header: "Marked At", key: "markedAt", width: 24 },
          { header: "Marked By", key: "markedBy", width: 24 },
          { header: "Notes", key: "notes", width: 32 },
        ],
        rows: buildBatchAttendanceRows(records),
      },
    ],
  });
}

async function generateFacultyAttendanceReport(query = {}) {
  const facultyId = parseRequiredId(query.facultyId, "facultyId");
  const { fromDate, toDate } = parseDateRange(query);
  const { facultyProfile, facultyUser, sessions } = await findFacultyAttendanceReportData({
    facultyId,
    fromDate,
    toDate,
  });

  return buildExcelReport({
    fileName: buildReportFileName([
      "faculty-attendance",
      facultyProfile.facultyName || facultyUser.userCode,
      fromDate,
      toDate,
    ]),
    title: "Faculty Attendance Report",
    filters: [
      { label: "Faculty ID", value: facultyProfile.id },
      { label: "Faculty Code", value: facultyUser.userCode || "-" },
      { label: "Faculty Name", value: facultyProfile.facultyName },
      { label: "Faculty Email", value: facultyProfile.facultyEmail },
      { label: "From Date", value: fromDate },
      { label: "To Date", value: toDate },
    ],
    summary: [
      { label: "Total Sessions", value: sessions.length },
      { label: "Completed Sessions", value: sessions.filter((session) => session.logoutAt).length },
      { label: "Open Sessions", value: sessions.filter((session) => !session.logoutAt).length },
    ],
    sheets: [
      {
        name: "Sessions",
        title: "Faculty Attendance Sessions",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Attendance Date", key: "attendanceDate", width: 16 },
          { header: "Faculty Code", key: "facultyCode", width: 16 },
          { header: "Faculty Name", key: "facultyName", width: 24 },
          { header: "Faculty Email", key: "facultyEmail", width: 28 },
          { header: "Login At", key: "loginAt", width: 24 },
          { header: "Logout At", key: "logoutAt", width: 24 },
          { header: "Duration", key: "duration", width: 16 },
          { header: "Logout Type", key: "logoutType", width: 16 },
          { header: "Logout Reason", key: "logoutReason", width: 28 },
          { header: "Work Report", key: "workReport", width: 34 },
          { header: "Work Completed", key: "workCompleted", width: 34 },
        ],
        rows: buildFacultySessionRows(sessions, facultyProfile, facultyUser),
      },
    ],
  });
}

async function generateAllFacultyAttendanceReport(query = {}) {
  const { fromDate, toDate } = parseDateRange(query);
  const { sessions, facultyProfiles } = await findAllFacultyAttendanceReportData({ fromDate, toDate });
  const summaryRows = buildAllFacultySummaryRows(sessions, facultyProfiles);

  return buildExcelReport({
    fileName: buildReportFileName(["all-faculty-attendance", fromDate, toDate]),
    title: "All Faculty Attendance Report",
    filters: [
      { label: "From Date", value: fromDate },
      { label: "To Date", value: toDate },
    ],
    summary: [
      { label: "Total Faculty", value: summaryRows.length },
      { label: "Total Sessions", value: sessions.length },
      { label: "Completed Sessions", value: sessions.filter((session) => session.logoutAt).length },
      { label: "Open Sessions", value: sessions.filter((session) => !session.logoutAt).length },
    ],
    sheets: [
      {
        name: "Faculty Summary",
        title: "All Faculty Attendance Summary",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Faculty Code", key: "facultyCode", width: 16 },
          { header: "Faculty Name", key: "facultyName", width: 24 },
          { header: "Faculty Email", key: "facultyEmail", width: 28 },
          { header: "Total Sessions", key: "totalSessions", width: 16 },
          { header: "Completed Sessions", key: "completedSessions", width: 18 },
          { header: "Open Sessions", key: "openSessions", width: 14 },
        ],
        rows: summaryRows,
      },
      {
        name: "Sessions",
        title: "All Faculty Attendance Details",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Attendance Date", key: "attendanceDate", width: 16 },
          { header: "Faculty Code", key: "facultyCode", width: 16 },
          { header: "Faculty Name", key: "facultyName", width: 24 },
          { header: "Faculty Email", key: "facultyEmail", width: 28 },
          { header: "Login At", key: "loginAt", width: 24 },
          { header: "Logout At", key: "logoutAt", width: 24 },
          { header: "Duration", key: "duration", width: 16 },
          { header: "Logout Type", key: "logoutType", width: 16 },
          { header: "Logout Reason", key: "logoutReason", width: 28 },
          { header: "Work Report", key: "workReport", width: 34 },
          { header: "Work Completed", key: "workCompleted", width: 34 },
        ],
        rows: buildAllFacultySessionRows(sessions, facultyProfiles),
      },
    ],
  });
}

export {
  generateAllFacultyAttendanceReport,
  generateBatchAttendanceReport,
  generateFacultyAttendanceReport,
  generateStudentAttendanceReport,
};
