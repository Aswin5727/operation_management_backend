import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const COURSE_MODES = new Set(["ONLINE", "OFFLINE", "HYBRID"]);
const COURSE_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const BATCH_STATUSES = new Set(["PLANNED", "ACTIVE", "COMPLETED", "INACTIVE"]);
const ASSIGNMENT_STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const LOCAL_TIME_ZONE = "Asia/Calcutta";

async function resolveBranchAdminProfile(actor) {
  const role = normalizeString(actor?.role).toUpperCase();

  if (role !== "BRANCH_ADMIN") {
    return null;
  }

  return getCurrentBranchProfile(actor);
}

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
    case "PLANNED":
      return "Planned";
    case "COMPLETED":
      return "Completed";
    default:
      return value;
  }
}

function getEnumValue(value, allowedValues, fieldName) {
  const normalized = normalizeString(value).toUpperCase();

  if (!allowedValues.has(normalized)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return normalized;
}

function normalizeCourseMode(value) {
  const normalized = normalizeString(value).toUpperCase();

  if (!COURSE_MODES.has(normalized)) {
    throw new AppError("Invalid mode", 400);
  }

  return capitalize(normalized);
}

function normalizeRecordStatus(value, fieldName = "status") {
  return getEnumValue(value, COURSE_STATUSES, fieldName);
}

function normalizeBatchStatus(value, fieldName = "status") {
  return getEnumValue(value, BATCH_STATUSES, fieldName);
}

function normalizeAssignmentStatus(value, fieldName = "status") {
  return getEnumValue(value, ASSIGNMENT_STATUSES, fieldName);
}

function parsePositiveInt(value, fieldName, { allowZero = false } = {}) {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${fieldName} is required`, 400);
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

function parseOptionalInt(value, fieldName, { allowZero = true } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new AppError(`${fieldName} must be an integer`, 400);
  }

  if (!allowZero && parsed <= 0) {
    throw new AppError(`${fieldName} must be greater than zero`, 400);
  }

  if (allowZero && parsed < 0) {
    throw new AppError(`${fieldName} must be zero or greater`, 400);
  }

  return parsed;
}

function parseInstallments(candidate = {}) {
  if (Array.isArray(candidate.installments) && candidate.installments.length) {
    return candidate.installments.map((value, index) =>
      parsePositiveInt(value, `Installment ${index + 1}`, { allowZero: true }),
    );
  }

  return Object.entries(candidate)
    .map(([key, value]) => {
      const match = key.match(/^installment(\d+)$/i);
      if (!match) return null;
      return {
        index: Number(match[1]),
        value,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.index - right.index)
    .map(({ index, value }) => parsePositiveInt(value, `Installment ${index}`, { allowZero: true }));
}

function buildBalancedInstallments(totalAmount, installmentCount) {
  const count = Math.max(1, Number(installmentCount) || 1);
  const safeTotal = Math.max(0, Number(totalAmount) || 0);
  const baseAmount = Math.floor(safeTotal / count);
  let remainder = safeTotal - baseAmount * count;

  return Array.from({ length: count }, () => {
    const nextAmount = baseAmount + (remainder > 0 ? 1 : 0);
    if (remainder > 0) {
      remainder -= 1;
    }
    return nextAmount;
  });
}

function parseOptionalText(value) {
  const text = normalizeString(value);
  return text ? text : null;
}

function parseRequiredText(value, fieldName) {
  const text = normalizeString(value);

  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
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

function parseTimeString(value, fieldName) {
  const text = parseRequiredText(value, fieldName);

  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text)) {
    throw new AppError(`${fieldName} must be in HH:mm format`, 400);
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

function getLocalDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LOCAL_TIME_ZONE,
  }).format(date);
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

function toCourseSummary(course) {
  const installments = Array.isArray(course.installments) ? course.installments : [];

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
    installments,
    status: displayStatus(course.status),
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

function toCourseDetail(course) {
  const summary = toCourseSummary(course);

  return {
    ...summary,
    modules: Array.isArray(course.modules) ? course.modules.map(toCourseModule) : [],
    batches: Array.isArray(course.batches)
      ? course.batches.map((batch) => toBatchSummary(batch, { includeCourse: false }))
      : [],
  };
}

function toCourseModule(module) {
  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    description: module.description,
    sequenceNo: module.sequenceNo,
    status: displayStatus(module.status),
    statusChangedAt: module.statusChangedAt,
    statusChangedBy: module.statusChangedBy,
    createdBy: module.createdBy,
    updatedBy: module.updatedBy,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
  };
}

function toBatchSummary(batch, { includeCourse = true } = {}) {
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
    status: displayStatus(batch.status),
    statusChangedAt: batch.statusChangedAt,
    statusChangedBy: batch.statusChangedBy,
    createdBy: batch.createdBy,
    updatedBy: batch.updatedBy,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    facultyAssignmentCount:
      batch._count?.facultyAssignments ?? batch.facultyAssignmentCount ?? 0,
    course: includeCourse && batch.course
      ? {
          id: batch.course.id,
          name: batch.course.name,
          mode: batch.course.mode,
          status: displayStatus(batch.course.status),
        }
      : batch.course ?? null,
  };
}

function toBatchDetail(batch) {
  return {
    ...toBatchSummary(batch),
    facultyAssignments: Array.isArray(batch.facultyAssignments)
      ? batch.facultyAssignments.map(toAssignment)
      : [],
  };
}

function toAssignment(assignment) {
  return {
    id: assignment.id,
    batchId: assignment.batchId,
    facultyId: assignment.facultyId,
    assignedDate: assignment.assignedDate,
    assignedAt: assignment.assignedAt,
    releasedAt: assignment.releasedAt,
    status: displayStatus(assignment.status),
    notes: assignment.notes,
    assignedBy: assignment.assignedBy,
    releasedBy: assignment.releasedBy,
    createdBy: assignment.createdBy,
    updatedBy: assignment.updatedBy,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    faculty: assignment.faculty
      ? {
          id: assignment.faculty.id,
          userCode: assignment.faculty.userCode,
          fullName: assignment.faculty.fullName,
          email: assignment.faculty.email,
          role: assignment.faculty.role,
          active: assignment.faculty.active,
        }
      : null,
  };
}

function toStatusHistoryEntry(entry, kind = "course") {
  return {
    id: entry.id,
    [kind === "course" ? "courseId" : "batchId"]: kind === "course" ? entry.courseId : entry.batchId,
    fromStatus: entry.fromStatus ? displayStatus(entry.fromStatus) : null,
    toStatus: displayStatus(entry.toStatus),
    changedBy: entry.changedBy,
    reason: entry.reason,
    changedAt: entry.changedAt,
  };
}

async function createStatusHistory(tx, { kind, recordId, fromStatus, toStatus, changedBy, reason = null }) {
  if (kind === "course") {
    await tx.courseStatusHistory.create({
      data: {
        courseId: recordId,
        fromStatus,
        toStatus,
        changedBy,
        reason,
      },
    });
    return;
  }

  await tx.batchStatusHistory.create({
    data: {
      batchId: recordId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
    },
  });
}

async function buildCourseWhere(query, actor = null) {
  const where = {};
  const search = normalizeString(query.search);
  const branchProfile = await resolveBranchAdminProfile(actor);

  if (branchProfile?.id) {
    where.branchId = branchProfile.id;
  } else {
    where.branchId = null;
  }

  if (query.status) {
    where.status = normalizeRecordStatus(query.status);
  }

  if (query.mode) {
    where.mode = normalizeCourseMode(query.mode);
  }

  if (search) {
    const conditions = [
      { name: { contains: search, mode: "insensitive" } },
      { courseCode: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { feeReference: { contains: search, mode: "insensitive" } },
      { mode: { contains: search, mode: "insensitive" } },
      { nameKey: { contains: normalizeKey(search), mode: "insensitive" } },
    ];

    const numeric = Number(search);
    if (Number.isInteger(numeric)) {
      conditions.push(
        { duration: numeric },
        { hours: numeric },
        { actualFees: numeric },
        { registrationFees: numeric },
        { discount: numeric },
        { afterDiscount: numeric },
        { installmentCount: numeric },
        { installment1: numeric },
        { installment2: numeric },
        { installment3: numeric },
      );
    }

    try {
      conditions.push({ status: normalizeRecordStatus(search) });
    } catch {
      // ignore invalid status-like search
    }

    where.OR = conditions;
  }

  return where;
}

function buildBatchWhere(query) {
  const where = {};
  const search = normalizeString(query.search);

  if (query.status) {
    where.status = normalizeBatchStatus(query.status);
  }

  if (query.courseId) {
    where.courseId = normalizeString(query.courseId);
  }

  if (search) {
    const conditions = [
      { batchName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { startDate: { contains: search, mode: "insensitive" } },
      { endDate: { contains: search, mode: "insensitive" } },
      { startTime: { contains: search, mode: "insensitive" } },
      { endTime: { contains: search, mode: "insensitive" } },
      { batchNameKey: { contains: normalizeKey(search), mode: "insensitive" } },
      {
        course: {
          name: { contains: search, mode: "insensitive" },
        },
      },
      {
        facultyAssignments: {
          some: {
            faculty: {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { userCode: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    ];

    const numeric = Number(search);
    if (Number.isInteger(numeric)) {
      conditions.push({ capacity: numeric }, { enrolledCount: numeric });
    }

    try {
      conditions.push({ status: normalizeBatchStatus(search) });
    } catch {
      // ignore invalid status-like search
    }

    where.OR = conditions;
  }

  return where;
}

function buildModuleWhere(courseId, query) {
  const where = {
    courseId,
  };
  const search = normalizeString(query.search);

  if (query.status) {
    where.status = normalizeRecordStatus(query.status);
  }

  if (search) {
    const conditions = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { titleKey: { contains: normalizeKey(search), mode: "insensitive" } },
    ];

    const numeric = Number(search);
    if (Number.isInteger(numeric)) {
      conditions.push({ sequenceNo: numeric });
    }

    try {
      conditions.push({ status: normalizeRecordStatus(search) });
    } catch {
      // ignore invalid status-like search
    }

    where.OR = conditions;
  }

  return where;
}

function buildAssignmentWhere(batchId, query) {
  const where = { batchId };
  const search = normalizeString(query.search);

  if (query.status) {
    where.status = normalizeAssignmentStatus(query.status);
  }

  if (query.facultyId) {
    where.facultyId = normalizeString(query.facultyId);
  }

  if (search) {
    const conditions = [
      { assignedDate: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      {
        faculty: {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { userCode: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];

    try {
      conditions.push({ status: normalizeAssignmentStatus(search) });
    } catch {
      // ignore invalid status-like search
    }

    where.OR = conditions;
  }

  return where;
}

function buildCoursePayload(payload, existingCourse = null) {
  const candidate = existingCourse ? { ...existingCourse, ...payload } : payload;
  const courseCode = parseOptionalText(candidate.courseCode ?? candidate.code);
  const branchId = parseOptionalText(candidate.branchId ?? existingCourse?.branchId);
  const actualFees = parsePositiveInt(candidate.actualFees, "Actual fees", { allowZero: true });
  const registrationFees = parsePositiveInt(candidate.registrationFees, "Registration fees", {
    allowZero: true,
  });
  const discount = parsePositiveInt(candidate.discount, "Discount", { allowZero: true });
  const duration = parsePositiveInt(candidate.duration, "Duration");
  const hours = parsePositiveInt(candidate.hours, "Hours");
  const requestedInstallments = parseInstallments(candidate);
  const rawInstallmentCount = candidate.installmentCount;
  const installmentCount = requestedInstallments.length > 0
    ? requestedInstallments.length
    : rawInstallmentCount === undefined || rawInstallmentCount === null || rawInstallmentCount === ""
      ? 1
      : parsePositiveInt(rawInstallmentCount, "Installment count");
  const name = parseRequiredText(candidate.name, "Course name");
  const mode = normalizeCourseMode(candidate.mode);
  const status = normalizeRecordStatus(candidate.status ?? "ACTIVE");
  const description = parseOptionalText(candidate.description);
  const feeReference = parseOptionalText(candidate.feeReference);
  const totalFees = actualFees + registrationFees;
  const discountedFee = totalFees - discount;

  if (!courseCode && !existingCourse?.courseCode) {
    throw new AppError("Course code is required", 400);
  }

  if (discount > totalFees) {
    throw new AppError("Discount cannot be greater than total fees", 400);
  }

  const installments =
    requestedInstallments.length > 0
      ? requestedInstallments
      : buildBalancedInstallments(discountedFee, installmentCount);

  if (installments.length !== installmentCount) {
    throw new AppError("Installment count must match installment values", 400);
  }

  const installmentTotal = installments.reduce((total, amount) => total + amount, 0);
  if (installmentTotal !== discountedFee) {
    throw new AppError("Installment totals must match the discounted fee", 400);
  }

  return {
    name,
    nameKey: normalizeKey(name),
    courseCode,
    branchId,
    description,
    feeReference,
    mode,
    duration,
    hours,
    actualFees,
    registrationFees,
    discount,
    afterDiscount: discountedFee,
    installmentCount,
    installment1: installments[0] ?? null,
    installment2: installments[1] ?? null,
    installment3: installments[2] ?? null,
    installments,
    status,
  };
}

function buildModulePayload(payload, existingModule = null) {
  const candidate = existingModule ? { ...existingModule, ...payload } : payload;
  const title = parseRequiredText(candidate.title ?? candidate.name, "Module title");
  const sequenceNo = parseOptionalInt(candidate.sequenceNo, "Sequence number", { allowZero: false });
  const status = normalizeRecordStatus(candidate.status ?? "ACTIVE");
  const description = parseOptionalText(candidate.description);

  return {
    title,
    titleKey: normalizeKey(title),
    description,
    sequenceNo,
    status,
  };
}

function buildBatchPayload(payload, existingBatch = null) {
  const candidate = existingBatch ? { ...existingBatch, ...payload } : payload;
  const batchName = parseRequiredText(candidate.batchName, "Batch name");
  const courseId = parseRequiredText(candidate.courseId, "Course");
  const description = parseOptionalText(candidate.description);
  const startDate = parseDateString(candidate.startDate, "Start date");
  const endDate = parseDateString(candidate.endDate, "End date");
  const startTime = parseTimeString(candidate.startTime, "Start time");
  const endTime = parseTimeString(candidate.endTime, "End time");
  const capacity = parsePositiveInt(candidate.capacity, "Capacity");
  const enrolledCount = parseOptionalInt(candidate.enrolledCount ?? 0, "Enrolled count", {
    allowZero: true,
  }) ?? 0;
  const status = normalizeBatchStatus(candidate.status ?? "PLANNED");

  if (startDate > endDate) {
    throw new AppError("Start date cannot be after end date", 400);
  }

  if (startDate === endDate && startTime >= endTime) {
    throw new AppError("Start time must be before end time on the same day", 400);
  }

  if (enrolledCount > capacity) {
    throw new AppError("Capacity cannot be less than enrolled count", 400);
  }

  return {
    courseId,
    batchName,
    batchNameKey: normalizeKey(batchName),
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    capacity,
    enrolledCount,
    status,
  };
}

async function assertUniqueCourseName(nameKey, excludeId = null, branchId = null) {
  const where = {
    nameKey,
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };

  if (branchId) {
    where.branchId = branchId;
  }

  const existing = await prisma.course.findFirst({
    where,
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Course name already exists", 409);
  }
}

async function assertUniqueCourseCode(courseCode, excludeId = null, branchId = null) {
  const normalizedCourseCode = normalizeString(courseCode);

  if (!normalizedCourseCode) {
    return;
  }

  const where = {
    courseCode: normalizedCourseCode,
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };

  if (branchId) {
    where.branchId = branchId;
  }

  const existing = await prisma.course.findFirst({
    where,
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Course code already exists", 409);
  }
}

async function assertUniqueBatchName(batchNameKey, excludeId = null) {
  const existing = await prisma.batch.findFirst({
    where: {
      batchNameKey,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Batch name already exists", 409);
  }
}

async function assertUniqueModuleTitle(courseId, titleKey, excludeId = null) {
  const existing = await prisma.courseModule.findFirst({
    where: {
      courseId,
      titleKey,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Module title already exists for this course", 409);
  }
}

async function ensureCourseExists(courseId, actor = null, { requireActive = false } = {}) {
  const branchProfile = await resolveBranchAdminProfile(actor);
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  if (requireActive && course.status !== "ACTIVE") {
    throw new AppError("Course is inactive", 409);
  }

  return course;
}

async function ensureBatchExists(batchId, { includeCourse = false } = {}) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: includeCourse
      ? {
          course: true,
        }
      : undefined,
  });

  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  return batch;
}

async function ensureModuleExists(courseId, moduleId) {
  const module = await prisma.courseModule.findFirst({
    where: {
      id: moduleId,
      courseId,
    },
  });

  if (!module) {
    throw new AppError("Module not found", 404);
  }

  return module;
}

async function ensureActiveFaculty(facultyId) {
  const faculty = await prisma.user.findUnique({
    where: { id: facultyId },
  });

  if (!faculty) {
    throw new AppError("Faculty not found", 404);
  }

  if (!faculty.active) {
    throw new AppError("Faculty is inactive", 409);
  }

  if (faculty.role !== "FACULTY") {
    throw new AppError("Selected user is not a faculty member", 400);
  }

  return faculty;
}

async function ensureBatchAssignable(batch) {
  if (batch.status === "INACTIVE" || batch.status === "COMPLETED") {
    throw new AppError("Batch is inactive", 409);
  }

  if (batch.course?.status === "INACTIVE") {
    throw new AppError("Course is inactive", 409);
  }
}

function getModuleSequenceBounds(totalModules, desiredSequenceNo) {
  const maxSequence = totalModules + 1;

  if (desiredSequenceNo === null || desiredSequenceNo === undefined) {
    return maxSequence;
  }

  return Math.max(1, Math.min(desiredSequenceNo, maxSequence));
}

async function insertModuleAtSequence(tx, courseId, moduleData, desiredSequenceNo = null) {
  const modules = await tx.courseModule.findMany({
    where: { courseId },
    orderBy: { sequenceNo: "asc" },
    select: { id: true, sequenceNo: true },
  });

  const sequenceNo = getModuleSequenceBounds(modules.length, desiredSequenceNo);
  const affected = await tx.courseModule.findMany({
    where: {
      courseId,
      sequenceNo: {
        gte: sequenceNo,
      },
    },
    orderBy: { sequenceNo: "desc" },
    select: { id: true, sequenceNo: true },
  });

  for (const module of affected) {
    await tx.courseModule.update({
      where: { id: module.id },
      data: {
        sequenceNo: module.sequenceNo + 1,
      },
    });
  }

  return tx.courseModule.create({
    data: {
      ...moduleData,
      courseId,
      sequenceNo,
    },
  });
}

async function moveModuleSequence(tx, courseId, moduleId, currentSequenceNo, desiredSequenceNo) {
  const modules = await tx.courseModule.findMany({
    where: {
      courseId,
      id: { not: moduleId },
    },
    orderBy: { sequenceNo: "asc" },
    select: { id: true, sequenceNo: true },
  });

  const sequenceNo = getModuleSequenceBounds(modules.length, desiredSequenceNo);

  if (sequenceNo === currentSequenceNo) {
    return sequenceNo;
  }

  await tx.courseModule.update({
    where: { id: moduleId },
    data: {
      sequenceNo: 0,
    },
  });

  if (sequenceNo < currentSequenceNo) {
    const affected = await tx.courseModule.findMany({
      where: {
        courseId,
        id: { not: moduleId },
        sequenceNo: {
          gte: sequenceNo,
          lt: currentSequenceNo,
        },
      },
      orderBy: { sequenceNo: "desc" },
      select: { id: true, sequenceNo: true },
    });

    for (const module of affected) {
      await tx.courseModule.update({
        where: { id: module.id },
        data: {
          sequenceNo: module.sequenceNo + 1,
        },
      });
    }
  } else {
    const affected = await tx.courseModule.findMany({
      where: {
        courseId,
        id: { not: moduleId },
        sequenceNo: {
          gt: currentSequenceNo,
          lte: sequenceNo,
        },
      },
      orderBy: { sequenceNo: "asc" },
      select: { id: true, sequenceNo: true },
    });

    for (const module of affected) {
      await tx.courseModule.update({
        where: { id: module.id },
        data: {
          sequenceNo: module.sequenceNo - 1,
        },
      });
    }
  }

  return sequenceNo;
}

function getCourseInclude() {
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
        course: {
          select: {
            id: true,
            name: true,
            status: true,
            mode: true,
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

function getBatchInclude() {
  return {
    course: {
      select: {
        id: true,
        name: true,
        status: true,
        mode: true,
      },
    },
    facultyAssignments: {
      orderBy: [{ assignedAt: "desc" }, { createdAt: "desc" }],
      include: {
        faculty: {
          select: {
            id: true,
            userCode: true,
            fullName: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    },
    _count: {
      select: {
        facultyAssignments: true,
      },
    },
  };
}

function getBatchListInclude() {
  return {
    course: {
      select: {
        id: true,
        name: true,
        status: true,
        mode: true,
      },
    },
    _count: {
      select: {
        facultyAssignments: true,
      },
    },
  };
}

async function updateCourseStatusHistory(courseId, previousStatus, nextStatus, actorId, reason = null) {
  await prisma.courseStatusHistory.create({
    data: {
      courseId,
      fromStatus: previousStatus,
      toStatus: nextStatus,
      changedBy: actorId,
      reason,
    },
  });
}

async function updateBatchStatusHistory(batchId, previousStatus, nextStatus, actorId, reason = null) {
  await prisma.batchStatusHistory.create({
    data: {
      batchId,
      fromStatus: previousStatus,
      toStatus: nextStatus,
      changedBy: actorId,
      reason,
    },
  });
}

export async function listCourses(query, actor = null) {
  const { page, limit, skip, take } = buildPagination(query);
  const where = await buildCourseWhere(query, actor);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder);

  const orderBy = (() => {
    switch (sortBy) {
      case "name":
        return { name: sortOrder };
      case "status":
        return { status: sortOrder };
      case "mode":
        return { mode: sortOrder };
      case "duration":
        return { duration: sortOrder };
      case "hours":
        return { hours: sortOrder };
      case "actualfees":
        return { actualFees: sortOrder };
      case "registrationfees":
        return { registrationFees: sortOrder };
      case "discount":
        return { discount: sortOrder };
      case "updatedat":
        return { updatedAt: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  })();

  const [total, rows] = await prisma.$transaction([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        _count: {
          select: {
            modules: true,
            batches: true,
          },
        },
      },
    }),
  ]);

  return {
    data: rows.map(toCourseSummary),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createCourse(payload, actor) {
  const parsed = buildCoursePayload(payload);
  const branchProfile = await resolveBranchAdminProfile(actor);
  const actorId = actor?.id ?? null;
  const branchId = branchProfile?.id ?? parsed.branchId ?? null;

  await assertUniqueCourseName(parsed.nameKey, null, branchId);
  await assertUniqueCourseCode(parsed.courseCode, null, branchId);

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        ...parsed,
        branchId,
        statusChangedAt: new Date(),
        statusChangedBy: actorId,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: getCourseInclude(),
    });

    await tx.courseStatusHistory.create({
      data: {
        courseId: course.id,
        fromStatus: null,
        toStatus: parsed.status,
        changedBy: actorId,
        reason: null,
      },
    });

    return course;
  });

  return toCourseDetail(created);
}

export async function getCourse(courseId, actor = null) {
  const branchProfile = await resolveBranchAdminProfile(actor);
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
    include: getCourseInclude(),
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return toCourseDetail(course);
}

export async function updateCourse(courseId, payload, actor) {
  const branchProfile = await resolveBranchAdminProfile(actor);
  const existingCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
  });

  if (!existingCourse) {
    throw new AppError("Course not found", 404);
  }

  const parsed = buildCoursePayload(payload, existingCourse);
  const actorId = actor?.id ?? null;
  const branchId = branchProfile?.id ?? existingCourse.branchId ?? parsed.branchId ?? null;

  await assertUniqueCourseName(parsed.nameKey, courseId, branchId);
  await assertUniqueCourseCode(parsed.courseCode, courseId, branchId);
  const statusChanged = existingCourse.status !== parsed.status;

  const updated = await prisma.$transaction(async (tx) => {
    const course = await tx.course.update({
      where: { id: courseId },
      data: {
        ...parsed,
        branchId,
        statusChangedAt: statusChanged ? new Date() : existingCourse.statusChangedAt,
        statusChangedBy: statusChanged ? actorId : existingCourse.statusChangedBy,
        updatedBy: actorId,
      },
      include: getCourseInclude(),
    });

    if (statusChanged) {
      await tx.courseStatusHistory.create({
        data: {
          courseId,
          fromStatus: existingCourse.status,
          toStatus: parsed.status,
          changedBy: actorId,
          reason: null,
        },
      });
    }

    return course;
  });

  return toCourseDetail(updated);
}

export async function updateCourseStatus(courseId, status, actor, reason = null) {
  const branchProfile = await resolveBranchAdminProfile(actor);
  const existingCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
  });

  if (!existingCourse) {
    throw new AppError("Course not found", 404);
  }

  const nextStatus = normalizeRecordStatus(status);
  const actorId = actor?.id ?? null;

  if (existingCourse.status === nextStatus) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ...(branchProfile?.id ? { branchId: branchProfile.id } : {}),
      },
      include: getCourseInclude(),
    });
    return toCourseDetail(course);
  }

  const course = await prisma.$transaction(async (tx) => {
    const updatedCourse = await tx.course.update({
      where: { id: courseId },
      data: {
        status: nextStatus,
        statusChangedAt: new Date(),
        statusChangedBy: actorId,
        updatedBy: actorId,
      },
      include: getCourseInclude(),
    });

    await tx.courseStatusHistory.create({
      data: {
        courseId,
        fromStatus: existingCourse.status,
        toStatus: nextStatus,
        changedBy: actorId,
        reason,
      },
    });

    return updatedCourse;
  });

  return toCourseDetail(course);
}

export async function deleteCourse(courseId, actor) {
  const branchProfile = await resolveBranchAdminProfile(actor);
  const existingCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
    include: getCourseInclude(),
  });

  if (!existingCourse) {
    throw new AppError("Course not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.batch.deleteMany({
      where: { courseId },
    });

    await tx.facultyCourseAssignment.deleteMany({
      where: { courseId },
    });

    await tx.course.delete({
      where: { id: courseId },
    });
  });

  return {
    ...toCourseDetail(existingCourse),
    deleted: true,
    deletedAt: new Date(),
    deletedBy: actor?.id ?? null,
  };
}

export async function listCourseStatusHistory(courseId, actor = null) {
  await ensureCourseExists(courseId, actor);

  const history = await prisma.courseStatusHistory.findMany({
    where: { courseId },
    orderBy: { changedAt: "desc" },
  });

  return {
    data: history.map((entry) => toStatusHistoryEntry(entry, "course")),
  };
}

export async function listCourseModules(courseId, query, actor = null) {
  await ensureCourseExists(courseId, actor);
  const { page, limit, skip, take } = buildPagination(query);
  const where = buildModuleWhere(courseId, query);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "sequenceno";
  const sortOrder = parseSortOrder(query.sortOrder, "asc");

  const orderBy = (() => {
    switch (sortBy) {
      case "title":
        return { title: sortOrder };
      case "status":
        return { status: sortOrder };
      case "updatedat":
        return { updatedAt: sortOrder };
      case "createdat":
        return { createdAt: sortOrder };
      default:
        return { sequenceNo: sortOrder };
    }
  })();

  const [total, rows] = await prisma.$transaction([
    prisma.courseModule.count({ where }),
    prisma.courseModule.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
  ]);

  return {
    data: rows.map(toCourseModule),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createCourseModule(courseId, payload, actor) {
  await ensureCourseExists(courseId, actor, { requireActive: true });
  const parsed = buildModulePayload(payload);
  await assertUniqueModuleTitle(courseId, parsed.titleKey);
  const actorId = actor?.id ?? null;

  const created = await prisma.$transaction(async (tx) => {
    const module = await insertModuleAtSequence(
      tx,
      courseId,
      {
        title: parsed.title,
        titleKey: parsed.titleKey,
        description: parsed.description,
        status: parsed.status,
        statusChangedAt: new Date(),
        statusChangedBy: actorId,
        createdBy: actorId,
        updatedBy: actorId,
      },
      parsed.sequenceNo,
    );

    return module;
  });

  return toCourseModule(created);
}

export async function updateCourseModule(courseId, moduleId, payload, actor) {
  const course = await ensureCourseExists(courseId, actor, { requireActive: true });
  const existingModule = await ensureModuleExists(courseId, moduleId);
  const parsed = buildModulePayload(payload, existingModule);
  await assertUniqueModuleTitle(courseId, parsed.titleKey, moduleId);
  const actorId = actor?.id ?? null;
  const statusChanged = existingModule.status !== parsed.status;

  const updated = await prisma.$transaction(async (tx) => {
    const nextSequenceNo =
      parsed.sequenceNo === null
        ? existingModule.sequenceNo
        : await moveModuleSequence(tx, courseId, moduleId, existingModule.sequenceNo, parsed.sequenceNo);

    const module = await tx.courseModule.update({
      where: { id: moduleId },
      data: {
        title: parsed.title,
        titleKey: parsed.titleKey,
        description: parsed.description,
        sequenceNo: nextSequenceNo,
        status: parsed.status,
        statusChangedAt: statusChanged ? new Date() : existingModule.statusChangedAt,
        statusChangedBy: statusChanged ? actorId : existingModule.statusChangedBy,
        updatedBy: actorId,
      },
    });

    return module;
  });

  return toCourseModule(updated);
}

export async function deleteCourseModule(courseId, moduleId, actor) {
  await ensureCourseExists(courseId, actor, { requireActive: true });
  const existingModule = await ensureModuleExists(courseId, moduleId);
  const actorId = actor?.id ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    const afterDeleteSequence = existingModule.sequenceNo;
    const affected = await tx.courseModule.findMany({
      where: {
        courseId,
        id: { not: moduleId },
        sequenceNo: { gt: afterDeleteSequence },
      },
      orderBy: { sequenceNo: "asc" },
      select: { id: true, sequenceNo: true },
    });

    await tx.courseModule.update({
      where: { id: moduleId },
      data: {
        status: "INACTIVE",
        statusChangedAt: new Date(),
        statusChangedBy: actorId,
        updatedBy: actorId,
      },
    });

    for (const module of affected) {
      await tx.courseModule.update({
        where: { id: module.id },
        data: {
          sequenceNo: module.sequenceNo - 1,
        },
      });
    }

    return tx.courseModule.findUnique({
      where: { id: moduleId },
    });
  });

  return toCourseModule(updated);
}

export async function reorderCourseModules(courseId, orderedModuleIds, actor) {
  await ensureCourseExists(courseId, actor, { requireActive: true });

  if (!Array.isArray(orderedModuleIds) || !orderedModuleIds.length) {
    throw new AppError("orderedModuleIds is required", 400);
  }

  const modules = await prisma.courseModule.findMany({
    where: { courseId },
    orderBy: { sequenceNo: "asc" },
  });

  const expectedIds = modules.map((module) => module.id).sort();
  const receivedIds = [...orderedModuleIds].map((id) => normalizeString(id)).sort();

  if (expectedIds.length !== receivedIds.length || expectedIds.some((id, index) => id !== receivedIds[index])) {
    throw new AppError("orderedModuleIds must contain all modules for the course", 400);
  }

  const actorId = actor?.id ?? null;

  const updatedModules = await prisma.$transaction(async (tx) => {
    const mappedModules = [];

    for (let index = 0; index < orderedModuleIds.length; index += 1) {
      const moduleId = normalizeString(orderedModuleIds[index]);
      const module = await tx.courseModule.update({
        where: { id: moduleId },
        data: {
          sequenceNo: index + 1,
          updatedBy: actorId,
        },
      });
      mappedModules.push(module);
    }

    return mappedModules;
  });

  return {
    data: updatedModules.map(toCourseModule),
  };
}

export async function getBatch(batchId) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: getBatchInclude(),
  });

  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  return toBatchDetail(batch);
}

export async function listBatches(query) {
  const { page, limit, skip, take } = buildPagination(query);
  const where = buildBatchWhere(query);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "startdate";
  const sortOrder = parseSortOrder(query.sortOrder, "asc");

  const orderBy = (() => {
    switch (sortBy) {
      case "batchname":
        return { batchName: sortOrder };
      case "status":
        return { status: sortOrder };
      case "capacity":
        return { capacity: sortOrder };
      case "enrolledcount":
        return { enrolledCount: sortOrder };
      case "updatedat":
        return { updatedAt: sortOrder };
      case "createdat":
        return { createdAt: sortOrder };
      case "coursename":
        return { course: { name: sortOrder } };
      case "enddate":
        return [{ endDate: sortOrder }, { endTime: sortOrder }];
      default:
        return [{ startDate: sortOrder }, { startTime: sortOrder }];
    }
  })();

  const [total, rows] = await prisma.$transaction([
    prisma.batch.count({ where }),
    prisma.batch.findMany({
      where,
      orderBy,
      skip,
      take,
      include: getBatchListInclude(),
    }),
  ]);

  return {
    data: rows.map((batch) => toBatchSummary(batch)),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createBatch(payload, actor) {
  const parsed = buildBatchPayload(payload);
  await ensureCourseExists(parsed.courseId, actor, { requireActive: true });
  await assertUniqueBatchName(parsed.batchNameKey);
  const actorId = actor?.id ?? null;

  const created = await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.create({
      data: {
        ...parsed,
        statusChangedAt: new Date(),
        statusChangedBy: actorId,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: getBatchInclude(),
    });

    await tx.batchStatusHistory.create({
      data: {
        batchId: batch.id,
        fromStatus: null,
        toStatus: parsed.status,
        changedBy: actorId,
      },
    });

    return batch;
  });

  return toBatchDetail(created);
}

export async function updateBatch(batchId, payload, actor) {
  const existingBatch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      course: true,
    },
  });

  if (!existingBatch) {
    throw new AppError("Batch not found", 404);
  }

  if (payload.courseId && normalizeString(payload.courseId) !== existingBatch.courseId) {
    throw new AppError("Batch course cannot be changed", 400);
  }

  const mergedPayload = {
    ...existingBatch,
    ...payload,
    courseId: existingBatch.courseId,
  };

  const parsed = buildBatchPayload(mergedPayload, existingBatch);
  await ensureCourseExists(parsed.courseId, actor, { requireActive: true });
  await assertUniqueBatchName(parsed.batchNameKey, batchId);
  const actorId = actor?.id ?? null;
  const statusChanged = existingBatch.status !== parsed.status;

  const updated = await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.update({
      where: { id: batchId },
      data: {
        ...parsed,
        statusChangedAt: statusChanged ? new Date() : existingBatch.statusChangedAt,
        statusChangedBy: statusChanged ? actorId : existingBatch.statusChangedBy,
        updatedBy: actorId,
      },
      include: getBatchInclude(),
    });

    if (statusChanged) {
      await tx.batchStatusHistory.create({
        data: {
          batchId,
          fromStatus: existingBatch.status,
          toStatus: parsed.status,
          changedBy: actorId,
        },
      });
    }

    return batch;
  });

  return toBatchDetail(updated);
}

export async function updateBatchStatus(batchId, status, actor, reason = null) {
  const existingBatch = await prisma.batch.findUnique({
    where: { id: batchId },
  });

  if (!existingBatch) {
    throw new AppError("Batch not found", 404);
  }

  const nextStatus = normalizeBatchStatus(status);
  const actorId = actor?.id ?? null;

  if (existingBatch.status === nextStatus) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: getBatchInclude(),
    });
    return toBatchDetail(batch);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.update({
      where: { id: batchId },
      data: {
        status: nextStatus,
        statusChangedAt: new Date(),
        statusChangedBy: actorId,
        updatedBy: actorId,
      },
      include: getBatchInclude(),
    });

    await tx.batchStatusHistory.create({
      data: {
        batchId,
        fromStatus: existingBatch.status,
        toStatus: nextStatus,
        changedBy: actorId,
        reason,
      },
    });

    return batch;
  });

  return toBatchDetail(updated);
}

export async function deleteBatch(batchId, actor) {
  return updateBatchStatus(batchId, "INACTIVE", actor, "Soft deleted");
}

export async function listBatchStatusHistory(batchId) {
  await ensureBatchExists(batchId);

  const history = await prisma.batchStatusHistory.findMany({
    where: { batchId },
    orderBy: { changedAt: "desc" },
  });

  return {
    data: history.map((entry) => toStatusHistoryEntry(entry, "batch")),
  };
}

export async function listBatchFacultyAssignments(batchId, query) {
  await ensureBatchExists(batchId);
  const { page, limit, skip, take } = buildPagination(query);
  const where = buildAssignmentWhere(batchId, query);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "assignedat";
  const sortOrder = parseSortOrder(query.sortOrder);

  const orderBy = (() => {
    switch (sortBy) {
      case "facultyname":
        return { faculty: { fullName: sortOrder } };
      case "batchname":
        return { batch: { batchName: sortOrder } };
      case "status":
        return { status: sortOrder };
      case "assigneddate":
        return { assignedDate: sortOrder };
      case "updatedat":
        return { updatedAt: sortOrder };
      case "createdat":
        return { createdAt: sortOrder };
      default:
        return { assignedAt: sortOrder };
    }
  })();

  const [total, rows] = await prisma.$transaction([
    prisma.batchFacultyAssignment.count({ where }),
    prisma.batchFacultyAssignment.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        faculty: {
          select: {
            id: true,
            userCode: true,
            fullName: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    }),
  ]);

  return {
    data: rows.map(toAssignment),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createBatchFacultyAssignment(batchId, payload, actor) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      course: true,
    },
  });

  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  await ensureBatchAssignable(batch);

  const facultyId = parseRequiredText(payload.facultyId, "Faculty");
  const faculty = await ensureActiveFaculty(facultyId);
  const assignedDate = parseDateString(payload.assignedDate ?? getLocalDateString(), "Assigned date");

  if (assignedDate > batch.endDate) {
    throw new AppError("Assigned date cannot be after the batch end date", 400);
  }

  const existingActiveAssignment = await prisma.batchFacultyAssignment.findFirst({
    where: {
      batchId,
      facultyId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (existingActiveAssignment) {
    throw new AppError("Faculty is already assigned to this batch", 409);
  }

  const actorId = actor?.id ?? null;

  const created = await prisma.batchFacultyAssignment.create({
    data: {
      batchId,
      facultyId,
      assignedDate,
      assignedAt: new Date(),
      status: "ACTIVE",
      notes: parseOptionalText(payload.notes),
      assignedBy: actorId,
      createdBy: actorId,
      updatedBy: actorId,
    },
    include: {
      faculty: {
        select: {
          id: true,
          userCode: true,
          fullName: true,
          email: true,
          role: true,
          active: true,
        },
      },
    },
  });

  return toAssignment(created);
}

export async function updateBatchFacultyAssignment(batchId, assignmentId, payload, actor) {
  const existingAssignment = await prisma.batchFacultyAssignment.findFirst({
    where: {
      id: assignmentId,
      batchId,
    },
    include: {
      batch: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!existingAssignment) {
    throw new AppError("Assignment not found", 404);
  }

  await ensureBatchAssignable(existingAssignment.batch);

  const nextStatus = payload.status ? normalizeAssignmentStatus(payload.status) : existingAssignment.status;
  const nextFacultyId = payload.facultyId ? parseRequiredText(payload.facultyId, "Faculty") : existingAssignment.facultyId;
  const faculty = await ensureActiveFaculty(nextFacultyId);
  const assignedDate = payload.assignedDate
    ? parseDateString(payload.assignedDate, "Assigned date")
    : existingAssignment.assignedDate;

  if (assignedDate > existingAssignment.batch.endDate) {
    throw new AppError("Assigned date cannot be after the batch end date", 400);
  }

  if (nextStatus === "ACTIVE") {
    const duplicateActive = await prisma.batchFacultyAssignment.findFirst({
      where: {
        batchId,
        facultyId: nextFacultyId,
        status: "ACTIVE",
        id: { not: assignmentId },
      },
      select: { id: true },
    });

    if (duplicateActive) {
      throw new AppError("Faculty is already assigned to this batch", 409);
    }
  }

  const actorId = actor?.id ?? null;
  const shouldMarkReleased = existingAssignment.status === "ACTIVE" && nextStatus === "INACTIVE";
  const shouldRestore = existingAssignment.status === "INACTIVE" && nextStatus === "ACTIVE";

  const updated = await prisma.batchFacultyAssignment.update({
    where: { id: assignmentId },
    data: {
      facultyId: nextFacultyId,
      assignedDate,
      status: nextStatus,
      notes: parseOptionalText(payload.notes) ?? existingAssignment.notes,
      releasedAt: shouldMarkReleased ? new Date() : shouldRestore ? null : existingAssignment.releasedAt,
      releasedBy: shouldMarkReleased ? actorId : shouldRestore ? null : existingAssignment.releasedBy,
      assignedBy: existingAssignment.assignedBy ?? actorId,
      updatedBy: actorId,
    },
    include: {
      faculty: {
        select: {
          id: true,
          userCode: true,
          fullName: true,
          email: true,
          role: true,
          active: true,
        },
      },
    },
  });

  return toAssignment(updated);
}

export async function deleteBatchFacultyAssignment(batchId, assignmentId, actor) {
  const existingAssignment = await prisma.batchFacultyAssignment.findFirst({
    where: {
      id: assignmentId,
      batchId,
    },
    include: {
      batch: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!existingAssignment) {
    throw new AppError("Assignment not found", 404);
  }

  await ensureBatchAssignable(existingAssignment.batch);

  const actorId = actor?.id ?? null;

  const updated = await prisma.batchFacultyAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "INACTIVE",
      releasedAt: new Date(),
      releasedBy: actorId,
      updatedBy: actorId,
    },
    include: {
      faculty: {
        select: {
          id: true,
          userCode: true,
          fullName: true,
          email: true,
          role: true,
          active: true,
        },
      },
    },
  });

  return toAssignment(updated);
}
