import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import mammoth from "mammoth";

const text = (value) => String(value ?? "").trim();
const academicProjectUploadRoot = path.resolve(process.cwd(), "uploads", "academic-projects");
const VALID_TYPES = new Set(["TEST", "PROJECT", "TEST_AND_PROJECT"]);

function normalizeType(value) {
  const type = text(value).toUpperCase().replace(/\s*\+\s*/g, "_");
  if (!VALID_TYPES.has(type)) throw new AppError("Each Academic Test item must have a valid type.", 422);
  return type;
}

function normalizeDate(value, field) {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError(`${field} must be in YYYY-MM-DD format.`, 422);
  return date;
}

function normalizeTime(value, field) {
  const time = text(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new AppError(`${field} must be a valid time.`, 422);
  return time;
}

function normalizeItemSchedule(item, type) {
  const hasTest = type === "TEST" || type === "TEST_AND_PROJECT";
  const hasProject = type === "PROJECT" || type === "TEST_AND_PROJECT";
  const result = {
    testDate: null,
    testStartTime: null,
    testEndTime: null,
    projectStartDate: null,
    projectEndDate: null,
  };
  if (hasTest) {
    result.testDate = normalizeDate(item?.testDate, "Test date");
    result.testStartTime = normalizeTime(item?.testStartTime, "Test start time");
    result.testEndTime = normalizeTime(item?.testEndTime, "Test end time");
    if (result.testEndTime <= result.testStartTime) throw new AppError("Test end time must be after test start time.", 422);
  }
  if (hasProject) {
    result.projectStartDate = normalizeDate(item?.projectStartDate, "Project start date");
    result.projectEndDate = normalizeDate(item?.projectEndDate, "Project end date");
    if (result.projectEndDate < result.projectStartDate) throw new AppError("Project end date must be on or after project start date.", 422);
  }
  return result;
}

function normalizeItems(items, count) {
  if (!Array.isArray(items) || items.length !== count) throw new AppError(`Academic Test must contain exactly ${count} test items.`, 422);
  return items.map((item, index) => {
    const testType = normalizeType(item?.testType || item?.type);
    return { sequence: index + 1, testType, ...normalizeItemSchedule(item, testType) };
  });
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

function toPublic(row, retestItemIds = new Set()) {
  const items = row.items.filter((item) => !retestItemIds.has(item.id));
  return { id: row.id, course: row.branchCourse, academicTestCount: items.length, items, batches: row.batches.map(({ branchBatch }) => branchBatch).filter(Boolean), createdAt: row.createdAt, updatedAt: row.updatedAt };
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
    const retestItemIds = new Set((await prisma.academicScheduledTest.findMany({ where: { isRetest: true, academicTestItemId: { in: rows.flatMap((row) => row.items.map((item) => item.id)) } }, select: { academicTestItemId: true } })).map((schedule) => schedule.academicTestItemId));
    return rows.map((row) => { const item = toPublic(row, retestItemIds); return { ...item, batches: item.batches.filter((batch) => ids.includes(text(batch.facultyId))) }; });
  }
  const branch = await branchFor(actor);
  const rows = await prisma.academicTest.findMany({ where: { branchCourse: { branchId: branch.id } }, include: includeDetails(), orderBy: { createdAt: "desc" } });
  const retestItemIds = new Set((await prisma.academicScheduledTest.findMany({ where: { isRetest: true, academicTestItemId: { in: rows.flatMap((row) => row.items.map((item) => item.id)) } }, select: { academicTestItemId: true } })).map((schedule) => schedule.academicTestItemId));
  return rows.map((row) => toPublic(row, retestItemIds));
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

function facultyIds(actor) {
  return [...new Set([actor?.id, actor?.userCode].map(text).filter(Boolean))];
}

function isFacultyBatch(batch, ids) {
  return ids.includes(text(batch.facultyId));
}

function tomorrowDate() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}

function scheduleDate(value) {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError("Test date must be in YYYY-MM-DD format.", 422);
  return date;
}

function scheduleTime(value, field) {
  const time = text(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new AppError(`${field} must be a valid time.`, 422);
  return time;
}

function scheduleInstant(date, time) {
  return new Date(`${date}T${time}:00+05:30`).getTime();
}

async function facultyScheduledForUpdate(actor, id) {
  const ids = facultyIds(actor);
  const schedule = await prisma.academicScheduledTest.findFirst({
    where: { id: text(id), facultyId: { in: ids } },
  });
  if (!schedule) throw new AppError("Academic Test schedule not found.", 404);
  if (schedule.status === "CANCELLED") throw new AppError("This Academic Test is already cancelled.", 409);
  if (scheduleInstant(schedule.testDate, schedule.startTime) <= Date.now()) {
    throw new AppError("This Academic Test cannot be changed after its start time.", 409);
  }
  return schedule;
}

export async function getFacultyCreateOptions(actor) {
  const ids = facultyIds(actor);
  const rows = await prisma.academicTest.findMany({
    where: { batches: { some: { branchBatch: { status: "ACTIVE", OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] } } } },
    include: { branchCourse: { select: { id: true, name: true, courseCode: true, academicTestCount: true } }, items: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, testType: true, projectStartDate: true, projectEndDate: true } }, batches: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true, facultyId: true, status: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const testItemIds = rows.flatMap((row) => row.items.map((item) => item.id));
  const batchIds = rows.flatMap((row) => row.batches.map(({ branchBatch }) => branchBatch?.id).filter(Boolean));
  const batchCodes = rows.flatMap((row) => row.batches.map(({ branchBatch }) => branchBatch?.batchId).filter(Boolean));
  const [papers, schedules, batchStudents] = await Promise.all([
    testItemIds.length && batchIds.length ? prisma.academicQuestionPaper.findMany({ where: { academicTestItemId: { in: testItemIds }, branchBatchId: { in: batchIds } }, select: { id: true, academicTestItemId: true, branchBatchId: true, status: true } }) : [],
    testItemIds.length && batchIds.length ? prisma.academicScheduledTest.findMany({ where: { academicTestItemId: { in: testItemIds }, branchBatchId: { in: batchIds } }, select: { id: true, academicTestItemId: true, branchBatchId: true, testNumber: true, testDate: true, startTime: true, endTime: true, status: true } }) : [],
    batchCodes.length ? prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", batchId: { in: [...batchIds, ...batchCodes] } }, select: { batchId: true } }) : [],
  ]);
  const paperByKey = new Map(papers.map((paper) => [`${paper.academicTestItemId}:${paper.branchBatchId}`, paper]));
  const schedulesByKey = new Map(schedules.map((schedule) => [`${schedule.academicTestItemId}:${schedule.branchBatchId}`, schedule]));
  const studentCountByBatch = new Map();
  batchStudents.forEach((student) => studentCountByBatch.set(student.batchId, (studentCountByBatch.get(student.batchId) || 0) + 1));
  const courses = rows.map((row) => ({
    id: row.branchCourse.id,
    name: row.branchCourse.name,
    courseCode: row.branchCourse.courseCode,
    academicTestCount: row.items.length,
    batches: row.batches.filter(({ branchBatch }) => branchBatch && isFacultyBatch(branchBatch, ids)).map(({ branchBatch }) => {
      const batchSchedules = row.items.map((item) => schedulesByKey.get(`${item.id}:${branchBatch.id}`)).filter(Boolean);
      const nextItem = row.items.find((item) => { const schedule = schedulesByKey.get(`${item.id}:${branchBatch.id}`); return !schedule || schedule.status === "CANCELLED"; });
      const previous = nextItem && row.items.find((item) => item.sequence === nextItem.sequence - 1);
      const previousSchedule = previous && schedulesByKey.get(`${previous.id}:${branchBatch.id}`);
      const paper = nextItem && paperByKey.get(`${nextItem.id}:${branchBatch.id}`);
      const studentCount = (studentCountByBatch.get(branchBatch.id) || 0) + (studentCountByBatch.get(branchBatch.batchId) || 0);
      const previousCompleted = !previous || (previousSchedule && (previousSchedule.status === "COMPLETED" || scheduleInstant(previousSchedule.testDate, previousSchedule.endTime) < Date.now()));
      const available = Boolean(nextItem && studentCount > 0 && previousCompleted && paper?.status === "PREPARED");
      return { ...branchBatch, testType: nextItem?.testType || null, projectStartDate: nextItem?.projectStartDate || null, projectEndDate: nextItem?.projectEndDate || null, studentCount, nextTestNumber: nextItem?.sequence || null, academicTestItemId: nextItem?.id || null, questionPaperId: paper?.id || null, questionPaperStatus: paper?.status || "NOT_PREPARED", available, blocker: nextItem && studentCount === 0 ? `No active students are assigned to ${branchBatch.batchName || branchBatch.batchId}. Select the batch that contains the students.` : nextItem && !previousCompleted ? `Test ${previous.sequence} must be completed before creating Test ${nextItem.sequence}.` : nextItem && paper?.status !== "PREPARED" ? `Question paper has not been prepared for ${branchBatch.batchName || branchBatch.batchId}. Please prepare the question paper before creating Test ${nextItem.sequence}.` : null, schedules: batchSchedules };
    }),
  })).filter((course) => course.batches.length);
  return { tomorrow: tomorrowDate(), courses };
}

export async function createFacultyScheduledTest(actor, payload = {}) {
  const ids = facultyIds(actor);
  const itemId = text(payload.academicTestItemId);
  const batchId = text(payload.branchBatchId || payload.batchId);
  const item = await prisma.academicTestItem.findFirst({ where: { id: itemId, academicTest: { batches: { some: { branchBatchId: batchId, branchBatch: { status: "ACTIVE", OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] } } } } }, include: { academicTest: { select: { branchCourseId: true } } } });
  if (!item) throw new AppError("This Academic Test batch is not assigned to you.", 403);
  const paper = await prisma.academicQuestionPaper.findUnique({ where: { academicTestItemId_branchBatchId: { academicTestItemId: item.id, branchBatchId: batchId } }, select: { id: true, status: true } });
  if (!paper || paper.status !== "PREPARED") throw new AppError(`Question Paper Not Prepared. The question paper for the selected batch has not been prepared yet. Please prepare and publish the question paper before creating Test ${item.sequence}.`, 422);
  const existing = await prisma.academicScheduledTest.findUnique({ where: { academicTestItemId_branchBatchId: { academicTestItemId: item.id, branchBatchId: batchId } }, select: { id: true, status: true } });
  if (existing && existing.status !== "CANCELLED") throw new AppError(`Test ${item.sequence} has already been created for this batch.`, 409);
  const previous = item.sequence > 1 ? await prisma.academicTestItem.findFirst({ where: { academicTestId: item.academicTestId, sequence: item.sequence - 1 }, select: { id: true, sequence: true } }) : null;
  if (previous) {
    const previousSchedule = await prisma.academicScheduledTest.findUnique({ where: { academicTestItemId_branchBatchId: { academicTestItemId: previous.id, branchBatchId: batchId } }, select: { status: true, testDate: true, endTime: true } });
    const previousCompleted = previousSchedule && (previousSchedule.status === "COMPLETED" || scheduleInstant(previousSchedule.testDate, previousSchedule.endTime) < Date.now());
    if (!previousCompleted) throw new AppError(`Test ${previous.sequence} must be completed before creating Test ${item.sequence}.`, 422);
  }
  const needsTest = item.testType === "TEST" || item.testType === "TEST_AND_PROJECT";
  const date = needsTest ? scheduleDate(payload.testDate) : null;
  if (date && date < new Date().toISOString().slice(0, 10)) throw new AppError("Past test dates are not allowed.", 422);
  const startTime = needsTest ? scheduleTime(payload.startTime, "Start time") : null;
  const endTime = needsTest ? scheduleTime(payload.endTime, "End time") : null;
  if (needsTest && endTime <= startTime) throw new AppError("End time must be after start time.", 422);
  const projectStartDate = text(payload.projectStartDate || item.projectStartDate) || null;
  const projectEndDate = text(payload.projectEndDate || item.projectEndDate) || null;
  const hasProject = item.testType === "PROJECT" || item.testType === "TEST_AND_PROJECT";
  if (hasProject && (!projectStartDate || !projectEndDate)) throw new AppError("Project start date and project end date are required for this Academic Test.", 422);
  if (hasProject && projectEndDate < projectStartDate) throw new AppError("Project end date must be on or after project start date.", 422);
  const scheduleData = { academicTestItemId: item.id, branchCourseId: item.academicTest.branchCourseId, branchBatchId: batchId, facultyId: actor.id, questionPaperId: paper.id, testNumber: item.sequence, testDate: date, startTime, endTime, projectStartDate, projectEndDate, status: "SCHEDULED", createdBy: actor.id };
  const created = existing?.status === "CANCELLED"
    ? await prisma.academicScheduledTest.update({ where: { id: existing.id }, data: scheduleData })
    : await prisma.academicScheduledTest.create({ data: scheduleData });
  const [batch, course, students] = await Promise.all([
    prisma.branchBatch.findUnique({ where: { id: batchId }, select: { batchId: true, batchName: true } }),
    prisma.branchCourse.findUnique({ where: { id: item.academicTest.branchCourseId }, select: { name: true, courseCode: true } }),
    prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId }, { batchId: (await prisma.branchBatch.findUnique({ where: { id: batchId }, select: { batchId: true } }))?.batchId || "__missing__" }] }, select: { id: true, studentId: true, emailAddress: true } }),
  ]);
  const users = students.length ? await prisma.user.findMany({ where: { OR: [{ email: { in: students.map((student) => student.emailAddress).filter(Boolean) } }, { userCode: { in: students.map((student) => student.studentId).filter(Boolean) } }] }, select: { id: true, email: true, userCode: true } }) : [];
  const userByEmail = new Map(users.map((user) => [String(user.email || "").toLowerCase(), user.id]));
  const userByCode = new Map(users.map((user) => [String(user.userCode || "").toLowerCase(), user.id]));
  const notificationMessage = needsTest ? `Test ${item.sequence} for ${course?.name || "your course"} has been scheduled on ${date} from ${startTime} to ${endTime}.` : `Project ${item.sequence} for ${course?.name || "your course"} is scheduled from ${projectStartDate} to ${projectEndDate}.`;
  const notificationRows = students.map((student) => { const targetUserId = userByEmail.get(String(student.emailAddress || "").toLowerCase()) || userByCode.get(String(student.studentId || "").toLowerCase()); return targetUserId ? ({ kind: "ACADEMIC_TEST_CREATED", tone: "blue", title: "Academic Test Created", message: notificationMessage, targetUserId, academicTestId: created.id, batchId: batch?.batchId || batchId, branchCourseId: item.academicTest.branchCourseId, branchCourseName: course?.name, createdBy: actor.id }) : null }).filter(Boolean);
  if (existing?.status === "CANCELLED") await prisma.notification.deleteMany({ where: { academicTestId: created.id } });
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  return { ...created, course, batch, notificationCount: notificationRows.length };
}

