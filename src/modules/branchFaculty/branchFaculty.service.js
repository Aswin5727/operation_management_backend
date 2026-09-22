import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import config from "../../config/env.js";
import { hashPassword } from "../../common/utils/password.js";
import { sendFacultyCredentialsEmail } from "../../common/services/resendEmail.js";
import { normalizeBranchEntityId } from "../../common/utils/branchIdentifiers.js";

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function normalizeString(value) {
  return String(value ?? "").trim();
}
const FACULTY_WEEKLY_OFF_DAYS = new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
async function ensureUniqueBranchFacultyUserIdentity(prisma, { email, phone }) {
  const existingEmail = await prisma.user.findFirst({
    where: { email },
  });

  if (existingEmail) {
    throw new AppError("Email already registered in the system.", 400);
  }

  const existingPhone = await prisma.user.findFirst({
    where: { phone },
  });

  if (existingPhone) {
    throw new AppError("Phone number already registered in the system.", 400);
  }
}
export function parseBranchFacultyPayload(rawPayload = {}, defaults = {}) {
  const source = { ...defaults, ...(rawPayload || {}) };

  const facultyId = normalizeString(source.facultyId);
  const name = normalizeString(source.name);
  const email = normalizeString(source.email).toLowerCase();
  const phone = normalizeString(source.phone);
  const status = normalizeString(source.status || "ACTIVE").toUpperCase();
  const weeklyOffDay = normalizeString(source.weeklyOffDay).toUpperCase();

  if (!facultyId) {
    throw new AppError("Faculty ID is required", 400);
  }

  if (!name) {
    throw new AppError("Faculty name is required", 400);
  }

  if (!email) {
    throw new AppError("Faculty email is required", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Enter a valid faculty email address", 400);
  }

  if (!phone) {
    throw new AppError("Faculty phone is required", 400);
  }

  if (!/^\d{10}$/.test(phone)) {
    throw new AppError("Enter a valid 10-digit faculty phone number", 400);
  }

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    throw new AppError("Invalid faculty status", 400);
  }
  if (weeklyOffDay && !FACULTY_WEEKLY_OFF_DAYS.has(weeklyOffDay)) {
    throw new AppError("Faculty weekly off must be Monday to Friday", 400);
  }

  return {
    facultyId,
    name,
    email,
    phone,
    country: normalizeString(source.country),
    countryCode: normalizeString(source.countryCode),
    state: normalizeString(source.state),
    stateCode: normalizeString(source.stateCode),
    city: normalizeString(source.city),
    address: normalizeString(source.address),
    status,
    weeklyOffDay: weeklyOffDay || null,
  };
}

function createResetTokenArtifacts() {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.credentialResetTokenExpiresMinutes * 60 * 1000);
  return { resetToken, tokenHash, expiresAt };
}

