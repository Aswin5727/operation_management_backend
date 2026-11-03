import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getAcademicTestProgressForStudent } from "../academicTests/academicTests.service.js";

const active = { status: "ACTIVE" };
const text = (value) => String(value ?? "").trim();
const unwrap = (value) => value?.data ?? value;
const applicationTimeZone = "Asia/Kolkata";
const cancellationDate = (value) => new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: applicationTimeZone }).format(new Date(value));
const cancellationTime = (value) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: applicationTimeZone }).format(new Date(value)).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase());
const cancellationWindow = (start, end) => `${cancellationDate(start)}, from ${cancellationTime(start)} to ${cancellationTime(end)}`;
const assessmentUploadRoot = path.resolve(process.cwd(), "uploads", "assessments");
const isAssessmentCancelled = (item) => item?.status === "CANCELLED" || text(item?.details).startsWith("[CANCELLED]");
const submissionAttachments = (submission) => {
  if (Array.isArray(submission?.screenshotUrls)) return submission.screenshotUrls;
  if (submission?.screenshotMimeType === "application/json") {
    try { return JSON.parse(submission.screenshotFileName || "[]"); } catch { return []; }
  }
  return submission?.screenshotUrl ? [{ url: submission.screenshotUrl, fileName: submission.screenshotFileName, mimeType: submission.screenshotMimeType }] : [];
};

async function batchCourseAndAcademicCompletion(batchId, cache = new Map()) {
  const key = text(batchId);
  if (!key) return false;
  if (cache.has(key)) return cache.get(key);
  const promise = (async () => {
    const batch = await prisma.branchBatch.findUnique({ where: { id: key }, select: { id: true, batchId: true, branchCourseId: true, cycles: { where: { status: "ACTIVE" }, orderBy: { cycleNumber: "desc" }, take: 1, select: { id: true } } } });
    const cycle = batch?.cycles?.[0];
    if (!batch || !cycle) return false;
    const students = await prisma.branchStudent.findMany({
      where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: batch.id }, { batchId: batch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } } } }] },
      select: { id: true, branchId: true, batchId: true, courseId: true, courseProgress: true, courseEnrollments: { where: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } }, select: { batchId: true, courseId: true, courseProgress: true } } },
    });
    if (!students.length) return false;
    const [reportSchedules, sentReportShares, academicItems, syllabusExams, syllabusAssessments] = await Promise.all([
      prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, select: { id: true, academicTestItemId: true, questionPaperId: true } }),
      prisma.facultyReportShare.findMany({ where: { batchId: batch.id, status: "SENT", OR: [{ batchCycleId: cycle.id }, { batchCycleId: null }] }, select: { academicTestIds: true, testModuleIds: true, assessmentModuleIds: true } }),
      prisma.academicTestItem.findMany({ where: { academicTest: { branchCourseId: batch.branchCourseId, batches: { some: { branchBatchId: batch.id } } } }, select: { id: true, testType: true } }),
      prisma.exam.findMany({ where: { schedules: { some: { branchBatchId: batch.id, batchCycleId: cycle.id } }, status: { not: "CANCELLED" } }, select: { moduleId: true } }),
      prisma.assessment.findMany({ where: { branchBatchId: batch.id, batchCycleId: cycle.id }, select: { moduleId: true } }),
    ]);
    const sentReportIds = new Set(sentReportShares.flatMap((share) => Array.isArray(share.academicTestIds) ? share.academicTestIds : []).filter(Boolean));
    const scheduledItemIds = new Set(reportSchedules.map((schedule) => schedule.academicTestItemId));
    const allAcademicItemsScheduled = academicItems.every((item) => scheduledItemIds.has(item.id));
    const allAcademicReportsSent = allAcademicItemsScheduled && reportSchedules.every((schedule) => sentReportIds.has(schedule.id));
    if (!allAcademicReportsSent) return false;
    const sentTestModules = new Set(sentReportShares.flatMap((share) => Array.isArray(share.testModuleIds) ? share.testModuleIds : []).filter(Boolean));
    const sentAssessmentModules = new Set(sentReportShares.flatMap((share) => Array.isArray(share.assessmentModuleIds) ? share.assessmentModuleIds : []).filter(Boolean));
    const allSyllabusReportsSent = [...new Set(syllabusExams.map((exam) => exam.moduleId).filter(Boolean))].every((moduleId) => sentTestModules.has(moduleId))
      && [...new Set(syllabusAssessments.map((assessment) => assessment.moduleId).filter(Boolean))].every((moduleId) => sentAssessmentModules.has(moduleId));
    if (!allSyllabusReportsSent) return false;
    const allSchedules = await prisma.academicScheduledTest.findMany({
      where: { branchBatchId: batch.id, status: { not: "CANCELLED" } },
      select: { id: true, academicTestItemId: true, questionPaperId: true, isRetest: true, originalScheduleId: true, parentScheduleId: true },
    });
    const scheduleIds = allSchedules.map((schedule) => schedule.id);
    const [scheduleItems, papers, submissions, projectSubmissions] = await Promise.all([
      Promise.resolve(allSchedules),
      prisma.academicQuestionPaper.findMany({ where: { id: { in: [...new Set(allSchedules.map((schedule) => schedule.questionPaperId).filter(Boolean))] } }, select: { id: true, questions: { select: { questionType: true } } } }),
      prisma.academicTestSubmission.findMany({ where: { academicTestId: { in: scheduleIds }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, status: true, resultStatus: true } }),
      prisma.academicProjectSubmission.findMany({ where: { academicTestId: { in: scheduleIds }, branchStudentId: { in: students.map((student) => student.id) } }, select: { academicTestId: true, branchStudentId: true, marksAwarded: true, status: true } }),
    ]);
    const itemIds = [...new Set(scheduleItems.map((schedule) => schedule.academicTestItemId))];
    const items = await prisma.academicTestItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, testType: true } });
    const itemById = new Map(items.map((item) => [item.id, item]));
    const paperById = new Map(papers.map((paper) => [paper.id, paper]));
    const submissionByKey = new Map(submissions.map((submission) => [`${submission.academicTestId}:${submission.branchStudentId}`, submission]));
    const projectByKey = new Map(projectSubmissions.map((submission) => [`${submission.academicTestId}:${submission.branchStudentId}`, submission]));
    const completed = students.map((student) => {
      const enrollment = student.courseEnrollments[0];
      const courseProgress = Number(enrollment?.courseProgress ?? student.courseProgress ?? 0);
      if (courseProgress < 100) return false;
      return reportSchedules.length > 0 && reportSchedules.every((schedule) => {
        const item = itemById.get(schedule.academicTestItemId);
        if (!item) return false;
        const testRequired = ["TEST", "TEST_AND_PROJECT"].includes(item.testType);
        const projectRequired = ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType);
        const attempts = scheduleItems.filter((attempt) => attempt.id === schedule.id || attempt.originalScheduleId === schedule.id || attempt.parentScheduleId === schedule.id);
        const testComplete = !testRequired || attempts.some((attempt) => {
          const submission = submissionByKey.get(`${attempt.id}:${student.id}`);
          const hasAssessment = (paperById.get(attempt.questionPaperId)?.questions || []).some((question) => question.questionType === "ASSESSMENT");
          const testStatus = text(submission?.status).toUpperCase();
          return (testStatus === "EVALUATED" || (testStatus === "SUBMITTED" && !hasAssessment)) && text(submission?.resultStatus).toUpperCase() !== "FAIL";
        });
        const projectComplete = !projectRequired || attempts.some((attempt) => projectByKey.get(`${attempt.id}:${student.id}`)?.marksAwarded != null);
        return testComplete && projectComplete;
      });
    });
    return completed.every(Boolean);
  })().catch(() => false);
  cache.set(key, promise);
  return promise;
}

