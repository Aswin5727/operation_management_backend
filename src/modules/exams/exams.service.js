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
function createSimplePdf(lines) { const content = ["BT", "/F1 10 Tf", "50 790 Td", ...lines.flatMap((line, index) => [index ? "0 -16 Td" : "", `(${pdfEscape(line)}) Tj`]), "ET"].filter(Boolean).join("\n"); const objects = [`1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj`, `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj`, `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj`, `4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`, `5 0 obj<< /Length ${Buffer.byteLength(content)} >>stream\n${content}\nendstream endobj`]; let pdf = "%PDF-1.4\n"; const offsets = []; for (const object of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += `${object}\n`; } const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; return Buffer.from(pdf); }

export async function buildQuestionPaperPdf(user, testId) { const test = await getFacultyTest(user, testId); const lines = [`${test.title}`, `Course: ${test.branchCourse.name}`, `Module: ${test.module.title}`, `Questions: ${test.totalQuestions} | Marks per question: ${test.marksPerQuestion} | Total: ${test.totalMarks}`, ""]; test.schedules.forEach((schedule) => lines.push(`Batch: ${schedule.batchName || schedule.batchId} | ${schedule.testDate} | ${schedule.startTime} - ${schedule.endTime}`)); lines.push(""); test.questions.forEach((question, index) => { lines.push(`${index + 1}. ${question.question}`, `A. ${question.optionA}`, `B. ${question.optionB}`, `C. ${question.optionC}`, `D. ${question.optionD}`, ""); }); return createSimplePdf(lines); }
