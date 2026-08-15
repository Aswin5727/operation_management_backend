import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, " ");
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

function parseOptionalInt(value, fieldName, { allowZero = true } = {}) {
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

function parseStatus(value) {
  const status = normalizeString(value).toUpperCase() || "ACTIVE";
  if (!RECORD_STATUSES.has(status)) {
    throw new AppError("Invalid course status", 400);
  }
  return status;
}

async function resolveBranchProfile(actor) {
  const profile = await getCurrentBranchProfile(actor);
  if (!profile?.id) {
    throw new AppError("Branch profile not found", 404);
  }
  return profile;
}

function toBranchCourseSummary(course) {
  return {
    id: course.id,
    branchId: course.branchId,
    courseCode: course.courseCode,
    name: course.name,
    nameKey: course.nameKey,
    description: course.description,
    mode: course.mode,
    duration: course.duration,
    hours: course.hours,
    actualFees: course.actualFees,
    registrationFees: course.registrationFees,
    discount: course.discount,
    afterDiscount: course.afterDiscount,
    status: course.status,
    batches: 0,
    students: 0,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function toBranchCourseDetail(course) {
  return toBranchCourseSummary(course);
}

function buildBranchCourseWhere(query, actor = null) {
  const where = {};
  const search = normalizeString(query.search);

  if (query.status) {
    where.status = parseStatus(query.status);
  }

  if (search) {
    const numeric = Number(search);
    const conditions = [
      { courseCode: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { nameKey: { contains: normalizeKey(search), mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { mode: { contains: search, mode: "insensitive" } },
    ];

    if (Number.isInteger(numeric)) {
      conditions.push(
        { duration: numeric },
        { hours: numeric },
        { actualFees: numeric },
        { registrationFees: numeric },
        { discount: numeric },
        { afterDiscount: numeric },
      );
    }

    where.OR = conditions;
  }

  return resolveBranchProfile(actor).then((branchProfile) => ({
    ...where,
    branchId: branchProfile.id,
  }));
}

function buildBranchCourseOrderBy(sortBy, sortOrder) {
  switch (normalizeString(sortBy).toLowerCase()) {
    case "coursecode":
      return { courseCode: sortOrder };
    case "name":
      return { name: sortOrder };
    case "mode":
      return { mode: sortOrder };
    case "duration":
      return { duration: sortOrder };
    case "hours":
      return { hours: sortOrder };
    case "updatedat":
      return { updatedAt: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

async function ensureUniqueCourseName(nameKey, branchId, excludeId = null) {
  const existing = await prisma.branchCourse.findFirst({
    where: {
      branchId,
      nameKey,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Course name already exists", 409);
  }
}

async function ensureUniqueCourseCode(courseCode, branchId, excludeId = null) {
  const normalizedCourseCode = normalizeString(courseCode);

  if (!normalizedCourseCode) {
    throw new AppError("Course code is required", 400);
  }

  const existing = await prisma.branchCourse.findFirst({
    where: {
      branchId,
      courseCode: normalizedCourseCode,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Course code already exists", 409);
  }
}

function buildBranchCoursePayload(payload = {}, existingCourse = null) {
  const candidate = payload || {};
  const courseCode = parseRequiredText(candidate.courseCode ?? existingCourse?.courseCode, "Course code");
  const name = parseRequiredText(candidate.name ?? candidate.courseName ?? existingCourse?.name, "Course name");
  const description = parseOptionalText(candidate.description ?? existingCourse?.description);
  const mode = parseRequiredText(candidate.mode ?? existingCourse?.mode, "Mode");
  const duration = parseOptionalInt(candidate.duration ?? existingCourse?.duration, "Duration");
  const hours = parseOptionalInt(candidate.hours ?? existingCourse?.hours, "Hours");
  const actualFees = parseOptionalInt(candidate.actualFees ?? existingCourse?.actualFees, "Actual fees");
  const registrationFees = parseOptionalInt(
    candidate.registrationFees ?? existingCourse?.registrationFees,
    "Registration fees",
  );
  const discount = parseOptionalInt(candidate.discount ?? existingCourse?.discount ?? 0, "Discount", {
    allowZero: true,
  }) ?? 0;
  const afterDiscount =
    actualFees !== null && registrationFees !== null
      ? Math.max(actualFees + registrationFees - discount, 0)
      : existingCourse?.afterDiscount ?? null;
  const status = parseStatus(candidate.status ?? existingCourse?.status ?? "ACTIVE");

  return {
    courseCode,
    name,
    nameKey: normalizeKey(name),
    description,
    mode,
    duration,
    hours,
    actualFees,
    registrationFees,
    discount,
    afterDiscount,
    status,
  };
}

function buildBranchCourseListQuery(query = {}, branchId) {
  const pagination = buildPagination(query);
  const sortOrder = parseSortOrder(query.sortOrder, "desc");
  const sortBy = query.sortBy || "createdAt";
  const where = {
    branchId,
  };

  const search = normalizeString(query.search);
  if (query.status) {
    where.status = parseStatus(query.status);
  }

  if (search) {
    const numeric = Number(search);
    const conditions = [
      { courseCode: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { mode: { contains: search, mode: "insensitive" } },
      { nameKey: { contains: normalizeKey(search), mode: "insensitive" } },
    ];

    if (Number.isInteger(numeric)) {
      conditions.push(
        { duration: numeric },
        { hours: numeric },
        { actualFees: numeric },
        { registrationFees: numeric },
        { discount: numeric },
        { afterDiscount: numeric },
      );
    }

    where.OR = conditions;
  }

  return {
    where,
    orderBy: buildBranchCourseOrderBy(sortBy, sortOrder),
    ...pagination,
  };
}

export async function listBranchCourses(query, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const { where, orderBy, skip, take, page, limit } = buildBranchCourseListQuery(query, branchProfile.id);

  const [total, rows] = await Promise.all([
    prisma.branchCourse.count({ where }),
    prisma.branchCourse.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
  ]);

  return {
    data: rows.map(toBranchCourseSummary),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createBranchCourse(payload, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const branchId = branchProfile.id;
  const parsed = buildBranchCoursePayload(payload);
  const actorId = actor?.id ?? null;

  await ensureUniqueCourseName(parsed.nameKey, branchId);
  await ensureUniqueCourseCode(parsed.courseCode, branchId);

  const created = await prisma.branchCourse.create({
    data: {
      ...parsed,
      branchId,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  return toBranchCourseDetail(created);
}

export async function getBranchCourse(courseId, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const course = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId: branchProfile.id,
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return toBranchCourseDetail(course);
}

export async function updateBranchCourse(courseId, payload, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const existingCourse = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId: branchProfile.id,
    },
  });

  if (!existingCourse) {
    throw new AppError("Course not found", 404);
  }

  const parsed = buildBranchCoursePayload(payload, existingCourse);
  const actorId = actor?.id ?? null;

  await ensureUniqueCourseName(parsed.nameKey, branchProfile.id, courseId);
  await ensureUniqueCourseCode(parsed.courseCode, branchProfile.id, courseId);

  const updated = await prisma.branchCourse.update({
    where: { id: courseId },
    data: {
      ...parsed,
      branchId: branchProfile.id,
      updatedBy: actorId,
    },
  });

  return toBranchCourseDetail(updated);
}

export async function deleteBranchCourse(courseId, actor) {
  const branchProfile = await resolveBranchProfile(actor);
  const existingCourse = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId: branchProfile.id,
    },
  });

  if (!existingCourse) {
    throw new AppError("Course not found", 404);
  }

  await prisma.branchCourse.delete({
    where: { id: courseId },
  });

  return toBranchCourseDetail(existingCourse);
}
