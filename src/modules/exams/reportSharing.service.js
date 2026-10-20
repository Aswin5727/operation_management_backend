import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const value = (input) => String(input ?? "").trim();
const list = (input) => Array.isArray(input) ? [...new Set(input.map(value).filter(Boolean))] : [];

async function activeBatchCycle(batchId, tx = prisma) {
  const cycle = await tx.batchCycle.findFirst({ where: { batchId, status: "ACTIVE" }, orderBy: { cycleNumber: "desc" }, select: { id: true, cycleNumber: true, cycleName: true, status: true } });
  if (cycle) return cycle;
  const latest = await tx.batchCycle.findFirst({ where: { batchId }, orderBy: { cycleNumber: "desc" }, select: { cycleNumber: true } });
  if (latest) throw new AppError("This batch has no active intake cycle. Start a new intake before sending syllabus reports.", 409);
  return tx.batchCycle.upsert({ where: { batchId_cycleNumber: { batchId, cycleNumber: 1 } }, update: { status: "ACTIVE" }, create: { batchId, cycleNumber: 1, cycleName: "Cycle 1", status: "ACTIVE" }, select: { id: true, cycleNumber: true, cycleName: true, status: true } });
}

function facultyBatchWhere(user, batchId) {
  const ids = [...new Set([user.id, user.userCode].map(value).filter(Boolean))];
  return { id: batchId, status: "ACTIVE", OR: [{ facultyId: { in: ids } }, { branchFaculty: { facultyId: { in: ids }, status: "ACTIVE" } }] };
}

export async function sendFacultyReport(user, payload = {}) {
  const batchId = value(payload.batchId);
  const testModuleIds = list(payload.testModuleIds);
  const assessmentModuleIds = list(payload.assessmentModuleIds);
  if (!batchId || (!testModuleIds.length && !assessmentModuleIds.length)) throw new AppError("Select a batch and at least one report module.", 422);
  const batch = await prisma.branchBatch.findFirst({ where: facultyBatchWhere(user, batchId), include: { branch: true, branchCourse: { select: { id: true, name: true } } } });
  if (!batch) throw new AppError("Batch not found or not assigned to this faculty.", 403);
  const moduleIds = [...new Set([...testModuleIds, ...assessmentModuleIds])];
  const modules = await prisma.branchCourseModule.findMany({ where: { id: { in: moduleIds }, branchCourseId: batch.branchCourseId, status: "ACTIVE" }, select: { id: true, title: true } });
  if (modules.length !== moduleIds.length) throw new AppError("One or more selected modules are not valid for this batch.", 422);
  const batchCycle = await activeBatchCycle(batch.id);
  const [tests, assessments] = await Promise.all([
    testModuleIds.length ? prisma.exam.findMany({ where: { facultyId: user.id, branchCourseId: batch.branchCourseId, moduleId: { in: testModuleIds }, schedules: { some: { branchBatchId: batch.id, batchCycleId: batchCycle.id } } }, select: { moduleId: true } }) : [],
    assessmentModuleIds.length ? prisma.assessment.findMany({ where: { facultyId: user.id, branchCourseId: batch.branchCourseId, branchBatchId: batch.id, batchCycleId: batchCycle.id, moduleId: { in: assessmentModuleIds } }, select: { moduleId: true } }) : [],
  ]);
  const testValid = new Set(tests.map((row) => row.moduleId)); const assessmentValid = new Set(assessments.map((row) => row.moduleId));
  if (testModuleIds.some((id) => !testValid.has(id)) || assessmentModuleIds.some((id) => !assessmentValid.has(id))) throw new AppError("Selected report modules are not available for this faculty batch.", 403);
  const share = await prisma.facultyReportShare.create({ data: { facultyId: user.id, branchId: batch.branchId, batchId: batch.id, batchCycleId: batchCycle.id, courseId: batch.branchCourseId, testModuleIds, assessmentModuleIds } });
  await createNotification({ kind: "FACULTY_REPORT_SHARED", tone: "blue", title: "Faculty report shared", message: `${user.fullName || "Faculty"} shared ${modules.map((module) => module.title).join(", ")} reports for ${batch.batchName}.`, actionLabel: "View report", targetBranchId: batch.branchId, targetBranchEmail: batch.branch?.branchEmail, targetBranchName: batch.branch?.branchName, targetUserId: batch.branch?.adminUserId || null, createdBy: user.id, batchId: batch.id, branchCourseId: batch.branchCourseId, branchCourseName: batch.branchCourse?.name, facultyId: user.id, facultyName: user.fullName });
  return { id: share.id, sentAt: share.sentAt, batch: { id: batch.id, name: batch.batchName }, course: batch.branchCourse, testModuleIds, assessmentModuleIds };
}

