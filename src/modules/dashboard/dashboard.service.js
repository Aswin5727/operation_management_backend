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

function allocateCoursePaidAmounts(student) {
  const enrollments = (student?.courseEnrollments || [])
    .filter((item) => item.status === "ACTIVE")
    .sort((left, right) => Number(left.sequenceOrder || 0) - Number(right.sequenceOrder || 0));
  if (!enrollments.length && student?.courseId) {
    enrollments.push({ courseId: student.courseId, totalCourseAmount: student.courseAmount, sequenceOrder: 1, status: "ACTIVE" });
  }
  // Sequential installment rows are appended using each enrollment's final
  // (discounted) fee. Use that same amount as the allocation boundary; using
  // the pre-discount total shifts payments across course boundaries.
  const amounts = enrollments.map((item) => Math.max(0, Number(
    item.finalCourseAmount ?? item.totalCourseAmount ?? 0,
  )));
  if (enrollments.length === 1 && !amounts[0]) amounts[0] = Math.max(0, Number(student?.courseAmount || 0));
  const distribute = (amount, weights) => {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let assigned = 0;
    return weights.map((weight, index) => {
      const share = index === weights.length - 1
        ? Math.max(Number(amount) - assigned, 0)
        : Math.round((Number(amount) * (totalWeight ? weight : 1)) / (totalWeight || weights.length));
      assigned += share;
      return share;
    });
  };
  const allocateSequentially = (amount, capacities) => {
    let remaining = Math.max(0, Number(amount) || 0);
    return capacities.map((capacity) => {
      const share = Math.min(remaining, Math.max(0, capacity));
      remaining -= share;
      return share;
    });
  };

  const getPlanInstallmentCount = (enrollment) => {
    const paymentPlans = Array.isArray(enrollment?.course?.paymentPlans)
      ? enrollment.course.paymentPlans
      : Array.isArray(enrollment?.course?.paymentPlanSelections)
        ? enrollment.course.paymentPlanSelections
        : [];
    const planId = normalizeFacultyKey(enrollment?.paymentPlanId);
    const planName = normalizeFacultyKey(enrollment?.paymentPlan);
    const matchingPlan = paymentPlans.find((plan) => {
      const ids = [plan?.id, plan?.templateId, plan?.paymentPlanId].map(normalizeFacultyKey);
      const names = [plan?.templateName, plan?.name].map(normalizeFacultyKey);
      return (planId && ids.includes(planId)) || (planName && names.includes(planName));
    });
    const rawCount = Number(
      enrollment?.installmentCount ??
      matchingPlan?.installmentCount ??
      matchingPlan?.count ??
      matchingPlan?.installments?.length ??
      String(enrollment?.paymentPlan || '').match(/\d+/)?.[0] ??
      0,
    );
    return Number.isInteger(rawCount) && rawCount > 0 ? rawCount : 0;
  };

  // Sequential plans are appended to one student-level installment ledger.
  // Use the selected plan's count to identify the exact rows for each course;
  // fee-based allocation is unreliable when discounts or custom schedules
  // make installment totals differ from the course fee boundaries.
  if (normalizeFacultyKey(student?.arrangementType) === 'sequential' && enrollments.length > 1) {
    const installmentCounts = enrollments.map(getPlanInstallmentCount);
    if (installmentCounts.every((count) => count > 0) && installmentCounts.reduce((sum, count) => sum + count, 0) <= (student?.installments || []).length) {
      let installmentOffset = 0;
      return new Map(enrollments.map((enrollment, index) => {
        const courseInstallments = (student?.installments || []).slice(installmentOffset, installmentOffset + installmentCounts[index]);
        installmentOffset += installmentCounts[index];
        const paidAmount = courseInstallments.reduce((sum, installment) => {
          const amount = Math.max(0, Number(installment?.amount || 0));
          const paid = Math.min(amount, Math.max(0, Number(installment?.amountPaid || 0)));
          return sum + paid;
        }, 0);
        return [
          normalizeFacultyKey(enrollment.courseId),
          { courseAmount: amounts[index], paidAmount: Math.min(amounts[index], paidAmount) },
        ];
      }));
    }
  }

  const paidByCourse = amounts.map(() => 0);
  const scheduledByCourse = amounts.map(() => 0);
  const sequential = normalizeFacultyKey(student?.arrangementType) === "sequential";
  for (const installment of student?.installments || []) {
    const amount = Math.max(0, Number(installment.amount || 0));
    const paid = Math.min(amount, Math.max(0, Number(installment.amountPaid || 0)));
    const allocation = sequential
      ? allocateSequentially(amount, amounts.map((courseAmount, index) => courseAmount - scheduledByCourse[index]))
      : distribute(amount, amounts);
    const paidAllocation = sequential ? allocateSequentially(paid, allocation) : distribute(paid, amounts);
    allocation.forEach((courseAmount, index) => {
      scheduledByCourse[index] += courseAmount;
      paidByCourse[index] += Math.min(courseAmount, paidAllocation[index]);
    });
  }

  return new Map(enrollments.map((enrollment, index) => [
    normalizeFacultyKey(enrollment.courseId),
    { courseAmount: amounts[index], paidAmount: Math.min(amounts[index], paidByCourse[index]) },
  ]));
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
      branchId: batch?.branchId || branchFaculty?.branchId || "",
      branchCode: batch?.branch?.branchId || branchFaculty?.branch?.branchId || "",
      // BranchStudent stores the assigned faculty's public ID (for example
      // FC-003), so keep the batch's faculty ID ahead of the internal row ID.
      facultyId: batch?.facultyId || branchFaculty?.facultyId || branchFaculty?.id || "",
      facultyName: batch?.facultyName || branchFaculty?.name || "",
      facultyEmail: batch?.facultyEmail || branchFaculty?.email || "",
      courseId: batch?.courseId || batch?.branchCourseId || "",
      courseName: batch?.courseName || batch?.branchCourse?.name || "",
      batchId: batch?.batchId || "",
      batchName: batch?.batchName || "",
      batchTiming: batch?.batchTiming || "",
      weekType: batch?.weekType || "",
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
      branch: {
        select: {
          id: true,
          branchId: true,
        },
      },
      branchBatches: {
        where: {
          status: "ACTIVE",
        },
        orderBy: [{ createdAt: "asc" }],
      },
      courseAssignments: {
        select: { branchCourseId: true, branchCourse: { select: { id: true, name: true, courseCode: true } } },
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

  // Branch faculty records are the source of truth for branch dashboards.
  // Prefer them even when an older FacultyProfile row also exists for the
  // same email; that legacy row only supports one course assignment.
  if (branchFaculty) {
    // BranchFaculty has a legacy single-course pointer. Dashboard data must
    // use the batch rows and mapping table so older and newer course links are
    // both visible for the same faculty.
    const batchEntries = toBranchFacultyBatchEntries(branchFaculty.branchBatches, branchFaculty);
    const batchIds = batchEntries
      .map((entry) => normalizeFacultyText(entry.batchId || entry.id))
      .filter(Boolean);
    const branchStudentRows = batchEntries.length
      ? await prisma.branchStudent.findMany({
          where: {
            branchId: branchFaculty.branchId,
            recordStatus: "ACTIVE",
            OR: batchEntries.flatMap((entry) => {
              const courseId = normalizeFacultyText(entry.courseId);
              const batchId = normalizeFacultyText(entry.batchId || entry.id);
              if (!courseId || !batchId) return [];
              return [
                { courseId, batchId },
                { courseEnrollments: { some: { status: "ACTIVE", courseId, batchId } } },
              ];
            }),
          },
          select: {
            id: true,
            studentId: true,
            studentName: true,
            emailAddress: true,
            mobileNumber: true,
            courseId: true,
            courseName: true,
            batchId: true,
            batchName: true,
            facultyId: true,
            facultyName: true,
            arrangementType: true,
            courseProgress: true,
            installments: { select: { installmentNumber: true, amount: true, amountPaid: true, status: true } },
            courseEnrollments: {
              where: { status: "ACTIVE" },
              select: {
                courseId: true,
                courseName: true,
                batchId: true,
                batchName: true,
                facultyId: true,
                facultyName: true,
                batchTiming: true,
                scheduleType: true,
                mode: true,
                startDate: true,
                endDate: true,
                sequenceOrder: true,
                totalCourseAmount: true,
                finalCourseAmount: true,
                paymentPlanId: true,
                paymentPlan: true,
                course: {
                  select: {
                    paymentPlans: true,
                    paymentPlanSelections: true,
                  },
                },
                status: true,
              },
            },
          },
        })
      : [];
    const progressByBatch = new Map();

    const recordsByBatch = new Map();
    branchStudentRows.forEach((student) => {
      batchEntries.forEach((entry) => {
        const courseId = normalizeFacultyText(entry.courseId);
        const batchId = normalizeFacultyText(entry.batchId || entry.id);
        const enrollment = (student.courseEnrollments || []).find((item) =>
          normalizeFacultyKey(item.courseId) === normalizeFacultyKey(courseId) &&
          normalizeFacultyKey(item.batchId) === normalizeFacultyKey(batchId),
        );
        const legacyMatch = normalizeFacultyKey(student.courseId) === normalizeFacultyKey(courseId) &&
          normalizeFacultyKey(student.batchId) === normalizeFacultyKey(batchId);
        if (!enrollment && !legacyMatch) return;

        const key = [normalizeFacultyKey(batchId), normalizeFacultyKey(courseId), normalizeFacultyKey(entry.facultyId)].join("|");
        const records = recordsByBatch.get(key) || [];
        const coursePayment = allocateCoursePaidAmounts(student).get(normalizeFacultyKey(courseId)) || {
          courseAmount: Math.max(0, Number(enrollment?.totalCourseAmount || (legacyMatch ? student.courseAmount : 0))),
          paidAmount: 0,
        };
        if (!records.some((item) => item.id === student.id)) {
          records.push({
            id: student.id,
            studentId: student.studentId,
            studentName: student.studentName,
            emailAddress: student.emailAddress,
            mobileNumber: student.mobileNumber,
            branchId: branchFaculty.branchId,
            branchCode: branchFaculty.branch?.branchId || "",
            courseId,
            courseName: enrollment?.courseName || entry.courseName || student.courseName || "",
            batchId,
            batchName: enrollment?.batchName || entry.batchName || "",
            facultyId: enrollment?.facultyId || entry.facultyId,
            facultyName: enrollment?.facultyName || entry.facultyName,
            batchTiming: enrollment?.batchTiming || entry.batchTiming || "",
            classSchedule: enrollment?.scheduleType || "",
            courseMode: enrollment?.mode || "",
            courseStartDate: enrollment?.startDate || null,
            courseEndDate: enrollment?.endDate || null,
            courseProgress: enrollment?.courseProgress ?? (legacyMatch ? student.courseProgress : null),
            courseAmount: coursePayment.courseAmount,
            totalAmount: coursePayment.courseAmount,
            paidAmount: coursePayment.paidAmount,
          });
          const progress = Number(enrollment?.courseProgress ?? (legacyMatch ? student.courseProgress : NaN));
          if (Number.isFinite(progress)) {
            const progressSummary = progressByBatch.get(key) || { total: 0, count: 0 };
            progressSummary.total += Math.min(100, Math.max(0, progress));
            progressSummary.count += 1;
            progressByBatch.set(key, progressSummary);
          }
        }
        recordsByBatch.set(key, records);
      });
    });

    const batchCounts = batchEntries.map((entry) => {
      const key = [
        normalizeFacultyKey(entry.batchId || entry.id),
        normalizeFacultyKey(entry.courseId),
        normalizeFacultyKey(entry.facultyId),
      ].join("|");

      const studentRecords = recordsByBatch.get(key) || [];
      return {
        batchId: entry.id,
        studentCount: studentRecords.length,
        courseProgress: progressByBatch.has(key)
          ? Math.round(progressByBatch.get(key).total / Math.max(1, progressByBatch.get(key).count))
          : 0,
        studentRecords,
      };
    });
    const courseIds = Array.from(
      new Set(batchEntries.map((entry) => String(entry.courseId || '').trim()).filter(Boolean)),
    );

    return {
      faculty: {
        id: branchFaculty.facultyId,
        branchId: branchFaculty.branchId,
        branchCode: branchFaculty.branch?.branchId || "",
        facultyName: branchFaculty.name,
        facultyEmail: branchFaculty.email,
        courseId:
          branchFaculty.branchCourse?.id || batchEntries[0]?.courseId || "",
        courseIds,
        courseName:
          branchFaculty.courseAssignments?.[0]?.branchCourse?.name || branchFaculty.branchCourse?.name || batchEntries[0]?.courseName || "",
        courseAssignments: (branchFaculty.courseAssignments || []).map((assignment) => ({
          courseId: assignment.branchCourseId,
          courseName: assignment.branchCourse?.name || "",
          courseCode: assignment.branchCourse?.courseCode || "",
        })),
      },

      totalBatches: batchEntries.length,
      totalStudents: batchCounts.reduce((total, entry) => total + entry.studentCount, 0),
      batchEntries,
      batchCounts,
    };
  }

  if (!faculty) {
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
  const batches = await prisma.branchBatch.findMany({ where: { branchId: branchFaculty.branchId, status: "ACTIVE", OR: [{ branchFacultyId: { in: markers } }, { facultyId: { in: markers } }, { facultyEmail: { equals: email, mode: "insensitive" } }] }, orderBy: [{ courseName: "asc" }, { sequenceNo: "asc" }], select: { id: true, branchId: true, courseId: true, courseName: true, batchId: true, batchName: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, batchTiming: true, mode: true, weeklyOffDay: true, weekType: true } });
  const uniqueBatches = Array.from(new Map(batches.map((batch) => [`${batch.branchId}:${batch.batchId}`, batch])).values());
  const todayValue = dashboardDate(); const [year, month, day] = dashboardParts(todayValue); const current = new Date(Date.UTC(year, month - 1, day)); const mondayOffset = current.getUTCDay() === 0 ? -6 : 1 - current.getUTCDay(); const weekDates = Array.from({ length: 7 }, (_, index) => dashboardAddDays(todayValue, mondayOffset + index)); const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  if (!uniqueBatches.length) return { generatedAt: new Date().toISOString(), today: todayValue, month: monthStart.slice(0, 7), weekDates, batches: [], totalBatches: 0, totalStudents: 0, courseIds: branchFaculty.branchCourseId ? [branchFaculty.branchCourseId] : [] };
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", AND: [{ OR: [{ courseProgress: null }, { courseProgress: { lt: 100 } }] }, { OR: uniqueBatches.map((batch) => ({ branchId: batch.branchId, courseId: batch.courseId, batchId: batch.batchId })) }] }, select: { id: true, branchId: true, courseId: true, batchId: true, courseProgress: true } });
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

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function monthKey(year, month) { return `${year}-${String(month).padStart(2, "0")}`; }

function previousMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function dateIsInMonth(value, year, month) {
  return String(value || "").slice(0, 7) === monthKey(year, month);
}

function buildSuperAdminPaymentBuckets(today, payments, students) {
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    return { key: date, label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)), expected: 0, actual: 0 };
  });
  const todayParts = toIstDateParts(new Date());
  const weekStart = addDays(today, -new Date(`${today}T00:00:00Z`).getUTCDay());
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return { key: date, label: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)), expected: 0, actual: 0, start: date, end: date };
  });
  const daysInMonth = new Date(Date.UTC(todayParts.year, todayParts.month, 0)).getUTCDate();
  const monthly = [1, 2, 3, 4].map((index) => {
    const start = (index - 1) * 7 + 1;
    const end = Math.min(index * 7, daysInMonth);
    return { key: `${today.slice(0, 7)}-${start}`, label: `Week ${index}`, expected: 0, actual: 0, start: `${today.slice(0, 7)}-${String(start).padStart(2, "0")}`, end: `${today.slice(0, 7)}-${String(end).padStart(2, "0")}` };
  });
  payments.forEach((payment) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(new Date(payment.paymentDate));
    const amount = money(payment.amount);
    const day = daily.find((item) => item.key === date); if (day) day.actual += amount;
    const week = weekly.find((item) => date >= item.start && date <= item.end); if (week) week.actual += amount;
    const month = monthly.find((item) => date >= item.start && date <= item.end); if (month) month.actual += amount;
  });
  (students || []).forEach((student) => (student.installments || []).forEach((installment) => {
    const date = String(installment.dueDate || "").slice(0, 10); const amount = Math.max(money(installment.amount) - money(installment.amountPaid), 0); if (!date || !amount) return;
    const day = daily.find((item) => item.key === date); if (day) day.expected += amount;
    const week = weekly.find((item) => date >= item.start && date <= item.end); if (week) week.expected += amount;
    const month = monthly.find((item) => date >= item.start && date <= item.end); if (month) month.expected += amount;
  }));
  return { daily, weekly, monthly };
}

