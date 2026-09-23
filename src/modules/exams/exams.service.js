import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const active = { status: "ACTIVE" };
const text = (value) => String(value ?? "").trim();
const unwrap = (value) => value?.data ?? value;

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
  const student = await prisma.branchStudent.findFirst({ where: { emailAddress: { equals: email, mode: "insensitive" }, recordStatus: "ACTIVE" } });
  if (!student) throw new AppError("Student record not found.", 403);
  return student;
}

function publicSchedule(schedule, now = new Date()) {
  return { id: schedule.id, batchId: schedule.branchBatchId, batchName: schedule.branchBatch?.batchName, batchTiming: schedule.branchBatch?.batchTiming, testDate: schedule.testDate, startTime: schedule.startTime, endTime: schedule.endTime, status: statusForSchedule(schedule, now) };
}

export async function listFacultyCourses(user) {
  return prisma.branchCourse.findMany({ where: await facultyCourseWhere(user), select: { id: true, courseCode: true, name: true, status: true }, orderBy: { name: "asc" } });
}

export async function listFacultyBatches(user, courseId) {
  await assertFacultyCourse(user, courseId);
  const ids = facultyIds(user);
  return prisma.branchBatch.findMany({ where: { AND: [{ OR: [{ branchCourseId: courseId }, { courseId }] }, { OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] }, select: { id: true, batchId: true, batchName: true, batchTiming: true, startTime: true, startPeriod: true, endTime: true, endPeriod: true, courseId: true, branchCourseId: true, status: true }, orderBy: [{ batchName: "asc" }] });
}

export async function listFacultyModules(user, courseId) {
  const course = await assertFacultyCourse(user, courseId);
  return course.modules.map((module) => ({ id: module.id, title: module.title, sequenceNo: module.sequenceNo }));
}

function examInclude(includeQuestions = false) {
  return { branchCourse: { select: { id: true, name: true, courseCode: true } }, module: { select: { id: true, title: true } }, schedules: { include: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } } }, orderBy: { testDate: "asc" } }, ...(includeQuestions ? { questions: { orderBy: { questionOrder: "asc" } } } : {}) };
}

export async function listFacultyTests(user) {
  const tests = await prisma.exam.findMany({ where: { facultyId: user.id }, include: examInclude(), orderBy: { createdAt: "desc" } });
  return tests.map((test) => ({ ...test, schedules: test.schedules.map(publicSchedule) }));
}

export async function getFacultyTest(user, testId) {
  const test = await prisma.exam.findFirst({ where: { id: testId, facultyId: user.id }, include: examInclude(true) });
  if (!test) throw new AppError("Test not found.", 404);
  return { ...test, schedules: test.schedules.map(publicSchedule) };
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
  const normalizedSchedules = schedules.map((item) => {
    const date = text(item.testDate);
    const startTime = text(item.startTime);
    const endTime = text(item.endTime);
    const start = scheduledDate(date, startTime);
    const end = scheduledDate(date, endTime);
    if (!start || !end || end <= start) throw new AppError("Every schedule must have a valid date and end time after its start time.", 422);
    return { branchBatchId: text(item.batchId), testDate: date, startTime, endTime, status: "SCHEDULED", batch: batchMap.get(text(item.batchId)) };
  });
  const duplicate = await prisma.exam.findFirst({ where: { facultyId: user.id, branchCourseId: courseId, moduleId, schedules: { some: { branchBatchId: { in: batchIds }, testDate: { in: normalizedSchedules.map((item) => item.testDate) } } } } });
  if (duplicate) throw new AppError("A test already exists for one of the selected batch/date combinations.", 409);
  const totalQuestions = questions.length;
  const created = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({ data: { title: text(payload.title) || "MCQ Test", branchCourseId: courseId, moduleId, facultyId: user.id, marksPerQuestion, totalQuestions, totalMarks: totalQuestions * marksPerQuestion, status: "SCHEDULED", questions: { create: questions }, schedules: { create: normalizedSchedules.map(({ batch, ...schedule }) => schedule) } }, include: examInclude(true) });
    const batchCodes = batches.map((batch) => text(batch.batchId)).filter(Boolean);
    const students = await tx.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: { in: batchIds } }, { batchId: { in: batchCodes } }] }, select: { id: true, batchId: true, emailAddress: true, studentName: true } });
    const studentEmails = students.map((student) => text(student.emailAddress).toLowerCase()).filter(Boolean);
    const users = studentEmails.length ? await tx.user.findMany({ where: { role: "STUDENT", OR: studentEmails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } }) : [];
    const userByEmail = new Map(users.map((item) => [text(item.email).toLowerCase(), item.id]));
    const schedulesByBatch = new Map(exam.schedules.flatMap((schedule) => [[schedule.branchBatchId, schedule], [schedule.branchBatch?.batchId, schedule]].filter(([batchKey]) => Boolean(batchKey))));
    const candidateNotifications = students.map((student) => { const email = text(student.emailAddress).toLowerCase(); const schedule = schedulesByBatch.get(student.batchId); const targetUserId = userByEmail.get(email); return schedule && targetUserId ? { kind: "EXAM_SCHEDULED", tone: "blue", title: "New Test Scheduled", message: `You have a test scheduled for ${course.name} - ${module.title} on ${schedule.testDate} from ${schedule.startTime} to ${schedule.endTime}.`, targetUserId, examId: exam.id, examScheduleId: schedule.id, batchId: student.batchId, createdBy: user.id } : null; }).filter(Boolean);
    const existingNotifications = candidateNotifications.length ? await tx.notification.findMany({ where: { kind: "EXAM_SCHEDULED", examId: exam.id, examScheduleId: { in: candidateNotifications.map((item) => item.examScheduleId) }, targetUserId: { in: candidateNotifications.map((item) => item.targetUserId) } }, select: { targetUserId: true, examScheduleId: true } }) : [];
    const existingKeys = new Set(existingNotifications.map((item) => `${item.targetUserId}:${item.examScheduleId}`));
    const notificationRows = candidateNotifications.filter((item) => !existingKeys.has(`${item.targetUserId}:${item.examScheduleId}`));
    if (notificationRows.length) await tx.notification.createMany({ data: notificationRows });
    console.info("[EXAM CREATE]", { testId: exam.id, selectedBatchIds: batchIds, studentIds: students.map((student) => student.id), notificationsCreated: notificationRows.length });
    return exam;
  });
  return { ...created, schedules: created.schedules.map(publicSchedule) };
}

