import prisma from "../../config/prisma.js";

const IST_OFFSET_MINUTES = 330;
const REVENUE_INSIGHTS_CACHE_TTL_MS = 30000;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let cachedRevenueInsights = null;
let cachedRevenueInsightsExpiresAt = 0;
let cachedRevenueInsightsPromise = null;

const revenueStudentSelect = {
  admissionDate: true,
  afterDiscount: true,
  totalAmount: true,
  installment1: true,
  installment2: true,
  installment3: true,
  firstInstallmentAmount: true,
  firstInstallmentDate: true,
  firstInstallmentStatus: true,
  firstInstallmentPaidAt: true,
  secondInstallmentAmount: true,
  secondDueDate: true,
  secondInstallmentStatus: true,
  secondInstallmentPaidAt: true,
};

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

function addOneMonth(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setUTCMonth(date.getUTCMonth() + 1);
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

function getIstWeekStart(referenceDate = null) {
  const today = referenceDate || getIstToday();
  const date = new Date(`${today}T00:00:00Z`);
  const { dayOfWeek } = toIstDateParts(referenceDate ? new Date(`${referenceDate}T00:00:00Z`) : new Date());
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
  const weekStart = getIstWeekStart(today);

  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);
  const lastMonthStart = getIstMonthStart(-1);
  const lastMonthEnd = addDays(monthStart, -1);

  return students.reduce(
    (summary, student) => {
      const admissionDate = normalizeDateValue(student?.admissionDate || student?.firstInstallmentDate);
      const entries = getInstallmentEntries(student);
      const plannedTotal =
        toNumber(student?.totalAmount || student?.afterDiscount) ||
        entries.reduce((total, entry) => total + entry.amount, 0);

      summary.totalStudents += 1;

      if (isWithinRange(admissionDate, monthStart, today)) {
        summary.thisMonthStudents += 1;
      }

      if (isWithinRange(admissionDate, weekStart, today)) {
        summary.thisWeekStudents += 1;
      }

      let paidTotalForStudent = 0;
      let paidTotalBeforeWeekStart = 0;

      for (const entry of entries) {
        if (String(entry.status).toLowerCase() !== "paid") {
          continue;
        }

        paidTotalForStudent += entry.amount;
        summary.totalRevenue += entry.amount;

        const paymentDate = entry.paidAt || admissionDate || entry.dueDate;

        if (paymentDate && paymentDate < weekStart) {
          paidTotalBeforeWeekStart += entry.amount;
          summary.lastWeekCumulativeRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, lastMonthStart, lastMonthEnd)) {
          summary.lastMonthRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, lastWeekStart, lastWeekEnd)) {
          summary.lastWeekRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, monthStart, today)) {
          summary.thisMonthRevenue += entry.amount;
        }

        if (isWithinRange(paymentDate, weekStart, today)) {
          summary.thisWeekRevenue += entry.amount;
        }
      }

      summary.pendingPayments += Math.max(plannedTotal - paidTotalForStudent, 0);
      summary.lastWeekPendingPayments += Math.max(plannedTotal - paidTotalBeforeWeekStart, 0);

      return summary;
    },
    {
      totalRevenue: 0,
      thisMonthRevenue: 0,
      thisWeekRevenue: 0,
      pendingPayments: 0,
      totalStudents: 0,
      thisMonthStudents: 0,
      thisWeekStudents: 0,
      lastWeekCumulativeRevenue: 0,
      lastMonthRevenue: 0,
      lastWeekRevenue: 0,
      lastWeekPendingPayments: 0,
    },
  );
}

