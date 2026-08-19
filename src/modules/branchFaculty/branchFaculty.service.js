import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import config from "../../config/env.js";
import { hashPassword } from "../../common/utils/password.js";
import { sendFacultyCredentialsEmail } from "../../common/services/resendEmail.js";

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
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

export async function listBranchFaculty(actorUser, query) {
  const branchProfile = await getCurrentBranchProfile(actorUser);

  if (!branchProfile) {
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

  const where = {
    branchId: branchProfile.id,
  };

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
      },
    }),

    prisma.branchFaculty.count({
      where,
    }),
  ]);

  const normalizedData = data.map((faculty) => ({
    ...faculty,

    // Branch Admin assign panna BranchCourse first priority
    course:
      faculty.branchCourse ||
      faculty.course ||
      null,
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

  const existingId = await prisma.branchFaculty.findUnique({
    where: {
      branchId_facultyId: {
        branchId: branchProfile.id,
        facultyId: payload.facultyId,
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
        email: payload.email,
      },
    },
  });

  if (existingEmail) {
    throw new AppError("Email already exists in this branch.", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (existingUser) {
    throw new AppError("This email address is already registered to another account in the system.", 400);
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        userCode: `${branchProfile.branchId}-${payload.facultyId}`,
        fullName: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: "FACULTY",
        active: (!payload.status || payload.status.toUpperCase() === "ACTIVE"),
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

    return tx.branchFaculty.create({
      data: {
        branchId: branchProfile.id,
        facultyId: payload.facultyId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        country: payload.country || "",
        countryCode: payload.countryCode || "",
        state: payload.state || "",
        stateCode: payload.stateCode || "",
        city: payload.city || "",
        address: payload.address || "",
        courseId: courseLinks.courseId,
        branchCourseId: courseLinks.branchCourseId,
        status: payload.status ? payload.status.toUpperCase() : "ACTIVE",
        createdBy: actorUser.id,
      },
    });
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
    to: payload.email,
    fullName: payload.name,
    facultyId: payload.facultyId,
    temporaryPassword,
    resetToken,
    courseName: courseNameContext,
    batchNames: [], // Optional context
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
  const courseLinks = await resolveFacultyCourseLinks(branchProfile.id, payload, existing);

  if (payload.facultyId && payload.facultyId !== existing.facultyId) {
    const existingId = await prisma.branchFaculty.findUnique({
      where: {
        branchId_facultyId: {
          branchId: branchProfile.id,
          facultyId: payload.facultyId,
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
      facultyId: payload.facultyId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      country: payload.country,
      countryCode: payload.countryCode,
      state: payload.state,
      stateCode: payload.stateCode,
      city: payload.city,
      address: payload.address,
      courseId: courseLinks.courseId,
      branchCourseId: courseLinks.branchCourseId,
      status: payload.status ? payload.status.toUpperCase() : undefined,
      updatedBy: actorUser.id,
    },
  });

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
