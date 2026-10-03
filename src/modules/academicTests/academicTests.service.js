import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { getFacultyMyBatchesSummary } from "../dashboard/dashboard.service.js";
import { createNotification } from "../notifications/notifications.service.js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const text = (value) => String(value ?? "").trim();
const displayTime = (value) => { const [hourText, minute = "00"] = text(value).split(":"); const hour = Number(hourText); if (!Number.isFinite(hour)) return text(value); return `${String(hour % 12 || 12).padStart(2, "0")}:${minute} ${hour >= 12 ? "PM" : "AM"}`; };
const academicProjectUploadRoot = path.resolve(process.cwd(), "uploads", "academic-projects");
const VALID_TYPES = new Set(["TEST", "PROJECT", "TEST_AND_PROJECT"]);

function courseProgressThreshold(testNumber, testCount) {
  const number = Number(testNumber);
  const count = Number(testCount);
  if (!Number.isInteger(number) || !Number.isInteger(count) || number < 1 || count < 1) return 100;
  // Keep the configured test-count examples at clean progress milestones:
  // 3 tests => 30/60/90, 4 => 25/50/75/100, 5 => 20/40/60/80/100.
  return Math.min(100, Math.max(0, Math.floor((number * 100) / count / 5) * 5));
}

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
    const uniqueRows = new Map();
    rows.forEach((row) => {
      const item = toPublic(row, retestItemIds);
      const configuredCount = Number(item.course?.academicTestCount || 0);
      const configuredItems = item.items.filter((entry) => configuredCount <= 0 || Number(entry.sequence) <= configuredCount);
      item.batches.filter((batch) => ids.includes(text(batch.facultyId))).forEach((batch) => {
        const key = `${item.course?.id || ''}:${batch.id || batch.batchId || ''}`;
        const candidate = { ...item, academicTestCount: configuredCount || configuredItems.length, items: configuredItems, batches: [batch] };
        const existing = uniqueRows.get(key);
        const candidateMatchesConfig = configuredCount > 0 && item.items.length === configuredCount;
        const existingMatchesConfig = existing?.configuredCount > 0 && existing.sourceItemCount === existing.configuredCount;
        if (!existing || (candidateMatchesConfig && !existingMatchesConfig) || (candidateMatchesConfig === existingMatchesConfig && new Date(candidate.updatedAt || candidate.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0))) {
          uniqueRows.set(key, { ...candidate, configuredCount, sourceItemCount: item.items.length });
        }
      });
    });
    return [...uniqueRows.values()].map(({ configuredCount, sourceItemCount, ...row }) => row);
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
    include: { branchCourse: { select: { id: true, name: true, courseCode: true, academicTestCount: true } }, items: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, testType: true } }, batches: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true, facultyId: true, status: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const testItemIds = rows.flatMap((row) => row.items.map((item) => item.id));
  const batchIds = rows.flatMap((row) => row.batches.map(({ branchBatch }) => branchBatch?.id).filter(Boolean));
  const batchCodes = rows.flatMap((row) => row.batches.map(({ branchBatch }) => branchBatch?.batchId).filter(Boolean));
  const [papers, schedules, batchStudents, facultySummary] = await Promise.all([
    testItemIds.length && batchIds.length ? prisma.academicQuestionPaper.findMany({ where: { academicTestItemId: { in: testItemIds }, branchBatchId: { in: batchIds } }, select: { id: true, academicTestItemId: true, branchBatchId: true, status: true } }) : [],
    testItemIds.length && batchIds.length ? prisma.academicScheduledTest.findMany({ where: { academicTestItemId: { in: testItemIds }, branchBatchId: { in: batchIds } }, select: { id: true, academicTestItemId: true, branchBatchId: true, testNumber: true, testDate: true, startTime: true, endTime: true, status: true } }) : [],
    batchCodes.length ? prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", batchId: { in: [...new Set([...batchIds, ...batchCodes])] } }, select: { id: true, batchId: true } }) : [],
    getFacultyMyBatchesSummary(actor),
  ]);
  const progressByBatch = new Map((facultySummary?.batchCounts || []).map((entry) => [text(entry?.batchId || entry?.id).toLowerCase(), Number(entry?.courseProgress) || 0]));
  const paperByKey = new Map(papers.map((paper) => [`${paper.academicTestItemId}:${paper.branchBatchId}`, paper]));
  const schedulesByKey = new Map(schedules.map((schedule) => [`${schedule.academicTestItemId}:${schedule.branchBatchId}`, schedule]));
  const studentIdsByBatch = new Map();
  batchStudents.forEach((student) => { if (!studentIdsByBatch.has(student.batchId)) studentIdsByBatch.set(student.batchId, new Set()); studentIdsByBatch.get(student.batchId).add(student.id); });
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
      const studentCount = new Set([...(studentIdsByBatch.get(branchBatch.id) || []), ...(studentIdsByBatch.get(branchBatch.batchId) || [])]).size;
      const previousCompleted = !previous || (previousSchedule && (previousSchedule.status === "COMPLETED" || scheduleInstant(previousSchedule.testDate, previousSchedule.endTime) < Date.now()));
      const currentCourseProgress = Math.max(0, Math.min(100, progressByBatch.get(text(branchBatch.batchId || branchBatch.id).toLowerCase()) || 0));
      const requiredProgress = nextItem ? courseProgressThreshold(nextItem.sequence, row.branchCourse.academicTestCount || row.items.length) : null;
      const eligible = Boolean(nextItem && currentCourseProgress >= requiredProgress);
      const available = Boolean(nextItem && studentCount > 0 && previousCompleted && paper?.status === "PREPARED" && eligible);
      return { ...branchBatch, testType: nextItem?.testType || null, studentCount, nextTestNumber: nextItem?.sequence || null, academicTestItemId: nextItem?.id || null, questionPaperId: paper?.id || null, questionPaperStatus: paper?.status || "NOT_PREPARED", currentCourseProgress, requiredProgress, eligible, available, blocker: nextItem && studentCount === 0 ? `No active students are assigned to ${branchBatch.batchName || branchBatch.batchId}. Select the batch that contains the students.` : nextItem && !eligible ? `Test ${nextItem.sequence} can be created only after the batch reaches ${requiredProgress}% course progress.` : nextItem && !previousCompleted ? `Test ${previous.sequence} must be completed before creating Test ${nextItem.sequence}.` : nextItem && paper?.status !== "PREPARED" ? `Question paper has not been prepared for ${branchBatch.batchName || branchBatch.batchId}. Please prepare the question paper before creating Test ${nextItem.sequence}.` : null, schedules: batchSchedules };
    }),
  })).filter((course) => course.batches.length);
  return { tomorrow: tomorrowDate(), courses };
}