export async function updateFacultyScheduledTest(actor, id, payload = {}) {
  const schedule = await facultyScheduledForUpdate(actor, id);
  const date = scheduleDate(payload.testDate);
  const startTime = scheduleTime(payload.startTime, "Start time");
  const endTime = scheduleTime(payload.endTime, "End time");
  if (endTime <= startTime) throw new AppError("End time must be after start time.", 422);
  if (scheduleInstant(date, startTime) <= Date.now()) throw new AppError("The new test date and time must be in the future.", 422);
  const updated = await prisma.academicScheduledTest.update({
    where: { id: schedule.id },
    data: { testDate: date, startTime, endTime, status: "SCHEDULED" },
  });
  await prisma.notification.updateMany({
    where: { academicTestId: schedule.id, kind: "ACADEMIC_TEST_CREATED" },
    data: { message: `Your Academic Test has been rescheduled to ${date} from ${startTime} to ${endTime}.` },
  });
  return updated;
}

export async function cancelFacultyScheduledTest(actor, id) {
  const schedule = await facultyScheduledForUpdate(actor, id);
  const updated = await prisma.academicScheduledTest.update({
    where: { id: schedule.id },
    data: { status: "CANCELLED" },
  });
  const batch = await prisma.branchBatch.findUnique({ where: { id: schedule.branchBatchId }, select: { batchId: true, batchName: true } });
  const students = schedule.isRetest
    ? await prisma.branchStudent.findMany({ where: { id: schedule.retestStudentId || "__missing__", recordStatus: "ACTIVE" }, select: { id: true, studentId: true, emailAddress: true } })
    : await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: schedule.branchBatchId }, { batchId: batch?.batchId || "__missing__" }] }, select: { id: true, studentId: true, emailAddress: true } });
  const users = students.length ? await prisma.user.findMany({ where: { OR: [{ email: { in: students.map((student) => student.emailAddress).filter(Boolean) } }, { userCode: { in: students.map((student) => student.studentId).filter(Boolean) } }] }, select: { id: true, email: true, userCode: true } }) : [];
  const userByEmail = new Map(users.map((user) => [String(user.email || "").toLowerCase(), user.id]));
  const userByCode = new Map(users.map((user) => [String(user.userCode || "").toLowerCase(), user.id]));
  const message = `Test ${schedule.testNumber} for ${batch?.batchName || "your batch"} has been cancelled and can no longer be started.`;
  for (const student of students) {
    const targetUserId = userByEmail.get(String(student.emailAddress || "").toLowerCase()) || userByCode.get(String(student.studentId || "").toLowerCase());
    if (!targetUserId) continue;
    const existing = await prisma.notification.findFirst({ where: { academicTestId: schedule.id, targetUserId, kind: "ACADEMIC_TEST_CREATED" }, select: { id: true } });
    if (existing) await prisma.notification.update({ where: { id: existing.id }, data: { title: "Academic Test Cancelled", message, actionLabel: "View Test" } });
    else await prisma.notification.create({ data: { kind: "ACADEMIC_TEST_CREATED", tone: "red", title: "Academic Test Cancelled", message, actionLabel: "View Test", targetUserId, academicTestId: schedule.id, batchId: batch?.batchId || schedule.branchBatchId, branchCourseId: schedule.branchCourseId, createdBy: actor.id } });
  }
  return updated;
}

