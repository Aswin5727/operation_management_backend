import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import {
  sendStudentCredentialsEmail,
} from "../../common/services/resendEmail.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const CURRENT_STATUSES = new Set(["Student", "Employee", "Other"]);
const PAYMENT_STATUSES = new Set(["Paid", "Pending"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, " ");
}

function capitalize(value) {
  const text = normalizeString(value);
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()}`;
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

function parsePositiveInt(value, fieldName, { allowZero = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new AppError(`${fieldName} must be an integer`, 400);
  }

  if (allowZero) {
    if (parsed < 0) {
      throw new AppError(`${fieldName} must be zero or greater`, 400);
    }
    return parsed;
  }

  if (parsed <= 0) {
    throw new AppError(`${fieldName} must be greater than zero`, 400);
  }

  return parsed;
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

function parseDateString(value, fieldName) {
  const text = parseRequiredText(value, fieldName);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError(`${fieldName} must be in YYYY-MM-DD format`, 400);
  }

  return text;
}

function parseCurrentStatus(value) {
  const text = capitalize(value);

  if (!CURRENT_STATUSES.has(text)) {
    throw new AppError("Invalid current status", 400);
  }

  return text;
}

function parsePaymentStatus(value, fieldName) {
  const text = capitalize(value);

  if (!PAYMENT_STATUSES.has(text)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return text;
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

  if (order === "asc" || order === "desc") {
    return order;
  }

  return defaultOrder;
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

function getTodayValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
  }).format(new Date());
}

function addOneMonth(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const dueDate = new Date(date);
  dueDate.setMonth(dueDate.getMonth() + 1);

  return dueDate.toISOString().slice(0, 10);
}

function toStudentSummary(student) {
  return {
    id: student.id,
    studentCode: student.studentCode,
    studentName: student.studentName,
    mobileNumber: student.mobileNumber,
    emailAddress: student.emailAddress,
    parentSpouseNumber: student.parentSpouseNumber,
    location: student.location,
    courseId: student.courseId,
    courseInterested: student.courseInterested,
    facultyName: student.facultyName,
    batchName: student.batchName,
    qualification: student.qualification,
    passedOutYear: student.passedOutYear,
    currentStatus: student.currentStatus,
    designation: student.designation,
    source: student.source,
    actualFees: student.actualFees,
    registrationFees: student.registrationFees,
    discount: student.discount,
    afterDiscount: student.afterDiscount,
    installment1: student.installment1,
    installment2: student.installment2,
    installment3: student.installment3,
    totalAmount: student.totalAmount,
    admissionDate: student.admissionDate,
    firstInstallmentAmount: student.firstInstallmentAmount,
    firstInstallmentDate: student.firstInstallmentDate,
    firstInstallmentStatus: student.firstInstallmentStatus,
    firstInstallmentPaidAt: student.firstInstallmentPaidAt,
    secondInstallmentAmount: student.secondInstallmentAmount,
    secondDueDate: student.secondDueDate,
    secondInstallmentStatus: student.secondInstallmentStatus,
    secondInstallmentPaidAt: student.secondInstallmentPaidAt,
    remarks: student.remarks,
    status: displayStatus(student.recordStatus),
    createdBy: student.createdBy,
    updatedBy: student.updatedBy,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    course: student.course
      ? {
          id: student.course.id,
          name: student.course.name,
          status: student.course.status,
          mode: student.course.mode,
        }
      : null,
  };
}

function toStudentDetail(student) {
  return toStudentSummary(student);
}

function buildStudentWhere(query) {
  const where = {};
  const search = normalizeString(query.search);

  if (query.status) {
    const normalized = normalizeString(query.status).toUpperCase();
    if (!RECORD_STATUSES.has(normalized)) {
      throw new AppError("Invalid status", 400);
    }
    where.recordStatus = normalized;
  } else {
    where.recordStatus = "ACTIVE";
  }

  if (query.courseId) {
    where.courseId = normalizeString(query.courseId);
  }

  if (query.currentStatus) {
    where.currentStatus = parseCurrentStatus(query.currentStatus);
  }

  if (search) {
    const conditions = [
      { studentCode: { contains: search, mode: "insensitive" } },
      { studentName: { contains: search, mode: "insensitive" } },
      { mobileNumber: { contains: search, mode: "insensitive" } },
      { emailAddress: { contains: search, mode: "insensitive" } },
      { parentSpouseNumber: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { courseInterested: { contains: search, mode: "insensitive" } },
      { facultyName: { contains: search, mode: "insensitive" } },
      { batchName: { contains: search, mode: "insensitive" } },
      { qualification: { contains: search, mode: "insensitive" } },
      { currentStatus: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
      { remarks: { contains: search, mode: "insensitive" } },
    ];

    const numeric = Number(search);
    if (Number.isInteger(numeric)) {
      conditions.push(
        { passedOutYear: numeric },
        { actualFees: numeric },
        { registrationFees: numeric },
        { discount: numeric },
        { afterDiscount: numeric },
        { installment1: numeric },
        { installment2: numeric },
        { installment3: numeric },
        { totalAmount: numeric },
      );
    }

    where.OR = conditions;
  }

  return where;
}

function normalizeStudentCode() {
  return `STU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function ensureUniqueStudentIdentity({ emailAddress, mobileNumber }, excludeId = null) {
  const existing = await prisma.studentProfile.findFirst({
    where: {
      OR: [{ emailAddress }, { mobileNumber }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, emailAddress: true, mobileNumber: true },
  });

  if (existing) {
    if (existing.emailAddress === emailAddress) {
      throw new AppError("Student email already exists", 409);
    }

    if (existing.mobileNumber === mobileNumber) {
      throw new AppError("Student mobile number already exists", 409);
    }

    throw new AppError("Student already exists", 409);
  }
}

async function ensureUniqueStudentLogin({ emailAddress, mobileNumber, studentCode = null }) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailAddress }, { phone: mobileNumber }, ...(studentCode ? [{ userCode: studentCode }] : [])],
      ...(studentCode ? { userCode: { not: studentCode } } : {}),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      userCode: true,
    },
  });

  if (!user) {
    return;
  }

  if (user.email === emailAddress) {
    throw new AppError("Student email already exists", 409);
  }

  if (user.phone === mobileNumber) {
    throw new AppError("Student mobile number already exists", 409);
  }

  throw new AppError("Duplicate student login account", 409);
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

