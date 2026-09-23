import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const active = { status: "ACTIVE" };
const text = (value) => String(value ?? "").trim();
const facultyIds = (user = {}) => Array.from(new Set([user.id, user.userCode].map(text).filter(Boolean)));
const notificationDateTime = (value) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function date(value, field) {
  const result = new Date(value);
  if (!value || Number.isNaN(result.getTime())) throw new AppError(`${field} must be a valid date.`, 422);
  return result;
}

function windowStatus(startDate, endDate, now = new Date()) {
  if (now < new Date(startDate)) return "UPCOMING";
  if (now <= new Date(endDate)) return "ACTIVE";
  return "CLOSED";
}

async function assertFacultyAssignment(user, courseId, moduleId, batchId) {
  const ids = facultyIds(user);
  const course = await prisma.branchCourse.findFirst({
    where: { id: courseId, ...active, OR: [
      { facultyAssignments: { some: { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" }, branchCourse: active } } },
      { branchFaculties: { some: { facultyId: { in: ids }, status: "ACTIVE" } } },
      { branchBatches: { some: { AND: [{ id: batchId }, { OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }, active] } } },
    ] },
    include: { modules: { where: active, select: { id: true, title: true } } },
  });
  if (!course) throw new AppError("You do not have access to this course.", 403);
  const module = course.modules.find((item) => item.id === moduleId);
  if (!module) throw new AppError("Selected module does not belong to the selected course.", 422);
  const batch = await prisma.branchBatch.findFirst({
    where: { id: batchId, ...active, OR: [{ branchCourseId: courseId }, { courseId }], AND: [{ OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] }] },
    select: { id: true, batchId: true, batchName: true, branchCourseId: true, courseId: true },
  });
  if (!batch) throw new AppError("Selected batch is not assigned to this faculty for the selected course.", 403);
  return { course, module, batch };
}

async function studentForUser(user) {
  const email = text(user.email).toLowerCase();
  const student = await prisma.branchStudent.findFirst({ where: { emailAddress: { equals: email, mode: "insensitive" }, recordStatus: "ACTIVE" } });
  if (!student) throw new AppError("Student record not found.", 403);
  return student;
}

function serialize(assessment, now = new Date()) {
  return { ...assessment, status: windowStatus(assessment.startDate, assessment.endDate, now), percentage: undefined };
}

const include = {
  branchCourse: { select: { id: true, name: true, courseCode: true } },
  module: { select: { id: true, title: true } },
  branchBatch: { select: { id: true, batchId: true, batchName: true, batchTiming: true } },
};

export async function listFacultyAssessments(user) {
  const rows = await prisma.assessment.findMany({ where: { facultyId: user.id }, include: { ...include, _count: { select: { submissions: true } } }, orderBy: { createdAt: "desc" } });
  return rows.map((row) => serialize(row));
}

export async function getFacultyAssessment(user, id) {
  const assessment = await prisma.assessment.findFirst({ where: { id, facultyId: user.id }, include });
  if (!assessment) throw new AppError("Assessment not found.", 404);
  return serialize(assessment);
}

export async function createAssessment(user, payload = {}) {
  const assessmentName = text(payload.assessmentName);
  const courseId = text(payload.courseId || payload.branchCourseId);
  const moduleId = text(payload.moduleId);
  const batchId = text(payload.batchId || payload.branchBatchId);
  const totalMarks = Number(payload.totalMarks);
  const startDate = date(payload.startDate, "Start date");
  const endDate = date(payload.endDate, "End date");
  if (!assessmentName || !courseId || !moduleId || !batchId || !Number.isInteger(totalMarks) || totalMarks <= 0) throw new AppError("Assessment name, course, module, batch, and a positive total marks value are required.", 422);
  if (endDate <= startDate) throw new AppError("End date must be after start date.", 422);
  const { course, module, batch } = await assertFacultyAssignment(user, courseId, moduleId, batchId);
  const created = await prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({ data: { assessmentName, branchCourseId: course.id, moduleId: module.id, branchBatchId: batch.id, totalMarks, startDate, endDate, details: text(payload.details || payload.instructions) || null, facultyId: user.id }, include });
    const students = await tx.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: batch.id }, { batchId: batch.batchId }] }, select: { emailAddress: true, studentName: true, batchId: true } });
    const emails = students.map((student) => text(student.emailAddress).toLowerCase()).filter(Boolean);
    const users = emails.length ? await tx.user.findMany({ where: { role: "STUDENT", OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) }, select: { id: true, email: true } }) : [];
    const userByEmail = new Map(users.map((item) => [text(item.email).toLowerCase(), item.id]));
    const scheduleMessage = `A new assessment "${assessmentName}" is scheduled for ${course.name} - ${module.title}. Total marks: ${totalMarks}. Start: ${notificationDateTime(startDate)}. End: ${notificationDateTime(endDate)}.`;
    const rows = students.map((student) => { const targetUserId = userByEmail.get(text(student.emailAddress).toLowerCase()); return targetUserId ? { kind: "ASSESSMENT_AVAILABLE", tone: "blue", title: "New Assessment Available", message: scheduleMessage, targetUserId, assessmentId: assessment.id, batchId: student.batchId, moduleId: module.id, createdBy: user.id } : null; }).filter(Boolean);
    if (rows.length) await tx.notification.createMany({ data: rows });
    return assessment;
  });
  return serialize(created);
}

