import crypto from "node:crypto";

import prismaClientPackage from "../../../prisma-client-v2/index.js";

const { Prisma } = prismaClientPackage;

import {
  scheduleContext,
  studentSchedule,
  syncStudentCourseEnd,
} from "../instituteLeave/instituteLeave.service.js";
import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import {
  sendStudentCredentialsEmail,
  sendStudentPaymentReceiptEmail,
  sendStudentPaymentDueEmail,
} from "../../common/services/resendEmail.js";
import {
  buildBranchEntityId,
  extractEntitySequence,
  getBranchPublicPrefix,
  normalizeBranchEntityId,
} from "../../common/utils/branchIdentifiers.js";
import {
  createFeeProgressAlertNotification,
  createNotification,
  notifySequentialCourseSchedulingForStudent,
} from "../notifications/notifications.service.js";
import { getAcademicTestProgressForStudent } from "../academicTests/academicTests.service.js";
import { calculateAdmissionFeeDetails } from "../salesAdmin/admissionFeeDetails.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const CURRENT_STATUSES = new Set(["House Holder", "College Student", "Fresher", "School", "Business", "Employee", "Other", "Custom", "Student", "Others"]);
const FORM_CURRENT_STATUSES = new Set(["House Holder", "College Student", "Fresher", "School", "Business", "Employee", "Other", "Custom"]);
const PURPOSES = new Set(["Project", "Internship", "Learning", "Job / Placement", "Up Skilling", "Career Change", "Certification", "Custom"]);
const PROGRESS_ALERT_TOLERANCE = 5;
const DUE_REMINDER_WINDOW_DAYS = 7;
const DUE_REMINDER_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function normalizeString(value) {
  return String(value ?? "").trim();
}

const DISCOUNT_TYPES = new Set(["FIXED", "PERCENTAGE"]);

function calculateCourseDiscount(totalCourseAmount, discountType, discountValue) {
  const total = Number(String(totalCourseAmount ?? 0).replace(/,/g, ""));
  const value = discountValue === undefined || discountValue === null || discountValue === ""
    ? 0
    : Number(String(discountValue).replace(/,/g, ""));
  const type = normalizeString(discountType || "FIXED").toUpperCase() || "FIXED";
  if (!Number.isFinite(total) || total < 0) throw new AppError("Total course amount must be zero or greater", 400);
  if (!DISCOUNT_TYPES.has(type)) throw new AppError("Discount type must be FIXED or PERCENTAGE", 400);
  if (!Number.isFinite(value) || value < 0) throw new AppError("Discount value must be zero or greater", 400);
  if (type === "PERCENTAGE" && value > 100) throw new AppError("Percentage discount must be between 0 and 100", 400);
  if (type === "FIXED" && value > total) throw new AppError("Fixed discount cannot exceed the course amount", 400);
  const discountAmount = type === "PERCENTAGE" ? total * value / 100 : value;
  const roundedDiscount = Math.round(discountAmount * 100) / 100;
  return {
    discountType: type,
    discountValue: value,
    totalCourseAmount: Math.round(total),
    discountAmount: roundedDiscount,
    finalCourseAmount: Math.max(Math.round((total - roundedDiscount) * 100) / 100, 0),
  };
}

async function notifyStudentCourseDiscount({ enrollments = [], student = {}, branch = {}, actorId = null, prismaClient = prisma } = {}) {
  const discountedCourses = (Array.isArray(enrollments) ? enrollments : []).filter((item) => Number(item?.discountAmount) > 0);
  if (!discountedCourses.length) return null;

  const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const firstDiscount = discountedCourses[0];
  const hasCommonDiscount = discountedCourses.length > 1
    && discountedCourses.every((item) => item.discountType === firstDiscount.discountType);
  const commonDiscountValue = discountedCourses.reduce((sum, item) => sum + Number(item.discountValue || 0), 0);
  const commonDiscountLabel = firstDiscount.discountType === "PERCENTAGE"
    ? `${commonDiscountValue}% total (${discountedCourses.map((item) => `${item.discountValue}%`).join(" + ")} split)`
    : `${formatMoney(commonDiscountValue)} total (${discountedCourses.map((item) => formatMoney(item.discountValue)).join(" + ")} split)`;
  const firstDiscountLabel = firstDiscount.discountType === "PERCENTAGE"
    ? `${firstDiscount.discountValue}%`
    : `${formatMoney(firstDiscount.discountValue)} fixed amount`;
  const message = [
    hasCommonDiscount
      ? `A common ${commonDiscountLabel} course-fee discount was applied across ${discountedCourses.length} courses.`
      : `A ${discountedCourses.length > 1 ? "course fee discount has been provided" : `${firstDiscountLabel} course fee discount has been provided`} to the following student for the selected course${discountedCourses.length > 1 ? "s" : ""}.`,
    "",
    `Branch: ${branch.branchName || branch.branchId || branch.id || "-"}`,
    `Student: ${student.studentName || student.name || "-"}`,
    ...discountedCourses.flatMap((item, index) => [
      "",
      `${discountedCourses.length > 1 ? `Course ${index + 1}: ` : "Course: "}${item.courseName || item.courseId}`,
      `Original Course Amount: ${formatMoney(item.totalCourseAmount)}`,
      `Discount: ${item.discountType === "PERCENTAGE" ? `${item.discountValue}%` : `${formatMoney(item.discountValue)} (Fixed Amount)`}`,
      `Discount Amount: ${formatMoney(item.discountAmount)}`,
      `Final Course Amount: ${formatMoney(item.finalCourseAmount)}`,
      "",
      `Information: The student has been provided a ${formatMoney(item.discountAmount)} discount, reducing the course fee from ${formatMoney(item.totalCourseAmount)} to ${formatMoney(item.finalCourseAmount)}.`,
    ]),
  ].join("\n");

  return createNotification({
    kind: "STUDENT_DISCOUNT_APPLIED",
    tone: "amber",
    title: "Student Course Discount Information",
    message,
    actionLabel: "View Student",
    targetBranchId: branch.id || branch.branchId || null,
    targetBranchEmail: branch.branchEmail || null,
    targetBranchName: branch.branchName || null,
    createdBy: actorId,
  }, prismaClient);
}

function getCurrentMonthDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    start: format(new Date(year, month, 1)),
    end: format(new Date(year, month + 1, 0)),
  };
}

function normalizeSearchKey(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, " ");
}

function parseRequiredText(value, fieldName) {
  const text = normalizeString(value);
  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return text;
}

function parseOptionalText(value) {
  const text = normalizeString(value);
  return text ? text : null;
}

function parseOptionalUrl(value) {
  const text = normalizeString(value);
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid URL protocol");
    }
    return url.toString();
  } catch {
    throw new AppError("LinkedIn URL must be a valid http or https URL", 400);
  }
}

function parseEmail(value) {
  const email = parseRequiredText(value, "Email address").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Enter a valid email address", 400);
  }
  return email;
}

function parsePhone(value, fieldName = "Mobile number") {
  const phone = parseRequiredText(value, fieldName);
  if (!/^\d{10}$/.test(phone)) {
    throw new AppError(`${fieldName} must be a 10-digit number`, 400);
  }
  return phone;
}

function parseStatus(value) {
  const status = normalizeString(value).toUpperCase() || "ACTIVE";
  if (!RECORD_STATUSES.has(status)) {
    throw new AppError("Invalid status", 400);
  }
  return status;
}

function parseCurrentStatus(value) {
  const text = normalizeString(value);
  if (!CURRENT_STATUSES.has(text)) {
    throw new AppError("Invalid current status", 400);
  }
  return text;
}

function parseFormCurrentStatus(value, allowLegacy = false) {
  const text = normalizeString(value);
  if (allowLegacy && (text === "Student" || text === "Others")) return text;
  if (!FORM_CURRENT_STATUSES.has(text)) throw new AppError("Invalid current status", 400);
  return text;
}

function parseOptionalYear(value, fieldName = "Passed out year") {
  const text = parseOptionalText(value);
  if (!text) return null;
  if (!/^\d{4}$/.test(text) || Number(text) < 1950 || Number(text) > new Date().getFullYear() + 10) {
    throw new AppError(`${fieldName} must be a valid year`, 400);
  }
  return text;
}

function parseDateString(value, fieldName) {
  const text = parseRequiredText(value, fieldName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError(`${fieldName} must be in YYYY-MM-DD format`, 400);
  }
  return text;
}

function parseOptionalProgress(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError("Course progress must be a number", 400);
  }

  if (parsed < 0 || parsed > 100) {
    throw new AppError("Course progress must be between 0 and 100", 400);
  }

  return Math.round(parsed);
}

const FEE_SCHEDULE_MODES = new Set([
  "MONTHLY_FIXED_DATE",
  "BEFORE_70_PERCENT",
  "CUSTOM_DATES",
]);

function normalizeFeeScheduleMode(value) {
  const mode = normalizeString(value || "BEFORE_70_PERCENT").toUpperCase();
  if (!FEE_SCHEDULE_MODES.has(mode)) {
    throw new AppError("Invalid fee schedule mode", 400);
  }
  return mode;
}

function validIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizeString(value));
}

function addDaysToIsoDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function addMonthsToIsoDate(value, months) {
  const source = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(source.getTime())) return "";

  const day = source.getUTCDate();
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + Number(months || 0), 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function dateDistanceInDays(start, end) {
  return Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
}

function distributeFeeDueDates(firstDate, deadline, count) {
  const safeCount = Math.max(1, Number(count) || 1);
  if (!validIsoDate(firstDate) || !validIsoDate(deadline) || firstDate > deadline) {
    throw new AppError("First payment date must be on or before the 70% payment deadline", 400);
  }

  if (safeCount === 1) return [firstDate];

  // Prefer the normal monthly cadence. The 70% date is a cutoff, not a
  // mandatory due date, so a two-installment plan should be first month plus
  // the following month whenever that date is still within the cutoff.
  const monthlyDates = Array.from({ length: safeCount }, (_, index) => addMonthsToIsoDate(firstDate, index));
  if (monthlyDates.every((date) => validIsoDate(date) && date <= deadline)) {
    return monthlyDates;
  }

  const finalDueDate = addDaysToIsoDate(deadline, -1) > firstDate
    ? addDaysToIsoDate(deadline, -1)
    : deadline;
  const compressedWindowDays = dateDistanceInDays(firstDate, finalDueDate);
  return Array.from({ length: safeCount }, (_, index) => {
    const offset = Math.round((compressedWindowDays * index) / (safeCount - 1));
    return addDaysToIsoDate(firstDate, offset);
  });
}

export function calculateBranchStudentFeeComplianceStatus(student = {}) {
  const directTotal = Number(String(
    student.courseAmount ?? student.totalAmount ?? student.afterDiscount ?? 0,
  ).replace(/,/g, "")) || 0;
  const installmentTotal = Array.isArray(student.installments)
    ? student.installments.reduce((sum, installment) => sum + Number(installment.amount || 0), 0)
    : 0;
  const totalFee = directTotal > 0 ? directTotal : installmentTotal;
  const paidAmount = Array.isArray(student.payments)
    ? student.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    : Array.isArray(student.installments)
      ? student.installments.reduce((sum, installment) => sum + Number(installment.amountPaid || 0), 0)
      : 0;
  const courseProgress = Number(student.courseProgress || 0);
  const deadline = normalizeString(student.feePaymentDeadline || student.fee70ProgressDate);

  if (totalFee <= 0 || !deadline) return "PENDING";
  if (paidAmount >= totalFee && courseProgress > 70) return "PAID_AFTER_70";
  if (paidAmount >= totalFee) return "FULLY_PAID";
  if (courseProgress >= 70) return "FEE_PENDING_BEFORE_70";
  if (courseProgress >= 60) return "PAYMENT_DUE";
  return "ON_TRACK";
}

async function calculateStudentFeeDeadline(studentInput, branchId, db = prisma) {
  const student = {
    ...studentInput,
    branchId,
    course: studentInput.course || null,
    calendarAttendanceRecords: studentInput.calendarAttendanceRecords || [],
  };

  const context = await scheduleContext(db, branchId);
  const matchingBatch = context.batches.find((batch) => (
    [batch.batchId, batch.id].includes(student.batchId) &&
    (!student.courseId || [batch.courseId, batch.branchCourseId].includes(student.courseId))
  ));

  // Batch assignment is the source of truth for the calendar. Older student
  // rows can have a stale faculty/course reference, so hydrate those values
  // from the selected batch before calculating the deadline.
  if (matchingBatch) {
    student.courseId = student.courseId || matchingBatch.courseId || matchingBatch.branchCourseId;
    student.facultyId = matchingBatch.facultyId || matchingBatch.branchFacultyId || student.facultyId;
    student.batchId = matchingBatch.batchId || matchingBatch.id;
    student.batchName = student.batchName || matchingBatch.batchName;
    student.batchTiming = student.batchTiming || matchingBatch.batchTiming;
    student.course = student.course || matchingBatch.branchCourse || null;
    student.courseStartDate = student.courseStartDate || matchingBatch.courseStartDate;
    student.weeklyOffDay = student.weeklyOffDay || matchingBatch.weeklyOffDay;
  }

  if (!student.courseId || !student.batchId || !student.facultyId) return null;

  let schedule;
  try {
    schedule = studentSchedule(student, context);
  } catch (error) {
    throw new AppError(`Unable to calculate the 70% payment deadline: ${error.message}`, 400);
  }

  const targetHours = Number((Number(schedule.totalHours || 0) * 0.7).toFixed(2));
  if (!(targetHours > 0)) return null;

  let accumulatedHours = 0;
  let progressDate = schedule.endDate;
  for (const event of schedule.events || []) {
    accumulatedHours += Number(event.classHours || 0);
    if (accumulatedHours + 0.000001 >= targetHours) {
      progressDate = event.date;
      break;
    }
  }

  return {
    targetHours,
    progressDate,
    scheduleMode: normalizeFeeScheduleMode(studentInput.feeScheduleMode),
  };
}

async function buildStudentFeePlan({ studentData, installmentSchedule, payload, branchId, course, existingStudent = null }) {
  // The student flow uses one authoritative schedule: full fee due by 70%
  // of the actual batch calendar. Keep legacy mode values from changing it.
  const scheduleMode = "BEFORE_70_PERCENT";
  const firstPaymentDate = normalizeString(
    payload?.feeFirstPaymentDate || payload?.firstPaymentDate || existingStudent?.feeFirstPaymentDate || studentData.admissionDate,
  );
  const deadline = await calculateStudentFeeDeadline(
    { ...studentData, ...existingStudent, course, feeScheduleMode: scheduleMode },
    branchId,
  );
  const feeFields = {
    feeScheduleMode: scheduleMode,
    feeFirstPaymentDate: firstPaymentDate,
    fee70ProgressDate: deadline?.progressDate || existingStudent?.fee70ProgressDate || null,
    fee70TargetHours: deadline?.targetHours || existingStudent?.fee70TargetHours || null,
    feePaymentDeadline: deadline?.progressDate || existingStudent?.feePaymentDeadline || null,
  };

  if (scheduleMode === "BEFORE_70_PERCENT" && !deadline?.progressDate) {
    throw new AppError("Unable to calculate the 70% payment deadline from the selected batch calendar", 400);
  }

  if (!installmentSchedule.length) {
    return {
      schedule: installmentSchedule,
      fields: { ...feeFields, feeComplianceStatus: calculateBranchStudentFeeComplianceStatus({ ...studentData, ...feeFields, installments: installmentSchedule }) },
    };
  }

  const courseEnrollmentInput = getCourseEnrollmentInput(payload);
  const isSequentialPackage = normalizeString(payload?.arrangementType || payload?.enrollmentType).toUpperCase() === "SEQUENTIAL";
  const billableEnrollments = Array.isArray(courseEnrollmentInput)
    ? (isSequentialPackage
      ? courseEnrollmentInput.filter((enrollment) => normalizeString(enrollment?.status).toUpperCase() !== "PENDING")
      : courseEnrollmentInput)
    : [];
  const enrollmentCourseFee = Array.isArray(courseEnrollmentInput) && billableEnrollments.length
    ? billableEnrollments.reduce((sum, enrollment) => {
        const total = Number(String(enrollment?.totalCourseAmount ?? enrollment?.courseAmount ?? enrollment?.totalAmount ?? 0).replace(/,/g, "")) || 0;
        return sum + calculateCourseDiscount(
          total,
          enrollment?.discountType,
          enrollment?.discountValue ?? enrollment?.studentDiscountAmount ?? 0,
        ).finalCourseAmount;
      }, 0)
    : 0;
  const totalFee = enrollmentCourseFee > 0
    ? enrollmentCourseFee
    : Number(String(
        studentData.finalCourseAmount ?? studentData.totalAmount ?? studentData.afterDiscount ?? studentData.courseAmount ?? 0,
      ).replace(/,/g, "")) || 0;

  // Sequential students share one installment ledger, but every active course
  // contributes its own configured installment plan. Rebuild the amounts from
  // those course plans on activation/edit so a stale or course-only frontend
  // schedule cannot fail the package-total validation (or charge one course
  // twice). Keep the supplied due dates and existing payment statuses.
  if (
    isSequentialPackage
    && payload?.preserveInstallmentDates === true
    && payload?.sequentialCourseActivation === true
    && Array.isArray(courseEnrollmentInput)
  ) {
    const activeEnrollments = [...billableEnrollments]
      .sort((left, right) => Number(left?.sequenceOrder || 0) - Number(right?.sequenceOrder || 0));
    const courseIds = activeEnrollments.map((enrollment) => normalizeString(enrollment?.courseId)).filter(Boolean);
    const courseRecords = courseIds.length
      ? await prisma.branchCourse.findMany({
          where: { branchId, id: { in: courseIds } },
          select: { id: true, paymentPlans: true, paymentPlanSelections: true },
        })
      : [];
    const courseById = new Map(courseRecords.map((record) => [String(record.id), record]));
    const persistedInstallments = Array.isArray(existingStudent?.installments)
      ? [...existingStudent.installments].sort((left, right) => Number(left.installmentNumber) - Number(right.installmentNumber))
      : [];
    const enrollmentPlans = activeEnrollments.map((enrollment, enrollmentIndex) => {
      const courseRecord = courseById.get(normalizeString(enrollment?.courseId));
      const configuredPlans = Array.isArray(courseRecord?.paymentPlans)
        ? courseRecord.paymentPlans
        : Array.isArray(courseRecord?.paymentPlanSelections)
          ? courseRecord.paymentPlanSelections
          : [];
      const paymentPlanId = enrollment?.paymentPlanId
        || (enrollmentIndex === 0 ? payload?.paymentPlanId || existingStudent?.paymentPlanId : "");
      const selectedPlan = configuredPlans.find((plan) => [plan?.id, plan?.templateId, plan?.paymentPlanId]
        .some((id) => normalizeString(id) === normalizeString(paymentPlanId)));
      const planRows = Array.isArray(selectedPlan?.installments) ? selectedPlan.installments : [];
      const count = Math.max(0, Number(selectedPlan?.installmentCount || planRows.length || 0));
      const grossAmount = Number(String(enrollment?.totalCourseAmount ?? enrollment?.courseAmount ?? enrollment?.totalAmount ?? 0).replace(/,/g, "")) || 0;
      const courseFee = calculateCourseDiscount(
        grossAmount,
        enrollment?.discountType,
        enrollment?.discountValue ?? enrollment?.studentDiscountAmount ?? 0,
      ).finalCourseAmount;
      return { count, courseFee };
    });
    const expectedInstallmentCount = enrollmentPlans.reduce((sum, item) => sum + item.count, 0);
    const incomingScheduleOffset = Math.max(0, expectedInstallmentCount - installmentSchedule.length);
    const normalizedSchedule = [];
    let canNormalizeSchedule = activeEnrollments.length > 0;

    for (const { count, courseFee } of enrollmentPlans) {

      if (!count || !(courseFee >= 0)) {
        canNormalizeSchedule = false;
        break;
      }

      const installmentCourseFee = Math.round(courseFee);
      let balancedAmount = Math.round((installmentCourseFee / count) / 1000) * 1000;
      while (balancedAmount > 0 && balancedAmount * (count - 1) > installmentCourseFee) balancedAmount -= 1000;
      const balancedAmounts = [
        ...Array.from({ length: count - 1 }, () => balancedAmount),
        installmentCourseFee - balancedAmount * (count - 1),
      ];
      for (let index = 0; index < count; index += 1) {
        const installmentIndex = normalizedSchedule.length;
        const incomingIndex = installmentIndex - incomingScheduleOffset;
        const incoming = incomingIndex >= 0 ? installmentSchedule[incomingIndex] || {} : {};
        const persisted = persistedInstallments[installmentIndex] || {};
        // Apply the rounded split consistently to every active sequential course
        // (including Course 1); retain its dates and existing payment state.
        const amount = balancedAmounts[index];
        normalizedSchedule.push({
          ...incoming,
          installmentNumber: installmentIndex + 1,
          amount,
          dueDate: incoming.dueDate || persisted.dueDate || null,
          status: persisted.status || incoming.status || "Pending",
          paymentMethod: persisted.paymentMethod || incoming.paymentMethod || null,
          remarks: incoming.remarks || persisted.remarks || null,
          paidAt: persisted.paidAt || incoming.paidAt || null,
        });
      }
    }

    if (canNormalizeSchedule && normalizedSchedule.length) {
      installmentSchedule = normalizedSchedule;
    }
  }

  // BranchStudent.courseAmount is the package fee used by the shared installment
  // schedule. Each individual fee remains on its BranchStudentCourse enrollment.
  if (enrollmentCourseFee > 0) studentData.courseAmount = Math.round(enrollmentCourseFee);
  const scheduledTotal = installmentSchedule.reduce((sum, installment) => sum + Number(installment.amount || 0), 0);
  const expectedScheduledTotal = payload?.sequentialCourseActivation === true ? Math.round(totalFee) : totalFee;
  if (totalFee > 0 && Math.abs(scheduledTotal - expectedScheduledTotal) > 0.01) {
    throw new AppError("Installment amounts must equal the total course fee", 400);
  }

  if (scheduleMode === "MONTHLY_FIXED_DATE") {
    const schedule = installmentSchedule.map((installment, index) => ({
      ...installment,
      dueDate: addMonthsToIsoDate(firstPaymentDate, index),
    }));
    return {
      schedule,
      fields: {
        ...feeFields,
        feeComplianceStatus: calculateBranchStudentFeeComplianceStatus({ ...studentData, ...feeFields, installments: schedule }),
      },
    };
  }

  if (!deadline?.progressDate || scheduleMode === "CUSTOM_DATES") {
    return {
      schedule: installmentSchedule,
      fields: { ...feeFields, feeComplianceStatus: calculateBranchStudentFeeComplianceStatus({ ...studentData, ...feeFields, installments: installmentSchedule }) },
    };
  }

  if (payload?.preserveInstallmentDates === true) {
    const allowCourseSpecificDates = payload?.sequentialCourseActivation === true;
    const invalidInstallment = installmentSchedule.find((installment) => {
      const dueDate = normalizeString(installment.dueDate);
      return !validIsoDate(dueDate) || (!allowCourseSpecificDates && dueDate > deadline.progressDate);
    });
    if (invalidInstallment) {
      throw new AppError(allowCourseSpecificDates
        ? "Each installment must have a valid course-specific due date"
        : "Each installment date must be on or before the 70% payment deadline", 400);
    }
    return {
      schedule: installmentSchedule,
      fields: {
        ...feeFields,
        feeComplianceStatus: calculateBranchStudentFeeComplianceStatus({ ...studentData, ...feeFields, installments: installmentSchedule }),
      },
    };
  }

  const generatedDates = distributeFeeDueDates(firstPaymentDate, deadline.progressDate, installmentSchedule.length);
  const schedule = installmentSchedule.map((installment, index) => ({
    ...installment,
    dueDate: generatedDates[index],
  }));

  return {
    schedule,
    fields: {
      ...feeFields,
      feeComplianceStatus: calculateBranchStudentFeeComplianceStatus({ ...studentData, ...feeFields, installments: schedule }),
    },
  };
}

