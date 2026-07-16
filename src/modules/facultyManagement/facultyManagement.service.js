import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

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

  const seenBatchNames = new Set();

  return value.map((entry, index) => {
    const batchName = parseRequiredText(entry?.batchName, `Batch ${index + 1} name`);
    const batchTiming = parseRequiredText(resolveBatchTimingFromEntry(entry), `Batch ${index + 1} timing`);
    const normalizedName = normalizeSearchKey(batchName);

    if (seenBatchNames.has(normalizedName)) {
      throw new AppError("Batch names must be unique within the same faculty", 400);
    }

    seenBatchNames.add(normalizedName);

    return {
      sequenceNo: index + 1,
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

  if (batchName && batchTiming) {
    return [
      {
        batchName,
        batchTiming,
      },
    ];
  }

  return [];
}

function toCourseSummary(course) {
  if (!course) return null;

  return {
    id: course.id,
    name: course.name,
    mode: course.mode,
    status: course.status,
  };
}

function toBatchEntry(entry) {
  return {
    id: entry.id,
    facultyId: entry.facultyId,
    batchName: entry.batchName,
    batchTiming: entry.batchTiming,
    sequenceNo: entry.sequenceNo,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function toFacultyRecord(record) {
  return {
    id: record.id,
    facultyName: record.facultyName,
    facultyEmail: record.facultyEmail,
    facultyPhone: record.facultyPhone,
    courseId: record.courseId,
    courseName: record.course?.name || "",
    course: toCourseSummary(record.course),
    status: record.status === "ACTIVE" ? "Active" : "Inactive",
    batchEntries: Array.isArray(record.batchEntries) ? record.batchEntries.map(toBatchEntry) : [],
    batchCount: Array.isArray(record.batchEntries) ? record.batchEntries.length : 0,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdOn: record.createdAt,
    updatedOn: record.updatedAt,
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
        select: {
          id: true,
          name: true,
          mode: true,
          status: true,
        },
      },
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
      },
    },
  });
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
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
        batchEntries: {
          orderBy: { sequenceNo: "asc" },
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

export async function createFacultyRecord(payload, actor) {
  const facultyName = parseRequiredText(payload.facultyName, "Faculty name");
  const facultyEmail = parseEmail(payload.facultyEmail);
  const facultyPhone = parsePhone(payload.facultyPhone);
  const courseId = parseRequiredText(payload.courseId, "Course");
  const status = parseStatus(payload.status ?? "ACTIVE");
  const batchEntries = parseBatchEntries(normalizeBatchEntriesPayload(payload));

  await ensureActiveCourse(courseId);
  await ensureUniqueIdentity({ facultyEmail, facultyPhone });

  const actorId = actor?.id ?? null;

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.facultyProfile.create({
      data: {
        facultyName,
        facultyEmail,
        facultyPhone,
        courseId,
        status,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    await tx.facultyBatchEntry.createMany({
      data: batchEntries.map((entry) => ({
        facultyId: created.id,
        batchName: entry.batchName,
        batchTiming: entry.batchTiming,
        sequenceNo: entry.sequenceNo,
      })),
    });

    return tx.facultyProfile.findUnique({
      where: { id: created.id },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
        batchEntries: {
          orderBy: { sequenceNo: "asc" },
        },
      },
    });
  });

  if (!record) {
    throw new AppError("Faculty record could not be created", 500);
  }

  return toFacultyRecord(record);
}

export async function updateFacultyRecord(facultyId, payload, actor) {
  const existing = await prisma.facultyProfile.findUnique({
    where: { id: facultyId },
    include: {
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
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
  const nextCourseId = payload.courseId !== undefined ? parseRequiredText(payload.courseId, "Course") : existing.courseId;
  const status = payload.status !== undefined ? parseStatus(payload.status) : existing.status;
  const normalizedBatchEntriesPayload = normalizeBatchEntriesPayload(payload);
  const batchEntries =
    Array.isArray(payload.batchEntries) || normalizedBatchEntriesPayload.length
      ? parseBatchEntries(normalizedBatchEntriesPayload)
      : existing.batchEntries;

  await ensureActiveCourse(nextCourseId);
  await ensureUniqueIdentity({ facultyEmail, facultyPhone }, facultyId);

  const actorId = actor?.id ?? null;

  const record = await prisma.$transaction(async (tx) => {
    await tx.facultyProfile.update({
      where: { id: facultyId },
      data: {
        facultyName,
        facultyEmail,
        facultyPhone,
        courseId: nextCourseId,
        status,
        updatedBy: actorId,
      },
    });

    await tx.facultyBatchEntry.deleteMany({
      where: { facultyId },
    });

    await tx.facultyBatchEntry.createMany({
      data: batchEntries.map((entry) => ({
        facultyId,
        batchName: entry.batchName,
        batchTiming: entry.batchTiming,
        sequenceNo: entry.sequenceNo,
      })),
    });

    return tx.facultyProfile.findUnique({
      where: { id: facultyId },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
        batchEntries: {
          orderBy: { sequenceNo: "asc" },
        },
      },
    });
  });

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

  const record = await prisma.$transaction(async (tx) => {
    await tx.facultyBatchEntry.deleteMany({
      where: { facultyId },
    });

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
