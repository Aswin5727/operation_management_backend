import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { sendFacultyBatchAssignmentEmail, sendStudentScheduleChangedEmail } from "../../common/services/resendEmail.js";
import { buildBranchEntityId, normalizeBranchEntityId, extractEntitySequence } from "../../common/utils/branchIdentifiers.js";
import { calculateBatchCourseEndDate } from "./batchAllocation.js";
import { generateSchedule } from "../instituteLeave/instituteSchedule.js";
import { syncStudentCourseEnd } from "../instituteLeave/instituteLeave.service.js";

const STATUSES = new Set(["ACTIVE", "INACTIVE"]);
const WEEK_TYPES = new Set(["WEEKDAY", "WEEKEND"]);
const MODES = new Set(["OFFLINE", "ONLINE"]);

function text(value) { return String(value ?? "").trim(); }
function page(value) { const n = Number(value ?? 1); return Number.isInteger(n) && n > 0 ? n : 1; }
function limit(value) { const n = Number(value ?? 10); return Number.isInteger(n) && n > 0 ? Math.min(n, 100) : 10; }
function required(value, label) { const result = text(value); if (!result) throw new AppError(`${label} is required`, 400); return result; }
function parseStatus(value) { const result = text(value).toUpperCase() || "ACTIVE"; if (!STATUSES.has(result)) throw new AppError("Invalid status", 400); return result; }
function parseTime(value) {
  const result = text(value); if (!result) return "";
  const match = result.match(/^(\d{1,2})(?::(\d{2}))?$/); if (!match) throw new AppError("Time must be in HH:MM format", 400);
  const hour = Number(match[1]); const minute = Number(match[2] || 0);
  if (hour > 23 || minute > 59) throw new AppError("Invalid time", 400);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function period(value) { const result = text(value).toUpperCase() || "AM"; if (!["AM", "PM"].includes(result)) throw new AppError("Time period must be AM or PM", 400); return result; }
function clock(time, meridiem) {
  const match = text(time).match(/^(\d{1,2}):(\d{2})$/); if (!match) return text(time);
  let hour = Number(match[1]); if (meridiem === "AM" && hour === 12) hour = 0; if (meridiem === "PM" && hour < 12) hour += 12;
  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
function buildTiming(value) { const start = clock(value.startTime, value.startPeriod); const end = clock(value.endTime, value.endPeriod); return `${start}${start && end ? " - " : ""}${end}`.trim(); }
function makeBatchId(branchId, sequence) { return buildBranchEntityId(branchId, "BAT", Math.max(1, Number(sequence) || 1)); }
function positive(value, label) { const n = Number(value); if (!Number.isInteger(n) || n <= 0) throw new AppError(`${label} must be greater than zero`, 400); return n; }
function nonNegative(value, label) { const n = Number(value ?? 0); if (!Number.isInteger(n) || n < 0) throw new AppError(`${label} must be zero or greater`, 400); return n; }
function parseWeekType(value) { const result = text(value).toUpperCase(); if (!WEEK_TYPES.has(result)) throw new AppError("Week type is required and must be WEEKDAY or WEEKEND", 400); return result; }
function parseMode(value) { const result = text(value).toUpperCase(); if (!MODES.has(result)) throw new AppError("Mode is required and must be OFFLINE or ONLINE", 400); return result; }
function validateCourseMode(courseMode, batchMode) {
  const allowed = text(courseMode).toUpperCase()
  if (allowed === "HYBRID") return
  if (allowed && allowed !== batchMode) throw new AppError(`This course is configured for ${allowed.toLowerCase()} mode only`, 400)
}
function parseDate(value, label) { const result = text(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(new Date(`${result}T00:00:00`).getTime())) throw new AppError(`${label} must be a valid date`, 400); return result; }
export { calculateBatchCourseEndDate } from "./batchAllocation.js";

function normalizeBatch(value, index = 0) {
  const input = value || {};
  const startTime = parseTime(input.startTime); const endTime = parseTime(input.endTime);
  const startPeriod = period(input.startPeriod); const endPeriod = period(input.endPeriod);
  const totalSeats = positive(input.totalSeats || input.seats, `Batch ${index + 1} total seats`);
  const parsed = { batchId: text(input.batchId || input.id), batchName: required(input.batchName || input.name, `Batch ${index + 1} name`), startTime, startPeriod, endTime, endPeriod, totalSeats, weekType: parseWeekType(input.weekType), mode: parseMode(input.mode), courseStartDate: parseDate(input.courseStartDate || input.startDate, "Course start date"), status: parseStatus(input.status), sequenceNo: Number(input.sequenceNo) || index + 1 };
  return { ...parsed, batchTiming: text(input.batchTiming) || buildTiming(parsed) };
}

function parsePayload(payload = {}) {
  const values = Array.isArray(payload.batches) ? payload.batches : Array.isArray(payload.rows) ? payload.rows : [payload];
  const batches = values.filter(Boolean).map((value) => normalizeBatch({
    ...value,
    weekType: value.weekType || payload.weekType,
    mode: value.mode || payload.mode,
    courseStartDate: value.courseStartDate || payload.courseStartDate || payload.startDate,
  }));
  if (!batches.length) throw new AppError("Add at least one batch", 400);
  return { courseId: text(payload.courseId || payload.branchCourseId), facultyId: text(payload.facultyId || payload.branchFacultyId), batches };
}

function relations() {
  return {
    branchCourse: { select: { id: true, name: true, courseCode: true, status: true, duration: true, hours: true, mode: true } },
    branchFaculty: { select: { id: true, facultyId: true, name: true, email: true, phone: true, status: true, weeklyOffDay: true } },
  };
}

function toBatch(record = {}) {
  return {
    id: record.batchId || record.id || "", batchId: record.batchId || record.id || "", branchId: record.branchId || "",
    branchCourseId: record.branchCourseId || "", branchFacultyId: record.branchFacultyId || "", courseId: record.courseId || record.branchCourseId || "",
    courseName: record.courseName || record.branchCourse?.name || "", courseCode: record.branchCourse?.courseCode || "",
    facultyId: record.facultyId || record.branchFaculty?.facultyId || record.branchFacultyId || "", facultyName: record.facultyName || record.branchFaculty?.name || "",
    facultyEmail: record.facultyEmail || record.branchFaculty?.email || "", batchName: record.batchName || "", startTime: record.startTime || "",
    startPeriod: record.startPeriod || "AM", endTime: record.endTime || "", endPeriod: record.endPeriod || "AM", batchTiming: record.batchTiming || buildTiming(record),
    totalSeats: Number(record.totalSeats || 0), weekType: text(record.weekType).toUpperCase(), mode: text(record.mode).toUpperCase(), courseStartDate: record.courseStartDate || null, courseEndDate: record.courseEndDate || null, weeklyOffDay: record.weeklyOffDay || record.branchFaculty?.weeklyOffDay || null, sequenceNo: Number(record.sequenceNo || 1), status: text(record.status || "ACTIVE").toUpperCase(),
    completionStatus: text(record.completionStatus || "AVAILABLE").toUpperCase(),
    activeStudentCount: Number(record.activeStudentCount || 0),
    completedStudentCount: Number(record.completedStudentCount || 0),
    createdAt: record.createdAt || null, updatedAt: record.updatedAt || null,
  };
}

async function addBatchCompletionMetadata(records = []) {
  const batchIds = records.map((record) => text(record.batchId)).filter(Boolean);
  if (!batchIds.length) return records;

  const students = await prisma.branchStudent.findMany({
    where: { batchId: { in: batchIds }, recordStatus: "ACTIVE" },
    select: { batchId: true, courseProgress: true },
  });
  const byBatch = new Map();

  students.forEach((student) => {
    const key = text(student.batchId);
    const current = byBatch.get(key) || { activeStudentCount: 0, completedStudentCount: 0 };
    current.activeStudentCount += 1;
    if (Number(student.courseProgress) >= 100) current.completedStudentCount += 1;
    byBatch.set(key, current);
  });

  return records.map((record) => {
    const summary = byBatch.get(text(record.batchId)) || { activeStudentCount: 0, completedStudentCount: 0 };
    return {
      ...record,
      completionStatus: summary.activeStudentCount > 0 && summary.activeStudentCount === summary.completedStudentCount
        ? "COMPLETED"
        : "AVAILABLE",
      ...summary,
    };
  });
}

function queueFacultyEmail(batch) {
  const to = text(batch.facultyEmail); if (!to) return;
  void sendFacultyBatchAssignmentEmail({ to, fullName: batch.facultyName || to, facultyId: batch.facultyId || "", courseName: batch.courseName || "", batchId: batch.batchId, batchCount: 1, batches: [{ batchName: batch.batchName, batchTiming: batch.batchTiming, totalSeats: batch.totalSeats, status: batch.status }] }).catch((error) => console.warn("Faculty batch assignment email failed", error));
}

async function ensureCourse(branchId, courseId) {
  const result = await prisma.branchCourse.findFirst({ where: { id: courseId, branchId }, select: { id: true, name: true, courseCode: true, status: true, duration: true, hours: true, mode: true } });
  if (!result) throw new AppError("Course not found", 404); if (result.status !== "ACTIVE") throw new AppError("Selected course is inactive", 400); return result;
}
async function ensureFaculty(branchId, facultyId) {
  const result = await prisma.branchFaculty.findFirst({ where: { branchId, OR: [{ id: facultyId }, { facultyId }] }, select: { id: true, facultyId: true, name: true, email: true, status: true, weeklyOffDay: true } });
  if (!result) throw new AppError("Faculty not found", 404); if (result.status !== "ACTIVE") throw new AppError("Selected faculty is inactive", 400); return result;
}
async function nextSequence(branchId) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { branchId: true } });
  const records = await prisma.branchBatch.findMany({ where: { branchId }, select: { batchId: true } });
  return records.reduce((max, row) => Math.max(max, extractEntitySequence(row.batchId, branch.branchId, "BAT")), 0) + 1;
}
function whereFor(branchId, query = {}) {
  const where = { branchId, status: STATUSES.has(text(query.status).toUpperCase()) ? text(query.status).toUpperCase() : "ACTIVE" };
  const search = text(query.search); if (search) where.OR = [{ batchId: { contains: search, mode: "insensitive" } }, { batchName: { contains: search, mode: "insensitive" } }, { batchTiming: { contains: search, mode: "insensitive" } }, { courseName: { contains: search, mode: "insensitive" } }, { facultyName: { contains: search, mode: "insensitive" } }, { facultyEmail: { contains: search, mode: "insensitive" } }];
  const courseId = text(query.courseId || query.branchCourseId); if (courseId) where.branchCourseId = courseId;
  const facultyId = text(query.facultyId || query.branchFacultyId); if (facultyId) where.OR = [...(where.OR || []), { branchFacultyId: facultyId }, { facultyId }];
  const weekType = text(query.weekType).toUpperCase(); if (WEEK_TYPES.has(weekType)) where.weekType = weekType;
  const mode = text(query.mode).toUpperCase(); if (MODES.has(mode)) where.mode = mode;
  return where;
}
async function calculateStoredBatchEndDate(branch, course, input, batchId, weeklyOffDay = null) {
  const leaves = await prisma.branchCalendarLeave.findMany({ where: { branchId: branch.id, status: "ACTIVE", isInstitute: true } });
  const schedule = generateSchedule({
    student: { id: batchId || "batch", studentId: batchId || "batch", batchId: batchId || "batch", batchName: input.batchName, courseStartDate: input.courseStartDate, course, classSchedule: input.weekType === "WEEKEND" ? "Weekend" : "Weekday", facultyId: "batch", batchTiming: input.batchTiming, weeklyOffDay },
    batch: { ...input, id: batchId || "batch", batchId: batchId || "batch", courseId: course.id, facultyId: "batch", weeklyOffDay },
    leaves,
    holidays: [],
    timezone: branch.timezone || "Asia/Kolkata",
    now: new Date(),
  });
  return schedule.actualCourseEndDate || calculateBatchCourseEndDate(input.courseStartDate, input.weekType, input.mode, course.hours ?? course.duration);
}