function parseTime(value) {
  const raw = text(value).toUpperCase();
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (minute > 59 || hour > 23) return null;
  if (match[3] === "PM" && hour < 12) hour += 12;
  if (match[3] === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function scheduledDate(date, time) {
  const minutes = parseTime(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(date)) || minutes == null) return null;
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hour}:${minute}:00+05:30`);
}

function statusForSchedule(schedule, now = new Date()) {
  const start = scheduledDate(schedule.testDate, schedule.startTime);
  const end = scheduledDate(schedule.testDate, schedule.endTime);
  if (!start || !end) return "UPCOMING";
  if (now < start) return "UPCOMING";
  if (now <= end) return "AVAILABLE";
  return "EXPIRED";
}

function normalizeQuestion(question, index) {
  const value = {
    question: text(question.question),
    optionA: text(question.optionA),
    optionB: text(question.optionB),
    optionC: text(question.optionC),
    optionD: text(question.optionD),
    correctAnswer: text(question.correctAnswer).toUpperCase(),
    questionOrder: Number(question.questionOrder || index + 1),
  };
  if (!value.question || [value.optionA, value.optionB, value.optionC, value.optionD].some((item) => !item)) throw new AppError("Every MCQ must contain a question and four options.", 422);
  if (!["A", "B", "C", "D"].includes(value.correctAnswer)) throw new AppError("Correct answer must be A, B, C, or D.", 422);
  return value;
}

function facultyIds(user = {}) {
  return Array.from(new Set([user.id, user.userCode].map((value) => text(value)).filter(Boolean)));
}

async function activeSyllabusCycle(batchId, tx = prisma) {
  const current = await tx.batchCycle.findFirst({ where: { batchId, status: "ACTIVE" }, orderBy: { cycleNumber: "desc" }, select: { id: true, cycleNumber: true, cycleName: true, status: true } });
  if (current) return current;
  const latest = await tx.batchCycle.findFirst({ where: { batchId }, orderBy: { cycleNumber: "desc" }, select: { cycleNumber: true } });
  if (latest) throw new AppError("This batch has no active intake cycle. Start a new intake before creating syllabus tests.", 409);
  return tx.batchCycle.upsert({ where: { batchId_cycleNumber: { batchId, cycleNumber: 1 } }, update: { status: "ACTIVE" }, create: { batchId, cycleNumber: 1, cycleName: "Cycle 1", status: "ACTIVE" }, select: { id: true, cycleNumber: true, cycleName: true, status: true } });
}

// A sent faculty report closes the current syllabus-test cycle for the
// selected module. Items created after that send belong to the next cycle.
async function syllabusCycleStart(batchId, courseId, moduleId, kind) {
  const shares = await prisma.facultyReportShare.findMany({
    where: { batchId, courseId, status: "SENT", reportType: { not: "ACADEMIC_TEST" } },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true, testModuleIds: true, assessmentModuleIds: true },
  });
  const key = kind === "ASSESSMENT" ? "assessmentModuleIds" : "testModuleIds";
  return shares.find((share) => Array.isArray(share[key]) && share[key].map(text).includes(text(moduleId)))?.sentAt || null;
}

function activeStudentForCurrentSyllabusCycle(student, batch, cycleStart) {
  if (!cycleStart) return true;
  const enrollment = (student.courseEnrollments || []).find((item) => item.batchId === batch.id || item.batchId === batch.batchId);
  if (!enrollment) return true;
  return !(enrollment.courseCompletedAt && new Date(enrollment.courseCompletedAt) <= new Date(cycleStart));
}

async function facultyCourseWhere(user, courseId = null) {
  const ids = facultyIds(user);
  return {
    ...(courseId ? { id: courseId } : {}),
    ...active,
    OR: [
      { facultyAssignments: { some: { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" }, branchCourse: active } } },
      { branchFaculties: { some: { facultyId: { in: ids }, status: "ACTIVE" } } },
      { branchBatches: { some: { AND: [{ OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] } } },
    ],
  };
}

async function assertFacultyCourse(user, courseId) {
  const course = await prisma.branchCourse.findFirst({ where: await facultyCourseWhere(user, courseId), include: { modules: { where: active, orderBy: { sequenceNo: "asc" } } } });
  if (!course) throw new AppError("You do not have access to this course.", 403);
  return course;
}

async function assertStudent(user) {
  const email = text(user.email).toLowerCase();
  const student = await prisma.branchStudent.findFirst({ where: { emailAddress: { equals: email, mode: "insensitive" }, recordStatus: "ACTIVE" }, include: { courseEnrollments: { where: { status: "ACTIVE" }, select: { courseId: true, batchId: true } } } });
  if (!student) throw new AppError("Student record not found.", 403);
  return student;
}

async function studentExamBatches(student, courseId = "") {
  const enrollments = (student.courseEnrollments || []).filter((item) => !courseId || item.courseId === courseId);
  if (student.courseEnrollments?.length) {
    if (!enrollments.length) return [];
    const enrollmentScopes = enrollments.map((item) => ({ branchCourseId: item.courseId, ...(item.batchId ? { OR: [{ id: item.batchId }, { batchId: item.batchId }] } : {}) }));
    return prisma.branchBatch.findMany({ where: { branchId: student.branchId, OR: enrollmentScopes }, select: { id: true, batchId: true, branchCourseId: true, cycles: { where: { status: "ACTIVE" }, orderBy: { cycleNumber: "desc" }, take: 1, select: { id: true } } } });
  }
  if (courseId && courseId !== student.courseId) return [];
  return prisma.branchBatch.findMany({ where: { OR: [{ id: student.batchId }, { batchId: student.batchId }] }, select: { id: true, batchId: true, branchCourseId: true, cycles: { where: { status: "ACTIVE" }, orderBy: { cycleNumber: "desc" }, take: 1, select: { id: true } } } });
}

function publicSchedule(schedule, now = new Date(), exam = schedule.exam) {
  const cancelled = exam?.status === "CANCELLED" || schedule.status === "CANCELLED";
  return { id: schedule.id, batchId: schedule.branchBatchId, batchName: schedule.branchBatch?.batchName, batchTiming: schedule.branchBatch?.batchTiming, testDate: schedule.testDate, startTime: schedule.startTime, endTime: schedule.endTime, status: cancelled ? "CANCELLED" : statusForSchedule(schedule, now) };
}

export async function listFacultyCourses(user) {
  return prisma.branchCourse.findMany({ where: await facultyCourseWhere(user), select: { id: true, courseCode: true, name: true, status: true }, orderBy: { name: "asc" } });
}

export async function listFacultyBatches(user, courseId) {
  await assertFacultyCourse(user, courseId);
  const ids = facultyIds(user);
  const rows = await prisma.branchBatch.findMany({ where: { AND: [{ OR: [{ branchCourseId: courseId }, { courseId }] }, { OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] }, select: { id: true, batchId: true, batchName: true, batchTiming: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, courseId: true, branchCourseId: true, status: true }, orderBy: [{ batchName: "asc" }] });
  const completion = new Map();
  return (await Promise.all(rows.map(async (row) => { completion.set(row.id, await batchCourseAndAcademicCompletion(row.id)); return row; }))).filter((row) => !completion.get(row.id));
}

export async function listFacultyModules(user, courseId) {
  const course = await assertFacultyCourse(user, courseId);
  return course.modules.map((module) => ({ id: module.id, title: module.title, sequenceNo: module.sequenceNo }));
}

function examInclude(includeQuestions = false) {
  return { branchCourse: { select: { id: true, name: true, courseCode: true } }, module: { select: { id: true, title: true } }, originalTest: { select: { id: true, title: true } }, schedules: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } } }, orderBy: { testDate: "asc" } }, ...(includeQuestions ? { questions: { orderBy: { questionOrder: "asc" } } } : {}) };
}

export async function listFacultyTests(user) {
  const tests = await prisma.exam.findMany({ where: { facultyId: user.id }, include: examInclude(), orderBy: { createdAt: "desc" } });
  const current = [];
  const completion = new Map();
  for (const test of tests) {
    const visibleSchedules = [];
    for (const schedule of test.schedules) {
      const completed = await batchCourseAndAcademicCompletion(schedule.branchBatchId, completion);
      if (completed) continue;
      const currentCycle = await activeSyllabusCycle(schedule.branchBatchId);
      if (currentCycle?.id && schedule.batchCycleId !== currentCycle.id) continue;
      const start = await syllabusCycleStart(schedule.branchBatchId, test.branchCourseId, test.moduleId, "TEST");
      if (!start || test.createdAt >= start || !completed) visibleSchedules.push(schedule);
    }
    if (visibleSchedules.length) current.push({ ...test, schedules: visibleSchedules });
  }
  return current.map((test) => ({ ...test, schedules: test.schedules.map((schedule) => publicSchedule(schedule, new Date(), test)) }));
}

export async function getFacultyTest(user, testId) {
  const test = await prisma.exam.findFirst({ where: { id: testId, facultyId: user.id }, include: examInclude(true) });
  if (!test) throw new AppError("Test not found.", 404);
  return { ...test, schedules: test.schedules.map((schedule) => publicSchedule(schedule, new Date(), test)) };
}

export async function cancelTest(user, testId) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const test = await tx.exam.findFirst({ where: { id: testId, facultyId: user.id }, include: { branchCourse: { select: { id: true, name: true } }, module: { select: { id: true, title: true } }, schedules: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } } } } } });
    if (!test) throw new AppError("Test not found.", 404);
    if (test.status === "CANCELLED") throw new AppError("Test has already been cancelled.", 409);
    if (test.schedules.some((schedule) => { const start = scheduledDate(schedule.testDate, schedule.startTime); return start && start <= new Date(); })) throw new AppError("This test cannot be cancelled after its start date and time.", 409);
    const batchIds = test.schedules.flatMap((schedule) => [schedule.branchBatchId, schedule.branchBatch?.batchId]).filter(Boolean);
    const students = batchIds.length ? await tx.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: { in: batchIds } }] }, select: { batchId: true, emailAddress: true } }) : [];
    const emails = students.map((student) => text(student.emailAddress).toLowerCase()).filter(Boolean);
    const users = emails.length ? await tx.user.findMany({ where: { role: "STUDENT", OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } }) : [];
    const userByEmail = new Map(users.map((item) => [text(item.email).toLowerCase(), item.id]));
    const notificationRows = [];
    for (const student of students) {
      const targetUserId = userByEmail.get(text(student.emailAddress).toLowerCase());
      if (!targetUserId) continue;
      const schedule = test.schedules.find((item) => item.branchBatchId === student.batchId || item.branchBatch?.batchId === student.batchId) || test.schedules[0];
      notificationRows.push({ kind: "EXAM_SCHEDULED", tone: "red", title: "Test Cancelled", message: `Your "${test.title}" for the "${test.module.title}" module, scheduled for ${cancellationWindow(scheduledDate(schedule.testDate, schedule.startTime), scheduledDate(schedule.testDate, schedule.endTime))}, has been cancelled.\n\nYou will no longer be able to start this test.`, targetUserId, examId: test.id, examScheduleId: schedule.id, batchId: student.batchId, moduleId: test.module.id, createdBy: user.id });
    }
    const existing = notificationRows.length ? await tx.notification.findMany({ where: { kind: "EXAM_SCHEDULED", title: "Test Cancelled", examId: test.id, targetUserId: { in: notificationRows.map((row) => row.targetUserId) } }, select: { targetUserId: true } }) : [];
    const existingUsers = new Set(existing.map((row) => row.targetUserId));
    const uniqueRows = notificationRows.filter((row, index, rows) => !existingUsers.has(row.targetUserId) && rows.findIndex((item) => item.targetUserId === row.targetUserId) === index);
    if (uniqueRows.length) await tx.notification.createMany({ data: uniqueRows });
    return tx.exam.update({ where: { id: test.id }, data: { status: "CANCELLED" }, include: examInclude() });
  });
  return { ...cancelled, schedules: cancelled.schedules.map((schedule) => publicSchedule(schedule, new Date(), cancelled)) };
}

export async function createTest(user, payload = {}) {
  const courseId = text(payload.courseId);
  const moduleId = text(payload.moduleId);
  const marksPerQuestion = Number(payload.marksPerQuestion);
  const questions = (Array.isArray(payload.questions) ? payload.questions : []).map(normalizeQuestion);
  const schedules = Array.isArray(payload.schedules) ? payload.schedules : [];
  if (!courseId || !moduleId || !Number.isInteger(marksPerQuestion) || marksPerQuestion <= 0 || marksPerQuestion > 100) throw new AppError("Course, module, and a valid marks-per-question value are required.", 422);
  if (!questions.length) throw new AppError("At least one question is required.", 422);
  if (!schedules.length) throw new AppError("At least one batch schedule is required.", 422);
  const course = await assertFacultyCourse(user, courseId);
  const module = course.modules.find((item) => item.id === moduleId);
  if (!module) throw new AppError("Selected module does not belong to the selected course.", 422);
  const batchIds = schedules.map((item) => text(item.batchId));
  if (new Set(batchIds).size !== batchIds.length || batchIds.some((id) => !id)) throw new AppError("Each batch must be selected once.", 422);
  const ids = facultyIds(user);
  const batches = await prisma.branchBatch.findMany({ where: { AND: [{ id: { in: batchIds } }, { OR: [{ branchCourseId: courseId }, { courseId }] }, { OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] } });
  if (batches.length !== batchIds.length) throw new AppError("One or more batches are not assigned to this faculty for the selected course.", 403);
  const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
  const cycleByBatch = new Map(await Promise.all(batches.map(async (batch) => [batch.id, await activeSyllabusCycle(batch.id)])));
  const normalizedSchedules = schedules.map((item) => {
    const date = text(item.testDate);
    const startTime = text(item.startTime);
    const endTime = text(item.endTime);
    const start = scheduledDate(date, startTime);
    const end = scheduledDate(date, endTime);
    if (!start || !end || end <= start) throw new AppError("Every schedule must have a valid date and end time after its start time.", 422);
    return { branchBatchId: text(item.batchId), batchCycleId: cycleByBatch.get(text(item.batchId))?.id, testDate: date, startTime, endTime, status: "SCHEDULED", batch: batchMap.get(text(item.batchId)) };
  });
  const totalQuestions = questions.length;
  const created = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({ data: { title: text(payload.title) || "MCQ Test", branchCourseId: courseId, moduleId, facultyId: user.id, marksPerQuestion, totalQuestions, totalMarks: totalQuestions * marksPerQuestion, status: "SCHEDULED", questions: { create: questions }, schedules: { create: normalizedSchedules.map(({ batch, ...schedule }) => schedule) } }, include: examInclude(true) });
    const batchCodes = batches.map((batch) => text(batch.batchId)).filter(Boolean);
    const scopedBatchKeys = [...new Set([...batchIds, ...batchCodes])];
    const students = await tx.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: { in: scopedBatchKeys } }, { courseEnrollments: { some: { status: "ACTIVE", courseId, batchId: { in: scopedBatchKeys } } } }] }, select: { id: true, batchId: true, emailAddress: true, studentName: true, courseEnrollments: { where: { status: "ACTIVE", courseId }, select: { batchId: true } } } });
    const studentEmails = students.map((student) => text(student.emailAddress).toLowerCase()).filter(Boolean);
    const users = studentEmails.length ? await tx.user.findMany({ where: { role: "STUDENT", OR: studentEmails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } }) : [];
    const userByEmail = new Map(users.map((item) => [text(item.email).toLowerCase(), item.id]));
    const candidateNotifications = students.flatMap((student) => { const email = text(student.emailAddress).toLowerCase(); const targetUserId = userByEmail.get(email); if (!targetUserId) return []; const assignedBatchKeys = new Set([student.batchId, ...(student.courseEnrollments || []).map((enrollment) => enrollment.batchId)].filter(Boolean)); return exam.schedules.filter((schedule) => assignedBatchKeys.has(schedule.branchBatchId) || assignedBatchKeys.has(schedule.branchBatch?.batchId)).map((schedule) => { const start = scheduledDate(schedule.testDate, schedule.startTime); const end = scheduledDate(schedule.testDate, schedule.endTime); return { kind: "EXAM_SCHEDULED", tone: "blue", title: "New Test Scheduled", message: `You have a new test scheduled for ${course.name} - ${module.title} on ${cancellationDate(start)}, from ${cancellationTime(start)} to ${cancellationTime(end)}.\n\nPlease make sure to complete the test within the scheduled time.`, targetUserId, examId: exam.id, examScheduleId: schedule.id, batchId: schedule.branchBatchId, branchCourseId: courseId, createdBy: user.id }; }); });
    const existingNotifications = candidateNotifications.length ? await tx.notification.findMany({ where: { kind: "EXAM_SCHEDULED", examId: exam.id, examScheduleId: { in: candidateNotifications.map((item) => item.examScheduleId) }, targetUserId: { in: candidateNotifications.map((item) => item.targetUserId) } }, select: { targetUserId: true, examScheduleId: true } }) : [];
    const existingKeys = new Set(existingNotifications.map((item) => `${item.targetUserId}:${item.examScheduleId}`));
    const notificationRows = candidateNotifications.filter((item) => !existingKeys.has(`${item.targetUserId}:${item.examScheduleId}`));
    if (notificationRows.length) await tx.notification.createMany({ data: notificationRows });
    console.info("[EXAM CREATE]", { testId: exam.id, selectedBatchIds: batchIds, studentIds: students.map((student) => student.id), notificationsCreated: notificationRows.length });
    return exam;
  });
  return { ...created, schedules: created.schedules.map(publicSchedule) };
}

export async function createRetest(user, testId, scheduleId, payload = {}) {
  const originalSchedule = await facultySchedule(user, testId, scheduleId);
  if (originalSchedule.exam.isRetest) throw new AppError("A retest cannot be used to create another retest.", 422);
  if (statusForSchedule(originalSchedule) !== "EXPIRED") throw new AppError("Retest can be created only after the original test end time.", 409);
  const studentId = text(payload.studentId);
  const student = await prisma.branchStudent.findFirst({
    where: {
      id: studentId,
      recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } },
      OR: [
        { batchId: originalSchedule.branchBatchId },
        { batchId: originalSchedule.branchBatch.batchId },
        {
          courseEnrollments: {
            some: {
              status: "ACTIVE",
              batchId: { in: [originalSchedule.branchBatchId, originalSchedule.branchBatch.batchId] },
              ...(originalSchedule.batchCycleId ? { batchCycleId: originalSchedule.batchCycleId } : {}),
            },
          },
        },
      ],
    },
    select: { id: true, studentId: true, studentName: true, emailAddress: true, batchId: true },
  });
  if (!student) throw new AppError("Selected student does not belong to this test batch.", 403);
  const originalAttempt = await prisma.examAttempt.findUnique({ where: { scheduleId_branchStudentId: { scheduleId, branchStudentId: student.id } }, select: { status: true, submittedAt: true } });
  if (originalAttempt?.status === "SUBMITTED" || originalAttempt?.submittedAt) throw new AppError("A retest cannot be created for a student who already submitted the original test.", 409);
  const courseId = originalSchedule.exam.branchCourseId;
  const moduleId = originalSchedule.exam.moduleId;
  const marksPerQuestion = Number(payload.marksPerQuestion || originalSchedule.exam.marksPerQuestion);
  const sourceQuestions = Array.isArray(payload.questions) && payload.questions.length ? payload.questions : await prisma.examQuestion.findMany({ where: { examId: testId }, orderBy: { questionOrder: "asc" } });
  const questions = sourceQuestions.map(normalizeQuestion);
  const date = text(payload.testDate);
  const startTime = text(payload.startTime);
  const endTime = text(payload.endTime);
  const start = scheduledDate(date, startTime);
  const end = scheduledDate(date, endTime);
  if (!Number.isInteger(marksPerQuestion) || marksPerQuestion <= 0 || marksPerQuestion > 100 || !questions.length) throw new AppError("A valid retest mark and at least one question are required.", 422);
  if (!start || !end || end <= start) throw new AppError("Retest date and end time must be valid, with end time after start time.", 422);
  const created = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({ data: { title: text(payload.title) || `${originalSchedule.exam.title} - Retest`, branchCourseId: courseId, moduleId, facultyId: user.id, marksPerQuestion, totalQuestions: questions.length, totalMarks: questions.length * marksPerQuestion, status: "SCHEDULED", isRetest: true, originalTestId: testId, retestStudentId: student.id, questions: { create: questions }, schedules: { create: { branchBatchId: originalSchedule.branchBatchId, batchCycleId: originalSchedule.batchCycleId || (await activeSyllabusCycle(originalSchedule.branchBatchId, tx)).id, testDate: date, startTime, endTime, status: "SCHEDULED" } } }, include: examInclude(true) });
    const target = await tx.user.findFirst({ where: { role: "STUDENT", email: { equals: text(student.emailAddress).toLowerCase(), mode: "insensitive" } }, select: { id: true } });
    if (target) {
      const retestSchedule = exam.schedules[0];
      const retestStart = scheduledDate(retestSchedule.testDate, retestSchedule.startTime);
      const retestEnd = scheduledDate(retestSchedule.testDate, retestSchedule.endTime);
      await tx.notification.create({ data: { kind: "EXAM_RETEST_ASSIGNED", tone: "blue", title: "Retest Assigned", message: `A retest has been assigned to you for the ${exam.branchCourse.name} - ${exam.module.title} module, scheduled for ${cancellationDate(retestStart)}, from ${cancellationTime(retestStart)} to ${cancellationTime(retestEnd)}.\n\nPlease complete the retest within the scheduled time.`, actionLabel: "View test", targetUserId: target.id, createdBy: user.id, examId: exam.id, examScheduleId: retestSchedule.id, batchId: student.batchId } });
    }
    return exam;
  });
  return { ...created, isRetest: true, originalTestId: testId, retestStudentId: student.id, schedules: created.schedules.map(publicSchedule) };
}

export async function listFacultyRetests(user) {
  const rows = await prisma.exam.findMany({ where: { facultyId: user.id, isRetest: true }, include: { ...examInclude(), schedules: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } } } }, }, orderBy: { createdAt: "desc" } });
  const studentIds = rows.map((row) => row.retestStudentId).filter(Boolean);
  const students = studentIds.length ? await prisma.branchStudent.findMany({ where: { id: { in: studentIds } }, select: { id: true, studentId: true, studentName: true, emailAddress: true } }) : [];
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const completion = new Map();
  const visible = [];
  for (const row of rows) {
    const schedule = row.schedules[0];
    if (schedule && await batchCourseAndAcademicCompletion(schedule.branchBatchId, completion)) continue;
    visible.push({ ...row, student: studentMap.get(row.retestStudentId) || null, schedules: row.schedules.map(publicSchedule) });
  }
  return visible;
}

export async function cancelRetest(user, retestId) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const retest = await tx.exam.findFirst({ where: { id: retestId, facultyId: user.id, isRetest: true }, include: { branchCourse: { select: { id: true, name: true } }, module: { select: { id: true, title: true } }, retestStudent: { select: { id: true, batchId: true, emailAddress: true } }, schedules: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true } } }, orderBy: { testDate: "asc" } } } });
    if (!retest) throw new AppError("Retest not found.", 404);
    if (retest.status === "CANCELLED") throw new AppError("Retest has already been cancelled.", 409);
    const schedule = retest.schedules[0];
    const start = schedule ? scheduledDate(schedule.testDate, schedule.startTime) : null;
    if (!start || start <= new Date()) throw new AppError("This Retest cannot be cancelled because its scheduled start time has already passed.", 409);
    const target = retest.retestStudent?.emailAddress ? await tx.user.findFirst({ where: { role: "STUDENT", email: { equals: text(retest.retestStudent.emailAddress).toLowerCase(), mode: "insensitive" } }, select: { id: true } }) : null;
    if (target) {
      const existing = await tx.notification.findFirst({ where: { kind: "EXAM_SCHEDULED", title: "Retest Cancelled", examId: retest.id, targetUserId: target.id }, select: { id: true } });
      if (!existing) await tx.notification.create({ data: { kind: "EXAM_SCHEDULED", tone: "red", title: "Retest Cancelled", message: `Your Retest for the "${retest.module.title}" module, scheduled for ${cancellationWindow(start, scheduledDate(schedule.testDate, schedule.endTime))}, has been cancelled by the Faculty.`, targetUserId: target.id, examId: retest.id, examScheduleId: schedule.id, batchId: retest.retestStudent.batchId, moduleId: retest.module.id, createdBy: user.id } });
    }
    return tx.exam.update({ where: { id: retest.id }, data: { status: "CANCELLED" }, include: examInclude() });
  });
  return { ...cancelled, schedules: cancelled.schedules.map((schedule) => publicSchedule(schedule, new Date(), cancelled)) };
}

export async function updateTest(user, testId, payload = {}) {
  const existing = await prisma.exam.findFirst({ where: { id: testId, facultyId: user.id }, include: { schedules: true } });
  if (!existing) throw new AppError("Test not found.", 404);
  if (existing.status === "CANCELLED") throw new AppError("Cancelled tests cannot be edited.", 409);
  if (existing.schedules.some((schedule) => { const start = scheduledDate(schedule.testDate, schedule.startTime); return start && new Date() >= start; })) throw new AppError("This test can no longer be edited because the scheduled start time has been reached.", 409);
  const courseId = text(payload.courseId); const moduleId = text(payload.moduleId); const marksPerQuestion = Number(payload.marksPerQuestion);
  const questions = (Array.isArray(payload.questions) ? payload.questions : []).map(normalizeQuestion); const schedules = Array.isArray(payload.schedules) ? payload.schedules : [];
  if (!courseId || !moduleId || !Number.isInteger(marksPerQuestion) || marksPerQuestion <= 0 || marksPerQuestion > 100 || !questions.length || !schedules.length) throw new AppError("Complete all test fields, schedules, and questions before saving.", 422);
  const course = await assertFacultyCourse(user, courseId); if (!course.modules.some((item) => item.id === moduleId)) throw new AppError("Selected module does not belong to the selected course.", 422);
  const batchIds = schedules.map((item) => text(item.batchId)); const ids = facultyIds(user);
  const batches = await prisma.branchBatch.findMany({ where: { AND: [{ id: { in: batchIds } }, { OR: [{ branchCourseId: courseId }, { courseId }] }, { OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] } });
  if (batches.length !== batchIds.length || new Set(batchIds).size !== batchIds.length) throw new AppError("One or more batches are invalid or not assigned to this faculty.", 403);
  const cycleByBatch = new Map(await Promise.all(batches.map(async (batch) => [batch.id, await activeSyllabusCycle(batch.id)])));
  const normalizedSchedules = schedules.map((item) => { const start = scheduledDate(text(item.testDate), text(item.startTime)); const end = scheduledDate(text(item.testDate), text(item.endTime)); if (!start || !end || end <= start) throw new AppError("Every schedule must have a valid date and end time after its start time.", 422); return { branchBatchId: text(item.batchId), batchCycleId: cycleByBatch.get(text(item.batchId))?.id, testDate: text(item.testDate), startTime: text(item.startTime), endTime: text(item.endTime), status: "SCHEDULED" }; });
  const totalQuestions = questions.length;
  const updated = await prisma.$transaction(async (tx) => { await tx.examQuestion.deleteMany({ where: { examId: testId } }); await tx.examSchedule.deleteMany({ where: { examId: testId } }); return tx.exam.update({ where: { id: testId }, data: { title: text(payload.title) || "MCQ Test", branchCourseId: courseId, moduleId, marksPerQuestion, totalQuestions, totalMarks: totalQuestions * marksPerQuestion, questions: { create: questions }, schedules: { create: normalizedSchedules } }, include: examInclude(true) }); });
  return { ...updated, schedules: updated.schedules.map((schedule) => publicSchedule(schedule, new Date(), updated)) };
}

function studentScheduleWhere(student, scheduleId, batches) {
  const activeCycleIds = batches.flatMap((batch) => (batch.cycles || []).map((cycle) => cycle.id));
  return {
    id: scheduleId,
    OR: [{ branchBatchId: { in: batches.map((batch) => batch.id) }, ...(activeCycleIds.length ? { batchCycleId: { in: activeCycleIds } } : {}) }, { exam: { isRetest: true, retestStudentId: student.id } }],
    exam: { OR: [{ isRetest: false }, { isRetest: true, retestStudentId: student.id }] },
  };
}

export async function listStudentTests(user, courseId = "") {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student, courseId);
  const activeCycleIds = batches.flatMap((batch) => (batch.cycles || []).map((cycle) => cycle.id));
  const schedules = await prisma.examSchedule.findMany({ where: { OR: [{ branchBatchId: { in: batches.map((batch) => batch.id) }, ...(activeCycleIds.length ? { batchCycleId: { in: activeCycleIds } } : {}) }, { exam: { isRetest: true, retestStudentId: student.id, ...(courseId ? { branchCourseId: courseId } : {}) } }], exam: { OR: [{ isRetest: false }, { isRetest: true, retestStudentId: student.id }] } }, include: { exam: { include: examInclude() }, attempts: { where: { branchStudentId: student.id }, select: { id: true, status: true, submittedAt: true, obtainedMarks: true, totalMarks: true, percentage: true } } }, orderBy: [{ testDate: "asc" }, { startTime: "asc" }] });
  const moduleStarts = new Map();
  for (const schedule of schedules) {
    const moduleId = schedule.exam?.moduleId;
    if (moduleId && !moduleStarts.has(`${schedule.branchBatchId}:${moduleId}`)) moduleStarts.set(`${schedule.branchBatchId}:${moduleId}`, await syllabusCycleStart(schedule.branchBatchId, schedule.exam.branchCourseId, moduleId, "TEST"));
  }
  const currentSchedules = schedules.filter((schedule) => schedule.exam?.isRetest || !moduleStarts.get(`${schedule.branchBatchId}:${schedule.exam?.moduleId}`) || new Date(schedule.exam.createdAt) >= new Date(moduleStarts.get(`${schedule.branchBatchId}:${schedule.exam?.moduleId}`)));
  return currentSchedules.map((schedule) => ({ id: schedule.id, testId: schedule.examId, title: schedule.exam.title, course: schedule.exam.branchCourse, module: schedule.exam.module, totalQuestions: schedule.exam.totalQuestions, marksPerQuestion: schedule.exam.marksPerQuestion, totalMarks: schedule.exam.totalMarks, isRetest: schedule.exam.isRetest, originalTestId: schedule.exam.originalTestId, ...publicSchedule(schedule, new Date(), schedule.exam), attempt: schedule.attempts[0] || null }));
}

export async function getStudentTest(user, scheduleId) {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student);
  const schedule = await prisma.examSchedule.findFirst({ where: studentScheduleWhere(student, scheduleId, batches), include: { branchBatch: true, exam: { include: examInclude(true) } } });
  if (!schedule) throw new AppError("Test not found or you are not enrolled in its batch.", 404);
  const cycleStart = await syllabusCycleStart(schedule.branchBatchId, schedule.exam.branchCourseId, schedule.exam.moduleId, "TEST");
  if (!schedule.exam.isRetest && cycleStart && new Date(schedule.exam.createdAt) < new Date(cycleStart)) throw new AppError("This test belongs to a completed cycle.", 404);
  const status = publicSchedule(schedule, new Date(), schedule.exam).status;
  return { id: schedule.id, testId: schedule.examId, title: schedule.exam.title, course: schedule.exam.branchCourse, module: schedule.exam.module, batch: schedule.branchBatch, totalQuestions: schedule.exam.totalQuestions, marksPerQuestion: schedule.exam.marksPerQuestion, totalMarks: schedule.exam.totalMarks, ...publicSchedule(schedule, new Date(), schedule.exam), questions: status === "AVAILABLE" ? schedule.exam.questions.map(({ correctAnswer, ...question }) => question) : [] };
}

export async function startTest(user, scheduleId) {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student);
  const schedule = await prisma.examSchedule.findFirst({ where: studentScheduleWhere(student, scheduleId, batches), include: { exam: true } });
  if (!schedule) throw new AppError("Test not found or you are not enrolled in its batch.", 404);
  if (schedule.exam.status === "CANCELLED" || schedule.status === "CANCELLED") throw new AppError("This test has been cancelled and cannot be started.", 403);
  if (statusForSchedule(schedule) !== "AVAILABLE") throw new AppError("This test is not currently available.", 403);
  const attempt = await prisma.examAttempt.upsert({ where: { scheduleId_branchStudentId: { scheduleId, branchStudentId: student.id } }, update: {}, create: { examId: schedule.examId, scheduleId, branchStudentId: student.id, studentUserId: user.id, totalQuestions: schedule.exam.totalQuestions, totalMarks: schedule.exam.totalMarks } });
  return { id: attempt.id, scheduleId, startedAt: attempt.startedAt, status: attempt.status, totalQuestions: attempt.totalQuestions, totalMarks: attempt.totalMarks };
}

export async function submitTest(user, scheduleId, payload = {}) {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student);
  const schedule = await prisma.examSchedule.findFirst({ where: studentScheduleWhere(student, scheduleId, batches), include: { exam: { include: { questions: { orderBy: { questionOrder: "asc" } } } } } });
  if (!schedule) throw new AppError("Test not found or you are not enrolled in its batch.", 404);
  if (schedule.exam.status === "CANCELLED" || schedule.status === "CANCELLED") throw new AppError("This test has been cancelled and cannot be submitted.", 403);
  if (statusForSchedule(schedule) === "EXPIRED") throw new AppError("Test time has expired.", 403);
  const attempt = await prisma.examAttempt.findUnique({ where: { scheduleId_branchStudentId: { scheduleId, branchStudentId: student.id } } });
  if (!attempt || attempt.status === "SUBMITTED") throw new AppError("This test attempt is not available for submission.", 409);
  const selected = payload.answers && typeof payload.answers === "object" ? payload.answers : {};
  const evaluated = schedule.exam.questions.map((question) => { const answer = text(selected[question.id]).toUpperCase(); const isCorrect = Boolean(answer) && answer === question.correctAnswer; return { questionId: question.id, selectedAnswer: answer || null, isCorrect, marksAwarded: isCorrect ? schedule.exam.marksPerQuestion : 0 }; });
  const attemptedQuestions = evaluated.filter((item) => item.selectedAnswer).length;
  const correctAnswers = evaluated.filter((item) => item.isCorrect).length;
  const obtainedMarks = evaluated.reduce((sum, item) => sum + item.marksAwarded, 0);
  const submittedAt = new Date();
  const result = await prisma.$transaction(async (tx) => { await tx.examAnswer.deleteMany({ where: { attemptId: attempt.id } }); await tx.examAnswer.createMany({ data: evaluated.map((item) => ({ ...item, attemptId: attempt.id })) }); return tx.examAttempt.update({ where: { id: attempt.id }, data: { status: "SUBMITTED", submittedAt, timeTakenSeconds: Math.max(0, Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)), attemptedQuestions, correctAnswers, wrongAnswers: attemptedQuestions - correctAnswers, unansweredQuestions: evaluated.length - attemptedQuestions, obtainedMarks, percentage: schedule.exam.totalMarks ? (obtainedMarks / schedule.exam.totalMarks) * 100 : 0 } }); });
  return result;
}

export async function getStudentResult(user, scheduleId) {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student);
  const accessibleSchedule = await prisma.examSchedule.findFirst({ where: studentScheduleWhere(student, scheduleId, batches), select: { id: true } });
  if (!accessibleSchedule) throw new AppError("Test result not found or you are not enrolled in its batch.", 404);
  const attempt = await prisma.examAttempt.findFirst({ where: { scheduleId, branchStudentId: student.id, status: "SUBMITTED" }, include: { exam: { include: { branchCourse: true, module: true } }, schedule: { include: { branchBatch: true } }, answers: { include: { question: true }, orderBy: { question: { questionOrder: "asc" } } } } });
  if (!attempt) throw new AppError("Submitted result not found.", 404);
  return { ...attempt, answers: attempt.answers.map(({ question, ...answer }) => ({ ...answer, question: { id: question.id, question: question.question, optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD } })) };
}

async function facultySchedule(user, testId, scheduleId) {
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, examId: testId, exam: { facultyId: user.id } }, include: { exam: true, branchBatch: true, batchCycle: true } });
  if (!schedule) throw new AppError("Test schedule not found.", 404);
  return schedule;
}

export async function listSubmissions(user, testId, scheduleId) {
  const schedule = await facultySchedule(user, testId, scheduleId);
  const studentWhere = { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: schedule.batchCycleId ? [{ courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [schedule.branchBatchId, schedule.branchBatch.batchId] }, batchCycleId: schedule.batchCycleId } } }] : [{ batchId: schedule.branchBatchId }, { batchId: schedule.branchBatch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [schedule.branchBatchId, schedule.branchBatch.batchId] } } } }], ...(schedule.exam.isRetest && schedule.exam.retestStudentId ? { id: schedule.exam.retestStudentId } : {}) };
  const [students, attempts] = await Promise.all([
    prisma.branchStudent.findMany({ where: studentWhere, select: { id: true, studentId: true, studentName: true, emailAddress: true }, orderBy: { studentName: "asc" } }),
    prisma.examAttempt.findMany({ where: { scheduleId: schedule.id }, include: { branchStudent: { select: { id: true, studentId: true, studentName: true, emailAddress: true } } }, orderBy: { submittedAt: "desc" } }),
  ]);
  const attemptsByStudent = new Map(attempts.map((attempt) => [attempt.branchStudentId, attempt]));
  return students.map((student) => attemptsByStudent.get(student.id) || { id: `pending-${student.id}`, scheduleId: schedule.id, examId: testId, branchStudentId: student.id, branchStudent: student, status: "NOT_STARTED", correctAnswers: 0, wrongAnswers: 0, unansweredQuestions: schedule.exam.totalQuestions, obtainedMarks: 0, totalMarks: schedule.exam.totalMarks, percentage: 0, submittedAt: null });
}

export async function getSubmission(user, testId, scheduleId, attemptId) {
  await facultySchedule(user, testId, scheduleId);
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, scheduleId }, include: { branchStudent: true, exam: true, answers: { include: { question: true }, orderBy: { question: { questionOrder: "asc" } } } } });
  if (!attempt) throw new AppError("Submission not found.", 404);
  return attempt;
}

const assessmentInclude = {
  originalAssessment: { select: { id: true, assessmentName: true } },
  branchCourse: { select: { id: true, name: true, courseCode: true } },
  module: { select: { id: true, title: true } },
  branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } },
  batchCycle: { select: { id: true, cycleNumber: true, cycleName: true, status: true } },
  reassessmentStudent: { select: { id: true, studentId: true, studentName: true } },
};

function assessmentStatus(item, now = new Date()) {
  if (now < new Date(item.startDate)) return "UPCOMING";
  if (now <= new Date(item.endDate)) return "ACTIVE";
  return "CLOSED";
}

async function facultyAssessment(user, assessmentId) {
  const item = await prisma.assessment.findFirst({ where: { id: assessmentId, facultyId: user.id }, include: assessmentInclude });
  if (!item) throw new AppError("Assessment not found.", 404);
  return item;
}

function assessmentPublic(item, submission = null) {
  return { ...item, status: isAssessmentCancelled(item) ? "CANCELLED" : assessmentStatus(item), submission: submission || null };
}

export async function listFacultyAssessments(user) {
  const rows = await prisma.assessment.findMany({ where: { facultyId: user.id }, include: assessmentInclude, orderBy: { createdAt: "desc" } });
  const current = [];
  for (const row of rows) {
    const completed = await batchCourseAndAcademicCompletion(row.branchBatchId);
    if (completed) continue;
    const currentCycle = await activeSyllabusCycle(row.branchBatchId);
    if (row.batchCycleId && currentCycle?.id !== row.batchCycleId) continue;
    const start = await syllabusCycleStart(row.branchBatchId, row.branchCourseId, row.moduleId, "ASSESSMENT");
    if (!start || row.createdAt >= start || row.isReassessment || !completed) current.push(row);
  }
  return current.map((row) => assessmentPublic(row));
}

export async function getFacultyAssessment(user, assessmentId) { return assessmentPublic(await facultyAssessment(user, assessmentId)); }

export async function cancelAssessment(user, assessmentId) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.findFirst({ where: { id: assessmentId, facultyId: user.id }, include: assessmentInclude });
    if (!assessment) throw new AppError("Assessment not found.", 404);
    if (isAssessmentCancelled(assessment)) throw new AppError("Assessment has already been cancelled.", 409);
    if (new Date(assessment.startDate) <= new Date()) throw new AppError("This assessment cannot be cancelled after its start date and time.", 409);
    const students = await tx.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: assessment.branchBatch.id }, { batchId: assessment.branchBatch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [assessment.branchBatch.id, assessment.branchBatch.batchId] } } } }] }, select: { batchId: true, emailAddress: true } });
    const emails = students.map((student) => text(student.emailAddress).toLowerCase()).filter(Boolean);
    const users = emails.length ? await tx.user.findMany({ where: { role: "STUDENT", OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } }) : [];
    const userByEmail = new Map(users.map((item) => [text(item.email).toLowerCase(), item.id]));
    const notificationRows = students.map((student) => {
      const targetUserId = userByEmail.get(text(student.emailAddress).toLowerCase());
      return targetUserId ? { kind: "ASSESSMENT_AVAILABLE", tone: "red", title: "Assessment Cancelled", message: `Your "${assessment.assessmentName}" for the "${assessment.module.title}" module, scheduled for ${cancellationWindow(assessment.startDate, assessment.endDate)}, has been cancelled.\n\nYou will no longer be able to start this assessment.`, targetUserId, assessmentId: assessment.id, batchId: student.batchId, branchCourseId: assessment.branchCourseId, moduleId: assessment.moduleId, createdBy: user.id } : null;
    }).filter(Boolean);
    const existing = notificationRows.length ? await tx.notification.findMany({ where: { kind: "ASSESSMENT_AVAILABLE", title: "Assessment Cancelled", assessmentId: assessment.id, targetUserId: { in: notificationRows.map((row) => row.targetUserId) } }, select: { targetUserId: true } }) : [];
    const existingUsers = new Set(existing.map((row) => row.targetUserId));
    const uniqueRows = notificationRows.filter((row, index, rows) => !existingUsers.has(row.targetUserId) && rows.findIndex((item) => item.targetUserId === row.targetUserId) === index);
    if (uniqueRows.length) await tx.notification.createMany({ data: uniqueRows });
    return tx.assessment.update({ where: { id: assessment.id }, data: { details: `[CANCELLED] ${text(assessment.details)}`.trim() }, include: assessmentInclude });
  });
  return assessmentPublic(cancelled);
}

export async function cancelReassessment(user, reassessmentId) {
  const cancelled = await prisma.$transaction(async (tx) => {
    const reassessment = await tx.assessment.findFirst({ where: { id: reassessmentId, facultyId: user.id, isReassessment: true }, include: assessmentInclude });
    if (!reassessment) throw new AppError("Reassessment not found.", 404);
    if (isAssessmentCancelled(reassessment)) throw new AppError("Reassessment has already been cancelled.", 409);
    if (new Date(reassessment.startDate) <= new Date()) throw new AppError("This Reassessment cannot be cancelled because its scheduled start time has already passed.", 409);
    const target = reassessment.reassessmentStudent?.id ? await tx.branchStudent.findUnique({ where: { id: reassessment.reassessmentStudent.id }, select: { batchId: true, emailAddress: true } }) : null;
    const targetUser = target?.emailAddress ? await tx.user.findFirst({ where: { role: "STUDENT", email: { equals: text(target.emailAddress).toLowerCase(), mode: "insensitive" } }, select: { id: true } }) : null;
    if (targetUser) {
      const existing = await tx.notification.findFirst({ where: { kind: "ASSESSMENT_AVAILABLE", title: "Reassessment Cancelled", assessmentId: reassessment.id, targetUserId: targetUser.id }, select: { id: true } });
      if (!existing) await tx.notification.create({ data: { kind: "ASSESSMENT_AVAILABLE", tone: "red", title: "Reassessment Cancelled", message: `Your Reassessment for the "${reassessment.module.title}" module, scheduled for ${cancellationWindow(reassessment.startDate, reassessment.endDate)}, has been cancelled by the Faculty.`, targetUserId: targetUser.id, assessmentId: reassessment.id, batchId: target?.batchId, branchCourseId: reassessment.branchCourseId, moduleId: reassessment.moduleId, createdBy: user.id } });
    }
    return tx.assessment.update({ where: { id: reassessment.id }, data: { details: `[CANCELLED] ${text(reassessment.details)}`.trim() }, include: assessmentInclude });
  });
  return assessmentPublic(cancelled);
}

function assessmentDates(payload) {
  const startValue = text(payload.startDate);
  const endValue = text(payload.endDate);
  const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const startMatch = startValue.match(datePattern);
  const endMatch = endValue.match(datePattern);
  if (!startMatch || !endMatch) throw new AppError("Start date and end date are required.", 422);
  const startDay = Date.UTC(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3]));
  const endDay = Date.UTC(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3]));
  if (endDay < startDay) throw new AppError("End date cannot be before start date.", 422);
  const oneDay = endDay === startDay;
  const startMinutes = oneDay ? parseTime(payload.startTime) : 0;
  const endMinutes = oneDay ? parseTime(payload.endTime) : (23 * 60 + 59);
  if (oneDay && (startMinutes == null || endMinutes == null || endMinutes <= startMinutes)) throw new AppError("For a one-day assessment, end time must be after start time.", 422);
  const startDate = new Date(`${startValue}T${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}:00+05:30`);
  const endDate = new Date(`${endValue}T${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}:59+05:30`);
  return { startDate, endDate };
}

async function validateAssessmentScope(user, payload) {
  const course = await assertFacultyCourse(user, text(payload.courseId));
  const module = course.modules.find((item) => item.id === text(payload.moduleId));
  if (!module) throw new AppError("Selected module does not belong to the selected course.", 422);
  const ids = facultyIds(user);
  const batch = await prisma.branchBatch.findFirst({ where: { AND: [{ id: text(payload.batchId) }, { OR: [{ branchCourseId: course.id }, { courseId: course.id }] }, { OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] }, include: { branchCourse: true } });
  if (!batch) throw new AppError("Selected batch is not assigned to this faculty.", 403);
  return { course, module, batch };
}

export async function createAssessment(user, payload = {}) {
  const assessmentName = text(payload.assessmentName);
  const totalMarks = Number(payload.totalMarks);
  if (!assessmentName || !text(payload.courseId) || !text(payload.moduleId) || !text(payload.batchId) || !Number.isInteger(totalMarks) || totalMarks <= 0) throw new AppError("Assessment name, course, module, batch, and positive total marks are required.", 422);
  const dates = assessmentDates(payload);
  const { course, module, batch } = await validateAssessmentScope(user, payload);
  const batchCycle = await activeSyllabusCycle(batch.id);
  const created = await prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({ data: { assessmentName, branchCourseId: course.id, moduleId: module.id, branchBatchId: batch.id, batchCycleId: batchCycle.id, totalMarks, startDate: dates.startDate, endDate: dates.endDate, details: text(payload.details) || null, facultyId: user.id }, include: assessmentInclude });
    const students = await tx.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: batch.id }, { batchId: batch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } } } }] }, select: { id: true, emailAddress: true } });
    const emails = students.map((s) => text(s.emailAddress).toLowerCase()).filter(Boolean);
    const users = emails.length ? await tx.user.findMany({ where: { role: "STUDENT", OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } }) : [];
    const byEmail = new Map(users.map((item) => [text(item.email).toLowerCase(), item.id]));
    const scheduleMessage = `A new assessment, \"${assessmentName}\", is available for ${course.name} - ${module.title}.\n\nTotal Marks: ${totalMarks}\nScheduled: ${cancellationDate(dates.startDate)}, ${cancellationTime(dates.startDate)} – ${cancellationTime(dates.endDate)}\n\nPlease complete the assessment within the scheduled time.`;
    const rows = students.map((student) => { const targetUserId = byEmail.get(text(student.emailAddress).toLowerCase()); return targetUserId ? { kind: "ASSESSMENT_AVAILABLE", tone: "blue", title: "New Assessment Available", message: scheduleMessage, targetUserId, assessmentId: assessment.id, batchId: batch.id, branchCourseId: course.id, moduleId: module.id, createdBy: user.id } : null; }).filter(Boolean);
    if (rows.length) await tx.notification.createMany({ data: rows });
    return assessment;
  });
  return assessmentPublic(created);
}

