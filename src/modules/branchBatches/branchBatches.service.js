import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { sendFacultyBatchAssignmentEmail } from "../../common/services/resendEmail.js";

const STATUSES = new Set(["ACTIVE", "INACTIVE"]);

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
function makeBatchId(sequence) { return `BAT-${String(Math.max(1, Number(sequence) || 1)).padStart(3, "0")}`; }
function positive(value, label) { const n = Number(value); if (!Number.isInteger(n) || n <= 0) throw new AppError(`${label} must be greater than zero`, 400); return n; }
function nonNegative(value, label) { const n = Number(value ?? 0); if (!Number.isInteger(n) || n < 0) throw new AppError(`${label} must be zero or greater`, 400); return n; }

function normalizeBatch(value, index = 0) {
  const input = value || {};
  const startTime = parseTime(input.startTime); const endTime = parseTime(input.endTime);
  const startPeriod = period(input.startPeriod); const endPeriod = period(input.endPeriod);
  const totalSeats = positive(input.totalSeats || input.seats, `Batch ${index + 1} total seats`);
  const offlineSeats = nonNegative(input.offlineSeats, `Batch ${index + 1} offline seats`);
  if (offlineSeats > totalSeats) throw new AppError(`Batch ${index + 1} offline seats cannot exceed total seats`, 400);
  const parsed = { batchId: text(input.batchId || input.id), batchName: required(input.batchName || input.name, `Batch ${index + 1} name`), startTime, startPeriod, endTime, endPeriod, totalSeats, offlineSeats, status: parseStatus(input.status), sequenceNo: Number(input.sequenceNo) || index + 1 };
  return { ...parsed, batchTiming: text(input.batchTiming) || buildTiming(parsed) };
}

function parsePayload(payload = {}) {
  const values = Array.isArray(payload.batches) ? payload.batches : Array.isArray(payload.rows) ? payload.rows : [payload];
  const batches = values.filter(Boolean).map(normalizeBatch);
  if (!batches.length) throw new AppError("Add at least one batch", 400);
  return { courseId: text(payload.courseId || payload.branchCourseId), facultyId: text(payload.facultyId || payload.branchFacultyId), batches };
}

function relations() {
  return {
    branchCourse: { select: { id: true, name: true, courseCode: true, status: true } },
    branchFaculty: { select: { id: true, facultyId: true, name: true, email: true, phone: true, status: true } },
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
    totalSeats: Number(record.totalSeats || 0), offlineSeats: Number(record.offlineSeats || 0), sequenceNo: Number(record.sequenceNo || 1), status: text(record.status || "ACTIVE").toUpperCase(),
    createdAt: record.createdAt || null, updatedAt: record.updatedAt || null,
  };
}

function queueFacultyEmail(batch) {
  const to = text(batch.facultyEmail); if (!to) return;
  void sendFacultyBatchAssignmentEmail({ to, fullName: batch.facultyName || to, facultyId: batch.facultyId || "", courseName: batch.courseName || "", batchId: batch.batchId, batchCount: 1, batches: [{ batchName: batch.batchName, batchTiming: batch.batchTiming, totalSeats: batch.totalSeats, status: batch.status }] }).catch((error) => console.warn("Faculty batch assignment email failed", error));
}

async function ensureCourse(branchId, courseId) {
  const result = await prisma.branchCourse.findFirst({ where: { id: courseId, branchId }, select: { id: true, name: true, courseCode: true, status: true } });
  if (!result) throw new AppError("Course not found", 404); if (result.status !== "ACTIVE") throw new AppError("Selected course is inactive", 400); return result;
}
async function ensureFaculty(branchId, facultyId) {
  const result = await prisma.branchFaculty.findFirst({ where: { branchId, OR: [{ id: facultyId }, { facultyId }] }, select: { id: true, facultyId: true, name: true, email: true, status: true } });
  if (!result) throw new AppError("Faculty not found", 404); if (result.status !== "ACTIVE") throw new AppError("Selected faculty is inactive", 400); return result;
}
async function nextSequence(branchId) {
  const records = await prisma.branchBatch.findMany({ where: { branchId }, select: { batchId: true } });
  return records.reduce((max, row) => { const match = text(row.batchId).match(/^BAT-(\d+)$/i); return match ? Math.max(max, Number(match[1])) : max; }, 0) + 1;
}
function whereFor(branchId, query = {}) {
  const where = { branchId, status: STATUSES.has(text(query.status).toUpperCase()) ? text(query.status).toUpperCase() : "ACTIVE" };
  const search = text(query.search); if (search) where.OR = [{ batchId: { contains: search, mode: "insensitive" } }, { batchName: { contains: search, mode: "insensitive" } }, { batchTiming: { contains: search, mode: "insensitive" } }, { courseName: { contains: search, mode: "insensitive" } }, { facultyName: { contains: search, mode: "insensitive" } }, { facultyEmail: { contains: search, mode: "insensitive" } }];
  const courseId = text(query.courseId || query.branchCourseId); if (courseId) where.branchCourseId = courseId;
  const facultyId = text(query.facultyId || query.branchFacultyId); if (facultyId) where.OR = [...(where.OR || []), { branchFacultyId: facultyId }, { facultyId }];
  return where;
}

