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

function normalizeItemSchedule(item, type) {
  // Dates and times belong to the faculty's scheduled-test step. The branch
  // admin Academic Test setup only defines the type of each test item.
  return {
    testDate: null,
    testStartTime: null,
    testEndTime: null,
    projectStartDate: null,
    projectEndDate: null,
  };
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
  const configuredCount = Number(row.branchCourse?.academicTestCount || 0);
  const items = row.items
    .filter((item) => !retestItemIds.has(item.id))
    .filter((item) => configuredCount <= 0 || Number(item.sequence) <= configuredCount);
  return { id: row.id, course: row.branchCourse, academicTestCount: configuredCount || items.length, items, batches: row.batches.map(({ branchBatch }) => branchBatch).filter(Boolean), createdAt: row.createdAt, updatedAt: row.updatedAt };
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
  const existingBatchLinks = await prisma.academicTestBatch.findMany({
    where: {
      branchBatchId: { in: batches.map((batch) => batch.id) },
      academicTest: { branchCourseId: course.id },
    },
    select: { branchBatchId: true },
  });
  if (existingBatchLinks.length) {
    const existingBatchIds = new Set(existingBatchLinks.map((link) => link.branchBatchId));
    const duplicateBatches = batches.filter((batch) => existingBatchIds.has(batch.id));
    throw new AppError(`Academic Test configuration already exists for: ${duplicateBatches.map((batch) => batch.batchName || batch.batchId).join(", ")}. Edit the existing configuration instead of creating another one.`, 409);
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
  const existingBatchLinks = await prisma.academicTestBatch.findMany({
    where: {
      branchBatchId: { in: batches.map((batch) => batch.id) },
      academicTestId: { not: existing.id },
      academicTest: { branchCourseId: course.id },
    },
    select: { branchBatchId: true },
  });
  if (existingBatchLinks.length) {
    const existingBatchIds = new Set(existingBatchLinks.map((link) => link.branchBatchId));
    const duplicateBatches = batches.filter((batch) => existingBatchIds.has(batch.id));
    throw new AppError(`Academic Test configuration already exists for: ${duplicateBatches.map((batch) => batch.batchName || batch.batchId).join(", ")}. Edit that existing configuration instead.`, 409);
  }
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
    include: { branchCourse: { select: { id: true, name: true, courseCode: true, academicTestCount: true, modules: { where: { status: "ACTIVE" }, select: { id: true, submodules: { where: { status: "ACTIVE" }, select: { id: true } } } } } }, items: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, testType: true } }, batches: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true, facultyId: true, status: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const testItemIds = rows.flatMap((row) => row.items.map((item) => item.id));
  const batchIds = rows.flatMap((row) => row.batches.map(({ branchBatch }) => branchBatch?.id).filter(Boolean));
  const batchCodes = rows.flatMap((row) => row.batches.map(({ branchBatch }) => branchBatch?.batchId).filter(Boolean));
  const activeCycles = testItemIds.length && batchIds.length ? await prisma.academicTestCycle.findMany({ where: { academicTestItemId: { in: testItemIds }, branchBatchId: { in: batchIds }, status: "ACTIVE" }, orderBy: { cycleNumber: "desc" }, select: { id: true, academicTestItemId: true, branchBatchId: true } }) : [];
  const activeCycleIds = new Set(activeCycles.map((cycle) => cycle.id));
  const batchStudentKeys = [...new Set([...batchIds, ...batchCodes])];
  const [papers, projects, schedules, batchStudents, completedStudents, facultySummary, workEntries] = await Promise.all([
    activeCycleIds.size ? prisma.academicQuestionPaper.findMany({ where: { cycleId: { in: [...activeCycleIds] } }, select: { id: true, academicTestItemId: true, branchBatchId: true, cycleId: true, status: true } }) : [],
    activeCycleIds.size ? prisma.academicTestProject.findMany({ where: { cycleId: { in: [...activeCycleIds] } }, select: { id: true, academicTestItemId: true, branchBatchId: true, cycleId: true, status: true } }) : [],
    activeCycleIds.size ? prisma.academicScheduledTest.findMany({ where: { cycleId: { in: [...activeCycleIds] } }, select: { id: true, academicTestItemId: true, branchBatchId: true, cycleId: true, testNumber: true, testDate: true, startTime: true, endTime: true, status: true } }) : [],
    batchCodes.length ? prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: { in: batchStudentKeys } }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: batchStudentKeys } } } }] }, select: { id: true, batchId: true, courseId: true, courseProgress: true, courseEnrollments: { where: { status: "ACTIVE", batchId: { in: batchStudentKeys } }, select: { courseId: true, batchId: true, courseProgress: true, courseCompletedAt: true } } } }) : [],
    batchCodes.length ? prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, courseEnrollments: { some: { status: "ACTIVE", batchId: { in: batchStudentKeys }, courseCompletedAt: { not: null } } } }, select: { courseEnrollments: { where: { status: "ACTIVE", batchId: { in: batchStudentKeys }, courseCompletedAt: { not: null } }, select: { batchId: true } } } }) : [],
    getFacultyMyBatchesSummary(actor),
    batchIds.length ? prisma.facultyTodayWorkEntry.findMany({ where: { courseId: { in: [...new Set(rows.map((row) => row.branchCourse.id).filter(Boolean))] }, batchId: { in: [...new Set([...batchIds, ...batchCodes])] } }, select: { courseId: true, batchId: true, moduleId: true, studentEntries: { where: { completionStatus: "COMPLETED" }, select: { branchStudentId: true, submoduleId: true } } } }) : [],
  ]);
  const [reportSchedules, sentReportShares] = await Promise.all([
    batchIds.length ? prisma.academicScheduledTest.findMany({ where: { branchBatchId: { in: batchIds }, isRetest: false, status: { not: "CANCELLED" } }, select: { id: true, branchBatchId: true } }) : [],
    batchIds.length ? prisma.facultyReportShare.findMany({ where: { batchId: { in: batchIds }, reportType: "ACADEMIC_TEST", status: "SENT" }, select: { batchId: true, academicTestIds: true } }) : [],
  ]);
  const sentReportIdsByBatch = new Map();
  sentReportShares.forEach((share) => {
    const key = text(share.batchId).toLowerCase();
    if (!key) return;
    const ids = sentReportIdsByBatch.get(key) || new Set();
    (Array.isArray(share.academicTestIds) ? share.academicTestIds : []).filter(Boolean).forEach((id) => ids.add(id));
    sentReportIdsByBatch.set(key, ids);
  });
  const fullyReportedBatchKeys = new Set();
  const scheduleIdsByBatch = new Map();
  reportSchedules.forEach((schedule) => {
    const key = text(schedule.branchBatchId).toLowerCase();
    if (!key) return;
    if (!scheduleIdsByBatch.has(key)) scheduleIdsByBatch.set(key, []);
    scheduleIdsByBatch.get(key).push(schedule.id);
  });
  scheduleIdsByBatch.forEach((requiredIds, key) => {
    const sentIds = sentReportIdsByBatch.get(key) || new Set();
    if (requiredIds.length > 0 && requiredIds.every((id) => sentIds.has(id))) fullyReportedBatchKeys.add(key);
  });
  rows.flatMap((row) => row.batches.map(({ branchBatch }) => branchBatch).filter(Boolean)).forEach((branchBatch) => {
    const internalKey = text(branchBatch.id).toLowerCase();
    const publicKey = text(branchBatch.batchId).toLowerCase();
    if (fullyReportedBatchKeys.has(internalKey)) fullyReportedBatchKeys.add(publicKey);
  });
  const incompleteAcademicBatchIds = new Set(schedules.filter((schedule) => schedule.status !== "COMPLETED").map((schedule) => text(schedule.branchBatchId)).filter(Boolean));
  const incompleteAcademicBatchKeys = new Set(rows.flatMap((row) => row.batches.map(({ branchBatch }) => incompleteAcademicBatchIds.has(branchBatch?.id) ? [branchBatch.id, branchBatch.batchId] : []).flat()).map((key) => text(key).toLowerCase()).filter(Boolean));
  const completedBatchKeys = new Set(completedStudents.flatMap((student) => (student.courseEnrollments || []).map((enrollment) => text(enrollment.batchId).toLowerCase()).filter((key) => fullyReportedBatchKeys.has(key) && !incompleteAcademicBatchKeys.has(key))));
  const progressByBatch = new Map((facultySummary?.batchCounts || []).map((entry) => [text(entry?.batchId || entry?.id).toLowerCase(), Number(entry?.courseProgress) || 0]));
  const paperByKey = new Map(papers.map((paper) => [`${paper.academicTestItemId}:${paper.branchBatchId}`, paper]));
  const projectByKey = new Map(projects.map((project) => [`${project.academicTestItemId}:${project.branchBatchId}`, project]));
  const schedulesByKey = new Map(schedules.map((schedule) => [`${schedule.academicTestItemId}:${schedule.branchBatchId}`, schedule]));
  const studentIdsByBatch = new Map();
  batchStudents.forEach((student) => {
    const studentBatchIds = [student.batchId, ...(student.courseEnrollments || []).map((enrollment) => enrollment.batchId)];
    studentBatchIds.filter(Boolean).forEach((studentBatchId) => {
      const key = text(studentBatchId).toLowerCase();
      const enrollment = (student.courseEnrollments || []).find((entry) => text(entry.batchId).toLowerCase() === key);
      const progress = enrollment?.courseProgress ?? (student.batchId && text(student.batchId).toLowerCase() === key ? student.courseProgress : null);
      if (!studentIdsByBatch.has(studentBatchId)) studentIdsByBatch.set(studentBatchId, new Set());
      studentIdsByBatch.get(studentBatchId).add(student.id);
    });
  });
  const progressByStudentBatch = new Map();
  rows.forEach((row) => {
    const totalSubmodules = row.branchCourse.modules.reduce((total, module) => total + module.submodules.length, 0);
    if (!totalSubmodules) return;
    const studentIds = new Set(batchStudents.map((student) => student.id));
    const completedByStudent = new Map();
    workEntries.filter((entry) => entry.courseId === row.branchCourse.id).forEach((entry) => {
      (entry.studentEntries || []).forEach((studentEntry) => {
        if (!studentIds.has(studentEntry.branchStudentId)) return;
        const key = `${entry.batchId}:${studentEntry.branchStudentId}`;
        if (!completedByStudent.has(key)) completedByStudent.set(key, new Set());
        completedByStudent.get(key).add(studentEntry.submoduleId);
      });
    });
    completedByStudent.forEach((completed, key) => progressByStudentBatch.set(key, Math.min(100, (completed.size / totalSubmodules) * 100)));
  });
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
      const project = nextItem && projectByKey.get(`${nextItem.id}:${branchBatch.id}`);
      const needsPaper = nextItem?.testType === "TEST" || nextItem?.testType === "TEST_AND_PROJECT";
      const needsProject = nextItem?.testType === "PROJECT" || nextItem?.testType === "TEST_AND_PROJECT";
      const studentCount = new Set([...(studentIdsByBatch.get(branchBatch.id) || []), ...(studentIdsByBatch.get(branchBatch.batchId) || [])]).size;
      const previousCompleted = !previous || (previousSchedule && (previousSchedule.status === "COMPLETED" || scheduleInstant(previousSchedule.testDate, previousSchedule.endTime) < Date.now()));
      const batchStudentIds = new Set([...(studentIdsByBatch.get(branchBatch.id) || []), ...(studentIdsByBatch.get(branchBatch.batchId) || [])]);
      const calculatedProgress = [...batchStudentIds].map((studentId) => {
        const student = batchStudents.find((item) => item.id === studentId);
        const enrollment = (student?.courseEnrollments || []).find((item) => item.courseId === row.branchCourse.id && [branchBatch.id, branchBatch.batchId].includes(item.batchId));
        const storedProgress = enrollment?.courseProgress ?? (student?.courseId === row.branchCourse.id ? student.courseProgress : null);
        return progressByStudentBatch.get(`${branchBatch.id}:${studentId}`)
          ?? progressByStudentBatch.get(`${branchBatch.batchId}:${studentId}`)
          ?? (Number.isFinite(Number(storedProgress)) ? Number(storedProgress) : null);
      }).filter(Number.isFinite);
      const currentCourseProgress = calculatedProgress.length ? Math.round(calculatedProgress.reduce((total, value) => total + value, 0) / calculatedProgress.length) : studentCount > 0 ? Math.max(0, Math.min(100, progressByBatch.get(text(branchBatch.batchId || branchBatch.id).toLowerCase()) || 0)) : 0;
      const requiredProgress = nextItem ? courseProgressThreshold(nextItem.sequence, row.branchCourse.academicTestCount || row.items.length) : null;
      const eligible = Boolean(nextItem && currentCourseProgress >= requiredProgress);
      const paperReady = !needsPaper || paper?.status === "PREPARED";
      const projectReady = !needsProject || project?.status === "PREPARED";
      const available = Boolean(nextItem && studentCount > 0 && previousCompleted && paperReady && projectReady && eligible);
      const blocker = nextItem && studentCount === 0
        ? `No active students are assigned to ${branchBatch.batchName || branchBatch.batchId}. Select the batch that contains the students.`
        : nextItem && !eligible
          ? `Test ${nextItem.sequence} can be created only after the batch reaches ${requiredProgress}% course progress.`
          : nextItem && !previousCompleted
            ? `Test ${previous.sequence} must be completed before creating Test ${nextItem.sequence}.`
            : nextItem && !paperReady
              ? `Question paper has not been prepared for ${branchBatch.batchName || branchBatch.batchId}. Please prepare the question paper before creating Test ${nextItem.sequence}.`
              : nextItem && !projectReady
                ? `Project has not been prepared for ${branchBatch.batchName || branchBatch.batchId}. Please prepare the project before creating Test ${nextItem.sequence}.`
                : null;
      const reportSent = [branchBatch.id, branchBatch.batchId].some((key) => fullyReportedBatchKeys.has(text(key).toLowerCase()));
      const hasCompletedStudents = reportSent && [branchBatch.id, branchBatch.batchId].some((key) => completedBatchKeys.has(text(key).toLowerCase()));
      return { ...branchBatch, testType: nextItem?.testType || null, studentCount, hasCompletedStudents, reportSent, nextTestNumber: nextItem?.sequence || null, academicTestItemId: nextItem?.id || null, questionPaperId: paper?.id || null, questionPaperStatus: paper?.status || (needsPaper ? "NOT_PREPARED" : null), projectId: project?.id || null, projectStatus: project?.status || (needsProject ? "NOT_PREPARED" : null), currentCourseProgress, requiredProgress, eligible, available, blocker, schedules: batchSchedules };
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
  // Use the same Today Work based progress calculation shown in the faculty UI.
  // The summary endpoint can lag behind after a work entry is completed.
  const createOptions = await getFacultyCreateOptions(actor);
  const optionBatch = createOptions.courses
    .filter((course) => course.id === item.academicTest.branchCourseId)
    .flatMap((course) => course.batches)
    .find((batch) => batch.id === batchId || batch.batchId === selectedBatch?.batchId);
  const currentCourseProgress = Math.max(0, Math.min(100, Number(optionBatch?.currentCourseProgress ?? progressEntry?.courseProgress) || 0));
  const requiredProgress = courseProgressThreshold(item.sequence, item.academicTest.branchCourse.academicTestCount || item.sequence);
  if (currentCourseProgress < requiredProgress) throw new AppError(`Test ${item.sequence} can be created only after the batch reaches ${requiredProgress}% course progress.`, 422);
  const needsTest = item.testType === "TEST" || item.testType === "TEST_AND_PROJECT";
  const needsProject = item.testType === "PROJECT" || item.testType === "TEST_AND_PROJECT";
  const cycle = await prisma.academicTestCycle.findFirst({ where: { academicTestItemId: item.id, branchBatchId: batchId, status: "ACTIVE" }, orderBy: { cycleNumber: "desc" } });
  if (!cycle) throw new AppError("No active Academic Test cycle exists. Start a new question paper cycle first.", 409);
  const [paper, project] = await Promise.all([
    needsTest ? prisma.academicQuestionPaper.findFirst({ where: { academicTestItemId: item.id, branchBatchId: batchId, cycleId: cycle.id }, select: { id: true, status: true } }) : null,
    needsProject ? prisma.academicTestProject.findFirst({ where: { academicTestItemId: item.id, branchBatchId: batchId, cycleId: cycle.id }, select: { id: true, status: true } }) : null,
  ]);
  if (needsTest && (!paper || paper.status !== "PREPARED")) throw new AppError(`Question Paper Not Prepared. The question paper for the selected batch has not been prepared yet. Please prepare and publish the question paper before creating Test ${item.sequence}.`, 422);
  if (needsProject && (!project || project.status !== "PREPARED")) throw new AppError(`Project Not Prepared. The project for the selected batch has not been prepared yet. Please prepare and publish the project before creating Test ${item.sequence}.`, 422);
  const existing = await prisma.academicScheduledTest.findFirst({ where: { academicTestItemId: item.id, branchBatchId: batchId, cycleId: cycle.id }, select: { id: true, status: true } });
  if (existing && existing.status !== "CANCELLED") throw new AppError(`Test ${item.sequence} has already been created for this batch.`, 409);
  const previous = item.sequence > 1 ? await prisma.academicTestItem.findFirst({ where: { academicTestId: item.academicTestId, sequence: item.sequence - 1 }, select: { id: true, sequence: true } }) : null;
  if (previous) {
    // Previous tests may belong to their own item cycle. Do not require the
    // next test's cycle id when checking whether the previous test window has
    // ended; otherwise a completed/ended Test 1 is treated as missing.
    const previousSchedule = await prisma.academicScheduledTest.findFirst({ where: { academicTestItemId: previous.id, branchBatchId: batchId, isRetest: false, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, select: { status: true, testDate: true, endTime: true } });
    // Once the previous test window has ended, the next test can be created
    // even when some students did not attend. Attendance/result completion is
    // still reflected in reports, but must not block the next scheduled test.
    const previousCompleted = previousSchedule && (previousSchedule.status === "COMPLETED" || scheduleInstant(previousSchedule.testDate, previousSchedule.endTime) < Date.now());
    if (!previousCompleted) throw new AppError(`Test ${previous.sequence} must be completed before creating Test ${item.sequence}.`, 422);
  }
  const date = needsTest ? scheduleDate(payload.testDate) : null;
  if (date && date < new Date().toISOString().slice(0, 10)) throw new AppError("Past test dates are not allowed.", 422);
  const startTime = needsTest ? scheduleTime(payload.startTime, "Start time") : null;
  const endTime = needsTest ? scheduleTime(payload.endTime, "End time") : null;
  if (needsTest && endTime <= startTime) throw new AppError("End time must be after start time.", 422);
  const scheduleData = { academicTestItemId: item.id, branchCourseId: item.academicTest.branchCourseId, branchBatchId: batchId, cycleId: cycle.id, facultyId: actor.id, questionPaperId: paper?.id || null, testNumber: item.sequence, testDate: date, startTime, endTime, projectStartDate: needsProject ? scheduleDate(payload.projectStartDate) : null, projectEndDate: needsProject ? scheduleDate(payload.projectEndDate) : null, status: "SCHEDULED", createdBy: actor.id };
  const created = existing?.status === "CANCELLED"
    ? await prisma.academicScheduledTest.update({ where: { id: existing.id }, data: scheduleData })
    : await prisma.academicScheduledTest.create({ data: scheduleData });
  const [batch, course, students] = await Promise.all([
    prisma.branchBatch.findUnique({ where: { id: batchId }, select: { batchId: true, batchName: true } }),
    prisma.branchCourse.findUnique({ where: { id: item.academicTest.branchCourseId }, select: { name: true, courseCode: true } }),
    prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: { in: [batchId, selectedBatch?.batchId].filter(Boolean) } }, { courseEnrollments: { some: { status: "ACTIVE", courseId: item.academicTest.branchCourseId, batchId: { in: [batchId, selectedBatch?.batchId].filter(Boolean) } } } }] }, select: { id: true, studentId: true, emailAddress: true } }),
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
    : await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: schedule.branchBatchId }, { batchId: batch?.batchId || "__missing__" }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [schedule.branchBatchId, batch?.batchId || "__missing__"] } } } }] }, select: { id: true, studentId: true, emailAddress: true } });
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
  const student = await prisma.branchStudent.findFirst({ where: { emailAddress: { equals: email, mode: "insensitive" }, recordStatus: "ACTIVE" }, include: { courseEnrollments: { where: { status: "ACTIVE" }, select: { courseId: true, batchId: true } } } });
  if (!student) throw new AppError("Student profile not found.", 403);
  return student;
}