async function findStudentLoginUser(existingStudent) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { userCode: existingStudent.studentCode },
        { email: existingStudent.emailAddress },
      ],
    },
  });
}

async function ensureCourse(courseId, { requireActive = true } = {}) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  if (requireActive && course.status !== "ACTIVE") {
    throw new AppError("Course is inactive", 409);
  }

  return course;
}

function buildStudentPayload(payload, existingStudent = null, course = null) {
  const candidate = existingStudent ? { ...existingStudent, ...payload } : payload;
  const studentName = parseRequiredText(candidate.studentName, "Student name");
  const mobileNumber = parseRequiredText(candidate.mobileNumber, "Mobile number");
  const emailAddress = parseRequiredText(candidate.emailAddress, "Email address").toLowerCase();
  const parentSpouseNumber = parseOptionalText(candidate.parentSpouseNumber);
  const location = parseOptionalText(candidate.location);
  const facultyName = parseRequiredText(candidate.facultyName, "Faculty name");
  const batchName = parseRequiredText(candidate.batchName || candidate.batch, "Batch");
  const qualification = parseRequiredText(candidate.qualification, "Qualification");
  const passedOutYear = parsePositiveInt(candidate.passedOutYear, "Passed out year");
  const currentStatus = parseCurrentStatus(candidate.currentStatus);
  const designation = parseOptionalText(candidate.designation);
  const source = parseRequiredText(candidate.source, "Source");
  const admissionDate = parseDateString(candidate.admissionDate, "Admission date");
  const remarks = parseOptionalText(candidate.remarks);

  if (!/^\d{10}$/.test(mobileNumber)) {
    throw new AppError("Mobile number must be a 10-digit number", 400);
  }

  if (!/^\d{10}$/.test(parentSpouseNumber || "")) {
    throw new AppError("Parent / spouse number must be a 10-digit number", 400);
  }

  if (currentStatus === "Employee" && !designation) {
    throw new AppError("Designation is required when current status is Employee", 400);
  }

  if (remarks && remarks.length < 5) {
    throw new AppError("Remarks must be at least 5 characters long", 400);
  }

  const resolvedCourseId = normalizeString(candidate.courseId || existingStudent?.courseId);
  if (!resolvedCourseId) {
    throw new AppError("Course is required", 400);
  }

  const resolvedCourse = course || null;
  const actualFees = Number.isInteger(Number(resolvedCourse?.actualFees))
    ? Number(resolvedCourse.actualFees)
    : parsePositiveInt(candidate.actualFees, "Actual fees", { allowZero: true });
  const registrationFees = Number.isInteger(Number(resolvedCourse?.registrationFees))
    ? Number(resolvedCourse.registrationFees)
    : parsePositiveInt(candidate.registrationFees, "Registration fees", { allowZero: true });
  const discount = Number.isInteger(Number(resolvedCourse?.discount))
    ? Number(resolvedCourse.discount)
    : parsePositiveInt(candidate.discount, "Discount", { allowZero: true });
  const afterDiscount = Number.isInteger(Number(resolvedCourse?.afterDiscount))
    ? Number(resolvedCourse.afterDiscount)
    : parsePositiveInt(candidate.afterDiscount, "After discount", { allowZero: true });
  const installment1 = Number.isInteger(Number(resolvedCourse?.installment1))
    ? Number(resolvedCourse.installment1)
    : parsePositiveInt(candidate.installment1, "Installment 1", { allowZero: true });
  const installment2 = Number.isInteger(Number(resolvedCourse?.installment2))
    ? Number(resolvedCourse.installment2)
    : parsePositiveInt(candidate.installment2, "Installment 2", { allowZero: true });
  const installment3 =
    resolvedCourse?.installmentCount === 3 || candidate.installment3 !== undefined || candidate.installment3 !== null
      ? Number.isInteger(Number(resolvedCourse?.installment3))
        ? Number(resolvedCourse.installment3)
        : parsePositiveInt(candidate.installment3, "Installment 3", { allowZero: true })
      : null;

  const resolvedAfterDiscount = Number.isInteger(afterDiscount) ? afterDiscount : actualFees - discount;

  if (discount > actualFees) {
    throw new AppError("Discount cannot be greater than actual fees", 400);
  }

  if (installment1 + installment2 + (installment3 ?? 0) !== resolvedAfterDiscount) {
    throw new AppError("Installment totals must match the discounted fee", 400);
  }

  const firstInstallmentStatus = parsePaymentStatus(candidate.firstInstallmentStatus || "Paid", "first installment status");
  const secondInstallmentStatus = parsePaymentStatus(
    candidate.secondInstallmentStatus || "Pending",
    "second installment status",
  );

  return {
    studentName,
    mobileNumber,
    emailAddress,
    parentSpouseNumber,
    location,
    courseId: resolvedCourseId,
    courseInterested: resolvedCourse?.name || candidate.courseInterested || "",
    facultyName,
    batchName,
    qualification,
    passedOutYear,
    currentStatus,
    designation,
    source,
    actualFees,
    registrationFees,
    discount,
    afterDiscount: resolvedAfterDiscount,
    installment1,
    installment2,
    installment3,
    totalAmount: resolvedAfterDiscount,
    admissionDate,
    firstInstallmentAmount: installment1,
    firstInstallmentDate: admissionDate,
    firstInstallmentStatus,
    firstInstallmentPaidAt: firstInstallmentStatus === "Paid" ? candidate.firstInstallmentPaidAt || admissionDate : null,
    secondInstallmentAmount: installment2,
    secondDueDate: candidate.secondDueDate || addOneMonth(admissionDate),
    secondInstallmentStatus,
    secondInstallmentPaidAt: secondInstallmentStatus === "Paid" ? candidate.secondInstallmentPaidAt || getTodayValue() : null,
    remarks,
  };
}