function paymentOverviewDate(value, options) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(new Date(String(value) + "T00:00:00Z"));
}

function buildAccuratePaymentOverview(today, payments, students) {
  const parts = toIstDateParts();
  const todayDate = new Date(String(today) + "T00:00:00Z");
  const monthKeyValue = monthKey(parts.year, parts.month);
  const monthStart = monthKeyValue + "-01";
  const monthEnd = monthKeyValue + "-" + String(new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate()).padStart(2, "0");
  const currentWeekStart = addDays(today, -todayDate.getUTCDay());
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(currentWeekStart, index);
    return { key: date, label: paymentOverviewDate(date, { weekday: "short" }), fullLabel: paymentOverviewDate(date, { weekday: "long", day: "numeric", month: "short" }), expected: 0, actual: 0 };
  });
  const weekly = [];
  let cursor = monthStart;
  let weekNumber = 1;
  while (cursor <= monthEnd) {
    const cursorDate = new Date(String(cursor) + "T00:00:00Z");
    const sunday = addDays(cursor, -cursorDate.getUTCDay());
    const saturday = addDays(sunday, 6);
    const start = cursor > sunday ? cursor : sunday;
    const end = monthEnd < saturday ? monthEnd : saturday;
    weekly.push({ key: monthKeyValue + "-" + weekNumber, label: "Week " + weekNumber, fullLabel: paymentOverviewDate(start, { day: "numeric", month: "short" }) + " – " + paymentOverviewDate(end, { day: "numeric", month: "short" }), expected: 0, actual: 0, start, end });
    cursor = addDays(end, 1);
    weekNumber += 1;
  }
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(parts.year, parts.month - 2 + index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = monthKey(year, month);
    const start = key + "-01";
    const end = key + "-" + String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");
    return { key, label: paymentOverviewDate(start, { month: "short" }), fullLabel: paymentOverviewDate(start, { month: "long", year: "numeric" }), expected: 0, actual: 0, start, end };
  });
  const paymentDate = (payment) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(new Date(payment.paymentDate));
  payments.forEach((payment) => {
    const date = paymentDate(payment);
    const amount = money(payment.amount);
    const day = daily.find((item) => item.key === date); if (day) day.actual += amount;
    const week = weekly.find((item) => date >= item.start && date <= item.end); if (week) week.actual += amount;
    const month = monthly.find((item) => date >= item.start && date <= item.end); if (month) month.actual += amount;
  });
  students.forEach((student) => (student.installments || []).forEach((installment) => {
    const date = String(installment.dueDate || "").slice(0, 10);
    const amount = money(installment.amount);
    if (!date || !amount) return;
    const day = daily.find((item) => item.key === date); if (day) day.expected += amount;
    const week = weekly.find((item) => date >= item.start && date <= item.end); if (week) week.expected += amount;
    const month = monthly.find((item) => date >= item.start && date <= item.end); if (month) month.expected += amount;
  }));
  return { daily, weekly, monthly };
}