async function studentAcademicBatches(student, courseId = "") {
  const enrollments = (student.courseEnrollments || []).filter((item) => !courseId || item.courseId === courseId);
  if (student.courseEnrollments?.length) {
    if (!enrollments.length) return [];
    return prisma.branchBatch.findMany({ where: { branchId: student.branchId, OR: enrollments.map((item) => ({ branchCourseId: item.courseId, ...(item.batchId ? { OR: [{ id: item.batchId }, { batchId: item.batchId }] } : {}) })) }, select: { id: true, batchId: true, branchCourseId: true } });
  }
  if (courseId && courseId !== student.courseId) return [];
  return prisma.branchBatch.findMany({ where: { OR: [{ id: student.batchId }, { batchId: student.batchId }] }, select: { id: true, batchId: true, branchCourseId: true } });
}

async function academicScheduleForStudent(actor, id) {
  const student = await studentFor(actor);
  const batches = await studentAcademicBatches(student);
  const batchIds = batches.map((batch) => batch.id);
  const schedule = await prisma.academicScheduledTest.findFirst({ where: { id: text(id), OR: [{ branchBatchId: { in: batchIds }, isRetest: false }, { isRetest: true, retestStudentId: student.id, branchCourseId: { in: batches.map((batch) => batch.branchCourseId) } }] } });
  if (!schedule) throw new AppError("Academic Test not found or not assigned to your batch.", 404);
  return { student, schedule, batch: batches.find((item) => item.id === schedule.branchBatchId) || null };
}

