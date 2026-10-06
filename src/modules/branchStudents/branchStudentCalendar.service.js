import { studentCalendar } from "../instituteLeave/instituteLeave.service.js";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const WEEKDAY_DAYS = new Set([1, 2, 3, 4, 5]);
const WEEKEND_DAYS = new Set([0, 6]);
const MAX_CALENDAR_DAYS = 3660;
const COURSE_HOURS_PER_DAY = {
  onlineWeekday: 1,
  onlineWeekend: 1,
  offlineWeekday: 2,
  offlineWeekend: 3,
};

function text(value) {
  return String(value ?? "").trim();
}

function dateKey(value) {
  const valueText = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText)) return "";
  const date = new Date(`${valueText}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : valueText;
}

function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDay(value, days = 1) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function addMonths(value, months) {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Number.isFinite(diff) ? Math.max(1, diff + 1) : 0;
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

function resolveCourseMode(student) {
  const value = text(student?.courseMode || student?.course?.mode).toLowerCase();
  if (value.includes("offline")) return "Offline";
  if (value.includes("online")) return "Online";
  return "Online";
}

function resolveScheduleType(schedule) {
  return text(schedule).toLowerCase().includes("weekend") ? "Weekend" : "Weekday";
}

function resolveHoursPerDay(courseMode, schedule) {
  const normalizedMode = text(courseMode).toLowerCase();
  const scheduleType = resolveScheduleType(schedule);

  if (normalizedMode === "offline" && scheduleType === "Weekend") return COURSE_HOURS_PER_DAY.offlineWeekend;
  if (normalizedMode === "offline") return COURSE_HOURS_PER_DAY.offlineWeekday;
  if (scheduleType === "Weekend") return COURSE_HOURS_PER_DAY.onlineWeekend;
  return COURSE_HOURS_PER_DAY.onlineWeekday;
}

function resolveTotalHours(student) {
  const possibleValues = [
    student?.course?.hours,
    student?.totalHours,
    student?.courseHours,
    student?.hours,
  ];

  for (const value of possibleValues) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 0;
}

function buildCourseDays({ startDate, schedule, holidays, leaves, totalHours, hoursPerDay, requiredWorkingDays, fallbackEndDate }) {
  const scheduledDays = getScheduleDays(schedule);
  const excluded = new Map();
  holidays.forEach((item) => excluded.set(item.holidayDate, { type: "Government Holiday", name: item.name }));
  leaves.forEach((item) => excluded.set(item.leaveDate, { type: "Leave", name: item.reason || "Branch leave" }));

  const days = [];
  let cursor = startDate;
  let counted = 0;
  let guard = 0;
  let endDate = fallbackEndDate;
  let remainingHours = Math.max(Number(totalHours || 0), 0);
  const dailyHours = Math.max(Number(hoursPerDay || 0), 0);
  const shouldCalculateByHours = remainingHours > 0 && dailyHours > 0;

  while (guard < MAX_CALENDAR_DAYS) {
    const date = new Date(`${cursor}T00:00:00`);
    const isScheduled = scheduledDays.has(date.getDay());
    const exclusion = excluded.get(cursor);
    const isCourseDay = isScheduled && !exclusion;
    const classHours = shouldCalculateByHours && isCourseDay ? Math.min(dailyHours, remainingHours) : 0;

    if (isCourseDay) counted += 1;
    if (classHours > 0) remainingHours = Math.max(remainingHours - classHours, 0);
    days.push({ date: cursor, isCourseDay, exclusion, classHours });

    if (shouldCalculateByHours && remainingHours <= 0) {
      endDate = cursor;
      break;
    }

    if (!shouldCalculateByHours && requiredWorkingDays > 0 && counted >= requiredWorkingDays) {
      endDate = cursor;
      break;
    }

    if (!shouldCalculateByHours && requiredWorkingDays <= 0 && fallbackEndDate && cursor >= fallbackEndDate) break;
    cursor = addDay(cursor);
    guard += 1;
  }

  return { days, endDate, workingDays: counted, remainingHours };
}

export async function getCurrentBranchStudentCalendar(user, query = {}) {
  const where = resolveStudentWhere(user);
  if (!where.OR.length) throw new AppError("Student session is required", 401);

  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      course: { select: { id: true, name: true, duration: true, hours: true, mode: true } },
      calendarAttendanceRecords: { orderBy: { attendanceDate: "asc" } },
      courseEnrollments: { where: { status: "ACTIVE" }, include: { course: true } },
    },
  });

  if (!student) throw new AppError("Branch student profile not found", 404);

  if (query.courseId || (student.batchId && student.courseId && student.facultyId)) return studentCalendar(user, query);

  const startDate = dateKey(student.courseStartDate || student.admissionDate);
  if (!startDate) throw new AppError("Course start date is not configured for this student", 400);

  const durationMonths = Number(student.course?.duration || 0);
  const fallbackEndDate = student.courseEndDate || (durationMonths > 0 ? addMonths(startDate, durationMonths) : startDate);
  const requiredWorkingDays = Number(student.totalWorkingDays || 0);
  const courseMode = resolveCourseMode(student);
  const hoursPerDay = resolveHoursPerDay(courseMode, student.classSchedule);
  const totalHours = resolveTotalHours(student);
  const requiredTeachingDays = totalHours > 0 && hoursPerDay > 0 ? Math.ceil(totalHours / hoursPerDay) : requiredWorkingDays;
  const from = dateKey(query.from) || startDate;

  const [holidays, leaves] = await Promise.all([
    prisma.branchCalendarHoliday.findMany({
      where: { status: "ACTIVE", holidayDate: { gte: startDate }, OR: [{ branchId: null }, { branchId: student.branchId }] },
      orderBy: { holidayDate: "asc" },
    }),
    prisma.branchCalendarLeave.findMany({
      where: { branchId: student.branchId, status: "ACTIVE", isInstitute: false, ...(student.batchId ? { OR: [{ batchId: null }, { batchId: student.batchId }] } : {}), leaveDate: { gte: startDate } },
      orderBy: { leaveDate: "asc" },
    }),
  ]);

  const calculation = buildCourseDays({
    startDate,
    schedule: student.classSchedule,
    holidays,
    leaves,
    totalHours,
    hoursPerDay,
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
      classHours: day.classHours || 0,
    };
  });

  return {
    studentId: student.studentId,
    course: {
      id: student.courseId,
      name: student.courseName || student.course?.name || "",
      durationMonths,
      totalHours,
      mode: courseMode,
    },
    batch: { id: student.batchId, name: student.batchName, timing: student.batchTiming },
    startDate,
    endDate,
    expectedEndDate: fallbackEndDate,
    schedule: student.classSchedule || "Weekday",
    courseMode,
    totalHours,
    hoursPerDay,
    requiredTeachingDays,
    totalWorkingDays: requiredTeachingDays || requiredWorkingDays,
    calculatedWorkingDays: calculation.workingDays,
    actualTeachingDays: calculation.workingDays,
    calendarDurationDays: daysBetween(startDate, endDate),
    extensionDays: Math.max(0, Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${fallbackEndDate}T00:00:00`)) / 86400000)),
    events,
  };
}

export async function getBranchStudentCalendarById(studentId, query = {}) {
  const id = text(studentId);
  if (!id) throw new AppError("Student ID is required", 400);

  const student = await prisma.branchStudent.findFirst({
    where: { OR: [{ id }, { studentId: id }] },
    select: { emailAddress: true, studentId: true },
  });

  if (!student) throw new AppError("Branch student profile not found", 404);

  return getCurrentBranchStudentCalendar(
    { email: student.emailAddress, userCode: student.studentId },
    query,
  );
}