async function handleKnownPrismaError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "unique field";

    if (target.includes("emailAddress") || target.includes("email")) {
      throw new AppError("Student email already exists", 409);
    }

    if (target.includes("mobileNumber") || target.includes("phone")) {
      throw new AppError("Student mobile number already exists", 409);
    }

    if (target.includes("studentCode") || target.includes("userCode")) {
      throw new AppError("Student code collision, please retry", 409);
    }

    throw new AppError("Duplicate student record", 409);
  }

  throw error;
}

export async function listStudents(query) {
  const { page, limit, skip, take } = buildPagination(query);
  const where = buildStudentWhere(query);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder);

  const orderBy = (() => {
    switch (sortBy) {
      case "studentname":
        return { studentName: sortOrder };
      case "emailaddress":
        return { emailAddress: sortOrder };
      case "mobilenumber":
        return { mobileNumber: sortOrder };
      case "course":
      case "courseinterested":
        return { courseInterested: sortOrder };
      case "batch":
      case "batchname":
        return { batchName: sortOrder };
      case "currentstatus":
        return { currentStatus: sortOrder };
      case "admissiondate":
        return { admissionDate: sortOrder };
      case "updatedat":
        return { updatedAt: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  })();

  const [total, rows] = await prisma.$transaction([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            status: true,
            mode: true,
          },
        },
      },
    }),
  ]);

  return {
    data: rows.map(toStudentSummary),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getCurrentStudentProfile(user) {
  const normalizedEmail = normalizeString(user?.email).toLowerCase();
  const normalizedUserCode = normalizeString(user?.userCode);

  if (!normalizedEmail && !normalizedUserCode) {
    throw new AppError("Student profile not found", 404);
  }

  const student = await prisma.studentProfile.findFirst({
    where: {
      OR: [
        ...(normalizedEmail ? [{ emailAddress: normalizedEmail }] : []),
        ...(normalizedUserCode ? [{ studentCode: normalizedUserCode }] : []),
      ],
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          status: true,
          mode: true,
        },
      },
    },
  });

  if (!student) {
    throw new AppError("Student profile not found", 404);
  }

  return toStudentDetail(student);
}

