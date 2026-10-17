import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";

const text = (value) => String(value ?? "").trim();
const idsFor = (actor) => [...new Set([actor?.id, actor?.userCode].map(text).filter(Boolean))];
const positiveInt = (value, fallback = 0) => { const number = Number(value); return Number.isInteger(number) && number >= 0 ? number : fallback; };
const paperInclude = () => ({ questions: { orderBy: { questionNumber: "asc" } } });
const requiredParts = (type) => ({ paper: type === "TEST" || type === "TEST_AND_PROJECT", project: type === "PROJECT" || type === "TEST_AND_PROJECT" });
const paperPublic = (paper) => paper ? { ...paper, questions: paper.questions || [] } : null;
const projectPublic = (project) => project ? { ...project } : null;
function statusFor(item, paper, project) { const required = requiredParts(item.testType); const values = []; if (required.paper) values.push(paper?.status || "NOT_PREPARED"); if (required.project) values.push(project?.status || "NOT_PREPARED"); return { status: values.every((value) => value === "PREPARED") ? "PREPARED" : values.every((value) => value === "NOT_PREPARED") ? "NOT_PREPARED" : "DRAFT", paperStatus: required.paper ? paper?.status || "NOT_PREPARED" : null, projectStatus: required.project ? project?.status || "NOT_PREPARED" : null }; }

async function scopeItem(actor, itemId, branchBatchId) {
  const facultyIds = idsFor(actor);
  let item = await prisma.academicTestItem.findFirst({ where: { id: text(itemId), academicTest: { batches: { some: { branchBatchId: text(branchBatchId), branchBatch: { status: "ACTIVE", OR: [{ facultyId: { in: facultyIds } }, { branchFaculty: { facultyId: { in: facultyIds }, status: "ACTIVE" } }] } } } } }, include: { academicTest: { include: { branchCourse: true } } } });
  if (!item) {
    const retest = await prisma.academicScheduledTest.findFirst({ where: { academicTestItemId: text(itemId), branchBatchId: text(branchBatchId), isRetest: true, facultyId: { in: facultyIds }, status: { not: "CANCELLED" } }, select: { academicTestItemId: true } });
    if (retest) item = await prisma.academicTestItem.findUnique({ where: { id: retest.academicTestItemId }, include: { academicTest: { include: { branchCourse: true } } } });
  }
  if (!item) throw new AppError("This Academic Test is not assigned to you.", 403);
  const configuredTestCount = Number(item.academicTest.branchCourse.academicTestCount || 0);
  if (configuredTestCount > 0 && Number(item.sequence) > configuredTestCount) {
    throw new AppError("This Academic Test is outside the configured test count.", 404);
  }
  const batch = await prisma.branchBatch.findFirst({ where: { id: text(branchBatchId), status: "ACTIVE", branchCourseId: item.academicTest.branchCourseId } });
  if (!batch) throw new AppError("Academic Test batch not found.", 404);
  return { item, batch, course: item.academicTest.branchCourse };
}
async function scopePaper(actor, paperId) { const paper = await prisma.academicQuestionPaper.findUnique({ where: { id: text(paperId) }, include: { ...paperInclude(), academicTestItem: true, branchBatch: true, branchCourse: true } }); if (!paper) throw new AppError("Question paper not found.", 404); await scopeItem(actor, paper.academicTestItemId, paper.branchBatchId); return paper; }
function normalizeQuestions(questions) { if (!Array.isArray(questions)) return []; return questions.map((question, index) => { const questionType = text(question?.questionType || "MCQ").toUpperCase() === "ASSESSMENT" ? "ASSESSMENT" : "MCQ"; return { questionNumber: index + 1, questionType, questionText: text(question?.questionText), optionA: questionType === "MCQ" ? text(question?.optionA) : "", optionB: questionType === "MCQ" ? text(question?.optionB) : "", optionC: questionType === "MCQ" ? text(question?.optionC) : "", optionD: questionType === "MCQ" ? text(question?.optionD) : "", correctAnswer: questionType === "MCQ" ? text(question?.correctAnswer).toUpperCase() : "", marks: positiveInt(question?.marks, 1) || 1 }; }).filter((question) => Object.values(question).some(Boolean)); }
function validateQuestions(questions) { if (!questions.length) throw new AppError("Add at least one question before preparing the paper.", 422); const answers = new Set(["A", "B", "C", "D"]); for (const question of questions) { if (!question.questionText || question.marks < 1) throw new AppError(`Complete the question and marks for question ${question.questionNumber}.`, 422); if (question.questionType === "MCQ" && (!question.optionA || !question.optionB || !question.optionC || !question.optionD || !answers.has(question.correctAnswer))) throw new AppError(`Complete all MCQ fields for question ${question.questionNumber}.`, 422); } }
function normalizePassMark(value, totalMarks, status) { const passMark = positiveInt(value, 0); if (status === "PREPARED" && (passMark <= 0 || passMark > totalMarks)) throw new AppError(`Pass Mark must be between 1 and ${totalMarks}.`, 422); return passMark; }
function getItemPublic(item, course, batch, paper, project) { return { academicTestId: item.academicTestId, academicTestItemId: item.id, sequence: item.sequence, testType: item.testType, requiredProgress: item.requiredProgress, course: { id: course.id, courseCode: course.courseCode, name: course.name }, batch: { id: batch.id, batchName: batch.batchName, batchId: batch.batchId }, ...statusFor(item, paper, project), paper: paperPublic(paper), project: projectPublic(project) }; }

