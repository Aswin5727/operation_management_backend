import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const IST_OFFSET_MINUTES = 330;
const REVENUE_SUMMARY_CACHE_TTL_MS = 15000;

let cachedRevenueSummary = null;
let cachedRevenueSummaryExpiresAt = 0;
let cachedRevenueSummaryPromise = null;

function normalizeString(value) {
  return String(value ?? "").trim();
}

function toIstDateParts(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

function toDateStringFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getIstToday() {
  const parts = toIstDateParts();
  return toDateStringFromParts(parts.year, parts.month, parts.day);
}

function getIstMonthStart(offsetMonths = 0) {
  const { year, month } = toIstDateParts();
  const date = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
  return date.toISOString().slice(0, 10);
}

function getIstWeekStart() {
  const today = getIstToday();
  const date = new Date(`${today}T00:00:00Z`);
  const { dayOfWeek } = toIstDateParts();
  const offset = (dayOfWeek + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function getIstWeekEnd() {
  const start = getIstWeekStart();
  return addDays(start, 6);
}

function buildRevenueWhere({ from, to, monthPrefix } = {}) {
  const where = {
    recordStatus: "ACTIVE",
  };

  if (monthPrefix) {
    where.admissionDate = {
      startsWith: monthPrefix,
    };
  }

  if (from || to) {
    where.admissionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return where;
}

function sumRevenue(record) {
  return Number(record?._sum?.totalAmount || 0);
}

function countStudents(record) {
  return Number(record?._count?.id || 0);
}

function normalizeFacultyText(value) {
  return String(value ?? "").trim();
}

function normalizeFacultyKey(value) {
  return normalizeFacultyText(value).toLowerCase();
}

function batchMatchesStudent(student, faculty, entry) {
  const studentFacultyId = normalizeFacultyText(student?.facultyId);
  const studentBatchId = normalizeFacultyText(student?.batchId || student?.batchEntryId);
  const studentCourseId = normalizeFacultyText(student?.courseId);

  const batchId = normalizeFacultyText(entry?.batchId || entry?.id);
  const courseId = normalizeFacultyText(entry?.courseId || faculty?.courseId);
  const facultyId = normalizeFacultyText(faculty?.id || faculty?.facultyId);

  return Boolean(
    batchId &&
    studentBatchId &&
    studentBatchId === batchId &&
    courseId &&
    studentCourseId &&
    studentCourseId === courseId &&
    (!facultyId || studentFacultyId === facultyId),
  );
}

function toBranchFacultyBatchEntries(branchBatches = [], branchFaculty = null) {
  if (!Array.isArray(branchBatches) || !branchBatches.length) {
    return [];
  }

  return branchBatches.map((batch) => ({
      id: batch?.batchId || batch?.id || "",
      // BranchStudent stores the assigned faculty's public ID (for example
      // FC-003), so keep the batch's faculty ID ahead of the internal row ID.
      facultyId: batch?.facultyId || branchFaculty?.facultyId || branchFaculty?.id || "",
      facultyName: branchFaculty?.name || "",
      facultyEmail: branchFaculty?.email || "",
      courseId: batch?.courseId || batch?.branchCourseId || "",
      courseName: batch?.courseName || batch?.branchCourse?.name || "",
      batchId: batch?.batchId || "",
      batchName: batch?.batchName || "",
      batchTiming: batch?.batchTiming || "",
      totalSeats: Number(batch?.totalSeats || 0),
      status: batch?.status === "INACTIVE" ? "Inactive" : "Active",
      sequenceNo: Number(batch?.sequenceNo || 0),
      createdAt: batch?.createdAt || null,
      updatedAt: batch?.updatedAt || null,
    }));
}

async function getFacultyMyBatchesSummary(user) {
  const normalizedEmail = normalizeFacultyText(user?.email).toLowerCase();

  if (!normalizedEmail) {
    throw new AppError("Faculty profile not found", 404);
  }

  const branchFaculty = await prisma.branchFaculty.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },

    include: {
      branchCourse: {
        select: {
          id: true,
          courseCode: true,
          name: true,
        },
      },
      branchBatches: {
        where: {
          status: "ACTIVE",
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  let faculty = await prisma.facultyProfile.findFirst({
    where: {
      facultyEmail: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
        },
      },
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
        select: {
          id: true,
          batchName: true,
          batchTiming: true,
          courseId: true,
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      courseAssignments: {
        select: {
          courseId: true,
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!faculty) {
  if (branchFaculty) {
    // BranchFaculty.branchCourseId is the current course assignment. Older
    // active batch records can remain after a course reassignment, so they
    // must not leak into the faculty dashboard summary.
    const currentCourseId = String(branchFaculty.branchCourseId || '').trim();
    const currentCourseBatches = currentCourseId
      ? branchFaculty.branchBatches.filter((batch) =>
          String(batch?.courseId || batch?.branchCourseId || '').trim() === currentCourseId,
        )
      : branchFaculty.branchBatches;
    const batchEntries = toBranchFacultyBatchEntries(currentCourseBatches, branchFaculty);
    const batchIds = batchEntries
      .map((entry) => normalizeFacultyText(entry.batchId || entry.id))
      .filter(Boolean);
    const branchStudentRows = batchIds.length
      ? await prisma.branchStudent.findMany({
          where: {
            branchId: branchFaculty.branchId,
            recordStatus: "ACTIVE",
            batchId: { in: batchIds },
          },
          select: {
            batchId: true,
            courseId: true,
            facultyId: true,
          },
        })
      : [];
    const studentCountByBatch = new Map();

    branchStudentRows.forEach((student) => {
      const key = [
        normalizeFacultyKey(student.batchId),
        normalizeFacultyKey(student.courseId),
        normalizeFacultyKey(student.facultyId),
      ].join("|");
      studentCountByBatch.set(key, (studentCountByBatch.get(key) || 0) + 1);
    });

    const batchCounts = batchEntries.map((entry) => {
      const key = [
        normalizeFacultyKey(entry.batchId || entry.id),
        normalizeFacultyKey(entry.courseId),
        normalizeFacultyKey(entry.facultyId),
      ].join("|");

      return {
        batchId: entry.id,
        studentCount: studentCountByBatch.get(key) || 0,
        studentRecords: [],
      };
    });
    const courseIds = Array.from(
      new Set(batchEntries.map((entry) => String(entry.courseId || '').trim()).filter(Boolean)),
    );

    return {
      faculty: {
        id: branchFaculty.facultyId,
        facultyName: branchFaculty.name,
        facultyEmail: branchFaculty.email,
        courseId:
          branchFaculty.branchCourse?.id || batchEntries[0]?.courseId || "",
        courseIds,
        courseName:
          branchFaculty.branchCourse?.name || batchEntries[0]?.courseName || "",
      },

      totalBatches: batchEntries.length,
      totalStudents: batchCounts.reduce((total, entry) => total + entry.studentCount, 0),
      batchEntries,
      batchCounts,
    };
  }

  throw new AppError(
    "Faculty profile not found",
    404,
  );
}

  const batchEntries = Array.isArray(faculty.batchEntries) ? faculty.batchEntries : [];
  if (!batchEntries.length) {
  return {
    faculty: {
      id: faculty.id,
      facultyName: faculty.facultyName,
      facultyEmail: faculty.facultyEmail,

      courseId:
        branchFaculty?.branchCourse?.id ||
        faculty.courseId ||
        "",

      courseName:
        branchFaculty?.branchCourse?.name ||
        faculty.course?.name ||
        "",
    },

    totalBatches: 0,
    totalStudents: 0,
    batchEntries: [],
    batchCounts: [],
  };
}

  const candidateStudents = await prisma.studentProfile.findMany({
    where: {
      recordStatus: "ACTIVE",
      OR: batchEntries.flatMap((entry) => {
        const conditions = [];
        const batchName = normalizeFacultyText(entry?.batchName);
        const courseId = normalizeFacultyText(entry?.courseId || faculty.courseId);

        if (entry?.id) {
          conditions.push({ batchId: entry.id });
        }

        if (faculty.id && batchName) {
          conditions.push({
            AND: [
              { facultyId: faculty.id },
              { batchName: { equals: batchName, mode: "insensitive" } },
              ...(courseId ? [{ courseId }] : []),
            ],
          });
        }

        if (faculty.facultyName && batchName) {
          conditions.push({
            AND: [
              { facultyName: { equals: faculty.facultyName, mode: "insensitive" } },
              { batchName: { equals: batchName, mode: "insensitive" } },
              ...(courseId ? [{ courseId }] : []),
            ],
          });
        }

        return conditions;
      }),
    },
    select: {
      id: true,
      studentName: true,
      emailAddress: true,
      mobileNumber: true,
      parentSpouseNumber: true,
      location: true,
      courseInterested: true,
      facultyId: true,
      facultyName: true,
      batchId: true,
      batchName: true,
      courseId: true,
      qualification: true,
      passedOutYear: true,
      currentStatus: true,
      designation: true,
      source: true,
      actualFees: true,
      registrationFees: true,
      discount: true,
      afterDiscount: true,
      admissionDate: true,
      remarks: true,
      recordStatus: true,
    },
  });

  const uniqueStudentIds = new Set();
  const batchCounts = batchEntries.map((entry) => {
    const matchingStudents = candidateStudents.filter((student) => batchMatchesStudent(student, faculty, entry));
    matchingStudents.forEach((student) => {
      if (student?.id) {
        uniqueStudentIds.add(student.id);
      }
    });

    return {
      batchId: entry.id,
      studentCount: matchingStudents.length,
      studentRecords: matchingStudents.map((student) => ({
        id: student.id,
        studentName: student.studentName || "",
        emailAddress: student.emailAddress || "",
        mobileNumber: student.mobileNumber || "",
        parentSpouseNumber: student.parentSpouseNumber || "",
        location: student.location || "",
        courseInterested: student.courseInterested || "",
        facultyId: student.facultyId || "",
        facultyName: student.facultyName || "",
        batchId: student.batchId || "",
        batchName: student.batchName || "",
        courseId: student.courseId || "",
        qualification: student.qualification || "",
        passedOutYear: student.passedOutYear ?? "",
        currentStatus: student.currentStatus || "",
        designation: student.designation || "",
        source: student.source || "",
        actualFees: student.actualFees ?? "",
        registrationFees: student.registrationFees ?? "",
        discount: student.discount ?? "",
        afterDiscount: student.afterDiscount ?? "",
        admissionDate: student.admissionDate || "",
        remarks: student.remarks || "",
        status: student.recordStatus === "ACTIVE" ? "Active" : "Inactive",
      })),
    };
  });

 return {
  faculty: {
    id: faculty.id,
    facultyName: faculty.facultyName,
    facultyEmail: faculty.facultyEmail,

    courseId:
      branchFaculty?.branchCourse?.id ||
      faculty.courseId ||
      "",

    courseName:
      branchFaculty?.branchCourse?.name ||
      faculty.course?.name ||
      "",
  },

  totalBatches: batchEntries.length,
  totalStudents: uniqueStudentIds.size,
  batchEntries,
  batchCounts,
};
}

const DASHBOARD_TIME_ZONE = "Asia/Calcutta";
function dashboardDate(date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: DASHBOARD_TIME_ZONE }).format(date); }
function dashboardParts(value) { return String(value).split("-").map(Number); }
function dashboardAddDays(value, amount) { const [year, month, day] = dashboardParts(value); const date = new Date(Date.UTC(year, month - 1, day + amount)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`; }
function dashboardDayName(value) { const [year, month, day] = dashboardParts(value); return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day))); }
function dashboardSummary(records) { const present = records.filter((record) => record.status === "PRESENT").length; const absent = records.filter((record) => record.status === "ABSENT").length; const recorded = present + absent; return { present, absent, recorded, percentage: recorded ? Math.round((present / recorded) * 1000) / 10 : null }; }
function dashboardHasPartialAttendance(records, students) { if (!students.length) return false; const dates = new Map(); records.forEach((record) => { if (!dates.has(record.attendanceDate)) dates.set(record.attendanceDate, new Set()); dates.get(record.attendanceDate).add(record.branchStudentId); }); return Array.from(dates.values()).some((studentIds) => studentIds.size < students.length); }
function dashboardDay(date, students, records, weeklyOffDay, requireComplete = false) { const applicable = !weeklyOffDay || normalizeFacultyKey(weeklyOffDay) !== normalizeFacultyKey(dashboardDayName(date)); const summary = dashboardSummary(records.filter((record) => record.attendanceDate === date)); const applicableStudents = applicable ? students.length : 0; const absent = summary.absent; const populationPercentage = applicableStudents && summary.recorded ? Math.round((summary.present / applicableStudents) * 10000) / 100 : null; const absentPercentage = applicableStudents && summary.recorded ? Math.round((absent / applicableStudents) * 10000) / 100 : null; const status = !applicable ? "NOT_APPLICABLE" : !summary.recorded ? "UNMARKED" : requireComplete && summary.recorded < students.length ? "PARTIAL" : "MARKED"; return { date, day: dashboardDayName(date), applicable, totalStudents: students.length, totalApplicableCount: applicableStudents, present: summary.present, absent, recorded: summary.recorded, presentPercentage: populationPercentage, absentPercentage, percentage: populationPercentage, status }; }
function dashboardWeeklyRangeSummary(dates, students, records, weeklyOffDay, todayValue) { const applicableDates = dates.filter((date) => date <= todayValue && (!weeklyOffDay || normalizeFacultyKey(weeklyOffDay) !== normalizeFacultyKey(dashboardDayName(date)))); const rangeRecords = records.filter((record) => applicableDates.includes(record.attendanceDate)); const present = rangeRecords.filter((record) => record.status === "PRESENT").length; const absent = rangeRecords.filter((record) => record.status === "ABSENT").length; const opportunities = students.length * applicableDates.length; return { present, absent, recordedAbsent: absent, recorded: present + absent, totalApplicableCount: opportunities, applicableDays: applicableDates.length, applicableStudentDays: opportunities, presentPercentage: opportunities ? Math.round((present / opportunities) * 10000) / 100 : null, absentPercentage: opportunities ? Math.round((absent / opportunities) * 10000) / 100 : null, percentage: opportunities ? Math.round((present / opportunities) * 10000) / 100 : null, status: opportunities && present + absent ? "MARKED" : "UNMARKED" }; }
function dashboardMonthWeeks(year, month, students, records, weeklyOffDay, _requireComplete = false, todayValue = "9999-12-31") { const first = new Date(Date.UTC(year, month - 1, 1)); const last = new Date(Date.UTC(year, month, 0)); const firstSunday = new Date(first); firstSunday.setUTCDate(first.getUTCDate() - first.getUTCDay()); const weeks = []; for (let cursor = new Date(firstSunday), number = 1; cursor <= last; number += 1) { const dates = Array.from({ length: 7 }, (_, index) => dashboardAddDays(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`, index)); const summary = dashboardWeeklyRangeSummary(dates, students, records, weeklyOffDay, todayValue); weeks.push({ label: `Week ${number}`, start: dates[0], end: dates[6], totalStudents: students.length, ...summary, weeklyOffDay: weeklyOffDay || null }); cursor.setUTCDate(cursor.getUTCDate() + 7); } return weeks; }
function dashboardMonthlySummary(year, month, students, records, weeklyOffDay, todayValue) { const monthStart = `${year}-${String(month).padStart(2, "0")}-01`; const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate(); const dates = Array.from({ length: daysInMonth }, (_, index) => dashboardAddDays(monthStart, index)); const summary = dashboardWeeklyRangeSummary(dates, students, records, weeklyOffDay, todayValue); const recordedDays = new Set(records.filter((record) => dates.includes(record.attendanceDate)).map((record) => record.attendanceDate)).size; return { ...summary, recordedDays, status: summary.applicableStudentDays && recordedDays ? "MARKED" : "UNMARKED" }; }
function dashboardYearMonths(year, students, records, weeklyOffDay = null, todayValue = "9999-12-31") { return Array.from({ length: 12 }, (_, index) => { const month = String(index + 1).padStart(2, "0"); const summary = dashboardMonthlySummary(year, index + 1, students, records, weeklyOffDay, todayValue); return { label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, index, 1))), month: `${year}-${month}`, totalStudents: students.length, ...summary }; }); }
function dashboardCombinedMonthlySummary(year, month, groups, todayValue) { const totals = { present: 0, absent: 0, recorded: 0, applicableDays: 0, applicableStudentDays: 0, recordedDays: new Set() }; groups.forEach((group) => { const summary = dashboardMonthlySummary(year, month, group.students, group.records, group.weeklyOffDay, todayValue); totals.present += summary.present; totals.absent += summary.absent; totals.recorded += summary.recorded; totals.applicableDays = Math.max(totals.applicableDays, summary.applicableDays); totals.applicableStudentDays += summary.applicableStudentDays; group.records.filter((record) => record.attendanceDate.startsWith(`${year}-${String(month).padStart(2, "0")}`)).forEach((record) => totals.recordedDays.add(record.attendanceDate)); }); return { ...totals, recordedDays: totals.recordedDays.size, percentage: totals.applicableStudentDays ? Math.round((totals.present / totals.applicableStudentDays) * 10000) / 100 : null, status: totals.applicableStudentDays && totals.recorded ? "MARKED" : "UNMARKED" }; }
async function getFacultyDashboardOverview(user) {
  const email = normalizeFacultyText(user?.email).toLowerCase();
  if (!email) throw new AppError("Faculty profile not found", 404);
  const branchFaculty = await prisma.branchFaculty.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: "ACTIVE" }, select: { id: true, facultyId: true, branchId: true, branchCourseId: true } });
  if (!branchFaculty) return { generatedAt: new Date().toISOString(), batches: [], totalBatches: 0, totalStudents: 0 };
  const markers = [branchFaculty.id, branchFaculty.facultyId].filter(Boolean);
  const batches = await prisma.branchBatch.findMany({ where: { branchId: branchFaculty.branchId, status: "ACTIVE", ...(branchFaculty.branchCourseId ? { branchCourseId: branchFaculty.branchCourseId } : {}), OR: [{ branchFacultyId: { in: markers } }, { facultyId: { in: markers } }, { facultyEmail: { equals: email, mode: "insensitive" } }] }, orderBy: [{ courseName: "asc" }, { sequenceNo: "asc" }], select: { id: true, branchId: true, courseId: true, courseName: true, batchId: true, batchName: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, batchTiming: true, mode: true, weeklyOffDay: true, weekType: true } });
  const uniqueBatches = Array.from(new Map(batches.map((batch) => [`${batch.branchId}:${batch.batchId}`, batch])).values());
  const todayValue = dashboardDate(); const [year, month, day] = dashboardParts(todayValue); const current = new Date(Date.UTC(year, month - 1, day)); const mondayOffset = current.getUTCDay() === 0 ? -6 : 1 - current.getUTCDay(); const weekDates = Array.from({ length: 7 }, (_, index) => dashboardAddDays(todayValue, mondayOffset + index)); const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  if (!uniqueBatches.length) return { generatedAt: new Date().toISOString(), today: todayValue, month: monthStart.slice(0, 7), weekDates, batches: [], totalBatches: 0, totalStudents: 0, courseIds: branchFaculty.branchCourseId ? [branchFaculty.branchCourseId] : [] };
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: uniqueBatches.map((batch) => ({ branchId: batch.branchId, courseId: batch.courseId, batchId: batch.batchId })) }, select: { id: true, branchId: true, courseId: true, batchId: true, courseProgress: true } });
  const yearStart = `${year}-01-01`; const attendanceStart = yearStart < weekDates[0] ? yearStart : weekDates[0]; const ids = students.map((student) => student.id); const attendance = ids.length ? await prisma.branchStudentAttendance.findMany({ where: { branchStudentId: { in: ids }, attendanceDate: { gte: attendanceStart, lte: todayValue } }, select: { branchStudentId: true, batchId: true, attendanceDate: true, status: true } }) : [];
  const attendanceGroups = uniqueBatches.map((batch) => { const batchStudents = students.filter((student) => student.branchId === batch.branchId && student.courseId === batch.courseId && student.batchId === batch.batchId); const studentIds = new Set(batchStudents.map((student) => student.id)); const records = attendance.filter((record) => studentIds.has(record.branchStudentId) && (!record.batchId || record.batchId === batch.batchId)); return { batch, students: batchStudents, records }; });
  const result = attendanceGroups.map(({ batch, students: batchStudents, records }) => { const values = batchStudents.map((student) => Number(student.courseProgress)); const progress = batchStudents.length && values.every(Number.isFinite) ? Math.round(values.reduce((sum, value) => sum + value, 0) / batchStudents.length * 10) / 10 : null; return { id: batch.id, courseId: batch.courseId, courseName: batch.courseName, batchId: batch.batchId, batchName: batch.batchName, timing: batch.batchTiming || `${batch.startTime || ""} ${batch.startPeriod || ""} - ${batch.endTime || ""} ${batch.endPeriod || ""}`.trim(), mode: batch.mode || null, weeklyOffDay: batch.weeklyOffDay || null, weekType: batch.weekType || null, studentCount: batchStudents.length, daily: dashboardDay(todayValue, batchStudents, records, batch.weeklyOffDay), weekly: weekDates.map((dateValue) => dashboardDay(dateValue, batchStudents, records, batch.weeklyOffDay)), weeklyByMonth: dashboardMonthWeeks(year, month, batchStudents, records, batch.weeklyOffDay, false, todayValue), monthlyYear: dashboardYearMonths(year, batchStudents, records, batch.weeklyOffDay, todayValue), monthly: dashboardMonthlySummary(year, month, batchStudents, records, batch.weeklyOffDay, todayValue), progress: progress == null ? null : { percentage: progress, studentsIncluded: batchStudents.length } }; });
  const allProgressValues = students.map((student) => Number(student.courseProgress));
  const allProgress = students.length && allProgressValues.every(Number.isFinite)
    ? Math.round(allProgressValues.reduce((sum, value) => sum + value, 0) / students.length * 10) / 10
    : null;
  const allBatches = { id: "all", courseId: null, courseName: null, batchId: null, batchName: null, timing: null, mode: null, weeklyOffDay: null, weekType: null, studentCount: students.length, daily: dashboardDay(todayValue, students, attendance, null), weekly: weekDates.map((dateValue) => dashboardDay(dateValue, students, attendance, null)), weeklyByMonth: dashboardMonthWeeks(year, month, students, attendance, null, false, todayValue), monthlyYear: Array.from({ length: 12 }, (_, index) => ({ label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, index, 1))), month: `${year}-${String(index + 1).padStart(2, "0")}`, totalStudents: students.length, ...dashboardCombinedMonthlySummary(year, index + 1, attendanceGroups, todayValue) })), monthly: dashboardCombinedMonthlySummary(year, month, attendanceGroups, todayValue), batches: result, progress: allProgress == null ? null : { percentage: allProgress, studentsIncluded: students.length } };
  return { generatedAt: new Date().toISOString(), today: todayValue, year, month: monthStart.slice(0, 7), weekDates, totalBatches: result.length, totalStudents: students.length, courseIds: Array.from(new Set(result.map((batch) => batch.courseId).filter(Boolean))), batches: result, allBatches };
}