async function academicPublicSchedule(schedule, includeQuestions = false) {
  const item = await prisma.academicTestItem.findUnique({ where: { id: schedule.academicTestItemId }, include: { academicTest: { include: { branchCourse: { select: { id: true, name: true, courseCode: true } } } }, projects: { select: { branchBatchId: true, projectTitle: true, projectDescription: true, projectRequirements: true, projectMarks: true, status: true } } } });
  const paper = schedule.questionPaperId
    ? await prisma.academicQuestionPaper.findUnique({ where: { id: schedule.questionPaperId }, include: { questions: { orderBy: { questionNumber: "asc" } } } })
    : null;
  const project = item?.projects?.find((entry) => entry.branchBatchId === schedule.branchBatchId) || item?.projects?.[0];
  const questions = paper?.questions || [];
  const projectMarks = Number(project?.projectMarks || 0);
  return { ...schedule, testType: item?.testType || "TEST", projectTitle: project?.projectTitle || "", projectDescription: project?.projectDescription || "", projectRequirements: project?.projectRequirements || "", projectMarks, project: project ? { title: project.projectTitle || "Project", projectMarks, status: project.status || "NOT_PREPARED" } : null, projectStatus: project?.status || "NOT_PREPARED", status: academicScheduleStatus(schedule), testName: schedule.isRetest ? `Test ${schedule.testNumber} - Retest` : `Test ${schedule.testNumber}`, course: item?.academicTest?.branchCourse, totalQuestions: paper?.totalQuestions || 0, totalMarks: paper?.totalMarks || 0, passMark: paper?.passMark || 0, marksPerQuestion: paper?.marksPerQuestion || 0, hasAssessment: questions.some((question) => question.questionType === "ASSESSMENT"), questions: includeQuestions ? questions.map(({ correctAnswer, ...question }) => question) : undefined };
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

export async function listStudentAcademicTests(actor, courseId = "") {
  const student = await studentFor(actor);
  const batches = await studentAcademicBatches(student, courseId);
  const batchIds = batches.map((batch) => batch.id);
  const schedules = await prisma.academicScheduledTest.findMany({ where: { OR: [{ branchBatchId: { in: batchIds }, isRetest: false }, { isRetest: true, retestStudentId: student.id, ...(courseId ? { branchCourseId: courseId } : { branchCourseId: { in: batches.map((batch) => batch.branchCourseId) } }) }] }, orderBy: [{ testDate: "asc" }, { startTime: "asc" }] });
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
  const batch = await prisma.branchBatch.findUnique({ where: { id: schedule.branchBatchId }, select: { batchId: true } });
  const student = await prisma.branchStudent.findFirst({ where: { id: text(studentId), recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: schedule.branchBatchId }, { batchId: batch?.batchId || "__missing__" }, { courseEnrollments: { some: { status: "ACTIVE", courseId: schedule.branchCourseId, batchId: { in: [schedule.branchBatchId, batch?.batchId || "__missing__"] } } } }] } });
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
  const [students, submissions, projectSubmissions, info] = await Promise.all([prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: schedule.branchBatchId }, { batchId: batch?.batchId || "__missing__" }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [schedule.branchBatchId, batch?.batchId || "__missing__"] } } } }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true }, orderBy: { studentName: "asc" } }), prisma.academicTestSubmission.findMany({ where: { academicTestId: schedule.id } }), prisma.academicProjectSubmission.findMany({ where: { academicTestId: schedule.id } }), academicPublicSchedule(schedule)]);
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
  const student = await prisma.branchStudent.findFirst({ where: { id: text(studentId), recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: schedule.branchBatchId }, { batchId: batch?.batchId || "__missing__" }, { courseEnrollments: { some: { status: "ACTIVE", courseId: schedule.branchCourseId, batchId: { in: [schedule.branchBatchId, batch?.batchId || "__missing__"] } } } }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true } });
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
  const original = await prisma.academicScheduledTest.findFirst({ where: { id: text(id), facultyId: { in: ids } }, include: { cycle: { select: { batchCycleId: true } } } });
  if (!original) throw new AppError("Academic Test schedule not found.", 404);
  if (original.status === "CANCELLED" || scheduleInstant(original.testDate, original.endTime) > Date.now()) throw new AppError("Retest can be scheduled only after the original test has ended.", 409);

  const studentId = text(payload.studentId);
  const batch = await prisma.branchBatch.findUnique({ where: { id: original.branchBatchId }, select: { id: true, batchId: true } });
  const student = await prisma.branchStudent.findFirst({ where: { id: studentId, recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: original.branchBatchId }, { batchId: batch?.batchId || "__missing__" }, { courseEnrollments: { some: { status: "ACTIVE", courseId: original.branchCourseId, batchId: { in: [original.branchBatchId, batch?.batchId || "__missing__"] } } } }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true } });
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
    const retestCycle = await tx.academicTestCycle.create({ data: { academicTestItemId: retestItem.id, branchBatchId: original.branchBatchId, cycleNumber: 1, batchCycleId: original.cycle.batchCycleId, createdBy: actor.id } });
    const retestPaper = await tx.academicQuestionPaper.create({ data: { academicTestItemId: retestItem.id, branchCourseId: original.branchCourseId, branchBatchId: original.branchBatchId, cycleId: retestCycle.id, createdBy: actor.id, status: sourcePaper.status, marksPerQuestion: sourcePaper.marksPerQuestion, totalQuestions: sourcePaper.totalQuestions, totalMarks: sourcePaper.totalMarks, passMark: sourcePaper.passMark } });
    if (sourcePaper.questions.length) await tx.academicQuestion.createMany({ data: sourcePaper.questions.map((question) => ({ questionPaperId: retestPaper.id, questionNumber: question.questionNumber, questionType: question.questionType, questionText: question.questionText, optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD, correctAnswer: question.correctAnswer, marks: question.marks })) });
    return tx.academicScheduledTest.create({ data: { academicTestItemId: retestItem.id, branchCourseId: original.branchCourseId, branchBatchId: original.branchBatchId, cycleId: retestCycle.id, facultyId: original.facultyId, questionPaperId: retestPaper.id, testNumber: original.testNumber, testDate: date, startTime, endTime, status: "SCHEDULED", isRetest: true, originalScheduleId: original.originalScheduleId || original.id, parentScheduleId: original.id, attemptNumber: (original.attemptNumber || 1) + 1, retestStudentId: student.id, createdBy: actor.id } });
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

async function reportConfiguredItems(batch, scheduledItemIds = null) {
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
      if (!scheduledItemIds?.has(item.id) && configuredCount > 0 && Number(item.sequence || 0) > configuredCount) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      configured.push({ item, academicTest: link.academicTest });
    }
  }
  return configured.sort((a, b) => a.item.sequence - b.item.sequence);
}

async function reportItemsForSchedules(batch, schedules = []) {
  const scheduledItemIds = [...new Set(schedules.map((schedule) => schedule.academicTestItemId).filter(Boolean))];
  const configured = await reportConfiguredItems(batch, new Set(scheduledItemIds));
  const knownIds = new Set(configured.map(({ item }) => item.id));
  const missingIds = scheduledItemIds.filter((id) => !knownIds.has(id));
  if (!missingIds.length) return configured;
  const missingItems = await prisma.academicTestItem.findMany({ where: { id: { in: missingIds } }, orderBy: { sequence: "asc" }, select: { id: true, sequence: true, testType: true } });
  return [...configured, ...missingItems.map((item) => ({ item, academicTest: null }))].sort((a, b) => Number(a.item.sequence || 0) - Number(b.item.sequence || 0));
}

async function reportConfiguredTests(batch) {
  return (await reportConfiguredItems(batch)).filter(({ item }) => ["TEST", "TEST_AND_PROJECT"].includes(item.testType));
}

function reportScheduleHasEnded(schedule) {
  return schedule?.status === "COMPLETED" || academicAttemptExpired(schedule);
}

function reportSubmissionIsFinal(submission, hasAssessment) {
  const status = text(submission?.status || "").toUpperCase();
  if (status === "EVALUATED") return true;
  return status === "SUBMITTED" && !hasAssessment;
}