export async function updateAssessment(user, assessmentId, payload = {}) {
  const existing = await facultyAssessment(user, assessmentId);
  if (isAssessmentCancelled(existing)) throw new AppError("Cancelled assessments cannot be edited.", 409);
  if (new Date() >= new Date(existing.startDate)) throw new AppError("This assessment can no longer be edited after its scheduled start date and time.", 409);
  const dates = assessmentDates(payload);
  const { course, module, batch } = await validateAssessmentScope(user, payload);
  const totalMarks = Number(payload.totalMarks);
  if (!Number.isInteger(totalMarks) || totalMarks <= 0) throw new AppError("Total marks must be greater than zero.", 422);
  return assessmentPublic(await prisma.assessment.update({ where: { id: assessmentId }, data: { assessmentName: text(payload.assessmentName), branchCourseId: course.id, moduleId: module.id, branchBatchId: batch.id, totalMarks, startDate: dates.startDate, endDate: dates.endDate, details: text(payload.details) || null }, include: assessmentInclude }));
}

export async function createReassessment(user, assessmentId, payload = {}) {
  const original = await facultyAssessment(user, assessmentId);
  if (original.isReassessment) throw new AppError("A reassessment cannot be created from another reassessment.", 422);
  if (assessmentStatus(original) !== "CLOSED") throw new AppError("Reassessment can be created only after the original assessment end time.", 409);
  const student = await prisma.branchStudent.findFirst({ where: { id: text(payload.studentId), recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: original.branchBatch.id }, { batchId: original.branchBatch.batchId }] }, select: { id: true, studentName: true, emailAddress: true, batchId: true } });
  if (!student) throw new AppError("Selected student does not belong to this assessment batch.", 403);
  const existingReassessment = await prisma.assessment.findFirst({ where: { originalAssessmentId: assessmentId, reassessmentStudentId: student.id } });
  if (existingReassessment) throw new AppError("A reassessment has already been created for this student.", 409);
  const originalSubmission = await prisma.assessmentSubmission.findUnique({ where: { assessmentId_branchStudentId: { assessmentId, branchStudentId: student.id } }, select: { status: true, submittedAt: true } });
  if (originalSubmission?.status === "SUBMITTED" || originalSubmission?.status === "EVALUATED" || originalSubmission?.submittedAt) throw new AppError("A reassessment cannot be created for a student who already submitted the original assessment.", 409);
  const dates = assessmentDates(payload);
  const startDate = dates.startDate;
  const endDate = dates.endDate;
  const totalMarks = Number(payload.totalMarks || original.totalMarks);
  if (!Number.isInteger(totalMarks) || totalMarks <= 0) throw new AppError("Total marks must be greater than zero.", 422);
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.assessment.create({ data: { assessmentName: text(payload.assessmentName) || `${original.assessmentName} - Reassessment`, branchCourseId: original.branchCourseId, moduleId: original.moduleId, branchBatchId: original.branchBatchId, batchCycleId: original.batchCycleId || (await activeSyllabusCycle(original.branchBatchId, tx)).id, totalMarks, startDate, endDate, details: text(payload.details) || original.details, facultyId: user.id, isReassessment: true, originalAssessmentId: assessmentId, reassessmentStudentId: student.id }, include: assessmentInclude });
    const target = await tx.user.findFirst({ where: { role: "STUDENT", email: { equals: text(student.emailAddress).toLowerCase(), mode: "insensitive" } }, select: { id: true } });
    if (target) await tx.notification.create({ data: { kind: "ASSESSMENT_REASSESSMENT_ASSIGNED", tone: "blue", title: "Reassessment Assigned", message: `A reassessment has been assigned to you for the ${item.branchCourse.name} - ${item.module.title} module, scheduled for ${cancellationDate(item.startDate)}, from ${cancellationTime(item.startDate)} to ${cancellationTime(item.endDate)}.\n\nPlease complete the reassessment within the scheduled time.`, actionLabel: "View assessment", targetUserId: target.id, assessmentId: item.id, batchId: student.batchId, branchCourseId: item.branchCourseId, moduleId: item.moduleId, createdBy: user.id } });
    return item;
  });
  return assessmentPublic(created);
}

