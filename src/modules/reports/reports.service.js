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

function assignSerialByDate(rows = [], dateKey = "attendanceDate") {
  const counters = new Map();

  return rows.map((row) => {
    const groupValue = String(row?.[dateKey] || "");
    const nextSerialNo = (counters.get(groupValue) || 0) + 1;
    counters.set(groupValue, nextSerialNo);

    return {
      ...row,
      serialNo: nextSerialNo,
    };
  });
}

function assignSerial(rows = []) {
  return rows.map((row, index) => ({
    ...row,
    serialNo: index + 1,
  }));
}

function getFacultyCourseNames(profile = null) {
  if (!profile) return "";

  const values = [
    profile?.course?.name || "",
    ...(Array.isArray(profile?.courseAssignments)
      ? profile.courseAssignments.map((assignment) => assignment?.course?.name || assignment?.courseName || "")
      : []),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return Array.from(new Set(values)).join(", ");
}

function buildStudentAttendanceRows(records = [], student) {
  return assignSerial(records.map((record) => ({
    attendanceDate: record.attendanceDate,
    studentName: student.studentName,
    courseName: student.course?.name || student.courseInterested || "",
    batchName: student.batchName || "",
    status: record.status,
    markedAt: formatDateTime(record.markedAt),
    markedBy: record.facultyUser?.fullName || "",
    notes: record.notes || "",
  })));
}

function buildBatchAttendanceRows(records = []) {
  return assignSerialByDate(records.map((record) => ({
    attendanceDate: record.attendanceDate,
    studentName: record.student?.studentName || "",
    courseName: record.student?.course?.name || record.student?.courseInterested || "",
    batchName: record.student?.batchName || record.batchName || "",
    status: record.status,
    markedAt: formatDateTime(record.markedAt),
    markedBy: record.facultyUser?.fullName || "",
    notes: record.notes || "",
  })));
}

function buildFacultySessionRows(sessions = [], facultyProfile, facultyUser, leaveRequests = []) {
  const courseNames = getFacultyCourseNames(facultyProfile);
  const formatPermissionMinutes = (hours) => {
    const minutes = Math.round(Number(hours || 0) * 60);
    return minutes > 0 ? `${minutes} minutes` : "";
  };
  const formatLeaveTime = (value) => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return value || "-";
    const hour = Number(match[1]);
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
  };
  const formatFacultyDateTime = (value) => value
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Calcutta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(value))
    : "";
  const leaveForDate = (date) => leaveRequests.find((leave) => String(leave.fromDate) <= String(date) && String(leave.toDate) >= String(date));
  const dates = new Set(sessions.map((session) => session.attendanceDate));
  leaveRequests.forEach((leave) => {
    const cursor = new Date(`${leave.fromDate}T00:00:00Z`);
    const end = new Date(`${leave.toDate}T00:00:00Z`);
    while (cursor <= end) {
      dates.add(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  });
  const rows = Array.from(dates).sort().map((date) => {
    const daySessions = sessions.filter((session) => session.attendanceDate === date);
    const leave = leaveForDate(date);
    const leaveTime = leave?.durationType === "PERMISSION"
      ? `${formatLeaveTime(leave.permissionStart)} - ${formatLeaveTime(leave.permissionEnd)}`
      : leave?.durationType === "HALF_DAY"
        ? `${formatLeaveTime(leave.halfDayStart)} - ${formatLeaveTime(leave.halfDayEnd)}`
        : leave?.durationType === "FULL_DAY" ? "Full Day" : "";
    const first = daySessions[0];
    const second = daySessions[1];
    const last = daySessions[daySessions.length - 1];
    const durations = daySessions
      .filter((session) => session.loginAt && session.logoutAt)
      .map((session) => Math.max(0, new Date(session.logoutAt).getTime() - new Date(session.loginAt).getTime()))
      .reduce((sum, value) => sum + value, 0);
    const leaveMinutes = leave?.durationType === "PERMISSION"
      ? Math.round(Number(leave.permissionHours || 0) * 60)
      : 0;
    const effectiveDuration = durations - leaveMinutes * 60 * 1000;
    const duration = effectiveDuration > 0 ? formatDuration(new Date(0), new Date(effectiveDuration)) : "";
    return {
      attendanceDate: date,
      facultyName: facultyProfile?.facultyName || facultyUser?.fullName || "",
      facultyEmail: facultyProfile?.facultyEmail || facultyUser?.email || "",
      courseName: courseNames,
      loginAt: first ? formatFacultyDateTime(first.loginAt) : "",
      reLoginAt: second ? formatFacultyDateTime(second.loginAt) : "",
      logoutAt: last ? formatFacultyDateTime(last.logoutAt) : "",
      duration,
      leaveType: leave?.leaveType || "",
      leaveDuration: leave?.durationType || "",
      leaveTime,
      permissionHours: formatPermissionMinutes(leave?.permissionHours),
      leaveReason: leave?.reason || "",
      logoutType: Array.from(new Set(daySessions.map((session) => toDisplayValue(session.logoutType, "")).filter(Boolean))).join(", "),
      logoutReason: Array.from(new Set(daySessions.map((session) => session.logoutReason || "").filter(Boolean))).join("; "),
      workReport: daySessions.map((session) => session.workReport || "").filter(Boolean).join("; "),
      workCompleted: daySessions.map((session) => session.workCompleted || "").filter(Boolean).join("; "),
    };
  });

  return assignSerial(rows);
}

function buildAllFacultySessionRows(sessions = [], facultyProfiles = []) {
  const profileByEmail = new Map(
    facultyProfiles.map((profile) => [String(profile.facultyEmail || "").toLowerCase(), profile]),
  );

  return assignSerialByDate(sessions.map((session) => {
    const email = String(session.facultyUser?.email || "").toLowerCase();
    const facultyProfile = profileByEmail.get(email);

    return {
      attendanceDate: session.attendanceDate,
      facultyName: facultyProfile?.facultyName || session.facultyUser?.fullName || "",
      facultyEmail: session.facultyUser?.email || facultyProfile?.facultyEmail || "",
      courseName: getFacultyCourseNames(facultyProfile),
      loginAt: formatDateTime(session.loginAt),
      logoutAt: formatDateTime(session.logoutAt),
      duration: formatDuration(session.loginAt, session.logoutAt),
      logoutType: toDisplayValue(session.logoutType, ""),
      logoutReason: session.logoutReason || "",
      workReport: session.workReport || "",
      workCompleted: session.workCompleted || "",
    };
  }));
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
          { header: "Student Name", key: "studentName", width: 24 },
          { header: "Course", key: "courseName", width: 24 },
          { header: "Batch", key: "batchName", width: 20 },
          { header: "Status", key: "status", width: 14 },
          { header: "Marked At", key: "markedAt", width: 24 },
          { header: "Marked By", key: "markedBy", width: 24 },
          { header: "Notes", key: "notes", width: 32 },
        ],
        rows: dataRows,
        groupByKey: "attendanceDate",
        spacerRowsBetweenGroups: 1,
      },
    ],
  });
}