function academicScheduleStatus(schedule) {
  const now = Date.now();
  if (!schedule.testDate || !schedule.startTime || !schedule.endTime) {
    return schedule.status === "CANCELLED" ? "CANCELLED" : "AVAILABLE";
  }
  const start = new Date(`${schedule.testDate}T${schedule.startTime}:00+05:30`).getTime();
  const end = new Date(`${schedule.testDate}T${schedule.endTime}:00+05:30`).getTime();
  if (schedule.status === "CANCELLED") return "CANCELLED";
  if (schedule.status === "COMPLETED") return "COMPLETED";
  if (now < start) return "UPCOMING";
  if (now <= end) return "AVAILABLE";
  return "EXPIRED";
}

async function studentFor(actor) {
  const email = text(actor?.email || actor?.emailAddress).toLowerCase();
  const student = await prisma.branchStudent.findFirst({ where: { emailAddress: { equals: email, mode: "insensitive" }, recordStatus: "ACTIVE" } });
  if (!student) throw new AppError("Student profile not found.", 403);
  return student;
}

async function academicScheduleForStudent(actor, id) {
  const student = await studentFor(actor);
  const batch = await prisma.branchBatch.findFirst({ where: { OR: [{ id: student.batchId }, { batchId: student.batchId }] }, select: { id: true, batchId: true, batchName: true } });
  const schedule = batch && await prisma.academicScheduledTest.findFirst({ where: { id: text(id), OR: [{ branchBatchId: batch.id }, { retestStudentId: student.id }] } });
  if (!schedule) throw new AppError("Academic Test not found or not assigned to your batch.", 404);
  return { student, schedule, batch };
}