export async function updateTest(user, testId, payload = {}) {
  const existing = await prisma.exam.findFirst({ where: { id: testId, facultyId: user.id }, include: { schedules: true } });
  if (!existing) throw new AppError("Test not found.", 404);
  if (existing.schedules.some((schedule) => { const start = scheduledDate(schedule.testDate, schedule.startTime); return start && new Date() >= start; })) throw new AppError("This test can no longer be edited because the scheduled start time has been reached.", 409);
  const courseId = text(payload.courseId); const moduleId = text(payload.moduleId); const marksPerQuestion = Number(payload.marksPerQuestion);
  const questions = (Array.isArray(payload.questions) ? payload.questions : []).map(normalizeQuestion); const schedules = Array.isArray(payload.schedules) ? payload.schedules : [];
  if (!courseId || !moduleId || !Number.isInteger(marksPerQuestion) || marksPerQuestion <= 0 || marksPerQuestion > 100 || !questions.length || !schedules.length) throw new AppError("Complete all test fields, schedules, and questions before saving.", 422);
  const course = await assertFacultyCourse(user, courseId); if (!course.modules.some((item) => item.id === moduleId)) throw new AppError("Selected module does not belong to the selected course.", 422);
  const batchIds = schedules.map((item) => text(item.batchId)); const ids = facultyIds(user);
  const batches = await prisma.branchBatch.findMany({ where: { AND: [{ id: { in: batchIds } }, { OR: [{ branchCourseId: courseId }, { courseId }] }, { OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] } });
  if (batches.length !== batchIds.length || new Set(batchIds).size !== batchIds.length) throw new AppError("One or more batches are invalid or not assigned to this faculty.", 403);
  const normalizedSchedules = schedules.map((item) => { const start = scheduledDate(text(item.testDate), text(item.startTime)); const end = scheduledDate(text(item.testDate), text(item.endTime)); if (!start || !end || end <= start) throw new AppError("Every schedule must have a valid date and end time after its start time.", 422); return { branchBatchId: text(item.batchId), testDate: text(item.testDate), startTime: text(item.startTime), endTime: text(item.endTime), status: "SCHEDULED" }; });
  const totalQuestions = questions.length;
  const updated = await prisma.$transaction(async (tx) => { await tx.examQuestion.deleteMany({ where: { examId: testId } }); await tx.examSchedule.deleteMany({ where: { examId: testId } }); return tx.exam.update({ where: { id: testId }, data: { title: text(payload.title) || "MCQ Test", branchCourseId: courseId, moduleId, marksPerQuestion, totalQuestions, totalMarks: totalQuestions * marksPerQuestion, questions: { create: questions }, schedules: { create: normalizedSchedules } }, include: examInclude(true) }); });
  return { ...updated, schedules: updated.schedules.map(publicSchedule) };
}

function studentScheduleWhere(student, scheduleId) {
  return { id: scheduleId, OR: [{ branchBatchId: student.batchId }, { branchBatch: { batchId: student.batchId } }] };
}

export async function listStudentTests(user) {
  const student = await assertStudent(user);
  const schedules = await prisma.examSchedule.findMany({ where: { OR: [{ branchBatchId: student.batchId }, { branchBatch: { batchId: student.batchId } }] }, include: { exam: { include: examInclude() }, attempts: { where: { branchStudentId: student.id }, select: { id: true, status: true, submittedAt: true, obtainedMarks: true, totalMarks: true, percentage: true } } }, orderBy: [{ testDate: "asc" }, { startTime: "asc" }] });
  return schedules.map((schedule) => ({ id: schedule.id, testId: schedule.examId, course: schedule.exam.branchCourse, module: schedule.exam.module, totalQuestions: schedule.exam.totalQuestions, marksPerQuestion: schedule.exam.marksPerQuestion, totalMarks: schedule.exam.totalMarks, ...publicSchedule(schedule), attempt: schedule.attempts[0] || null }));
}

export async function getStudentTest(user, scheduleId) {
  const student = await assertStudent(user);
  const schedule = await prisma.examSchedule.findFirst({ where: studentScheduleWhere(student, scheduleId), include: { branchBatch: true, exam: { include: examInclude(true) } } });
  if (!schedule) throw new AppError("Test not found or you are not enrolled in its batch.", 404);
  const status = statusForSchedule(schedule);
  return { id: schedule.id, testId: schedule.examId, course: schedule.exam.branchCourse, module: schedule.exam.module, batch: schedule.branchBatch, totalQuestions: schedule.exam.totalQuestions, marksPerQuestion: schedule.exam.marksPerQuestion, totalMarks: schedule.exam.totalMarks, ...publicSchedule(schedule), questions: status === "AVAILABLE" ? schedule.exam.questions.map(({ correctAnswer, ...question }) => question) : [] };
}

export async function startTest(user, scheduleId) {
  const student = await assertStudent(user);
  const schedule = await prisma.examSchedule.findFirst({ where: studentScheduleWhere(student, scheduleId), include: { exam: true } });
  if (!schedule) throw new AppError("Test not found or you are not enrolled in its batch.", 404);
  if (statusForSchedule(schedule) !== "AVAILABLE") throw new AppError("This test is not currently available.", 403);
  const attempt = await prisma.examAttempt.upsert({ where: { scheduleId_branchStudentId: { scheduleId, branchStudentId: student.id } }, update: {}, create: { examId: schedule.examId, scheduleId, branchStudentId: student.id, studentUserId: user.id, totalQuestions: schedule.exam.totalQuestions, totalMarks: schedule.exam.totalMarks } });
  return { id: attempt.id, scheduleId, startedAt: attempt.startedAt, status: attempt.status, totalQuestions: attempt.totalQuestions, totalMarks: attempt.totalMarks };
}

export async function submitTest(user, scheduleId, payload = {}) {
  const student = await assertStudent(user);
  const schedule = await prisma.examSchedule.findFirst({ where: studentScheduleWhere(student, scheduleId), include: { exam: { include: { questions: { orderBy: { questionOrder: "asc" } } } } } });
  if (!schedule) throw new AppError("Test not found or you are not enrolled in its batch.", 404);
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
  const attempt = await prisma.examAttempt.findFirst({ where: { scheduleId, branchStudentId: student.id, status: "SUBMITTED" }, include: { exam: { include: { branchCourse: true, module: true } }, schedule: { include: { branchBatch: true } }, answers: { include: { question: true }, orderBy: { question: { questionOrder: "asc" } } } } });
  if (!attempt) throw new AppError("Submitted result not found.", 404);
  return { ...attempt, answers: attempt.answers.map(({ question, ...answer }) => ({ ...answer, question: { id: question.id, question: question.question, optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD } })) };
}

async function facultySchedule(user, testId, scheduleId) {
  const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, examId: testId, exam: { facultyId: user.id } }, include: { exam: true, branchBatch: true } });
  if (!schedule) throw new AppError("Test schedule not found.", 404);
  return schedule;
}