function getPerformanceDateRange(options = {}) {
  const todayParts = toIstDateParts();
  const today = toDateStringFromParts(todayParts.year, todayParts.month, todayParts.day);
  const currentMonth = monthKey(todayParts.year, todayParts.month);
  const previous = previousMonth(todayParts.year, todayParts.month);
  const previousMonthKey = monthKey(previous.year, previous.month);
  const period = normalizeString(options.period).toLowerCase() || "thismonth";
  const monthStartForOffset = (offset) => {
    const date = new Date(Date.UTC(todayParts.year, todayParts.month - 1 + offset, 1));
    return monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1) + "-01";
  };
  const monthEndFor = (start) => {
    const [year, month] = start.slice(0, 7).split("-").map(Number);
    return monthKey(year, month) + "-" + String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");
  };
  if (period === "previousmonth") return { period, startDate: previousMonthKey + "-01", endDate: monthEndFor(previousMonthKey + "-01") };
  if (period === "last3months") return { period, startDate: monthStartForOffset(-2), endDate: today };
  if (period === "last6months") return { period, startDate: monthStartForOffset(-5), endDate: today };
  if (period === "thisyear") return { period, startDate: String(todayParts.year) + "-01-01", endDate: today };
  if (period === "customrange" && /^\d{4}-\d{2}-\d{2}$/.test(options.startDate || "") && /^\d{4}-\d{2}-\d{2}$/.test(options.endDate || "") && options.startDate <= options.endDate) {
    return { period, startDate: options.startDate, endDate: options.endDate };
  }
  return { period: "thismonth", startDate: currentMonth + "-01", endDate: today };
}