function normalizeRelationId(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

async function resolveFacultyCourseLinks(branchId, payload = {}, existing = null) {
  const hasCourseId = Object.prototype.hasOwnProperty.call(payload, "courseId");
  const hasBranchCourseId = Object.prototype.hasOwnProperty.call(payload, "branchCourseId");

  const currentCourseId = normalizeRelationId(existing?.courseId);
  const currentBranchCourseId = normalizeRelationId(existing?.branchCourseId);

  const providedCourseId = normalizeRelationId(payload.courseId);
  const providedBranchCourseId = normalizeRelationId(payload.branchCourseId);

  let courseId = currentCourseId;
  let branchCourseId = currentBranchCourseId;

  if (hasCourseId) {
    if (!providedCourseId) {
      courseId = currentCourseId;
      branchCourseId = currentBranchCourseId;
    } else {
      const course = await prisma.course.findUnique({
        where: { id: providedCourseId },
        select: { id: true },
      });

      if (course) {
        courseId = course.id;
        branchCourseId = null;
      } else {
        const branchCourse = await prisma.branchCourse.findFirst({
          where: {
            id: providedCourseId,
            branchId,
          },
          select: { id: true },
        });

        if (branchCourse) {
          courseId = null;
          branchCourseId = branchCourse.id;
        } else {
          throw new AppError("Selected course not found in this branch.", 404);
        }
      }
    }
  }

  if (hasBranchCourseId) {
    if (!providedBranchCourseId) {
      branchCourseId = currentBranchCourseId;
    } else {
      const branchCourse = await prisma.branchCourse.findFirst({
        where: {
          id: providedBranchCourseId,
          branchId,
        },
        select: { id: true },
      });

      if (!branchCourse) {
        throw new AppError("Selected branch course not found in this branch.", 404);
      }

      branchCourseId = branchCourse.id;
      courseId = null;
    }
  }

  return {
    courseId,
    branchCourseId,
  };
}

async function syncFacultyCourseAssignment(tx, { branchId, facultyId, branchCourseId, actorId }) {
  if (!branchCourseId) return;
  await tx.branchFacultyCourse.upsert({
    where: { branchFacultyId_branchCourseId: { branchFacultyId: facultyId, branchCourseId } },
    create: { branchId, branchFacultyId: facultyId, branchCourseId, createdBy: actorId, updatedBy: actorId },
    update: { updatedBy: actorId },
  });
}

export async function listBranchFaculty(actorUser, query) {
  const role = normalizeString(actorUser?.role).toUpperCase();
  const branchProfile = role === "BRANCH_ADMIN" ? await getCurrentBranchProfile(actorUser) : null;

  if (role !== "SUPER_ADMIN" && !branchProfile) {
    throw new AppError("Branch profile not found.", 404);
  }

  const {
    page = 1,
    limit = 100,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where = {};
  if (branchProfile?.id) {
    where.branchId = branchProfile.id;
  } else if (role === "SUPER_ADMIN" && normalizeString(query.branchId)) {
    where.branchId = normalizeString(query.branchId);
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { facultyId: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.branchFaculty.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },

      include: {
        branch: {
          select: {
            id: true,
            branchId: true,
            branchName: true,
            branchAdminName: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },

        branchCourse: {
          select: {
            id: true,
            courseCode: true,
            name: true,
          },
        },

        _count: {
          select: {
            branchBatches: true,
          },
        },
        courseAssignments: { include: { branchCourse: { select: { id: true, courseCode: true, name: true, mode: true } } } },
      },
    }),

    prisma.branchFaculty.count({
      where,
    }),
  ]);

  const normalizedData = data.map((faculty) => ({
    ...faculty,
    branchName: faculty.branch?.branchName || "",
    branchAdminName: faculty.branch?.branchAdminName || "",

    // Branch Admin assign panna BranchCourse first priority
    course:
      faculty.branchCourse ||
      faculty.course ||
      null,
    courses: faculty.courseAssignments.map((assignment) => assignment.branchCourse).filter(Boolean),
  }));

  return {
    data: normalizedData,

    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    },
  };
}
export async function createBranchFaculty(actorUser, payload) {
  const branchProfile = await getCurrentBranchProfile(actorUser);
  if (!branchProfile) {
    throw new AppError("Branch profile not found.", 404);
  }
  const courseLinks = await resolveFacultyCourseLinks(branchProfile.id, payload);

  const parsed = parseBranchFacultyPayload(payload, { status: "ACTIVE" });
  parsed.facultyId = normalizeBranchEntityId(parsed.facultyId, branchProfile.branchId, "FC");
  let userCode = parsed.facultyId;

  const existingId = await prisma.branchFaculty.findUnique({
    where: {
      branchId_facultyId: {
        branchId: branchProfile.id,
        facultyId: parsed.facultyId,
      },
    },
  });

  if (existingId) {
    throw new AppError("Faculty ID already exists in this branch.", 400);
  }

  const existingEmail = await prisma.branchFaculty.findUnique({
    where: {
      branchId_email: {
        branchId: branchProfile.id,
        email: parsed.email,
      },
    },
  });

  if (existingEmail) {
    throw new AppError("Email already exists in this branch.", 400);
  }

  await ensureUniqueBranchFacultyUserIdentity(prisma, {
    email: parsed.email,
    phone: parsed.phone,
  });

  const existingUserCode = await prisma.user.findUnique({ where: { userCode } });

  // Faculty IDs are generated by the UI, but older/orphan User rows can make
  // a locally unused ID globally occupied. Skip those IDs instead of blocking
  // a valid new faculty account because User.userCode is globally unique.
  if (existingUserCode) {
    const prefix = userCode.replace(/\d{3}$/, "");
    const [branchFacultyIds, userCodes] = await Promise.all([
      prisma.branchFaculty.findMany({
        where: { facultyId: { startsWith: prefix } },
        select: { facultyId: true },
      }),
      prisma.user.findMany({
        where: { userCode: { startsWith: prefix } },
        select: { userCode: true },
      }),
    ]);
    const usedNumbers = [
      ...branchFacultyIds.map((item) => item.facultyId),
      ...userCodes.map((item) => item.userCode),
    ]
      .map((value) => Number(String(value).match(/(\d{3})$/)?.[1] || 0))
      .filter((value) => Number.isInteger(value) && value > 0);
    let nextNumber = Math.max(...usedNumbers, 0) + 1;
    let nextUserCode = `${prefix}${String(nextNumber).padStart(3, "0")}`;
    while (await prisma.user.findUnique({ where: { userCode: nextUserCode } })) {
      nextNumber += 1;
      nextUserCode = `${prefix}${String(nextNumber).padStart(3, "0")}`;
    }
    parsed.facultyId = nextUserCode;
    userCode = nextUserCode;
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        userCode,
        fullName: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        role: "FACULTY",
        active: parsed.status === "ACTIVE",
        passwordHash,
        createdBy: actorUser.id,
        updatedBy: actorUser.id,
      },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        createdBy: actorUser.id,
      },
    });

    const createdFaculty = await tx.branchFaculty.create({
      data: {
        branchId: branchProfile.id,
        // Persist the same normalized values used for the login user. This
        // keeps branch faculty lookup and the global userCode in sync.
        facultyId: parsed.facultyId,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        country: parsed.country,
        countryCode: parsed.countryCode,
        state: parsed.state,
        stateCode: parsed.stateCode,
        city: parsed.city,
        address: parsed.address,
        courseId: courseLinks.courseId,
        branchCourseId: courseLinks.branchCourseId,
        status: parsed.status,
        weeklyOffDay: parsed.weeklyOffDay,
        createdBy: actorUser.id,
      },
    });
    await syncFacultyCourseAssignment(tx, { branchId: branchProfile.id, facultyId: createdFaculty.id, branchCourseId: courseLinks.branchCourseId, actorId: actorUser.id });
    return createdFaculty;
  });

  let courseNameContext = "";
  if (payload.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: payload.courseId },
      select: { name: true }
    });
    if (course) courseNameContext = course.name;
  }

  void sendFacultyCredentialsEmail({
    to: parsed.email,
    fullName: parsed.name,
    facultyId: parsed.facultyId,
    temporaryPassword,
    resetToken,
    courseName: courseNameContext,
    batchNames: [],
  }).catch((error) => {
    console.warn("Faculty credentials email failed to send", error);
  });

  return created;
}