async function assessmentStudents(user, assessmentId) {
  const assessment = await facultyAssessment(user, assessmentId);
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: assessment.batchCycleId ? [{ courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [assessment.branchBatch.id, assessment.branchBatch.batchId] }, batchCycleId: assessment.batchCycleId } } }] : [{ batchId: assessment.branchBatch.id }, { batchId: assessment.branchBatch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [assessment.branchBatch.id, assessment.branchBatch.batchId] } } } }], ...(assessment.isReassessment && assessment.reassessmentStudentId ? { id: assessment.reassessmentStudentId } : {}) }, select: { id: true, studentId: true, studentName: true, emailAddress: true }, orderBy: { studentName: "asc" } });
  const submissions = await prisma.assessmentSubmission.findMany({ where: { assessmentId }, include: { evaluator: { select: { fullName: true } } } });
  const byStudent = new Map(submissions.map((row) => [row.branchStudentId, row]));
  return students.map((student) => { const submission = byStudent.get(student.id); return { student, ...(submission || { id: `pending-${student.id}`, status: "NOT_SUBMITTED", submittedAt: null, marksObtained: null, feedback: null, evaluatedAt: null, evaluatedBy: null }) }; });
}
export async function listAssessmentStudents(user, assessmentId) { return assessmentStudents(user, assessmentId); }
export async function listAssessmentSubmissions(user, assessmentId) { return assessmentStudents(user, assessmentId); }