export async function listSubmissions(user, testId, scheduleId) {
  const schedule = await facultySchedule(user, testId, scheduleId);
  const studentWhere = { recordStatus: "ACTIVE", OR: [{ batchId: schedule.branchBatchId }, { batchId: schedule.branchBatch.batchId }] };
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
  const courseWhere = await facultyCourseWhere(user, courseId || null);
  const tests = await prisma.exam.findMany({ where: { facultyId: user.id, ...(courseId ? { branchCourseId: courseId } : {}), ...(moduleId ? { moduleId } : {}), branchCourse: courseWhere, schedules: { some: { branchBatch: facultyBatchWhere(user, batchId || null) } } }, select: { id: true, totalQuestions: true, module: { select: { id: true, title: true } }, branchCourse: { select: { id: true, name: true } }, schedules: { where: { branchBatch: facultyBatchWhere(user, batchId || null) }, select: { branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } } } }, questions: { select: { id: true } } }, orderBy: { createdAt: "desc" } });
  const grouped = new Map();
  tests.forEach((test) => test.schedules.forEach((schedule) => { const batch = schedule.branchBatch; const key = `${test.module.id}:${batch.id}`; const row = grouped.get(key) || { course: test.branchCourse, module: test.module, batch: { id: batch.id, batchId: batch.batchId, name: batch.batchName, timing: batch.batchTiming }, testIds: new Set(), mcqCount: 0 }; if (!row.testIds.has(test.id)) { row.testIds.add(test.id); row.mcqCount += test.questions.length; } grouped.set(key, row); }));
  return Array.from(grouped.values()).map(({ testIds, ...row }) => ({ ...row, testCount: testIds.size })).sort((a, b) => `${a.module.title}:${a.batch.name}`.localeCompare(`${b.module.title}:${b.batch.name}`));
}