async function getSuperAdminOverview(branchId = null, performanceOptions = {}) {
  const requested = normalizeString(branchId);
  const branch = requested ? await prisma.branch.findFirst({ where: { OR: [{ id: requested }, { branchId: requested }], status: "ACTIVE" }, select: { id: true, branchId: true, branchName: true, branchCity: true, branchState: true, status: true } }) : null;
  if (requested && !branch) throw new AppError("Branch not found or inactive", 404);
  const branches = branch ? [branch] : await prisma.branch.findMany({ where: { status: "ACTIVE" }, orderBy: { branchName: "asc" }, select: { id: true, branchId: true, branchName: true, branchCity: true, branchState: true, status: true } });
  const branchIds = branches.map((item) => item.id);
  const students = branchIds.length ? await prisma.branchStudent.findMany({ where: { branchId: { in: branchIds }, recordStatus: "ACTIVE" }, select: { id: true, branchId: true, studentName: true, admissionDate: true, courseName: true, courseAmount: true, installments: { select: { amount: true, amountPaid: true, dueDate: true } }, payments: { select: { amount: true, paymentDate: true } }, calendarAttendanceRecords: { select: { attendanceDate: true, status: true } } } }) : [];
  const todayParts = toIstDateParts();
  const today = toDateStringFromParts(todayParts.year, todayParts.month, todayParts.day);
  const currentMonth = monthKey(todayParts.year, todayParts.month);
  const performanceRange = getPerformanceDateRange(performanceOptions);
  const previous = previousMonth(todayParts.year, todayParts.month);
  const admissionsByMonth = [previous, { year: todayParts.year, month: todayParts.month }].map((item) => ({ key: monthKey(item.year, item.month), label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(item.year, item.month - 1, 1))), value: students.filter((student) => dateIsInMonth(student.admissionDate, item.year, item.month)).length }));
  const payments = students.flatMap((student) => student.payments || []);
  const buckets = buildSuperAdminPaymentBuckets(today, payments, students);
  const paymentOverview = buildAccuratePaymentOverview(today, payments, students);
  const summary = { totalBranches: branches.length, totalStudents: students.length, thisMonthAdmissions: admissionsByMonth.at(-1).value, totalPayment: payments.reduce((sum, payment) => sum + money(payment.amount), 0), thisMonthPayment: payments.filter((payment) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(new Date(payment.paymentDate)).startsWith(currentMonth)).reduce((sum, payment) => sum + money(payment.amount), 0), totalOutstanding: 0, thisMonthDue: 0, todayDue: 0, yesterdayDue: 0, overdueAmount: 0, dueStudents: new Set(), todayCollection: 0, yesterdayCollection: 0 };
  const yesterday = addDays(today, -1);
  students.forEach((student) => {
    const paid = (student.installments || []).reduce((sum, item) => sum + money(item.amountPaid), 0);
    const planned = money(student.courseAmount) || (student.installments || []).reduce((sum, item) => sum + money(item.amount), 0);
    summary.totalOutstanding += Math.max(planned - paid, 0);
    (student.installments || []).forEach((installment) => {
      const due = String(installment.dueDate || "").slice(0, 10); const unpaid = Math.max(money(installment.amount) - money(installment.amountPaid), 0); if (!due || !unpaid) return;
      if (due.startsWith(currentMonth)) summary.thisMonthDue += unpaid;
      if (due === today) summary.todayDue += unpaid;
      if (due === yesterday) summary.yesterdayDue += unpaid;
      if (due < today) summary.overdueAmount += unpaid;
      if (due <= today) summary.dueStudents.add(student.id);
    });
  });
  payments.forEach((payment) => { const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(new Date(payment.paymentDate)); if (date === today) summary.todayCollection += money(payment.amount); if (date === yesterday) summary.yesterdayCollection += money(payment.amount); });
  const courseCounts = new Map();
  students.forEach((student) => {
    if (!dateIsInMonth(student.admissionDate, todayParts.year, todayParts.month)) return;
    const name = String(student.courseName || "").trim();
    if (name) courseCounts.set(name, (courseCounts.get(name) || 0) + 1);
  });
  const trendingCourseEntries = [...courseCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5);
  const topTrendingCount = trendingCourseEntries[0]?.[1] || 0;
  const trendingCourses = trendingCourseEntries.map(([courseName, admissionCount], index) => ({
    courseId: courseName,
    courseName,
    admissionCount,
    rank: index + 1,
    progress: topTrendingCount ? Math.round((admissionCount / topTrendingCount) * 100) : 0,
  }));
  const branchPerformance = branches.map((branchRecord) => {
    const branchStudents = students.filter((student) => student.branchId === branchRecord.id);
    const branchPayments = branchStudents.flatMap((student) => student.payments || []);
    const branchInstallments = branchStudents.flatMap((student) => student.installments || []);
    const branchAttendance = branchStudents.flatMap((student) => student.calendarAttendanceRecords || []).filter((record) => record.attendanceDate >= performanceRange.startDate && record.attendanceDate <= performanceRange.endDate);
    const due = branchInstallments.reduce((total, installment) => {
      const date = String(installment.dueDate || "").slice(0, 10);
      return date >= performanceRange.startDate && date <= performanceRange.endDate ? total + Math.max(money(installment.amount) - money(installment.amountPaid), 0) : total;
    }, 0);
    const outstanding = branchStudents.reduce((total, student) => {
      const planned = money(student.courseAmount) || (student.installments || []).reduce((sum, installment) => sum + money(installment.amount), 0);
      const paid = (student.installments || []).reduce((sum, installment) => sum + money(installment.amountPaid), 0);
      return total + Math.max(planned - paid, 0);
    }, 0);
    const present = branchAttendance.filter((record) => record.status === "PRESENT").length;
    const recorded = branchAttendance.filter((record) => record.status === "PRESENT" || record.status === "ABSENT").length;
    const collection = branchPayments.filter((payment) => { const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(new Date(payment.paymentDate)); return date >= performanceRange.startDate && date <= performanceRange.endDate; }).reduce((total, payment) => total + money(payment.amount), 0);
    const admissions = branchStudents.filter((student) => { const date = String(student.admissionDate || "").slice(0, 10); return date >= performanceRange.startDate && date <= performanceRange.endDate; }).length;
    return { branchId: branchRecord.branchId, branchName: branchRecord.branchName, totalStudents: branchStudents.length, thisMonthAdmissions: admissions, collection, due, outstanding, attendance: recorded ? Math.round((present / recorded) * 1000) / 10 : null, hasPeriodData: Boolean(admissions || collection || due || branchAttendance.length), courses: [...new Set(branchStudents.map((student) => String(student.courseName || "").trim()).filter(Boolean))] };
  });
  return { generatedAt: new Date().toISOString(), scope: branch ? { type: "branch", branchId: branch.branchId, branchName: branch.branchName } : { type: "all" }, ...summary, dueStudents: summary.dueStudents.size, paymentOverview, admissionsByMonth, dailyPaymentData: paymentOverview.daily, weeklyPaymentData: paymentOverview.weekly, monthlyPaymentChartData: paymentOverview.monthly, monthlyPaymentData: paymentOverview.monthly, trendingCourses, branchPerformance, branchPerformanceHasData: branchPerformance.some((item) => item.hasPeriodData), performancePeriod: performanceRange, trendingMonth: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "Asia/Calcutta" }).format(new Date()) };
}

export { getRevenueSummary, getFacultyMyBatchesSummary, getFacultyDashboardOverview, getSuperAdminOverview, invalidateRevenueSummaryCache };