async function replaceStudentInstallmentSchedule(tx, studentId, schedule, existingInstallments = []) {
  const existingByNumber = new Map(
    existingInstallments.map((installment) => [Number(installment.installmentNumber), installment]),
  );
  const incomingNumbers = new Set(schedule.map((installment) => Number(installment.installmentNumber)));

  for (const installment of schedule) {
    const number = Number(installment.installmentNumber);
    const existing = existingByNumber.get(number);
    if (existing) {
      const amountPaid = Number(existing.amountPaid || 0);
      const amount = Number(installment.amount || 0);
      const status = amountPaid >= amount ? "Paid" : amountPaid > 0 ? "Partially Paid" : installment.status || "Pending";
      await tx.branchStudentInstallment.update({
        where: { id: existing.id },
        data: {
          amount,
          dueDate: installment.dueDate || null,
          status,
          amountPaid,
          paidAt: status === "Paid" ? existing.paidAt || new Date() : existing.paidAt,
          paymentMethod: existing.paymentMethod || installment.paymentMethod || null,
          remarks: installment.remarks || existing.remarks || null,
        },
      });
      continue;
    }

    await tx.branchStudentInstallment.create({
      data: {
        ...installment,
        branchStudentId: studentId,
      },
    });
  }

  for (const existing of existingInstallments) {
    if (incomingNumbers.has(Number(existing.installmentNumber)) || Number(existing.amountPaid || 0) > 0) continue;
    await tx.branchStudentInstallment.delete({ where: { id: existing.id } });
  }
}

function parsePage(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseLimit(value) {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 100);
}

function parseSortOrder(value, defaultOrder = "desc") {
  const order = normalizeString(value).toLowerCase();
  return order === "asc" || order === "desc" ? order : defaultOrder;
}

function buildPagination({ page, limit }) {
  const safePage = parsePage(page);
  const safeLimit = parseLimit(limit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function displayStatus(value) {
  switch (value) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    default:
      return value;
  }
}

function courseStatusFromProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress) || progress <= 0) return "NOT_STARTED";
  if (progress >= 100) return "COMPLETED";
  return "IN_PROGRESS";
}

export function calculateCoursePaidProgress(student = {}, courseId = null) {
  const normalizedCourseId = normalizeString(courseId);
  const enrollment = normalizedCourseId
    ? (student.courseEnrollments || []).find((item) => normalizeString(item?.courseId) === normalizedCourseId)
    : null;
  const totalAmount = Number(String(
    enrollment?.finalCourseAmount
      ?? enrollment?.totalCourseAmount
      ?? (normalizedCourseId ? 0 : student.courseAmount ?? student.totalAmount ?? student.afterDiscount ?? 0),
  ).replace(/,/g, "")) || 0;
  const installments = Array.isArray(student.installments) ? student.installments : [];
  const paidAmount = installments.reduce((sum, installment) => {
    const amount = Math.max(0, Number(installment?.amount || 0));
    const paid = Math.max(0, Number(installment?.amountPaid || 0));
    return sum + Math.min(amount || paid, paid);
  }, 0);

  return {
    totalAmount,
    paidAmount,
    percentage: totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0,
  };
}

export function courseCompletionFromProgressAndTests(courseProgress, academicTestProgress) {
  const isCourseProgressCompleted = Number(courseProgress) >= 100;
  const hasAcademicRequirements = Boolean(academicTestProgress) && (
    Number(academicTestProgress.totalTests || 0) > 0 ||
    Number(academicTestProgress.totalProjects || 0) > 0
  );
  const areAllAcademicTestsCompleted = Number(academicTestProgress?.pendingTests || 0) === 0;
  const areAllProjectsCompleted = Number(academicTestProgress?.pendingProjects || 0) === 0;
  // Payment is tracked independently. Learning completion depends only on the
  // course work and academic tests for this specific enrollment.
  return isCourseProgressCompleted && hasAcademicRequirements && academicTestProgress?.academicComplete === true && areAllAcademicTestsCompleted && areAllProjectsCompleted
    ? "COMPLETED"
    : "IN_PROGRESS";
}

async function academicReportsFullySentForBatch(batchId, batchCycleId = null, cache = new Map()) {
  const key = `${normalizeString(batchId).toLowerCase()}:${normalizeString(batchCycleId).toLowerCase()}`;
  if (!key) return false;
  if (cache.has(key)) return cache.get(key);
  const promise = (async () => {
    const batch = await prisma.branchBatch.findFirst({
      where: { OR: [{ id: batchId }, { batchId }] },
      select: { id: true },
    });
    if (!batch) return false;
    const [schedules, shares] = await Promise.all([
      prisma.academicScheduledTest.findMany({
        where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" }, ...(batchCycleId ? { cycle: { batchCycleId } } : {}) },
        select: { id: true },
      }),
      prisma.facultyReportShare.findMany({
        where: { batchId: batch.id, reportType: "ACADEMIC_TEST", status: "SENT", ...(batchCycleId ? { OR: [{ batchCycleId }, { batchCycleId: null }] } : {}) },
        select: { academicTestIds: true },
      }),
    ]);
    const sentIds = new Set(shares.flatMap((share) => Array.isArray(share.academicTestIds) ? share.academicTestIds : []).filter(Boolean));
    return schedules.length > 0 && schedules.every((schedule) => sentIds.has(schedule.id));
  })().catch(() => false);
  cache.set(key, promise);
  return promise;
}

function addCourseLifecycleFilter(where, value) {
  const lifecycle = normalizeString(value).toUpperCase();
  if (!lifecycle) return;

  const condition = lifecycle === "COMPLETED"
    ? { courseProgress: { gte: 100 } }
    : lifecycle === "ACTIVE" || lifecycle === "IN_PROGRESS"
      ? { OR: [{ courseProgress: null }, { courseProgress: { lt: 100 } }] }
      : null;

  if (!condition) return;
  where.AND = [...(Array.isArray(where.AND) ? where.AND : []), condition];
}

function normalizeStudentId(value) {
  return normalizeString(value).toUpperCase();
}

function generateStudentIdFromSequence(sequenceNumber, branchId) {
  return buildBranchEntityId(branchId, "STU", sequenceNumber);
}

async function generateNextStudentId(branchId) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { branchId: true } });
  const [branchStudents, loginUsers] = await Promise.all([
    prisma.branchStudent.findMany({
      where: { branchId },
      select: { studentId: true },
    }),
    branch?.branchId
      ? prisma.user.findMany({
          where: {
            userCode: {
              startsWith: `${getBranchPublicPrefix(branch.branchId)}STU`,
            },
          },
          select: { userCode: true },
        })
      : [],
  ]);

  let highest = 0;

  branchStudents.forEach((record) => {
    const numeric = extractEntitySequence(record.studentId, branch.branchId, "STU");
    if (Number.isInteger(numeric) && numeric > highest) {
      highest = numeric;
    }
  });

  loginUsers.forEach((user) => {
    const numeric = extractEntitySequence(user.userCode, branch.branchId, "STU");
    if (Number.isInteger(numeric) && numeric > highest) {
      highest = numeric;
    }
  });

  return generateStudentIdFromSequence(highest + 1, branch.branchId);
}

async function isStudentIdTaken(branchId, studentId) {
  const normalizedStudentId = normalizeStudentId(studentId);

  if (!normalizedStudentId) {
    return false;
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { branchId: true },
  });

  const branchUserCode = branch?.branchId
    ? buildBranchStudentUserCode(branch.branchId, normalizedStudentId)
    : normalizedStudentId;

  const [branchStudent, loginUser] = await Promise.all([
    prisma.branchStudent.findFirst({
      where: {
        branchId,
        studentId: normalizedStudentId,
      },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: {
        OR: [
          { userCode: normalizedStudentId },
          { userCode: branchUserCode },
        ],
      },
      select: { id: true },
    }),
  ]);

  return Boolean(branchStudent || loginUser);
}

async function generateUniqueStudentId(branchId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = await generateNextStudentId(branchId);
    // eslint-disable-next-line no-await-in-loop
    if (!(await isStudentIdTaken(branchId, candidate))) {
      return candidate;
    }
  }

  throw new AppError("Unable to generate unique student ID", 500);
}

function calculateFeeProgressSnapshot(student = {}) {
  const installments = Array.isArray(student.installments) ? student.installments : [];
  const normalizedInstallments = installments
    .map((installment, index) => ({
      installmentNumber: Number(installment?.installmentNumber || index + 1) || index + 1,
      amount: Number(String(installment?.amount ?? 0).replace(/,/g, "")) || 0,
      amountPaid: Number(String(installment?.amountPaid ?? 0).replace(/,/g, "")) || 0,
      dueDate: normalizeString(installment?.dueDate),
      status: normalizeString(installment?.status || "Pending"),
      dueReminderSentAt: installment?.dueReminderSentAt ? new Date(installment.dueReminderSentAt) : null,
      id: installment?.id || null,
    }))
    .sort((left, right) => left.installmentNumber - right.installmentNumber);

  const totalAmount = normalizedInstallments.length
    ? normalizedInstallments.reduce((sum, installment) => sum + installment.amount, 0)
    : Number(String(student.courseAmount ?? student.totalAmount ?? 0).replace(/,/g, "")) || 0;

  const paidAmount = normalizedInstallments.length
    ? normalizedInstallments.reduce((sum, installment) => sum + Math.min(installment.amountPaid, installment.amount), 0)
    : 0;

  const feeProgress = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const nextInstallment = normalizedInstallments.find((installment) => installment.amountPaid < installment.amount) || null;
  const dueAmount = nextInstallment ? Math.max(nextInstallment.amount - nextInstallment.amountPaid, 0) : 0;

  return {
    totalAmount,
    paidAmount,
    feeProgress,
    nextInstallment,
    dueAmount,
  };
}

function buildLedgerDate(value, fallback = new Date()) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date(fallback) : new Date(value);
  }

  const text = normalizeString(value);
  if (!text) {
    return new Date(fallback);
  }

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const asDateOnly = new Date(`${text}T00:00:00`);
  if (!Number.isNaN(asDateOnly.getTime())) {
    return asDateOnly;
  }

  return new Date(fallback);
}

function buildBranchStudentLedgerKey(studentId, suffix) {
  return `${normalizeString(studentId)}:${normalizeString(suffix)}`;
}

function resolveBranchStudentLedgerCourseAmount(student = {}) {
  const courseAmount = Number(student.courseAmount ?? 0);
  if (Number.isFinite(courseAmount) && courseAmount > 0) {
    return Math.round(courseAmount);
  }

  const installmentTotal = Array.isArray(student.installments)
    ? student.installments.reduce((sum, installment) => {
      const amount = Number(installment?.amount ?? 0);
      return Number.isFinite(amount) ? sum + Math.max(amount, 0) : sum;
    }, 0)
    : 0;

  return installmentTotal > 0 ? Math.round(installmentTotal) : 0;
}

function normalizeBranchStudentLedgerDescription(payment = {}) {
  const payAgainst = normalizeString(payment.payAgainst);
  if (payAgainst) {
    return payAgainst;
  }

  const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);
  if (Number.isFinite(installmentNumber) && installmentNumber > 0) {
    return `Installment ${installmentNumber}`;
  }

  return "Payment";
}

function sortBranchStudentLedgerEntries(entries = []) {
  return [...entries].sort((left, right) => {
    const leftDate = buildLedgerDate(left.entryDate || left.paymentDate || left.createdAt || left.updatedAt || left.createdAt);
    const rightDate = buildLedgerDate(right.entryDate || right.paymentDate || right.createdAt || right.updatedAt || right.createdAt);

    const leftTime = leftDate.getTime();
    const rightTime = rightDate.getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    const leftPriority = String(left.entryType || "").toUpperCase() === "DEBIT" ? 0 : 1;
    const rightPriority = String(right.entryType || "").toUpperCase() === "DEBIT" ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return String(left.ledgerKey || left.id || "").localeCompare(String(right.ledgerKey || right.id || ""));
  });
}

const BRANCH_STUDENT_LEDGER_TABLE = Prisma.raw('"BranchStudentLedgerEntry"');

async function fetchBranchStudentLedgerRows(db, branchStudentId) {
  return db.$queryRaw(Prisma.sql`
    SELECT *
    FROM ${BRANCH_STUDENT_LEDGER_TABLE}
    WHERE "branchStudentId" = ${branchStudentId}
    ORDER BY "entryDate" ASC NULLS LAST, "createdAt" ASC, "ledgerKey" ASC
  `);
}

async function upsertBranchStudentLedgerEntry(db, data = {}) {
  const now = new Date();
  await db.$executeRaw(Prisma.sql`
    INSERT INTO ${BRANCH_STUDENT_LEDGER_TABLE} (
      "id",
      "ledgerKey",
      "branchId",
      "branchStudentId",
      "paymentId",
      "installmentId",
      "entryNo",
      "entryType",
      "description",
      "debit",
      "credit",
      "amount",
      "runningBalance",
      "studentBalanceAfter",
      "entryDate",
      "paymentDate",
      "referenceType",
      "referenceId",
      "paymentMode",
      "receiptNumber",
      "payAgainst",
      "transactionReference",
      "notes",
      "createdBy",
      "updatedBy",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${normalizeString(data.id) || crypto.randomUUID()},
      ${normalizeString(data.ledgerKey)},
      ${normalizeString(data.branchId)},
      ${normalizeString(data.branchStudentId)},
      ${data.paymentId ?? null},
      ${data.installmentId ?? null},
      ${Number(data.entryNo ?? 0)},
      ${normalizeString(data.entryType)},
      ${normalizeString(data.description)},
      ${Number(data.debit ?? 0)},
      ${Number(data.credit ?? 0)},
      ${Number(data.amount ?? 0)},
      ${Number(data.runningBalance ?? 0)},
      ${Number(data.studentBalanceAfter ?? 0)},
      ${data.entryDate ?? null},
      ${data.paymentDate ?? null},
      ${data.referenceType ?? null},
      ${data.referenceId ?? null},
      ${data.paymentMode ?? null},
      ${data.receiptNumber ?? null},
      ${data.payAgainst ?? null},
      ${data.transactionReference ?? null},
      ${data.notes ?? null},
      ${data.createdBy ?? null},
      ${data.updatedBy ?? null},
      ${now},
      ${now}
    )
    ON CONFLICT ("ledgerKey") DO UPDATE SET
      "branchId" = EXCLUDED."branchId",
      "paymentId" = EXCLUDED."paymentId",
      "installmentId" = EXCLUDED."installmentId",
      "entryNo" = EXCLUDED."entryNo",
      "entryType" = EXCLUDED."entryType",
      "description" = EXCLUDED."description",
      "debit" = EXCLUDED."debit",
      "credit" = EXCLUDED."credit",
      "amount" = EXCLUDED."amount",
      "runningBalance" = EXCLUDED."runningBalance",
      "studentBalanceAfter" = EXCLUDED."studentBalanceAfter",
      "entryDate" = EXCLUDED."entryDate",
      "paymentDate" = EXCLUDED."paymentDate",
      "referenceType" = EXCLUDED."referenceType",
      "referenceId" = EXCLUDED."referenceId",
      "paymentMode" = EXCLUDED."paymentMode",
      "receiptNumber" = EXCLUDED."receiptNumber",
      "payAgainst" = EXCLUDED."payAgainst",
      "transactionReference" = EXCLUDED."transactionReference",
      "notes" = EXCLUDED."notes",
      "updatedBy" = EXCLUDED."updatedBy",
      "updatedAt" = EXCLUDED."updatedAt"
  `);
}

async function recomputeBranchStudentLedgerBalances(db, branchStudentId) {
  const rows = await fetchBranchStudentLedgerRows(db, branchStudentId);
  const sortedRows = sortBranchStudentLedgerEntries(rows);
  let runningBalance = 0;

  for (let index = 0; index < sortedRows.length; index += 1) {
    const row = sortedRows[index];
    runningBalance += Number(row.debit ?? 0) - Number(row.credit ?? 0);

    if (
      Number(row.entryNo ?? 0) !== index + 1 ||
      Number(row.runningBalance ?? 0) !== runningBalance ||
      Number(row.studentBalanceAfter ?? 0) !== runningBalance
    ) {
      // eslint-disable-next-line no-await-in-loop
      await db.$executeRaw(Prisma.sql`
        UPDATE ${BRANCH_STUDENT_LEDGER_TABLE}
        SET
          "entryNo" = ${index + 1},
          "runningBalance" = ${runningBalance},
          "studentBalanceAfter" = ${runningBalance},
          "updatedAt" = ${new Date()}
        WHERE "id" = ${row.id}
      `);
    }
  }

  return fetchBranchStudentLedgerRows(db, branchStudentId);
}

async function materializeBranchStudentLedgerEntries(db, student, { includePayments = true } = {}) {
  const branchStudentId = String(student?.id || "").trim();
  const branchId = String(student?.branchId || "").trim();

  if (!branchStudentId || !branchId) {
    throw new AppError("Branch student is required for ledger materialization", 400);
  }

  const studentCourseAmount = resolveBranchStudentLedgerCourseAmount(student);
  const studentCreatedAt = buildLedgerDate(student.admissionDate || student.createdAt || new Date());

  if (studentCourseAmount > 0) {
    await upsertBranchStudentLedgerEntry(db, {
      ledgerKey: buildBranchStudentLedgerKey(branchStudentId, "course-fee"),
      branchId,
      branchStudentId,
      entryType: "DEBIT",
      description: "Course Fee",
      debit: studentCourseAmount,
      credit: 0,
      amount: studentCourseAmount,
      entryDate: studentCreatedAt,
      referenceType: "course-fee",
      referenceId: branchStudentId,
      createdBy: student.createdBy ?? null,
      updatedBy: student.updatedBy ?? null,
    });
  }

  if (includePayments) {
    const payments = Array.isArray(student.payments) ? student.payments : [];

    for (const payment of payments) {
      const amount = Math.max(Number(payment.amount ?? 0), 0);
      if (amount <= 0) {
        continue;
      }

      const paymentDate = buildLedgerDate(payment.paymentDate || payment.createdAt || new Date());
      const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);
      const payAgainst = normalizeString(payment.payAgainst)
        || (Number.isFinite(installmentNumber) && installmentNumber > 0 ? `Installment ${installmentNumber}` : "");

      // eslint-disable-next-line no-await-in-loop
      await upsertBranchStudentLedgerEntry(db, {
        ledgerKey: buildBranchStudentLedgerKey(branchStudentId, `payment-${payment.id}`),
        branchId,
        branchStudentId,
        paymentId: payment.id,
        installmentId: payment.installmentId || null,
        entryType: "CREDIT",
        description: normalizeBranchStudentLedgerDescription(payment),
        debit: 0,
        credit: amount,
        amount,
        entryDate: paymentDate,
        paymentDate,
        referenceType: "payment",
        referenceId: payment.id,
        paymentMode: normalizeString(payment.paymentMode),
        receiptNumber: normalizeString(payment.receiptNumber),
        payAgainst,
        transactionReference: normalizeString(payment.transactionReference),
        notes: normalizeString(payment.notes),
        createdBy: payment.createdBy ?? null,
        updatedBy: payment.updatedBy ?? null,
      });
    }
  }

  return recomputeBranchStudentLedgerBalances(db, branchStudentId);
}