export async function evaluateAssessment(user, assessmentId, studentId, payload = {}) {
  await facultyAssessment(user, assessmentId);
  const marks = Number(payload.marksObtained);
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!Number.isInteger(marks) || marks < 0 || marks > assessment.totalMarks) throw new AppError("Marks must be between zero and total marks.", 422);
  const row = await prisma.assessmentSubmission.upsert({ where: { assessmentId_branchStudentId: { assessmentId, branchStudentId: studentId } }, create: { assessmentId, branchStudentId: studentId, status: "EVALUATED", evaluationStatus: "Evaluated", marksObtained: marks, feedback: text(payload.feedback) || null, evaluatedBy: user.id, evaluatedAt: new Date() }, update: { status: "EVALUATED", evaluationStatus: "Evaluated", marksObtained: marks, feedback: text(payload.feedback) || null, evaluatedBy: user.id, evaluatedAt: new Date() } });
  return { ...row, percentage: assessment.totalMarks ? (marks / assessment.totalMarks) * 100 : 0 };
}

export async function evaluateAssessmentSubmission(user, submissionId, payload = {}) {
  const submission = await prisma.assessmentSubmission.findUnique({ where: { id: submissionId }, include: { assessment: true } });
  if (!submission) throw new AppError("Assessment submission not found.", 404);
  if (submission.assessment.facultyId !== user.id) throw new AppError("You are not authorized to evaluate this submission.", 403);
  const marks = Number(payload.marks);
  if (!Number.isInteger(marks) || marks < 0 || marks > submission.assessment.totalMarks) throw new AppError("Marks must be between zero and total marks.", 422);
  return prisma.assessmentSubmission.update({ where: { id: submissionId }, data: { marksObtained: marks, feedback: text(payload.facultyFeedback) || null, evaluatedBy: user.id, evaluatedAt: new Date(), status: "EVALUATED", evaluationStatus: "Evaluated" } });
}