async function branchAdminBranch(user) {
  const impersonatedBranchId = value(user?.impersonatedBranchId);
  const where = impersonatedBranchId && String(user?.role || '').toUpperCase() === 'SUPER_ADMIN'
    ? { OR: [{ id: impersonatedBranchId }, { branchId: impersonatedBranchId }] }
    : { OR: [{ adminUserId: user.id }, { branchEmail: user.email }] };
  const branch = await prisma.branch.findFirst({ where, select: { id: true, branchName: true } });
  if (!branch) throw new AppError("Branch scope not found.", 403);
  return branch;
}

async function studentReportBranch(user) {
  if (String(user?.role || "").toUpperCase() === "FACULTY") {
    const branch = await getCurrentBranchProfile(user);
    if (!branch?.id) throw new AppError("Branch profile not found.", 403);
    return branch;
  }
  return branchAdminBranch(user);
}

export async function listBranchReportShares(user) {
  const branch = await branchAdminBranch(user);
  // Academic Test reports have their own Branch Admin screen and must not be
  // mixed into the Syllabus Test / module report list.
  const rows = await prisma.facultyReportShare.findMany({ where: { branchId: branch.id, status: { in: ["SENT", "ARCHIVED"] }, reportType: { not: "ACADEMIC_TEST" } }, orderBy: { sentAt: "desc" } });
  const ids = (key) => rows.map((row) => row[key]);
  const moduleIds = [...new Set(rows.flatMap((row) => [...list(row.testModuleIds), ...list(row.assessmentModuleIds)]))];
  const [batches, courses, faculties, modules] = await Promise.all([
    prisma.branchBatch.findMany({ where: { id: { in: ids("batchId") } }, select: { id: true, batchName: true, batchId: true } }),
    prisma.branchCourse.findMany({ where: { id: { in: ids("courseId") } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: ids("facultyId") } }, select: { id: true, fullName: true } }),
    prisma.branchCourseModule.findMany({ where: { id: { in: moduleIds } }, select: { id: true, title: true } }),
  ]);
  const batchMap = new Map(batches.map((row) => [row.id, row])); const courseMap = new Map(courses.map((row) => [row.id, row])); const facultyMap = new Map(faculties.map((row) => [row.id, row])); const moduleMap = new Map(modules.map((row) => [row.id, row.title]));
  const cycleIds = rows.map((row) => row.batchCycleId).filter(Boolean);
  const cycles = cycleIds.length ? await prisma.batchCycle.findMany({ where: { id: { in: cycleIds } }, select: { id: true, cycleNumber: true, cycleName: true, status: true } }) : [];
  const cycleMap = new Map(cycles.map((row) => [row.id, row]));
  return rows.map((row) => ({ ...row, batch: batchMap.get(row.batchId), cycle: cycleMap.get(row.batchCycleId) || null, course: courseMap.get(row.courseId), faculty: facultyMap.get(row.facultyId), moduleNames: [...new Set([...list(row.testModuleIds), ...list(row.assessmentModuleIds)].map((id) => moduleMap.get(id)).filter(Boolean))] }));
}

export async function getBranchReportShare(user, shareId) {
  const branch = await branchAdminBranch(user);
  const share = await prisma.facultyReportShare.findFirst({ where: { id: shareId, branchId: branch.id, status: { in: ["SENT", "ARCHIVED"] } } });
  if (!share) throw new AppError("Report share not found.", 404);
  return share;
}