export async function getFacultyStudentExamReport(user, moduleId, batchId) {
  const { batch, module } = await assertFacultyReportScope(user, moduleId, batchId);
  const tests = await prisma.exam.findMany({ where: { facultyId: user.id, branchCourseId: batch.branchCourseId, moduleId, schedules: { some: { branchBatchId: batch.id } } }, select: { id: true, title: true, totalMarks: true, totalQuestions: true, marksPerQuestion: true, schedules: { where: { branchBatchId: batch.id }, select: { id: true, testDate: true, startTime: true, endTime: true } } }, orderBy: { createdAt: "asc" } });
  const scheduleIds = tests.flatMap((test) => test.schedules.map((schedule) => schedule.id));
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: batch.id }, { batchId: batch.batchId }] }, select: { id: true, studentId: true, studentName: true, emailAddress: true }, orderBy: { studentName: "asc" } });
  const attempts = scheduleIds.length && students.length ? await prisma.examAttempt.findMany({ where: { scheduleId: { in: scheduleIds }, branchStudentId: { in: students.map((student) => student.id) } }, select: { scheduleId: true, branchStudentId: true, status: true, startedAt: true, submittedAt: true, obtainedMarks: true, totalMarks: true, percentage: true, correctAnswers: true, wrongAnswers: true, unansweredQuestions: true } }) : [];
  const attemptMap = new Map(attempts.map((attempt) => [`${attempt.branchStudentId}:${attempt.scheduleId}`, attempt]));
  const testRows = tests.map((test) => ({ id: test.id, name: test.title, maximumMarks: test.totalMarks, totalQuestions: test.totalQuestions, marksPerQuestion: test.marksPerQuestion, schedule: test.schedules[0] || null }));
  const studentRows = students.map((student) => { let totalObtainedMarks = 0; let totalMaximumMarks = 0; const testResults = testRows.map((test) => { const attempt = test.schedule ? attemptMap.get(`${student.id}:${test.schedule.id}`) : null; if (attempt?.status === "SUBMITTED") { totalObtainedMarks += Number(attempt.obtainedMarks || 0); totalMaximumMarks += Number(attempt.totalMarks || test.maximumMarks || 0); } return { testId: test.id, obtainedMarks: attempt?.status === "SUBMITTED" ? attempt.obtainedMarks : null, maximumMarks: test.maximumMarks, percentage: attempt?.status === "SUBMITTED" ? Number(attempt.percentage || 0) : null, status: attempt?.status || "NOT_ATTEMPTED", correct: attempt?.correctAnswers ?? null, wrong: attempt?.wrongAnswers ?? null, unanswered: attempt?.unansweredQuestions ?? null, startedAt: attempt?.startedAt || null, submittedAt: attempt?.submittedAt || null }; }); return { studentId: student.studentId, studentName: student.studentName, emailAddress: student.emailAddress, tests: testResults, totalObtainedMarks, totalMaximumMarks, overallPercentage: totalMaximumMarks ? (totalObtainedMarks / totalMaximumMarks) * 100 : 0 }; });
  return { course: batch.branchCourse, module: { id: module.id, name: module.title }, batch: { id: batch.id, batchId: batch.batchId, name: batch.batchName, timing: batch.batchTiming }, tests: testRows, totalTests: testRows.length, totalMcqs: testRows.reduce((sum, test) => sum + test.totalQuestions, 0), totalStudents: students.length, students: studentRows };
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