async function academicPublicSchedule(schedule, includeQuestions = false) {
  const item = await prisma.academicTestItem.findUnique({ where: { id: schedule.academicTestItemId }, include: { academicTest: { include: { branchCourse: { select: { id: true, name: true, courseCode: true } } } }, projects: { select: { branchBatchId: true, projectTitle: true, projectDescription: true, projectRequirements: true, projectMarks: true, status: true } } } });
  const paper = await prisma.academicQuestionPaper.findUnique({ where: { id: schedule.questionPaperId }, include: { questions: { orderBy: { questionNumber: "asc" } } } });
  const project = item?.projects?.find((entry) => entry.branchBatchId === schedule.branchBatchId) || item?.projects?.[0];
  return { ...schedule, testType: item?.testType || "TEST", projectStartDate: schedule.projectStartDate || item?.projectStartDate || null, projectEndDate: schedule.projectEndDate || item?.projectEndDate || null, projectTitle: project?.projectTitle || "", projectDescription: project?.projectDescription || "", projectRequirements: project?.projectRequirements || "", projectMarks: project?.projectMarks || 0, projectStatus: project?.status || "NOT_PREPARED", status: academicScheduleStatus(schedule), testName: schedule.isRetest ? `Test ${schedule.testNumber} - Retest` : `Test ${schedule.testNumber}`, course: item?.academicTest?.branchCourse, totalQuestions: paper?.totalQuestions || 0, totalMarks: paper?.totalMarks || 0, marksPerQuestion: paper?.marksPerQuestion || 0, questions: includeQuestions ? (paper?.questions || []).map(({ correctAnswer, ...question }) => question) : undefined };
}