export async function updateBranchFaculty(actorUser, branchFacultyId, payload) {
  const branchProfile = await getCurrentBranchProfile(actorUser);
  if (!branchProfile) {
    throw new AppError("Branch profile not found.", 404);
  }

  const existing = await prisma.branchFaculty.findFirst({
    where: {
      id: branchFacultyId,
      branchId: branchProfile.id,
    },
  });

  if (!existing) {
    throw new AppError("Branch faculty not found.", 404);
  }
  const normalizedPayload = {
    ...payload,
    facultyId: payload.facultyId
      ? normalizeBranchEntityId(payload.facultyId, branchProfile.branchId, "FC")
      : existing.facultyId,
    name: payload.name ?? existing.name,
    email: payload.email ?? existing.email,
    phone: payload.phone ?? existing.phone,
    status: payload.status ?? existing.status,
    weeklyOffDay: Object.prototype.hasOwnProperty.call(payload, "weeklyOffDay")
      ? payload.weeklyOffDay
      : existing.weeklyOffDay,
  };
  const parsed = parseBranchFacultyPayload(normalizedPayload);
  const courseLinks = await resolveFacultyCourseLinks(branchProfile.id, normalizedPayload, existing);

  if (normalizedPayload.facultyId && normalizedPayload.facultyId !== existing.facultyId) {
    const existingId = await prisma.branchFaculty.findUnique({
      where: {
        branchId_facultyId: {
          branchId: branchProfile.id,
          facultyId: normalizedPayload.facultyId,
        },
      },
    });

    if (existingId) {
      throw new AppError("Faculty ID already exists in this branch.", 400);
    }
  }

  if (payload.email && payload.email !== existing.email) {
    const existingEmail = await prisma.branchFaculty.findUnique({
      where: {
        branchId_email: {
          branchId: branchProfile.id,
          email: payload.email,
        },
      },
    });

    if (existingEmail) {
      throw new AppError("Email already exists in this branch.", 400);
    }
  }

  const updated = await prisma.branchFaculty.update({
    where: { id: branchFacultyId },
    data: {
      facultyId: parsed.facultyId,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      country: normalizedPayload.country,
      countryCode: normalizedPayload.countryCode,
      state: normalizedPayload.state,
      stateCode: normalizedPayload.stateCode,
      city: normalizedPayload.city,
      address: normalizedPayload.address,
      courseId: courseLinks.courseId,
      branchCourseId: courseLinks.branchCourseId,
      status: parsed.status,
      weeklyOffDay: parsed.weeklyOffDay,
      updatedBy: actorUser.id,
    },
  });

  await syncFacultyCourseAssignment(prisma, { branchId: branchProfile.id, facultyId: updated.id, branchCourseId: courseLinks.branchCourseId, actorId: actorUser.id });

  return updated;
}