async function getRevenueSummary() {
  const now = Date.now();

  if (cachedRevenueSummary && now < cachedRevenueSummaryExpiresAt) {
    return cachedRevenueSummary;
  }

  if (cachedRevenueSummaryPromise) {
    return cachedRevenueSummaryPromise;
  }

  cachedRevenueSummaryPromise = (async () => {
    const today = getIstToday();
    const monthStart = getIstMonthStart();
    const nextMonthStart = getIstMonthStart(1);
    const weekStart = getIstWeekStart();
    const weekEnd = getIstWeekEnd();

    const previousMonthStart = getIstMonthStart(-1);
    const previousMonthEnd = addDays(monthStart, -1);

    const [totalRevenue, totalStudents, thisMonthRevenue, thisMonthStudents, thisWeekRevenue, thisWeekStudents, previousMonthRevenue] =
      await prisma.$transaction([
        prisma.studentProfile.aggregate({
          where: buildRevenueWhere(),
          _sum: { totalAmount: true },
        }),
        prisma.studentProfile.aggregate({
          where: buildRevenueWhere(),
          _count: { id: true },
        }),
        prisma.studentProfile.aggregate({
          where: buildRevenueWhere({ from: monthStart, to: nextMonthStart }),
          _sum: { totalAmount: true },
        }),
        prisma.studentProfile.aggregate({
          where: buildRevenueWhere({ from: monthStart, to: nextMonthStart }),
          _count: { id: true },
        }),
        prisma.studentProfile.aggregate({
          where: buildRevenueWhere({ from: weekStart, to: weekEnd }),
          _sum: { totalAmount: true },
        }),
        prisma.studentProfile.aggregate({
          where: buildRevenueWhere({ from: weekStart, to: weekEnd }),
          _count: { id: true },
        }),
        prisma.studentProfile.aggregate({
          where: buildRevenueWhere({ from: previousMonthStart, to: previousMonthEnd }),
          _sum: { totalAmount: true },
        }),
      ]);

    const expectedNextWeekRevenue = Math.round(
      Math.max(
        sumRevenue(thisWeekRevenue),
        sumRevenue(thisMonthRevenue) / 4,
        sumRevenue(previousMonthRevenue) / 4,
      ),
    );

    return {
      generatedAt: today,
      totalRevenue: sumRevenue(totalRevenue),
      totalStudents: countStudents(totalStudents),
      thisMonthRevenue: sumRevenue(thisMonthRevenue),
      thisMonthStudents: countStudents(thisMonthStudents),
      thisWeekRevenue: sumRevenue(thisWeekRevenue),
      thisWeekStudents: countStudents(thisWeekStudents),
      expectedNextWeekRevenue,
    };
  })()
    .then((summary) => {
      cachedRevenueSummary = summary;
      cachedRevenueSummaryExpiresAt = Date.now() + REVENUE_SUMMARY_CACHE_TTL_MS;
      return summary;
    })
    .finally(() => {
      cachedRevenueSummaryPromise = null;
    });

  return cachedRevenueSummaryPromise;
}

function invalidateRevenueSummaryCache() {
  cachedRevenueSummary = null;
  cachedRevenueSummaryExpiresAt = 0;
}

export { getRevenueSummary, getFacultyMyBatchesSummary, getFacultyDashboardOverview, invalidateRevenueSummaryCache };