const BRANCH_STUDENT_LEDGER_TABLE_DDL = [
  `
    CREATE TABLE IF NOT EXISTS "BranchStudentLedgerEntry" (
      "id" TEXT PRIMARY KEY,
      "ledgerKey" TEXT NOT NULL UNIQUE,
      "branchId" TEXT NOT NULL,
      "branchStudentId" TEXT NOT NULL,
      "paymentId" TEXT,
      "installmentId" TEXT,
      "entryNo" INTEGER NOT NULL DEFAULT 0,
      "entryType" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "debit" INTEGER NOT NULL DEFAULT 0,
      "credit" INTEGER NOT NULL DEFAULT 0,
      "amount" INTEGER NOT NULL DEFAULT 0,
      "runningBalance" INTEGER NOT NULL DEFAULT 0,
      "studentBalanceAfter" INTEGER NOT NULL DEFAULT 0,
      "entryDate" TIMESTAMP(3),
      "paymentDate" TIMESTAMP(3),
      "referenceType" TEXT,
      "referenceId" TEXT,
      "paymentMode" TEXT,
      "receiptNumber" TEXT,
      "payAgainst" TEXT,
      "transactionReference" TEXT,
      "notes" TEXT,
      "createdBy" TEXT,
      "updatedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BranchStudentLedgerEntry_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE,
      CONSTRAINT "BranchStudentLedgerEntry_branchStudentId_fkey"
        FOREIGN KEY ("branchStudentId") REFERENCES "BranchStudent"("id") ON DELETE CASCADE
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS "BranchStudentLedgerEntry_branchId_idx"
    ON "BranchStudentLedgerEntry" ("branchId")
  `,
  `
    CREATE INDEX IF NOT EXISTS "BranchStudentLedgerEntry_branchStudentId_entryDate_entryNo_idx"
    ON "BranchStudentLedgerEntry" ("branchStudentId", "entryDate", "entryNo")
  `,
  `
    CREATE INDEX IF NOT EXISTS "BranchStudentLedgerEntry_branchStudentId_createdAt_idx"
    ON "BranchStudentLedgerEntry" ("branchStudentId", "createdAt")
  `,
];

export async function ensureBranchStudentLedgerTable() {
  for (const statement of BRANCH_STUDENT_LEDGER_TABLE_DDL) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.$executeRawUnsafe(statement);
  }
}

function parseLedgerDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toLedgerDateString(value) {
  const date = parseLedgerDate(value);
  return date ? date.toISOString() : null;
}

function toLedgerDisplayDate(value) {
  const date = parseLedgerDate(value);
  return date ? date.toISOString() : "";
}

function normalizeLedgerText(value) {
  return normalizeString(value);
}

function resolveBranchStudentLedgerFeeAmount(student = {}) {
  const explicitCourseAmount = Number(student.courseAmount ?? 0);
  if (Number.isFinite(explicitCourseAmount) && explicitCourseAmount > 0) {
    return explicitCourseAmount;
  }

  const installmentTotal = Array.isArray(student.installments)
    ? student.installments.reduce((sum, installment) => {
      const amount = Number(installment?.amount ?? 0);
      return Number.isFinite(amount) ? sum + Math.max(amount, 0) : sum;
    }, 0)
    : 0;

  if (installmentTotal > 0) {
    return installmentTotal;
  }

  const paymentTotal = Array.isArray(student.payments)
    ? student.payments.reduce((sum, payment) => {
      const amount = Number(payment?.amount ?? 0);
      return Number.isFinite(amount) ? sum + Math.max(amount, 0) : sum;
    }, 0)
    : 0;

  return paymentTotal > 0 ? paymentTotal : 0;
}

function resolveBranchStudentLedgerDescription(payment = {}) {
  const payAgainst = normalizeLedgerText(payment.payAgainst);
  if (payAgainst) {
    return payAgainst;
  }

  const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);
  if (Number.isFinite(installmentNumber) && installmentNumber > 0) {
    return `Installment ${installmentNumber}`;
  }

  return "Payment";
}

function buildBranchStudentLedgerEntries(student = {}) {
  const payments = Array.isArray(student.payments) ? student.payments : [];
  const studentName = normalizeString(student.studentName);
  const studentId = normalizeString(student.studentId);
  const courseName = normalizeString(student.courseName || student.courseInterested || student.course?.name || "");
  const feeAmount = resolveBranchStudentLedgerFeeAmount(student);
  const baseDate = toLedgerDateString(student.admissionDate || student.createdAt || new Date()) || toLedgerDateString(new Date());

  const rows = [];
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let entryNo = 0;

  const pushRow = (row = {}) => {
    const debit = Math.max(Number(row.debit ?? 0), 0);
    const credit = Math.max(Number(row.credit ?? 0), 0);

    totalDebit += debit;
    totalCredit += credit;
    runningBalance += debit - credit;
    entryNo += 1;

    rows.push({
      id: normalizeString(row.id || `${student.id || studentId || "ledger"}-${entryNo}`),
      studentRecordId: normalizeString(row.studentRecordId || student.id || ""),
      branchId: normalizeString(row.branchId || student.branchId || ""),
      studentId,
      studentName,
      course: courseName,
      description: normalizeString(row.description || ""),
      entryType: normalizeString(row.entryType || (credit > 0 ? "CREDIT" : "DEBIT")).toUpperCase(),
      debit,
      credit,
      amount: Number(row.amount ?? debit ?? credit ?? 0),
      runningBalance,
      studentBalanceAfter: runningBalance,
      paymentMode: normalizeString(row.paymentMode || ""),
      receiptNumber: normalizeString(row.receiptNumber || ""),
      payAgainst: normalizeString(row.payAgainst || ""),
      transactionReference: normalizeString(row.transactionReference || ""),
      notes: normalizeString(row.notes || ""),
      referenceType: normalizeString(row.referenceType || ""),
      referenceId: normalizeString(row.referenceId || ""),
      dateRaw: toLedgerDateString(row.dateRaw || row.paymentDateRaw || row.paymentDate || row.createdAt || row.date || baseDate) || baseDate,
      date: toLedgerDisplayDate(row.date || row.paymentDate || row.createdAt || row.dateRaw || baseDate) || baseDate,
      status: normalizeString(row.status || ""),
      entryNo,
    });
  };

  if (feeAmount > 0) {
    pushRow({
      id: `${student.id || studentId || "ledger"}-course-fee`,
      description: "Course Fee",
      debit: feeAmount,
      amount: feeAmount,
      entryType: "DEBIT",
      referenceType: "course-fee",
      dateRaw: baseDate,
      date: baseDate,
    });
  }

  const sortedPayments = payments
    .filter((payment) => Number(payment?.amount ?? 0) > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.paymentDate || left.createdAt || 0).getTime();
      const rightTime = new Date(right.paymentDate || right.createdAt || 0).getTime();

      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return normalizeString(left.receiptNumber || left.id || "").localeCompare(
        normalizeString(right.receiptNumber || right.id || ""),
      );
    });

  sortedPayments.forEach((payment) => {
    const amount = Number(payment.amount ?? 0);
    const paymentDate = toLedgerDateString(payment.paymentDate || payment.createdAt || new Date()) || baseDate;
    const description = resolveBranchStudentLedgerDescription(payment);
    const installmentNumber = Number(payment.installment?.installmentNumber ?? 0);

    pushRow({
      id: payment.id || payment.receiptNumber || `${student.id || studentId || "ledger"}-${paymentDate}-${amount}`,
      description,
      credit: amount,
      amount,
      entryType: "CREDIT",
      referenceType: "payment",
      referenceId: payment.id || payment.receiptNumber || "",
      paymentMode: payment.paymentMode || "",
      receiptNumber: payment.receiptNumber || "",
      payAgainst: payment.payAgainst || (Number.isFinite(installmentNumber) && installmentNumber > 0 ? `Installment ${installmentNumber}` : ""),
      transactionReference: payment.transactionReference || "",
      notes: payment.notes || "",
      dateRaw: paymentDate,
      date: paymentDate,
      createdAt: payment.createdAt || paymentDate,
      paymentDate: payment.paymentDate || paymentDate,
    });
  });

  return {
    student: {
      id: student.id,
      branchId: student.branchId,
      studentId,
      studentName,
      courseName,
    },
    entries: rows,
    summary: {
      totalDebit,
      totalCredit,
      outstandingBalance: runningBalance,
      entryCount: rows.length,
      paymentCount: sortedPayments.length,
      studentCount: 1,
    },
  };
}

async function loadBranchStudentForLedger(studentId, actor) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);

  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
      payments: {
        orderBy: [
          { paymentDate: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
        include: {
          installment: {
            select: {
              installmentNumber: true,
              amount: true,
              dueDate: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError("Branch student not found", 404);
  }

  return student;
}

export async function getBranchStudentLedger(studentId, actor = null) {
  const student = await loadBranchStudentForLedger(studentId, actor);

  const updatedEntries = await prisma.$transaction(async (tx) => {
    const materialized = await materializeBranchStudentLedgerEntries(tx, student);
    return materialized;
  });

  const entries = sortBranchStudentLedgerEntries(updatedEntries).map((entry) => ({
    id: entry.id,
    ledgerKey: entry.ledgerKey,
    branchId: entry.branchId,
    branchStudentId: entry.branchStudentId,
    paymentId: entry.paymentId,
    installmentId: entry.installmentId,
    entryNo: entry.entryNo,
    entryType: entry.entryType,
    description: entry.description,
    debit: Number(entry.debit ?? 0),
    credit: Number(entry.credit ?? 0),
    amount: Number(entry.amount ?? 0),
    runningBalance: Number(entry.runningBalance ?? 0),
    studentBalanceAfter: Number(entry.studentBalanceAfter ?? 0),
    entryDate: entry.entryDate,
    paymentDate: entry.paymentDate,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    paymentMode: entry.paymentMode,
    receiptNumber: entry.receiptNumber,
    payAgainst: entry.payAgainst,
    transactionReference: entry.transactionReference,
    notes: entry.notes,
    createdBy: entry.createdBy,
    updatedBy: entry.updatedBy,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));

  const summary = entries.reduce((acc, entry) => {
    acc.totalDebit += Number(entry.debit ?? 0);
    acc.totalCredit += Number(entry.credit ?? 0);
    acc.outstandingBalance = Number(entry.runningBalance ?? acc.outstandingBalance ?? 0);
    acc.entryCount += 1;
    if (Number(entry.credit ?? 0) > 0) {
      acc.paymentCount += 1;
    }
    return acc;
  }, {
    totalDebit: 0,
    totalCredit: 0,
    outstandingBalance: 0,
    entryCount: 0,
    paymentCount: 0,
    studentCount: 1,
  });

  return {
    student: {
      id: student.id,
      branchId: student.branchId,
      studentId: student.studentId,
      studentName: student.studentName,
      courseName: student.courseName || student.courseInterested || "",
    },
    entries,
    summary,
  };
}

export async function listBranchLedger(query = {}, actor = null) {
  const branchProfile = await getBranchContext(actor);
  const normalizedStudentId = normalizeString(query.studentId);
  const search = normalizeSearchKey(query.search);
  const branchId = normalizeString(query.branchId || branchProfile?.id);

  if (normalizedStudentId) {
    return getBranchStudentLedger(normalizedStudentId, actor);
  }

  // Dashboard aggregation only needs persisted ledger rows. The regular
  // ledger view materializes each student's ledger for backwards compatibility,
  // but doing that here creates an N+1 query/write operation for every student.
  if (String(query.fast || '').toLowerCase() === 'true' || String(query.fast || '') === '1') {
    const ledgerWhere = branchId ? { branchId } : {};
    if (search) {
      ledgerWhere.OR = [
        { branchStudent: { studentId: { contains: search, mode: "insensitive" } } },
        { branchStudent: { studentName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const entries = await prisma.branchStudentLedgerEntry.findMany({
      where: ledgerWhere,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }, { entryNo: "desc" }],
      take: Math.min(Math.max(Number(query.limit) || 500, 1), 5000),
      select: {
        id: true,
        ledgerKey: true,
        branchId: true,
        branchStudentId: true,
        paymentId: true,
        installmentId: true,
        entryNo: true,
        entryType: true,
        description: true,
        debit: true,
        credit: true,
        amount: true,
        runningBalance: true,
        studentBalanceAfter: true,
        entryDate: true,
        paymentDate: true,
        paymentMode: true,
        receiptNumber: true,
        payAgainst: true,
        transactionReference: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        branchStudent: { select: { studentId: true, studentName: true, courseName: true } },
      },
    });

    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      studentId: entry.branchStudent?.studentId || "",
      studentName: entry.branchStudent?.studentName || "",
      course: entry.branchStudent?.courseName || "",
      dateRaw: entry.entryDate || entry.paymentDate || entry.createdAt,
      date: entry.entryDate || entry.paymentDate || entry.createdAt,
    }));

    return {
      entries: normalizedEntries,
      summary: normalizedEntries.reduce((acc, entry) => {
        acc.totalDebit += Number(entry.debit || 0);
        acc.totalCredit += Number(entry.credit || 0);
        acc.entryCount += 1;
        if (Number(entry.credit || 0) > 0) acc.paymentCount += 1;
        return acc;
      }, { totalDebit: 0, totalCredit: 0, outstandingBalance: Number(normalizedEntries[0]?.runningBalance || 0), entryCount: 0, paymentCount: 0, studentCount: 0 }),
    };
  }

  const where = branchId ? { branchId } : {};

  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: "insensitive" } },
      { studentName: { contains: search, mode: "insensitive" } },
      { courseName: { contains: search, mode: "insensitive" } },
    ];
  }

  const students = await prisma.branchStudent.findMany({
    where,
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      branchId: true,
      studentId: true,
      studentName: true,
      courseName: true,
    },
  });

  let entries = [];
  for (const student of students) {
    // eslint-disable-next-line no-await-in-loop
    const ledger = await getBranchStudentLedger(student.id, actor);
    entries = entries.concat(ledger.entries);
  }

  const summary = entries.reduce((acc, entry) => {
    acc.totalDebit += Number(entry.debit ?? 0);
    acc.totalCredit += Number(entry.credit ?? 0);
    acc.outstandingBalance = Number(entry.runningBalance ?? acc.outstandingBalance ?? 0);
    acc.entryCount += 1;
    if (Number(entry.credit ?? 0) > 0) {
      acc.paymentCount += 1;
    }
    return acc;
  }, {
    totalDebit: 0,
    totalCredit: 0,
    outstandingBalance: 0,
    entryCount: 0,
    paymentCount: 0,
    studentCount: students.length,
  });

  return {
    entries,
    summary,
  };
}