export async function deleteBranchFaculty(actorUser, branchFacultyId) {
  const branchProfile = await getCurrentBranchProfile(actorUser);
  if (!branchProfile) {
    throw new AppError("Branch profile not found.", 404);
  }

  const existing = await prisma.branchFaculty.findFirst({
    where: {
      id: branchFacultyId,
      branchId: branchProfile.id,
    },
  });

  if (!existing) {
    throw new AppError("Branch faculty not found.", 404);
  }

  // Run everything inside a transaction so partial failures don't leave orphaned records
  await prisma.$transaction(async (tx) => {
    // 1. Delete the BranchFaculty row first
    await tx.branchFaculty.delete({
      where: { id: branchFacultyId },
    });

    // 2. Find the linked User account by email
    const associatedUser = await tx.user.findUnique({
      where: { email: existing.email },
    });

    if (associatedUser) {
      // 3. Remove BatchFacultyAssignments — these use onDelete: Restrict so they MUST be
      //    deleted before we can delete the User, otherwise Prisma/Postgres throws a
      //    foreign-key violation and the User record is never removed (causing the
      //    "email already registered" error on the next create attempt).
      await tx.batchFacultyAssignment.deleteMany({
        where: { facultyId: associatedUser.id },
      });

      // 4. Remove PasswordResetTokens (onDelete: Cascade would handle this, but being
      //    explicit keeps the intent clear)
      await tx.passwordResetToken.deleteMany({
        where: { userId: associatedUser.id },
      });

      // 5. Finally delete the User — FacultyAttendanceSessions cascade automatically,
      //    StudentAttendance rows are set to null automatically by the schema.
      await tx.user.delete({
        where: { id: associatedUser.id },
      });
    }
  });

  return true;
}