export async function createFacultyScheduledTest(actor, payload = {}) {
  const ids = facultyIds(actor);
  const itemId = text(payload.academicTestItemId);
  const batchId = text(payload.branchBatchId || payload.batchId);
  const item = await prisma.academicTestItem.findFirst({ where: { id: itemId, academicTest: { batches: { some: { branchBatchId: batchId, branchBatch: { status: "ACTIVE", OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] } } } } }, include: { academicTest: { select: { branchCourseId: true, branchCourse: { select: { academicTestCount: true } } } } } });
  if (!item) throw new AppError("This Academic Test batch is not assigned to you.", 403);
  const [selectedBatch, facultySummary] = await Promise.all([
    prisma.branchBatch.findUnique({ where: { id: batchId }, select: { batchId: true } }),
    getFacultyMyBatchesSummary(actor),
  ]);
  const progressKeys = [selectedBatch?.batchId, batchId].map((value) => text(value).toLowerCase()).filter(Boolean);
  const progressEntry = (facultySummary?.batchCounts || []).find((entry) => progressKeys.includes(text(entry?.batchId || entry?.id).toLowerCase()));
  const currentCourseProgress = Math.max(0, Math.min(100, Number(progressEntry?.courseProgress) || 0));
  const requiredProgress = courseProgressThreshold(item.sequence, item.academicTest.branchCourse.academicTestCount || item.sequence);
  if (currentCourseProgress < requiredProgress) throw new AppError(`Test ${item.sequence} can be created only after the batch reaches ${requiredProgress}% course progress.`, 422);
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
  const scheduleData = { academicTestItemId: item.id, branchCourseId: item.academicTest.branchCourseId, branchBatchId: batchId, facultyId: actor.id, questionPaperId: paper.id, testNumber: item.sequence, testDate: date, startTime, endTime, projectStartDate: null, projectEndDate: null, status: "SCHEDULED", createdBy: actor.id };
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
  const notificationMessage = needsTest ? `Test ${item.sequence} for ${course?.name || "your course"} has been scheduled on ${date} from ${displayTime(startTime)} to ${displayTime(endTime)}.` : `Project ${item.sequence} for ${course?.name || "your course"} has been created.`;
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
    data: { message: `Your Academic Test has been rescheduled to ${date} from ${displayTime(startTime)} to ${displayTime(endTime)}.` },
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

function academicAttemptExpired(schedule, now = Date.now()) {
  return schedule?.status !== "CANCELLED" && Boolean(schedule?.testDate && schedule?.endTime) && scheduleInstant(schedule.testDate, schedule.endTime) < now;
}

async function syncExpiredAcademicAttempts(schedules = [], originalStudentIds = []) {
  const expired = schedules.filter((schedule) => academicAttemptExpired(schedule));
  if (!expired.length) return;
  const papers = await prisma.academicQuestionPaper.findMany({ where: { id: { in: expired.map((schedule) => schedule.questionPaperId).filter(Boolean) } }, select: { id: true, totalQuestions: true, totalMarks: true } });
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  for (const schedule of expired) {
    const paper = paperById.get(schedule.questionPaperId);
    const targetStudentIds = schedule.retestStudentId ? [schedule.retestStudentId] : originalStudentIds;
    for (const branchStudentId of targetStudentIds) {
      const existing = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId } }, select: { id: true, status: true } });
      if (["SUBMITTED", "EVALUATED"].includes(existing?.status)) continue;
      if (existing?.id) {
        const evaluatedAnswer = await prisma.academicTestAnswer.findFirst({ where: { submissionId: existing.id, evaluationStatus: "EVALUATED" }, select: { id: true } });
        if (evaluatedAnswer) {
          await prisma.academicTestSubmission.update({ where: { id: existing.id }, data: { status: "EVALUATED" } });
          continue;
        }
      }
      await prisma.academicTestSubmission.upsert({
        where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId } },
        update: { status: "NOT_ATTENDED", submittedAt: null },
        create: { academicTestId: schedule.id, branchStudentId, status: "NOT_ATTENDED", totalQuestions: paper?.totalQuestions || 0, totalMarks: paper?.totalMarks || 0, obtainedMarks: 0, percentage: 0, unmarkedCount: paper?.totalQuestions || 0 },
      });
    }
  }
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
  const questions = paper?.questions || [];
  return { ...schedule, testType: item?.testType || "TEST", projectTitle: project?.projectTitle || "", projectDescription: project?.projectDescription || "", projectRequirements: project?.projectRequirements || "", projectMarks: project?.projectMarks || 0, projectStatus: project?.status || "NOT_PREPARED", status: academicScheduleStatus(schedule), testName: schedule.isRetest ? `Test ${schedule.testNumber} - Retest` : `Test ${schedule.testNumber}`, course: item?.academicTest?.branchCourse, totalQuestions: paper?.totalQuestions || 0, totalMarks: paper?.totalMarks || 0, passMark: paper?.passMark || 0, marksPerQuestion: paper?.marksPerQuestion || 0, hasAssessment: questions.some((question) => question.questionType === "ASSESSMENT"), questions: includeQuestions ? questions.map(({ correctAnswer, ...question }) => question) : undefined };
}

async function academicPassMarkForSchedule(schedule, fallback = 0) {
  if (Number(fallback || 0) > 0) return Number(fallback);
  const paper = schedule.questionPaperId ? await prisma.academicQuestionPaper.findUnique({ where: { id: schedule.questionPaperId }, select: { passMark: true } }) : null;
  if (Number(paper?.passMark || 0) > 0) return Number(paper.passMark);
  if (!schedule.originalScheduleId) return 0;
  const root = await prisma.academicScheduledTest.findUnique({ where: { id: schedule.originalScheduleId }, select: { questionPaperId: true } });
  const rootPaper = root?.questionPaperId ? await prisma.academicQuestionPaper.findUnique({ where: { id: root.questionPaperId }, select: { passMark: true } }) : null;
  return Number(rootPaper?.passMark || 0);
}