async function activeCycle(itemId, batchId, actorId = "system", tx = prisma) {
  const current = await tx.academicTestCycle.findFirst({ where: { academicTestItemId: itemId, branchBatchId: batchId, status: "ACTIVE" }, orderBy: { cycleNumber: "desc" } });
  if (current) return current;
  const latest = await tx.academicTestCycle.findFirst({ where: { academicTestItemId: itemId, branchBatchId: batchId }, orderBy: { cycleNumber: "desc" }, select: { cycleNumber: true } });
  return tx.academicTestCycle.create({ data: { academicTestItemId: itemId, branchBatchId: batchId, cycleNumber: Number(latest?.cycleNumber || 0) + 1, createdBy: actorId } });
}

async function cycleProgress(item, batchId) {
  const configuredItems = await prisma.academicTestItem.findMany({ where: { academicTestId: item.academicTestId, sequence: { lte: Number(item.academicTest?.branchCourse?.academicTestCount || 0) } }, select: { id: true } });
  const cycleIds = await prisma.academicTestCycle.findMany({ where: { academicTestItemId: { in: configuredItems.map(({ id }) => id) }, branchBatchId: batchId, status: "ACTIVE" }, select: { id: true } });
  if (!configuredItems.length) return 0;
  const completed = await prisma.academicScheduledTest.count({ where: { cycleId: { in: cycleIds.map(({ id }) => id) }, isRetest: false, status: "COMPLETED" } });
  return Math.round(Math.min(100, (completed / configuredItems.length) * 100));
}

