import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchStudentCalendar } from "../branchStudents/branchStudentCalendar.service.js";

const TIME_ZONE = "Asia/Calcutta";
const EXCLUDED_STATUSES = new Set(["NO_CLASS", "HOLIDAY", "LEAVE", "INSTITUTE_LEAVE", "FACULTY_WEEKLY_OFF"]);

const text = (value) => String(value ?? "").trim();
const dateOnly = (value) => text(value).slice(0, 10);

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function dateFromKey(value) {
  const [year, month, day] = dateOnly(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function keyFromDate(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function addDays(value, amount) {
  const date = dateFromKey(value);
  date.setDate(date.getDate() + amount);
  return keyFromDate(date);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TIME_ZONE }).format(dateFromKey(value));
}

function formatTime(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(value));
}

function percentage(value, denominator) {
  return denominator ? Math.round((value / denominator) * 100) : 0;
}

function rangeDays(start, end) {
  const result = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) result.push(cursor);
  return result;
}

function normalizedStatus(event, record, currentDate) {
  if (event.date > currentDate) return "UPCOMING";
  const attendance = text(record?.status || event?.attendanceStatus).toUpperCase();
  if (attendance === "PRESENT" || attendance === "ABSENT") return attendance;
  const scheduleStatus = text(event?.status).toUpperCase().replaceAll(" ", "_");
  if (scheduleStatus.includes("LEAVE")) return "LEAVE";
  if (EXCLUDED_STATUSES.has(scheduleStatus) || !event?.isCourseDay) return "NO_CLASS";
  return "NOT_RECORDED";
}

function todayAttendanceStatus(event, record) {
  const recorded = text(record?.status || event?.attendanceStatus).toUpperCase();
  if (recorded === "PRESENT" || recorded === "ABSENT" || recorded === "LATE" || recorded === "LEAVE") return recorded;
  const scheduleStatus = text(event?.code || event?.status).toUpperCase().replaceAll(" ", "_");
  if (scheduleStatus.includes("LEAVE")) return "LEAVE";
  if (scheduleStatus.includes("HOLIDAY")) return "HOLIDAY";
  if (scheduleStatus.includes("WEEKLY_OFF") || scheduleStatus.includes("NO_CLASS")) return "WEEK_OFF";
  return "NOT_MARKED";
}

function aggregateEvents(events, records, start, end, currentDate) {
  const recordMap = new Map(records.map((record) => [record.attendanceDate, record]));
  const days = rangeDays(start, end).map((date) => {
    const event = events.find((item) => dateOnly(item.date) === date) || { date, isCourseDay: false, status: "No Class" };
    const record = recordMap.get(date);
    const status = normalizedStatus(event, record, currentDate);
    return {
      date,
      day: new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: TIME_ZONE }).format(dateFromKey(date)),
      status,
      attendanceTime: status === "PRESENT" ? formatTime(record?.markedAt) : null,
      isToday: date === currentDate,
      isCourseDay: Boolean(event.isCourseDay),
    };
  });
  return days;
}

function summarize(days) {
  const present = days.filter((day) => day.status === "PRESENT").length;
  const absent = days.filter((day) => day.status === "ABSENT").length;
  const leave = days.filter((day) => day.status === "LEAVE").length;
  const scheduledStatuses = new Set(["PRESENT", "ABSENT", "UPCOMING", "NOT_RECORDED"]);
  const scheduledSessions = days.filter((day) => day.isCourseDay && scheduledStatuses.has(day.status)).length;
  const futureDays = days.filter((day) => day.isCourseDay && day.status === "UPCOMING").length;
  const applicableSessions = present + absent;
  return {
    percentage: percentage(present, scheduledSessions),
    presentPercentage: percentage(present, scheduledSessions),
    absentPercentage: percentage(absent, scheduledSessions),
    present,
    absent,
    leave,
    futureDays,
    scheduledDays: scheduledSessions,
    scheduledSessions,
    applicableSessions,
  };
}

function currentWeekStart(value) {
  const date = dateFromKey(value);
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + offset);
  return keyFromDate(date);
}

function buildWeekly(days, courseStart, courseEnd, currentDate) {
  const currentStart = currentWeekStart(currentDate);
  return Array.from({ length: 4 }, (_, index) => {
    const start = addDays(currentStart, (index - 3) * 7);
    const end = addDays(start, 6);
    const boundedStart = start < courseStart ? courseStart : start;
    const boundedEnd = end > courseEnd ? courseEnd : end;
    const inCoursePeriod = boundedStart <= boundedEnd;
    const rows = inCoursePeriod ? days.filter((day) => day.date >= boundedStart && day.date <= boundedEnd) : [];
    return { week: index + 1, startDate: boundedStart, endDate: boundedEnd, dateRange: boundedStart <= boundedEnd ? `${formatDate(boundedStart)} – ${formatDate(boundedEnd)}` : "Not in course period", ...summarize(rows) };
  });
}