export async function listStudentAcademicTests(actor) {
  const student = await studentFor(actor);
  const batches = await prisma.branchBatch.findMany({ where: { OR: [{ id: student.batchId }, { batchId: student.batchId }] }, select: { id: true } });
  const schedules = await prisma.academicScheduledTest.findMany({ where: { OR: [{ branchBatchId: { in: batches.map((batch) => batch.id) } }, { retestStudentId: student.id }] }, orderBy: [{ testDate: "asc" }, { startTime: "asc" }] });
  await syncExpiredAcademicAttempts(schedules, [student.id]);
  const scheduleIds = schedules.map((schedule) => schedule.id);
  const [submissions, projectSubmissions] = await Promise.all([
    prisma.academicTestSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: scheduleIds } } }),
    prisma.academicProjectSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: scheduleIds } } }),
  ]);
  const byId = new Map(submissions.map((submission) => [submission.academicTestId, submission]));
  const projectById = new Map(projectSubmissions.map((submission) => [submission.academicTestId, submission]));
  return Promise.all(schedules.map(async (schedule) => {
    const publicSchedule = await academicPublicSchedule(schedule);
    const submission = byId.get(schedule.id) || null;
    const passMark = await academicPassMarkForSchedule(schedule, publicSchedule.passMark);
    const resultStatus = publicSchedule.hasAssessment && submission?.status === "SUBMITTED"
      ? null
      : submission?.status === "SUBMITTED" && passMark > 0
        ? Number(submission.obtainedMarks || 0) >= passMark ? "PASS" : "FAIL"
        : submission?.resultStatus || null;
    return { ...publicSchedule, passMark, submission: submission ? { ...submission, resultStatus } : null, projectSubmission: projectById.get(schedule.id) || null };
  }));
}

function projectScheduleStatus(schedule) {
  if (schedule.status === "CANCELLED") return "CANCELLED";
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
    const { default: mammoth } = await import("mammoth");
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
  if (paper.questions.some((question) => question.questionType === "ASSESSMENT")) {
    const answers = paper.questions.map((question) => ({ questionId: question.id, answerText: text(selected[question.id]), selectedAnswer: null, isCorrect: false, marksAwarded: 0, evaluationStatus: "PENDING" }));
    const submittedAt = new Date();
    return prisma.$transaction(async (tx) => { await tx.academicTestAnswer.deleteMany({ where: { submissionId: existing.id } }); await tx.academicTestAnswer.createMany({ data: answers.map((answer) => ({ ...answer, submissionId: existing.id })) }); return tx.academicTestSubmission.update({ where: { id: existing.id }, data: { status: "SUBMITTED", resultStatus: null, submittedAt, attemptedCount: answers.filter((answer) => answer.answerText).length, correctCount: 0, wrongCount: 0, unmarkedCount: answers.filter((answer) => !answer.answerText).length, obtainedMarks: 0, percentage: 0 } }); });
  }
  const answers = paper.questions.map((question) => { const choice = text(selected[question.id]).toUpperCase() || null; const correct = choice === question.correctAnswer; return { questionId: question.id, selectedAnswer: choice, isCorrect: correct, marksAwarded: correct ? Number(question.marks || paper.marksPerQuestion || 0) : 0, evaluationStatus: "EVALUATED" }; });
  const attempted = answers.filter((answer) => answer.selectedAnswer).length; const correct = answers.filter((answer) => answer.isCorrect).length; const obtained = answers.reduce((total, answer) => total + answer.marksAwarded, 0); const resultStatus = Number(paper.passMark || 0) > 0 ? obtained >= Number(paper.passMark) ? "PASS" : "FAIL" : null; const submittedAt = new Date();
  return prisma.$transaction(async (tx) => { await tx.academicTestAnswer.deleteMany({ where: { submissionId: existing.id } }); await tx.academicTestAnswer.createMany({ data: answers.map((answer) => ({ ...answer, submissionId: existing.id })) }); return tx.academicTestSubmission.update({ where: { id: existing.id }, data: { status: "SUBMITTED", resultStatus, submittedAt, attemptedCount: attempted, correctCount: correct, wrongCount: attempted - correct, unmarkedCount: answers.length - attempted, obtainedMarks: obtained, percentage: paper.totalMarks ? (obtained / paper.totalMarks) * 100 : 0 } }); });
}

export async function getStudentAcademicResult(actor, id) {
  const { student, schedule } = await academicScheduleForStudent(actor, id);
  const result = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: text(id), branchStudentId: student.id } } });
  if (!result || !["SUBMITTED", "EVALUATED"].includes(result.status)) throw new AppError("Academic Test result not found.", 404);
  const publicSchedule = await academicPublicSchedule(schedule);
  const passMark = await academicPassMarkForSchedule(schedule, publicSchedule.passMark);
  const resultStatus = publicSchedule.hasAssessment && result.status === "SUBMITTED"
    ? null
    : passMark > 0
      ? Number(result.obtainedMarks || 0) >= passMark ? "PASS" : "FAIL"
      : result.resultStatus || null;
  return { ...result, resultStatus, passMark };
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
  const retests = studentIds.length ? await prisma.academicScheduledTest.findMany({ where: { originalScheduleId: schedule.originalScheduleId || schedule.id, retestStudentId: { in: studentIds } }, orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }] }) : [];
  if (academicAttemptExpired(schedule)) {
    for (const student of students) {
      const existing = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } }, select: { id: true, status: true } });
      if (["SUBMITTED", "EVALUATED"].includes(existing?.status)) continue;
      if (existing?.id) {
        const evaluatedAnswer = await prisma.academicTestAnswer.findFirst({ where: { submissionId: existing.id, evaluationStatus: "EVALUATED" }, select: { id: true } });
        if (evaluatedAnswer) {
          await prisma.academicTestSubmission.update({ where: { id: existing.id }, data: { status: "EVALUATED" } });
          continue;
        }
      }
      await prisma.academicTestSubmission.upsert({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } }, update: { status: "NOT_ATTENDED", submittedAt: null }, create: { academicTestId: schedule.id, branchStudentId: student.id, status: "NOT_ATTENDED", totalQuestions: info.totalQuestions || 0, totalMarks: info.totalMarks || 0, obtainedMarks: 0, percentage: 0, unmarkedCount: info.totalQuestions || 0 } });
    }
  }
  await syncExpiredAcademicAttempts(retests);
  const refreshedSubmissions = await prisma.academicTestSubmission.findMany({ where: { academicTestId: schedule.id } });
  const retestSubmissions = retests.length ? await prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: retests.map((retest) => retest.id) } } }) : [];
  const byStudent = new Map(refreshedSubmissions.map((submission) => [submission.branchStudentId, submission]));
  for (const submission of [...byStudent.values(), ...retestSubmissions]) {
    if (info.hasAssessment && submission.status === "SUBMITTED") submission.resultStatus = null;
    else if (submission.status === "SUBMITTED" && !submission.resultStatus && Number(info.passMark || 0) > 0) submission.resultStatus = Number(submission.obtainedMarks || 0) >= Number(info.passMark) ? "PASS" : "FAIL";
  }
  const projectByStudent = new Map(projectSubmissions.map((submission) => [submission.branchStudentId, submission]));
  const retestByStudent = new Map();
  for (const retest of retests) if (!retestByStudent.has(retest.retestStudentId)) retestByStudent.set(retest.retestStudentId, { schedule: retest, submission: retestSubmissions.find((submission) => submission.academicTestId === retest.id) || null });
  return { test: info, students: students.map((student) => ({ student, ...(byStudent.get(student.id) || { status: "NOT_SUBMITTED", resultStatus: null, attemptedCount: 0, correctCount: 0, wrongCount: 0, unmarkedCount: info.totalQuestions, totalMarks: info.totalMarks, obtainedMarks: null, percentage: null, submittedAt: null }), projectSubmission: projectByStudent.get(student.id) || null, retest: retestByStudent.get(student.id) || null })) };
}