function getReminderWindowDaysUntilDue(dueDateText) {
  const text = normalizeString(dueDateText);
  if (!text) {
    return null;
  }

  const dueDate = new Date(`${text}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diffDays) ? diffDays : null;
}

async function resolveBranchStudentFacultyUser(student = {}, branchId = "") {
  const normalizedBranchId = normalizeString(branchId || student.branchId);
  const facultyId = normalizeString(student.facultyId);
  const facultyName = normalizeString(student.facultyName);

  if (!normalizedBranchId || (!facultyId && !facultyName)) {
    return null;
  }

  const branchFaculty = await prisma.branchFaculty.findFirst({
    where: {
      branchId: normalizedBranchId,
      status: "ACTIVE",
      OR: [
        ...(facultyId ? [{ facultyId }] : []),
        ...(facultyName ? [{ name: { equals: facultyName, mode: "insensitive" } }] : []),
      ],
    },
    select: {
      email: true,
      name: true,
      facultyId: true,
    },
  });

  if (!branchFaculty?.email) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      email: {
        equals: branchFaculty.email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });
}

function shouldSendDueReminder(nextInstallment = null) {
  if (!nextInstallment) {
    return false;
  }

  const dueDateText = normalizeString(nextInstallment.dueDate);
  if (!dueDateText) {
    return false;
  }

  if (nextInstallment.dueReminderSentAt) {
    return false;
  }

  const diffDays = getReminderWindowDaysUntilDue(dueDateText);
  if (diffDays === null) {
    return false;
  }

  return diffDays >= 0 && diffDays <= DUE_REMINDER_WINDOW_DAYS;
}

async function markInstallmentDueReminderSent(installmentId) {
  if (!installmentId) {
    return;
  }

  await prisma.branchStudentInstallment.update({
    where: { id: installmentId },
    data: {
      dueReminderSentAt: new Date(),
    },
  });
}

export async function sendBranchStudentDueReminderEmails() {
  const students = await prisma.branchStudent.findMany({
    where: {
      recordStatus: "ACTIVE",
      emailAddress: { not: "" },
    },
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  let sentCount = 0;

  for (const student of students) {
    const feeSnapshot = calculateFeeProgressSnapshot(student);
    const nextInstallment = feeSnapshot.nextInstallment;

    if (!shouldSendDueReminder(nextInstallment) || !student.emailAddress) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await sendStudentPaymentDueEmail({
      to: student.emailAddress,
      fullName: student.studentName,
      studentId: student.studentId,
      courseName: student.courseName || student.courseInterested || "",
      feeProgress: feeSnapshot.feeProgress,
      courseProgress: student.courseProgress,
      dueAmount: feeSnapshot.dueAmount,
      dueDate: nextInstallment?.dueDate || "",
      installmentNumber: nextInstallment?.installmentNumber || null,
    });

    // eslint-disable-next-line no-await-in-loop
    await markInstallmentDueReminderSent(nextInstallment.id);
    sentCount += 1;
  }

  return {
    scannedCount: students.length,
    sentCount,
  };
}

export function startBranchStudentDueReminderScheduler() {
  const runSweep = () => {
    void sendBranchStudentDueReminderEmails().catch((error) => {
      console.warn("Branch student due reminder sweep failed", error);
    });
  };

  runSweep();

  const timer = setInterval(runSweep, DUE_REMINDER_SWEEP_INTERVAL_MS);
  timer.unref?.();

  return timer;
}

async function notifyProgressAlignment(studentRecord, branchProfile, actor) {
  if (!studentRecord?.id || !branchProfile?.id) {
    return;
  }

  const courseProgress = Number(studentRecord.courseProgress);
  if (!Number.isFinite(courseProgress)) {
    return;
  }

  const feeSnapshot = calculateFeeProgressSnapshot(studentRecord);
  if (feeSnapshot.totalAmount <= 0) {
    return;
  }

  const paidProgress = feeSnapshot.feeProgress;
  // A newly created student has no course or fee progress yet. Do not create
  // a misleading "payment progress updated" notification for that baseline.
  if (courseProgress <= 0 && paidProgress <= 0) {
    return;
  }
  if (courseProgress < Math.max(0, paidProgress - PROGRESS_ALERT_TOLERANCE)) {
    return;
  }

  const facultyUser = await resolveBranchStudentFacultyUser(studentRecord, branchProfile.id);

  await createFeeProgressAlertNotification({
    branch: {
      id: branchProfile.id,
      branchId: branchProfile.branchId,
      branchEmail: branchProfile.branchEmail,
      branchName: branchProfile.branchName,
    },
    student: studentRecord,
    facultyUserId: facultyUser?.id || null,
    actorId: actor?.id ?? null,
    courseProgress,
    paidProgress,
    dueAmount: feeSnapshot.dueAmount,
    dueDate: feeSnapshot.nextInstallment?.dueDate || "",
    nextInstallmentNumber: feeSnapshot.nextInstallment?.installmentNumber || null,
    tone: "amber",
  });
}

async function normalizeBranchStudentIdentifiers(branchProfile, actorId = null) {
  if (!branchProfile?.id) {
    return [];
  }

  const branchCode = normalizeString(branchProfile.branchId || branchProfile.branchCode || branchProfile.id).toUpperCase();
  const rows = await prisma.branchStudent.findMany({
    where: { branchId: branchProfile.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const planned = rows.map((row, index) => ({
    row,
    nextStudentId: generateStudentIdFromSequence(index + 1, branchProfile.branchId),
  }));

  const needsMigration = planned.some(({ row, nextStudentId }) => row.studentId !== nextStudentId);
  if (!needsMigration) {
    return rows;
  }

  return prisma.$transaction(async (tx) => {
    for (const { row, nextStudentId } of planned) {
      if (row.studentId === nextStudentId) {
        continue;
      }

      const loginUser = await tx.user.findFirst({
        where: {
          OR: [
            { email: row.emailAddress },
            { userCode: row.studentId },
            { userCode: buildBranchStudentUserCode(branchCode, row.studentId) },
          ],
        },
        select: { id: true },
      });

      await tx.branchStudent.update({
        where: { id: row.id },
        data: {
          studentId: nextStudentId,
          updatedBy: actorId,
        },
      });

      if (loginUser) {
        await tx.user.update({
          where: { id: loginUser.id },
          data: {
            userCode: buildBranchStudentUserCode(branchCode, nextStudentId),
            updatedBy: actorId,
          },
        });
      }
    }

    return tx.branchStudent.findMany({
      where: { branchId: branchProfile.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  });
}

function buildBranchStudentPayload(payload = {}, existing = null) {
  const candidate = existing ? { ...existing, ...payload } : payload;
  const studentName = parseRequiredText(candidate.studentName, "Student name");
  const parentName = parseOptionalText(candidate.parentName);
  const emailAddress = parseEmail(candidate.emailAddress);
  const mobileNumber = parsePhone(candidate.mobileNumber);
  const parentSpouseNumber = candidate.parentSpouseNumber ? parsePhone(candidate.parentSpouseNumber, "Parent / spouse number") : null;
  const countryCode = parseRequiredText(candidate.countryCode, "Country code").toUpperCase();
  const country = parseRequiredText(candidate.country, "Country");
  const stateCode = parseRequiredText(candidate.stateCode, "State code").toUpperCase();
  const state = parseRequiredText(candidate.state, "State");
  const city = parseRequiredText(candidate.city, "City");
  const address = parseRequiredText(candidate.address, "Address");
  const linkedInUrl = parseOptionalUrl(candidate.linkedInUrl);
  const qualification = parseRequiredText(candidate.qualification, "Qualification");
  const currentStatus = parseFormCurrentStatus(candidate.currentStatus, Boolean(existing));
  const isCollegeStudent = currentStatus === "College Student";
  const isEmployee = currentStatus === "Employee";
  const educationLevel = isCollegeStudent ? parseRequiredText(candidate.educationLevel, "Education level") : null;
  const educationStatus = isCollegeStudent ? parseRequiredText(candidate.educationStatus, "Education status") : null;
  if (isCollegeStudent && !new Set(["UG", "PG"]).has(educationLevel)) throw new AppError("Education level must be UG or PG", 400);
  if (isCollegeStudent && !new Set(["Currently Pursuing", "Passed Out"]).has(educationStatus)) throw new AppError("Education status is invalid", 400);
  const requiresPassedOutYear = currentStatus === "Fresher" || (isCollegeStudent && educationStatus === "Passed Out");
  const passedOutYear = parseOptionalYear(candidate.passedOutYear);
  if (requiresPassedOutYear && !passedOutYear) throw new AppError("Passed out year is required", 400);
  const customCurrentStatus = currentStatus === "Custom" ? parseRequiredText(candidate.customCurrentStatus, "Custom current status") : null;
  const purpose = parseOptionalText(candidate.purpose);
  if (purpose && !PURPOSES.has(purpose)) throw new AppError("Invalid purpose", 400);
  const customPurpose = purpose === "Custom" ? parseRequiredText(candidate.customPurpose, "Custom purpose") : null;
  const designation = isEmployee ? parseRequiredText(candidate.designation, "Designation") : null;
  const companyName = isEmployee ? parseRequiredText(candidate.companyName, "Company name") : null;
  const source = parseRequiredText(candidate.source, "Source");
  const sourceOther = source === "Others" ? parseRequiredText(candidate.sourceOther, "Source details") : parseOptionalText(candidate.sourceOther);
  const remarks = parseOptionalText(candidate.remarks);
  const admissionDate = parseDateString(candidate.admissionDate, "Admission date");
  const courseStartDate = parseOptionalText(candidate.courseStartDate);
  const classSchedule = parseOptionalText(candidate.classSchedule);
  const courseMode = parseOptionalText(candidate.courseMode);
  const totalWorkingDaysValue = candidate.totalWorkingDays === undefined || candidate.totalWorkingDays === null || candidate.totalWorkingDays === ''
    ? null
    : Number(candidate.totalWorkingDays);
  if (totalWorkingDaysValue !== null && (!Number.isInteger(totalWorkingDaysValue) || totalWorkingDaysValue <= 0)) {
    throw new AppError("Total working days must be a positive whole number", 400);
  }
  const courseEndDate = parseOptionalText(candidate.courseEndDate);
  const recordStatus = parseStatus(candidate.recordStatus || candidate.status || "ACTIVE");
  const courseProgress = parseOptionalProgress(candidate.courseProgress);
  const arrangementType = normalizeString(candidate.arrangementType || candidate.enrollmentType || 'SINGLE').toUpperCase() || 'SINGLE';
  const firstCourseId = parseOptionalText(candidate.firstCourseId || candidate.firstCourse);

  if (source === "Others" && !sourceOther) {
    throw new AppError("Source details are required when source is Others", 400);
  }
  const studentData = {
    studentName,
    parentName,
    emailAddress,
    mobileNumber,
    parentSpouseNumber,
    countryCode,
    country,
    stateCode,
    state,
    city,
    address,
    linkedInUrl,
    qualification,
    passedOutYear,
    currentStatus,
    customCurrentStatus,
    purpose,
    customPurpose,
    educationLevel,
    educationStatus,
    designation,
    companyName,
    source,
    sourceOther,
    remarks,
    admissionDate,
    courseStartDate,
    classSchedule,
    courseProgress,
    arrangementType,
    firstCourseId,
    recordStatus,
    courseId: parseOptionalText(candidate.courseId),
    courseName: parseOptionalText(candidate.courseName),
    courseMode,
    totalWorkingDays: totalWorkingDaysValue,
    courseEndDate,
    batchId: parseOptionalText(candidate.batchId || candidate.batchEntryId),
    batchName: parseOptionalText(candidate.batchName || candidate.batch),
    batchTiming: parseOptionalText(candidate.batchTiming || candidate.batchTime),
    facultyId: parseOptionalText(candidate.facultyId),
    facultyName: parseOptionalText(candidate.facultyName),
    courseAmount: candidate.courseAmount && Number.isFinite(Number(String(candidate.courseAmount).replace(/,/g, ''))) 
      ? Number(String(candidate.courseAmount).replace(/,/g, '')) 
      : null,
    paymentMode: parseOptionalText(candidate.paymentMode) || "Installment",
    paymentPlanId: parseOptionalText(candidate.paymentPlanId),
    paymentPlan: parseOptionalText(candidate.paymentPlan),
    feeScheduleMode: normalizeFeeScheduleMode(candidate.feeScheduleMode || candidate.scheduleMode),
    feeFirstPaymentDate: parseOptionalText(candidate.feeFirstPaymentDate || candidate.firstPaymentDate) || admissionDate,
    fee70ProgressDate: parseOptionalText(candidate.fee70ProgressDate),
    fee70TargetHours: candidate.fee70TargetHours === undefined || candidate.fee70TargetHours === null || candidate.fee70TargetHours === ''
      ? null
      : Number(candidate.fee70TargetHours),
    feePaymentDeadline: parseOptionalText(candidate.feePaymentDeadline),
    feeComplianceStatus: parseOptionalText(candidate.feeComplianceStatus) || "PENDING",
  };

  let installmentSchedule = [];
  if (Array.isArray(candidate.installmentSchedule)) {
    installmentSchedule = candidate.installmentSchedule.map((inst, index) => ({
      installmentNumber: index + 1,
      amount: Number(String(inst.amount).replace(/,/g, '')) || 0,
      dueDate: parseOptionalText(inst.dueDate),
      status: parseOptionalText(inst.status) || "Pending",
      paymentMethod: parseOptionalText(inst.paymentMethod),
      remarks: parseOptionalText(inst.remarks),
      paidAt: inst.paidAt ? new Date(inst.paidAt) : null,
    }));
  }

  return { studentData, installmentSchedule };
}

function normalizeCourseEnrollments(payload = [], branchId) {
  if (!Array.isArray(payload)) return [];
  return payload.map((item, index) => {
    const totalCourseAmount = Number(String(item?.totalCourseAmount ?? item?.courseAmount ?? item?.totalAmount ?? 0).replace(/,/g, '')) || 0;
    const discount = calculateCourseDiscount(totalCourseAmount, item?.discountType, item?.discountValue ?? item?.studentDiscountAmount ?? 0);
    return {
      branchId,
      courseId: normalizeString(item?.courseId),
      courseName: parseOptionalText(item?.courseName),
      facultyId: parseOptionalText(item?.facultyId),
      facultyName: parseOptionalText(item?.facultyName),
      batchId: parseOptionalText(item?.batchId || item?.batchEntryId),
      batchName: parseOptionalText(item?.batchName || item?.batch),
      batchTiming: parseOptionalText(item?.batchTiming || item?.batchTime),
      scheduleType: parseOptionalText(item?.classSchedule || item?.scheduleType || item?.weekType),
      mode: parseOptionalText(item?.courseMode || item?.mode),
      startDate: parseOptionalText(item?.courseStartDate || item?.startDate),
      endDate: parseOptionalText(item?.courseEndDate || item?.endDate),
      arrangementType: normalizeString(item?.arrangementType || item?.arrangement || 'SINGLE').toUpperCase(),
      sequenceOrder: Number(item?.sequenceOrder || index + 1),
      ...discount,
      paymentPlanId: parseOptionalText(item?.paymentPlanId),
      paymentPlan: parseOptionalText(item?.paymentPlan),
      status: normalizeString(item?.status || 'ACTIVE').toUpperCase(),
    };
  }).filter((item) => item.courseId);
}

function getCourseEnrollmentInput(payload = {}) {
  return Array.isArray(payload.courses) ? payload.courses : payload.courseEnrollments;
}

function isBranchStudentCourseCompleted(student, courseId) {
  const enrollment = (student?.courseEnrollments || []).find((item) => String(item.courseId) === String(courseId));
  const completedAt = enrollment?.courseCompletedAt || (String(student?.courseId || '') === String(courseId) ? student?.courseCompletedAt : null);
  const progress = enrollment?.courseProgress ?? (String(student?.courseId || '') === String(courseId) ? student?.courseProgress : null);
  return Boolean(completedAt) || Number(progress) >= 100;
}

function validateCourseEnrollmentInput(payload = {}, branchId, existingStudent = null) {
  const raw = getCourseEnrollmentInput(payload);
  if (!Array.isArray(raw) || !raw.length) return { arrangementType: 'SINGLE', firstCourseId: '', enrollments: [] };

  const enrollments = normalizeCourseEnrollments(raw, branchId);
  const ids = enrollments.map((item) => item.courseId);
  if (new Set(ids).size !== ids.length) throw new AppError('The same course cannot be selected more than once.', 400);

  const arrangementType = ids.length === 1
    ? 'SINGLE'
    : normalizeString(payload.arrangementType || payload.enrollmentType).toUpperCase();
  if (!['SINGLE', 'PARALLEL', 'SEQUENTIAL'].includes(arrangementType)) {
    throw new AppError('Arrangement type is required for multiple courses and must be PARALLEL or SEQUENTIAL.', 400);
  }
  if (arrangementType === 'SINGLE' && ids.length > 1) {
    throw new AppError('Multiple courses require PARALLEL or SEQUENTIAL arrangement.', 400);
  }

  const firstCourseId = normalizeString(payload.firstCourseId || payload.firstCourse || (arrangementType === 'SEQUENTIAL' ? enrollments[0]?.courseId : ''));
  if (arrangementType === 'SEQUENTIAL' && (!firstCourseId || !ids.includes(firstCourseId))) {
    throw new AppError('A valid firstCourseId is required for sequential admission.', 400);
  }

  if (arrangementType === 'SEQUENTIAL') {
    const orderedEnrollments = [...enrollments].sort((left, right) => left.sequenceOrder - right.sequenceOrder);
    if (orderedEnrollments.some((item, index) => item.sequenceOrder !== index + 1)) {
      throw new AppError('Sequential course order must be continuous, starting at Course 1.', 400);
    }
    if (orderedEnrollments[0]?.courseId !== firstCourseId) {
      throw new AppError('The first course must match the selected sequential course order.', 400);
    }
  }

  enrollments.forEach((item, index) => {
    item.arrangementType = arrangementType;
    item.sequenceOrder = arrangementType === 'SEQUENTIAL' ? Number(item.sequenceOrder || index + 1) : index + 1;
    const priorCourses = enrollments.filter((course) => course.sequenceOrder < item.sequenceOrder);
    const priorCoursesCompleted = priorCourses.length === item.sequenceOrder - 1 && priorCourses.every((course) => isBranchStudentCourseCompleted(existingStudent, course.courseId));
    const isConfigured = arrangementType !== 'SEQUENTIAL' || item.courseId === firstCourseId || priorCoursesCompleted;
    if (isConfigured) {
      for (const [field, label] of [['mode', 'course mode'], ['batchId', 'batch'], ['batchTiming', 'batch timing'], ['scheduleType', 'class schedule'], ['startDate', 'course start date']]) {
        if (!String(item[field] || '').trim()) throw new AppError(`${label} is required for course ${item.courseId}.`, 400);
      }
      if (!(Number(item.totalCourseAmount) > 0)) throw new AppError(`Total course amount is required for course ${item.courseId}.`, 400);
      if (item.startDate && item.endDate && item.startDate > item.endDate) {
        throw new AppError(`Course end date must be on or after its start date for course ${item.courseId}.`, 400);
      }
      item.status = 'ACTIVE';
    } else {
      item.status = 'PENDING';
      // Keep the catalog fee and its allocated common discount for the
      // upcoming course, but don't create an installment plan or bill it
      // until the preceding sequential course is completed.
      item.paymentPlanId = null;
      item.paymentPlan = null;
    }
  });
  return { arrangementType, firstCourseId, enrollments };
}

async function syncBranchStudentCourseEnrollments(tx, student, payload = {}, existingStudent = null) {
  // Older clients do not send this field; preserve any existing enrollments.
  if (!Array.isArray(getCourseEnrollmentInput(payload))) return;
  const validated = validateCourseEnrollmentInput(payload, student.branchId, existingStudent);
  const enrollments = validated.enrollments;
  if (!enrollments.length && student.courseId) {
    enrollments.push({
      branchId: student.branchId,
      courseId: student.courseId,
      courseName: student.courseName,
      facultyId: student.facultyId,
      facultyName: student.facultyName,
      batchId: student.batchId,
      batchName: student.batchName,
      batchTiming: student.batchTiming,
      scheduleType: student.classSchedule,
      mode: student.courseMode,
      startDate: student.courseStartDate,
      endDate: student.courseEndDate,
    });
  }
  if (enrollments.length) {
    for (const item of enrollments) {
      const previousEnrollment = (existingStudent?.courseEnrollments || []).find((enrollment) => String(enrollment.courseId) === String(item.courseId));
      const isNewlyActivated = validated.arrangementType === 'SEQUENTIAL'
        && Number(item.sequenceOrder) > 1
        && String(previousEnrollment?.status || '').toUpperCase() === 'PENDING'
        && item.status === 'ACTIVE';
      if (item.status === 'ACTIVE' && item.batchId) {
        const assignedBatch = await tx.branchBatch.findFirst({
          where: {
            branchId: student.branchId,
            courseId: item.courseId,
            batchId: item.batchId,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            branchId: true,
            batchId: true,
            courseId: true,
            batchName: true,
            batchTiming: true,
            totalSeats: true,
            facultyId: true,
            facultyName: true,
            weekType: true,
            mode: true,
            courseStartDate: true,
            courseEndDate: true,
            weeklyOffDay: true,
          },
        });
        if (!assignedBatch) throw new AppError(`Selected batch was not found for course ${item.courseName || item.courseId}.`, 400);
        if (normalizeString(item.scheduleType).toUpperCase() !== normalizeString(assignedBatch.weekType).toUpperCase() || normalizeString(item.mode).toUpperCase() !== normalizeString(assignedBatch.mode).toUpperCase()) {
          throw new AppError(`Selected batch does not match the schedule and mode for course ${item.courseName || item.courseId}.`, 400);
        }
        if (isNewlyActivated) await ensureAvailableBatchCapacity(assignedBatch, student.id, tx);
        item.batchName = assignedBatch.batchName;
        item.batchTiming = assignedBatch.batchTiming;
        item.facultyId = assignedBatch.facultyId;
        item.facultyName = assignedBatch.facultyName;
        item.endDate = item.endDate || assignedBatch.courseEndDate;
        // Every new enrollment belongs to the batch's current intake cycle.
        // Existing enrollments keep their original cycle so completing an
        // intake never moves its historical students into a later intake.
        if (!previousEnrollment?.batchCycleId || String(previousEnrollment.batchId || '') !== String(item.batchId || '')) {
          let batchCycle = await tx.batchCycle.findFirst({
            where: { batchId: assignedBatch.id, status: 'ACTIVE' },
            orderBy: { cycleNumber: 'desc' },
            select: { id: true },
          });
          if (!batchCycle) {
            batchCycle = await tx.batchCycle.upsert({
              where: { batchId_cycleNumber: { batchId: assignedBatch.id, cycleNumber: 1 } },
              update: { status: 'ACTIVE' },
              create: { batchId: assignedBatch.id, cycleNumber: 1, cycleName: 'Cycle 1', status: 'ACTIVE' },
              select: { id: true },
            });
          }
          item.batchCycleId = batchCycle.id;
        } else {
          item.batchCycleId = previousEnrollment.batchCycleId;
        }
      }
      if (isNewlyActivated) {
        const courseRecord = await tx.branchCourse.findFirst({
          where: { id: item.courseId, branchId: student.branchId, status: 'ACTIVE' },
          select: { paymentPlans: true, paymentPlanSelections: true },
        });
        const configuredPlans = Array.isArray(courseRecord?.paymentPlans)
          ? courseRecord.paymentPlans
          : Array.isArray(courseRecord?.paymentPlanSelections)
            ? courseRecord.paymentPlanSelections
            : [];
        if (configuredPlans.length && !item.paymentPlanId) {
          throw new AppError(`Select a payment plan for course ${item.courseName || item.courseId}.`, 400);
        }
        if (item.paymentPlanId && configuredPlans.length) {
          const matchingPlan = configuredPlans.some((plan) => [plan?.id, plan?.templateId, plan?.paymentPlanId]
            .some((id) => normalizeString(id) === item.paymentPlanId));
          if (!matchingPlan) throw new AppError(`Selected payment plan does not belong to course ${item.courseName || item.courseId}.`, 400);
        }
      }
      await tx.branchStudentCourse.upsert({
        where: { branchStudentId_courseId: { branchStudentId: student.id, courseId: item.courseId } },
        create: { ...item, branchStudentId: student.id },
        update: { ...item },
      });
    }
  }
  await tx.branchStudent.update({
    where: { id: student.id },
    data: {
      enrollmentType: enrollments.length > 1 ? 'MULTIPLE' : 'SINGLE',
      arrangementType: validated.arrangementType,
      firstCourseId: validated.firstCourseId || null,
    },
  });
}

async function getBranchContext(actor) {
  const role = normalizeString(actor?.role).toUpperCase();
  const impersonatedBranchId = normalizeString(actor?.impersonatedBranchId);

  // Super Admin branch-dashboard views carry a validated impersonation context
  // through authentication. Treat that context as the active branch scope so
  // lifecycle and student queries never fall back to all branches.
  if (role === "SUPER_ADMIN" && impersonatedBranchId) {
    const branchProfile = await getCurrentBranchProfile(actor);
    if (!branchProfile?.id) {
      throw new AppError("Branch profile not found", 404);
    }
    return branchProfile;
  }

  if (role !== "BRANCH_ADMIN") {
    return null;
  }

  const branchProfile = await getCurrentBranchProfile(actor);
  if (!branchProfile?.id) {
    throw new AppError("Branch profile not found", 404);
  }

  return branchProfile;
}

function buildBranchStudentWhere(query = {}, branchProfile = null) {
  const where = {};
  const search = normalizeString(query.search);

  if (query.status) {
    where.recordStatus = parseStatus(query.status);
  }

  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: "insensitive" } },
      { studentName: { contains: search, mode: "insensitive" } },
      { emailAddress: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search, mode: "insensitive" } },
      { parentSpouseNumber: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { qualification: { contains: search, mode: "insensitive" } },
      { passedOutYear: { contains: search, mode: "insensitive" } },
      { currentStatus: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
      { sourceOther: { contains: search, mode: "insensitive" } },
    ];
  }

  if (branchProfile?.id) {
    where.branchId = branchProfile.id;
  } else if (query.branchId) {
    where.branchId = normalizeString(query.branchId);
  }

  const batchId = normalizeString(query.batchId || query.batchEntryId);
  if (batchId) {
    where.batchId = batchId;
  }

  const facultyId = normalizeString(query.facultyId);
  const facultyName = normalizeString(query.facultyName);
  const facultyConditions = [];
  if (facultyId) {
    facultyConditions.push(
      { facultyId },
      { courseEnrollments: { some: { facultyId, status: "ACTIVE" } } },
    );
  }
  if (facultyName) {
    facultyConditions.push(
      { facultyName: { equals: facultyName, mode: "insensitive" } },
      { courseEnrollments: { some: { facultyName: { equals: facultyName, mode: "insensitive" }, status: "ACTIVE" } } },
    );
  }
  if (facultyConditions.length) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: facultyConditions }];
  }

  addCourseLifecycleFilter(where, query.lifecycle || query.courseStatus);

  return where;
}

function buildBranchStudentOrderBy(sortBy, sortOrder) {
  switch (normalizeSearchKey(sortBy)) {
    case "studentid":
      return { studentId: sortOrder };
    case "studentname":
      return { studentName: sortOrder };
    case "emailaddress":
      return { emailAddress: sortOrder };
    case "mobilenumber":
      return { mobileNumber: sortOrder };
    case "admissiondate":
      return { admissionDate: sortOrder };
    case "updatedat":
      return { updatedAt: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

function toBranchStudentSummary(record) {
  const isDiscontinued = Array.isArray(record.discontinuationRequests) && record.discontinuationRequests.some((request) => request?.status === "APPROVED");
  const isCompletedStudentImport = Array.isArray(record.courseEnrollments)
    && record.courseEnrollments.some((enrollment) => ["COMPLETED", "DISCONTINUED"].includes(String(enrollment?.importedLifecycleStatus || "").trim().toUpperCase()));
  return {
    id: record.id,
    branchId: record.branchId,
    sourceLeadId: record.sourceLeadId || null,
    admissionSource: record.admissionSource || null,
    studentId: record.studentId,
    studentName: record.studentName,
    parentName: record.parentName,
    emailAddress: record.emailAddress,
    mobileNumber: record.mobileNumber,
    parentSpouseNumber: record.parentSpouseNumber,
    countryCode: record.countryCode,
    country: record.country,
    stateCode: record.stateCode,
    state: record.state,
    city: record.city,
    address: record.address,
    linkedInUrl: record.linkedInUrl,
    qualification: record.qualification,
    passedOutYear: record.passedOutYear,
    currentStatus: record.currentStatus,
    customCurrentStatus: record.customCurrentStatus,
    purpose: record.purpose,
    customPurpose: record.customPurpose,
    educationLevel: record.educationLevel,
    educationStatus: record.educationStatus,
    designation: record.designation,
    companyName: record.companyName,
    source: record.source,
    sourceOther: record.sourceOther,
    remarks: record.remarks,
    admissionDate: record.admissionDate,
    courseStartDate: record.courseStartDate,
    classSchedule: record.classSchedule,
    courseProgress: record.courseProgress,
    courseStatus: courseStatusFromProgress(record.courseProgress),
    paidProgress: record.paidProgress || calculateCoursePaidProgress(record, record.courseId),
    courseCompletion: record.courseCompletion || courseCompletionFromProgressAndTests(record.courseProgress, record.academicTestProgress, record.paidProgress || calculateCoursePaidProgress(record, record.courseId)),
    courseCompletionStatus: record.courseCompletion || courseCompletionFromProgressAndTests(record.courseProgress, record.academicTestProgress, record.paidProgress || calculateCoursePaidProgress(record, record.courseId)),
    academicTestProgress: record.academicTestProgress || null,
    academicTestProgressByCourse: record.academicTestProgressByCourse || {},
    courseCompletionByCourse: record.courseCompletionByCourse || {},
    courseCompletedAt: record.courseCompletedAt || null,
    isCompletedStudentImport,
    courseId: record.courseId,
    enrollmentType: record.enrollmentType || 'SINGLE',
    arrangementType: record.arrangementType || record.enrollmentType || 'SINGLE',
    firstCourseId: record.firstCourseId || null,
    courseEnrollments: Array.isArray(record.courseEnrollments) ? record.courseEnrollments : [],
    courseName: record.courseName,
    courseMode: record.courseMode,
    totalWorkingDays: record.totalWorkingDays,
    courseEndDate: record.courseEndDate,
    courseDuration: record.course?.duration ?? record.courseDuration ?? null,
    course: record.course
      ? {
          id: record.course.id,
          name: record.course.name,
    courseCode: record.course.courseCode,
          courseType: record.course.courseType,
          duration: record.course.duration,
          hours: record.course.hours,
          mode: record.course.mode,
          status: record.course.status,
        }
      : null,
    batchId: record.batchId,
    batchName: record.batchName,
    batchTiming: record.batchTiming,
    facultyId: record.facultyId,
    facultyName: record.facultyName,
    courseAmount: record.courseAmount,
    paymentMode: record.paymentMode,
    paymentPlanId: record.paymentPlanId,
    paymentPlan: record.paymentPlan,
    feeScheduleMode: record.feeScheduleMode,
    feeFirstPaymentDate: record.feeFirstPaymentDate,
    fee70ProgressDate: record.fee70ProgressDate,
    fee70TargetHours: record.fee70TargetHours,
    feePaymentDeadline: record.feePaymentDeadline,
    feeComplianceStatus: record.feeComplianceStatus,
    status: isDiscontinued ? "Discontinued" : displayStatus(record.recordStatus),
    isDiscontinued,
    discontinuationStatus: isDiscontinued ? "APPROVED" : null,
    recordStatus: record.recordStatus,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    installmentSchedule: Array.isArray(record.installments) ? record.installments : [],
    payments: Array.isArray(record.payments) ? record.payments : [],
    attendanceRecords: Array.isArray(record.calendarAttendanceRecords)
      ? record.calendarAttendanceRecords.map((attendance) => ({
          attendanceDate: attendance.attendanceDate,
          status: attendance.status,
          markedAt: attendance.markedAt,
          notes: attendance.notes,
        }))
      : [],
  };
}

async function ensureAvailableBatchCapacity(batch, excludeStudentId = null, tx = prisma) {
  const activeCycle = await tx.batchCycle.findFirst({ where: { batchId: batch.id, status: 'ACTIVE' }, orderBy: { cycleNumber: 'desc' }, select: { id: true, status: true, freezeUntil: true } });
  if (!activeCycle || (activeCycle.freezeUntil && activeCycle.freezeUntil > new Date())) throw new AppError('This batch is frozen until the current intake cycle is released.', 409);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${batch.id}))`;
  const studentWhere = {
    branchId: batch.branchId,
    recordStatus: 'ACTIVE',
    courseEnrollments: { some: { courseId: batch.courseId, batchId: batch.batchId, batchCycleId: activeCycle.id, status: 'ACTIVE' } },
    ...(excludeStudentId ? { NOT: { id: excludeStudentId } } : {}),
  }
  const totalStudentCount = await tx.branchStudent.count({ where: studentWhere })
  if (totalStudentCount >= Number(batch?.totalSeats || 0)) throw new AppError('This batch has reached its total seat capacity.', 400)
}

async function ensureUniqueBranchStudentIdentity({ emailAddress, mobileNumber }, branchId, excludeId = null, excludeUserId = null, excludeStudentId = null) {
  const existing = await prisma.branchStudent.findFirst({
    where: {
      branchId,
      OR: [{ emailAddress }, { mobileNumber }],
      ...(excludeId || excludeStudentId ? {
        NOT: {
          OR: [
            ...(excludeId ? [{ id: excludeId }] : []),
            ...(excludeStudentId ? [{ studentId: excludeStudentId }] : []),
          ],
        },
      } : {}),
    },
    select: { id: true, emailAddress: true, mobileNumber: true },
  });

  if (existing) {
    if (existing.emailAddress === emailAddress) {
      throw new AppError("Student email already exists in this branch", 409);
    }

    if (existing.mobileNumber === mobileNumber) {
      throw new AppError("Student mobile number already exists in this branch", 409);
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: emailAddress },
        { phone: mobileNumber },
      ],
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true, email: true, phone: true },
  });

  if (existingUser) {
    if (existingUser.email === emailAddress) {
      throw new AppError("Student email already exists", 409);
    }

    if (existingUser.phone === mobileNumber) {
      throw new AppError("Student mobile number already exists", 409);
    }
  }
}

function createTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function createResetTokenArtifacts() {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  // Credential links remain valid until the recipient uses the link to set a password.
  const expiresAt = new Date("9999-12-31T23:59:59.999Z");

  return { resetToken, tokenHash, expiresAt };
}

function buildBranchStudentUserCode(branchCode, studentId) {
  return normalizeBranchEntityId(studentId, branchCode, "STU");
}

async function findBranchStudentLoginUser(student) {
  const branch = student?.branchId
    ? await prisma.branch.findUnique({
        where: { id: student.branchId },
        select: { branchId: true },
      })
    : null;
  const branchUserCode = branch?.branchId
    ? buildBranchStudentUserCode(branch.branchId, student.studentId)
    : null;

  return prisma.user.findFirst({
    where: {
      OR: [
        { userCode: student.studentId },
        ...(branchUserCode ? [{ userCode: branchUserCode }] : []),
        ...(student.emailAddress ? [{ email: student.emailAddress }] : []),
      ],
    },
  });
}

async function ensureBranchStudentAccess(actor, studentId) {
  const branchProfile = await getBranchContext(actor);
  const requestedStudentId = normalizeString(studentId);

  // Student IDs are the public identity used by the dashboard. Resolve them
  // before falling back to the internal database id so two students with the
  // same name (or overlapping identifiers) can never select the wrong record.
  const publicStudentWhere = {
    ...(branchProfile?.id ? { branchId: branchProfile.id } : {}),
    studentId: requestedStudentId,
  };
  const publicStudent = requestedStudentId
    ? await prisma.branchStudent.findFirst({ where: publicStudentWhere, select: { id: true } })
    : null;
  if (publicStudent?.id) {
    return { branchProfile, where: { id: publicStudent.id } };
  }

  if (!branchProfile?.id) {
    return { branchProfile: null, where: { id: requestedStudentId } };
  }

  return {
    branchProfile,
    where: { branchId: branchProfile.id, id: requestedStudentId },
  };
}

export async function listBranchStudents(query = {}, actor = null) {
  const { page, limit, skip, take } = buildPagination(query);
  const summaryOnly = ['1', 'true', 'yes'].includes(normalizeString(query.summary).toLowerCase());
  // Dashboard callers can request the student rows without recalculating academic progress for every enrollment.
  // The dedicated bulk report endpoint handles completion details for completed courses.
  const includeAcademicProgress = !['0', 'false', 'no'].includes(
    normalizeString(query.includeProgress).toLowerCase(),
  );
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder);
  let branchProfile = await getBranchContext(actor);
  let scopedQuery = query;

  if (normalizeString(actor?.role).toUpperCase() === "FACULTY") {
    const faculty = await prisma.branchFaculty.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          ...(normalizeString(actor?.userCode) ? [{ facultyId: normalizeString(actor.userCode) }] : []),
          ...(normalizeString(actor?.email) ? [{ email: { equals: normalizeString(actor.email), mode: "insensitive" } }] : []),
        ],
      },
      select: { id: true, branchId: true, facultyId: true, name: true },
    });

    if (!faculty?.branchId) {
      throw new AppError("Faculty profile not found", 404);
    }

    branchProfile = { id: faculty.branchId };
    scopedQuery = {
      ...query,
      branchId: faculty.branchId,
      facultyId: faculty.facultyId || faculty.id,
      facultyName: faculty.name,
    };
  }

  // Listing students must remain read-only; identifier migration belongs in an explicit admin flow.
  const where = buildBranchStudentWhere(scopedQuery, branchProfile);
  // Keep completed admissions in the response. The dashboard uses the
  // admission date to calculate monthly admissions, so removing completed
  // records here makes that metric drop after a course is completed.
  where.AND = [
    ...(Array.isArray(where.AND) ? where.AND : []),
    { discontinuationRequests: { none: { status: "APPROVED" } } },
  ];
  const currentMonth = getCurrentMonthDateRange();

  const [total, rows] = await prisma.$transaction([
    prisma.branchStudent.count({ where }),
    prisma.branchStudent.findMany({
      where,
      orderBy: buildBranchStudentOrderBy(sortBy, sortOrder),
      skip,
      take,
      ...(summaryOnly ? {
        select: {
          id: true,
          branchId: true,
          sourceLeadId: true,
          admissionSource: true,
          studentId: true,
          studentName: true,
          emailAddress: true,
          currentStatus: true,
          customCurrentStatus: true,
          purpose: true,
          customPurpose: true,
          educationLevel: true,
          educationStatus: true,
          passedOutYear: true,
          designation: true,
          companyName: true,
          courseId: true,
          courseName: true,
          courseProgress: true,
          courseAmount: true,
          arrangementType: true,
          enrollmentType: true,
          firstCourseId: true,
          installments: { select: { id: true, installmentNumber: true, amount: true, amountPaid: true, dueDate: true, paymentMethod: true, remarks: true } },
          payments: { orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }], select: { id: true, amount: true, paymentDate: true, paymentMode: true, transactionReference: true, payAgainst: true, notes: true, receiptNumber: true } },
          batchId: true,
          batchName: true,
          recordStatus: true,
          createdAt: true,
          updatedAt: true,
          courseEnrollments: { orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }] },
        },
      } : { include: {
        course: {
          select: {
            id: true,
            name: true,
            courseCode: true,
            courseType: true,
            duration: true,
            hours: true,
            mode: true,
            status: true,
          },
        },
        installments: {
          orderBy: { installmentNumber: "asc" }
        },
        courseEnrollments: { orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }] },
        discontinuationRequests: {
          where: { status: "APPROVED" },
          select: { status: true, accessDeactivationAt: true, superAdminReviewedAt: true },
          take: 1,
        },
        calendarAttendanceRecords: {
          where: {
            attendanceDate: {
              gte: currentMonth.start,
              lte: currentMonth.end,
            },
          },
          orderBy: { attendanceDate: "asc" },
          select: {
            attendanceDate: true,
            status: true,
            markedAt: true,
            notes: true,
          },
        },
      } }),
    }),
  ]);

  let completionByStudentId = new Map();
  if (includeAcademicProgress) {
    const reportSentByBatch = new Map();
    completionByStudentId = new Map(await Promise.all(rows.map(async (student) => {
    try {
      const enrollments = Array.isArray(student.courseEnrollments) && student.courseEnrollments.length
        ? student.courseEnrollments
        : [{
          courseId: student.courseId,
          batchId: student.batchId,
          courseProgress: student.courseProgress,
        }];
      const entries = await Promise.all(enrollments.filter((entry) => entry?.courseId).map(async (entry) => {
        const progress = await getAcademicTestProgressForStudent({
          ...student,
          courseId: entry.courseId,
          batchId: entry.batchId || student.batchId,
          batchCycleId: entry.batchCycleId,
          courseProgress: entry.courseProgress,
        });
        const paidProgress = calculateCoursePaidProgress(student, entry.courseId);
        const reportSent = await academicReportsFullySentForBatch(entry.batchId || student.batchId, entry.batchCycleId, reportSentByBatch);
        return [entry.courseId, {
          academicTestProgress: progress,
          paidProgress,
          // Do not trust a stale courseCompletedAt from a previous batch cycle.
          // The current enrollment is complete only when its own course progress
          // and academic-test/project progress are complete.
          status: reportSent ? courseCompletionFromProgressAndTests(entry.courseProgress, progress, paidProgress) : "IN_PROGRESS",
        }];
      }));
      const byCourse = Object.fromEntries(entries);
      const primaryPaidProgress = calculateCoursePaidProgress(student, student.courseId);
      const primaryEntry = enrollments.find((entry) => entry?.courseId === student.courseId) || enrollments[0];
      const primaryReportSent = await academicReportsFullySentForBatch(student.batchId, primaryEntry?.batchCycleId, reportSentByBatch);
      const primary = byCourse[student.courseId] || {
        academicTestProgress: { totalTests: 0, completedTests: 0, pendingTests: 0, percentage: 0 },
        paidProgress: primaryPaidProgress,
        status: primaryReportSent ? courseCompletionFromProgressAndTests(student.courseProgress, null, primaryPaidProgress) : "IN_PROGRESS",
      };
      return [student.id, { ...primary, byCourse }];
    } catch (error) {
      console.warn("Unable to calculate branch student academic test progress", error);
      const fallback = { totalTests: 0, completedTests: 0, pendingTests: 0, percentage: 0 };
      const paidProgress = calculateCoursePaidProgress(student, student.courseId);
      return [student.id, {
        academicTestProgress: fallback,
        paidProgress,
        status: courseCompletionFromProgressAndTests(student.courseProgress, fallback, paidProgress),
        byCourse: {},
      }];
    }
  })))
  }

  return {
    data: rows.map((student) => {
      const computed = completionByStudentId.get(student.id) || {};
      const byCourse = computed.byCourse || {};
      const courseEnrollments = Array.isArray(student.courseEnrollments)
        ? student.courseEnrollments.map((enrollment) => {
          const courseResult = byCourse[enrollment.courseId] || {};
          return {
            ...enrollment,
            academicTestProgress: courseResult.academicTestProgress || null,
            paidProgress: courseResult.paidProgress || null,
            courseCompletion: courseResult.status || null,
            courseCompletionStatus: courseResult.status || null,
          };
        })
        : student.courseEnrollments;

      return toBranchStudentSummary({
        ...student,
        courseEnrollments,
        academicTestProgress: computed.academicTestProgress,
        academicTestProgressByCourse: Object.fromEntries(Object.entries(byCourse).map(([courseId, value]) => [courseId, value.academicTestProgress])),
        paidProgress: computed.paidProgress,
        courseCompletion: computed.status,
        courseCompletionByCourse: Object.fromEntries(Object.entries(byCourse).map(([courseId, value]) => [courseId, value.status])),
      });
    }),
    meta: buildPaginationMeta(total, page, limit),
  };
}

function lifecycleSearchMatch(row, search) {
  const needle = normalizeSearchKey(search)
  if (!needle) return true
  return [row.studentId, row.studentName, row.mobileNumber, row.emailAddress, row.courseName, row.batchName, row.facultyName]
    .some((value) => normalizeSearchKey(value).includes(needle))
}