async function courseProgressForBatch(batch) {
  const batchKeys = [batch.id, batch.batchId].map(text).filter(Boolean);
  const [students, schedules] = await Promise.all([prisma.branchStudent.findMany({
    where: {
      recordStatus: "ACTIVE",
      discontinuationRequests: { none: { status: "APPROVED" } },
      OR: [
        { batchId: { in: batchKeys } },
        { courseEnrollments: { some: { status: "ACTIVE", batchId: { in: batchKeys } } } },
      ],
    },
    select: {
      courseProgress: true,
      courseEnrollments: { where: { status: "ACTIVE", batchId: { in: batchKeys } }, select: { courseProgress: true } },
    },
  }), prisma.academicScheduledTest.findMany({ where: { branchBatchId: batch.id, isRetest: false, status: { not: "CANCELLED" } }, select: { status: true } })]);
  const academicComplete = schedules.length > 0 && schedules.every((schedule) => schedule.status === "COMPLETED");
  const values = students.map((student) => student.courseEnrollments[0]?.courseProgress ?? student.courseProgress).map(Number).filter((value) => Number.isFinite(value) && (value < 100 || !academicComplete));
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export async function startNewCycle(actor, payload = {}) {
  const context = await scopeItem(actor, payload.academicTestItemId || payload.itemId, payload.branchBatchId || payload.batchId);
  const cycle = await prisma.$transaction(async (tx) => {
    const items = await tx.academicTestItem.findMany({ where: { academicTestId: context.item.academicTestId, sequence: { lte: Number(context.course.academicTestCount || 0) } }, orderBy: { sequence: "asc" }, select: { id: true } });
    let selectedCycle = null;
    for (const item of items) {
      const current = await tx.academicTestCycle.findFirst({ where: { academicTestItemId: item.id, branchBatchId: context.batch.id, status: "ACTIVE" }, orderBy: { cycleNumber: "desc" } });
      if (current) await tx.academicTestCycle.update({ where: { id: current.id }, data: { status: "COMPLETED" } });
      const latest = await tx.academicTestCycle.findFirst({ where: { academicTestItemId: item.id, branchBatchId: context.batch.id }, orderBy: { cycleNumber: "desc" }, select: { cycleNumber: true } });
      const nextCycle = await tx.academicTestCycle.create({ data: { academicTestItemId: item.id, branchBatchId: context.batch.id, cycleNumber: Number(latest?.cycleNumber || 0) + 1, createdBy: actor.id } });
      if (item.id === context.item.id) selectedCycle = nextCycle;
    }
    return selectedCycle;
  });
  return { cycle, progress: 0, academicTestItemId: context.item.id, branchBatchId: context.batch.id };
}

export async function getPreparation(actor, itemId, batchId) { const { item, batch, course } = await scopeItem(actor, itemId, batchId); const cycle = await activeCycle(item.id, batch.id, actor.id); const [paper, project, siblings, progress, courseProgress] = await Promise.all([prisma.academicQuestionPaper.findUnique({ where: { academicTestItemId_branchBatchId_cycleId: { academicTestItemId: item.id, branchBatchId: batch.id, cycleId: cycle.id } }, include: paperInclude() }), prisma.academicTestProject.findUnique({ where: { academicTestItemId_branchBatchId_cycleId: { academicTestItemId: item.id, branchBatchId: batch.id, cycleId: cycle.id } } }), prisma.academicTestItem.findMany({ where: { academicTestId: item.academicTestId }, orderBy: { sequence: "asc" }, include: { academicTest: { include: { branchCourse: true } }, questionPapers: { where: { branchBatchId: batch.id, cycleId: cycle.id }, include: paperInclude() }, projects: { where: { branchBatchId: batch.id, cycleId: cycle.id } } } }), cycleProgress(item, batch.id), courseProgressForBatch(batch)]); const current = getItemPublic(item, course, batch, paper, project); const configuredSiblings = siblings.filter((sibling) => sibling.sequence <= Number(course.academicTestCount || 0)); return { ...current, cycle, progress, courseProgress, tests: configuredSiblings.map((sibling) => getItemPublic(sibling, course, batch, sibling.questionPapers[0], sibling.projects[0])) }; }
export async function listPreparation(actor, query = {}) { const itemId = text(query.academicTestItemId || query.itemId); const batchId = text(query.branchBatchId || query.batchId); if (itemId && batchId) return [await getPreparation(actor, itemId, batchId)]; const ids = idsFor(actor); const items = await prisma.academicTestItem.findMany({ where: { academicTest: { batches: { some: { branchBatch: { status: "ACTIVE", OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] } } } } }, include: { academicTest: { include: { branchCourse: true, batches: { include: { branchBatch: true } } } }, questionPapers: { include: paperInclude() }, projects: true }, orderBy: [{ academicTestId: "asc" }, { sequence: "asc" }] }); const configuredItems = items.filter((item) => item.sequence <= Number(item.academicTest.branchCourse.academicTestCount || 0)); return configuredItems.flatMap((item) => item.academicTest.batches.filter(({ branchBatch }) => branchBatch?.status === "ACTIVE" && ids.includes(text(branchBatch.facultyId))).map(({ branchBatch }) => { const paper = item.questionPapers.find((entry) => entry.branchBatchId === branchBatch.id); const project = item.projects.find((entry) => entry.branchBatchId === branchBatch.id); return getItemPublic(item, item.academicTest.branchCourse, branchBatch, paper, project); })); }