export async function getFacultyAssessment(actor, scheduleId, studentId) {
  const ids = facultyIds(actor);
  const schedule = await prisma.academicScheduledTest.findFirst({ where: { id: text(scheduleId), facultyId: { in: ids } } });
  if (!schedule) throw new AppError("Academic Test schedule not found.", 404);
  const batch = await prisma.branchBatch.findUnique({ where: { id: schedule.branchBatchId }, select: { id: true, batchId: true } });
  const student = await prisma.branchStudent.findFirst({ where: { id: text(studentId), recordStatus: "ACTIVE", OR: [{ batchId: schedule.branchBatchId }, { batchId: batch?.batchId || "__missing__" }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true } });
  if (!student) throw new AppError("Student is not assigned to this test batch.", 403);
  const paper = await prisma.academicQuestionPaper.findUnique({ where: { id: schedule.questionPaperId }, include: { questions: { orderBy: { questionNumber: "asc" } } } });
  if (!paper?.questions.some((question) => question.questionType === "ASSESSMENT")) throw new AppError("This question paper has no Assessment questions.", 422);
  const submission = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } } });
  const answers = submission ? await prisma.academicTestAnswer.findMany({ where: { submissionId: submission.id } }) : [];
  return { student, schedule: { id: schedule.id, testNumber: schedule.testNumber }, paper: { id: paper.id, totalQuestions: paper.totalQuestions, totalMarks: paper.totalMarks, passMark: paper.passMark }, questions: paper.questions.map((question) => ({ ...question, answer: answers.find((answer) => answer.questionId === question.id) || null })), submission };
}

export async function evaluateFacultyAssessment(actor, scheduleId, studentId, payload = {}) {
  const context = await getFacultyAssessment(actor, scheduleId, studentId);
  if (!context.submission || context.submission.status !== "SUBMITTED") throw new AppError("Student has not submitted this Assessment.", 409);
  const values = Array.isArray(payload.answers) ? payload.answers : [];
  if (values.length !== context.questions.length) throw new AppError("Evaluate every question before saving.", 422);
  const marksByQuestion = new Map(context.questions.map((question) => [question.id, question]));
  const evaluated = values.map((entry) => { const question = marksByQuestion.get(text(entry?.questionId)); const marks = Number(entry?.marksObtained); if (!question || !Number.isFinite(marks) || marks < 0 || marks > Number(question.marks || 0)) throw new AppError("Marks are invalid for one or more questions.", 422); return { question, marks }; });
  const obtained = evaluated.reduce((sum, entry) => sum + entry.marks, 0); const percentage = context.paper.totalMarks ? Number(((obtained / context.paper.totalMarks) * 100).toFixed(2)) : 0; const resultStatus = obtained >= Number(context.paper.passMark || 0) ? "PASS" : "FAIL"; const evaluatedAt = new Date();
  return prisma.$transaction(async (tx) => { for (const entry of evaluated) await tx.academicTestAnswer.update({ where: { submissionId_questionId: { submissionId: context.submission.id, questionId: entry.question.id } }, data: { marksAwarded: entry.marks, evaluationStatus: "EVALUATED", evaluatedBy: actor.id, evaluatedAt } }); return tx.academicTestSubmission.update({ where: { id: context.submission.id }, data: { status: "EVALUATED", obtainedMarks: obtained, percentage, resultStatus, attemptedCount: evaluated.length, correctCount: 0, wrongCount: 0, unmarkedCount: 0 } }); });
}

export async function scheduleFacultyAcademicRetest(actor, id, payload = {}) {
  const ids = facultyIds(actor);
  const original = await prisma.academicScheduledTest.findFirst({ where: { id: text(id), facultyId: { in: ids } } });
  if (!original) throw new AppError("Academic Test schedule not found.", 404);
  if (original.status === "CANCELLED" || scheduleInstant(original.testDate, original.endTime) > Date.now()) throw new AppError("Retest can be scheduled only after the original test has ended.", 409);

  const studentId = text(payload.studentId);
  const batch = await prisma.branchBatch.findUnique({ where: { id: original.branchBatchId }, select: { id: true, batchId: true } });
  const student = await prisma.branchStudent.findFirst({ where: { id: studentId, recordStatus: "ACTIVE", OR: [{ batchId: original.branchBatchId }, { batchId: batch?.batchId || "__missing__" }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true } });
  if (!student) throw new AppError("Student is not assigned to this test batch.", 404);
  const existingSubmission = await prisma.academicTestSubmission.findUnique({ where: { academicTestId_branchStudentId: { academicTestId: original.id, branchStudentId: student.id } }, select: { status: true, resultStatus: true, obtainedMarks: true } });
  const rootSchedule = original.originalScheduleId ? await prisma.academicScheduledTest.findUnique({ where: { id: original.originalScheduleId }, select: { academicTestItemId: true } }) : original;
  const papers = await prisma.academicQuestionPaper.findMany({ where: { academicTestItemId: { in: [...new Set([original.academicTestItemId, rootSchedule?.academicTestItemId].filter(Boolean))] } }, select: { passMark: true } });
  const passMark = papers.reduce((highest, paper) => Math.max(highest, Number(paper.passMark || 0)), 0);
  const effectiveResultStatus = passMark > 0 ? Number(existingSubmission?.obtainedMarks || 0) >= passMark ? "PASS" : "FAIL" : existingSubmission?.resultStatus || null;
  if (existingSubmission?.status === "SUBMITTED" && effectiveResultStatus !== "FAIL") throw new AppError("A passed student cannot be assigned a retest.", 409);
  const duplicate = await prisma.academicScheduledTest.findFirst({ where: { OR: [{ parentScheduleId: original.id }, { originalScheduleId: original.id, parentScheduleId: null }], retestStudentId: student.id, status: { not: "CANCELLED" } }, select: { id: true } });
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
    const retestPaper = await tx.academicQuestionPaper.create({ data: { academicTestItemId: retestItem.id, branchCourseId: original.branchCourseId, branchBatchId: original.branchBatchId, createdBy: actor.id, status: sourcePaper.status, marksPerQuestion: sourcePaper.marksPerQuestion, totalQuestions: sourcePaper.totalQuestions, totalMarks: sourcePaper.totalMarks, passMark: sourcePaper.passMark } });
    if (sourcePaper.questions.length) await tx.academicQuestion.createMany({ data: sourcePaper.questions.map((question) => ({ questionPaperId: retestPaper.id, questionNumber: question.questionNumber, questionType: question.questionType, questionText: question.questionText, optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD, correctAnswer: question.correctAnswer, marks: question.marks })) });
    return tx.academicScheduledTest.create({ data: { academicTestItemId: retestItem.id, branchCourseId: original.branchCourseId, branchBatchId: original.branchBatchId, facultyId: original.facultyId, questionPaperId: retestPaper.id, testNumber: original.testNumber, testDate: date, startTime, endTime, status: "SCHEDULED", isRetest: true, originalScheduleId: original.originalScheduleId || original.id, parentScheduleId: original.id, attemptNumber: (original.attemptNumber || 1) + 1, retestStudentId: student.id, createdBy: actor.id } });
  });
  const target = student.emailAddress ? await prisma.user.findFirst({ where: { role: "STUDENT", email: { equals: student.emailAddress.toLowerCase(), mode: "insensitive" } }, select: { id: true } }) : null;
  if (target) await prisma.notification.create({ data: { kind: "ACADEMIC_TEST_CREATED", tone: "blue", title: "Academic Test Retest Assigned", message: `A retest for Test ${original.testNumber} has been scheduled on ${date} from ${displayTime(startTime)} to ${displayTime(endTime)}.`, actionLabel: "View Retest", targetUserId: target.id, academicTestId: created.id, batchId: batch?.batchId || original.branchBatchId, branchCourseId: original.branchCourseId, createdBy: actor.id } });
  return { ...created, isRetest: true, student };
}