function reportProjectSubmissionIsFinal(submission) {
  return ["SUBMITTED", "EVALUATED", "GRADED"].includes(text(submission?.status || "").toUpperCase());
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

async function buildAcademicReport(actor, batch, requestedStudentIds = null, selectedScheduleIds = null, includeIncomplete = false, excludeCompletedStudents = false, exactSelectedSchedules = false) {
  let schedules = await prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id }, orderBy: [{ testNumber: "asc" }, { attemptNumber: "asc" }, { createdAt: "asc" }] });
  if (Array.isArray(selectedScheduleIds) && selectedScheduleIds.length) {
    const selected = new Set(selectedScheduleIds.map(text));
    const selectedNumbers = exactSelectedSchedules
      ? new Set()
      : new Set(schedules.filter((schedule) => !schedule.isRetest && selected.has(schedule.id)).map((schedule) => schedule.testNumber));
    schedules = schedules.filter((schedule) => selected.has(schedule.id) || selectedNumbers.has(schedule.testNumber));
  }
  const retestItemIds = new Set(schedules.filter((schedule) => schedule.isRetest && schedule.status !== "CANCELLED").map((schedule) => schedule.academicTestItemId));
  const originalItemIds = new Set(schedules.filter((schedule) => !schedule.isRetest && schedule.status !== "CANCELLED").map((schedule) => schedule.academicTestItemId));
  const cycleIds = [...new Set(schedules.filter((schedule) => !schedule.isRetest && schedule.status !== "CANCELLED").map((schedule) => schedule.cycleId).filter(Boolean))];
  // A retest points to the same configured test item. Keep that original item
  // in the report; the retest is only the latest attempt for that item and
  // must contribute its final marks to the send-time snapshot.
  const configuredItems = (await reportItemsForSchedules(batch, schedules.filter((schedule) => !schedule.isRetest && schedule.status !== "CANCELLED"))).filter(({ item }) => (!originalItemIds.size || originalItemIds.has(item.id)));
  let configured = configuredItems.filter(({ item }) => ["TEST", "TEST_AND_PROJECT"].includes(item.testType));
  const projectItems = configuredItems.filter(({ item }) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType));
  const cycleEnrollmentFilter = cycleIds.length
    ? { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] }, batchCycleId: { in: cycleIds } }
    : { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } };
  const allStudents = await prisma.branchStudent.findMany({
    // Keep the current batch relationship as a valid source even when the
    // schedules have a cycleId. Some existing enrollments are linked to the
    // batch directly and do not carry the cycle id, which otherwise makes the
    // report detail page show the batch with zero students.
    where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: batch.id }, { batchId: batch.batchId }, { courseEnrollments: { some: cycleEnrollmentFilter } }], ...(requestedStudentIds ? { id: { in: requestedStudentIds } } : {}) },
    orderBy: { studentName: "asc" },
    select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchId: true, courseId: true, courseProgress: true, courseEnrollments: { where: cycleEnrollmentFilter, select: { batchId: true, batchCycleId: true, courseId: true, courseProgress: true, courseCompletedAt: true } } },
  });
  const completedStudentIds = new Set((await Promise.all(allStudents.map(async (student) => {
    const enrollment = student.courseEnrollments?.[0];
    const courseProgress = Number(enrollment?.courseProgress ?? student.courseProgress ?? 0);
    const academicProgress = await getAcademicTestProgressForStudent({ ...student, batchId: enrollment?.batchId || student.batchId, courseId: enrollment?.courseId || student.courseId || batch.branchCourseId, courseProgress });
    const isCourseCompleted = courseProgress >= 100
      && Number(academicProgress.totalTests || 0) + Number(academicProgress.totalProjects || 0) > 0
      && academicProgress.academicComplete === true
      && Number(academicProgress.pendingTests || 0) === 0
      && Number(academicProgress.pendingProjects || 0) === 0;
    return isCourseCompleted ? student.id : null;
  }))).filter(Boolean));
  const students = excludeCompletedStudents ? allStudents.filter((student) => !completedStudentIds.has(student.id)) : allStudents;
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
    const paper = original ? paperById.get(original.questionPaperId) : await prisma.academicQuestionPaper.findFirst({ where: { academicTestItemId: item.id, branchBatchId: batch.id, cycleId: { in: schedules.map((schedule) => schedule.cycleId).filter(Boolean) } }, orderBy: { createdAt: "desc" }, select: { totalQuestions: true, totalMarks: true, passMark: true } });
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
      // Overall percentage is based on every configured test. A student who
      // did not attend a test contributes zero marks, but that test still
      // remains part of the denominator.
      testMaximum += Number(final.totalMarks || test.totalMarks || 0);
      if (["SUBMITTED", "EVALUATED"].includes(final.status)) testObtained += Number(final.marksObtained || 0);
      return { ...test, final, originalFinal, retestAttempts, attempts: attemptRows };
    });
    const projects = await Promise.all(projectItems.map(async ({ item: projectItem }) => {
      const projectSchedule = schedules.find((schedule) => !schedule.isRetest && schedule.academicTestItemId === projectItem.id);
      const projectSubmission = projectSchedule ? projectByKey.get(`${projectSchedule.id}:${student.id}`) : null;
      const projectConfig = await prisma.academicTestProject.findFirst({ where: { academicTestItemId: projectItem.id, branchBatchId: batch.id, cycleId: { in: schedules.map((schedule) => schedule.cycleId).filter(Boolean) } }, orderBy: { createdAt: "desc" }, select: { projectTitle: true, projectMarks: true } }).catch(() => null);
      const projectTotal = Number(projectConfig?.projectMarks || 0);
      const projectMarks = projectSubmission?.marksAwarded == null ? null : Number(projectSubmission.marksAwarded);
      return { testNumber: projectItem.sequence, title: projectConfig?.projectTitle || "Project", totalMarks: projectTotal, marksAwarded: projectMarks, percentage: projectMarks != null && projectTotal > 0 ? Number(((projectMarks / projectTotal) * 100).toFixed(2)) : null, result: projectMarks != null && projectTotal > 0 ? (projectMarks >= projectTotal * 0.5 ? "PASS" : "FAIL") : null, status: projectSubmission?.status || "NOT_SUBMITTED" };
    }));
    const project = projects[0] || null;
    const projectMarks = project?.marksAwarded;
    const projectMaximum = projects.reduce((total, item) => total + Number(item.totalMarks || 0), 0);
    const projectObtained = projects.reduce((total, item) => total + Number(item.marksAwarded || 0), 0);
    return {
      student,
      tests,
      project,
      projects,
      overallTestPercentage: testMaximum > 0 ? Number(((testObtained / testMaximum) * 100).toFixed(2)) : null,
      overallProjectPercentage: projectMaximum > 0 ? Number(((projectObtained / projectMaximum) * 100).toFixed(2)) : null,
    };
  }));
  return { batch: { id: batch.id, batchId: batch.batchId, batchName: batch.batchName, batchTiming: batch.batchTiming }, course: { id: batch.courseId, name: batch.courseName, courseCode: batch.branchCourseId }, totalTests: testRows.length, hasProject: projectItems.length > 0, projectTestNumber: projectItems[0]?.item.sequence || null, projectItems: projectItems.map(({ item }) => ({ testNumber: item.sequence })), tests: testRows, retestColumns, students: reportStudents };
}

