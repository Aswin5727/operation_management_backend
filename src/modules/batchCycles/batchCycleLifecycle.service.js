import prisma from "../../config/prisma.js";
import { getAcademicTestProgressForStudent } from "../academicTests/academicTests.service.js";

const FREEZE_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

function eligibleEnrollment(enrollment) {
  return enrollment.status === "ACTIVE" && enrollment.branchStudent?.recordStatus === "ACTIVE";
}

function jsonList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

async function cycleReportsComplete(cycle) {
  const batch = await prisma.branchBatch.findUnique({ where: { id: cycle.batchId }, select: { branchCourseId: true } });
  const [shares, academicSchedules, academicItems, syllabusExams, assessments] = await Promise.all([
    prisma.facultyReportShare.findMany({
      where: { batchId: cycle.batchId, status: "SENT", OR: [{ batchCycleId: cycle.id }, { batchCycleId: null }] },
      select: { reportType: true, academicTestIds: true, testModuleIds: true, assessmentModuleIds: true },
    }),
    prisma.academicScheduledTest.findMany({
      where: { branchBatchId: cycle.batchId, isRetest: false, status: { not: "CANCELLED" }, cycle: { batchCycleId: cycle.id } },
      select: { id: true, academicTestItemId: true },
    }),
    prisma.academicTestItem.findMany({
      where: { academicTest: { branchCourseId: batch?.branchCourseId, batches: { some: { branchBatchId: cycle.batchId } } } },
      select: { id: true, testType: true },
    }),
    prisma.exam.findMany({
      where: { schedules: { some: { branchBatchId: cycle.batchId, batchCycleId: cycle.id } }, status: { not: "CANCELLED" } },
      select: { moduleId: true },
    }),
    prisma.assessment.findMany({
      where: { branchBatchId: cycle.batchId, batchCycleId: cycle.id },
      select: { moduleId: true },
    }),
  ]);

  const academicIds = new Set(shares.flatMap((share) => jsonList(share.academicTestIds)));
  const scheduledItemIds = new Set(academicSchedules.map((schedule) => schedule.academicTestItemId));
  const allAcademicItemsScheduled = academicItems.every((item) => scheduledItemIds.has(item.id));
  const sentAcademicReports = allAcademicItemsScheduled
    && academicSchedules.every((schedule) => academicIds.has(schedule.id));
  const sentTestModules = new Set(shares.flatMap((share) => jsonList(share.testModuleIds)));
  const sentAssessmentModules = new Set(shares.flatMap((share) => jsonList(share.assessmentModuleIds)));
  const requiredTestModules = new Set(syllabusExams.map((exam) => exam.moduleId).filter(Boolean));
  const requiredAssessmentModules = new Set(assessments.map((assessment) => assessment.moduleId).filter(Boolean));
  const sentSyllabusReports = [...requiredTestModules].every((moduleId) => sentTestModules.has(moduleId))
    && [...requiredAssessmentModules].every((moduleId) => sentAssessmentModules.has(moduleId));

  return { complete: sentAcademicReports && sentSyllabusReports, sentAcademicReports, sentSyllabusReports };
}

async function cycleCompletionState(cycle) {
  const enrollments = await prisma.branchStudentCourse.findMany({
    where: { batchCycleId: cycle.id, status: "ACTIVE", branchStudent: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } } } },
    include: { branchStudent: { select: { id: true, branchId: true, batchId: true, courseId: true, courseProgress: true, courseCompletedAt: true, recordStatus: true } } },
  });
  const eligible = enrollments.filter(eligibleEnrollment);
  if (!eligible.length) return { eligibleCount: 0, completedCount: 0, complete: false };
  const reportState = await cycleReportsComplete(cycle);
  if (!reportState.complete) return { eligibleCount: eligible.length, completedCount: 0, complete: false, ...reportState };
  let completedCount = 0;
  let incompleteStudentCount = 0;
  for (const enrollment of eligible) {
    const student = enrollment.branchStudent;
    const progress = Number(enrollment.courseProgress ?? student.courseProgress ?? 0);
    const academic = await getAcademicTestProgressForStudent({ ...student, batchId: enrollment.batchId || student.batchId, courseId: enrollment.courseId, courseProgress: progress });
    const studentComplete = progress >= 100
      && Boolean(academic.academicComplete)
      && Number(academic.pendingTests || 0) === 0
      && Number(academic.pendingProjects || 0) === 0
      && Number(academic.pendingEvaluations || 0) === 0;
    if (studentComplete) completedCount += 1;
    else incompleteStudentCount += 1;
  }
  // Never complete an intake while even one active student is incomplete.
  // This explicit guard also prevents a new batch with an incomplete student
  // from being frozen by the lifecycle scheduler.
  return {
    eligibleCount: eligible.length,
    completedCount,
    incompleteStudentCount,
    complete: eligible.length > 0 && incompleteStudentCount === 0 && completedCount === eligible.length,
    ...reportState,
  };
}