/*
 * Reporting deliberately groups by the original schedule's testNumber.  A
 * retest currently has its own question-paper/item row for the exam flow, but
 * originalScheduleId + testNumber keep it attached to the original test in
 * reports and prevent it from becoming a new test column.
 */
async function reportBatchForFaculty(actor, batchId) {
  const ids = facultyIds(actor);
  const batch = await prisma.branchBatch.findFirst({
    where: { OR: [{ id: text(batchId) }, { batchId: text(batchId) }], facultyId: { in: ids }, status: "ACTIVE" },
    select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true, branchId: true },
  });
  if (!batch) throw new AppError("Batch not found or not assigned to this faculty.", 404);
  return batch;
}

async function reportConfiguredItems(batch) {
  const links = await prisma.academicTestBatch.findMany({
    where: { branchBatchId: batch.id },
    include: { academicTest: { include: { branchCourse: { select: { id: true, name: true, courseCode: true, academicTestCount: true } }, items: { orderBy: { sequence: "asc" } } } } },
  });
  const configured = [];
  const seen = new Set();
  for (const link of links) {
    if (link.academicTest?.branchCourseId && ![batch.branchCourseId, batch.courseId].filter(Boolean).includes(link.academicTest.branchCourseId)) continue;
    for (const item of link.academicTest?.items || []) {
      const configuredCount = Number(link.academicTest?.branchCourse?.academicTestCount || 0);
      if (configuredCount > 0 && Number(item.sequence || 0) > configuredCount) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      configured.push({ item, academicTest: link.academicTest });
    }
  }
  return configured.sort((a, b) => a.item.sequence - b.item.sequence);
}

async function reportConfiguredTests(batch) {
  return (await reportConfiguredItems(batch)).filter(({ item }) => ["TEST", "TEST_AND_PROJECT"].includes(item.testType));
}

function reportScheduleHasEnded(schedule) {
  return schedule?.status === "COMPLETED" || academicAttemptExpired(schedule);
}

function reportSubmissionIsFinal(submission, hasAssessment) {
  const status = text(submission?.status || "").toUpperCase();
  if (status === "NOT_ATTENDED" || status === "EVALUATED") return true;
  return status === "SUBMITTED" && !hasAssessment;
}

function reportResult(submission, schedule, passMark) {
  const status = text(submission?.status || "NOT_SUBMITTED").toUpperCase();
  const attended = ["SUBMITTED", "EVALUATED"].includes(status);
  const totalMarks = Number(submission?.totalMarks || 0) || Number(schedule?.totalMarks || 0);
  const marksObtained = attended ? Number(submission?.obtainedMarks || 0) : null;
  const percentage = attended && totalMarks > 0 ? Number(((marksObtained / totalMarks) * 100).toFixed(2)) : null;
  return {
    status: attended ? status : status,
    marksObtained,
    totalMarks,
    percentage,
    hasAssessment: Boolean(schedule?.hasAssessment),
    result: submission?.resultStatus || (status === "EVALUATED" || (attended && passMark > 0) ? (marksObtained >= passMark ? "PASS" : "FAIL") : null),
    passMark: Number(passMark || 0),
    submittedAt: submission?.submittedAt || null,
  };
}

