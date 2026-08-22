import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import {
  sendFacultyCredentialsEmail,
} from "../../common/services/resendEmail.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeSearchKey(value) {
  return normalizeString(value).toLowerCase();
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
  if (order === "asc" || order === "desc") return order;
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

function parseRequiredText(value, fieldName) {
  const text = normalizeString(value);
  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return text;
}

function parseStatus(value, fieldName = "status") {
  const normalized = normalizeString(value).toUpperCase();
  if (!RECORD_STATUSES.has(normalized)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return normalized;
}

function parseEmail(value) {
  const email = parseRequiredText(value, "Faculty email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Enter a valid faculty email address", 400);
  }
  return email;
}

function parsePhone(value) {
  const phone = parseRequiredText(value, "Faculty phone");
  if (!/^\d{10}$/.test(phone)) {
    throw new AppError("Enter a valid 10-digit faculty phone number", 400);
  }
  return phone;
}

function normalizeCourseIds(value, fallback = "") {
  const courseIds = Array.isArray(value)
    ? value
    : String(fallback || "").trim()
      ? [fallback]
      : [];

  return Array.from(
    new Set(
      courseIds
        .map((courseId) => normalizeString(courseId))
        .filter(Boolean),
    ),
  );
}

function normalizeFacultyCode() {
  return `FAC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

async function ensureUniqueFacultyLogin({ facultyEmail, facultyPhone, facultyCode = null }, excludeUserId = null) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: facultyEmail },
        { phone: facultyPhone },
        ...(facultyCode ? [{ userCode: facultyCode }] : []),
      ],
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      userCode: true,
    },
  });

  if (!existing) {
    return;
  }

  if (existing.email === facultyEmail) {
    throw new AppError("Faculty email already exists", 409);
  }

  if (existing.phone === facultyPhone) {
    throw new AppError("Faculty phone number already exists", 409);
  }

  if (facultyCode && existing.userCode === facultyCode) {
    throw new AppError("Faculty code collision, please retry", 409);
  }

  throw new AppError("Duplicate faculty login account", 409);
}

function resolveBatchTimingFromEntry(entry = {}) {
  const directTiming = normalizeString(entry?.batchTiming);
  if (directTiming) {
    return directTiming;
  }

  const preset = normalizeString(entry?.batchTimingPreset);
  if (preset && preset !== "Custom") {
    return preset;
  }

  const start = normalizeString(entry?.batchTimingCustomStart);
  const startMeridiem = normalizeString(entry?.batchTimingCustomStartMeridiem || "AM").toUpperCase();
  const end = normalizeString(entry?.batchTimingCustomEnd);
  const endMeridiem = normalizeString(entry?.batchTimingCustomEndMeridiem || "PM").toUpperCase();

  if (start && end) {
    return `${start} ${startMeridiem} - ${end} ${endMeridiem}`;
  }

  return "";
}

function parseBatchEntries(value) {
  if (!Array.isArray(value) || !value.length) {
    throw new AppError("Add at least one batch", 400);
  }

  const seenBatchNamesByCourse = new Map();

  return value.map((entry, index) => {
    const batchName = parseRequiredText(entry?.batchName, `Batch ${index + 1} name`);
    const batchTiming = parseRequiredText(resolveBatchTimingFromEntry(entry), `Batch ${index + 1} timing`);
    const courseId = parseRequiredText(entry?.courseId, `Batch ${index + 1} course`);
    const normalizedCourseId = normalizeSearchKey(courseId);
    const normalizedName = normalizeSearchKey(batchName);
    const existingNames = seenBatchNamesByCourse.get(normalizedCourseId) || new Set();

    if (existingNames.has(normalizedName)) {
      throw new AppError("Batch names must be unique within the same course", 400);
    }

    existingNames.add(normalizedName);
    seenBatchNamesByCourse.set(normalizedCourseId, existingNames);

    return {
      sequenceNo: index + 1,
      courseId,
      batchName,
      batchTiming,
    };
  });
}

function normalizeBatchEntriesPayload(payload) {
  if (Array.isArray(payload?.batchEntries) && payload.batchEntries.length) {
    return payload.batchEntries;
  }

  const batchName = normalizeString(payload?.batchName);
  const batchTiming = resolveBatchTimingFromEntry(payload);
  const courseId = normalizeString(payload?.courseId || payload?.batchCourseId);

  if (batchName && batchTiming && courseId) {
    return [
      {
        batchName,
        batchTiming,
        courseId,
      },
    ];
  }

  return [];
}

function getFacultyCourseInclude() {
  return {
    modules: {
      orderBy: { sequenceNo: "asc" },
    },
    batches: {
      orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        courseId: true,
        batchName: true,
        description: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        capacity: true,
        enrolledCount: true,
        status: true,
        statusChangedAt: true,
        statusChangedBy: true,
        createdBy: true,
        updatedBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            facultyAssignments: true,
          },
        },
      },
    },
    _count: {
      select: {
        modules: true,
        batches: true,
      },
    },
  };
}

function toCourseSummary(course) {
  if (!course) return null;

  return {
    id: course.id,
    name: course.name,
    courseCode: course.courseCode,
    branchId: course.branchId,
    description: course.description,
    feeReference: course.feeReference,
    mode: course.mode,
    duration: course.duration,
    hours: course.hours,
    actualFees: course.actualFees,
    registrationFees: course.registrationFees,
    discount: course.discount,
    afterDiscount: course.afterDiscount,
    installmentCount: course.installmentCount,
    installment1: course.installment1,
    installment2: course.installment2,
    installment3: course.installment3,
    installments: Array.isArray(course.installments) ? course.installments : [],
    status: course.status,
    statusChangedAt: course.statusChangedAt,
    statusChangedBy: course.statusChangedBy,
    createdBy: course.createdBy,
    updatedBy: course.updatedBy,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    moduleCount: course._count?.modules ?? course.moduleCount ?? 0,
    batchCount: course._count?.batches ?? course.batchCount ?? 0,
  };
}

function toCourseModule(module) {
  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    description: module.description,
    sequenceNo: module.sequenceNo,
    status: module.status === "ACTIVE" ? "Active" : "Inactive",
    statusChangedAt: module.statusChangedAt,
    statusChangedBy: module.statusChangedBy,
    createdBy: module.createdBy,
    updatedBy: module.updatedBy,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
  };
}

function toCourseBatch(batch) {
  return {
    id: batch.id,
    courseId: batch.courseId,
    batchName: batch.batchName,
    description: batch.description,
    startDate: batch.startDate,
    endDate: batch.endDate,
    startTime: batch.startTime,
    endTime: batch.endTime,
    capacity: batch.capacity,
    enrolledCount: batch.enrolledCount,
    status: batch.status === "ACTIVE" ? "Active" : batch.status === "INACTIVE" ? "Inactive" : batch.status,
    statusChangedAt: batch.statusChangedAt,
    statusChangedBy: batch.statusChangedBy,
    createdBy: batch.createdBy,
    updatedBy: batch.updatedBy,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    facultyAssignmentCount: batch._count?.facultyAssignments ?? 0,
  };
}

function toCourseDetail(course) {
  const summary = toCourseSummary(course);
  if (!summary) return null;

  return {
    ...summary,
    modules: Array.isArray(course.modules) ? course.modules.map(toCourseModule) : [],
    batches: Array.isArray(course.batches) ? course.batches.map(toCourseBatch) : [],
  };
}

function toCourseAssignmentSummary(assignment) {
  return {
    id: assignment.id,
    facultyId: assignment.facultyId,
    courseId: assignment.courseId || "",
    courseName: assignment.course?.name || "",
    course: assignment.course ? toCourseDetail(assignment.course) : null,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

function toBatchEntry(entry) {
  return {
    id: entry.id,
    facultyId: entry.facultyId,
    courseId: entry.courseId || "",
    courseName: entry.course?.name || "",
    course: entry.course ? toCourseDetail(entry.course) : null,
    batchName: entry.batchName,
    batchTiming: entry.batchTiming,
    sequenceNo: entry.sequenceNo,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function toFacultyRecord(record) {
  const batchEntries = Array.isArray(record.batchEntries) ? record.batchEntries.map(toBatchEntry) : [];
  const courseAssignments = Array.isArray(record.courseAssignments) ? record.courseAssignments.map(toCourseAssignmentSummary) : [];
  const courseIds = Array.from(
    new Set(
      [
        record.courseId,
        ...courseAssignments.map((assignment) => assignment.courseId),
        ...batchEntries.map((entry) => entry.courseId),
      ]
        .map((courseId) => normalizeString(courseId))
        .filter(Boolean),
    ),
  );

  return {
    id: record.id,
    facultyName: record.facultyName,
    facultyEmail: record.facultyEmail,
    facultyPhone: record.facultyPhone,
    courseId: record.courseId,
    courseIds,
    courseName: record.course?.name || "",
    course: toCourseDetail(record.course),
    courseAssignments,
    status: record.status === "ACTIVE" ? "Active" : "Inactive",
    batchEntries,
    batchCount: batchEntries.length,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdOn: record.createdAt,
    updatedOn: record.updatedAt,
  };
}

function mapBranchCourseModule(module) {
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    sequenceNo: module.sequenceNo,
    status: module.status,
    submodules: Array.isArray(module.submodules)
      ? module.submodules.map((submodule) => ({
          id: submodule.id,
          title: submodule.title,
          description: submodule.description,
          sequenceNo: submodule.sequenceNo,
          status: submodule.status,
        }))
      : [],
  };
}

function mapBranchCourseToFacultyCourse(branchCourse = null) {
  if (!branchCourse) {
    return null;
  }

  return {
    id: branchCourse.id,
    name: branchCourse.name,
    courseCode: branchCourse.courseCode || "",
    branchId: branchCourse.branchId || "",
    description: branchCourse.description || "",
    feeReference: branchCourse.feeReference || "",
    mode: branchCourse.mode || "",
    duration: branchCourse.duration ?? null,
    hours: branchCourse.hours ?? null,
    actualFees: branchCourse.actualFees ?? null,
    registrationFees: branchCourse.registrationFees ?? null,
    discount: branchCourse.discount ?? null,
    afterDiscount: branchCourse.afterDiscount ?? null,
    status: branchCourse.status || "ACTIVE",
    modules: Array.isArray(branchCourse.modules) ? branchCourse.modules.map(mapBranchCourseModule) : [],
    batches: [],
  };
}

function buildFacultyFallbackRecord(user, branchFaculty, branchCourse = null) {
  const fallbackCourse = mapBranchCourseToFacultyCourse(branchCourse);

  return {
    id: branchFaculty?.id || user?.id || "",
    facultyName: branchFaculty?.name || user?.fullName || "",
    facultyEmail: branchFaculty?.email || user?.email || "",
    facultyPhone: branchFaculty?.phone || user?.phone || "",
    courseId: branchFaculty?.courseId || branchFaculty?.branchCourseId || fallbackCourse?.id || "",
    courseIds: Array.from(
      new Set(
        [branchFaculty?.courseId, branchFaculty?.branchCourseId, fallbackCourse?.id]
          .map((courseId) => normalizeString(courseId))
          .filter(Boolean),
      ),
    ),
    courseName: fallbackCourse?.name || branchFaculty?.branchCourse?.name || branchFaculty?.course?.name || "",
    course: fallbackCourse,
    courseAssignments: fallbackCourse
      ? [
          {
            id: branchFaculty?.branchCourseId || branchFaculty?.courseId || fallbackCourse.id,
            facultyId: branchFaculty?.id || user?.id || "",
            courseId: fallbackCourse.id,
            courseName: fallbackCourse.name,
            course: fallbackCourse,
            createdAt: branchFaculty?.createdAt || null,
            updatedAt: branchFaculty?.updatedAt || null,
          },
        ]
      : [],
    status: branchFaculty?.status === "INACTIVE" ? "Inactive" : "Active",
    batchEntries: [],
    batchCount: 0,
    createdBy: branchFaculty?.createdBy || null,
    updatedBy: branchFaculty?.updatedBy || null,
    createdAt: branchFaculty?.createdAt || null,
    updatedAt: branchFaculty?.updatedAt || null,
    createdOn: branchFaculty?.createdAt || null,
    updatedOn: branchFaculty?.updatedAt || null,
  };
}

async function ensureActiveCourse(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      name: true,
      mode: true,
      status: true,
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  if (course.status !== "ACTIVE") {
    throw new AppError("Selected course is inactive", 409);
  }

  return course;
}

async function ensureUniqueIdentity({ facultyEmail, facultyPhone }, excludeId = null) {
  const existing = await prisma.facultyProfile.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ facultyEmail }, { facultyPhone }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      facultyEmail: true,
      facultyPhone: true,
    },
  });

  if (!existing) return;

  if (existing.facultyEmail === facultyEmail) {
    throw new AppError("Faculty email already exists", 409);
  }

  if (existing.facultyPhone === facultyPhone) {
    throw new AppError("Faculty phone number already exists", 409);
  }

  throw new AppError("Faculty record already exists", 409);
}

function buildFacultyWhere(query) {
  const where = {};
  const search = normalizeSearchKey(query.search);

  if (query.status) {
    where.status = parseStatus(query.status);
  } else {
    where.status = "ACTIVE";
  }

  if (query.courseId) {
    where.courseId = normalizeString(query.courseId);
  }

  if (search) {
    where.OR = [
      { facultyName: { contains: search, mode: "insensitive" } },
      { facultyEmail: { contains: search, mode: "insensitive" } },
      { facultyPhone: { contains: search, mode: "insensitive" } },
      { course: { is: { name: { contains: search, mode: "insensitive" } } } },
      { batchEntries: { some: { batchName: { contains: search, mode: "insensitive" } } } },
      { batchEntries: { some: { batchTiming: { contains: search, mode: "insensitive" } } } },
    ];
  }

  return where;
}

function buildFacultyOrderBy(sortBy, sortOrder) {
  switch (sortBy) {
    case "facultyname":
      return { facultyName: sortOrder };
    case "facultyemail":
      return { facultyEmail: sortOrder };
    case "facultyphone":
      return { facultyPhone: sortOrder };
    case "coursename":
      return { course: { name: sortOrder } };
    case "updatedat":
      return { updatedAt: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

async function loadFacultyRecord(facultyId) {
  return prisma.facultyProfile.findUnique({
    where: { id: facultyId },
    include: {
      course: {
        include: getFacultyCourseInclude(),
      },
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
        include: {
          course: {
            include: getFacultyCourseInclude(),
          },
        },
      },
      courseAssignments: {
        orderBy: { createdAt: "asc" },
        include: {
          course: {
            include: getFacultyCourseInclude(),
          },
        },
      },
    },
  });
}

async function findFacultyLoginUser(existingFaculty) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: existingFaculty.facultyEmail },
        { phone: existingFaculty.facultyPhone },
      ],
    },
  });
}

async function getFacultyProfileForUser(user) {
  const normalizedEmail = normalizeString(user?.email).toLowerCase();
  const normalizedUserCode = normalizeString(user?.userCode);
  const normalizedUserId = normalizeString(user?.id);

  const record = await prisma.facultyProfile.findFirst({
    where: {
      OR: [
        ...(normalizedEmail ? [{ facultyEmail: normalizedEmail }] : []),
        ...(normalizedUserCode ? [{ facultyEmail: normalizedUserCode }] : []),
        ...(normalizedUserId ? [{ facultyEmail: normalizedUserId }] : []),
      ],
    },
    include: {
      course: {
        include: getFacultyCourseInclude(),
      },
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
        include: {
          course: {
            include: getFacultyCourseInclude(),
          },
        },
      },
      courseAssignments: {
        orderBy: { createdAt: "asc" },
        include: {
          course: {
            include: getFacultyCourseInclude(),
          },
        },
      },
    },
  });

  if (!record) {
    const branchFaculty = await prisma.branchFaculty.findFirst({
      where: {
        OR: [
          ...(normalizedEmail
            ? [
                {
                  email: {
                    equals: normalizedEmail,
                    mode: "insensitive",
                  },
                },
              ]
            : []),
          ...(normalizedUserCode
            ? [
                {
                  facultyId: {
                    equals: normalizedUserCode,
                    mode: "insensitive",
                  },
                },
              ]
            : []),
          ...(normalizedUserId ? [{ facultyId: normalizedUserId }] : []),
        ],
      },
      include: {
        branchCourse: {
          include: {
            modules: {
              orderBy: { sequenceNo: "asc" },
              include: {
                submodules: {
                  orderBy: { sequenceNo: "asc" },
                },
              },
            },
          },
        },
        course: {
          include: {
            modules: {
              orderBy: { sequenceNo: "asc" },
            },
          },
        },
      },
    });

    if (!branchFaculty) {
      throw new AppError("Faculty profile not found", 404);
    }

    return buildFacultyFallbackRecord(user, branchFaculty, branchFaculty.branchCourse || branchFaculty.course || null);
  }

  return toFacultyRecord(record);
}

function handleKnownPrismaError(error) {
  if (error?.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "unique field";

    if (target.includes("facultyEmail") || target.includes("email")) {
      throw new AppError("Faculty email already exists", 409);
    }

    if (target.includes("facultyPhone") || target.includes("phone")) {
      throw new AppError("Faculty phone number already exists", 409);
    }

    if (target.includes("userCode")) {
      throw new AppError("Faculty code collision, please retry", 409);
    }

    throw new AppError("Duplicate faculty record", 409);
  }

  throw error;
}

export async function listFacultyRecords(query) {
  const { page, limit, skip, take } = buildPagination(query);
  const where = buildFacultyWhere(query);
  const sortBy = normalizeSearchKey(query.sortBy) || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder);

  const [total, rows] = await prisma.$transaction([
    prisma.facultyProfile.count({ where }),
    prisma.facultyProfile.findMany({
      where,
      orderBy: buildFacultyOrderBy(sortBy, sortOrder),
      skip,
      take,
      include: {
        course: {
          include: getFacultyCourseInclude(),
        },
        batchEntries: {
          orderBy: { sequenceNo: "asc" },
          include: {
            course: {
              include: getFacultyCourseInclude(),
            },
          },
        },
        courseAssignments: {
          orderBy: { createdAt: "asc" },
          include: {
            course: {
              include: getFacultyCourseInclude(),
            },
          },
        },
      },
    }),
  ]);

  return {
    data: rows.map(toFacultyRecord),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getFacultyRecord(facultyId) {
  const record = await loadFacultyRecord(facultyId);
  if (!record) {
    throw new AppError("Faculty record not found", 404);
  }

  return toFacultyRecord(record);
}

export async function getCurrentFacultyProfile(user) {
  if (String(user?.role || "").toUpperCase() !== "FACULTY") {
    throw new AppError("Faculty profile not found", 404);
  }

  return getFacultyProfileForUser(user);
}

export async function createFacultyRecord(payload, actor) {
  const facultyName = parseRequiredText(payload.facultyName, "Faculty name");
  const facultyEmail = parseEmail(payload.facultyEmail);
  const facultyPhone = parsePhone(payload.facultyPhone);
  const status = parseStatus(payload.status ?? "ACTIVE");
  const selectedCourseIds = normalizeCourseIds(payload.courseIds, payload.courseId);
  const batchEntries = parseBatchEntries(normalizeBatchEntriesPayload(payload));
  const facultyCode = normalizeFacultyCode();
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.credentialResetTokenExpiresMinutes * 60 * 1000);

  const batchCourseIds = Array.from(new Set(batchEntries.map((entry) => normalizeString(entry.courseId)).filter(Boolean)));
  const effectiveCourseIds = selectedCourseIds.length ? selectedCourseIds : batchCourseIds;

  if (!effectiveCourseIds.length) {
    throw new AppError("Course is required", 400);
  }

  if (selectedCourseIds.length && batchCourseIds.some((courseId) => !selectedCourseIds.includes(courseId))) {
    throw new AppError("Batch course selection is invalid", 400);
  }

  if (effectiveCourseIds.some((courseId) => !batchCourseIds.includes(courseId))) {
    throw new AppError("Add at least one batch for each selected course", 400);
  }

  await Promise.all(effectiveCourseIds.map((courseId) => ensureActiveCourse(courseId)));
  await ensureUniqueIdentity({ facultyEmail, facultyPhone });
  await ensureUniqueFacultyLogin({ facultyEmail, facultyPhone, facultyCode });

  const actorId = actor?.id ?? null;
  const primaryCourseId = effectiveCourseIds[0] || null;

  let record = null;

  try {
    record = await prisma.$transaction(async (tx) => {
      const created = await tx.facultyProfile.create({
        data: {
          facultyName,
          facultyEmail,
          facultyPhone,
          courseId: primaryCourseId,
          status,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      const user = await tx.user.create({
        data: {
          userCode: facultyCode,
          fullName: facultyName,
          email: facultyEmail,
          phone: facultyPhone,
          role: "FACULTY",
          active: status === "ACTIVE",
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

      await tx.facultyBatchEntry.createMany({
        data: batchEntries.map((entry) => ({
          facultyId: created.id,
          courseId: normalizeString(entry.courseId) || primaryCourseId,
          batchName: entry.batchName,
          batchTiming: entry.batchTiming,
          sequenceNo: entry.sequenceNo,
        })),
      });

      await tx.facultyCourseAssignment.createMany({
        data: effectiveCourseIds.map((courseId) => ({
          facultyId: created.id,
          courseId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });

      return tx.facultyProfile.findUnique({
        where: { id: created.id },
      include: {
        course: {
          include: getFacultyCourseInclude(),
        },
        batchEntries: {
          orderBy: { sequenceNo: "asc" },
          include: {
            course: {
              include: getFacultyCourseInclude(),
            },
          },
        },
        courseAssignments: {
          orderBy: { createdAt: "asc" },
          include: {
            course: {
              include: getFacultyCourseInclude(),
            },
          },
        },
      },
      });
    });
  } catch (error) {
    handleKnownPrismaError(error);
  }

  if (!record) {
    throw new AppError("Faculty record could not be created", 500);
  }

  void sendFacultyCredentialsEmail({
    to: facultyEmail,
    fullName: facultyName,
    facultyCode,
    temporaryPassword,
    resetToken,
    courseName: record.course?.name || "",
    batchNames: batchEntries.map((entry) => entry.batchName),
  }).catch((error) => {
    console.warn("Faculty credentials email failed to send", error);
  });

  return toFacultyRecord(record);
}

export async function updateFacultyRecord(facultyId, payload, actor) {
  const existing = await prisma.facultyProfile.findUnique({
    where: { id: facultyId },
    include: {
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
      },
      courseAssignments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!existing) {
    throw new AppError("Faculty record not found", 404);
  }

  const facultyName =
    payload.facultyName !== undefined ? parseRequiredText(payload.facultyName, "Faculty name") : existing.facultyName;
  const facultyEmail = payload.facultyEmail !== undefined ? parseEmail(payload.facultyEmail) : existing.facultyEmail;
  const facultyPhone = payload.facultyPhone !== undefined ? parsePhone(payload.facultyPhone) : existing.facultyPhone;
  const status = payload.status !== undefined ? parseStatus(payload.status) : existing.status;
  const existingCourseIds = Array.isArray(existing.courseAssignments)
    ? existing.courseAssignments.map((assignment) => normalizeString(assignment.courseId)).filter(Boolean)
    : [];
  const selectedCourseIds = normalizeCourseIds(
    payload.courseIds,
    payload.courseId || existing.courseId || existingCourseIds[0] || "",
  );
  const normalizedBatchEntriesPayload = normalizeBatchEntriesPayload(payload);
  const batchEntries =
    Array.isArray(payload.batchEntries) || normalizedBatchEntriesPayload.length
      ? parseBatchEntries(normalizedBatchEntriesPayload)
      : existing.batchEntries;

  const batchCourseIds = Array.from(new Set(batchEntries.map((entry) => normalizeString(entry.courseId)).filter(Boolean)));
  const effectiveCourseIds = selectedCourseIds.length ? selectedCourseIds : batchCourseIds;

  if (!effectiveCourseIds.length) {
    throw new AppError("Course is required", 400);
  }

  if (selectedCourseIds.length && batchCourseIds.some((courseId) => !selectedCourseIds.includes(courseId))) {
    throw new AppError("Batch course selection is invalid", 400);
  }

  if (effectiveCourseIds.some((courseId) => !batchCourseIds.includes(courseId))) {
    throw new AppError("Add at least one batch for each selected course", 400);
  }

  await Promise.all(effectiveCourseIds.map((courseId) => ensureActiveCourse(courseId)));
  await ensureUniqueIdentity({ facultyEmail, facultyPhone }, facultyId);
  const existingLoginUser = await findFacultyLoginUser(existing);

  if (existingLoginUser) {
    await ensureUniqueFacultyLogin({ facultyEmail, facultyPhone }, existingLoginUser.id);
  }

  const actorId = actor?.id ?? null;

  let record = null;

  try {
    record = await prisma.$transaction(async (tx) => {
      await tx.facultyProfile.update({
        where: { id: facultyId },
        data: {
          facultyName,
          facultyEmail,
          facultyPhone,
          courseId: effectiveCourseIds[0] || null,
          status,
          updatedBy: actorId,
        },
      });

      await tx.facultyCourseAssignment.deleteMany({
        where: { facultyId },
      });

      await tx.facultyCourseAssignment.createMany({
        data: effectiveCourseIds.map((courseId) => ({
          facultyId,
          courseId,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });

      await tx.facultyBatchEntry.deleteMany({
        where: { facultyId },
      });

      await tx.facultyBatchEntry.createMany({
        data: batchEntries.map((entry) => ({
          facultyId,
          courseId: normalizeString(entry.courseId) || effectiveCourseIds[0] || null,
          batchName: entry.batchName,
          batchTiming: entry.batchTiming,
          sequenceNo: entry.sequenceNo,
        })),
      });

      if (existingLoginUser) {
        await tx.user.update({
          where: { id: existingLoginUser.id },
          data: {
            fullName: facultyName,
            email: facultyEmail,
            phone: facultyPhone,
            role: "FACULTY",
            active: status === "ACTIVE",
            updatedBy: actorId,
          },
        });
      }

      return tx.facultyProfile.findUnique({
        where: { id: facultyId },
      include: {
        course: {
          include: getFacultyCourseInclude(),
        },
        batchEntries: {
          orderBy: { sequenceNo: "asc" },
          include: {
            course: {
              include: getFacultyCourseInclude(),
            },
          },
        },
        courseAssignments: {
          orderBy: { createdAt: "asc" },
          include: {
            course: {
              include: getFacultyCourseInclude(),
            },
          },
        },
      },
      });
    });
  } catch (error) {
    handleKnownPrismaError(error);
  }

  if (!record) {
    throw new AppError("Faculty record could not be updated", 500);
  }

  return toFacultyRecord(record);
}

export async function deleteFacultyRecord(facultyId, actor) {
  const existing = await prisma.facultyProfile.findUnique({
    where: { id: facultyId },
    include: {
      batchEntries: {
        select: { id: true },
      },
    },
  });

  if (!existing) {
    throw new AppError("Faculty record not found", 404);
  }

  const existingLoginUser = await findFacultyLoginUser(existing);

  const record = await prisma.$transaction(async (tx) => {
    await tx.facultyBatchEntry.deleteMany({
      where: { facultyId },
    });

    if (existingLoginUser) {
      await tx.passwordResetToken.deleteMany({
        where: { userId: existingLoginUser.id },
      });

      await tx.user.delete({
        where: { id: existingLoginUser.id },
      });
    }

    await tx.facultyProfile.delete({
      where: { id: facultyId },
    });

    return existing;
  });

  if (!record) {
    throw new AppError("Faculty record could not be deleted", 500);
  }

  return {
    id: record.id,
    facultyName: record.facultyName,
    facultyEmail: record.facultyEmail,
    facultyPhone: record.facultyPhone,
  };
}