export async function listBranchBatches(query = {}, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const currentPage = page(query.page); const currentLimit = limit(query.limit); const where = whereFor(branch.id, query);
  const order = text(query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
  const [total, records] = await prisma.$transaction([prisma.branchBatch.count({ where }), prisma.branchBatch.findMany({ where, orderBy: { createdAt: order }, skip: (currentPage - 1) * currentLimit, take: currentLimit, include: relations() })]);
  const recordsWithCompletion = await addBatchCompletionMetadata(records);
  return { data: recordsWithCompletion.map(toBatch), meta: { page: currentPage, limit: currentLimit, total, totalPages: Math.max(1, Math.ceil(total / currentLimit)) } };
}

export async function getBranchBatch(batchId, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const record = await prisma.branchBatch.findFirst({ where: { branchId: branch.id, OR: [{ id: text(batchId) }, { batchId: text(batchId) }] }, include: relations() });
  if (!record) throw new AppError("Batch not found", 404); return toBatch(record);
}

export async function createBranchBatch(payload = {}, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const parsed = parsePayload(payload); if (!parsed.courseId) throw new AppError("Course is required", 400); if (!parsed.facultyId) throw new AppError("Faculty is required", 400);
  const course = await ensureCourse(branch.id, parsed.courseId); parsed.batches.forEach((input) => validateCourseMode(course.mode, input.mode)); const faculty = await ensureFaculty(branch.id, parsed.facultyId); let sequence = await nextSequence(branch.id); const actorId = actor?.id ?? null;
  parsed.batches = await Promise.all(parsed.batches.map(async (input) => ({ ...input, weeklyOffDay: faculty.weeklyOffDay || null, courseEndDate: await calculateStoredBatchEndDate(branch, course, input, input.batchId, faculty.weeklyOffDay) })));
  const created = await prisma.$transaction(async (tx) => { const records = []; for (const input of parsed.batches) {
    let batchId = input.batchId ? normalizeBranchEntityId(input.batchId, branch.branchId, "BAT") : "";
    if (batchId && await tx.branchBatch.findFirst({ where: { branchId: branch.id, batchId }, select: { id: true } })) batchId = "";
    while (!batchId || await tx.branchBatch.findFirst({ where: { branchId: branch.id, batchId }, select: { id: true } })) batchId = makeBatchId(branch.branchId, sequence++);
    const record = await tx.branchBatch.create({ data: { branchId: branch.id, branchCourseId: course.id, branchFacultyId: faculty.id, courseId: course.id, courseName: course.name, facultyId: faculty.facultyId || faculty.id, facultyName: faculty.name, facultyEmail: faculty.email, ...input, batchId, createdBy: actorId, updatedBy: actorId }, include: relations() }); records.push(record); }
    await tx.branchFacultyCourse.upsert({ where: { branchFacultyId_branchCourseId: { branchFacultyId: faculty.id, branchCourseId: course.id } }, create: { branchId: branch.id, branchFacultyId: faculty.id, branchCourseId: course.id, createdBy: actorId, updatedBy: actorId }, update: { updatedBy: actorId } });
    return records; });
  await prisma.branchFaculty.update({ where: { id: faculty.id }, data: { branchCourseId: course.id, updatedBy: actorId } }); created.forEach(queueFacultyEmail); return toBatch(created[0]);
}

export async function updateBranchBatch(batchId, payload = {}, actor = null) {
  const branch = await getCurrentBranchProfile(actor);
  const requestedCourseId = text(payload.courseId || payload.branchCourseId);
  const requestedFacultyId = text(payload.facultyId || payload.branchFacultyId);
  const scopedWhere = {
    branchId: branch.id,
    OR: [{ id: text(batchId) }, { batchId: text(batchId) }],
    ...(requestedCourseId ? { courseId: requestedCourseId } : {}),
    ...(requestedFacultyId ? { facultyId: requestedFacultyId } : {}),
  };
  const existing = await prisma.branchBatch.findFirst({ where: scopedWhere, include: relations() }) ||
    await prisma.branchBatch.findFirst({ where: { branchId: branch.id, OR: [{ id: text(batchId) }, { batchId: text(batchId) }] }, include: relations() });
  if (!existing) throw new AppError("Batch not found", 404); const parsed = parsePayload({ ...payload, courseId: payload.courseId || existing.courseId, facultyId: payload.facultyId || existing.facultyId, batches: payload.batches || payload.rows || [payload] });
  const course = await ensureCourse(branch.id, parsed.courseId); validateCourseMode(course.mode, parsed.batches[0].mode); const faculty = await ensureFaculty(branch.id, parsed.facultyId); const weeklyOffDay = existing.facultyId === faculty.facultyId ? existing.weeklyOffDay : faculty.weeklyOffDay; const calculatedEndDate = await calculateStoredBatchEndDate(branch, course, parsed.batches[0], existing.batchId, weeklyOffDay); if (!calculatedEndDate) throw new AppError("Selected course has no valid duration", 400); const input = { ...parsed.batches[0], weeklyOffDay: weeklyOffDay || null, courseEndDate: calculatedEndDate, batchId: existing.batchId };
  const synced = await prisma.$transaction(async (tx) => {
    const updatedBatch = await tx.branchBatch.update({ where: { id: existing.id }, data: { branchCourseId: course.id, branchFacultyId: faculty.id, courseId: course.id, courseName: course.name, facultyId: faculty.facultyId || faculty.id, facultyName: faculty.name, facultyEmail: faculty.email, ...input, updatedBy: actor?.id ?? null }, include: relations() });
    await tx.branchFacultyCourse.upsert({ where: { branchFacultyId_branchCourseId: { branchFacultyId: faculty.id, branchCourseId: course.id } }, create: { branchId: branch.id, branchFacultyId: faculty.id, branchCourseId: course.id, createdBy: actor?.id ?? null, updatedBy: actor?.id ?? null }, update: { updatedBy: actor?.id ?? null } });
    if (existing.courseStartDate === input.courseStartDate) {
      await tx.branchFaculty.update({ where: { id: faculty.id }, data: { branchCourseId: course.id, updatedBy: actor?.id ?? null } });
      return { updatedBatch, students: [] };
    }
    const students = await tx.branchStudent.findMany({ where: { branchId: branch.id, batchId: existing.batchId, courseId: existing.courseId, recordStatus: "ACTIVE" }, select: { id: true, studentName: true, emailAddress: true, courseStartDate: true } });
    const syncedStudents = [];
    for (const student of students) {
      const changedStudent = await tx.branchStudent.update({ where: { id: student.id }, data: { courseStartDate: input.courseStartDate, updatedBy: actor?.id ?? null } });
      await syncStudentCourseEnd(tx, changedStudent);
      const refreshed = await tx.branchStudent.findUnique({ where: { id: student.id }, select: { courseStartDate: true, courseEndDate: true } });
      syncedStudents.push({ ...student, ...refreshed, previousStartDate: student.courseStartDate });
    }
    await tx.branchFaculty.update({ where: { id: faculty.id }, data: { branchCourseId: course.id, updatedBy: actor?.id ?? null } });
    return { updatedBatch, students: syncedStudents };
  });
  queueFacultyEmail(synced.updatedBatch);
  for (const student of synced.students) {
    if (!student.emailAddress) continue;
    void sendStudentScheduleChangedEmail({ to: student.emailAddress, fullName: student.studentName, courseName: course.name, batchName: synced.updatedBatch.batchName, previousStartDate: student.previousStartDate, courseStartDate: student.courseStartDate, courseEndDate: student.courseEndDate }).catch((error) => console.warn("Student schedule update email failed", error));
  }
  return toBatch(synced.updatedBatch);
}

export async function deleteBranchBatch(batchId, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const existing = await prisma.branchBatch.findFirst({ where: { branchId: branch.id, OR: [{ id: text(batchId) }, { batchId: text(batchId) }] } });
  if (!existing) throw new AppError("Batch not found", 404); const deleted = await prisma.branchBatch.delete({ where: { id: existing.id } });
  const remaining = await prisma.branchBatch.count({ where: { branchId: branch.id, branchFacultyId: existing.branchFacultyId, branchCourseId: existing.branchCourseId, status: "ACTIVE" } });
  if (!remaining) await prisma.branchFaculty.updateMany({ where: { id: existing.branchFacultyId, branchCourseId: existing.branchCourseId }, data: { branchCourseId: null, updatedBy: actor?.id ?? null } });
  return toBatch(deleted);
}