function buildMonthlyRevenueComparison(students, referenceDate = new Date()) {
  const year = toIstDateParts(referenceDate).year;
  const buckets = MONTH_LABELS.map((month, monthIndex) => ({
    month,
    monthIndex,
    actual: 0,
    expected: 0,
  }));

  for (const student of students) {
    for (const entry of getInstallmentEntries(student)) {
      const amount = toNumber(entry.amount);
      if (!amount) continue;

      const paidAt = getDateObject(entry.paidAt);
      if (String(entry.status).toLowerCase() === "paid" && paidAt && paidAt.getUTCFullYear() === year) {
        buckets[paidAt.getUTCMonth()].actual += amount;
        continue;
      }

      const dueDate = getDateObject(entry.dueDate);
      if (!dueDate || dueDate.getUTCFullYear() !== year) {
        continue;
      }

      buckets[dueDate.getUTCMonth()].expected += amount;
    }
  }

  return buckets.map(({ month, actual, expected }) => ({ month, actual, expected }));
}

function buildWeeklyRevenueComparison(students, referenceDate = new Date()) {
  const parts = toIstDateParts(referenceDate);
  const year = parts.year;
  const monthIndex = parts.month - 1;
  const currentWeekIndex = getCurrentWeekIndex(referenceDate);
  const buckets = getWeekBuckets(referenceDate).map((bucket, index) => ({
    week: index === currentWeekIndex ? `${bucket.label} (Current)` : bucket.label,
    actual: 0,
    expected: 0,
    start: bucket.start,
    end: bucket.end,
    isCurrent: index === currentWeekIndex,
  }));

  for (const student of students) {
    for (const entry of getInstallmentEntries(student)) {
      const amount = toNumber(entry.amount);
      if (!amount) continue;

      const paidAt = getDateObject(entry.paidAt);
      if (
        String(entry.status).toLowerCase() === "paid" &&
        paidAt &&
        paidAt.getUTCFullYear() === year &&
        paidAt.getUTCMonth() === monthIndex
      ) {
        const paidDay = paidAt.getUTCDate();
        const paidIndex = buckets.findIndex((bucket) => paidDay >= bucket.start && paidDay <= bucket.end);
        if (paidIndex >= 0) {
          buckets[paidIndex].actual += amount;
        }
        continue;
      }

      const dueDate = getDateObject(entry.dueDate);
      if (!dueDate || dueDate.getUTCFullYear() !== year || dueDate.getUTCMonth() !== monthIndex) {
        continue;
      }

      const dueDay = dueDate.getUTCDate();
      const dueIndex = buckets.findIndex((bucket) => dueDay >= bucket.start && dueDay <= bucket.end);
      if (dueIndex >= 0 && dueIndex >= currentWeekIndex) {
        buckets[dueIndex].expected += amount;
      }
    }
  }

  return buckets.map(({ week, actual, expected, isCurrent }) => ({ week, actual, expected, isCurrent }));
}

async function loadRevenueInsights() {
  const students = await prisma.studentProfile.findMany({
    where: {
      recordStatus: "ACTIVE",
    },
    select: revenueStudentSelect,
  });

  return {
    generatedAt: getIstToday(),
    summary: calculateRevenueSummary(students),
    monthlyRevenue: buildMonthlyRevenueComparison(students),
    weeklyRevenue: buildWeeklyRevenueComparison(students),
  };
}

async function getRevenueInsights() {
  const now = Date.now();

  if (cachedRevenueInsights && now < cachedRevenueInsightsExpiresAt) {
    return cachedRevenueInsights;
  }

  if (cachedRevenueInsightsPromise) {
    return cachedRevenueInsightsPromise;
  }

  cachedRevenueInsightsPromise = loadRevenueInsights()
    .then((insights) => {
      cachedRevenueInsights = insights;
      cachedRevenueInsightsExpiresAt = Date.now() + REVENUE_INSIGHTS_CACHE_TTL_MS;
      return insights;
    })
    .finally(() => {
      cachedRevenueInsightsPromise = null;
    });

  return cachedRevenueInsightsPromise;
}

async function getRevenueSummary() {
  const insights = await getRevenueInsights();
  return insights.summary;
}

function invalidateRevenueSummaryCache() {
  cachedRevenueInsights = null;
  cachedRevenueInsightsExpiresAt = 0;
}

export { getRevenueSummary, getFacultyMyBatchesSummary, invalidateRevenueSummaryCache };