export async function listAssessmentStudents(user, id) {
  const assessment = await prisma.assessment.findFirst({ where: { id, facultyId: user.id }, include });
  if (!assessment) throw new AppError("Assessment not found.", 404);
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", OR: [{ batchId: assessment.branchBatchId }, { batchId: assessment.branchBatch.batchId }] }, select: { id: true, studentName: true, emailAddress: true } });
  const submissions = await prisma.assessmentSubmission.findMany({ where: { assessmentId: id }, include: { evaluator: { select: { fullName: true, userCode: true } } } });
  const byStudent = new Map(submissions.map((item) => [item.branchStudentId, item]));
  return students.map((student) => { const submission = byStudent.get(student.id); const status = submission?.status || "NOT_SUBMITTED"; return { student, ...(submission || {}), status, marksObtained: submission?.marksObtained ?? null, percentage: submission?.marksObtained == null ? null : (submission.marksObtained / assessment.totalMarks) * 100, submittedAt: submission?.submittedAt || null, feedback: submission?.feedback || null }; });
}

export async function evaluateAssessment(user, id, studentId, payload = {}) {
  const assessment = await prisma.assessment.findFirst({ where: { id, facultyId: user.id }, include });
  if (!assessment) throw new AppError("Assessment not found.", 404);
  const marksObtained = Number(payload.marksObtained);
  if (!Number.isInteger(marksObtained) || marksObtained < 0 || marksObtained > assessment.totalMarks) throw new AppError("Marks must be between 0 and total marks.", 422);
  const existing = await prisma.assessmentSubmission.findUnique({ where: { assessmentId_branchStudentId: { assessmentId: id, branchStudentId: studentId } } });
  if (!existing || existing.status === "NOT_SUBMITTED") throw new AppError("Only submitted assessments can be evaluated.", 422);
  return prisma.assessmentSubmission.update({ where: { id: existing.id }, data: { marksObtained, feedback: text(payload.feedback) || null, evaluatedBy: user.id, evaluatedAt: new Date(), status: "EVALUATED" } });
}

export async function listStudentAssessments(user) {
  const student = await studentForUser(user);
  const rows = await prisma.assessment.findMany({ where: { OR: [{ branchBatchId: student.batchId }, { branchBatch: { batchId: student.batchId } }], branchCourseId: student.courseId || undefined }, include: { ...include, submissions: { where: { branchStudentId: student.id } } }, orderBy: { startDate: "asc" } });
  return rows.map((row) => ({ ...serialize(row), submission: row.submissions[0] || null }));
}

export async function getStudentAssessment(user, id) {
  const student = await studentForUser(user);
  const assessment = await prisma.assessment.findFirst({ where: { id, OR: [{ branchBatchId: student.batchId }, { branchBatch: { batchId: student.batchId } }], branchCourseId: student.courseId || undefined }, include: { ...include, submissions: { where: { branchStudentId: student.id } } } });
  if (!assessment) throw new AppError("Assessment not found.", 404);
  return { ...serialize(assessment), submission: assessment.submissions[0] || null };
}

export async function submitAssessment(user, id, payload = {}) {
  const student = await studentForUser(user);
  const assessment = await prisma.assessment.findFirst({ where: { id, OR: [{ branchBatchId: student.batchId }, { branchBatch: { batchId: student.batchId } }] } });
  if (!assessment) throw new AppError("Assessment not found.", 404);
  if (windowStatus(assessment.startDate, assessment.endDate) !== "ACTIVE") throw new AppError("This assessment is outside its submission window.", 422);
  const existing = await prisma.assessmentSubmission.findUnique({ where: { assessmentId_branchStudentId: { assessmentId: id, branchStudentId: student.id } } });
  if (existing?.status !== "NOT_SUBMITTED") throw new AppError("This assessment has already been submitted.", 409);
  const response = payload.response ?? payload.submissionData ?? payload;
  return prisma.assessmentSubmission.upsert({ where: { assessmentId_branchStudentId: { assessmentId: id, branchStudentId: student.id } }, create: { assessmentId: id, branchStudentId: student.id, response: typeof response === "string" ? response : JSON.stringify(response), submittedAt: new Date(), status: "SUBMITTED" }, update: { response: typeof response === "string" ? response : JSON.stringify(response), submittedAt: new Date(), status: "SUBMITTED" } });
}

export async function getStudentSubmission(user, id) {
  const student = await studentForUser(user);
  const result = await prisma.assessmentSubmission.findUnique({ where: { assessmentId_branchStudentId: { assessmentId: id, branchStudentId: student.id } }, include: { assessment: { select: { totalMarks: true } } } });
  if (!result) return null;
  return { ...result, percentage: result.marksObtained == null ? null : (result.marksObtained / result.assessment.totalMarks) * 100 };
}

export const getStudentAssessmentSubmission = getStudentSubmission;

export async function updateAssessment(user, id, payload = {}) {
  const existing = await prisma.assessment.findFirst({ where: { id, facultyId: user.id } });
  if (!existing) throw new AppError("Assessment not found.", 404);
  const startDate = payload.startDate ? date(payload.startDate, "Start date") : existing.startDate;
  const endDate = payload.endDate ? date(payload.endDate, "End date") : existing.endDate;
  if (endDate <= startDate) throw new AppError("End date must be after start date.", 422);
  const totalMarks = payload.totalMarks == null ? existing.totalMarks : Number(payload.totalMarks);
  if (!Number.isInteger(totalMarks) || totalMarks <= 0) throw new AppError("Total marks must be positive.", 422);
  return serialize(await prisma.assessment.update({ where: { id }, data: { assessmentName: payload.assessmentName == null ? existing.assessmentName : text(payload.assessmentName), totalMarks, startDate, endDate, details: payload.details == null ? existing.details : text(payload.details) || null }, include }));
}