// Student 360 uses the same report definition as the branch report screen.
// A configured item is one test cycle; retest schedules are only attempts for
// that cycle and must never increase the total count.
export async function getAcademicTestProgressForStudent(student) {
  const empty = { totalTests: 0, completedTests: 0, pendingTests: 0, percentage: 0, totalProjects: 0, completedProjects: 0, pendingProjects: 0, projectPercentage: 0, projectsComplete: true, academicComplete: false };
  if (!student?.branchId || !student?.batchId || !student?.courseId) return empty;

  const batch = await prisma.branchBatch.findFirst({
    where: { branchId: student.branchId, OR: [{ id: student.batchId }, { batchId: student.batchId }], status: "ACTIVE" },
    select: { id: true, batchId: true, branchCourseId: true },
  });
  if (!batch) return empty;
  const courseId = student.courseId || batch.branchCourseId;
  if (!courseId || (batch.branchCourseId && batch.branchCourseId !== courseId)) return empty;
  // Existing enrollments may belong to a completed cycle while the batch has
  // already opened a newer active cycle. Use the enrollment cycle when given.
  const requestedBatchCycleId = student.batchCycleId || student.enrollmentBatchCycleId || null;
  const batchCycle = requestedBatchCycleId
    ? await prisma.batchCycle.findFirst({ where: { id: requestedBatchCycleId, batchId: batch.id }, select: { id: true } })
    : await prisma.batchCycle.findFirst({ where: { batchId: batch.id, status: "ACTIVE" }, orderBy: { cycleNumber: "desc" }, select: { id: true } });
  const cycleScope = batchCycle ? { cycle: { batchCycleId: batchCycle.id } } : {};

  const configuredRows = await prisma.academicTest.findMany({
    where: { branchCourseId: courseId, batches: { some: { branchBatchId: batch.id } } },
    select: {
      branchCourse: { select: { academicTestCount: true } },
      items: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, testType: true } },
    },
  });
  const retestSchedules = await prisma.academicScheduledTest.findMany({
    where: { branchBatchId: batch.id, ...cycleScope, isRetest: true, status: { not: "CANCELLED" } },
    select: { id: true, academicTestItemId: true, testNumber: true, status: true, isRetest: true, retestStudentId: true, originalScheduleId: true, parentScheduleId: true, questionPaperId: true, testDate: true, endTime: true, attemptNumber: true },
  });
  const retestItemIds = new Set(retestSchedules.map((schedule) => schedule.academicTestItemId));
  const configuredItems = configuredRows
    .flatMap((row) => {
      const configuredCount = Number(row.branchCourse?.academicTestCount || 0);
      return row.items.filter((item) => !configuredCount || Number(item.sequence) <= configuredCount);
    })
    .filter((item) => !retestItemIds.has(item.id) && ["TEST", "PROJECT", "TEST_AND_PROJECT"].includes(item.testType));
  if (!configuredItems.length) return empty;

  const itemIds = configuredItems.map((item) => item.id);
  const schedules = await prisma.academicScheduledTest.findMany({
    where: { branchBatchId: batch.id, academicTestItemId: { in: itemIds }, ...cycleScope, status: { not: "CANCELLED" } },
    orderBy: [{ testNumber: "asc" }, { attemptNumber: "asc" }, { createdAt: "asc" }],
    select: { id: true, academicTestItemId: true, testNumber: true, status: true, isRetest: true, retestStudentId: true, questionPaperId: true, testDate: true, endTime: true },
  });
  await syncExpiredAcademicAttempts(schedules, [student.id]);

  // Student lifecycle completion must use the actual batch evaluations. A
  // faculty report share is a delivery/audit action and must not hide a
  // completed test or project from the active-student progress count.
  const originalScheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const relevantRetests = retestSchedules.flatMap((schedule) => {
    let parentId = schedule.originalScheduleId || schedule.parentScheduleId;
    const visited = new Set();
    while (parentId && !originalScheduleById.has(parentId) && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = retestSchedules.find((entry) => entry.id === parentId);
      parentId = parent?.originalScheduleId || parent?.parentScheduleId || null;
    }
    const original = parentId ? originalScheduleById.get(parentId) : null;
    return original ? [{ ...schedule, academicTestItemId: original.academicTestItemId, testNumber: original.testNumber }] : [];
  });
  const relevantSchedules = [...schedules, ...relevantRetests];
  const [papers, submissions, projectSubmissions, projectConfigs] = await Promise.all([
    prisma.academicQuestionPaper.findMany({ where: { id: { in: relevantSchedules.map((schedule) => schedule.questionPaperId).filter(Boolean) } }, select: { id: true, questions: { select: { questionType: true } } } }),
    prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: relevantSchedules.map((schedule) => schedule.id) }, branchStudentId: student.id } }),
    prisma.academicProjectSubmission.findMany({ where: { academicTestId: { in: relevantSchedules.map((schedule) => schedule.id) }, branchStudentId: student.id }, select: { academicTestId: true, status: true, marksAwarded: true } }),
    prisma.academicTestProject.findMany({ where: { academicTestItemId: { in: itemIds }, branchBatchId: batch.id, ...cycleScope }, select: { academicTestItemId: true, projectMarks: true } }).catch(() => []),
  ]);
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  const submissionByScheduleId = new Map(submissions.map((submission) => [submission.academicTestId, submission]));
  const projectSubmissionByScheduleId = new Map(projectSubmissions.map((submission) => [submission.academicTestId, submission]));
  const projectConfigByItemId = new Map(projectConfigs.map((config) => [config.academicTestItemId, config]));
  const completedItemIds = new Set();
  const projectItemIds = new Set(configuredItems.filter((item) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)).map((item) => item.id));
  const completedProjectItemIds = new Set();
  const completedEvaluationItemIds = new Set();
  const academicResults = [];
  const schedulesByItem = new Map();
  relevantSchedules.forEach((schedule) => schedulesByItem.set(schedule.academicTestItemId, [...(schedulesByItem.get(schedule.academicTestItemId) || []), schedule]));
  schedulesByItem.forEach((attempts, itemId) => {
    const validAttempts = attempts.filter((schedule) => !schedule.retestStudentId || schedule.retestStudentId === student.id);
    const valid = validAttempts.some((schedule) => {
      if (!reportScheduleHasEnded(schedule)) return false;
      const submission = submissionByScheduleId.get(schedule.id);
      const status = text(submission?.status || "").toUpperCase();
      const hasAssessment = (paperById.get(schedule.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
      return reportSubmissionIsFinal(submission, hasAssessment) && (status === "EVALUATED" || (status === "SUBMITTED" && !hasAssessment)) && (String(submission?.resultStatus || "").toUpperCase() !== "FAIL" || schedule.isRetest);
    });
    const configuredItem = configuredItems.find((item) => item.id === itemId);
    const needsProject = configuredItem && ["PROJECT", "TEST_AND_PROJECT"].includes(configuredItem.testType);
    const projectComplete = needsProject && validAttempts.some((schedule) => {
      // A graded project is complete even when its schedule remains SCHEDULED.
      const project = projectSubmissionByScheduleId.get(schedule.id);
      // The report screen treats a project with awarded marks as complete;
      // keep student lifecycle progress consistent even if an older record
      // still carries a non-final submission status.
      return project?.marksAwarded != null;
    });
    if (projectComplete) completedProjectItemIds.add(itemId);
    if (valid && (!needsProject || projectComplete)) completedItemIds.add(itemId);
    if (
      (configuredItem?.testType === "PROJECT" && projectComplete) ||
      (configuredItem?.testType !== "PROJECT" && valid && (!needsProject || projectComplete))
    ) {
      completedEvaluationItemIds.add(itemId);
    }
  });

  configuredItems.forEach((item) => {
    const attempts = schedulesByItem.get(item.id) || [];
    const validAttempts = attempts.filter((schedule) => !schedule.retestStudentId || schedule.retestStudentId === student.id);
    const testSchedule = validAttempts.findLast((schedule) => {
      if (!reportScheduleHasEnded(schedule)) return false;
      const submission = submissionByScheduleId.get(schedule.id);
      const hasAssessment = (paperById.get(schedule.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
      const status = text(submission?.status || "").toUpperCase();
      return reportSubmissionIsFinal(submission, hasAssessment) && (status === "EVALUATED" || (status === "SUBMITTED" && !hasAssessment)) && (String(submission?.resultStatus || "").toUpperCase() !== "FAIL" || schedule.isRetest);
    });
    const submission = testSchedule ? submissionByScheduleId.get(testSchedule.id) : null;
    const projectSchedule = validAttempts.find((schedule) => !schedule.isRetest);
    const projectSubmission = projectSchedule ? projectSubmissionByScheduleId.get(projectSchedule.id) : null;
    const projectTotal = Number(projectConfigByItemId.get(item.id)?.projectMarks || 0);
    const hasTest = ["TEST", "TEST_AND_PROJECT"].includes(item.testType);
    const hasProject = ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType);
    const testObtained = hasTest && submission?.obtainedMarks != null ? Number(submission.obtainedMarks) : 0;
    const testTotal = hasTest && submission?.totalMarks != null ? Number(submission.totalMarks) : 0;
    const projectObtained = hasProject && projectSubmission?.marksAwarded != null ? Number(projectSubmission.marksAwarded) : 0;
    const totalMarks = testTotal + (hasProject ? projectTotal : 0);
    const obtainedMarks = testObtained + projectObtained;
    academicResults.push({
      testNumber: Number(item.sequence),
      testType: item.testType,
      obtainedMarks,
      totalMarks,
      percentage: totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : null,
      testMarks: hasTest && submission?.obtainedMarks != null ? Number(submission.obtainedMarks) : null,
      testTotalMarks: hasTest && submission?.totalMarks != null ? Number(submission.totalMarks) : null,
      testResult: hasTest ? submission?.resultStatus || null : null,
      projectMarks: hasProject && projectSubmission?.marksAwarded != null ? Number(projectSubmission.marksAwarded) : null,
      projectTotalMarks: hasProject ? projectTotal : null,
      projectResult: hasProject && projectSubmission?.marksAwarded != null && projectTotal > 0
        ? (Number(projectSubmission.marksAwarded) >= projectTotal * 0.5 ? "PASS" : "FAIL")
        : null,
    });
  });

  const totalTests = configuredItems.filter((item) => ["TEST", "TEST_AND_PROJECT"].includes(item.testType)).length;
  const completedTests = Math.min(totalTests, completedItemIds.size);
  const pendingTests = totalTests - completedTests;
  const totalProjects = projectItemIds.size;
  const completedProjects = Math.min(totalProjects, completedProjectItemIds.size);
  const pendingProjects = totalProjects - completedProjects;
  const projectPercentage = totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 100;
  const totalEvaluations = configuredItems.length;
  const completedEvaluations = Math.min(totalEvaluations, completedEvaluationItemIds.size);
  const pendingEvaluations = totalEvaluations - completedEvaluations;
  const marksTotal = academicResults.reduce((sum, result) => sum + Number(result.totalMarks || 0), 0);
  const marksObtained = academicResults.reduce((sum, result) => sum + Number(result.obtainedMarks || 0), 0);
  return { totalTests, completedTests, pendingTests, percentage: totalTests ? Math.round((completedTests / totalTests) * 100) : 100, totalProjects, completedProjects, pendingProjects, projectPercentage, totalEvaluations, completedEvaluations, pendingEvaluations, evaluationPercentage: totalEvaluations ? Math.round((completedEvaluations / totalEvaluations) * 100) : 0, projectsComplete: pendingProjects === 0, academicComplete: pendingEvaluations === 0 && totalEvaluations > 0, academicResults, marksObtained, marksTotal, marksPercentage: marksTotal > 0 ? Number(((marksObtained / marksTotal) * 100).toFixed(2)) : null };
}
export async function listAcademicReportBatches(actor) {
  const ids = facultyIds(actor);
  const batches = await prisma.branchBatch.findMany({ where: { facultyId: { in: ids }, status: "ACTIVE" }, orderBy: { batchName: "asc" }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } });
  const reportBatches = await Promise.all(batches.map(async (batch) => {
    const [schedules, students] = await Promise.all([
      prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, orderBy: [{ testNumber: "asc" }, { createdAt: "asc" }] }),
      prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: batch.id }, { batchId: batch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } } } }] }, select: { id: true, courseProgress: true, batchId: true, courseId: true, courseEnrollments: { where: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } }, select: { batchId: true, courseId: true, courseProgress: true } } } }),
    ]);
    const configuredItems = await reportItemsForSchedules(batch, schedules);
    if (!schedules.length || !students.length) return null;
    await syncExpiredAcademicAttempts(schedules, students.map((student) => student.id));
    const paperIds = schedules.map((schedule) => schedule.questionPaperId).filter(Boolean);
    const [papers, submissions, projectSubmissions] = await Promise.all([
      prisma.academicQuestionPaper.findMany({ where: { id: { in: paperIds } }, select: { id: true, questions: { select: { questionType: true } } } }),
      prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: schedules.map((schedule) => schedule.id) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, status: true } }),
      prisma.academicProjectSubmission.findMany({ where: { academicTestId: { in: schedules.map((schedule) => schedule.id) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, status: true, marksAwarded: true } }),
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
    const completedProjectItemIds = new Set();
    configuredItems.filter(({ item }) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)).forEach(({ item }) => {
      const projectSchedule = schedules.find((schedule) => !schedule.isRetest && schedule.academicTestItemId === item.id);
      const completedForAllStudents = Boolean(projectSchedule && students.every((student) => {
        const submission = projectSubmissions.find((entry) => entry.academicTestId === projectSchedule.id && entry.branchStudentId === student.id);
        return submission && submission.marksAwarded != null;
      }));
      if (completedForAllStudents) completedProjectItemIds.add(item.id);
    });
    const completedEvaluationCount = configuredItems.filter(({ item }) => {
      if (item.testType === "PROJECT") return completedProjectItemIds.has(item.id);
      const testCompleted = completedTestNumbers.has(Number(item.sequence));
      return item.testType === "TEST_AND_PROJECT"
        ? testCompleted && completedProjectItemIds.has(item.id)
        : testCompleted;
    }).length;
    const hasReportableEvaluation = configuredItems.some(({ item }) => {
      const schedule = schedules.find((entry) => Number(entry.testNumber) === Number(item.sequence) && !entry.isRetest);
      if (!schedule || !reportScheduleHasEnded(schedule)) return false;
      const hasAssessment = (paperById.get(schedule.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
      return students.some((student) => reportSubmissionIsFinal(submissionByKey.get(`${schedule.id}:${student.id}`), hasAssessment));
    });
    // Show a batch as soon as at least one configured evaluation is reportable.
    // A report may contain pending students; those students remain visible as
    // Not Attended/Pending in the sent snapshot. Retests do not increase the
    // configured evaluation count.
    const sentShares = await prisma.facultyReportShare.findMany({
      where: { batchId: batch.id, reportType: "ACADEMIC_TEST", status: "SENT" },
      select: { academicTestIds: true },
    });
    const sentReportIds = new Set(sentShares.flatMap((share) => Array.isArray(share.academicTestIds) ? share.academicTestIds : []).filter(Boolean));
    const reportableTestIds = configuredItems
      .map(({ item }) => schedules.find((schedule) => !schedule.isRetest && schedule.academicTestItemId === item.id)?.id)
      .filter(Boolean);
    const allAcademicReportsSent = reportableTestIds.length > 0
      && reportableTestIds.every((scheduleId) => sentReportIds.has(scheduleId));
    const allStudentsCompleted = students.length > 0 && (await Promise.all(students.map(async (student) => {
      const enrollment = student.courseEnrollments?.[0];
      const courseProgress = enrollment?.courseProgress ?? student.courseProgress;
      const progress = await getAcademicTestProgressForStudent({ ...student, batchId: enrollment?.batchId || student.batchId || batch.id, courseId: enrollment?.courseId || student.courseId || batch.courseId, courseProgress });
      return Number(courseProgress || 0) >= 100
        && progress.academicComplete === true
        && Number(progress.pendingTests || 0) === 0
        && Number(progress.pendingProjects || 0) === 0;
    }))).every(Boolean);
    // Once every student is complete and every Academic Report ID is sent to
    // Branch Admin, this batch must disappear from the Report tab as well.
    if (allStudentsCompleted && allAcademicReportsSent) return null;
    if (!completedEvaluationCount && !hasReportableEvaluation && !sentShares.length) return null;
    const totalEvaluationCount = configuredItems.length;
    return { ...batch, course: { id: batch.courseId, name: batch.courseName, courseCode: batch.branchCourseId }, totalTests: totalEvaluationCount, completedTestCount: completedEvaluationCount, hasProject: configuredItems.some(({ item }) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)), reportSent: allAcademicReportsSent };
  }));
  return reportBatches.filter(Boolean);
}