export async function listStudentAcademicTests(actor) {
  const student = await studentFor(actor);
  const batches = await prisma.branchBatch.findMany({ where: { OR: [{ id: student.batchId }, { batchId: student.batchId }] }, select: { id: true } });
  const schedules = await prisma.academicScheduledTest.findMany({ where: { OR: [{ branchBatchId: { in: batches.map((batch) => batch.id) } }, { retestStudentId: student.id }] }, orderBy: [{ testDate: "asc" }, { startTime: "asc" }] });
  const scheduleIds = schedules.map((schedule) => schedule.id);
  const [submissions, projectSubmissions] = await Promise.all([
    prisma.academicTestSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: scheduleIds } } }),
    prisma.academicProjectSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: scheduleIds } } }),
  ]);
  const byId = new Map(submissions.map((submission) => [submission.academicTestId, submission]));
  const projectById = new Map(projectSubmissions.map((submission) => [submission.academicTestId, submission]));
  return Promise.all(schedules.map(async (schedule) => ({ ...(await academicPublicSchedule(schedule)), submission: byId.get(schedule.id) || null, projectSubmission: projectById.get(schedule.id) || null })));
}

function projectScheduleStatus(schedule) {
  if (schedule.status === "CANCELLED") return "CANCELLED";
  if (!schedule.projectStartDate || !schedule.projectEndDate) return "NOT_AVAILABLE";
  const today = new Date().toISOString().slice(0, 10);
  if (today < schedule.projectStartDate) return "UPCOMING";
  if (today > schedule.projectEndDate) return "EXPIRED";
  return "AVAILABLE";
}

