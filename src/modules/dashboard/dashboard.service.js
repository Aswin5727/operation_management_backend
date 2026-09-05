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