export async function getBranchReportShareStudents(user, shareId) {
  const share = await getBranchReportShare(user, shareId);
  const testModuleIds = list(share.testModuleIds); const assessmentModuleIds = list(share.assessmentModuleIds);
  const batch = await prisma.branchBatch.findUnique({ where: { id: share.batchId }, select: { batchId: true } });
  const studentScope = share.batchCycleId ? [{ courseEnrollments: { some: { status: "ACTIVE", batchId: { in: [share.batchId, batch?.batchId].filter(Boolean) }, batchCycleId: share.batchCycleId } } }] : [{ batchId: share.batchId }, { batchId: batch?.batchId }];
  const students = await prisma.branchStudent.findMany({ where: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } }, OR: studentScope }, select: { id: true, studentId: true, studentName: true, emailAddress: true }, orderBy: { studentName: "asc" } });
  const result = { shareId, students: students.map((student) => ({ studentId: student.studentId, studentName: student.studentName, emailAddress: student.emailAddress, tests: [], assessments: [] })) };
  const studentMap = new Map(result.students.map((student) => [student.studentId, student]));
  if (testModuleIds.length) {
    const exams = await prisma.exam.findMany({ where: { branchCourseId: share.courseId, moduleId: { in: testModuleIds }, createdAt: { lte: share.sentAt }, schedules: { some: { branchBatchId: share.batchId, ...(share.batchCycleId ? { batchCycleId: share.batchCycleId } : {}) } } }, select: { id: true, title: true, module: { select: { id: true, title: true } }, totalMarks: true, schedules: { where: { branchBatchId: share.batchId, ...(share.batchCycleId ? { batchCycleId: share.batchCycleId } : {}) }, select: { id: true } } } });
    const attempts = await prisma.examAttempt.findMany({ where: { scheduleId: { in: exams.flatMap((exam) => exam.schedules.map((schedule) => schedule.id)) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { scheduleId: true, branchStudentId: true, status: true, obtainedMarks: true, totalMarks: true, percentage: true } });
    const attemptMap = new Map(attempts.map((attempt) => [`${attempt.branchStudentId}:${attempt.scheduleId}`, attempt]));
    students.forEach((student) => { const target = studentMap.get(student.studentId); target.tests = exams.map((exam) => { const attempt = exam.schedules[0] ? attemptMap.get(`${student.id}:${exam.schedules[0].id}`) : null; return { module: exam.module.title, testName: exam.title, status: attempt?.status || "NOT_ATTEMPTED", marks: attempt?.status === "SUBMITTED" ? `${attempt.obtainedMarks} / ${attempt.totalMarks || exam.totalMarks}` : "Pending Evaluation", percentage: attempt?.status === "SUBMITTED" ? attempt.percentage : null }; }); });
  }
  if (assessmentModuleIds.length) {
    const assessments = await prisma.assessment.findMany({ where: { branchCourseId: share.courseId, branchBatchId: share.batchId, moduleId: { in: assessmentModuleIds }, ...(share.batchCycleId ? { batchCycleId: share.batchCycleId } : {}), createdAt: { lte: share.sentAt } }, select: { id: true, assessmentName: true, totalMarks: true, isReassessment: true, reassessmentStudentId: true, module: { select: { title: true } } } });
    const submissions = await prisma.assessmentSubmission.findMany({ where: { assessmentId: { in: assessments.map((assessment) => assessment.id) }, branchStudentId: { in: students.map((student) => student.id) } }, select: { assessmentId: true, branchStudentId: true, status: true, marksObtained: true, feedback: true } });
    const submissionMap = new Map(submissions.map((submission) => [`${submission.branchStudentId}:${submission.assessmentId}`, submission]));
    students.forEach((student) => { const target = studentMap.get(student.studentId); target.assessments = assessments.filter((assessment) => !assessment.isReassessment || assessment.reassessmentStudentId === student.id).map((assessment) => { const submission = submissionMap.get(`${student.id}:${assessment.id}`); const evaluated = submission?.status === "EVALUATED" && submission.marksObtained != null; return { module: assessment.module.title, assessmentName: assessment.assessmentName, status: submission?.status || "NOT_SUBMITTED", marks: evaluated ? `${submission.marksObtained} / ${assessment.totalMarks}` : "Pending Evaluation", percentage: evaluated ? (submission.marksObtained / assessment.totalMarks) * 100 : null, feedback: submission?.feedback || null }; }); });
  }
  return result;
}

export async function getBranchStudentReports(user, studentId) {
  // This endpoint is also used by the Faculty Dashboard Course Completion
  // modal. Faculty may read marks, but cannot change report history here.
  const branch = await studentReportBranch(user);
  const student = await prisma.branchStudent.findFirst({
    where: { branchId: branch.id, studentId: value(studentId), recordStatus: "ACTIVE" },
    // Completed students are moved to a new intake cycle after the final
    // report is sent. Keep their historical enrollment cycles in scope so
    // the Course Completion details modal can still show the marks from the
    // cycle in which the reports were submitted.
    select: { id: true, studentId: true, studentName: true, emailAddress: true, courseName: true, batchName: true, batchId: true, courseEnrollments: { select: { courseId: true, batchId: true, batchCycleId: true } } },
  });
  if (!student) throw new AppError("Student not found in this branch.", 404);

  const studentBatchKeys = [...new Set([student.batchId, ...(student.courseEnrollments || []).map((enrollment) => enrollment.batchId)].map(value).filter(Boolean))];
  const batches = await prisma.branchBatch.findMany({ where: { branchId: branch.id, OR: [{ id: { in: studentBatchKeys } }, { batchId: { in: studentBatchKeys } }] }, select: { id: true, batchId: true } });
  const batchIds = new Set(batches.flatMap((batch) => [batch.id, batch.batchId]).filter(Boolean));
  const shares = await prisma.facultyReportShare.findMany({ where: { branchId: branch.id, status: { in: ["SENT", "ARCHIVED"] }, reportType: { not: "ACADEMIC_TEST" }, batchId: { in: [...batchIds] } }, orderBy: { sentAt: "asc" } });
  const items = [];
  for (const share of shares) {
    if (share.batchCycleId && !(student.courseEnrollments || []).some((enrollment) => enrollment.batchCycleId === share.batchCycleId)) continue;
    const moduleIds = list(share.testModuleIds);
    if (!moduleIds.length) continue;
    const exams = await prisma.exam.findMany({
      where: { branchCourseId: share.courseId, moduleId: { in: moduleIds }, status: { not: "CANCELLED" }, createdAt: { lte: share.sentAt }, schedules: { some: { branchBatchId: share.batchId } } },
      select: { id: true, title: true, totalMarks: true, module: { select: { title: true } }, schedules: { where: { branchBatchId: share.batchId }, select: { id: true, testDate: true } } },
    });
    const attempts = await prisma.examAttempt.findMany({ where: { branchStudentId: student.id, scheduleId: { in: exams.flatMap((exam) => exam.schedules.map((schedule) => schedule.id)) } }, orderBy: { submittedAt: "asc" }, select: { scheduleId: true, status: true, obtainedMarks: true, totalMarks: true, percentage: true, submittedAt: true } });
    const attemptsBySchedule = new Map(attempts.map((attempt) => [attempt.scheduleId, attempt]));
    for (const exam of exams) {
      const schedule = exam.schedules[0];
      const attempt = schedule ? attemptsBySchedule.get(schedule.id) : null;
      if (!attempt || attempt.status !== "SUBMITTED") continue;
      items.push({ id: `${share.id}:${exam.id}:${student.id}`, testName: exam.title, module: exam.module?.title || "-", status: "SUBMITTED", marksObtained: attempt.obtainedMarks, totalMarks: attempt.totalMarks || exam.totalMarks, percentage: attempt.percentage, testDate: schedule.testDate, courseId: share.courseId, courseName: student.courseName, batchName: student.batchName });
    }
  }
  // The same syllabus test can be included in multiple sent submissions.
  // Keep one latest row per module/test instead of displaying duplicates.
  const uniqueItems = [...new Map(items.map((item) => [`${item.module}:${item.testName}`, item])).values()];
  const moduleResults = new Map();
  for (const item of uniqueItems) {
    const key = String(item.module || item.moduleName || "").trim();
    if (!key) continue;
    const current = moduleResults.get(key) || { moduleName: item.module || item.moduleName || "-", obtained: 0, maximum: 0, testCount: 0, tests: [] };
    current.obtained += Number(item.marksObtained || 0);
    current.maximum += Number(item.totalMarks || 0);
    current.testCount += 1;
    current.tests.push({ testName: item.testName, marksObtained: item.marksObtained, totalMarks: item.totalMarks, percentage: item.percentage });
    moduleResults.set(key, current);
  }
  const skills = [...moduleResults.values()].map((module) => ({
    ...module,
    overallPercentage: module.maximum > 0 ? Number(((module.obtained / module.maximum) * 100).toFixed(2)) : null,
    reportStatus: "SUBMITTED",
  }));
  return { student, items: uniqueItems, skills };
}