export async function listBranchBatches(query = {}, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const currentPage = page(query.page); const currentLimit = limit(query.limit); const where = whereFor(branch.id, query);
  const order = text(query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
  const [total, records] = await prisma.$transaction([prisma.branchBatch.count({ where }), prisma.branchBatch.findMany({ where, orderBy: { createdAt: order }, skip: (currentPage - 1) * currentLimit, take: currentLimit, include: relations() })]);
  return { data: records.map(toBatch), meta: { page: currentPage, limit: currentLimit, total, totalPages: Math.max(1, Math.ceil(total / currentLimit)) } };
}

export async function getBranchBatch(batchId, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const record = await prisma.branchBatch.findFirst({ where: { branchId: branch.id, OR: [{ id: text(batchId) }, { batchId: text(batchId) }] }, include: relations() });
  if (!record) throw new AppError("Batch not found", 404); return toBatch(record);
}

export async function createBranchBatch(payload = {}, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const parsed = parsePayload(payload); if (!parsed.courseId) throw new AppError("Course is required", 400); if (!parsed.facultyId) throw new AppError("Faculty is required", 400);
  const course = await ensureCourse(branch.id, parsed.courseId); const faculty = await ensureFaculty(branch.id, parsed.facultyId); let sequence = await nextSequence(branch.id); const actorId = actor?.id ?? null;
  const created = await prisma.$transaction(async (tx) => { const records = []; for (const input of parsed.batches) { const record = await tx.branchBatch.create({ data: { branchId: branch.id, branchCourseId: course.id, branchFacultyId: faculty.id, batchId: input.batchId || makeBatchId(sequence++), courseId: course.id, courseName: course.name, facultyId: faculty.facultyId || faculty.id, facultyName: faculty.name, facultyEmail: faculty.email, ...input, createdBy: actorId, updatedBy: actorId }, include: relations() }); records.push(record); } return records; });
  await prisma.branchFaculty.update({ where: { id: faculty.id }, data: { branchCourseId: course.id, updatedBy: actorId } }); created.forEach(queueFacultyEmail); return toBatch(created[0]);
}

export async function updateBranchBatch(batchId, payload = {}, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const existing = await prisma.branchBatch.findFirst({ where: { branchId: branch.id, OR: [{ id: text(batchId) }, { batchId: text(batchId) }] }, include: relations() });
  if (!existing) throw new AppError("Batch not found", 404); const parsed = parsePayload({ ...payload, courseId: payload.courseId || existing.courseId, facultyId: payload.facultyId || existing.facultyId, batches: payload.batches || payload.rows || [payload] });
  const course = await ensureCourse(branch.id, parsed.courseId); const faculty = await ensureFaculty(branch.id, parsed.facultyId); const input = { ...parsed.batches[0], batchId: existing.batchId };
  const updated = await prisma.branchBatch.update({ where: { id: existing.id }, data: { branchCourseId: course.id, branchFacultyId: faculty.id, courseId: course.id, courseName: course.name, facultyId: faculty.facultyId || faculty.id, facultyName: faculty.name, facultyEmail: faculty.email, ...input, updatedBy: actor?.id ?? null }, include: relations() });
  await prisma.branchFaculty.update({ where: { id: faculty.id }, data: { branchCourseId: course.id, updatedBy: actor?.id ?? null } }); queueFacultyEmail(updated); return toBatch(updated);
}

export async function deleteBranchBatch(batchId, actor = null) {
  const branch = await getCurrentBranchProfile(actor); const existing = await prisma.branchBatch.findFirst({ where: { branchId: branch.id, OR: [{ id: text(batchId) }, { batchId: text(batchId) }] } });
  if (!existing) throw new AppError("Batch not found", 404); const deleted = await prisma.branchBatch.delete({ where: { id: existing.id } });
  const remaining = await prisma.branchBatch.count({ where: { branchId: branch.id, branchFacultyId: existing.branchFacultyId, branchCourseId: existing.branchCourseId, status: "ACTIVE" } });
  if (!remaining) await prisma.branchFaculty.updateMany({ where: { id: existing.branchFacultyId, branchCourseId: existing.branchCourseId }, data: { branchCourseId: null, updatedBy: actor?.id ?? null } });
  return toBatch(deleted);
}