async function buildAcademicReport(actor, batch, requestedStudentIds = null, selectedScheduleIds = null, includeIncomplete = false) {
  let schedules = await prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id }, orderBy: [{ testNumber: "asc" }, { attemptNumber: "asc" }, { createdAt: "asc" }] });
  if (Array.isArray(selectedScheduleIds) && selectedScheduleIds.length) {
    const selected = new Set(selectedScheduleIds.map(text));
    const selectedNumbers = new Set(schedules.filter((schedule) => !schedule.isRetest && selected.has(schedule.id)).map((schedule) => schedule.testNumber));
    schedules = schedules.filter((schedule) => selected.has(schedule.id) || selectedNumbers.has(schedule.testNumber));
  }
  const retestItemIds = new Set(schedules.filter((schedule) => schedule.isRetest && schedule.status !== "CANCELLED").map((schedule) => schedule.academicTestItemId));
  const originalItemIds = new Set(schedules.filter((schedule) => !schedule.isRetest && schedule.status !== "CANCELLED").map((schedule) => schedule.academicTestItemId));
  const configuredItems = (await reportConfiguredItems(batch)).filter(({ item }) => !retestItemIds.has(item.id) && (!originalItemIds.size || originalItemIds.has(item.id)));
  let configured = configuredItems.filter(({ item }) => ["TEST", "TEST_AND_PROJECT"].includes(item.testType));
  const students = await prisma.branchStudent.findMany({
    where: { recordStatus: "ACTIVE", OR: [{ batchId: batch.id }, { batchId: batch.batchId }], ...(requestedStudentIds ? { id: { in: requestedStudentIds } } : {}) },
    orderBy: { studentName: "asc" },
    select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true, batchName: true, batchTiming: true, courseName: true },
  });
  const studentIds = students.map((student) => student.id);
  await syncExpiredAcademicAttempts(schedules, studentIds);
  const scheduleIds = schedules.map((schedule) => schedule.id);
  const [papers, submissions, projects] = await Promise.all([
    prisma.academicQuestionPaper.findMany({ where: { id: { in: schedules.map((schedule) => schedule.questionPaperId).filter(Boolean) } }, select: { id: true, totalQuestions: true, totalMarks: true, passMark: true, questions: { select: { questionType: true } } } }),
    prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: scheduleIds }, branchStudentId: { in: studentIds } } }),
    prisma.academicProjectSubmission.findMany({ where: { academicTestId: { in: scheduleIds }, branchStudentId: { in: studentIds } } }),
  ]);
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  const submissionByKey = new Map(submissions.map((submission) => [`${submission.academicTestId}:${submission.branchStudentId}`, submission]));
  const projectByKey = new Map(projects.map((project) => [`${project.academicTestId}:${project.branchStudentId}`, project]));
  const completedConfiguredIds = new Set();
  schedules.filter((schedule) => !schedule.isRetest && schedule.status !== "CANCELLED").forEach((schedule) => {
    const configuredTest = configured.find(({ item }) => item.id === schedule.academicTestItemId);
    if (!configuredTest || !reportScheduleHasEnded(schedule)) return;
    const hasAssessment = (paperById.get(schedule.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
    if (students.length && students.every((student) => reportSubmissionIsFinal(submissionByKey.get(`${schedule.id}:${student.id}`), hasAssessment))) completedConfiguredIds.add(configuredTest.item.id);
  });
  if (!includeIncomplete) configured = configured.filter(({ item }) => completedConfiguredIds.has(item.id));
  const retestColumns = schedules.filter((schedule) => schedule.isRetest && schedule.status !== "CANCELLED").map((schedule) => { const attemptNumber = Math.max(1, Number(schedule.attemptNumber || 2) - 1); return { scheduleId: schedule.id, testNumber: schedule.testNumber, attemptNumber, label: attemptNumber === 1 ? `Test ${schedule.testNumber} Retest` : `Test ${schedule.testNumber} Retest ${attemptNumber}` }; });
  const testRows = await Promise.all(configured.map(async ({ item, academicTest }) => {
    const original = schedules.find((schedule) => !schedule.isRetest && schedule.academicTestItemId === item.id) || schedules.find((schedule) => !schedule.isRetest && schedule.testNumber === item.sequence);
    const paper = original ? paperById.get(original.questionPaperId) : await prisma.academicQuestionPaper.findUnique({ where: { academicTestItemId_branchBatchId: { academicTestItemId: item.id, branchBatchId: batch.id } }, select: { totalQuestions: true, totalMarks: true, passMark: true } });
    return { testNumber: item.sequence, itemId: item.id, testType: item.testType, scheduleId: original?.id || null, totalQuestions: Number(paper?.totalQuestions || 0), totalMarks: Number(paper?.totalMarks || 0), passMark: Number(paper?.passMark || 0), course: academicTest?.branchCourse || null };
  }));
  const reportStudents = await Promise.all(students.map(async (student) => {
    let testObtained = 0;
    let testMaximum = 0;
    const tests = testRows.map((test) => {
      const attempts = schedules.filter((schedule) => {
        const rootId = schedule.isRetest ? (schedule.originalScheduleId || schedule.parentScheduleId) : schedule.id;
        return schedule.testNumber === test.testNumber && (schedule.id === test.scheduleId || rootId === test.scheduleId) && (!schedule.retestStudentId || schedule.retestStudentId === student.id);
      }).sort((a, b) => (a.attemptNumber || 1) - (b.attemptNumber || 1) || String(a.createdAt).localeCompare(String(b.createdAt)));
      const attemptRows = attempts.map((schedule) => {
        const paper = paperById.get(schedule.questionPaperId) || {};
        const result = reportResult(submissionByKey.get(`${schedule.id}:${student.id}`), { totalMarks: paper.totalMarks, hasAssessment: (paper.questions || []).some((question) => question.questionType === "ASSESSMENT") }, test.passMark || paper.passMark);
        return { scheduleId: schedule.id, attemptType: schedule.isRetest ? "RETEST" : "ORIGINAL", attemptNumber: schedule.isRetest ? Math.max(1, Number(schedule.attemptNumber || 2) - 1) : 0, ...result };
      });
      const completed = attemptRows.filter((attempt) => attempt.status === "EVALUATED" || (attempt.status === "SUBMITTED" && !attempt.hasAssessment));
      const final = completed.length ? completed[completed.length - 1] : (attemptRows[attemptRows.length - 1] || { status: "NOT_ATTENDED", marksObtained: null, totalMarks: test.totalMarks, percentage: null, result: null, passMark: test.passMark });
      const originalFinal = attemptRows.find((attempt) => attempt.attemptType === "ORIGINAL") || null;
      const retestAttempts = attemptRows.filter((attempt) => attempt.attemptType === "RETEST");
      if (["SUBMITTED", "EVALUATED"].includes(final.status)) { testObtained += Number(final.marksObtained || 0); testMaximum += Number(final.totalMarks || test.totalMarks || 0); }
      return { ...test, final, originalFinal, retestAttempts, attempts: attemptRows };
    });
    const projectTest = configuredItems.find(({ item }) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType));
    const projectSchedule = projectTest && schedules.find((schedule) => !schedule.isRetest && schedule.academicTestItemId === projectTest.item.id);
    const projectSubmission = projectSchedule ? projectByKey.get(`${projectSchedule.id}:${student.id}`) : null;
    const projectConfig = projectTest ? await prisma.academicTestProject.findUnique({ where: { academicTestItemId_branchBatchId: { academicTestItemId: projectTest.item.id, branchBatchId: batch.id } }, select: { projectTitle: true, projectMarks: true } }).catch(() => null) : null;
    const projectTotal = Number(projectConfig?.projectMarks || 0);
    const projectMarks = projectSubmission?.marksAwarded == null ? null : Number(projectSubmission.marksAwarded);
    return {
      student,
      tests,
      project: projectTest ? { title: projectConfig?.projectTitle || "Project", totalMarks: projectTotal, marksAwarded: projectMarks, percentage: projectMarks != null && projectTotal > 0 ? Number(((projectMarks / projectTotal) * 100).toFixed(2)) : null, result: projectMarks != null && projectTotal > 0 ? (projectMarks >= projectTotal * 0.5 ? "PASS" : "FAIL") : null, status: projectSubmission?.status || "NOT_SUBMITTED" } : null,
      overallTestPercentage: testMaximum > 0 ? Number(((testObtained / testMaximum) * 100).toFixed(2)) : null,
      overallProjectPercentage: projectMarks != null && projectTotal > 0 ? Number(((projectMarks / projectTotal) * 100).toFixed(2)) : null,
    };
  }));
  return { batch: { id: batch.id, batchId: batch.batchId, batchName: batch.batchName, batchTiming: batch.batchTiming }, course: { id: batch.courseId, name: batch.courseName, courseCode: batch.branchCourseId }, totalTests: testRows.length, hasProject: configuredItems.some(({ item }) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)), tests: testRows, retestColumns, students: reportStudents };
}