async function studentAssessment(user, assessmentId) {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student);
  const activeCycleIds = batches.flatMap((batch) => (batch.cycles || []).map((cycle) => cycle.id));
  const item = await prisma.assessment.findFirst({ where: { id: assessmentId, branchBatchId: { in: batches.map((batch) => batch.id) }, ...(activeCycleIds.length ? { batchCycleId: { in: activeCycleIds } } : {}), OR: [{ isReassessment: false }, { isReassessment: true, reassessmentStudentId: student.id }] }, include: assessmentInclude });
  if (!item) throw new AppError("Assessment not found or you are not enrolled in its batch.", 404);
  const cycleStart = await syllabusCycleStart(item.branchBatchId, item.branchCourseId, item.moduleId, "ASSESSMENT");
  if (!item.isReassessment && cycleStart && new Date(item.createdAt) < new Date(cycleStart)) throw new AppError("This assessment belongs to a completed cycle.", 404);
  return { student, item };
}
export async function listStudentAssessments(user, courseId = "") {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student, courseId);
  const activeCycleIds = batches.flatMap((batch) => (batch.cycles || []).map((cycle) => cycle.id));
  const rows = await prisma.assessment.findMany({ where: { branchBatchId: { in: batches.map((batch) => batch.id) }, ...(activeCycleIds.length ? { batchCycleId: { in: activeCycleIds } } : {}), ...(courseId ? { branchCourseId: courseId } : {}), OR: [{ isReassessment: false }, { isReassessment: true, reassessmentStudentId: student.id }] }, include: { ...assessmentInclude, submissions: { where: { branchStudentId: student.id } } }, orderBy: { startDate: "asc" } });
  const moduleStarts = new Map();
  for (const row of rows) if (!moduleStarts.has(`${row.branchBatchId}:${row.moduleId}`)) moduleStarts.set(`${row.branchBatchId}:${row.moduleId}`, await syllabusCycleStart(row.branchBatchId, row.branchCourseId, row.moduleId, "ASSESSMENT"));
  const currentRows = rows.filter((row) => row.isReassessment || !moduleStarts.get(`${row.branchBatchId}:${row.moduleId}`) || new Date(row.createdAt) >= new Date(moduleStarts.get(`${row.branchBatchId}:${row.moduleId}`)));
  return currentRows.map((row) => assessmentPublic(row, row.submissions[0] ? { ...row.submissions[0], percentage: row.totalMarks && row.submissions[0].marksObtained != null ? (row.submissions[0].marksObtained / row.totalMarks) * 100 : null } : null));
}
export async function getStudentAssessment(user, assessmentId) { const { item } = await studentAssessment(user, assessmentId); return assessmentPublic(item); }
export async function submitAssessment(user, assessmentId, payload = {}, files = []) {
  const { student, item } = await studentAssessment(user, assessmentId);
  if (isAssessmentCancelled(item)) throw new AppError("This assessment has been cancelled and cannot be submitted.", 403);
  if (assessmentStatus(item) !== "ACTIVE") throw new AppError("This assessment is outside its submission window.", 403);
  if (!text(payload.response)) throw new AppError("Assessment response is required.", 422);
  const existing = await prisma.assessmentSubmission.findUnique({ where: { assessmentId_branchStudentId: { assessmentId, branchStudentId: student.id } } });
  if (existing?.submittedAt) throw new AppError("Duplicate submission is not allowed.", 409);
  await fs.mkdir(assessmentUploadRoot, { recursive: true });
  const attachments = [];
  for (const file of files) {
    const extension = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
    const fileName = `${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(assessmentUploadRoot, fileName), file.buffer);
    attachments.push({ url: `/exams/student/assessments/submissions/${fileName}/screenshot`, fileName: file.originalname, mimeType: file.mimetype });
  }
  const first = attachments[0];
  return prisma.assessmentSubmission.upsert({ where: { assessmentId_branchStudentId: { assessmentId, branchStudentId: student.id } }, create: { assessmentId, branchStudentId: student.id, response: text(payload.response), screenshotUrl: first?.url || null, screenshotFileName: attachments.length ? JSON.stringify(attachments) : null, screenshotMimeType: attachments.length ? "application/json" : null, submittedAt: new Date(), status: "SUBMITTED", evaluationStatus: "Pending" }, update: { response: text(payload.response), screenshotUrl: first?.url || null, screenshotFileName: attachments.length ? JSON.stringify(attachments) : null, screenshotMimeType: attachments.length ? "application/json" : null, submittedAt: new Date(), status: "SUBMITTED", evaluationStatus: "Pending" } });
}
export async function getStudentAssessmentSubmission(user, assessmentId) { const { student, item } = await studentAssessment(user, assessmentId); const row = await prisma.assessmentSubmission.findUnique({ where: { assessmentId_branchStudentId: { assessmentId, branchStudentId: student.id } } }); return row ? { ...row, screenshotUrls: submissionAttachments(row), percentage: row.marksObtained != null ? (row.marksObtained / item.totalMarks) * 100 : null } : null; }

export async function getStudentAssessmentReports(user, courseId = "") {
  const student = await assertStudent(user);
  const batches = await studentExamBatches(student, courseId);
  const activeCycleIds = batches.flatMap((batch) => (batch.cycles || []).map((cycle) => cycle.id));
  const assessments = await prisma.assessment.findMany({
    where: { branchBatchId: { in: batches.map((batch) => batch.id) }, ...(activeCycleIds.length ? { batchCycleId: { in: activeCycleIds } } : {}), ...(courseId ? { branchCourseId: courseId } : {}), OR: [{ isReassessment: false }, { isReassessment: true, reassessmentStudentId: student.id }] },
    include: {
      branchCourse: { select: { id: true, name: true } },
      module: { select: { id: true, title: true } },
      branchBatch: { select: { id: true, batchId: true, batchName: true } },
      submissions: { where: { branchStudentId: student.id }, select: { status: true, submittedAt: true, marksObtained: true, feedback: true } },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });
  const modules = new Map();
  assessments.forEach((assessment) => {
    const key = `${assessment.branchCourseId}:${assessment.moduleId}`;
    const group = modules.get(key) || { moduleId: assessment.moduleId, moduleName: assessment.module.title, courseId: assessment.branchCourseId, courseName: assessment.branchCourse.name, batchId: assessment.branchBatch.id, batchName: assessment.branchBatch.batchName, totalAssessments: 0, assessments: [], overallMarksObtained: 0, overallTotalMarks: 0 };
    const submission = assessment.submissions[0];
    const evaluated = submission?.status === "EVALUATED" && submission.marksObtained != null;
    const submitted = Boolean(submission?.submittedAt);
    const marksObtained = evaluated ? Number(submission.marksObtained) : null;
    group.totalAssessments += 1;
    group.assessments.push({ assessmentId: assessment.id, assessmentName: assessment.assessmentName, marksObtained, totalMarks: assessment.totalMarks, percentage: evaluated ? (marksObtained / assessment.totalMarks) * 100 : null, status: evaluated ? "EVALUATED" : submitted ? "PENDING_EVALUATION" : "NOT_SUBMITTED", submittedAt: submission?.submittedAt || null, feedback: submission?.feedback || null });
    if (evaluated) { group.overallMarksObtained += marksObtained; group.overallTotalMarks += assessment.totalMarks; }
    modules.set(key, group);
  });
  return { student: { id: student.id, name: student.studentName }, modules: Array.from(modules.values()).map((group) => ({ ...group, overallPercentage: group.overallTotalMarks ? (group.overallMarksObtained / group.overallTotalMarks) * 100 : null })) };
}

export async function getAssessmentScreenshot(user, fileName) {
  const requested = text(fileName);
  const submissions = await prisma.assessmentSubmission.findMany({ include: { assessment: true } });
  const submission = submissions.find((item) => submissionAttachments(item).some((attachment) => attachment.url?.endsWith(`/${requested}/screenshot`)));
  const attachment = submissionAttachments(submission).find((item) => item.url?.endsWith(`/${requested}/screenshot`));
  if (!submission?.screenshotUrl && !attachment) throw new AppError("Screenshot not found.", 404);
  if (user.role === "FACULTY" && submission.assessment.facultyId !== user.id) throw new AppError("You are not authorized to view this screenshot.", 403);
  if (user.role === "STUDENT") { const student = await assertStudent(user); if (student.id !== submission.branchStudentId) throw new AppError("You are not authorized to view this screenshot.", 403); }
  const filePath = path.join(assessmentUploadRoot, text(fileName));
  try { return { buffer: await fs.readFile(filePath), mimeType: attachment?.mimeType || submission.screenshotMimeType || "image/jpeg", fileName: attachment?.fileName || submission.screenshotFileName || requested }; } catch { throw new AppError("Screenshot file is missing.", 404); }
}

function pdfEscape(value) { return text(value).replace(/([\\()])/g, "\\$1").replace(/[^\x20-\x7e]/g, "?"); }
function wrapPdfText(value, maxChars = 86) { const words = text(value).split(/\s+/).filter(Boolean); const lines = []; let line = ""; for (const word of words) { if (!line) line = word; else if ((line.length + word.length + 1) <= maxChars) line += ` ${word}`; else { lines.push(line); line = word; } } if (line || !lines.length) lines.push(line); return lines; }
function makePdfPage(lines, pageNumber, totalPages) {
  const commands = ["q", "0.12 0.28 0.55 rg", "Q", "BT"];
  let y = 775;
  for (const line of lines) {
    if (line.rule) { commands.push("0.85 0.88 0.92 RG", `${line.x || 52} ${y + 5} m 543 ${y + 5} l S`); y -= 12; continue; }
    if (line.fill) { commands.push(`${line.fill} rg`, `52 ${y - 5} 491 ${line.height || 22} re f`); y -= line.fillGap || 0; }
    if (line.parts) { line.parts.forEach((part) => { const size = part.size || line.size || 10; commands.push(`${part.color || line.color || "0.12 0.16 0.22"} rg`, `/${part.bold ? "F2" : "F1"} ${size} Tf`, `1 0 0 1 ${part.x || 52} ${y} Tm`, `(${pdfEscape(part.text)}) Tj`); }); } else { const size = line.size || 10; commands.push(`${line.color || "0.12 0.16 0.22"} rg`, `/${line.bold ? "F2" : "F1"} ${size} Tf`, `1 0 0 1 ${line.x || 52} ${y} Tm`, `(${pdfEscape(line.text)}) Tj`); }
    y -= line.gap || Math.max(14, line.size || 10 + 4);
  }
  commands.push("ET", "BT", "0.38 0.45 0.55 rg", "/F1 8 Tf", "1 0 0 1 52 28 Tm", `(${pdfEscape(`CISPRO - Test Question Paper    Page ${pageNumber} of ${totalPages}`)}) Tj`, "ET");
  return commands.join("\n");
}

function facultyBatchWhere(user, batchId = null) {
  const ids = facultyIds(user);
  return {
    ...(batchId ? { id: batchId } : {}),
    ...active,
    OR: [
      { facultyId: { in: ids } },
      { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } },
    ],
  };
}

async function assertFacultyReportScope(user, moduleId, batchId) {
  const batch = await prisma.branchBatch.findFirst({ where: facultyBatchWhere(user, batchId), include: { branchCourse: { select: { id: true, name: true, courseCode: true } } } });
  if (!batch) throw new AppError("Batch not found or not assigned to this faculty.", 403);
  const module = await prisma.branchCourseModule.findFirst({ where: { id: moduleId, branchCourseId: batch.branchCourseId, status: "ACTIVE" }, select: { id: true, title: true, branchCourseId: true } });
  if (!module) throw new AppError("Module not found for the selected batch course.", 403);
  return { batch, module };
}

export async function listFacultyExamReports(user, filters = {}) {
  const courseId = text(filters.courseId); const moduleId = text(filters.moduleId); const batchId = text(filters.batchId);
  if (courseId) await assertFacultyCourse(user, courseId);
  if (batchId) await assertFacultyReportScope(user, moduleId || (await prisma.branchCourseModule.findFirst({ where: { branchCourseId: courseId, status: "ACTIVE" }, select: { id: true } }))?.id, batchId);
  const tests = await prisma.exam.findMany({ where: { facultyId: user.id, isRetest: false, ...(courseId ? { branchCourseId: courseId } : {}), ...(moduleId ? { moduleId } : {}), schedules: { some: { branchBatch: facultyBatchWhere(user, batchId || null) } } }, select: { id: true, createdAt: true, totalQuestions: true, totalMarks: true, module: { select: { id: true, title: true } }, branchCourse: { select: { id: true, name: true } }, schedules: { where: { branchBatch: facultyBatchWhere(user, batchId || null) }, select: { batchCycleId: true, branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } } } } }, orderBy: { createdAt: "desc" } });
  const currentTests = [];
  const completion = new Map();
  const activeCycles = new Map();
  for (const test of tests) {
    const availableSchedules = [];
    for (const schedule of test.schedules) {
      const batchKey = text(schedule.branchBatch.id);
      if (!activeCycles.has(batchKey)) activeCycles.set(batchKey, await activeSyllabusCycle(schedule.branchBatch.id));
      const currentCycle = activeCycles.get(batchKey);
      if (schedule.batchCycleId && currentCycle?.id !== schedule.batchCycleId) continue;
      if (!(await batchCourseAndAcademicCompletion(schedule.branchBatch.id, completion))) availableSchedules.push(schedule);
    }
    test.schedules = availableSchedules;
    if (!test.schedules.length) continue;
    currentTests.push(test);
  }
  const grouped = new Map();
  currentTests.forEach((test) => test.schedules.forEach((schedule) => { const batch = schedule.branchBatch; const key = `${test.module.id}:${batch.id}`; const row = grouped.get(key) || { course: test.branchCourse, module: test.module, batch: { id: batch.id, batchId: batch.batchId, name: batch.batchName, timing: batch.batchTiming }, testIds: new Set(), totalMarks: 0 }; if (!row.testIds.has(test.id)) { row.testIds.add(test.id); row.totalMarks += test.totalMarks; } grouped.set(key, row); }));
  return Array.from(grouped.values()).map(({ testIds, ...row }) => ({ ...row, testCount: testIds.size })).sort((a, b) => `${a.module.title}:${a.batch.name}`.localeCompare(`${b.module.title}:${b.batch.name}`));
}

export async function getFacultyStudentExamReport(user, moduleId, batchId) {
  const { batch, module } = await assertFacultyReportScope(user, moduleId, batchId);
  const currentCycle = await activeSyllabusCycle(batch.id);
  const allTests = await prisma.exam.findMany({ where: { facultyId: user.id, branchCourseId: batch.branchCourseId, moduleId, schedules: { some: { branchBatchId: batch.id } } }, select: { id: true, title: true, createdAt: true, totalMarks: true, totalQuestions: true, marksPerQuestion: true, isRetest: true, originalTestId: true, retestStudentId: true, schedules: { where: { branchBatchId: batch.id }, select: { id: true, batchCycleId: true, testDate: true, startTime: true, endTime: true } } }, orderBy: { createdAt: "asc" } });
  const cycleStart = await batchCourseAndAcademicCompletion(batch.id) ? await syllabusCycleStart(batch.id, batch.branchCourseId, moduleId, "TEST") : null;
  const tests = allTests.map((test) => ({ ...test, schedules: test.schedules.filter((schedule) => currentCycle?.id && schedule.batchCycleId === currentCycle.id) })).filter((test) => test.schedules.length && (test.isRetest || !cycleStart || new Date(test.createdAt) >= new Date(cycleStart)));
  const scheduleIds = tests.flatMap((test) => test.schedules.map((schedule) => schedule.id));
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: batch.id }, { batchId: batch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } } } }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true, courseEnrollments: { where: { status: "ACTIVE", courseId: batch.branchCourseId, batchId: { in: [batch.id, batch.batchId] } }, select: { batchId: true, courseCompletedAt: true } } }, orderBy: { studentName: "asc" } });
  const reportStudents = students.filter((student) => activeStudentForCurrentSyllabusCycle(student, batch, cycleStart));
  const attempts = scheduleIds.length && reportStudents.length ? await prisma.examAttempt.findMany({ where: { scheduleId: { in: scheduleIds }, branchStudentId: { in: reportStudents.map((student) => student.id) } }, select: { scheduleId: true, branchStudentId: true, status: true, startedAt: true, submittedAt: true, obtainedMarks: true, totalMarks: true, percentage: true, correctAnswers: true, wrongAnswers: true, unansweredQuestions: true } }) : [];
  const attemptMap = new Map(attempts.map((attempt) => [`${attempt.branchStudentId}:${attempt.scheduleId}`, attempt]));
  const testRows = tests.map((test) => ({ id: test.id, name: test.title, maximumMarks: test.totalMarks, totalQuestions: test.totalQuestions, marksPerQuestion: test.marksPerQuestion, isRetest: test.isRetest, originalTestId: test.originalTestId, retestStudentId: test.retestStudentId, schedule: test.schedules[0] || null }));
  const studentRows = reportStudents.map((student) => { let totalObtainedMarks = 0; let totalMaximumMarks = 0; const testResults = testRows.map((test) => { const assigned = !test.isRetest || test.retestStudentId === student.id; if (!assigned) return { testId: test.id, obtainedMarks: null, maximumMarks: test.maximumMarks, percentage: null, status: "NOT_APPLICABLE", correct: null, wrong: null, unanswered: null, startedAt: null, submittedAt: null }; const attempt = test.schedule ? attemptMap.get(`${student.id}:${test.schedule.id}`) : null; if (attempt?.status === "SUBMITTED") { totalObtainedMarks += Number(attempt.obtainedMarks || 0); totalMaximumMarks += Number(attempt.totalMarks || test.maximumMarks || 0); } return { testId: test.id, obtainedMarks: attempt?.status === "SUBMITTED" ? attempt.obtainedMarks : null, maximumMarks: test.maximumMarks, percentage: attempt?.status === "SUBMITTED" ? Number(attempt.percentage || 0) : null, status: attempt?.status || "NOT_ATTEMPTED", correct: attempt?.correctAnswers ?? null, wrong: attempt?.wrongAnswers ?? null, unanswered: attempt?.unansweredQuestions ?? null, startedAt: attempt?.startedAt || null, submittedAt: attempt?.submittedAt || null }; }); return { studentId: student.studentId, studentName: student.studentName, emailAddress: student.emailAddress, tests: testResults, totalObtainedMarks, totalMaximumMarks, overallPercentage: totalMaximumMarks ? (totalObtainedMarks / totalMaximumMarks) * 100 : 0 }; });
  return { course: batch.branchCourse, module: { id: module.id, name: module.title }, batch: { id: batch.id, batchId: batch.batchId, name: batch.batchName, timing: batch.batchTiming }, tests: testRows, totalTests: testRows.length, totalMcqs: testRows.reduce((sum, test) => sum + test.totalQuestions, 0), totalStudents: reportStudents.length, students: studentRows };
}

export async function listFacultyAssessmentReports(user) {
  const assessments = await prisma.assessment.findMany({ where: { facultyId: user.id, isReassessment: false }, include: { branchCourse: { select: { id: true, name: true } }, module: { select: { id: true, title: true } }, branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } } }, orderBy: [{ startDate: "asc" }, { createdAt: "asc" }] });
  const groups = new Map();
  for (const assessment of assessments) {
    if (await batchCourseAndAcademicCompletion(assessment.branchBatchId)) continue;
    const key = `${assessment.branchCourseId}:${assessment.branchBatchId}:${assessment.moduleId}`; const row = groups.get(key) || { course: assessment.branchCourse, batch: { id: assessment.branchBatch.id, batchId: assessment.branchBatch.batchId, name: assessment.branchBatch.batchName, timing: assessment.branchBatch.batchTiming }, module: { id: assessment.module.id, name: assessment.module.title }, assessmentCount: 0, totalMarks: 0 }; row.assessmentCount += 1; row.totalMarks += Number(assessment.totalMarks || 0); groups.set(key, row);
  }
  return Array.from(groups.values()).sort((a, b) => `${a.course.name}:${a.batch.name}:${a.module.name}`.localeCompare(`${b.course.name}:${b.batch.name}:${b.module.name}`));
}

export async function getFacultyAssessmentStudentReport(user, courseId, batchId, moduleId) {
  const { batch, module } = await assertFacultyReportScope(user, moduleId, batchId);
  if (batch.branchCourseId !== courseId) throw new AppError("Course does not match the selected batch.", 422);
  const allAssessments = await prisma.assessment.findMany({ where: { facultyId: user.id, branchCourseId: courseId, branchBatchId: batch.id, moduleId }, select: { id: true, assessmentName: true, totalMarks: true, startDate: true, endDate: true, createdAt: true, isReassessment: true, originalAssessmentId: true, reassessmentStudentId: true }, orderBy: [{ startDate: "asc" }, { createdAt: "asc" }] });
  const cycleStart = await batchCourseAndAcademicCompletion(batch.id) ? await syllabusCycleStart(batch.id, courseId, moduleId, "ASSESSMENT") : null;
  const assessments = allAssessments.filter((assessment) => assessment.isReassessment || !cycleStart || new Date(assessment.createdAt) >= new Date(cycleStart));
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: [{ batchId: batch.id }, { batchId: batch.batchId }, { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [batch.id, batch.batchId] } } } }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true, courseEnrollments: { where: { status: "ACTIVE", courseId: batch.branchCourseId, batchId: { in: [batch.id, batch.batchId] } }, select: { batchId: true, courseCompletedAt: true } } }, orderBy: { studentName: "asc" } });
  const reportStudents = students.filter((student) => activeStudentForCurrentSyllabusCycle(student, batch, cycleStart));
  const submissions = assessments.length && reportStudents.length ? await prisma.assessmentSubmission.findMany({ where: { assessmentId: { in: assessments.map((assessment) => assessment.id) }, branchStudentId: { in: reportStudents.map((student) => student.id) } }, select: { assessmentId: true, branchStudentId: true, status: true, submittedAt: true, marksObtained: true, feedback: true } }) : [];
  const submissionMap = new Map(submissions.map((submission) => [`${submission.branchStudentId}:${submission.assessmentId}`, submission]));
  const assessmentRows = assessments.map((assessment) => ({ id: assessment.id, assessmentName: assessment.assessmentName, totalMarks: assessment.totalMarks, startDate: assessment.startDate, endDate: assessment.endDate, isReassessment: assessment.isReassessment, originalAssessmentId: assessment.originalAssessmentId, reassessmentStudentId: assessment.reassessmentStudentId }));
  const studentRows = reportStudents.map((student) => { let overallMarks = 0; let overallMaximum = 0; let hasIncompleteAssessment = false; const results = {}; const replacements = new Set(assessments.filter((assessment) => assessment.isReassessment && assessment.reassessmentStudentId === student.id && assessment.originalAssessmentId).map((assessment) => assessment.originalAssessmentId)); assessments.forEach((assessment) => { const assigned = !assessment.isReassessment || assessment.reassessmentStudentId === student.id; if (!assigned) { results[assessment.id] = { status: "NOT_APPLICABLE", marksObtained: null, totalMarks: assessment.totalMarks, percentage: null, submittedAt: null, feedback: null }; return } const replaced = !assessment.isReassessment && replacements.has(assessment.id); const submission = submissionMap.get(`${student.id}:${assessment.id}`); const evaluated = submission?.status === "EVALUATED" && submission.marksObtained != null; results[assessment.id] = { status: replaced ? "REPLACED" : submission?.status || "NOT_SUBMITTED", marksObtained: evaluated ? submission.marksObtained : null, totalMarks: assessment.totalMarks, percentage: evaluated ? (submission.marksObtained / assessment.totalMarks) * 100 : null, submittedAt: submission?.submittedAt || null, feedback: submission?.feedback || null }; if (replaced) return; overallMaximum += assessment.totalMarks; if (evaluated) overallMarks += submission.marksObtained; else hasIncompleteAssessment = true; }); const finalOverallMarks = hasIncompleteAssessment ? 0 : overallMarks; return { studentId: student.studentId, studentName: student.studentName, emailAddress: student.emailAddress, assessments: results, overall: { marksObtained: finalOverallMarks, totalMarks: overallMaximum, percentage: overallMaximum ? (finalOverallMarks / overallMaximum) * 100 : null } }; });
  const originalAssessments = assessmentRows.filter((assessment) => !assessment.isReassessment);
  return { course: batch.branchCourse, batch: { id: batch.id, batchId: batch.batchId, name: batch.batchName, timing: batch.batchTiming }, module: { id: module.id, name: module.title }, assessments: assessmentRows, totalAssessments: originalAssessments.length, totalMarks: originalAssessments.reduce((sum, assessment) => sum + assessment.totalMarks, 0), totalStudents: studentRows.length, students: studentRows };
}
function createProfessionalPdf(pageLines) {
  const pages = pageLines.length ? pageLines : [[{ text: "No question data available." }]];
  const objects = [null, "<< /Type /Catalog /Pages 2 0 R >>", null, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"];
  const pageRefs = []; const pageContents = [];
  pages.forEach((lines, index) => { const content = makePdfPage(lines, index + 1, pages.length); const contentIndex = objects.length; objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`); const pageIndex = objects.length; objects.push(null); pageContents.push(contentIndex); pageRefs.push(pageIndex); });
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map((index) => `${index} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  pageRefs.forEach((pageIndex, index) => { objects[pageIndex] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents ${pageContents[index]} 0 R >>`; });
  let pdf = "%PDF-1.4\n"; const offsets = [];
  objects.forEach((object, index) => { if (index === 0) return; offsets[index] = Buffer.byteLength(pdf); pdf += `${index} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
function pdfDate(value) { if (!value) return "-"; const parsed = new Date(`${value}T00:00:00`); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(parsed); }
function safeFilePart(value) { return text(value).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Test"; }

export async function buildQuestionPaperPdf(user, testId) {
  const test = await getFacultyTest(user, testId);
  const lines = [{ text: "CISPRO", x: 250, size: 21, bold: true, color: "0.10 0.30 0.72", gap: 25 }, { text: "TEST QUESTION PAPER", x: 211, size: 13, bold: true, color: "0.18 0.24 0.32", gap: 22 }, { rule: true }, { text: "EXAM INFORMATION", size: 11, bold: true, color: "0.10 0.30 0.72", fill: "0.93 0.96 1", height: 22, gap: 24 }];
  const info = [["Test Name", test.title], ["Course", test.branchCourse?.name], ["Module", test.module?.title], ["Questions", test.questions.length], ["Marks / Question", test.marksPerQuestion], ["Total Marks", test.questions.length * test.marksPerQuestion]];
  info.forEach(([label, value]) => { const valueLines = wrapPdfText(String(value ?? "-"), 64); lines.push({ parts: [{ text: label, x: 70, bold: true, color: "0.30 0.38 0.48" }, { text: valueLines[0], x: 205, color: "0.08 0.12 0.18" }], gap: 15 }); valueLines.slice(1).forEach((line) => lines.push({ parts: [{ text: "", x: 70 }, { text: line, x: 205, color: "0.08 0.12 0.18" }], gap: 15 })); });
  lines.push({ text: "", gap: 16 }, { text: "BATCH SCHEDULE", size: 11, bold: true, color: "0.10 0.30 0.72", fill: "0.93 0.96 1", height: 22, gap: 24 });
  test.schedules.forEach((schedule) => lines.push({ parts: [{ text: "Batch", x: 70, bold: true, color: "0.30 0.38 0.48" }, { text: schedule.batchName || schedule.batchId || "-", x: 205, bold: true }], gap: 15 }, { parts: [{ text: "Date", x: 70, bold: true, color: "0.30 0.38 0.48" }, { text: pdfDate(schedule.testDate), x: 205 }, { text: "Time", x: 350, bold: true, color: "0.30 0.38 0.48" }, { text: `${schedule.startTime} - ${schedule.endTime}`, x: 395 }], gap: 20 }));
  lines.push({ rule: true }, { text: "QUESTION PAPER", size: 13, bold: true, color: "0.10 0.30 0.72", fill: "0.93 0.96 1", height: 22, gap: 26 });
  test.questions.forEach((question, index) => { lines.push(...wrapPdfText(`${index + 1}. ${question.question}`, 82).map((line, lineIndex) => ({ text: line, x: 65, bold: lineIndex === 0, size: 10, gap: 15 }))); ["A", "B", "C", "D"].forEach((letter) => lines.push(...wrapPdfText(`${letter}. ${question[`option${letter}`]}`, 76).map((line, lineIndex) => ({ text: line, x: 82, size: 10, gap: lineIndex === 0 ? 14 : 13 })))); lines.push({ text: `Correct Answer: ${question.correctAnswer}`, x: 82, bold: true, color: "0.08 0.48 0.28", gap: 24 }); });
  const pages = []; let page = []; let height = 0; for (const line of lines) { const lineHeight = line.rule ? 18 : (line.gap || 15); if (page.length && height + lineHeight > 700) { pages.push(page); page = []; height = 0; } page.push(line); height += lineHeight; } if (page.length) pages.push(page);
  return { buffer: createProfessionalPdf(pages), fileName: `${safeFilePart(test.branchCourse?.name)}_${safeFilePart(test.module?.title)}_${safeFilePart(test.schedules[0]?.batchName || "Batch")}_Test.pdf` };
}