export async function getCompletedCourseAcademicTests(student, enrollment) {
  const batchKey = normalizeString(enrollment.batchId || student.batchId)
  if (!batchKey || !enrollment.courseId) return []
  const batch = await prisma.branchBatch.findFirst({
    where: { branchId: student.branchId, OR: [{ id: batchKey }, { batchId: batchKey }] },
    select: { id: true },
  })
  if (!batch) return []

  const configuredTests = await prisma.academicTest.findMany({
    where: { branchCourseId: enrollment.courseId, batches: { some: { branchBatchId: batch.id } } },
    select: { items: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, testType: true } } },
  })
  const items = configuredTests.flatMap((test) => test.items || []).sort((left, right) => left.sequence - right.sequence)
  if (!items.length) return []

  const schedules = await prisma.academicScheduledTest.findMany({
    where: { branchBatchId: batch.id, academicTestItemId: { in: items.map((item) => item.id) }, status: { not: "CANCELLED" } },
    orderBy: [{ academicTestItemId: "asc" }, { isRetest: "asc" }, { attemptNumber: "asc" }, { createdAt: "asc" }],
    select: { id: true, academicTestItemId: true, testNumber: true, testDate: true, status: true, isRetest: true, retestStudentId: true, originalScheduleId: true, parentScheduleId: true, attemptNumber: true, createdAt: true },
  })
  const [submissions, projectSubmissions, projectConfigs] = await Promise.all([
    prisma.academicTestSubmission.findMany({
      where: { branchStudentId: student.id, academicTestId: { in: schedules.map((schedule) => schedule.id) } },
      select: { academicTestId: true, status: true, resultStatus: true, percentage: true, obtainedMarks: true, totalMarks: true, submittedAt: true },
    }),
    prisma.academicProjectSubmission.findMany({
      where: { branchStudentId: student.id, academicTestId: { in: schedules.map((schedule) => schedule.id) } },
      select: { academicTestId: true, status: true, marksAwarded: true },
    }),
    prisma.academicTestProject.findMany({
      where: { academicTestItemId: { in: items.map((item) => item.id) }, branchBatchId: batch.id },
      select: { academicTestItemId: true, projectMarks: true },
    }),
  ])
  const submissionByTestId = new Map(submissions.map((submission) => [submission.academicTestId, submission]))
  const projectSubmissionByTestId = new Map(projectSubmissions.map((submission) => [submission.academicTestId, submission]))
  const projectConfigByItemId = new Map(projectConfigs.map((config) => [config.academicTestItemId, config]))
  const itemById = new Map(items.map((item) => [item.id, item]))
  const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]))

  const latestScheduleForItem = (itemId) => {
    const original = schedules.find((schedule) => schedule.academicTestItemId === itemId && !schedule.isRetest)
    if (!original) return null

    const belongsToOriginal = (schedule) => {
      if (!schedule.isRetest) return false
      if (schedule.academicTestItemId === itemId && !schedule.originalScheduleId && !schedule.parentScheduleId) return true
      let parentId = schedule.originalScheduleId || schedule.parentScheduleId
      const visited = new Set()
      while (parentId && !visited.has(parentId)) {
        if (parentId === original.id) return true
        visited.add(parentId)
        const parent = scheduleById.get(parentId)
        parentId = parent?.originalScheduleId || parent?.parentScheduleId
      }
      return false
    }

    const retests = schedules
      .filter((schedule) => belongsToOriginal(schedule) && (!schedule.retestStudentId || schedule.retestStudentId === student.id))
      .sort((left, right) => {
        const attemptDifference = Number(right.attemptNumber || 0) - Number(left.attemptNumber || 0)
        if (attemptDifference) return attemptDifference
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
      })
    const conductedRetest = retests.find((schedule) => {
      const submission = submissionByTestId.get(schedule.id)
      const status = String(submission?.status || "").toUpperCase()
      const hasTestResult = Boolean(submission?.submittedAt) || ["EVALUATED", "SUBMITTED"].includes(status)
      const hasProjectResult = projectSubmissionByTestId.get(schedule.id)?.marksAwarded != null
      return hasTestResult || hasProjectResult
    })
    return conductedRetest || retests[0] || original
  }


  return items.map((item) => {
    const schedule = latestScheduleForItem(item.id)
    if (!schedule) return null
    const submission = submissionByTestId.get(schedule.id)
    const originalSchedule = schedules.find((candidate) => candidate.academicTestItemId === item.id && !candidate.isRetest)
    const projectSchedule = item.testType === "TEST_AND_PROJECT" ? originalSchedule : schedule
    const projectSubmission = projectSubmissionByTestId.get(schedule.id) || (projectSchedule ? projectSubmissionByTestId.get(projectSchedule.id) : null)
    const status = String(submission?.status || "NOT_STARTED").toUpperCase()
    const projectTotal = Number(projectConfigByItemId.get(item.id)?.projectMarks || 0)
    const marksAwarded = projectSubmission?.marksAwarded == null ? null : Number(projectSubmission.marksAwarded)
    const percentage = submission?.percentage == null ? null : Number(submission.percentage)
    const hasTest = ["TEST", "TEST_AND_PROJECT"].includes(item.testType)
    const hasProject = ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)
    const testCompleted = !hasTest || ["EVALUATED", "SUBMITTED"].includes(status)
    const projectCompleted = !hasProject || marksAwarded != null
    const completed = testCompleted && projectCompleted
    const testObtained = hasTest && submission?.obtainedMarks != null ? Number(submission.obtainedMarks) : 0
    const testTotal = hasTest && submission?.totalMarks != null ? Number(submission.totalMarks) : 0
    const totalMarks = testTotal + (hasProject ? projectTotal : 0)
    const obtainedMarks = testObtained + (hasProject && marksAwarded != null ? marksAwarded : 0)
    const combinedPercentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : null
    const testPercentage = testTotal > 0 ? Number(((testObtained / testTotal) * 100).toFixed(2)) : null
    const projectPercentage = projectTotal > 0 && marksAwarded != null ? Number(((marksAwarded / projectTotal) * 100).toFixed(2)) : null
    const displayValue = item.testType === "TEST_AND_PROJECT"
      ? `Test: ${testObtained}/${testTotal} - ${testPercentage ?? 0}%\nProject: ${marksAwarded == null ? "-" : `${marksAwarded}/${projectTotal} - ${projectPercentage}%`}`
      : item.testType === "PROJECT"
        ? `Project: ${marksAwarded == null ? "-" : `${marksAwarded}/${projectTotal} - ${projectPercentage}%`}`
        : `${totalMarks > 0 ? `${obtainedMarks}/${totalMarks}` : "-"}${completed && Number.isFinite(combinedPercentage) ? ` - ${Number(combinedPercentage).toFixed(2).replace(/\.00$/, "")}%` : ""}`
    return {
      label: `Academic Test ${schedule.testNumber || item.sequence || ""}`.trim(),
      value: displayValue,
      testNumber: Number(schedule.testNumber || item.sequence),
      testType: item.testType || null,
      testDate: schedule.testDate || null,
      status,
      resultStatus: submission?.resultStatus || null,
      percentage: Number.isFinite(combinedPercentage) ? combinedPercentage : (Number.isFinite(percentage) ? percentage : null),
      obtainedMarks: totalMarks > 0 ? obtainedMarks : null,
      totalMarks: totalMarks > 0 ? totalMarks : null,
      submittedAt: submission?.submittedAt || null,
      marksAwarded,
      projectTotalMarks: projectTotal,
      projectPercentage: marksAwarded != null && projectTotal > 0 ? Number(((marksAwarded / projectTotal) * 100).toFixed(2)) : null,
    }
  }).filter(Boolean)
}
async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0
  const workerCount = Math.min(Math.max(1, concurrency), items.length)
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) return
      results[index] = await mapper(items[index], index)
    }
  }))
  return results
}
export async function listBranchStudentLifecycle(query = {}, actor = null) {
  const lifecycle = normalizeString(query.lifecycle || "COMPLETED").toUpperCase()
  if (!['COMPLETED', 'DISCONTINUED'].includes(lifecycle)) throw new AppError("Invalid student lifecycle", 400)
  const branchProfile = await getBranchContext(actor)
  const branchId = branchProfile?.id || normalizeString(query.branchId)
  const requestedStudentId = normalizeString(query.studentId)
  const requestedCourseId = normalizeString(query.courseId)
  const includeDetails = String(query.includeDetails || '').toLowerCase() === 'true'
  const lifecycleWhere = {
    ...(branchId ? { branchId } : {}),
    ...(lifecycle === "DISCONTINUED"
      ? { OR: [{ discontinuationRequests: { some: { status: "APPROVED" } } }, { courseEnrollments: { some: { importedLifecycleStatus: "DISCONTINUED" } } }] }
      : {}),
    ...(requestedStudentId ? { AND: [{ OR: [{ studentId: requestedStudentId }, { id: requestedStudentId }] }] } : {}),
  }
  const students = await prisma.branchStudent.findMany({
    where: lifecycleWhere,
    include: {
      branch: { select: { branchId: true, branchName: true, branchAdminName: true } },
      course: { select: { id: true, name: true, actualFees: true, registrationFees: true, afterDiscount: true, mode: true } },
      installments: { orderBy: { installmentNumber: "asc" } },
      payments: { orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }], select: { amount: true, paymentMode: true, receiptNumber: true, payAgainst: true } },
      calendarAttendanceRecords: { select: { courseId: true, status: true } },
      facultyTodayWorkStudentEntries: {
        select: {
          facultyTodayWorkEntry: {
            select: {
              courseId: true,
              applyToAllStudents: true,
              studentIds: true,
              courseProgress: true,
              moduleId: true,
              submoduleIds: true,
              branchCourse: { select: { modules: { select: { id: true, submodules: { select: { id: true } } } } } },
            },
          },
        },
      },
      courseEnrollments: { orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }], include: { course: { select: { id: true, name: true, actualFees: true, registrationFees: true, afterDiscount: true, mode: true } } } },
      discontinuationRequests: { where: { status: "APPROVED" }, orderBy: { updatedAt: "desc" }, select: { id: true, status: true, courseId: true, reason: true, updatedAt: true } },
    },
  })

  const records = (await mapWithConcurrency(students, 3, async (student) => {
    const studentRecords = []
    const enrollments = student.courseEnrollments.length ? student.courseEnrollments : [{
      id: null, courseId: student.courseId, courseName: student.courseName, facultyName: student.facultyName, batchId: student.batchId, batchName: student.batchName,
      batchTiming: student.batchTiming, scheduleType: student.classSchedule, mode: student.courseMode, startDate: student.courseStartDate, endDate: student.courseEndDate,
      courseProgress: student.courseProgress, courseCompletedAt: student.courseCompletedAt, importedAcademicResults: student.importedAcademicResults, totalCourseAmount: student.courseAmount, finalCourseAmount: student.courseAmount, status: student.recordStatus, course: student.course,
    }]
    const courseAmounts = enrollments.map((item) => Math.max(Number(item.finalCourseAmount ?? item.totalCourseAmount ?? item.courseAmount ?? item.course?.afterDiscount ?? student.courseAmount ?? 0), 0))
    const paidByCourse = courseAmounts.map(() => 0)
    const scheduledByCourse = courseAmounts.map(() => 0)
    const distributeAmount = (amount, weights) => {
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
      let assigned = 0
      return weights.map((weight, index) => {
        const allocation = index === weights.length - 1
          ? Math.max(Number(amount) - assigned, 0)
          : Math.round((Number(amount) * weight) / Math.max(totalWeight, 1))
        assigned += allocation
        return allocation
      })
    }
    const allocateSequentially = (amount, capacities) => {
      let remaining = Math.max(Number(amount) || 0, 0)
      return capacities.map((capacity) => {
        const allocation = Math.min(remaining, Math.max(Number(capacity) || 0, 0))
        remaining -= allocation
        return allocation
      })
    }
    for (const installment of student.installments || []) {
      const amount = Math.max(Number(installment.amount || 0), 0)
      const paid = Math.min(amount, Math.max(Number(installment.amountPaid || 0), 0))
      const isSequential = String(student.arrangementType || '').toUpperCase() === 'SEQUENTIAL'
      const allocations = isSequential
        ? allocateSequentially(amount, courseAmounts.map((total, index) => total - scheduledByCourse[index]))
        : distributeAmount(amount, courseAmounts)
      const paidAllocations = isSequential
        ? allocateSequentially(paid, allocations)
        : distributeAmount(paid, allocations)
      allocations.forEach((allocation, index) => {
        scheduledByCourse[index] += allocation
        paidByCourse[index] += Math.min(allocation, paidAllocations[index])
      })
    }
    for (const enrollment of enrollments) {
      if (requestedCourseId && String(enrollment.courseId || '').trim() !== requestedCourseId) continue
      // Historical report imports may contain a course name without a
      // catalog course id. They still belong in the lifecycle history view.
      if (!enrollment.courseId && !enrollment.courseName && !student.courseName) continue
      const request = student.discontinuationRequests.find((item) => item.courseId === enrollment.courseId)
        || student.discontinuationRequests.find((item) => !item.courseId)
        || (student.discontinuationRequests.length && enrollments.length === 1 ? student.discontinuationRequests[0] : null)
      const importedLifecycleStatus = String(enrollment.importedLifecycleStatus || "").toUpperCase()
      const isImportedCompleted = importedLifecycleStatus === "COMPLETED"
      const isDiscontinued = Boolean(request) || importedLifecycleStatus === "DISCONTINUED"
      if (lifecycle === "DISCONTINUED" && !isDiscontinued) continue
      const paidProgress = calculateCoursePaidProgress(student, enrollment.courseId)
      const studentKeyValues = new Set([student.id, student.studentId].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))
      const matchingWorkEntries = (student.facultyTodayWorkStudentEntries || [])
        .map((entry) => entry.facultyTodayWorkEntry)
        .filter((entry) => String(entry?.courseId || "") === String(enrollment.courseId))
        .filter((entry) => {
          if (entry?.applyToAllStudents) return true
          const ids = Array.isArray(entry?.studentIds)
            ? entry.studentIds
            : typeof entry?.studentIds === "string"
              ? (() => { try { const parsed = JSON.parse(entry.studentIds); return Array.isArray(parsed) ? parsed : [] } catch { return [] } })()
              : []
          return ids.some((value) => studentKeyValues.has(String(value || "").trim().toLowerCase()))
        })
      const facultyProgressValues = matchingWorkEntries
        .map((entry) => Number(entry?.courseProgress))
        .filter(Number.isFinite)
      const facultyModuleTotals = matchingWorkEntries[0]?.branchCourse?.modules || []
      const completedSubmodulesByModule = new Map()
      matchingWorkEntries.forEach((entry) => {
        const moduleId = String(entry?.moduleId || "")
        if (!moduleId) return
        const selectedSubmodules = Array.isArray(entry?.submoduleIds)
          ? entry.submoduleIds
          : typeof entry?.submoduleIds === "string"
            ? (() => { try { const parsed = JSON.parse(entry.submoduleIds); return Array.isArray(parsed) ? parsed : [] } catch { return [] } })()
            : []
        const completed = completedSubmodulesByModule.get(moduleId) || new Set()
        selectedSubmodules.forEach((value) => completed.add(String(value || "").trim()))
        completedSubmodulesByModule.set(moduleId, completed)
      })
      const totalSubmodules = facultyModuleTotals.reduce((sum, module) => sum + (module.submodules?.length || 0), 0)
      const completedSubmodules = facultyModuleTotals.reduce((sum, module) => sum + (completedSubmodulesByModule.get(module.id)?.size || 0), 0)
      if (totalSubmodules > 0) facultyProgressValues.push((completedSubmodules / totalSubmodules) * 100)
      const effectiveCourseProgress = Math.min(100, Math.max(
        0,
        Number(enrollment.courseProgress) || 0,
        ...facultyProgressValues,
      ))
      if (lifecycle === "COMPLETED" && (isDiscontinued || (!isImportedCompleted && effectiveCourseProgress < 100))) continue
      const academicProgress = lifecycle === "COMPLETED" && !enrollment.courseCompletedAt && !isImportedCompleted
        ? await getAcademicTestProgressForStudent({ ...student, courseId: enrollment.courseId, batchId: enrollment.batchId || student.batchId, courseProgress: effectiveCourseProgress })
        : null
      const completionStatus = lifecycle === "COMPLETED"
        ? (isImportedCompleted || enrollment.courseCompletedAt
          ? "COMPLETED"
          : courseCompletionFromProgressAndTests(effectiveCourseProgress, academicProgress))
        : "DISCONTINUED"
      if (lifecycle === "COMPLETED" && completionStatus !== "COMPLETED") continue
      const attendance = student.calendarAttendanceRecords.filter((item) => !item.courseId || item.courseId === enrollment.courseId)
      const present = attendance.filter((item) => item.status === "PRESENT").length
      const attendancePercentage = attendance.length ? Math.round((present / attendance.length) * 1000) / 10 : null
      const totalFees = Number(enrollment.finalCourseAmount ?? enrollment.totalCourseAmount ?? enrollment.course?.afterDiscount ?? student.courseAmount ?? 0)
      const enrollmentIndex = enrollments.findIndex((item) => String(item.courseId || '') === String(enrollment.courseId || ''))
      const paidAmount = Math.min(totalFees, Math.round(paidByCourse[Math.max(enrollmentIndex, 0)] || 0))
      const academicTests = lifecycle === "COMPLETED" && includeDetails
        ? await getCompletedCourseAcademicTests(student, enrollment)
        : []
      studentRecords.push({
        recordId: enrollment.id || `${student.id}:${enrollment.courseId}`, createdAt: enrollment.updatedAt || enrollment.createdAt || student.updatedAt || student.createdAt || null, updatedAt: enrollment.updatedAt || student.updatedAt || null, branchId: student.branchId, branchName: student.branch?.branchName, branchAdminName: student.branch?.branchAdminName,
        studentId: student.studentId, studentName: student.studentName, parentName: student.parentName, parentSpouseNumber: student.parentSpouseNumber, mobileNumber: student.mobileNumber, emailAddress: student.emailAddress, linkedInUrl: student.linkedInUrl, currentStatus: student.currentStatus, customCurrentStatus: student.customCurrentStatus, purpose: student.purpose, customPurpose: student.customPurpose, qualification: student.qualification, educationLevel: student.educationLevel, educationStatus: student.educationStatus, passedOutYear: student.passedOutYear, designation: student.designation, companyName: student.companyName, source: student.source || null,
        courseId: enrollment.courseId, courseName: enrollment.courseName || enrollment.course?.name || student.courseName, courseStartDate: enrollment.startDate || student.courseStartDate, courseEndDate: enrollment.endDate || student.courseEndDate,
        scheduleType: enrollment.scheduleType || student.classSchedule, classSchedule: enrollment.scheduleType || student.classSchedule, mode: enrollment.mode || enrollment.course?.mode || student.courseMode, courseMode: enrollment.mode || enrollment.course?.mode || student.courseMode,
        batchName: enrollment.batchName || student.batchName, batchTiming: enrollment.batchTiming || student.batchTiming, facultyName: enrollment.facultyName || student.facultyName, paymentPlanLabel: enrollment.paymentPlan || student.paymentPlan || null, attendancePercentage,
        courseFees: enrollment.totalCourseAmount ?? enrollment.course?.actualFees ?? student.courseAmount, registrationFees: enrollment.course?.registrationFees ?? null, totalFees,
        installment1: student.installments[0]?.amount ?? null,
        installment2: student.installments[1]?.amount ?? null,
        installment3: student.installments[2]?.amount ?? null,
        paidAmount, pendingAmount: Math.max(totalFees - paidAmount, 0), paymentMode: student.payments.length === 1 ? student.payments[0].paymentMode : student.payments.length > 1 ? "Multiple" : null, receiptNumber: student.payments.length === 1 ? student.payments[0].receiptNumber : null,
        studentStatus: isDiscontinued ? "Discontinued" : completionStatus, lifecycleStatus: isDiscontinued ? "DISCONTINUED" : completionStatus, courseProgress: effectiveCourseProgress, courseCompletedAt: enrollment.courseCompletedAt || null, remarks: request?.reason || student.remarks || null,
        paidInstallments: (student.installments || []).map((installment) => { const number = Number(installment.installmentNumber || 0); const payment = (student.payments || []).find((item) => new RegExp(`installment\\s*${number}\\b`, "i").test(String(item.payAgainst || ""))); return { number, amount: installment.amount, paymentMode: payment?.paymentMode || installment.paymentMethod || "N/A", receiptNumber: payment?.receiptNumber || "N/A" }; }),
        academicTests: [...academicTests, ...Object.entries(enrollment.importedAcademicResults || student.importedAcademicResults || {}).filter(([, value]) => value !== null && value !== undefined && value !== "").map(([field, value]) => ({ label: field === "academicProject" ? "Academic Project" : `Assessment-${String(field.replace("assessment", "")).padStart(2, "0")}`, value: `${value}%` }))], academicTestProgress: academicProgress, discontinuationRequestId: request?.id || null,
      })
    }
    return studentRecords
  })).flat()
  const courseFilteredRecords = requestedCourseId
    ? records.filter((row) => String(row.courseId || '').trim() === requestedCourseId)
    : records
  const filtered = courseFilteredRecords.filter((row) => lifecycleSearchMatch(row, query.search))
  const sortBy = ['createdAt', 'studentName', 'courseName', 'courseStartDate', 'courseEndDate'].includes(normalizeString(query.sortBy)) ? normalizeString(query.sortBy) : 'createdAt'
  const sortOrder = normalizeString(query.sortOrder).toLowerCase() === 'asc' ? 1 : -1
  filtered.sort((left, right) => {
    if (sortBy === 'createdAt') {
      const leftTime = new Date(left.createdAt || left.updatedAt || 0).getTime()
      const rightTime = new Date(right.createdAt || right.updatedAt || 0).getTime()
      if (leftTime !== rightTime) return (rightTime - leftTime) * (sortOrder === 1 ? -1 : 1)
    }
    const comparison = String(left[sortBy] || '').localeCompare(String(right[sortBy] || ''), undefined, { numeric: true, sensitivity: 'base' })
    if (comparison !== 0) return comparison * sortOrder
    return String(left.recordId || left.studentId || '').localeCompare(String(right.recordId || right.studentId || ''), undefined, { numeric: true, sensitivity: 'base' })
  })
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  const total = filtered.length
  return { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }
}