export async function submitStudentAcademicProject(actor, id, payload = {}, file = null) {
  const { student, schedule } = await academicScheduleForStudent(actor, id);
  const item = await prisma.academicTestItem.findUnique({ where: { id: schedule.academicTestItemId }, select: { testType: true } });
  if (!item || !["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)) throw new AppError("This Academic Test does not include a project.", 422);
  if (projectScheduleStatus(schedule) !== "AVAILABLE") throw new AppError("This project is not currently accepting submissions.", 403);
  if (!file) throw new AppError("Project file is required.", 422);
  const existing = await prisma.academicProjectSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } }, select: { status: true } });
  if (["SUBMITTED", "GRADED"].includes(existing?.status)) throw new AppError("This project has already been submitted.", 409);
  await fs.mkdir(academicProjectUploadRoot, { recursive: true });
  const extension = path.extname(file.originalname || "").toLowerCase() || ".bin";
  const storedName = `${crypto.randomUUID()}${extension}`;
  await fs.writeFile(path.join(academicProjectUploadRoot, storedName), file.buffer);
  const submittedAt = new Date();
  return prisma.academicProjectSubmission.upsert({
    where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } },
    update: { status: "SUBMITTED", submittedAt, submissionText: text(payload.submissionText) || null, fileName: file.originalname, fileMimeType: file.mimetype, filePath: storedName, link: text(payload.link) || null, marksAwarded: null },
    create: { academicTestId: schedule.id, branchStudentId: student.id, status: "SUBMITTED", submittedAt, submissionText: text(payload.submissionText) || null, fileName: file.originalname, fileMimeType: file.mimetype, filePath: storedName, link: text(payload.link) || null },
  });
}

async function facultyProjectContext(actor, scheduleId, studentId) {
  const ids = facultyIds(actor);
  const schedule = await prisma.academicScheduledTest.findFirst({ where: { id: text(scheduleId), facultyId: { in: ids } } });
  if (!schedule) throw new AppError("Academic Test schedule not found.", 404);
  const student = await prisma.branchStudent.findFirst({ where: { id: text(studentId), recordStatus: "ACTIVE", OR: [{ batchId: schedule.branchBatchId }, { batchId: (await prisma.branchBatch.findUnique({ where: { id: schedule.branchBatchId }, select: { batchId: true } }))?.batchId || "__missing__" }] } });
  if (!student) throw new AppError("Student is not assigned to this test batch.", 404);
  return { schedule, student };
}

export async function getFacultyProjectFile(actor, scheduleId, studentId) {
  const { schedule, student } = await facultyProjectContext(actor, scheduleId, studentId);
  const submission = await prisma.academicProjectSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } } });
  if (!submission?.filePath) throw new AppError("Project file not found.", 404);
  try { return { buffer: await fs.readFile(path.join(academicProjectUploadRoot, submission.filePath)), mimeType: submission.fileMimeType || "application/octet-stream", fileName: submission.fileName || submission.filePath }; } catch { throw new AppError("Project file is missing.", 404); }
}

export async function getFacultyProjectPreview(actor, scheduleId, studentId) {
  const { schedule, student } = await facultyProjectContext(actor, scheduleId, studentId);
  const submission = await prisma.academicProjectSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } } });
  if (!submission?.filePath) throw new AppError("Project file not found.", 404);
  if (!String(submission.fileName || "").toLowerCase().endsWith(".docx")) throw new AppError("Only DOCX files support text preview.", 422);
  try {
    const converted = await mammoth.convertToHtml({ buffer: await fs.readFile(path.join(academicProjectUploadRoot, submission.filePath)) });
    return converted.value;
  } catch { throw new AppError("Unable to preview this project document.", 422); }
}

export async function gradeFacultyProject(actor, scheduleId, studentId, payload = {}) {
  const { schedule, student } = await facultyProjectContext(actor, scheduleId, studentId);
  const info = await academicPublicSchedule(schedule);
  const marks = Number(payload.marks);
  if (!Number.isFinite(marks) || marks < 0 || marks > Number(info.projectMarks || 0)) throw new AppError(`Marks must be between 0 and ${info.projectMarks || 0}.`, 422);
  const submission = await prisma.academicProjectSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } } });
  if (!submission || submission.status === "NOT_SUBMITTED") throw new AppError("Student has not submitted the project.", 409);
  return prisma.academicProjectSubmission.update({ where: { id: submission.id }, data: { marksAwarded: marks, status: "GRADED" } });
}

export async function getStudentAcademicTest(actor, id) {
  const { schedule } = await academicScheduleForStudent(actor, id);
  const result = await academicPublicSchedule(schedule, academicScheduleStatus(schedule) === "AVAILABLE");
  if (result.status !== "AVAILABLE") result.questions = [];
  return result;
}

export async function startStudentAcademicTest(actor, id) {
  const { student, schedule } = await academicScheduleForStudent(actor, id);
  if (academicScheduleStatus(schedule) !== "AVAILABLE") throw new AppError("This Academic Test is not currently available.", 403);
  const paper = await prisma.academicQuestionPaper.findUnique({ where: { id: schedule.questionPaperId }, select: { totalQuestions: true, totalMarks: true } });
  return prisma.academicTestSubmission.upsert({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } }, update: {}, create: { academicTestId: schedule.id, branchStudentId: student.id, totalQuestions: paper?.totalQuestions || 0, totalMarks: paper?.totalMarks || 0 } });
}

