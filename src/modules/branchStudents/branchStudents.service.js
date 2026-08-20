import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { sendStudentCredentialsEmail } from "../../common/services/resendEmail.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const CURRENT_STATUSES = new Set(["Student", "Employee", "Other"]);

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
  const parentSpouseNumber = parsePhone(candidate.parentSpouseNumber, "Parent / spouse number");
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

  if (currentStatus === "Employee" && !designation) {
    throw new AppError("Designation is required for employees", 400);
  }

  if (source === "Others" && !sourceOther) {
    throw new AppError("Source details are required when source is Others", 400);
  }

  return {
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
    recordStatus,
  };
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
    status: displayStatus(record.recordStatus),
    recordStatus: record.recordStatus,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
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

  const parsed = buildBranchStudentPayload(payload);
  const actorId = actor?.id ?? null;
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  await ensureUniqueBranchStudentIdentity(parsed, branchId);

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
            ...parsed,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

        const user = await tx.user.create({
          data: {
            userCode: buildBranchStudentUserCode(branchProfile?.branchId || branchId, studentId),
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

        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            createdBy: actorId,
          },
        });

        return student;
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
    to: parsed.emailAddress,
    fullName: parsed.studentName,
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

  const parsed = buildBranchStudentPayload(payload, existing);
  const existingLoginUser = await findBranchStudentLoginUser(existing);
  await ensureUniqueBranchStudentIdentity(parsed, existing.branchId, existing.id, existingLoginUser?.id);
  const updated = await prisma.$transaction(async (tx) => {
    const student = await tx.branchStudent.update({
      where: { id: existing.id },
      data: {
        ...parsed,
        updatedBy: actor?.id ?? null,
      },
    });

    if (existingLoginUser) {
      await tx.user.update({
        where: { id: existingLoginUser.id },
        data: {
          fullName: parsed.studentName,
          email: parsed.emailAddress,
          phone: parsed.mobileNumber,
          updatedBy: actor?.id ?? null,
        },
      });
    }

    return student;
  });

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