export async function createBranchStudent(payload, actor) {
  const actorRole = normalizeString(actor?.role).toUpperCase();
  const sourceLeadId = normalizeString(payload.sourceLeadId);
  let sourceLead = null;
  let branchProfile = await getBranchContext(actor);
  if (actorRole === "SALES_ADMIN" || (actorRole === "BRANCH_ADMIN" && sourceLeadId)) {
    if (!sourceLeadId) throw new AppError("Sales Admin student creation must come from a HOT lead", 403);
    sourceLead = await prisma.lead.findFirst({ where: { id: sourceLeadId, deletedAt: null }, include: { branch: { select: { id: true, branchId: true, branchName: true, branchEmail: true, adminUserId: true, status: true } } } });
    if (!sourceLead) throw new AppError("Source lead not found", 404);
    const actorBranchId = normalizeString(branchProfile?.id || actor?.branchId);
    const hasBranchAccess = actorRole === "BRANCH_ADMIN"
      ? actorBranchId === normalizeString(sourceLead.branchId)
      : Boolean(await prisma.salesAdminBranch.findUnique({ where: { salesAdminId_branchId: { salesAdminId: normalizeString(actor?.userId || actor?.id), branchId: sourceLead.branchId } }, select: { id: true } }));
    if (!hasBranchAccess || normalizeString(payload.branchId) !== normalizeString(sourceLead.branchId)) throw new AppError("You do not have permission to admit a student for this branch", 403);
    if (sourceLead.branch.status !== "ACTIVE") throw new AppError("The lead branch is inactive", 400);
    const existingAdmission = await prisma.branchStudent.findUnique({ where: { sourceLeadId }, include: { installments: { orderBy: { installmentNumber: "asc" } }, payments: { orderBy: { paymentDate: "asc" } }, courseEnrollments: { orderBy: { sequenceOrder: "asc" } } } });
    if (existingAdmission) return toBranchStudentSummary(existingAdmission);
    if (sourceLead.stage !== "HOT" || sourceLead.status === "CONVERTED") throw new AppError("Only an unconverted HOT lead can be admitted", 400);
    branchProfile = sourceLead.branch;
  }
  const branchId = branchProfile?.id || normalizeString(payload.branchId);

  if (!branchId) {
    throw new AppError("Branch ID is required", 400);
  }

  const validatedEnrollmentInput = validateCourseEnrollmentInput(payload, branchId);

  console.log("[createBranchStudent] incoming payload keys:", Object.keys(payload));
  let studentData, installmentSchedule;
  try {
    ({ studentData, installmentSchedule } = buildBranchStudentPayload(payload));
  } catch (err) {
    console.error("[createBranchStudent] validation error:", err.message);
    throw err;
  }
  const firstSequentialEnrollment = validatedEnrollmentInput.arrangementType === "SEQUENTIAL"
    ? validatedEnrollmentInput.enrollments.find((item) => item.courseId === validatedEnrollmentInput.firstCourseId)
    : null;
  if (firstSequentialEnrollment) {
    Object.assign(studentData, {
      courseId: firstSequentialEnrollment.courseId,
      courseName: firstSequentialEnrollment.courseName,
      courseMode: firstSequentialEnrollment.mode,
      classSchedule: firstSequentialEnrollment.scheduleType,
      batchId: firstSequentialEnrollment.batchId,
      batchName: firstSequentialEnrollment.batchName,
      batchTiming: firstSequentialEnrollment.batchTiming,
      facultyId: firstSequentialEnrollment.facultyId,
      facultyName: firstSequentialEnrollment.facultyName,
      courseStartDate: firstSequentialEnrollment.startDate,
      courseEndDate: firstSequentialEnrollment.endDate,
      courseAmount: firstSequentialEnrollment.totalCourseAmount,
      paymentPlanId: firstSequentialEnrollment.paymentPlanId,
      paymentPlan: firstSequentialEnrollment.paymentPlan,
    });
  }
  const selectedBatchId = normalizeString(firstSequentialEnrollment?.batchId || payload.batchId || payload.batchEntryId);
  const assignedBatch = selectedBatchId
    ? await prisma.branchBatch.findFirst({
        where: {
          batchId: selectedBatchId,
          status: "ACTIVE",
          branchId,
          ...(studentData.courseId ? { courseId: studentData.courseId } : {}),
        },
        select: {
          id: true,
          branchId: true,
          batchId: true,
          batchName: true,
          batchTiming: true,
          totalSeats: true,
          offlineSeats: true,
          courseId: true,
          courseName: true,
          facultyId: true,
          facultyName: true,
          weekType: true,
          mode: true,
          courseStartDate: true,
          courseEndDate: true,
          weeklyOffDay: true,
        },
      })
    : null;

  if (selectedBatchId && !assignedBatch) {
    throw new AppError("Selected batch was not found in this branch", 400);
  }

  if (assignedBatch) {
    const requestedWeekType = normalizeString(firstSequentialEnrollment?.scheduleType || payload.weekType).toUpperCase();
    const requestedMode = normalizeString(firstSequentialEnrollment?.mode || payload.mode || payload.courseMode).toUpperCase();
    if ((requestedWeekType && requestedWeekType !== assignedBatch.weekType) || (requestedMode && requestedMode !== assignedBatch.mode)) throw new AppError("Selected batch does not match the selected course, week type, or mode.", 400);
    await ensureAvailableBatchCapacity(assignedBatch);
  }

  if (assignedBatch) {
    studentData.batchId = assignedBatch.batchId;
    studentData.batchName = assignedBatch.batchName;
    studentData.batchTiming = assignedBatch.batchTiming;
    studentData.courseId = studentData.courseId || assignedBatch.courseId;
    studentData.courseName = studentData.courseName || assignedBatch.courseName;
    studentData.facultyId = studentData.facultyId || assignedBatch.facultyId;
    studentData.facultyName = studentData.facultyName || assignedBatch.facultyName;
    studentData.weeklyOffDay = assignedBatch.weeklyOffDay || null;
    studentData.courseStartDate = studentData.courseStartDate || assignedBatch.courseStartDate;
    studentData.courseEndDate = studentData.courseEndDate || assignedBatch.courseEndDate;
  }
  const primaryEnrollment = validatedEnrollmentInput.enrollments.find((item) => (
    item.courseId === studentData.courseId
  )) || validatedEnrollmentInput.enrollments[0];
  if (primaryEnrollment) {
    studentData.courseAmount = Math.round(primaryEnrollment.finalCourseAmount);
  } else {
    const singleCourseDiscount = calculateCourseDiscount(
      studentData.courseAmount ?? payload.totalCourseAmount ?? payload.courseAmount ?? 0,
      payload.discountType,
      payload.discountValue ?? payload.studentDiscountAmount ?? 0,
    );
    studentData.courseAmount = Math.round(singleCourseDiscount.finalCourseAmount);
  }
  const feeCourse = studentData.courseId
    ? await prisma.branchCourse.findFirst({
        where: { id: studentData.courseId, branchId },
        select: { id: true, hours: true, duration: true, mode: true },
      })
    : null;
  const feePlan = await buildStudentFeePlan({
    studentData,
    installmentSchedule,
    payload,
    branchId,
    course: feeCourse,
  });
  Object.assign(studentData, feePlan.fields);
  installmentSchedule = feePlan.schedule;
  console.log("[createBranchStudent] studentData keys:", Object.keys(studentData));
  console.log("[createBranchStudent] studentData:", JSON.stringify(studentData, null, 2));
  console.log("[createBranchStudent] installmentSchedule count:", installmentSchedule.length);
  const actorId = actor?.id ?? null;
  const admissionSalesAdmin = sourceLeadId && actorRole === "SALES_ADMIN"
    ? await prisma.user.findUnique({ where: { id: actorId }, select: { fullName: true } })
    : null;
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  await ensureUniqueBranchStudentIdentity(studentData, branchId);

  const requestedStudentId = payload.studentId
    ? normalizeBranchEntityId(payload.studentId, branchProfile?.branchId || branchId, "STU")
    : "";
  let studentId = requestedStudentId;
  if (!studentId || await isStudentIdTaken(branchId, studentId)) {
    studentId = await generateUniqueStudentId(branchId);
  }

  let created = null;
  let alreadyConverted = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      created = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Branch" WHERE id = ${branchId} FOR UPDATE`;
        if (assignedBatch) await ensureAvailableBatchCapacity(assignedBatch, null, tx);
        let leadPaymentForAdmission = sourceLead;
        if (sourceLeadId) {
          await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${sourceLeadId} FOR UPDATE`;
          const duplicate = await tx.branchStudent.findUnique({ where: { sourceLeadId }, include: { installments: { orderBy: { installmentNumber: "asc" } }, payments: { orderBy: { paymentDate: "asc" } }, courseEnrollments: { orderBy: { sequenceOrder: "asc" } } } });
          if (duplicate) {
            alreadyConverted = true;
            return duplicate;
          }
          const currentLead = await tx.lead.findFirst({ where: { id: sourceLeadId, branchId, stage: "HOT", status: { not: "CONVERTED" }, deletedAt: null }, select: { id: true, leadId: true, studentName: true, admissionStatus: true, paymentStatus: true, paymentAmount: true } });
          if (!currentLead) throw new AppError("This lead is no longer available for admission", 409);
          leadPaymentForAdmission = currentLead;
        }
        const student = await tx.branchStudent.create({
          data: {
            branchId,
            studentId,
            ...(sourceLeadId ? { sourceLeadId, admissionSource: "SALES_CRM" } : {}),
            ...studentData,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        await syncBranchStudentCourseEnrollments(tx, student, payload);

        await syncStudentCourseEnd(tx, student);

        if (installmentSchedule.length > 0) {
          await tx.branchStudentInstallment.createMany({
            data: installmentSchedule.map(inst => ({
              ...inst,
              branchStudentId: student.id,
            }))
          });
        }

        const leadPaymentStatus = normalizeString(leadPaymentForAdmission?.paymentStatus).toUpperCase();
        const leadPaymentAmount = ["INITIAL_PAYMENT", "PARTIALLY_PAID", "PAID"].includes(leadPaymentStatus)
          ? Number(leadPaymentForAdmission?.paymentAmount ?? 0)
          : 0;
        if (Number.isFinite(leadPaymentAmount) && leadPaymentAmount > 0) {
          if (!Number.isInteger(leadPaymentAmount)) {
            throw new AppError("Lead payment credit must be a whole-rupee amount before admission", 400);
          }
          const installments = await tx.branchStudentInstallment.findMany({
            where: { branchStudentId: student.id },
            orderBy: [{ installmentNumber: "asc" }, { createdAt: "asc" }],
          });
          const totalFee = installments.reduce((sum, installment) => sum + Number(installment.amount || 0), 0)
            || Number(student.courseAmount || 0);
          if (leadPaymentAmount > totalFee) throw new AppError("Lead payment amount cannot exceed the course balance", 400);

          let remainingCredit = leadPaymentAmount;
          const allocations = [];
          for (const installment of installments) {
            if (remainingCredit <= 0) break;
            const installmentBalance = Math.max(Number(installment.amount || 0) - Number(installment.amountPaid || 0), 0);
            const allocatedAmount = Math.min(installmentBalance, remainingCredit);
            if (allocatedAmount <= 0) continue;
            const nextAmountPaid = Number(installment.amountPaid || 0) + allocatedAmount;
            const isPaid = nextAmountPaid >= Number(installment.amount || 0);
            await tx.branchStudentInstallment.update({
              where: { id: installment.id },
              data: {
                amountPaid: nextAmountPaid,
                status: isPaid ? "Paid" : "Partially Paid",
                paidAt: isPaid ? new Date() : installment.paidAt,
                paymentMethod: "Sales CRM",
                remarks: [installment.remarks, "Sales CRM lead payment credit (" + (normalizeString(leadPaymentForAdmission?.leadId) || sourceLeadId) + ")"].filter(Boolean).join(" / "),
              },
            });
            allocations.push({ installmentId: installment.id, amount: allocatedAmount, installmentNumber: installment.installmentNumber });
            remainingCredit -= allocatedAmount;
          }
          if (remainingCredit > 0) {
            if (installments.length) throw new AppError("Could not allocate the complete lead payment credit to installments", 400);
            allocations.push({ installmentId: null, amount: remainingCredit, installmentNumber: null });
          }

          const paymentDate = new Date();
          for (const [index, allocation] of allocations.entries()) {
            const receiptNumber = "REC-" + paymentDate.getFullYear() + "-" + String(Date.now()).slice(-4) + "-" + Math.floor(Math.random() * 900 + 100);
            await tx.branchStudentPayment.create({
              data: {
                receiptNumber,
                branchStudentId: student.id,
                courseId: student.courseId || null,
                branchId,
                amount: allocation.amount,
                paymentMode: "Sales CRM Credit",
                transactionReference: "LEAD:" + (normalizeString(leadPaymentForAdmission?.leadId) || sourceLeadId),
                paymentDate,
                collectedBy: admissionSalesAdmin?.fullName || null,
                notes: "Lead-stage payment amount applied to admission balance. Original tender type and payment date were not captured. Allocation " + (index + 1) + " of " + allocations.length + ".",
                payAgainst: allocation.installmentNumber ? "Sales CRM payment credit / Installment " + allocation.installmentNumber : "Sales CRM payment credit",
                installmentId: allocation.installmentId,
              },
            });
          }
        }

        const user = await tx.user.create({
          data: {
            userCode: buildBranchStudentUserCode(branchProfile?.branchId || branchId, studentId),
            fullName: studentData.studentName,
            email: studentData.emailAddress,
            phone: studentData.mobileNumber,
            role: "STUDENT",
            active: true,
            passwordHash,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            createdBy: "CREDENTIAL_EMAIL",
          },
        });

        const createdStudent = await tx.branchStudent.findUnique({
          where: { id: student.id },
          include: {
            installments: { orderBy: { installmentNumber: "asc" } },
            payments: { include: { installment: true }, orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }] },
            courseEnrollments: { orderBy: { sequenceOrder: "asc" } },
            discontinuationRequests: {
        where: { status: "APPROVED" },
        select: { status: true, accessDeactivationAt: true, superAdminReviewedAt: true },
        take: 1,
      },
          },
        });

        if (createdStudent) {
          await materializeBranchStudentLedgerEntries(tx, createdStudent);
          const discountedCourses = validatedEnrollmentInput.enrollments.filter((item) => item.discountAmount > 0);
          if (discountedCourses.length) {
            const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
            const firstDiscount = discountedCourses[0];
            const firstDiscountLabel = firstDiscount.discountType === "PERCENTAGE"
              ? `${firstDiscount.discountValue}%`
              : `${formatMoney(firstDiscount.discountValue)} fixed amount`;
            const hasCommonDiscount = discountedCourses.length > 1
              && discountedCourses.every((item) => item.discountType === firstDiscount.discountType);
            const totalDiscountValue = discountedCourses.reduce((sum, item) => sum + Number(item.discountValue || 0), 0);
            const commonDiscountNotice = hasCommonDiscount
              ? `Common discount: ${firstDiscount.discountType === "PERCENTAGE" ? `${totalDiscountValue}%` : formatMoney(totalDiscountValue)} total, split across ${discountedCourses.length} courses.`
              : "";
            const message = [
              `A ${discountedCourses.length > 1 ? "course fee discount has been provided" : `${firstDiscountLabel} course fee discount has been provided`} to the following student for the selected course${discountedCourses.length > 1 ? "s" : ""}.`,
              ...(commonDiscountNotice ? [commonDiscountNotice] : []),
              "",
              `Branch: ${branchProfile?.branchName || branchProfile?.branchId || branchId}`,
              `Student: ${studentData.studentName}`,
              ...discountedCourses.flatMap((item, index) => [
                "",
                `${discountedCourses.length > 1 ? `Course ${index + 1}: ` : "Course: "}${item.courseName || item.courseId}`,
                `Original Course Amount: ${formatMoney(item.totalCourseAmount)}`,
                `Discount: ${item.discountType === "PERCENTAGE" ? `${item.discountValue}%` : `${formatMoney(item.discountValue)} (Fixed Amount)`}`,
                `Discount Amount: ${formatMoney(item.discountAmount)}`,
                `Final Course Amount: ${formatMoney(item.finalCourseAmount)}`,
                "",
                `Information: The student has been provided a ${formatMoney(item.discountAmount)} discount, reducing the course fee from ${formatMoney(item.totalCourseAmount)} to ${formatMoney(item.finalCourseAmount)}.`,
              ]),
            ].join("\n");
            await createNotification({
              kind: "STUDENT_DISCOUNT_APPLIED",
              tone: "amber",
              title: "Student Course Discount Information",
              message,
              actionLabel: "View Student",
              targetBranchId: branchId,
              targetBranchEmail: branchProfile?.branchEmail || null,
              targetBranchName: branchProfile?.branchName || null,
              createdBy: actorId,
            }, tx);
          }
          if (sourceLeadId) {
            await tx.lead.update({ where: { id: sourceLeadId }, data: { status: "CONVERTED", admissionStatus: "ADMITTED", updatedById: actorId } });
            await tx.leadActivity.create({ data: { leadId: sourceLeadId, action: "LEAD_CONVERTED_TO_STUDENT", previousValue: { status: sourceLead.status, stage: sourceLead.stage }, newValue: { status: "CONVERTED", studentId: createdStudent.studentId, branchId }, createdById: actorId } });
            await tx.followUpReminder.updateMany({ where: { leadId: sourceLeadId, status: "PENDING" }, data: { status: "CANCELLED", cancelledAt: new Date() } });
            const fee = calculateAdmissionFeeDetails(createdStudent);
            const formatFee = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
            const admissionMessage = [
              `Sales Admin ${admissionSalesAdmin?.fullName || "Sales Admin"} completed admission for ${studentData.studentName}.`,
              `Student ID: ${createdStudent.studentId}. Lead ID: ${sourceLead.leadId}. Branch: ${branchProfile.branchName}.`,
              `Course: ${fee.courseName || studentData.courseName || "-"}. Faculty: ${studentData.facultyName || "-"}. Batch: ${studentData.batchName || "-"}. Training Mode: ${studentData.courseMode || "-"}. Schedule: ${studentData.classSchedule || "-"}.`,
              "",
              "Student Admission - Payment Details",
              `Total Course Fee: ${formatFee(fee.totalCourseFee)}`,
              `First Installment Amount: ${formatFee(fee.firstInstallmentAmount)}`,
              `Initial Amount Paid: ${formatFee(fee.initialAmountPaid)}`,
              `First Installment Amount Paid: ${formatFee(fee.firstInstallmentAmountPaid)}`,
              `Remaining First Installment Balance: ${formatFee(fee.firstInstallmentBalance)}`,
              `Total Amount Paid: ${formatFee(fee.totalAmountPaid)}`,
              `Overall Outstanding Balance: ${formatFee(fee.overallOutstandingBalance)}`,
              ...(fee.excessCredit > 0 ? [`Excess Payment / Credit: ${formatFee(fee.excessCredit)}`] : []),
            ].join("\n");
            await createNotification({ kind: "SALES_CRM_ADMISSION", tone: "green", title: `New Student Admission — ${studentData.studentName}`, message: admissionMessage, actionLabel: "View Student", targetBranchId: branchId, targetBranchEmail: branchProfile.branchEmail || null, targetBranchName: branchProfile.branchName || null, targetUserId: branchProfile.adminUserId || null, requestDescription: `BRANCH_STUDENT:${createdStudent.studentId}`, createdBy: actorId }, tx);
          }
        }

        return createdStudent;
      }, { maxWait: 10000, timeout: 20000 });
      break;
    } catch (error) {
      const isStudentCodeConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.some((field) => field === "studentId" || field === "userCode");

      if (!isStudentCodeConflict || attempt === 1) {
        throw error;
      }

      studentId = await generateUniqueStudentId(branchId);
    }
  }

  if (alreadyConverted) return toBranchStudentSummary(created);

  void sendStudentCredentialsEmail({
    to: studentData.emailAddress,
    fullName: studentData.studentName,
    studentCode: studentId,
    temporaryPassword,
    resetToken,
    courseName: studentData.courseName || assignedBatch?.courseName || "",
    facultyName: studentData.facultyName || "",
    batchName: assignedBatch?.batchName || "",
    batchTiming: assignedBatch?.batchTiming || "",
    courses: validatedEnrollmentInput.enrollments.map((enrollment) => {
      const source = (getCourseEnrollmentInput(payload) || []).find((item) => (
        normalizeString(item?.courseId) === enrollment.courseId
      )) || {};
      return {
        courseName: enrollment.courseName || source.courseName || "",
        courseMode: enrollment.mode || source.courseMode || source.mode || "",
        facultyName: enrollment.facultyName || source.facultyName || "",
        batchName: enrollment.batchName || source.batchName || source.batch || "",
        batchTiming: enrollment.batchTiming || source.batchTiming || source.batchTime || "",
        classSchedule: enrollment.scheduleType || source.classSchedule || source.weekType || "",
        courseDuration: source.courseDuration || source.duration || "",
        courseStartDate: enrollment.startDate || source.courseStartDate || source.startDate || "",
        courseEndDate: enrollment.endDate || source.courseEndDate || source.endDate || "",
        courseAmount: source.totalCourseAmount || source.courseAmount || source.totalAmount || source.afterDiscount || "",
        paymentPlan: source.paymentPlan || source.paymentPlanName || "",
        status: enrollment.status,
      };
    }),
  }).catch((error) => {
    console.warn("Branch student credentials email failed to send", error);
  });

  return toBranchStudentSummary(created);
}

export async function previewBranchStudentFeePlan(payload = {}, actor = null) {
  const branchProfile = await getBranchContext(actor);
  const branchId = branchProfile?.id || normalizeString(payload.branchId);
  const actorRole = normalizeString(actor?.role).toUpperCase();
  if (actorRole === "SALES_ADMIN" || (actorRole === "BRANCH_ADMIN" && normalizeString(payload.sourceLeadId))) {
    const sourceLeadId = normalizeString(payload.sourceLeadId);
    if (!sourceLeadId) throw new AppError("Source lead is required to preview an admission fee plan", 400);
    const lead = await prisma.lead.findFirst({ where: { id: sourceLeadId, branchId, stage: "HOT", status: { not: "CONVERTED" }, deletedAt: null }, select: { id: true } });
    const access = actorRole === "BRANCH_ADMIN"
      ? (lead && normalizeString(branchProfile?.id || actor?.branchId) === normalizeString(branchId) ? { id: "branch-admin" } : null)
      : (lead ? await prisma.salesAdminBranch.findUnique({ where: { salesAdminId_branchId: { salesAdminId: normalizeString(actor?.userId || actor?.id), branchId } }, select: { id: true } }) : null);
    if (!lead || !access) throw new AppError("You do not have permission to preview fees for this lead", 403);
  }
  const batchId = normalizeString(payload.batchId || payload.batchEntryId);
  const courseId = normalizeString(payload.courseId);

  if (!branchId || !batchId || !courseId) {
    throw new AppError("Course and batch are required to preview the fee schedule", 400);
  }

  const [batch, course] = await Promise.all([
    prisma.branchBatch.findFirst({
      where: { branchId, batchId, status: "ACTIVE", courseId },
      select: {
        batchId: true,
        batchName: true,
        batchTiming: true,
        courseId: true,
        courseName: true,
        facultyId: true,
        facultyName: true,
        weekType: true,
        mode: true,
        courseStartDate: true,
        courseEndDate: true,
        weeklyOffDay: true,
      },
    }),
    prisma.branchCourse.findFirst({
      where: { id: courseId, branchId },
      select: { id: true, hours: true, duration: true, mode: true },
    }),
  ]);

  if (!batch || !course) {
    throw new AppError("Selected course or batch was not found in this branch", 400);
  }

  const installmentSchedule = Array.isArray(payload.installmentSchedule)
    ? payload.installmentSchedule.map((installment, index) => ({
        installmentNumber: index + 1,
        amount: Number(String(installment?.amount ?? 0).replace(/,/g, "")) || 0,
        dueDate: parseOptionalText(installment?.dueDate),
      }))
    : [];
  const studentData = {
    admissionDate: parseOptionalText(payload.admissionDate) || batch.courseStartDate,
    courseStartDate: parseOptionalText(payload.courseStartDate) || batch.courseStartDate,
    courseId: batch.courseId,
    courseName: batch.courseName,
    courseMode: parseOptionalText(payload.courseMode) || batch.mode,
    batchId: batch.batchId,
    batchName: batch.batchName,
    batchTiming: batch.batchTiming,
    classSchedule: batch.weekType,
    weeklyOffDay: batch.weeklyOffDay,
    facultyId: batch.facultyId,
    facultyName: batch.facultyName,
    courseAmount: Number(String(payload.courseAmount ?? 0).replace(/,/g, "")) || 0,
  };
  const feePlan = await buildStudentFeePlan({
    studentData,
    installmentSchedule,
    payload,
    branchId,
    course,
  });

  return {
    ...feePlan.fields,
    installmentSchedule: feePlan.schedule,
  };
}

export async function getBranchStudent(studentId, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      course: {
        select: {
          id: true,
          name: true,
          courseCode: true,
          courseType: true,
          duration: true,
          hours: true,
          mode: true,
          status: true,
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } },
      courseEnrollments: { orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }] },
    }
  });

  if (!student) {
    throw new AppError("Branch student not found", 404);
  }

  const summary = toBranchStudentSummary(student);
  try {
    summary.academicTestProgress = await getAcademicTestProgressForStudent(student);
    summary.paidProgress = calculateCoursePaidProgress(student, student.courseId);
    summary.courseCompletion = courseCompletionFromProgressAndTests(student.courseProgress, summary.academicTestProgress, summary.paidProgress);
    summary.courseCompletionStatus = summary.courseCompletion;
  } catch (error) {
    console.warn("Unable to calculate Student 360 academic test progress", error);
    summary.academicTestProgress = { totalTests: 0, completedTests: 0, pendingTests: 0, percentage: 0 };
  }
  return summary;
}

export async function getCurrentBranchStudentProfile(user) {
  const email = normalizeString(user?.email).toLowerCase();
  const userCode = normalizeString(user?.userCode);

  if (!email && !userCode) {
    throw new AppError("Branch student profile not found", 404);
  }

  const student = await prisma.branchStudent.findFirst({
    where: {
      OR: [
        ...(email ? [{ emailAddress: email }] : []),
        ...(userCode ? [{ studentId: userCode }, { id: userCode }] : []),
      ],
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          courseCode: true,
          courseType: true,
          duration: true,
          hours: true,
          mode: true,
          status: true,
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } },
      courseEnrollments: { orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!student) {
    throw new AppError("Branch student profile not found", 404);
  }

  return toBranchStudentSummary(student);
}

export async function updateBranchStudent(studentId, payload, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const existing = await prisma.branchStudent.findFirst({
    where,
    include: {
      course: { select: { id: true, hours: true, duration: true, mode: true } },
      installments: { orderBy: { installmentNumber: "asc" } },
      courseEnrollments: { orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }] },
      calendarAttendanceRecords: true,
    },
  });

  if (!existing) {
    throw new AppError("Branch student not found", 404);
  }

  const validatedCourseInput = validateCourseEnrollmentInput(payload, existing.branchId, existing);

  let { studentData, installmentSchedule } = buildBranchStudentPayload(payload, existing);
  const selectedBatchId = normalizeString(studentData.batchId);
  if (selectedBatchId) {
    const assignedBatch = await prisma.branchBatch.findFirst({
      where: {
        batchId: selectedBatchId,
        status: "ACTIVE",
        branchId: existing.branchId,
        ...(studentData.courseId ? { courseId: studentData.courseId } : {}),
      },
      select: {
        branchId: true,
        batchId: true,
        batchName: true,
        batchTiming: true,
        totalSeats: true,
        offlineSeats: true,
        courseId: true,
        courseName: true,
        facultyId: true,
        facultyName: true,
        weekType: true,
        mode: true,
        courseStartDate: true,
        courseEndDate: true,
        weeklyOffDay: true,
      },
    });

    if (!assignedBatch) {
      throw new AppError("Selected batch was not found in this branch", 400);
    }

    const requestedWeekType = normalizeString(payload.weekType).toUpperCase();
    const requestedMode = normalizeString(payload.mode || payload.courseMode).toUpperCase();
    if ((requestedWeekType && requestedWeekType !== assignedBatch.weekType) || (requestedMode && requestedMode !== assignedBatch.mode)) throw new AppError("Selected batch does not match the selected course, week type, or mode.", 400);
    const primaryBatchChanged = selectedBatchId !== normalizeString(existing.batchId)
      || normalizeString(studentData.courseId) !== normalizeString(existing.courseId);
    if (primaryBatchChanged) await ensureAvailableBatchCapacity(assignedBatch, existing.id);

    studentData.batchId = assignedBatch.batchId;
    studentData.batchName = assignedBatch.batchName;
    studentData.batchTiming = assignedBatch.batchTiming;
    studentData.courseId = studentData.courseId || assignedBatch.courseId;
    studentData.courseName = studentData.courseName || assignedBatch.courseName;
    studentData.facultyId = studentData.facultyId || assignedBatch.facultyId;
    studentData.facultyName = studentData.facultyName || assignedBatch.facultyName;
    studentData.weeklyOffDay = assignedBatch.weeklyOffDay || null;
    studentData.courseStartDate = studentData.courseStartDate || assignedBatch.courseStartDate;
    studentData.courseEndDate = studentData.courseEndDate || assignedBatch.courseEndDate;
  }
  let sequentialCourseActivation = false;
  if (validatedCourseInput.arrangementType === 'SEQUENTIAL') {
    const newlyActivatedCourses = validatedCourseInput.enrollments.filter((enrollment) => {
      const previous = (existing.courseEnrollments || []).find((item) => String(item.courseId) === String(enrollment.courseId));
      return Number(enrollment.sequenceOrder) > 1
        && String(previous?.status || '').toUpperCase() === 'PENDING'
        && enrollment.status === 'ACTIVE';
    });
    if (newlyActivatedCourses.length > 1) {
      throw new AppError('Assign one sequential course at a time so its batch and payment schedule stay course-specific.', 400);
    }
    if (newlyActivatedCourses.length === 1) {
      const enrollment = newlyActivatedCourses[0];
      if (!enrollment.batchId || !enrollment.startDate) {
        throw new AppError('Select the active course batch and start date before assigning this sequential course.', 400);
      }
      const [courseRecord, batchRecord] = await Promise.all([
        prisma.branchCourse.findFirst({
          where: { id: enrollment.courseId, branchId: existing.branchId, status: 'ACTIVE' },
          select: { id: true, name: true, hours: true, duration: true, mode: true, paymentPlans: true, paymentPlanSelections: true },
        }),
        prisma.branchBatch.findFirst({
          where: { branchId: existing.branchId, courseId: enrollment.courseId, batchId: enrollment.batchId, status: 'ACTIVE' },
          select: {
            batchId: true,
            batchName: true,
            batchTiming: true,
            courseId: true,
            courseName: true,
            facultyId: true,
            facultyName: true,
            weekType: true,
            mode: true,
            courseStartDate: true,
            courseEndDate: true,
            weeklyOffDay: true,
          },
        }),
      ]);
      if (!courseRecord || !batchRecord) {
        throw new AppError('The selected sequential course or batch is no longer active.', 400);
      }
      const courseDeadline = await calculateStudentFeeDeadline({
        branchId: existing.branchId,
        courseId: enrollment.courseId,
        courseName: enrollment.courseName || courseRecord.name,
        courseMode: enrollment.mode || batchRecord.mode,
        batchId: enrollment.batchId,
        batchName: batchRecord.batchName,
        batchTiming: batchRecord.batchTiming,
        facultyId: batchRecord.facultyId,
        facultyName: batchRecord.facultyName,
        classSchedule: enrollment.scheduleType || batchRecord.weekType,
        courseStartDate: enrollment.startDate,
        courseEndDate: enrollment.endDate || batchRecord.courseEndDate,
        admissionDate: enrollment.startDate,
        weeklyOffDay: batchRecord.weeklyOffDay,
        course: courseRecord,
      }, existing.branchId);
      if (!courseDeadline?.progressDate) {
        throw new AppError('Unable to calculate the 70% payment deadline for the selected course batch.', 400);
      }
      const existingInstallmentCount = (existing.installments || []).length;
      const addedInstallments = installmentSchedule.slice(existingInstallmentCount);
      if (installmentSchedule.length < existingInstallmentCount || !addedInstallments.length) {
        throw new AppError('The payment schedule must include existing installments and the selected course payment plan.', 400);
      }
      const coursePaymentPlans = Array.isArray(courseRecord.paymentPlans)
        ? courseRecord.paymentPlans
        : Array.isArray(courseRecord.paymentPlanSelections)
          ? courseRecord.paymentPlanSelections
          : [];
      const selectedPaymentPlan = coursePaymentPlans.find((plan) => [plan?.id, plan?.templateId, plan?.paymentPlanId]
        .some((id) => normalizeString(id) === normalizeString(enrollment.paymentPlanId)));
      if (coursePaymentPlans.length && !selectedPaymentPlan) {
        throw new AppError('Select a payment plan configured for the assigned course.', 400);
      }
      const expectedInstallmentCount = Number(selectedPaymentPlan?.installmentCount || selectedPaymentPlan?.installments?.length || 0);
      if (expectedInstallmentCount > 0 && addedInstallments.length !== expectedInstallmentCount) {
        throw new AppError('The number of new installments must match the selected course payment plan.', 400);
      }
      const firstCoursePaymentDate = normalizeString(enrollment.startDate);
      const courseInstallmentDates = distributeFeeDueDates(firstCoursePaymentDate, courseDeadline.progressDate, addedInstallments.length);
      addedInstallments.forEach((installment, index) => {
        installment.dueDate = courseInstallmentDates[index];
      });
      sequentialCourseActivation = true;
    }
  }
  const feePlan = await buildStudentFeePlan({
    studentData,
    installmentSchedule,
    payload: sequentialCourseActivation
      ? { ...payload, preserveInstallmentDates: true, sequentialCourseActivation: true }
      : payload,
    branchId: existing.branchId,
    course: existing.course,
    existingStudent: existing,
  });
  Object.assign(studentData, feePlan.fields);
  installmentSchedule = feePlan.schedule;
  const existingLoginUser = await findBranchStudentLoginUser(existing);
  const previousCourseProgress = Number(existing.courseProgress);
  const emailUnchanged = normalizeString(studentData.emailAddress).toLowerCase() === normalizeString(existing.emailAddress).toLowerCase();
  const mobileUnchanged = normalizeString(studentData.mobileNumber) === normalizeString(existing.mobileNumber);
  if (!emailUnchanged || !mobileUnchanged) {
    await ensureUniqueBranchStudentIdentity(studentData, existing.branchId, existing.id, existingLoginUser?.id, existing.studentId);
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Branch" WHERE id = ${existing.branchId} FOR UPDATE`;
    const studentUpdateData = {
      ...studentData,
      updatedBy: actor?.id ?? null,
    };
    const student = await tx.branchStudent.update({
      where: { id: existing.id },
      data: studentUpdateData,
    });

    await syncBranchStudentCourseEnrollments(tx, student, payload, existing);

    await syncStudentCourseEnd(tx, student);

    await replaceStudentInstallmentSchedule(tx, student.id, installmentSchedule, existing.installments || []);

    const updatedStudent = await tx.branchStudent.findUnique({
      where: { id: student.id },
      include: {
        installments: { orderBy: { installmentNumber: "asc" } },
        courseEnrollments: { orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }] },
      },
    });

    if (updatedStudent) {
      await materializeBranchStudentLedgerEntries(tx, updatedStudent, { includePayments: false });
    }

    if (existingLoginUser) {
      await tx.user.update({
        where: { id: existingLoginUser.id },
        data: {
          fullName: studentData.studentName,
          email: studentData.emailAddress,
          phone: studentData.mobileNumber,
          updatedBy: actor?.id ?? null,
        },
      });
    }

    return updatedStudent;
  });

  const discountedCourseChanged = validatedCourseInput.enrollments.some((enrollment) => {
    if (!(Number(enrollment.discountAmount) > 0)) return false;
    const previous = (existing.courseEnrollments || []).find((item) => String(item.courseId) === String(enrollment.courseId));
    return !previous
      || String(previous.discountType || "FIXED").toUpperCase() !== String(enrollment.discountType || "FIXED").toUpperCase()
      || Math.abs((Number(previous.discountValue) || 0) - (Number(enrollment.discountValue) || 0)) > 0.001;
  });
  if (discountedCourseChanged) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: existing.branchId },
        select: { id: true, branchId: true, branchName: true, branchEmail: true },
      });
      await notifyStudentCourseDiscount({
        enrollments: validatedCourseInput.enrollments,
        student: updated || studentData,
        branch: branch || { id: existing.branchId, branchName: existing.branchName, branchEmail: existing.branchEmail },
        actorId: actor?.id ?? null,
      });
    } catch (error) {
      console.warn("Student course discount notification failed", error?.message || error);
    }
  }

  const updatedCourseProgress = Number(updated?.courseProgress);
  if (validatedCourseInput.arrangementType === "SEQUENTIAL" && updated && updatedCourseProgress >= 100) {
    void notifySequentialCourseSchedulingForStudent(updated.id).catch((error) => {
      console.warn("Sequential course scheduling notification failed", error?.message || error);
    });
  }
  if (
    Number.isFinite(updatedCourseProgress) &&
    updatedCourseProgress !== previousCourseProgress &&
    updatedCourseProgress > 0
  ) {
    void notifyProgressAlignment(updated, {
      id: existing.branchId,
      branchId: existing.branchId,
      branchName: existing.branchName,
      branchEmail: existing.branchEmail,
    }, actor).catch((error) => {
      console.warn("Branch student progress notification failed", error);
    });
  }

  return toBranchStudentSummary(updated);
}