export async function listAcademicReportBatches(actor) {
  const ids = facultyIds(actor);
  const batches = await prisma.branchBatch.findMany({ where: { facultyId: { in: ids }, status: "ACTIVE" }, orderBy: { batchName: "asc" }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } });
  const reportBatches = await Promise.all(batches.map(async (batch) => {
    const [schedules, students, configuredItems] = await Promise.all([
      prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, orderBy: [{ testNumber: "asc" }, { createdAt: "asc" }] }),
      prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: batch.id }, { batchId: batch.batchId }] }, select: { id: true } }),
      reportConfiguredItems(batch),
    ]);
    if (!schedules.length || !students.length) return null;
    await syncExpiredAcademicAttempts(schedules, students.map((student) => student.id));
    const paperIds = schedules.map((schedule) => schedule.questionPaperId).filter(Boolean);
    const [papers, submissions] = await Promise.all([
      prisma.academicQuestionPaper.findMany({ where: { id: { in: paperIds } }, select: { id: true, questions: { select: { questionType: true } } } }),
      prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: schedules.map((schedule) => schedule.id) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, status: true } }),
    ]);
    const paperById = new Map(papers.map((paper) => [paper.id, paper]));
    const submissionByKey = new Map(submissions.map((submission) => [`${submission.academicTestId}:${submission.branchStudentId}`, submission]));
    const configuredIds = new Set(configuredItems.filter(({ item }) => ["TEST", "TEST_AND_PROJECT"].includes(item.testType)).map(({ item }) => item.id));
    const completedTestNumbers = new Set();
    schedules.forEach((schedule) => {
      if (!configuredIds.has(schedule.academicTestItemId) || !reportScheduleHasEnded(schedule)) return;
      const hasAssessment = (paperById.get(schedule.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
      const finalizedForAllStudents = students.every((student) => reportSubmissionIsFinal(submissionByKey.get(`${schedule.id}:${student.id}`), hasAssessment));
      if (finalizedForAllStudents) completedTestNumbers.add(Number(schedule.testNumber));
    });
    const completedTestCount = completedTestNumbers.size;
    if (!completedTestCount) return null;
    return { ...batch, course: { id: batch.courseId, name: batch.courseName, courseCode: batch.branchCourseId }, totalTests: completedTestCount, completedTestCount, hasProject: configuredItems.some(({ item }) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)) };
  }));
  return reportBatches.filter(Boolean);
}

export async function getAcademicBatchReport(actor, batchId) {
  const batch = await reportBatchForFaculty(actor, batchId);
  return buildAcademicReport(actor, batch);
}

export async function getMyAcademicReport(actor) {
  const student = await studentFor(actor);
  const batch = await prisma.branchBatch.findFirst({ where: { OR: [{ id: student.batchId }, { batchId: student.batchId }] }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } });
  if (!batch) throw new AppError("Student batch not found.", 404);
  const report = await buildAcademicReport(actor, batch, [student.id]);
  return { ...report, student: report.students[0] || null, students: undefined };
}

