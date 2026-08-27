import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import {
  sendStudentCredentialsEmail,
  sendStudentPaymentDueEmail,
} from "../../common/services/resendEmail.js";
import {
  createFeeProgressAlertNotification,
} from "../notifications/notifications.service.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const CURRENT_STATUSES = new Set(["Student", "Employee", "Other"]);
const PROGRESS_ALERT_TOLERANCE = 5;
const DUE_REMINDER_WINDOW_DAYS = 7;
const DUE_REMINDER_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function normalizeString(value) {
  return String(value ?? "").trim();
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

function normalizeStudentId(value) {
  return normalizeString(value).toUpperCase();
}

function generateStudentIdFromSequence(sequenceNumber) {
  return `STU-${String(sequenceNumber).padStart(3, "0")}`;
}

async function generateNextStudentId(branchId) {
  const branchStudents = await prisma.branchStudent.findMany({
    where: { branchId },
    select: { studentId: true },
  });

  let highest = 0;

  branchStudents.forEach((record) => {
    const match = normalizeStudentId(record.studentId).match(/^STU-(\d+)$/i);
    if (!match) return;

    const numeric = Number(match[1]);
    if (Number.isInteger(numeric) && numeric > highest) {
      highest = numeric;
    }
  });

  return generateStudentIdFromSequence(highest + 1);
}

async function isStudentIdTaken(branchId, studentId) {
  const normalizedStudentId = normalizeStudentId(studentId);

  if (!normalizedStudentId) {
    return false;
  }

  const branchStudent = await prisma.branchStudent.findFirst({
    where: {
      branchId,
      studentId: normalizedStudentId,
    },
    select: { id: true },
  });

  return Boolean(branchStudent);
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
    nextStudentId: generateStudentIdFromSequence(index + 1),
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
  const passedOutYear = parseRequiredText(candidate.passedOutYear, "Passed out year");
  const currentStatus = parseCurrentStatus(candidate.currentStatus);
  const designation = currentStatus === "Employee" ? parseRequiredText(candidate.designation, "Designation") : parseOptionalText(candidate.designation);
  const source = parseRequiredText(candidate.source, "Source");
  const sourceOther = source === "Others" ? parseRequiredText(candidate.sourceOther, "Source details") : parseOptionalText(candidate.sourceOther);
  const remarks = parseOptionalText(candidate.remarks);
  const admissionDate = parseDateString(candidate.admissionDate, "Admission date");
  const recordStatus = parseStatus(candidate.recordStatus || candidate.status || "ACTIVE");
  const courseProgress = parseOptionalProgress(candidate.courseProgress);

  if (currentStatus === "Employee" && !designation) {
    throw new AppError("Designation is required for employees", 400);
  }

  if (source === "Others" && !sourceOther) {
    throw new AppError("Source details are required when source is Others", 400);
  }
  const studentData = {
    studentName,
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
    designation,
    source,
    sourceOther,
    remarks,
    admissionDate,
    courseProgress,
    recordStatus,
    courseId: parseOptionalText(candidate.courseId),
    courseName: parseOptionalText(candidate.courseName),
    facultyId: parseOptionalText(candidate.facultyId),
    facultyName: parseOptionalText(candidate.facultyName),
    courseAmount: candidate.courseAmount && Number.isFinite(Number(String(candidate.courseAmount).replace(/,/g, ''))) 
      ? Number(String(candidate.courseAmount).replace(/,/g, '')) 
      : null,
    paymentMode: parseOptionalText(candidate.paymentMode) || "Installment",
    paymentPlanId: parseOptionalText(candidate.paymentPlanId),
    paymentPlan: parseOptionalText(candidate.paymentPlan),
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

async function getBranchContext(actor) {
  const role = normalizeString(actor?.role).toUpperCase();

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
  return {
    id: record.id,
    branchId: record.branchId,
    studentId: record.studentId,
    studentName: record.studentName,
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
    designation: record.designation,
    source: record.source,
    sourceOther: record.sourceOther,
    remarks: record.remarks,
    admissionDate: record.admissionDate,
    courseProgress: record.courseProgress,
    courseId: record.courseId,
    courseName: record.courseName,
    facultyId: record.facultyId,
    facultyName: record.facultyName,
    courseAmount: record.courseAmount,
    paymentMode: record.paymentMode,
    paymentPlanId: record.paymentPlanId,
    paymentPlan: record.paymentPlan,
    status: displayStatus(record.recordStatus),
    recordStatus: record.recordStatus,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    installmentSchedule: Array.isArray(record.installments) ? record.installments : [],
  };
}

async function ensureUniqueBranchStudentIdentity({ emailAddress, mobileNumber }, branchId, excludeId = null, excludeUserId = null) {
  const existing = await prisma.branchStudent.findFirst({
    where: {
      branchId,
      OR: [{ emailAddress }, { mobileNumber }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
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
  const expiresAt = new Date(Date.now() + config.credentialResetTokenExpiresMinutes * 60 * 1000);

  return { resetToken, tokenHash, expiresAt };
}

function buildBranchStudentUserCode(branchCode, studentId) {
  const safeBranchCode = normalizeString(branchCode).toUpperCase() || "BRANCH";
  const safeStudentId = normalizeStudentId(studentId);
  return `${safeBranchCode}-${safeStudentId}`;
}

async function findBranchStudentLoginUser(student) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { userCode: student.studentId },
        { userCode: buildBranchStudentUserCode(student.branchId, student.studentId) },
        { email: student.emailAddress },
      ],
    },
  });
}

async function ensureBranchStudentAccess(actor, studentId) {
  const branchProfile = await getBranchContext(actor);

  if (!branchProfile?.id) {
    return { branchProfile: null, where: { OR: [{ id: studentId }, { studentId }] } };
  }

  return {
    branchProfile,
    where: {
      branchId: branchProfile.id,
      OR: [{ id: studentId }, { studentId }],
    },
  };
}

export async function listBranchStudents(query = {}, actor = null) {
  const { page, limit, skip, take } = buildPagination(query);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder);
  const branchProfile = await getBranchContext(actor);
  const actorId = actor?.id ?? null;

  if (branchProfile?.id) {
    await normalizeBranchStudentIdentifiers(branchProfile, actorId);
  }

  const where = buildBranchStudentWhere(query, branchProfile);

  const [total, rows] = await prisma.$transaction([
    prisma.branchStudent.count({ where }),
    prisma.branchStudent.findMany({
      where,
      orderBy: buildBranchStudentOrderBy(sortBy, sortOrder),
      skip,
      take,
      include: {
        installments: {
          orderBy: { installmentNumber: "asc" }
        }
      }
    }),
  ]);

  return {
    data: rows.map(toBranchStudentSummary),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createBranchStudent(payload, actor) {
  const branchProfile = await getBranchContext(actor);
  const branchId = branchProfile?.id || normalizeString(payload.branchId);

  if (!branchId) {
    throw new AppError("Branch ID is required", 400);
  }

  console.log("[createBranchStudent] incoming payload keys:", Object.keys(payload));
  let studentData, installmentSchedule;
  try {
    ({ studentData, installmentSchedule } = buildBranchStudentPayload(payload));
  } catch (err) {
    console.error("[createBranchStudent] validation error:", err.message);
    throw err;
  }
  console.log("[createBranchStudent] studentData keys:", Object.keys(studentData));
  console.log("[createBranchStudent] studentData:", JSON.stringify(studentData, null, 2));
  console.log("[createBranchStudent] installmentSchedule count:", installmentSchedule.length);
  const actorId = actor?.id ?? null;
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  await ensureUniqueBranchStudentIdentity(studentData, branchId);

  const requestedStudentId = normalizeStudentId(payload.studentId);
  let studentId = requestedStudentId;
  if (!/^STU-\d+$/i.test(studentId) || await isStudentIdTaken(branchId, studentId)) {
    studentId = await generateUniqueStudentId(branchId);
  }

  let created = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      created = await prisma.$transaction(async (tx) => {
        const student = await tx.branchStudent.create({
          data: {
            branchId,
            studentId,
            ...studentData,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        if (installmentSchedule.length > 0) {
          await tx.branchStudentInstallment.createMany({
            data: installmentSchedule.map(inst => ({
              ...inst,
              branchStudentId: student.id,
            }))
          });
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
            createdBy: actorId,
          },
        });

        const createdStudent = await tx.branchStudent.findUnique({
          where: { id: student.id },
          include: { installments: { orderBy: { installmentNumber: "asc" } } }
        });

        return createdStudent;
      });
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

  void sendStudentCredentialsEmail({
    to: studentData.emailAddress,
    fullName: studentData.studentName,
    studentCode: studentId,
    temporaryPassword,
    resetToken,
  }).catch((error) => {
    console.warn("Branch student credentials email failed to send", error);
  });

  return toBranchStudentSummary(created);
}

export async function getBranchStudent(studentId, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      installments: { orderBy: { installmentNumber: "asc" } }
    }
  });

  if (!student) {
    throw new AppError("Branch student not found", 404);
  }

  return toBranchStudentSummary(student);
}

export async function updateBranchStudent(studentId, payload, actor = null) {
  const { where } = await ensureBranchStudentAccess(actor, studentId);
  const existing = await prisma.branchStudent.findFirst({
    where,
  });

  if (!existing) {
    throw new AppError("Branch student not found", 404);
  }

  const { studentData, installmentSchedule } = buildBranchStudentPayload(payload, existing);
  const existingLoginUser = await findBranchStudentLoginUser(existing);
  const previousCourseProgress = Number(existing.courseProgress);
  await ensureUniqueBranchStudentIdentity(studentData, existing.branchId, existing.id, existingLoginUser?.id);
  const updated = await prisma.$transaction(async (tx) => {
    const student = await tx.branchStudent.update({
      where: { id: existing.id },
      data: {
        ...studentData,
        updatedBy: actor?.id ?? null,
      },
    });

    await tx.branchStudentInstallment.deleteMany({
      where: { branchStudentId: student.id }
    });

    if (installmentSchedule.length > 0) {
      await tx.branchStudentInstallment.createMany({
        data: installmentSchedule.map(inst => ({
          ...inst,
          branchStudentId: student.id,
        }))
      });
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

    const updatedStudent = await tx.branchStudent.findUnique({
      where: { id: student.id },
      include: { installments: { orderBy: { installmentNumber: "asc" } } }
    });

    return updatedStudent;
  });

  const updatedCourseProgress = Number(updated?.courseProgress);
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
    await tx.branchStudent.delete({
      where: { id: existing.id },
    });

    if (existingLoginUser) {
      await tx.passwordResetToken.deleteMany({
        where: { userId: existingLoginUser.id },
      });

      await tx.user.delete({
        where: { id: existingLoginUser.id },
      });
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

  const refreshedStudent = await prisma.branchStudent.findUnique({
    where: { id: student.id },
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
    },
  });

  if (refreshedStudent) {
    const branchProfile = await getCurrentBranchProfile(actor).catch(() => null);

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