export async function submitStudentAcademicTest(actor, id, payload = {}) {
  const { student, schedule } = await academicScheduleForStudent(actor, id);
  if (!["AVAILABLE"].includes(academicScheduleStatus(schedule))) throw new AppError("This Academic Test is no longer accepting submissions.", 403);
  const paper = await prisma.academicQuestionPaper.findUnique({ where: { id: schedule.questionPaperId }, include: { questions: { orderBy: { questionNumber: "asc" } } } });
  const existing = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } } });
  if (!existing || existing.status === "SUBMITTED") throw new AppError("Start the test before submitting it, or it was already submitted.", 409);
  const selected = payload.answers && typeof payload.answers === "object" ? payload.answers : {};
  const answers = paper.questions.map((question) => { const choice = text(selected[question.id]).toUpperCase() || null; const correct = choice === question.correctAnswer; return { questionId: question.id, selectedAnswer: choice, isCorrect: correct, marksAwarded: correct ? paper.marksPerQuestion : 0 }; });
  const attempted = answers.filter((answer) => answer.selectedAnswer).length; const correct = answers.filter((answer) => answer.isCorrect).length; const obtained = answers.reduce((total, answer) => total + answer.marksAwarded, 0); const submittedAt = new Date();
  return prisma.$transaction(async (tx) => { await tx.academicTestAnswer.deleteMany({ where: { submissionId: existing.id } }); await tx.academicTestAnswer.createMany({ data: answers.map((answer) => ({ ...answer, submissionId: existing.id })) }); return tx.academicTestSubmission.update({ where: { id: existing.id }, data: { status: "SUBMITTED", submittedAt, attemptedCount: attempted, correctCount: correct, wrongCount: attempted - correct, unmarkedCount: answers.length - attempted, obtainedMarks: obtained, percentage: paper.totalMarks ? (obtained / paper.totalMarks) * 100 : 0 } }); });
}

export async function getStudentAcademicResult(actor, id) {
  const { student } = await academicScheduleForStudent(actor, id);
  const result = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: text(id), branchStudentId: student.id } } });
  if (!result || result.status !== "SUBMITTED") throw new AppError("Academic Test result not found.", 404);
  return result;
}

export async function listFacultyScheduledTests(actor) {
  const ids = facultyIds(actor); const schedules = await prisma.academicScheduledTest.findMany({ where: { facultyId: { in: ids } }, orderBy: [{ testDate: "asc" }, { startTime: "asc" }] });
  return Promise.all(schedules.map(async (schedule) => { const [row, batch] = await Promise.all([academicPublicSchedule(schedule), prisma.branchBatch.findUnique({ where: { id: schedule.branchBatchId }, select: { id: true, batchId: true, batchName: true } })]); return { ...row, batch }; }));
}

export async function getFacultyAcademicResults(actor, id) {
  const ids = facultyIds(actor); const schedule = await prisma.academicScheduledTest.findFirst({ where: { id: text(id), facultyId: { in: ids } } }); if (!schedule) throw new AppError("Academic Test not found.", 404);
  const batch = await prisma.branchBatch.findUnique({ where: { id: schedule.branchBatchId }, select: { id: true, batchId: true } });
  const [students, submissions, projectSubmissions, info] = await Promise.all([prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: schedule.branchBatchId }, { batchId: batch?.batchId || "__missing__" }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true }, orderBy: { studentName: "asc" } }), prisma.academicTestSubmission.findMany({ where: { academicTestId: schedule.id } }), prisma.academicProjectSubmission.findMany({ where: { academicTestId: schedule.id } }), academicPublicSchedule(schedule)]);
  const studentIds = students.map((student) => student.id);
  const retests = studentIds.length ? await prisma.academicScheduledTest.findMany({ where: { originalScheduleId: schedule.id, retestStudentId: { in: studentIds } }, orderBy: { createdAt: "desc" } }) : [];
  const retestSubmissions = retests.length ? await prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: retests.map((retest) => retest.id) } } }) : [];
  const byStudent = new Map(submissions.map((submission) => [submission.branchStudentId, submission]));
  const projectByStudent = new Map(projectSubmissions.map((submission) => [submission.branchStudentId, submission]));
  const retestByStudent = new Map(retests.map((retest) => [retest.retestStudentId, { schedule: retest, submission: retestSubmissions.find((submission) => submission.academicTestId === retest.id) || null }]));
  return { test: info, students: students.map((student) => ({ student, ...(byStudent.get(student.id) || { status: "NOT_SUBMITTED", attemptedCount: 0, correctCount: 0, wrongCount: 0, unmarkedCount: info.totalQuestions, totalMarks: info.totalMarks, obtainedMarks: null, percentage: null, submittedAt: null }), projectSubmission: projectByStudent.get(student.id) || null, retest: retestByStudent.get(student.id) || null })) };
}