export async function getAcademicBatchReport(actor, batchId) {
  const batch = await reportBatchForFaculty(actor, batchId);
  const sentShares = await prisma.facultyReportShare.findMany({ where: { batchId: batch.id, reportType: "ACADEMIC_TEST", status: "SENT" }, orderBy: { sentAt: "desc" }, select: { id: true, sentAt: true, academicTestIds: true } });
  const report = await buildAcademicReport(actor, batch, null, null, true, false);
  const sentTestIds = [...new Set(sentShares.flatMap((share) => Array.isArray(share.academicTestIds) ? share.academicTestIds : []).filter(Boolean))];
  const reportableSchedules = await prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, orderBy: [{ testNumber: "asc" }, { createdAt: "asc" }], select: { id: true, academicTestItemId: true } });
  const reportableItems = await reportItemsForSchedules(batch, reportableSchedules);
  const reportableTestIds = reportableItems.map(({ item }) => reportableSchedules.find((schedule) => schedule.academicTestItemId === item.id)?.id).filter(Boolean);
  const sentShare = sentShares[0] || null;
  const testProgress = report.tests.map((test) => {
    const pendingStudents = report.students.filter((row) => {
      const current = row.tests?.find((item) => Number(item.testNumber) === Number(test.testNumber));
      const final = current?.final || {};
      const attended = ["SUBMITTED", "EVALUATED"].includes(String(final.status || "").toUpperCase());
      const completedRetest = (current?.retestAttempts || []).some((attempt) => ["SUBMITTED", "EVALUATED"].includes(String(attempt.status || "").toUpperCase()));
      const latestResultNeedsResend = sentShare && final.submittedAt && new Date(final.submittedAt) > new Date(sentShare.sentAt);
      return !attended || (String(final.result || "").toUpperCase() === "FAIL" && !completedRetest) || Boolean(latestResultNeedsResend);
    });
    return { testNumber: test.testNumber, scheduleId: test.scheduleId, totalStudents: report.students.length, completedCount: report.students.length - pendingStudents.length, pendingCount: pendingStudents.length, allStudentsCompleted: pendingStudents.length === 0 };
  }).filter((item) => !sentTestIds.length || sentTestIds.includes(item.scheduleId));
  return { ...report, testProgress, reportableTestIds, sentReport: sentShare ? { id: sentShare.id, sentAt: sentShare.sentAt, academicTestIds: sentTestIds } : null };
}

export async function getMyAcademicReport(actor, courseId = "") {
  const student = await studentFor(actor);
  const batches = await studentAcademicBatches(student, courseId);
  const batch = batches[0] ? await prisma.branchBatch.findUnique({ where: { id: batches[0].id }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } }) : null;
  if (!batch) throw new AppError("Student batch not found.", 404);
  const report = await buildAcademicReport(actor, batch, [student.id]);
  return { ...report, student: report.students[0] || null, students: undefined };
}

async function legacyListFacultyAcademicReportTests(actor, batchId) {
  const batch = await reportBatchForFaculty(actor, batchId);
  const [schedules, students] = await Promise.all([
    prisma.academicScheduledTest.findMany({
      where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } },
      orderBy: [{ testNumber: "asc" }, { createdAt: "asc" }],
      select: { id: true, testNumber: true, testDate: true, status: true, endTime: true, academicTestItemId: true, questionPaperId: true },
    }),
    prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: batch.id }, { batchId: batch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } } } }] }, select: { id: true } }),
  ]);
  const configuredItems = await reportItemsForSchedules(batch, schedules);
  await syncExpiredAcademicAttempts(schedules, students.map((student) => student.id));
  const paperIds = schedules.map((schedule) => schedule.questionPaperId).filter(Boolean);
  const [papers, submissions, projectSubmissions] = await Promise.all([
    prisma.academicQuestionPaper.findMany({ where: { id: { in: paperIds } }, select: { id: true, questions: { select: { questionType: true } } } }),
    prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: schedules.map((schedule) => schedule.id) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, status: true } }),
    prisma.academicProjectSubmission.findMany({ where: { academicTestId: { in: schedules.map((schedule) => schedule.id) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, status: true, marksAwarded: true } }),
  ]);
  const configuredIds = new Set(configuredItems.map(({ item }) => item.id));
  const projectIds = new Set(configuredItems.filter(({ item }) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)).map(({ item }) => item.id));
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  const submissionByKey = new Map(submissions.map((submission) => [`${submission.academicTestId}:${submission.branchStudentId}`, submission]));
  const completedNumbers = new Set();
  const completedSchedules = [];
  for (const schedule of schedules) {
    if (!configuredIds.has(schedule.academicTestItemId)) continue;
    if (!students.length) continue;
    const itemType = configuredItems.find(({ item }) => item.id === schedule.academicTestItemId)?.item.testType || "TEST";
    const projectSubmitted = ["PROJECT", "TEST_AND_PROJECT"].includes(itemType) && projectSubmissions.some((submission) => submission.academicTestId === schedule.id && reportProjectSubmissionIsFinal(submission));
    if (!reportScheduleHasEnded(schedule) && !projectSubmitted) continue;
    const hasAssessment = (paperById.get(schedule.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
    const number = Number(schedule.testNumber);
    const completedKey = `${number}:${itemType}`;
    if (completedNumbers.has(completedKey)) continue;
    completedNumbers.add(completedKey);
    const label = itemType === "PROJECT" ? `Project (Test ${schedule.testNumber})` : itemType === "TEST_AND_PROJECT" ? `Test ${schedule.testNumber} (Test + Project)` : `Test ${schedule.testNumber}`;
    completedSchedules.push({ ...schedule, testType: itemType, label });
  }
  return completedSchedules.map((schedule) => ({ ...schedule, completed: true }));
}

export async function listFacultyAcademicReportTests(actor, batchId) {
  const batch = await reportBatchForFaculty(actor, batchId);
  const report = await buildAcademicReport(actor, batch, null, null, true, false, false);
  const schedules = await prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, orderBy: [{ testNumber: "asc" }, { createdAt: "asc" }], select: { id: true, academicTestItemId: true, testNumber: true, testDate: true, status: true, endTime: true, questionPaperId: true } });
  const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const configuredItems = await reportItemsForSchedules(batch, schedules);
  return configuredItems.map(({ item }) => {
    const schedule = schedules.find((entry) => entry.academicTestItemId === item.id);
    if (!schedule || !report.students.length) return null;
    const completedForAllStudents = report.students.every((row) => {
      const current = row.tests?.find((test) => Number(test.testNumber) === Number(item.sequence));
      const final = current?.final || {};
      const attended = ["SUBMITTED", "EVALUATED"].includes(String(final.status || "").toUpperCase());
      const completedRetest = (current?.retestAttempts || []).some((attempt) => ["SUBMITTED", "EVALUATED"].includes(String(attempt.status || "").toUpperCase()));
      const testComplete = !["TEST", "TEST_AND_PROJECT"].includes(item.testType) || (
        attended && (String(final.result || "").toUpperCase() !== "FAIL" || completedRetest)
      );
      const projectComplete = !["PROJECT", "TEST_AND_PROJECT"].includes(item.testType) || row.projects?.some((project) => Number(project.testNumber) === Number(item.sequence) && project.marksAwarded != null);
      return testComplete && projectComplete;
    });
    if (!completedForAllStudents) return null;
    if (!reportScheduleHasEnded(schedule) && item.testType !== "PROJECT") return null;
    return { ...schedule, testType: item.testType, label: item.testType === "PROJECT" ? `Project (Test ${item.sequence})` : item.testType === "TEST_AND_PROJECT" ? `Test ${item.sequence} (Test + Project)` : `Test ${item.sequence}`, completed: true };
  }).filter(Boolean);
}