async function generateBatchAttendanceReport(query = {}, actorUser = null) {
  const batchId = String(query.batchId || "").trim();
  const batchName = String(query.batchName || "").trim();
  const courseId = String(query.courseId || "").trim();

  if (!batchId && !batchName && !courseId) {
    throw new AppError("batchId, batchName, or courseId is required", 400);
  }

  const { fromDate, toDate } = parseDateRange(query);
  const { scope, students, records } = await findBatchAttendanceReportData({
    batchId,
    batchName,
    courseId,
    fromDate,
    toDate,
    actorUser,
  });

  const isCourseScope = scope.kind === "course";
  const courseLabel = scope.course?.name || "";
  const batchLabel = scope.batchName || "";

  return buildExcelReport({
    fileName: buildReportFileName([
      isCourseScope ? "course-attendance" : "batch-attendance",
      isCourseScope ? courseLabel || scope.courseId : batchLabel,
      fromDate,
      toDate,
    ]),
    title: isCourseScope ? "Course Attendance Report" : "Batch Attendance Report",
    filters: [
      ...(isCourseScope
        ? [
          { label: "Course ID", value: scope.courseId },
          { label: "Course", value: courseLabel || "-" },
        ]
        : [
          { label: "Batch ID", value: scope.id },
          { label: "Batch Name", value: batchLabel },
          { label: "Course", value: courseLabel || "-" },
        ]),
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
        name: "Attendance",
        title: isCourseScope ? "Course Attendance Details" : "Batch Attendance Details",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Attendance Date", key: "attendanceDate", width: 16 },
          { header: "Student Name", key: "studentName", width: 24 },
          { header: "Course", key: "courseName", width: 24 },
          { header: "Batch", key: "batchName", width: 20 },
          { header: "Status", key: "status", width: 14 },
          { header: "Marked At", key: "markedAt", width: 24 },
          { header: "Marked By", key: "markedBy", width: 24 },
          { header: "Notes", key: "notes", width: 32 },
        ],
        rows: buildBatchAttendanceRows(records),
        groupByKey: "attendanceDate",
        spacerRowsBetweenGroups: 1,
      },
    ],
  });
}

