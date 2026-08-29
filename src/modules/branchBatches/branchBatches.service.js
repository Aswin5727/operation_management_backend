import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { sendFacultyBatchAssignmentEmail } from "../../common/services/resendEmail.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeSearchKey(value) {
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

function parseStatus(value, fieldName = "status") {
  const status = normalizeString(value).toUpperCase() || "ACTIVE";
  if (!RECORD_STATUSES.has(status)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return status;
}

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be greater than zero`, 400);
  }
  return parsed;
}

function parseTimeInput(value) {
  const text = normalizeString(value);
  if (!text) return "";
  const hourOnlyMatch = text.match(/^(\d{1,2})$/);
  if (hourOnlyMatch) {
    const hours = Number(hourOnlyMatch[1]);
    if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
      throw new AppError("Hour must be between 0 and 23", 400);
    }
    return `${String(hours).padStart(2, "0")}:00`;
  }
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new AppError("Time must be in HH:MM format", 400);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    throw new AppError("Hour must be between 0 and 23", 400);
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    throw new AppError("Minute must be between 0 and 59", 400);
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseMeridiem(value) {
  const meridiem = normalizeString(value).toUpperCase();
  if (!["AM", "PM"].includes(meridiem)) {
    throw new AppError("Time period must be AM or PM", 400);
  }
  return meridiem;
}

function convertToClockLabel(time = "", meridiem = "") {
  const normalizedTime = normalizeString(time);
  if (!normalizedTime) return "";

  const timeMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return normalizedTime;

  let hours = Number(timeMatch[1]);
  const minutes = String(timeMatch[2]).padStart(2, "0");
  const period = normalizeString(meridiem).toUpperCase();

  if (!Number.isInteger(hours)) return normalizedTime;

  if (period === "AM") {
    if (hours === 12) hours = 0;
  } else if (period === "PM") {
    if (hours < 12) hours += 12;
  }

  const displayHours = hours % 12 || 12;
  const displayPeriod = hours >= 12 ? "PM" : "AM";

  return `${String(displayHours).padStart(2, "0")}:${minutes} ${displayPeriod}`;
}

function buildBatchTiming(row = {}) {
  const start = convertToClockLabel(row.startTime, row.startPeriod);
  const end = convertToClockLabel(row.endTime, row.endPeriod);
  return `${start}${start && end ? " - " : ""}${end}`.trim();
}

function makeBatchId(sequenceNumber = 1) {
  const safeSequence = Math.max(1, Number(sequenceNumber) || 1);
  return `BAT-${String(safeSequence).padStart(3, "0")}`;
}

function makeBatchGroupId(sequenceNumber = 1) {
  const safeSequence = Math.max(1, Number(sequenceNumber) || 1);
  return `BBG-${String(safeSequence).padStart(3, "0")}`;
}

function toBatchRow(record = {}) {
  return {
    id: record.id,
    batchId: record.batchId,
    batchName: record.batchName,
    startTime: record.startTime,
    startPeriod: record.startPeriod,
    endTime: record.endTime,
    endPeriod: record.endPeriod,
    batchTiming: record.batchTiming || buildBatchTiming(record),
    totalSeats: Number(record.totalSeats || 0),
    status: record.status || "ACTIVE",
    sequenceNo: Number(record.sequenceNo || 0),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toBatchGroup(record = {}) {
  const rows = Array.isArray(record.rows) ? record.rows.map(toBatchRow) : [];
  const batchCount = Number(record.batchCount ?? rows.length) || rows.length;
  const status = normalizeString(record.status || rows[0]?.status || "ACTIVE").toUpperCase();

  return {
    id: record.id,
    batchId: record.batchId || rows[0]?.batchId || "",
    batchGroupId: record.batchGroupId || record.id || "",
    branchId: record.branchId || "",
    branchCourseId: record.branchCourseId || "",
    branchFacultyId: record.branchFacultyId || "",
    courseId: record.courseId || record.branchCourseId || "",
    courseName: record.courseName || record.branchCourse?.name || "",
    courseCode: record.branchCourse?.courseCode || "",
    facultyId: record.facultyId || record.branchFaculty?.facultyId || record.branchFacultyId || "",
    facultyName: record.facultyName || record.branchFaculty?.name || "",
    facultyEmail: record.facultyEmail || record.branchFaculty?.email || "",
    batchCount,
    status,
    batches: rows,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toBatchDetail(record = {}) {
  return toBatchGroup(record);
}

function buildFacultyBatchEmailRows(batchRecord = {}) {
  const rows = Array.isArray(batchRecord?.batches) ? batchRecord.batches : [];
  return rows.map((row, index) => ({
    batchName: row?.batchName || `Batch ${index + 1}`,
    batchTiming: row?.batchTiming || buildBatchTiming(row),
    totalSeats: Number(row?.totalSeats || 0),
    status: String(row?.status || "ACTIVE").toUpperCase(),
  }));
}

function queueFacultyBatchAssignmentEmail(batchRecord = {}) {
  const to = String(batchRecord?.facultyEmail || "").trim();
  if (!to) return;

  const rows = buildFacultyBatchEmailRows(batchRecord);

  void sendFacultyBatchAssignmentEmail({
    to,
    fullName: batchRecord?.facultyName || batchRecord?.facultyEmail || "Faculty",
    facultyId: batchRecord?.facultyId || batchRecord?.branchFacultyId || "",
    courseName: batchRecord?.courseName || "",
    batchGroupId: batchRecord?.batchGroupId || batchRecord?.batchId || batchRecord?.id || "",
    batchCount: rows.length || Number(batchRecord?.batchCount || 0) || 0,
    batches: rows,
  }).catch((error) => {
    console.warn("Faculty batch assignment email failed", error);
  });
}

async function ensureBranchCourse(branchId, courseId) {
  const course = await prisma.branchCourse.findFirst({
    where: {
      id: courseId,
      branchId,
    },
    select: {
      id: true,
      name: true,
      courseCode: true,
      status: true,
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  if (course.status !== "ACTIVE") {
    throw new AppError("Selected course is inactive", 400);
  }

  return course;
}

async function ensureBranchFaculty(branchId, facultyId) {
  const faculty = await prisma.branchFaculty.findFirst({
    where: {
      branchId,
      OR: [
        { id: facultyId },
        { facultyId },
      ],
    },
    select: {
      id: true,
      facultyId: true,
      name: true,
      email: true,
      status: true,
      branchCourseId: true,
    },
  });

  if (!faculty) {
    throw new AppError("Faculty not found", 404);
  }

  if (faculty.status !== "ACTIVE") {
    throw new AppError("Selected faculty is inactive", 400);
  }

  return faculty;
}

async function getNextBatchSequenceNumber(branchId) {
  const rows = await prisma.branchBatchRow.findMany({
    where: {
      branchBatch: {
        branchId,
      },
    },
    select: {
      batchId: true,
    },
  });

  let maxSequence = 0;
  rows.forEach((row) => {
    const match = String(row.batchId || "").trim().match(/^BAT-(\d+)$/i);
    if (!match) return;
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > maxSequence) {
      maxSequence = value;
    }
  });

  return maxSequence + 1;
}

async function getNextBatchGroupSequenceNumber(branchId) {
  const groups = await prisma.branchBatch.findMany({
    where: {
      branchId,
    },
    select: {
      batchGroupId: true,
      id: true,
    },
  });

  let maxSequence = 0;

  groups.forEach((group) => {
    const match = String(group.batchGroupId || group.id || "").trim().match(/^BBG-(\d+)$/i);
    if (!match) return;
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > maxSequence) {
      maxSequence = value;
    }
  });

  return maxSequence + 1;
}

function parseBatchRows(rows = []) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new AppError("Add at least one batch row", 400);
  }

  return rows.map((row, index) => {
    const batchName = parseRequiredText(row?.batchName, `Batch ${index + 1} name`);
    const startTime = parseTimeInput(row?.startTime);
    const startPeriod = parseMeridiem(row?.startPeriod || "AM");
    const endTime = parseTimeInput(row?.endTime);
    const endPeriod = parseMeridiem(row?.endPeriod || "AM");
    const totalSeats = parsePositiveInt(row?.totalSeats, `Batch ${index + 1} total seats`);
    const status = parseStatus(row?.status || "ACTIVE");

    return {
      batchName,
      startTime,
      startPeriod,
      endTime,
      endPeriod,
      totalSeats,
      status,
      sequenceNo: index + 1,
      batchTiming: buildBatchTiming({ startTime, startPeriod, endTime, endPeriod }),
    };
  });
}

function parseBatchPayload(payload = {}) {
  const batchGroupId = normalizeString(payload.batchGroupId || payload.branchBatchGroupId || payload.groupId);
  const courseId = normalizeString(payload.courseId || payload.branchCourseId);
  const facultyId = normalizeString(payload.facultyId || payload.branchFacultyId);
  const rows = Array.isArray(payload.rows)
    ? payload.rows
    : Array.isArray(payload.batches)
      ? payload.batches
      : [];

  return {
    batchGroupId,
    courseId,
    facultyId,
    rows: parseBatchRows(rows),
  };
}

function buildWhere(branchId, query = {}) {
  const where = {
    branchId,
  };

  const search = normalizeString(query.search);
  if (search) {
    where.OR = [
      { batchId: { contains: search, mode: "insensitive" } },
      { courseName: { contains: search, mode: "insensitive" } },
      { facultyName: { contains: search, mode: "insensitive" } },
      { facultyEmail: { contains: search, mode: "insensitive" } },
      { branchCourse: { name: { contains: search, mode: "insensitive" } } },
      { branchFaculty: { name: { contains: search, mode: "insensitive" } } },
      { rows: { some: { batchName: { contains: search, mode: "insensitive" } } } },
      { rows: { some: { batchTiming: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const status = normalizeString(query.status).toUpperCase();
  if (RECORD_STATUSES.has(status)) {
    where.status = status;
  } else {
    where.status = "ACTIVE";
  }

  const branchCourseId = normalizeString(query.courseId || query.branchCourseId);
  if (branchCourseId) {
    where.branchCourseId = branchCourseId;
  }

  const facultyId = normalizeString(query.facultyId || query.branchFacultyId);
  if (facultyId) {
    where.OR = [
      ...(where.OR || []),
      { branchFacultyId: facultyId },
      { facultyId },
    ];
  }

  return where;
}

function getInclude() {
  return {
    branchCourse: {
      select: {
        id: true,
        name: true,
        courseCode: true,
        status: true,
      },
    },
    branchFaculty: {
      select: {
        id: true,
        facultyId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
      },
    },
    rows: {
      orderBy: { sequenceNo: "asc" },
    },
  };
}

async function syncBranchFacultyCourseLink(tx, branchFacultyRecord, branchCourseId, actorId) {
  if (!branchFacultyRecord) return;

  await tx.branchFaculty.update({
    where: { id: branchFacultyRecord.id },
    data: {
      branchCourseId,
      updatedBy: actorId,
    },
  });
}

async function maybeClearBranchFacultyCourseLink(branchId, branchFacultyId, branchCourseId, actorId) {
  const remaining = await prisma.branchBatch.findFirst({
    where: {
      branchId,
      branchFacultyId,
      branchCourseId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (remaining) return;

  await prisma.branchFaculty.updateMany({
    where: {
      branchId,
      id: branchFacultyId,
      branchCourseId,
    },
    data: {
      branchCourseId: null,
      updatedBy: actorId,
    },
  });
}

export async function listBranchBatches(query = {}, actor = null) {
  const branchProfile = await getCurrentBranchProfile(actor);
  const { page, limit, skip, take } = buildPagination(query);
  const where = buildWhere(branchProfile.id, query);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder, "desc");

  const orderBy = (() => {
    switch (sortBy) {
      case "batchid":
        return { batchId: sortOrder };
      case "coursename":
        return { courseName: sortOrder };
      case "facultyname":
        return { facultyName: sortOrder };
      case "status":
        return { status: sortOrder };
      case "updatedat":
        return { updatedAt: sortOrder };
      case "createdat":
      default:
        return { createdAt: sortOrder };
    }
  })();

  const [total, rows] = await prisma.$transaction([
    prisma.branchBatch.count({ where }),
    prisma.branchBatch.findMany({
      where,
      orderBy,
      skip,
      take,
      include: getInclude(),
    }),
  ]);

  return {
    data: rows.map(toBatchGroup),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getBranchBatch(batchGroupId, actor = null) {
  const branchProfile = await getCurrentBranchProfile(actor);
  const batch = await prisma.branchBatch.findFirst({
    where: {
      branchId: branchProfile.id,
      OR: [
        { id: batchGroupId },
        { batchGroupId },
        { batchId: batchGroupId },
      ],
    },
    include: getInclude(),
  });

  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  return toBatchDetail(batch);
}

export async function createBranchBatch(payload = {}, actor = null) {
  const branchProfile = await getCurrentBranchProfile(actor);
  const parsed = parseBatchPayload(payload);

  if (!parsed.courseId) {
    throw new AppError("Course is required", 400);
  }

  if (!parsed.facultyId) {
    throw new AppError("Faculty is required", 400);
  }

  const branchCourse = await ensureBranchCourse(branchProfile.id, parsed.courseId);
  const branchFaculty = await ensureBranchFaculty(branchProfile.id, parsed.facultyId);
  const actorId = actor?.id ?? null;
  const nextSequenceStart = await getNextBatchSequenceNumber(branchProfile.id);
  const nextBatchGroupSequence = await getNextBatchGroupSequenceNumber(branchProfile.id);
  const batchGroupId = parsed.batchGroupId || makeBatchGroupId(nextBatchGroupSequence);
  const batchRows = parsed.rows.map((row, index) => ({
    batchId: makeBatchId(nextSequenceStart + index),
    batchName: row.batchName,
    batchTiming: buildBatchTiming(row),
    startTime: row.startTime,
    startPeriod: row.startPeriod,
    endTime: row.endTime,
    endPeriod: row.endPeriod,
    totalSeats: row.totalSeats,
    status: row.status,
    sequenceNo: row.sequenceNo,
    createdBy: actorId,
    updatedBy: actorId,
  }));

  const created = await prisma.$transaction(async (tx) => {
    const batch = await tx.branchBatch.create({
      data: {
        branchId: branchProfile.id,
        branchCourseId: branchCourse.id,
        branchFacultyId: branchFaculty.id,
    batchId: batchGroupId,
    batchGroupId,
        courseId: branchCourse.id,
        courseName: branchCourse.name,
        facultyId: branchFaculty.facultyId || branchFaculty.id,
        facultyName: branchFaculty.name,
        facultyEmail: branchFaculty.email,
        batchCount: batchRows.length,
        status: batchRows[0]?.status || "ACTIVE",
        createdBy: actorId,
        updatedBy: actorId,
        rows: {
          create: batchRows,
        },
      },
      include: getInclude(),
    });
    return batch;
  }, { timeout: 15000 });

  await syncBranchFacultyCourseLink(prisma, branchFaculty, branchCourse.id, actorId);
  queueFacultyBatchAssignmentEmail(created);

  return toBatchDetail(created);
}

export async function updateBranchBatch(batchGroupId, payload = {}, actor = null) {
  const branchProfile = await getCurrentBranchProfile(actor);
  const existing = await prisma.branchBatch.findFirst({
    where: {
      branchId: branchProfile.id,
      OR: [
        { id: batchGroupId },
        { batchGroupId },
        { batchId: batchGroupId },
      ],
    },
    include: getInclude(),
  });

  if (!existing) {
    throw new AppError("Batch not found", 404);
  }

  const parsed = parseBatchPayload({
    courseId: payload.courseId || payload.branchCourseId || existing.branchCourseId,
    facultyId: payload.facultyId || payload.branchFacultyId || existing.branchFacultyId,
    rows: payload.rows || payload.batches || existing.rows,
  });

  const branchCourse = await ensureBranchCourse(branchProfile.id, parsed.courseId);
  const branchFaculty = await ensureBranchFaculty(branchProfile.id, parsed.facultyId);
  const actorId = actor?.id ?? null;
  const nextBatchGroupSequence = await getNextBatchGroupSequenceNumber(branchProfile.id);
  const batchPrefixMatch = String(existing.batchId || "").match(/^BAT-(\d+)$/i);
  const startSequence = batchPrefixMatch ? Number(batchPrefixMatch[1]) || 1 : 1;
  const nextBatchRows = parsed.rows.map((row, index) => ({
    batchId: makeBatchId(startSequence + index),
    batchName: row.batchName,
    batchTiming: buildBatchTiming(row),
    startTime: row.startTime,
    startPeriod: row.startPeriod,
    endTime: row.endTime,
    endPeriod: row.endPeriod,
    totalSeats: row.totalSeats,
    status: row.status,
    sequenceNo: row.sequenceNo,
    createdBy: existing.createdBy || actorId,
    updatedBy: actorId,
  }));

  const updated = await prisma.$transaction(async (tx) => {
    await tx.branchBatchRow.deleteMany({
      where: {
        branchBatchId: existing.id,
      },
    });

    const batch = await tx.branchBatch.update({
      where: { id: existing.id },
      data: {
        branchCourseId: branchCourse.id,
        branchFacultyId: branchFaculty.id,
        batchId: existing.batchGroupId || parsed.batchGroupId || makeBatchGroupId(nextBatchGroupSequence),
        batchGroupId: existing.batchGroupId || parsed.batchGroupId || makeBatchGroupId(nextBatchGroupSequence),
        courseId: branchCourse.id,
        courseName: branchCourse.name,
        facultyId: branchFaculty.facultyId || branchFaculty.id,
        facultyName: branchFaculty.name,
        facultyEmail: branchFaculty.email,
        batchCount: nextBatchRows.length,
        status: nextBatchRows[0]?.status || existing.status,
        updatedBy: actorId,
        rows: {
          create: nextBatchRows,
        },
      },
      include: getInclude(),
    });
    return batch;
  }, { timeout: 15000 });

  await syncBranchFacultyCourseLink(prisma, branchFaculty, branchCourse.id, actorId);
  queueFacultyBatchAssignmentEmail(updated);

  return toBatchDetail(updated);
}

export async function deleteBranchBatch(batchGroupId, actor = null) {
  const branchProfile = await getCurrentBranchProfile(actor);
  const existing = await prisma.branchBatch.findFirst({
    where: {
      branchId: branchProfile.id,
      OR: [
        { id: batchGroupId },
        { batchGroupId },
        { batchId: batchGroupId },
      ],
    },
    include: getInclude(),
  });

  if (!existing) {
    throw new AppError("Batch not found", 404);
  }

  const actorId = actor?.id ?? null;

  const deleted = await prisma.$transaction(async (tx) => {
    const batch = await tx.branchBatch.update({
      where: { id: existing.id },
      data: {
        status: "INACTIVE",
        updatedBy: actorId,
        rows: {
          updateMany: {
            where: {},
            data: {
              status: "INACTIVE",
              updatedBy: actorId,
            },
          },
        },
      },
      include: getInclude(),
    });
    return batch;
  }, { timeout: 15000 });

  await maybeClearBranchFacultyCourseLink(branchProfile.id, existing.branchFacultyId, existing.branchCourseId, actorId);

  return toBatchDetail(deleted);
}