export async function sendAcademicTestReport(actor, payload = {}) {
  const batch = await reportBatchForFaculty(actor, payload.batchId);
  const selectedIds = [...new Set((Array.isArray(payload.academicTestIds) ? payload.academicTestIds : []).map(text).filter(Boolean))];
  if (!selectedIds.length) throw new AppError("Select at least one completed test to send.", 422);
  const schedules = await prisma.academicScheduledTest.findMany({ where: { id: { in: selectedIds }, branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, select: { id: true, academicTestItemId: true, testNumber: true, testDate: true, status: true, endTime: true, cycleId: true, cycle: { select: { batchCycleId: true } } } });
  if (schedules.length !== selectedIds.length) throw new AppError("One or more selected tests are not valid for this batch.", 422);
  // A batch cycle can contain item cycles created at different times. For a
  // cumulative Test N report, include every earlier test in this batch, not
  // only schedules that share Test N's cycle id.
  const cycleScheduleRows = await prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, select: { id: true, testNumber: true } });
  const incomplete = schedules.filter((schedule) => schedule.status !== "COMPLETED" && new Date(`${schedule.testDate}T${schedule.endTime || "23:59"}:00`) > new Date());
  if (incomplete.length) throw new AppError("Only completed tests can be sent to the Branch Admin.", 422);
  const snapshots = await Promise.all(schedules.map(async (schedule) => {
      // Include retest schedules for the selected original test so the sent
      // snapshot uses the same final attempt/marks shown in the faculty report.
      // Overall percentage for Test N includes all original tests up to N in
      // this cycle. The submitted report still exposes only the selected test
      // as its visible test column.
      const progressScheduleIds = cycleScheduleRows.filter((row) => Number(row.testNumber) <= Number(schedule.testNumber)).map((row) => row.id);
      const report = await buildAcademicReport(actor, batch, null, progressScheduleIds, true, false, false);
    // Persist the complete cumulative snapshot through the selected test.
    // The Branch Admin report must retain earlier test marks when Test N is
    // sent, while the selected schedule still identifies the latest report.
    const tests = report.tests || [];
    return {
      schedule,
      reportData: {
        batch: report.batch,
        course: report.course,
        tests,
        hasProject: Boolean(report.hasProject),
        projectItems: report.projectItems || [],
        students: (report.students || []).map((row) => ({
          student: row.student,
          tests: row.tests || [],
          projects: row.projects || [],
          overallTestPercentage: row.overallTestPercentage,
          overallProjectPercentage: row.overallProjectPercentage,
        })),
      },
    };
  }));
  const share = await prisma.$transaction(async (tx) => {
    const createdShare = await tx.facultyReportShare.create({ data: { facultyId: actor.id, branchId: batch.branchId, batchId: batch.id, courseId: batch.branchCourseId, testModuleIds: [], assessmentModuleIds: [], academicTestIds: selectedIds, reportType: "ACADEMIC_TEST" } });
    for (const snapshot of snapshots) {
      const history = await tx.academicTestReportHistory.upsert({
        where: { batchCycleId_academicTestId: { batchCycleId: snapshot.schedule.cycle.batchCycleId, academicTestId: snapshot.schedule.academicTestItemId } },
        create: { batchId: batch.id, batchCycleId: snapshot.schedule.cycle.batchCycleId, academicTestId: snapshot.schedule.academicTestItemId },
        update: {},
      });
      await tx.academicTestReportSubmission.create({
        data: { historyId: history.id, facultyId: actor.id, sourceShareId: createdShare.id, scheduleId: snapshot.schedule.id, reportData: snapshot.reportData, submittedAt: createdShare.sentAt },
      });
    }
    return createdShare;
  });
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
  // Batch lifecycle completion is reconciled by the lifecycle scheduler and by
  // the cycle mutation flows. Do not run it from this read endpoint: the
  // academic-tests and batch-cycle modules form a circular dependency, and a
  // report list must remain available even when reconciliation is unavailable.
  const histories = await prisma.academicTestReportHistory.findMany({ where: { batch: { branchId }, submissions: { some: {} } }, orderBy: { updatedAt: "desc" }, include: { batch: { select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } }, batchCycle: { select: { id: true, cycleNumber: true, cycleName: true, status: true, startDate: true, endDate: true, completedAt: true, freezeUntil: true } }, academicTest: { select: { id: true, sequence: true, testType: true } }, submissions: { orderBy: { submittedAt: "desc" }, select: { id: true, facultyId: true, sourceShareId: true, submittedAt: true } } } });
  const batchIds = histories.map((history) => history.batchId);
  const facultyIds = histories.flatMap((history) => history.submissions.map((submission) => submission.facultyId).filter(Boolean));
  const [batches, faculties] = await Promise.all([
    prisma.branchBatch.findMany({ where: { id: { in: batchIds } }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } }),
    prisma.user.findMany({ where: { id: { in: facultyIds } }, select: { id: true, fullName: true } }),
  ]);
  const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
  const facultyMap = new Map(faculties.map((faculty) => [faculty.id, faculty]));
  return histories.map((history) => {
    const latest = history.submissions[0] || null;
    const isCompleted = history.batchCycle?.status === "COMPLETED";
    return { id: history.id, historyId: history.id, shareId: latest?.sourceShareId || null, batchId: history.batchId, batchCycleId: history.batchCycleId, academicTestId: history.academicTestId, academicTestIds: [history.academicTestId], testNumber: history.academicTest.sequence, testType: history.academicTest.testType, submissionCount: history.submissions.length, latestSubmittedAt: latest?.submittedAt || history.updatedAt, sentAt: latest?.submittedAt || history.updatedAt, completedAt: isCompleted ? history.batchCycle?.endDate || history.batchCycle?.completedAt || null : null, status: isCompleted ? "COMPLETED" : "ACTIVE", isHistory: isCompleted, batch: history.batch, course: { id: history.batch.courseId, name: history.batch.courseName, courseCode: history.batch.branchCourseId }, cycle: history.batchCycle, faculty: facultyMap.get(latest?.facultyId), latestSubmissionId: latest?.id || null };
  });
}

export async function getBranchAcademicTestReportHistory(actor, historyId) {
  const branchId = await branchReportScope(actor);
  const history = await prisma.academicTestReportHistory.findFirst({
    where: { id: text(historyId), batch: { branchId } },
    include: {
      batch: { select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } },
      batchCycle: { select: { id: true, cycleNumber: true, cycleName: true, status: true, startDate: true, endDate: true, completedAt: true, freezeUntil: true } },
      academicTest: { select: { id: true, sequence: true, testType: true } },
      submissions: { orderBy: { submittedAt: "desc" }, select: { id: true, facultyId: true, sourceShareId: true, scheduleId: true, reportData: true, submittedAt: true, createdAt: true } },
    },
  });
  if (!history) throw new AppError("Academic test report history not found.", 404);
  const facultyIds = [...new Set(history.submissions.map((submission) => submission.facultyId).filter(Boolean))];
  const faculties = facultyIds.length ? await prisma.user.findMany({ where: { id: { in: facultyIds } }, select: { id: true, fullName: true, email: true } }) : [];
  const facultyMap = new Map(faculties.map((faculty) => [faculty.id, faculty]));
  return {
    id: history.id,
    historyId: history.id,
    batch: history.batch,
    cycle: history.batchCycle,
    academicTest: history.academicTest,
    // History is an immutable snapshot. A later retest must create a new
    // submission; it must never rewrite the old Not Attended/old marks view.
    submissions: history.submissions.map((submission) => ({ ...submission, faculty: facultyMap.get(submission.facultyId) || null })),
  };
}

export async function getBranchAcademicTestReport(actor, shareId) {
  const branchId = await branchReportScope(actor);
  const share = await prisma.facultyReportShare.findFirst({ where: { id: text(shareId), branchId, reportType: "ACADEMIC_TEST", status: "SENT" } });
  if (!share) throw new AppError("Academic test report not found.", 404);
  const batch = await prisma.branchBatch.findUnique({ where: { id: share.batchId }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } });
  if (!batch) throw new AppError("Report batch not found.", 404);
  // A Branch Admin report is a sent snapshot. Use the students that actually
  // have a submission in this sent report, rather than the current active
  // students in the batch (which may belong to a later course cycle).
  const selectedScheduleIds = Array.isArray(share.academicTestIds) ? share.academicTestIds : [];
  const selectedSchedules = selectedScheduleIds.length
    ? await prisma.academicScheduledTest.findMany({ where: { id: { in: selectedScheduleIds }, branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, select: { id: true, testNumber: true } })
    : [];
  const latestTestNumber = selectedSchedules.reduce((max, schedule) => Math.max(max, Number(schedule.testNumber || 0)), 0);
  const cumulativeScheduleIds = latestTestNumber
    ? (await prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" }, testNumber: { lte: latestTestNumber } }, select: { id: true } })).map((schedule) => schedule.id)
    : selectedScheduleIds;
  const [testSubmissionStudents, projectSubmissionStudents] = await Promise.all([
    cumulativeScheduleIds.length
      ? prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: cumulativeScheduleIds } }, select: { branchStudentId: true } })
      : [],
    cumulativeScheduleIds.length
      ? prisma.academicProjectSubmission.findMany({ where: { academicTestId: { in: cumulativeScheduleIds } }, select: { branchStudentId: true } })
      : [],
  ]);
  const snapshotStudentIds = [...new Set([
    ...testSubmissionStudents.map((submission) => submission.branchStudentId),
    ...projectSubmissionStudents.map((submission) => submission.branchStudentId),
  ].filter(Boolean))];
  const report = await buildAcademicReport(
    actor,
    batch,
    snapshotStudentIds.length ? snapshotStudentIds : null,
    cumulativeScheduleIds,
    true,
    false,
    false,
  );
  return { ...report, share: { id: share.id, sentAt: share.sentAt, facultyId: share.facultyId } };
}

