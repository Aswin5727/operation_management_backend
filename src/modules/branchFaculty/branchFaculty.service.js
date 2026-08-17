import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

export async function listBranchFaculty(actorUser, query) {
  const branchProfile = await getCurrentBranchProfile(actorUser);
  if (!branchProfile) {
    throw new AppError("Branch profile not found.", 404);
  }

  const { page = 1, limit = 100, sortBy = "createdAt", sortOrder = "desc", search } = query;
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
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.branchFaculty.count({ where }),
  ]);

  return {
    data,
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

  const branchFaculty = await prisma.branchFaculty.create({
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
      status: payload.status ? payload.status.toUpperCase() : "ACTIVE",
      createdBy: actorUser.id,
    },
  });

  return branchFaculty;
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

  await prisma.branchFaculty.delete({
    where: { id: branchFacultyId },
  });

  return true;
}
