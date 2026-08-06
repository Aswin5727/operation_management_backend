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
  const studentFacultyName = normalizeFacultyKey(student?.facultyName);
  const studentBatchId = normalizeFacultyText(student?.batchId || student?.batchEntryId);
  const studentBatchName = normalizeFacultyKey(student?.batchName || student?.batch);
  const studentCourseId = normalizeFacultyText(student?.courseId);

  const facultyId = normalizeFacultyText(faculty?.id);
  const facultyName = normalizeFacultyKey(faculty?.facultyName);
  const batchId = normalizeFacultyText(entry?.id);
  const batchName = normalizeFacultyKey(entry?.batchName);
  const courseId = normalizeFacultyText(entry?.courseId || faculty?.courseId);

  if (batchId && studentBatchId && studentBatchId === batchId) {
    return true;
  }

  const courseMatches = !courseId || !studentCourseId || studentCourseId === courseId;
  const batchNameMatches = batchName && studentBatchName && studentBatchName === batchName;

  if (facultyId && studentFacultyId && studentFacultyId === facultyId && batchNameMatches && courseMatches) {
    return true;
  }

  if (facultyName && studentFacultyName && studentFacultyName === facultyName && batchNameMatches && courseMatches) {
    return true;
  }

  return false;
}

async function getFacultyMyBatchesSummary(user) {
  const normalizedEmail = normalizeFacultyText(user?.email).toLowerCase();
  if (!normalizedEmail) {
    throw new AppError("Faculty profile not found", 404);
  }

  const faculty = await prisma.facultyProfile.findFirst({
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
    throw new AppError("Faculty profile not found", 404);
  }

  const batchEntries = Array.isArray(faculty.batchEntries) ? faculty.batchEntries : [];
  if (!batchEntries.length) {
    return {
      faculty: {
        id: faculty.id,
        facultyName: faculty.facultyName,
        facultyEmail: faculty.facultyEmail,
        courseId: faculty.courseId || "",
      },
      totalBatches: 0,
      totalStudents: 0,
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
      courseId: faculty.courseId || "",
    },
    totalBatches: batchEntries.length,
    totalStudents: uniqueStudentIds.size,
    batchCounts,
  };
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

export { getRevenueSummary, getFacultyMyBatchesSummary, invalidateRevenueSummaryCache };