export async function getBranchStudentAcademicReports(actor, studentId, options = {}) {
  // Completion-summary requests already resolve the authenticated branch and
  // student records in one bulk query. Reuse that context so each report
  // does not repeat the same branch/student lookups. Existing callers keep the
  // original lookup behavior when no context is supplied.
  const branchId = options.branchId || await branchReportScope(actor);
  const student = options.student || await prisma.branchStudent.findFirst({ where: { branchId, studentId: text(studentId), recordStatus: "ACTIVE" }, select: { id: true, studentId: true, studentName: true, emailAddress: true, courseName: true, batchName: true, batchId: true, courseEnrollments: { select: { batchId: true } } } });
  if (!student) throw new AppError("Student not found in this branch.", 404);
  const studentBatchIds = [...new Set([student.batchId, ...(student.courseEnrollments || []).map((enrollment) => enrollment.batchId)].map(text).filter(Boolean))];
  let batches = studentBatchIds.length
    ? await prisma.branchBatch.findMany({ where: { branchId, OR: [{ id: { in: studentBatchIds } }, { batchId: { in: studentBatchIds } }] }, select: { id: true, batchId: true, branchCourseId: true, courseId: true, courseName: true } })
    : [];
  if (!batches.length && student.courseName) {
    const courseKey = String(student.courseName).toLowerCase().replace(/[^a-z0-9]/g, "");
    const courseBatches = await prisma.branchBatch.findMany({ where: { branchId }, select: { id: true, batchId: true, branchCourseId: true, courseId: true, courseName: true } });
    batches = courseBatches.filter((batch) => String(batch.courseName || "").toLowerCase().replace(/[^a-z0-9]/g, "") === courseKey);
  }
  const batchIds = new Set(batches.flatMap((batch) => [batch.id, batch.batchId]).filter(Boolean));
  const configuredTests = batches.length
    ? await prisma.academicTest.findMany({
      where: { batches: { some: { branchBatchId: { in: batches.map((batch) => batch.id) } } } },
      select: { branchCourseId: true, branchCourse: { select: { academicTestCount: true } }, items: { select: { id: true, sequence: true, testType: true } } },
    })
    : [];
  const courseTotals = {};
  const courseTotalsByName = {};
  configuredTests.forEach((test) => {
    if (test.branchCourseId) {
      const configuredCount = Number(test.branchCourse?.academicTestCount || 0);
      courseTotals[test.branchCourseId] = configuredCount || test.items.length;
    }
  });
  batches.forEach((batch) => {
    const total = courseTotals[batch.branchCourseId || batch.courseId];
    if (batch.courseName && total) courseTotalsByName[String(batch.courseName).trim().toLowerCase()] = total;
  });
  // Completed-cycle marks live in immutable report snapshots. Do not rebuild
  // a completed student's result from the new active cycle, which is empty.
  const histories = await prisma.academicTestReportHistory.findMany({
    where: { batchId: { in: [...batchIds] }, submissions: { some: {} } },
    orderBy: { updatedAt: "asc" },
    select: { id: true, batchId: true, academicTest: { select: { sequence: true, testType: true } }, submissions: { orderBy: { submittedAt: "desc" }, take: 1, select: { reportData: true } } },
  });
  const historyItems = [];
  for (const history of histories) {
    const snapshot = history.submissions?.[0]?.reportData;
    const row = (snapshot?.students || []).find((entry) => {
      const candidate = entry?.student || {};
      return [candidate.id, candidate.studentId, candidate.emailAddress].some((value) => {
        const key = String(value || "").trim().toLowerCase();
        return key && [student.id, student.studentId, student.emailAddress].map((item) => String(item || "").trim().toLowerCase()).includes(key);
      });
    });
    if (!row) continue;
    const batch = batches.find((entry) => entry.id === history.batchId);
    for (const test of row.tests || []) {
      const final = test.final || {};
      const project = (row.projects || []).find((entry) => Number(entry.testNumber) === Number(test.testNumber));
      historyItems.push({ id: `${history.id}:test:${student.id}`, evaluationId: history.id, courseId: batch?.branchCourseId || batch?.courseId || null, courseName: batch?.courseName || student.courseName, batchName: batch?.batchName || student.batchName, testNumber: test.testNumber, testName: `Test ${test.testNumber}`, testType: test.testType, marksObtained: final.marksObtained, totalMarks: final.totalMarks, percentage: final.percentage, result: final.result, status: final.status, projectMarks: project?.marksAwarded ?? null, projectTotalMarks: project?.totalMarks ?? null, projectPercentage: project?.percentage ?? null, projectResult: project?.result ?? null });
    }
    for (const project of row.projects || []) {
      if ((row.tests || []).some((test) => Number(test.testNumber) === Number(project.testNumber) && test.testType === "TEST_AND_PROJECT")) continue;
      historyItems.push({ id: `${history.id}:project:${student.id}`, evaluationId: `${history.id}:project`, courseId: batch?.branchCourseId || batch?.courseId || null, courseName: batch?.courseName || student.courseName, batchName: batch?.batchName || student.batchName, testNumber: project.testNumber, testName: `Test ${project.testNumber} (Project)`, testType: "PROJECT", marksObtained: project.marksAwarded, totalMarks: project.totalMarks, percentage: project.percentage, result: project.result, status: project.status });
    }
  }
  if (historyItems.length) {
    return { student, items: historyItems, evaluations: historyItems.map((item) => ({ evaluationId: item.evaluationId, courseId: item.courseId, courseName: item.courseName, batchName: item.batchName, name: item.testName, type: item.testType, testType: item.testType, testNumber: item.testNumber, marksObtained: item.marksObtained, totalMarks: item.totalMarks, percentage: item.percentage, status: item.status, result: item.result, projectMarks: item.projectMarks, projectTotalMarks: item.projectTotalMarks, projectPercentage: item.projectPercentage, projectResult: item.projectResult })), courseTotals, courseTotalsByName };
  }
  // Completed cycles archive their sent snapshots when the next cycle starts.
  // Course-completion views must read both live and archived snapshots.
  const shares = await prisma.facultyReportShare.findMany({ where: { branchId, reportType: "ACADEMIC_TEST", status: { in: ["SENT", "ARCHIVED"] }, batchId: { in: [...batchIds] } }, orderBy: { sentAt: "asc" } });
  if (!shares.length) return { student, items: [], evaluations: [], courseTotals, courseTotalsByName };
  const items = [];
  for (const share of shares) {
    const batch = await prisma.branchBatch.findUnique({ where: { id: share.batchId }, select: { id: true, batchId: true, batchName: true, batchTiming: true, courseName: true, branchCourseId: true, courseId: true } });
    if (!batch) continue;
    const configuredAcademicTest = await prisma.academicTest.findFirst({
      where: { branchCourseId: batch.branchCourseId, batches: { some: { branchBatchId: batch.id } } },
      select: { branchCourse: { select: { academicTestCount: true } }, items: { select: { id: true, sequence: true, testType: true } } },
    });
    const totalForCourse = Number(configuredAcademicTest?.branchCourse?.academicTestCount || 0) || configuredAcademicTest?.items?.length || 0;
    if (totalForCourse) {
      courseTotals[batch.branchCourseId || batch.courseId] = totalForCourse;
    }
    const report = await buildAcademicReport(actor, batch, [student.id], Array.isArray(share.academicTestIds) ? share.academicTestIds : [], true);
    const row = report.students?.[0];
    const scheduleIds = (row?.tests || []).map((test) => test.scheduleId).filter(Boolean);
    const schedules = await prisma.academicScheduledTest.findMany({ where: { id: { in: scheduleIds } }, select: { id: true, testDate: true } });
    const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
    for (const test of row?.tests || []) {
      const final = test.final || {};
      const status = String(final.status || "").toUpperCase();
      const testCompleted = ["SUBMITTED", "EVALUATED"].includes(status);
      const projectRequired = String(test.testType || "").toUpperCase() === "TEST_AND_PROJECT";
      const projectCompleted = !projectRequired || row.project?.percentage != null;
      const evaluationCompleted = testCompleted && projectCompleted;
      items.push({ id: `${share.id}:${test.testNumber}:${student.id}`, evaluationId: test.itemId || test.scheduleId, courseId: batch.branchCourseId || batch.courseId || null, courseName: batch.courseName, batchName: batch.batchName, testName: `Test ${test.testNumber}`, testType: test.testType, testDate: scheduleById.get(test.scheduleId)?.testDate || null, marksObtained: evaluationCompleted ? final.marksObtained : null, totalMarks: evaluationCompleted ? final.totalMarks : null, percentage: evaluationCompleted ? final.percentage : null, result: evaluationCompleted ? (final.result || null) : null, validationStatus: evaluationCompleted ? "VALIDATED" : "NOT_EVALUATED", status: evaluationCompleted ? "SUBMITTED" : "NOT_EVALUATED", projectPercentage: row.project?.percentage ?? null });
    }
    if (row?.project && !row.tests?.some((test) => test.testType === "PROJECT")) {
      const projectCompleted = row.project.percentage != null && ["SUBMITTED", "GRADED", "EVALUATED"].includes(String(row.project.status || "").toUpperCase());
      items.push({ id: `${share.id}:project:${student.id}`, evaluationId: `${share.id}:project`, courseId: batch.branchCourseId || batch.courseId || null, courseName: batch.courseName, batchName: batch.batchName, testNumber: row.project.testNumber || null, testName: `Test ${row.project.testNumber || ""} (Project)`.trim(), testType: "PROJECT", marksObtained: projectCompleted ? row.project.marksAwarded : null, totalMarks: projectCompleted ? row.project.totalMarks : null, percentage: projectCompleted ? row.project.percentage : null, status: projectCompleted ? "SUBMITTED" : "NOT_EVALUATED", result: projectCompleted ? row.project.result || null : null, validationStatus: projectCompleted ? "VALIDATED" : "NOT_EVALUATED" });
    }
  }
  const evaluations = [];
  const seen = new Set();
  for (const item of items) {
    const key = item.evaluationId || item.testName;
    if (seen.has(key)) continue;
    seen.add(key);
    evaluations.push({ evaluationId: item.evaluationId, courseId: item.courseId || null, courseName: item.courseName || null, batchName: item.batchName || null, name: item.testName, type: item.testType, testType: item.testType, testNumber: item.testNumber, marksObtained: item.marksObtained, totalMarks: item.totalMarks, percentage: item.percentage, status: item.status || "NOT_EVALUATED", result: item.result, projectMarks: item.projectMarks, projectTotalMarks: item.projectTotalMarks, projectPercentage: item.projectPercentage, projectResult: item.projectResult });
  }
  return { student, items, evaluations, courseTotals, courseTotalsByName };
}