export async function deleteBranchStudent(studentId, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const existing = await prisma.branchStudent.findFirst({
    where,
  });

  if (!existing) {
    throw new AppError("Branch student not found", 404);
  }

  const existingLoginUser = await findBranchStudentLoginUser(existing);

  await prisma.$transaction(async (tx) => {
    // These submissions do not have a Prisma relation to BranchStudent, so
    // they must be removed explicitly before the cascaded branch record.
    const testSubmissions = await tx.academicTestSubmission.findMany({
      where: { branchStudentId: existing.id },
      select: { id: true },
    });
    await tx.academicTestAnswer.deleteMany({
      where: { submissionId: { in: testSubmissions.map((item) => item.id) } },
    });
    await tx.academicTestSubmission.deleteMany({ where: { branchStudentId: existing.id } });
    await tx.academicProjectSubmission.deleteMany({ where: { branchStudentId: existing.id } });

    // Payments reference installments, so remove them before the installment
    // cascade. Ledger entries are also deleted explicitly for clarity.
    await tx.branchStudentPayment.deleteMany({ where: { branchStudentId: existing.id } });
    await tx.branchStudentLedgerEntry.deleteMany({ where: { branchStudentId: existing.id } });
    await tx.branchStudentInstallment.deleteMany({ where: { branchStudentId: existing.id } });

    // A retest/reassessment belongs to this student but is not deleted by the
    // nullable SetNull relation on the parent academic configuration.
    await tx.exam.deleteMany({ where: { retestStudentId: existing.id } });
    await tx.assessment.deleteMany({ where: { reassessmentStudentId: existing.id } });

    // Remaining branch-student relations use Cascade in the Prisma schema.
    await tx.branchStudent.delete({ where: { id: existing.id } });

    if (existingLoginUser) {
      await tx.passwordResetToken.deleteMany({ where: { userId: existingLoginUser.id } });
      await tx.user.delete({ where: { id: existingLoginUser.id } });
    }
  });

  return toBranchStudentSummary(existing);
}

export async function createBranchStudentPayment(studentId, payload, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      installments: true,
    },
  });

  if (!student) {
    throw new AppError("Branch student not found", 404);
  }

  const amountReceived = Number(String(payload.amountReceived).replace(/,/g, ''));
  if (isNaN(amountReceived) || amountReceived <= 0) {
    throw new AppError("Invalid payment amount", 400);
  }

  const generatedReceiptNumber = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;

  let targetInstallmentId = null;
  const payAgainst = String(payload.payAgainst || "").trim();

  const payment = await prisma.$transaction(async (tx) => {
    // Check if payAgainst matches any installment
    const installmentMatch = payAgainst.match(/Installment\s+(\d+)/i);
    if (installmentMatch) {
      const instNum = parseInt(installmentMatch[1], 10);
      const installment = student.installments.find(i => i.installmentNumber === instNum);
      
      if (installment) {
        targetInstallmentId = installment.id;
        
        const newAmountPaid = installment.amountPaid + amountReceived;
        const newStatus = newAmountPaid >= installment.amount ? "Paid" : "Pending";
        
        await tx.branchStudentInstallment.update({
          where: { id: installment.id },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
            paidAt: newStatus === "Paid" ? new Date() : installment.paidAt,
          },
        });
      }
    }

    return await tx.branchStudentPayment.create({
      data: {
        receiptNumber: generatedReceiptNumber,
        branchStudentId: student.id,
        branchId: student.branchId,
        amount: amountReceived,
        paymentMode: String(payload.paymentMode || "Cash"),
        transactionReference: payload.transactionReference ? String(payload.transactionReference) : null,
        paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
        collectedBy: payload.collectedBy ? String(payload.collectedBy) : (actor?.name || actor?.email || "Admin"),
        notes: payload.notes ? String(payload.notes) : null,
        payAgainst: payAgainst,
        installmentId: targetInstallmentId,
      },
    });
  });

  const refreshedStudent = await prisma.$transaction(async (tx) => {
    const currentStudent = await tx.branchStudent.findUnique({
      where: { id: student.id },
      include: {
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
        payments: {
          orderBy: [
            { paymentDate: "asc" },
            { createdAt: "asc" },
            { id: "asc" },
          ],
          include: {
            installment: {
              select: {
                installmentNumber: true,
                amount: true,
                dueDate: true,
              },
            },
          },
        },
      },
    });

    if (!currentStudent) {
      return null;
    }

    const feeComplianceStatus = calculateBranchStudentFeeComplianceStatus(currentStudent);
    await tx.branchStudent.update({
      where: { id: currentStudent.id },
      data: { feeComplianceStatus },
    });
    currentStudent.feeComplianceStatus = feeComplianceStatus;
    await materializeBranchStudentLedgerEntries(tx, currentStudent);
    return currentStudent;
  });

  if (refreshedStudent) {
    const branchProfile = await getCurrentBranchProfile(actor).catch(() => null);

    const savedPayment = Array.isArray(refreshedStudent.payments)
      ? refreshedStudent.payments.find((item) => item.id === payment.id)
      : payment;
    const totalCourseFee = Number(
      refreshedStudent.totalCourseFee ||
      refreshedStudent.courseFee ||
      refreshedStudent.totalFees ||
      refreshedStudent.totalAmount ||
      refreshedStudent.afterDiscount ||
      0
    );
    const totalPaid = Array.isArray(refreshedStudent.payments)
      ? refreshedStudent.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      : Number(savedPayment?.amount || 0);

    if (refreshedStudent.emailAddress) {
      void sendStudentPaymentReceiptEmail({
        to: refreshedStudent.emailAddress,
        studentName: refreshedStudent.studentName,
        studentId: refreshedStudent.studentId,
        courseName: refreshedStudent.courseName || refreshedStudent.courseInterested || "",
        batchName: refreshedStudent.batchName || refreshedStudent.batch || "",
        branchName: branchProfile?.branchName || refreshedStudent.branchName || "CISPRO Training",
        branchAddress: branchProfile?.branchAddress || refreshedStudent.branchAddress || "",
        receiptNumber: savedPayment?.receiptNumber || payment.receiptNumber,
        paymentDate: savedPayment?.paymentDate || payment.paymentDate,
        paymentFor: savedPayment?.payAgainst || payment.payAgainst,
        paymentMode: savedPayment?.paymentMode || payment.paymentMode,
        transactionReference: savedPayment?.transactionReference || payment.transactionReference,
        collectedBy: savedPayment?.collectedBy || payment.collectedBy,
        amount: savedPayment?.amount || payment.amount,
        totalCourseFee,
        totalPaid,
        balance: Math.max(totalCourseFee - totalPaid, 0),
        installments: refreshedStudent.installments,
        receiptAttachment: payload.receiptAttachment,
      })
        .catch((error) => {
          console.warn("Branch student payment receipt email failed to send", error);
        });
    }

    void notifyProgressAlignment(refreshedStudent, branchProfile || { id: student.branchId, branchId: student.branchId }, actor).catch((error) => {
      console.warn("Branch student payment progress notification failed", error);
    });

    const feeSnapshot = calculateFeeProgressSnapshot(refreshedStudent);
    const nextInstallment = feeSnapshot.nextInstallment;
    if (shouldSendDueReminder(nextInstallment) && refreshedStudent.emailAddress) {
      void sendStudentPaymentDueEmail({
        to: refreshedStudent.emailAddress,
        fullName: refreshedStudent.studentName,
        studentId: refreshedStudent.studentId,
        courseName: refreshedStudent.courseName || refreshedStudent.courseInterested || "",
        feeProgress: feeSnapshot.feeProgress,
        courseProgress: refreshedStudent.courseProgress,
        dueAmount: feeSnapshot.dueAmount,
        dueDate: nextInstallment?.dueDate || "",
        installmentNumber: nextInstallment?.installmentNumber || null,
      })
        .then(() => markInstallmentDueReminderSent(nextInstallment?.id))
        .catch((error) => {
          console.warn("Branch student due reminder email failed to send", error);
        });
    }
  }

  return payment;
}