export async function scheduleFacultyAcademicRetest(actor, id, payload = {}) {
  const ids = facultyIds(actor);
  const original = await prisma.academicScheduledTest.findFirst({ where: { id: text(id), facultyId: { in: ids } } });
  if (!original) throw new AppError("Academic Test schedule not found.", 404);
  if (original.isRetest) throw new AppError("A retest cannot be scheduled again.", 422);
  if (original.status === "CANCELLED" || scheduleInstant(original.testDate, original.endTime) > Date.now()) throw new AppError("Retest can be scheduled only after the original test has ended.", 409);

  const studentId = text(payload.studentId);
  const batch = await prisma.branchBatch.findUnique({ where: { id: original.branchBatchId }, select: { id: true, batchId: true } });
  const student = await prisma.branchStudent.findFirst({ where: { id: studentId, recordStatus: "ACTIVE", OR: [{ batchId: original.branchBatchId }, { batchId: batch?.batchId || "__missing__" }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true } });
  if (!student) throw new AppError("Student is not assigned to this test batch.", 404);
  const existingSubmission = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: original.id, branchStudentId: student.id } }, select: { status: true } });
  if (existingSubmission?.status === "SUBMITTED") throw new AppError("A submitted student cannot be assigned a retest.", 409);
  const duplicate = await prisma.academicScheduledTest.findFirst({ where: { originalScheduleId: original.id, retestStudentId: student.id, status: { not: "CANCELLED" } }, select: { id: true } });
  if (duplicate) throw new AppError("A retest is already scheduled for this student.", 409);

  const date = scheduleDate(payload.testDate);
  const startTime = scheduleTime(payload.startTime, "Retest start time");
  const endTime = scheduleTime(payload.endTime, "Retest end time");
  if (scheduleInstant(date, startTime) <= Date.now()) throw new AppError("Retest start date and time must be in the future.", 422);
  if (endTime <= startTime) throw new AppError("Retest end time must be after start time.", 422);

  const created = await prisma.$transaction(async (tx) => {
    const sourceItem = await tx.academicTestItem.findUnique({ where: { id: original.academicTestItemId }, select: { academicTestId: true, testType: true, requiredProgress: true } });
    if (!sourceItem) throw new AppError("Original Academic Test item not found.", 404);
    const sourcePaper = await tx.academicQuestionPaper.findUnique({ where: { id: original.questionPaperId }, include: { questions: { orderBy: { questionNumber: "asc" } } } });
    if (!sourcePaper) throw new AppError("Original question paper not found.", 404);
    const sequence = ((await tx.academicTestItem.aggregate({ where: { academicTestId: sourceItem.academicTestId }, _max: { sequence: true } }))._max.sequence || 0) + 1;
    const retestItem = await tx.academicTestItem.create({ data: { academicTestId: sourceItem.academicTestId, sequence, testType: sourceItem.testType, requiredProgress: sourceItem.requiredProgress } });
    const retestPaper = await tx.academicQuestionPaper.create({ data: { academicTestItemId: retestItem.id, branchCourseId: original.branchCourseId, branchBatchId: original.branchBatchId, createdBy: actor.id, status: sourcePaper.status, marksPerQuestion: sourcePaper.marksPerQuestion, totalQuestions: sourcePaper.totalQuestions, totalMarks: sourcePaper.totalMarks } });
    if (sourcePaper.questions.length) await tx.academicQuestion.createMany({ data: sourcePaper.questions.map((question) => ({ questionPaperId: retestPaper.id, questionNumber: question.questionNumber, questionText: question.questionText, optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD, correctAnswer: question.correctAnswer })) });
    return tx.academicScheduledTest.create({ data: { academicTestItemId: retestItem.id, branchCourseId: original.branchCourseId, branchBatchId: original.branchBatchId, facultyId: original.facultyId, questionPaperId: retestPaper.id, testNumber: original.testNumber, testDate: date, startTime, endTime, status: "SCHEDULED", isRetest: true, originalScheduleId: original.id, retestStudentId: student.id, createdBy: actor.id } });
  });
  const target = student.emailAddress ? await prisma.user.findFirst({ where: { role: "STUDENT", email: { equals: student.emailAddress.toLowerCase(), mode: "insensitive" } }, select: { id: true } }) : null;
  if (target) await prisma.notification.create({ data: { kind: "ACADEMIC_TEST_CREATED", tone: "blue", title: "Academic Test Retest Assigned", message: `A retest for Test ${original.testNumber} has been scheduled on ${date} from ${startTime} to ${endTime}.`, actionLabel: "View Retest", targetUserId: target.id, academicTestId: created.id, batchId: batch?.batchId || original.branchBatchId, branchCourseId: original.branchCourseId, createdBy: actor.id } });
  return { ...created, isRetest: true, student };
}