export async function createStudent(payload, actor) {
  const resolvedCourseId = normalizeString(payload.courseId);
  const course = await ensureCourse(resolvedCourseId, { requireActive: true });
  const parsed = buildStudentPayload(payload, null, course);
  const actorId = actor?.id ?? null;
  const studentCode = normalizeStudentCode();
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.passwordResetTokenExpiresMinutes * 60 * 1000);

  await ensureUniqueStudentIdentity(parsed);
  await ensureUniqueStudentLogin({
    emailAddress: parsed.emailAddress,
    mobileNumber: parsed.mobileNumber,
    studentCode,
  });

  let createdRecord;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const student = await tx.studentProfile.create({
        data: {
          ...parsed,
          studentCode,
          createdBy: actorId,
          updatedBy: actorId,
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              status: true,
              mode: true,
            },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          userCode: studentCode,
          fullName: parsed.studentName,
          email: parsed.emailAddress,
          phone: parsed.mobileNumber,
          role: "STUDENT",
          active: true,
          passwordHash,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      const resetTokenRecord = await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          createdBy: actorId,
        },
      });

      return {
        student,
        userId: user.id,
        resetTokenId: resetTokenRecord.id,
      };
    });

    createdRecord = created.student;
  } catch (error) {
    await handleKnownPrismaError(error);
  }

  if (!createdRecord) {
    return null;
  }

  try {
    await sendStudentCredentialsEmail({
      to: parsed.emailAddress,
      fullName: parsed.studentName,
      studentCode,
      temporaryPassword,
      resetToken,
    });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: {
          tokenHash,
        },
      });
      await tx.user.deleteMany({
        where: {
          userCode: studentCode,
        },
      });
      await tx.studentProfile.deleteMany({
        where: {
          studentCode,
        },
      });
    });
    throw error;
  }

  return toStudentDetail(createdRecord);
}

export async function getStudent(studentId) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          status: true,
          mode: true,
        },
      },
    },
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  return toStudentDetail(student);
}

export async function updateStudent(studentId, payload, actor) {
  const existingStudent = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      course: true,
    },
  });

  if (!existingStudent) {
    throw new AppError("Student not found", 404);
  }

  const nextCourseId = normalizeString(payload.courseId || existingStudent.courseId);
  const shouldRequireActiveCourse = !existingStudent.courseId || normalizeString(payload.courseId || "") !== existingStudent.courseId;
  const course = nextCourseId ? await ensureCourse(nextCourseId, { requireActive: shouldRequireActiveCourse }) : null;
  const parsed = buildStudentPayload(payload, existingStudent, course);
  const existingLoginUser = await findStudentLoginUser(existingStudent);

  if (parsed.emailAddress !== existingStudent.emailAddress || parsed.mobileNumber !== existingStudent.mobileNumber) {
    await ensureUniqueStudentIdentity(parsed, studentId);
    await ensureUniqueStudentLogin({
      emailAddress: parsed.emailAddress,
      mobileNumber: parsed.mobileNumber,
      studentCode: existingStudent.studentCode,
    });
  }

  const actorId = actor?.id ?? null;

  try {
    const updated = await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        ...parsed,
        updatedBy: actorId,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            status: true,
            mode: true,
          },
        },
      },
    });

    if (existingLoginUser) {
      await prisma.user.update({
        where: { id: existingLoginUser.id },
        data: {
          fullName: parsed.studentName,
          email: parsed.emailAddress,
          phone: parsed.mobileNumber,
          updatedBy: actorId,
        },
      });
    }

    return toStudentDetail(updated);
  } catch (error) {
    await handleKnownPrismaError(error);
  }
}

export async function deleteStudent(studentId, actor) {
  const existingStudent = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          status: true,
          mode: true,
        },
      },
    },
  });

  if (!existingStudent) {
    throw new AppError("Student not found", 404);
  }

  const existingLoginUser = await findStudentLoginUser(existingStudent);

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.studentProfile.delete({
      where: { id: studentId },
    });

    if (existingLoginUser) {
      await tx.user.deleteMany({
        where: { id: existingLoginUser.id },
      });
    }

    return existingStudent;
  });

  return toStudentDetail(deleted);
}
