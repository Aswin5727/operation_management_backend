import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const WEEKDAY_DAYS = new Set([1, 2, 3, 4, 5]);
const WEEKEND_DAYS = new Set([0, 6]);
const MAX_CALENDAR_DAYS = 3660;

function text(value) {
  return String(value ?? "").trim();
}

function dateKey(value) {
  const valueText = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText)) return "";
  const date = new Date(`${valueText}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : valueText;
}

function addDay(value, days = 1) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(value, months) {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getScheduleDays(schedule) {
  const value = text(schedule).toLowerCase();
  if (value.includes("weekend")) return WEEKEND_DAYS;
  if (value.includes("weekday") || value.includes("week day") || value.includes("week")) return WEEKDAY_DAYS;

  const configured = new Set();
  ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].forEach((day, index) => {
    if (value.includes(day.slice(0, 3)) || value.includes(day)) configured.add(index);
  });
  return configured.size ? configured : WEEKDAY_DAYS;
}

function resolveStudentWhere(user) {
  const email = text(user?.email).toLowerCase();
  const userCode = text(user?.userCode);
  return {
    OR: [
      ...(email ? [{ emailAddress: email }] : []),
      ...(userCode ? [{ studentId: userCode }, { id: userCode }] : []),
    ],
  };
}

function buildCourseDays({ startDate, schedule, holidays, leaves, requiredWorkingDays, fallbackEndDate }) {
  const scheduledDays = getScheduleDays(schedule);
  const excluded = new Map();
  holidays.forEach((item) => excluded.set(item.holidayDate, { type: "Government Holiday", name: item.name }));
  leaves.forEach((item) => excluded.set(item.leaveDate, { type: "Leave", name: item.reason || "Branch leave" }));

  const days = [];
  let cursor = startDate;
  let counted = 0;
  let guard = 0;
  let endDate = fallbackEndDate;

  while (guard < MAX_CALENDAR_DAYS) {
    const date = new Date(`${cursor}T00:00:00`);
    const isScheduled = scheduledDays.has(date.getDay());
    const exclusion = excluded.get(cursor);
    const isCourseDay = isScheduled && !exclusion;

    if (isCourseDay) counted += 1;
    days.push({ date: cursor, isCourseDay, exclusion });

    if (requiredWorkingDays > 0 && counted >= requiredWorkingDays) {
      endDate = cursor;
      break;
    }

    if (requiredWorkingDays <= 0 && fallbackEndDate && cursor >= fallbackEndDate) break;
    cursor = addDay(cursor);
    guard += 1;
  }

  return { days, endDate, workingDays: counted };
}

export async function getCurrentBranchStudentCalendar(user, query = {}) {
  const where = resolveStudentWhere(user);
  if (!where.OR.length) throw new AppError("Student session is required", 401);

  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      course: { select: { id: true, name: true, duration: true } },
      calendarAttendanceRecords: { orderBy: { attendanceDate: "asc" } },
    },
  });

  if (!student) throw new AppError("Branch student profile not found", 404);

  const startDate = dateKey(student.courseStartDate || student.admissionDate);
  if (!startDate) throw new AppError("Course start date is not configured for this student", 400);

  const durationMonths = Number(student.course?.duration || 0);
  const fallbackEndDate = student.courseEndDate || (durationMonths > 0 ? addMonths(startDate, durationMonths) : startDate);
  const requiredWorkingDays = Number(student.totalWorkingDays || 0);
  const from = dateKey(query.from) || startDate;

  const [holidays, leaves] = await Promise.all([
    prisma.branchCalendarHoliday.findMany({
      where: { status: "ACTIVE", holidayDate: { gte: startDate }, OR: [{ branchId: null }, { branchId: student.branchId }] },
      orderBy: { holidayDate: "asc" },
    }),
    prisma.branchCalendarLeave.findMany({
      where: { branchId: student.branchId, status: "ACTIVE", ...(student.batchId ? { OR: [{ batchId: null }, { batchId: student.batchId }] } : {}), leaveDate: { gte: startDate } },
      orderBy: { leaveDate: "asc" },
    }),
  ]);

  const calculation = buildCourseDays({
    startDate,
    schedule: student.classSchedule,
    holidays,
    leaves,
    requiredWorkingDays,
    fallbackEndDate,
  });
  const endDate = calculation.endDate;
  const attendanceByDate = new Map(student.calendarAttendanceRecords.map((record) => [record.attendanceDate, record]));
  const visibleDays = calculation.days.filter((day) => day.date >= from && day.date <= endDate);
  const events = visibleDays.map((day) => {
    const attendance = attendanceByDate.get(day.date);
    const status = day.exclusion?.type || (attendance?.status === "PRESENT" ? "Present" : attendance?.status === "ABSENT" ? "Absent" : day.isCourseDay ? "Course Day" : "No Class");
    return {
      date: day.date,
      status,
      reason: day.exclusion?.name || "",
      attendanceStatus: attendance?.status || null,
      moduleId: attendance?.moduleId || null,
      moduleName: attendance?.moduleName || null,
      submoduleId: attendance?.submoduleId || null,
      submoduleName: attendance?.submoduleName || null,
      progress: attendance?.progress ?? null,
      isCourseDay: day.isCourseDay,
    };
  });

  return {
    studentId: student.studentId,
    course: { id: student.courseId, name: student.courseName || student.course?.name || "", durationMonths },
    batch: { id: student.batchId, name: student.batchName, timing: student.batchTiming },
    startDate,
    endDate,
    expectedEndDate: fallbackEndDate,
    schedule: student.classSchedule || "Weekday",
    totalWorkingDays: requiredWorkingDays,
    calculatedWorkingDays: calculation.workingDays,
    extensionDays: Math.max(0, Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${fallbackEndDate}T00:00:00`)) / 86400000)),
    events,
  };
}
