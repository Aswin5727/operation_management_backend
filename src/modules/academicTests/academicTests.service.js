import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const text = (value) => String(value ?? "").trim();
const VALID_TYPES = new Set(["TEST", "PROJECT", "TEST_AND_PROJECT"]);

function normalizeType(value) {
  const type = text(value).toUpperCase().replace(/\s*\+\s*/g, "_");
  if (!VALID_TYPES.has(type)) throw new AppError("Each Academic Test item must have a valid type.", 422);
  return type;
}

function normalizeItems(items, count) {
  if (!Array.isArray(items) || items.length !== count) throw new AppError(`Academic Test must contain exactly ${count} test items.`, 422);
  return items.map((item, index) => ({ sequence: index + 1, testType: normalizeType(item?.testType || item?.type) }));
}

async function branchFor(actor) {
  const branch = await getCurrentBranchProfile(actor);
  if (!branch?.id) throw new AppError("Branch profile not found.", 403);
  return branch;
}

function includeDetails() {
  return {
    branchCourse: { select: { id: true, courseCode: true, name: true, academicTestCount: true, branchId: true } },
    items: { orderBy: { sequence: "asc" } },
    batches: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true, branchCourseId: true, courseId: true, facultyId: true, facultyName: true, status: true } } } },
  };
}

function toPublic(row) {
  return { id: row.id, course: row.branchCourse, academicTestCount: row.items.length, items: row.items, batches: row.batches.map(({ branchBatch }) => branchBatch).filter(Boolean), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

async function resolveCourse(branchId, courseId) {
  const course = await prisma.branchCourse.findFirst({ where: { id: text(courseId), branchId, status: "ACTIVE" }, select: { id: true, branchId: true, courseCode: true, name: true, academicTestCount: true } });
  if (!course) throw new AppError("Course not found or is not available to this branch.", 404);
  const count = Number(course.academicTestCount || 0);
  if (!Number.isInteger(count) || count <= 0) throw new AppError("The selected course must have a positive Academic Test Count.", 422);
  return { ...course, academicTestCount: count };
}

async function resolveBatches(branchId, course, batchIds) {
  const requested = [...new Set((Array.isArray(batchIds) ? batchIds : []).map(text).filter(Boolean))];
  if (!requested.length) throw new AppError("Select at least one batch.", 422);
  const batches = await prisma.branchBatch.findMany({ where: { branchId, status: "ACTIVE", OR: [{ id: { in: requested } }, { batchId: { in: requested } }], AND: [{ OR: [{ branchCourseId: course.id }, { courseId: course.id }] }] } });
  if (batches.length !== requested.length) throw new AppError("Every selected batch must belong to the selected course and branch.", 422);
  return batches;
}

function createBatchRows(batches) { return batches.map((batch) => ({ branchBatchId: batch.id })); }

export async function listAcademicTests(actor) {
  if (String(actor?.role || "").toUpperCase() === "FACULTY") {
    const ids = [...new Set([actor.id, actor.userCode].map(text).filter(Boolean))];
    const rows = await prisma.academicTest.findMany({ where: { batches: { some: { branchBatch: { status: "ACTIVE", OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] } } } }, include: includeDetails(), orderBy: { createdAt: "desc" } });
    return rows.map((row) => { const item = toPublic(row); return { ...item, batches: item.batches.filter((batch) => ids.includes(text(batch.facultyId))) }; });
  }
  const branch = await branchFor(actor);
  const rows = await prisma.academicTest.findMany({ where: { branchCourse: { branchId: branch.id } }, include: includeDetails(), orderBy: { createdAt: "desc" } });
  return rows.map(toPublic);
}

export async function getAcademicTest(actor, id) {
  const rows = await listAcademicTests(actor);
  const row = rows.find((item) => item.id === text(id));
  if (!row) throw new AppError("Academic Test not found.", 404);
  return row;
}

async function assertAdminAcademicTest(branchId, id) {
  const row = await prisma.academicTest.findFirst({ where: { id: text(id), branchCourse: { branchId } }, include: includeDetails() });
  if (!row) throw new AppError("Academic Test not found.", 404);
  return row;
}

export async function createAcademicTest(actor, payload = {}) {
  const branch = await branchFor(actor);
  const course = await resolveCourse(branch.id, payload.courseId || payload.branchCourseId);
  const items = normalizeItems(payload.items, course.academicTestCount);
  const batches = await resolveBatches(branch.id, course, payload.batchIds || payload.batches);
  const existing = await prisma.academicTest.findUnique({ where: { branchCourseId: course.id }, select: { id: true } });
  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.academicTestBatch.findMany({ where: { academicTestId: existing.id }, select: { branchBatchId: true } });
      const currentIds = new Set(current.map((row) => row.branchBatchId));
      const missing = batches.filter((batch) => !currentIds.has(batch.id));
      if (missing.length) await tx.academicTestBatch.createMany({ data: missing.map((batch) => ({ academicTestId: existing.id, branchBatchId: batch.id })), skipDuplicates: true });
      return tx.academicTest.findUnique({ where: { id: existing.id }, include: includeDetails() });
    });
    return toPublic(updated);
  }
  const created = await prisma.$transaction(async (tx) => tx.academicTest.create({ data: { branchCourseId: course.id, createdBy: actor.id, items: { create: items }, batches: { create: createBatchRows(batches) } }, include: includeDetails() }));
  return toPublic(created);
}

export async function updateAcademicTest(actor, id, payload = {}) {
  const branch = await branchFor(actor);
  const existing = await assertAdminAcademicTest(branch.id, id);
  const course = await resolveCourse(branch.id, payload.courseId || existing.branchCourseId);
  const items = normalizeItems(payload.items, course.academicTestCount);
  const batches = await resolveBatches(branch.id, course, payload.batchIds || payload.batches);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.academicTestItem.deleteMany({ where: { academicTestId: existing.id } });
    await tx.academicTestBatch.deleteMany({ where: { academicTestId: existing.id } });
    return tx.academicTest.update({ where: { id: existing.id }, data: { branchCourseId: course.id, items: { create: items }, batches: { create: createBatchRows(batches) } }, include: includeDetails() });
  });
  return toPublic(updated);
}

export async function deleteAcademicTest(actor, id) {
  const branch = await branchFor(actor);
  const existing = await assertAdminAcademicTest(branch.id, id);
  await prisma.academicTest.delete({ where: { id: existing.id } });
  return { id: existing.id };
}