function buildMonthly(days, courseStart, courseEnd) {
  const result = [];
  let cursor = dateFromKey(`${courseStart.slice(0, 7)}-01`);
  const last = dateFromKey(`${courseEnd.slice(0, 7)}-01`);
  while (cursor <= last) {
    const monthStart = keyFromDate(cursor) < courseStart ? courseStart : keyFromDate(cursor);
    const monthEndDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const monthEndKey = keyFromDate(monthEndDate) > courseEnd ? courseEnd : keyFromDate(monthEndDate);
    const rows = days.filter((day) => day.date >= monthStart && day.date <= monthEndKey);
    result.push({ month: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(cursor), year: cursor.getFullYear(), startDate: monthStart, endDate: monthEndKey, ...summarize(rows) });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return result;
}

async function findStudent(user) {
  const email = text(user?.email).toLowerCase();
  const userCode = text(user?.userCode);
  if (!email && !userCode) throw new AppError("Student session is required", 401);
  const branchStudent = await prisma.branchStudent.findFirst({ where: { OR: [...(email ? [{ emailAddress: { equals: email, mode: "insensitive" } }] : []), ...(userCode ? [{ studentId: userCode }, { id: userCode }] : [])] }, include: { course: true } });
  if (branchStudent) return { type: "branch", value: branchStudent };
  const student = await prisma.studentProfile.findFirst({ where: { OR: [...(email ? [{ emailAddress: { equals: email, mode: "insensitive" } }] : []), ...(userCode ? [{ studentCode: userCode }, { id: userCode }] : [])] }, include: { course: true } });
  if (student) return { type: "student", value: student };
  throw new AppError("Student profile not found", 404);
}

export async function getStudentAttendanceOverview(user) {
  const identity = await findStudent(user);
  const student = identity.value;
  const currentDate = todayKey();
  let courseStart = dateOnly(student.courseStartDate || student.admissionDate);
  let courseEnd = dateOnly(student.courseEndDate);
  let events = [];
  let records = [];
  let calendar = null;

  if (identity.type === "branch") {
    calendar = await getCurrentBranchStudentCalendar(user);
    courseStart = dateOnly(calendar.startDate || courseStart);
    courseEnd = dateOnly(calendar.endDate || courseEnd || courseStart);
    events = Array.isArray(calendar.events) ? calendar.events : [];
    records = await prisma.branchStudentAttendance.findMany({
      where: {
        branchStudentId: student.id,
        ...(student.courseId ? { courseId: student.courseId } : {}),
        ...(student.batchId ? { batchId: student.batchId } : {}),
        attendanceDate: { gte: courseStart, lte: courseEnd },
      },
      orderBy: { attendanceDate: "asc" },
      select: { attendanceDate: true, status: true, markedAt: true, courseId: true, batchId: true },
    });
  } else {
    const durationMonths = Number(student.course?.duration || 0);
    courseEnd = courseEnd || (durationMonths ? keyFromDate(new Date(dateFromKey(courseStart).getFullYear(), dateFromKey(courseStart).getMonth() + durationMonths, dateFromKey(courseStart).getDate() - 1)) : courseStart);
    records = await prisma.studentAttendance.findMany({
      where: {
        studentId: student.id,
        ...(student.courseId ? { courseId: student.courseId } : {}),
        attendanceDate: { gte: courseStart, lte: courseEnd },
      },
      orderBy: { attendanceDate: "asc" },
      select: { attendanceDate: true, status: true, markedAt: true, courseId: true, batchName: true },
    });
  }
  if (!courseStart || !courseEnd) throw new AppError("Course period is not configured", 400);
  const days = aggregateEvents(events, records, courseStart, courseEnd, currentDate);
  const dailyStart = currentWeekStart(currentDate);
  const daily = aggregateEvents(events, records, dailyStart, addDays(dailyStart, 6), currentDate);
  const recordMap = new Map(records.map((record) => [record.attendanceDate, record]));
  const todayEvents = events.filter((event) => dateOnly(event.date) === currentDate && (event.isCourseDay || String(event.code || event.status || "").toUpperCase().includes("LEAVE") || String(event.code || event.status || "").toUpperCase().includes("HOLIDAY")));
  const todaySessions = todayEvents.map((event, index) => {
    const record = recordMap.get(currentDate);
    return {
      sessionId: event.id || `${currentDate}-${index}`,
      courseName: event.courseName || student.courseName || student.course?.name || "",
      moduleName: event.moduleName || record?.moduleName || null,
      batchName: event.batchName || student.batchName || null,
      facultyName: event.facultyName || student.facultyName || null,
      startTime: event.startTime || null,
      endTime: event.endTime || null,
      status: todayAttendanceStatus(event, record),
      markedAt: record?.markedAt || null,
    };
  });
  const todaySummary = {
    totalSessions: todaySessions.length,
    present: todaySessions.filter((session) => session.status === "PRESENT").length,
    absent: todaySessions.filter((session) => session.status === "ABSENT").length,
    late: todaySessions.filter((session) => session.status === "LATE").length,
    leave: todaySessions.filter((session) => session.status === "LEAVE").length,
    notMarked: todaySessions.filter((session) => session.status === "NOT_MARKED").length,
  };
  todaySummary.percentage = todaySummary.totalSessions ? Math.round(((todaySummary.present + todaySummary.late) / todaySummary.totalSessions) * 100) : 0;
  return {
    student: { id: student.id, name: student.studentName },
    course: { id: student.courseId, name: student.courseName || student.course?.name || "", startDate: courseStart, endDate: courseEnd, schedule: text(student.classSchedule || calendar?.schedule || "") },
    overall: summarize(days),
    todayAttendance: { date: currentDate, sessions: todaySessions, summary: todaySummary },
    daily,
    weekly: buildWeekly(days, courseStart, courseEnd, currentDate),
    monthly: buildMonthly(days, courseStart, courseEnd),
  };
}