async function generateFacultyAttendanceReport(query = {}) {
  const facultyId = parseRequiredId(query.facultyId, "facultyId");
  const { fromDate, toDate } = parseDateRange(query);
  const { facultyProfile, facultyUser, sessions, leaveRequests } = await findFacultyAttendanceReportData({
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
      { label: "Approved Leave Days", value: leaveRequests.length },
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
          { header: "Faculty Name", key: "facultyName", width: 24 },
          { header: "Faculty Email", key: "facultyEmail", width: 28 },
          { header: "Course", key: "courseName", width: 28 },
          { header: "Login At", key: "loginAt", width: 24 },
          { header: "Re-Login At", key: "reLoginAt", width: 24 },
          { header: "Logout At", key: "logoutAt", width: 24 },
          { header: "Duration", key: "duration", width: 16 },
          { header: "Leave Type", key: "leaveType", width: 16 },
          { header: "Leave Category", key: "leaveDuration", width: 18 },
          { header: "Leave Duration", key: "leaveTime", width: 22 },
          { header: "Permission Hours", key: "permissionHours", width: 18 },
          { header: "Leave Reason", key: "leaveReason", width: 30 },
          { header: "Logout Reason", key: "logoutReason", width: 28 },
          { header: "Work Report", key: "workReport", width: 34 },
          { header: "Work Completed", key: "workCompleted", width: 34 },
        ],
        rows: buildFacultySessionRows(sessions, facultyProfile, facultyUser, leaveRequests),
        groupByKey: "attendanceDate",
        spacerRowsBetweenGroups: 1,
      },
    ],
  });
}

async function generateAllFacultyAttendanceReport(query = {}) {
  const { fromDate, toDate } = parseDateRange(query);
  const { sessions, facultyProfiles } = await findAllFacultyAttendanceReportData({ fromDate, toDate });

  return buildExcelReport({
    fileName: buildReportFileName(["all-faculty-attendance", fromDate, toDate]),
    title: "All Faculty Attendance Report",
    filters: [
      { label: "From Date", value: fromDate },
      { label: "To Date", value: toDate },
    ],
    summary: [
      { label: "Total Faculty", value: facultyProfiles.length },
      { label: "Total Sessions", value: sessions.length },
      { label: "Completed Sessions", value: sessions.filter((session) => session.logoutAt).length },
      { label: "Open Sessions", value: sessions.filter((session) => !session.logoutAt).length },
    ],
    sheets: [
      {
        name: "Sessions",
        title: "All Faculty Attendance Details",
        columns: [
          { header: "S.No", key: "serialNo", width: 10 },
          { header: "Attendance Date", key: "attendanceDate", width: 16 },
          { header: "Faculty Name", key: "facultyName", width: 24 },
          { header: "Faculty Email", key: "facultyEmail", width: 28 },
          { header: "Course", key: "courseName", width: 28 },
          { header: "Login At", key: "loginAt", width: 24 },
          { header: "Logout At", key: "logoutAt", width: 24 },
          { header: "Duration", key: "duration", width: 16 },
          { header: "Logout Type", key: "logoutType", width: 16 },
          { header: "Logout Reason", key: "logoutReason", width: 28 },
          { header: "Work Report", key: "workReport", width: 34 },
          { header: "Work Completed", key: "workCompleted", width: 34 },
        ],
        rows: buildAllFacultySessionRows(sessions, facultyProfiles),
        groupByKey: "attendanceDate",
        spacerRowsBetweenGroups: 1,
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