export async function listFacultyAcademicReportTests(actor, batchId) {
  const batch = await reportBatchForFaculty(actor, batchId);
  const [schedules, students, configuredItems] = await Promise.all([
    prisma.academicScheduledTest.findMany({
      where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } },
      orderBy: [{ testNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true, testNumber: true, testDate: true, status: true, endTime: true, academicTestItemId: true, questionPaperId: true },
    }),
    prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: batch.id }, { batchId: batch.batchId }] }, select: { id: true } }),
    reportConfiguredTests(batch),
  ]);
  await syncExpiredAcademicAttempts(schedules, students.map((student) => student.id));
  const paperIds = schedules.map((schedule) => schedule.questionPaperId).filter(Boolean);
  const [papers, submissions] = await Promise.all([
    prisma.academicQuestionPaper.findMany({ where: { id: { in: paperIds } }, select: { id: true, questions: { select: { questionType: true } } } }),
    prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: schedules.map((schedule) => schedule.id) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, status: true } }),
  ]);
  const configuredIds = new Set(configuredItems.map(({ item }) => item.id));
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  const submissionByKey = new Map(submissions.map((submission) => [`${submission.academicTestId}:${submission.branchStudentId}`, submission]));
  const completedNumbers = new Set();
  const completedSchedules = [];
  for (const schedule of schedules) {
    if (!configuredIds.has(schedule.academicTestItemId) || !reportScheduleHasEnded(schedule)) continue;
    const hasAssessment = (paperById.get(schedule.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
    if (!students.length || !students.every((student) => reportSubmissionIsFinal(submissionByKey.get(`${schedule.id}:${student.id}`), hasAssessment))) continue;
    const number = Number(schedule.testNumber);
    if (completedNumbers.has(number)) continue;
    completedNumbers.add(number);
    completedSchedules.push(schedule);
  }
  return completedSchedules.map((schedule) => ({ ...schedule, label: `Test ${schedule.testNumber}`, completed: true }));
}

export async function sendAcademicTestReport(actor, payload = {}) {
  const batch = await reportBatchForFaculty(actor, payload.batchId);
  const selectedIds = [...new Set((Array.isArray(payload.academicTestIds) ? payload.academicTestIds : []).map(text).filter(Boolean))];
  if (!selectedIds.length) throw new AppError("Select at least one completed test to send.", 422);
  const schedules = await prisma.academicScheduledTest.findMany({ where: { id: { in: selectedIds }, branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, select: { id: true, testNumber: true, testDate: true, status: true, endTime: true } });
  if (schedules.length !== selectedIds.length) throw new AppError("One or more selected tests are not valid for this batch.", 422);
  const incomplete = schedules.filter((schedule) => schedule.status !== "COMPLETED" && new Date(`${schedule.testDate}T${schedule.endTime || "23:59"}:00`) > new Date());
  if (incomplete.length) throw new AppError("Only completed tests can be sent to the Branch Admin.", 422);
  const share = await prisma.facultyReportShare.create({ data: { facultyId: actor.id, branchId: batch.branchId, batchId: batch.id, courseId: batch.branchCourseId, testModuleIds: [], assessmentModuleIds: [], academicTestIds: selectedIds, reportType: "ACADEMIC_TEST" } });
  const branch = await prisma.branch.findUnique({ where: { id: batch.branchId }, select: { adminUserId: true, branchName: true, branchEmail: true } });
  await createNotification({ kind: "FACULTY_REPORT_SHARED", tone: "blue", title: "Academic test report shared", message: `${actor.fullName || "Faculty"} shared an Academic Test report for ${batch.batchName}.`, actionLabel: "View report", targetBranchId: batch.branchId, targetBranchEmail: branch?.branchEmail, targetBranchName: branch?.branchName, targetUserId: branch?.adminUserId || null, createdBy: actor.id, batchId: batch.id, branchCourseId: batch.branchCourseId, facultyId: actor.id, facultyName: actor.fullName });
  return { id: share.id, sentAt: share.sentAt, batch: { id: batch.id, batchId: batch.batchId, name: batch.batchName }, academicTestIds: selectedIds };
}

async function branchReportScope(actor) {
  const branch = await branchFor(actor);
  return branch.id;
}

export async function listBranchAcademicTestReports(actor) {
  const branchId = await branchReportScope(actor);
  const shares = await prisma.facultyReportShare.findMany({ where: { branchId, reportType: "ACADEMIC_TEST", status: "SENT" }, orderBy: { sentAt: "desc" } });
  const batchIds = shares.map((share) => share.batchId);
  const facultyIds = shares.map((share) => share.facultyId);
  const [batches, faculties] = await Promise.all([
    prisma.branchBatch.findMany({ where: { id: { in: batchIds } }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } }),
    prisma.user.findMany({ where: { id: { in: facultyIds } }, select: { id: true, fullName: true } }),
  ]);
  const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
  const facultyMap = new Map(faculties.map((faculty) => [faculty.id, faculty]));
  return shares.map((share) => ({ ...share, academicTestIds: Array.isArray(share.academicTestIds) ? share.academicTestIds : [], batch: batchMap.get(share.batchId), faculty: facultyMap.get(share.facultyId) }));
}

export async function getBranchAcademicTestReport(actor, shareId) {
  const branchId = await branchReportScope(actor);
  const share = await prisma.facultyReportShare.findFirst({ where: { id: text(shareId), branchId, reportType: "ACADEMIC_TEST", status: "SENT" } });
  if (!share) throw new AppError("Academic test report not found.", 404);
  const batch = await prisma.branchBatch.findUnique({ where: { id: share.batchId }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } });
  if (!batch) throw new AppError("Report batch not found.", 404);
  const report = await buildAcademicReport(actor, batch, null, Array.isArray(share.academicTestIds) ? share.academicTestIds : []);
  return { ...report, share: { id: share.id, sentAt: share.sentAt, facultyId: share.facultyId } };
}

export async function getBranchStudentAcademicReports(actor, studentId) {
  const branchId = await branchReportScope(actor);
  const student = await prisma.branchStudent.findFirst({ where: { branchId, studentId: text(studentId), recordStatus: "ACTIVE" }, select: { id: true, studentId: true, studentName: true, emailAddress: true, courseName: true, batchName: true, batchId: true } });
  if (!student) throw new AppError("Student not found in this branch.", 404);
  const batches = await prisma.branchBatch.findMany({ where: { branchId, OR: [{ id: student.batchId }, { batchId: student.batchId }] }, select: { id: true, batchId: true } });
  const batchIds = new Set(batches.flatMap((batch) => [batch.id, batch.batchId]).filter(Boolean));
  const shares = await prisma.facultyReportShare.findMany({ where: { branchId, reportType: "ACADEMIC_TEST", status: "SENT", batchId: { in: [...batchIds] } }, orderBy: { sentAt: "asc" } });
  const items = [];
  const reportShares = shares.length ? shares : [{ id: "configured", academicTestIds: [] }];
  for (const share of reportShares) {
    const batch = await prisma.branchBatch.findUnique({ where: { id: share.batchId }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } });
    if (!batch) continue;
    const report = await buildAcademicReport(actor, batch, [student.id], Array.isArray(share.academicTestIds) ? share.academicTestIds : [], true);
    const row = report.students?.[0];
    const scheduleIds = (row?.tests || []).map((test) => test.scheduleId).filter(Boolean);
    const schedules = await prisma.academicScheduledTest.findMany({ where: { id: { in: scheduleIds } }, select: { id: true, testDate: true } });
    const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
    for (const test of row?.tests || []) {
      const final = test.final || {};
      const status = String(final.status || "").toUpperCase();
      items.push({ id: `${share.id}:${test.testNumber}:${student.id}`, evaluationId: test.itemId || test.scheduleId, testName: `Test ${test.testNumber}`, courseName: batch.courseName, batchName: batch.batchName, testType: test.testType, testDate: scheduleById.get(test.scheduleId)?.testDate || null, marksObtained: ["SUBMITTED", "EVALUATED"].includes(status) ? final.marksObtained : null, totalMarks: ["SUBMITTED", "EVALUATED"].includes(status) ? final.totalMarks : null, percentage: ["SUBMITTED", "EVALUATED"].includes(status) ? final.percentage : null, result: final.result || null, validationStatus: ["SUBMITTED", "EVALUATED"].includes(status) ? "VALIDATED" : "NOT_EVALUATED", status: ["SUBMITTED", "EVALUATED"].includes(status) ? "SUBMITTED" : "NOT_EVALUATED", projectPercentage: row.project?.percentage ?? null });
    }
    if (row?.project && !row.tests?.some((test) => test.testType === "PROJECT")) {
      items.push({ id: `${share.id}:project:${student.id}`, evaluationId: `${share.id}:project`, testName: "Project", courseName: batch.courseName, batchName: batch.batchName, testType: "PROJECT", percentage: row.project.percentage, status: row.project.status === "EVALUATED" ? "SUBMITTED" : "NOT_EVALUATED", result: row.project.result || null, validationStatus: row.project.percentage == null ? "NOT_EVALUATED" : "VALIDATED" });
    }
  }
  const evaluations = [];
  const seen = new Set();
  for (const item of items) {
    const key = item.evaluationId || item.testName;
    if (seen.has(key)) continue;
    seen.add(key);
    evaluations.push({ evaluationId: item.evaluationId, name: item.testName, type: item.testType, percentage: item.percentage, status: item.status || "NOT_EVALUATED", result: item.result });
  }
  return { student, items, evaluations };
}