async function completeCycle(cycle) {
  const state = await cycleCompletionState(cycle);
  if (
    !state.complete
    || state.eligibleCount <= 0
    || state.incompleteStudentCount > 0
    || state.completedCount !== state.eligibleCount
    || cycle.status !== "ACTIVE"
  ) return { cycle, ...state, changed: false };
  const completedAt = new Date();
  const freezeUntil = new Date(completedAt.getTime() + FREEZE_MS);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cycle.batchId}))`;
    const current = await tx.batchCycle.findUnique({ where: { id: cycle.id } });
    if (!current || current.status !== "ACTIVE") return current;
    return tx.batchCycle.update({ where: { id: current.id }, data: { status: "COMPLETED", completedAt, freezeUntil, endDate: current.endDate || completedAt.toISOString().slice(0, 10) } });
  });
  return { cycle: updated, ...state, changed: Boolean(updated) };
}

async function resetExpiredCycle(cycle) {
  if (cycle.status !== "COMPLETED" || !cycle.freezeUntil || cycle.freezeUntil > new Date()) return { cycle, changed: false };
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cycle.batchId}))`;
    const current = await tx.batchCycle.findUnique({ where: { id: cycle.id } });
    if (!current || current.status !== "COMPLETED" || !current.freezeUntil || current.freezeUntil > new Date()) return current;
    const active = await tx.batchCycle.findFirst({ where: { batchId: current.batchId, status: "ACTIVE" }, select: { id: true } });
    if (active) return active;
    const latest = await tx.batchCycle.findFirst({ where: { batchId: current.batchId }, orderBy: { cycleNumber: "desc" }, select: { cycleNumber: true } });
    const cycleNumber = Number(latest?.cycleNumber || current.cycleNumber) + 1;
    return tx.batchCycle.upsert({
      where: { batchId_cycleNumber: { batchId: current.batchId, cycleNumber } },
      update: { status: "ACTIVE", completedAt: null, freezeUntil: null, endDate: null },
      create: { batchId: current.batchId, cycleNumber, cycleName: `Cycle ${cycleNumber}`, status: "ACTIVE", startDate: new Date().toISOString().slice(0, 10) },
    });
  });
  return { cycle: result, changed: result?.id !== cycle.id };
}

export async function reconcileBatchLifecycle(batchId = null) {
  const cycles = await prisma.batchCycle.findMany({ where: { ...(batchId ? { batchId } : {}), OR: [{ status: "ACTIVE" }, { status: "COMPLETED", freezeUntil: { lte: new Date() } }] }, orderBy: { updatedAt: "asc" } });
  const results = [];
  for (const cycle of cycles) {
    const completed = cycle.status === "ACTIVE" ? await completeCycle(cycle) : { cycle, changed: false };
    const current = completed.cycle || cycle;
    results.push(completed.changed ? completed : await resetExpiredCycle(current));
  }
  return results;
}

export async function startBatchCycleLifecycleScheduler() {
  const run = () => void reconcileBatchLifecycle().catch((error) => console.warn(`Batch cycle lifecycle reconciliation failed: ${error?.message || error}`));
  await reconcileBatchLifecycle().catch((error) => console.warn(`Initial batch cycle lifecycle reconciliation failed: ${error?.message || error}`));
  const timer = setInterval(run, SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}

export { FREEZE_MS };