export async function saveQuestionPaper(actor, payload = {}, paperId = null) { const context = paperId ? await (async () => { const existing = await scopePaper(actor, paperId); return scopeItem(actor, existing.academicTestItemId, existing.branchBatchId); })() : await scopeItem(actor, payload.academicTestItemId || payload.itemId, payload.branchBatchId || payload.batchId); if (!requiredParts(context.item.testType).paper) throw new AppError("This test type does not require a question paper.", 422); const cycle = await activeCycle(context.item.id, context.batch.id, actor.id); const questions = normalizeQuestions(payload.questions); const status = String(payload.status || "").toUpperCase() === "PREPARED" ? "PREPARED" : "DRAFT"; if (status === "PREPARED") validateQuestions(questions); const marksPerQuestion = positiveInt(payload.marksPerQuestion, 1) || 1; const totalMarks = questions.reduce((sum, question) => sum + Number(question.marks || marksPerQuestion), 0); const passMark = normalizePassMark(payload.passMark, totalMarks, status); const data = { academicTestItemId: context.item.id, branchCourseId: context.course.id, branchBatchId: context.batch.id, cycleId: cycle.id, createdBy: actor.id, status, marksPerQuestion, totalQuestions: questions.length, totalMarks, passMark }; const paper = await prisma.$transaction(async (tx) => { const saved = paperId ? await tx.academicQuestionPaper.update({ where: { id: paperId }, data }) : await tx.academicQuestionPaper.upsert({ where: { academicTestItemId_branchBatchId_cycleId: { academicTestItemId: context.item.id, branchBatchId: context.batch.id, cycleId: cycle.id } }, create: data, update: data }); await tx.academicQuestion.deleteMany({ where: { questionPaperId: saved.id } }); if (questions.length) await tx.academicQuestion.createMany({ data: questions.map((question) => ({ ...question, questionPaperId: saved.id })) }); return tx.academicQuestionPaper.findUnique({ where: { id: saved.id }, include: paperInclude() }); }); return { ...(await getPreparation(actor, context.item.id, context.batch.id)), paper: paperPublic(paper) }; }
export async function deleteQuestionPaper(actor, paperId) { const paper = await scopePaper(actor, paperId); await prisma.academicQuestionPaper.delete({ where: { id: paper.id } }); return { id: paper.id }; }
export async function saveProject(actor, payload = {}, projectId = null) { let context; if (projectId) { const existing = await prisma.academicTestProject.findUnique({ where: { id: text(projectId) } }); if (!existing) throw new AppError("Project preparation not found.", 404); context = await scopeItem(actor, existing.academicTestItemId, existing.branchBatchId); } else context = await scopeItem(actor, payload.academicTestItemId || payload.itemId, payload.branchBatchId || payload.batchId); if (!requiredParts(context.item.testType).project) throw new AppError("This test type does not require a project.", 422); const cycle = await activeCycle(context.item.id, context.batch.id, actor.id); const data = { academicTestItemId: context.item.id, branchCourseId: context.course.id, branchBatchId: context.batch.id, cycleId: cycle.id, createdBy: actor.id, status: String(payload.status || "").toUpperCase() === "PREPARED" ? "PREPARED" : "DRAFT", projectTitle: text(payload.projectTitle || payload.title), projectDescription: text(payload.projectDescription || payload.description), projectRequirements: text(payload.projectRequirements || payload.requirements) || null, projectMarks: positiveInt(payload.projectMarks, 0) }; if (data.status === "PREPARED" && (!data.projectTitle || !data.projectDescription || data.projectMarks <= 0)) throw new AppError("Complete the project title, description, and positive marks before preparing.", 422); await prisma.academicTestProject.upsert({ where: { academicTestItemId_branchBatchId_cycleId: { academicTestItemId: context.item.id, branchBatchId: context.batch.id, cycleId: cycle.id } }, create: data, update: data }); return getPreparation(actor, context.item.id, context.batch.id); }
export async function deleteProject(actor, projectId) { const project = await prisma.academicTestProject.findUnique({ where: { id: text(projectId) } }); if (!project) throw new AppError("Project preparation not found.", 404); await scopeItem(actor, project.academicTestItemId, project.branchBatchId); await prisma.academicTestProject.delete({ where: { id: project.id } }); return { id: project.id }; }
export async function getPaperForPdf(actor, paperId) { const paper = await scopePaper(actor, paperId); const project = await prisma.academicTestProject.findFirst({ where: { academicTestItemId: paper.academicTestItemId, branchBatchId: paper.branchBatchId, cycleId: paper.cycleId } }); return { paper, project }; }
