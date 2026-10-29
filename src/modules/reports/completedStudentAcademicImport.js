import AppError from "../../common/errors/AppError.js";

const clean = (value) => value === null || value === undefined ? "" : String(value).trim();
const missing = (value) => !clean(value) || ["-", "N/A"].includes(clean(value).toUpperCase());
const score = (value) => { if (missing(value)) return null; const parsed = Number(clean(value).replace(/%/g, "")); return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null; };

function hasTestResult(submission, projectSubmission) {
  const status = String(submission?.status || "").toUpperCase();
  return Boolean(submission?.submittedAt) || ["SUBMITTED", "EVALUATED"].includes(status) || projectSubmission?.marksAwarded !== null && projectSubmission?.marksAwarded !== undefined;
}

function chooseSchedule(schedules, submissions, projects, studentId) {
  const submissionById = new Map(submissions.map((item) => [item.academicTestId, item]));
  const projectById = new Map(projects.map((item) => [item.academicTestId, item]));
  const original = schedules.find((item) => !item.isRetest);
  if (!original) return null;
  const candidates = schedules
    .filter((item) => item.isRetest && (!item.retestStudentId || item.retestStudentId === studentId))
    .sort((left, right) => Number(right.attemptNumber || 0) - Number(left.attemptNumber || 0) || new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  return candidates.find((item) => hasTestResult(submissionById.get(item.id), projectById.get(item.id))) || original;
}

async function context(tx, student, course, batchId) {
  let batch = batchId
    ? await tx.branchBatch.findFirst({ where: { branchId: student.branchId, OR: [{ id: batchId }, { batchId }] }, select: { id: true } })
    : null;

  let items = [];
  let schedules = [];
  let submissions = [];
  let projects = [];
  let projectConfigs = [];

  if (batch) {
    const tests = await tx.academicTest.findMany({
      where: { branchCourseId: course.id, batches: { some: { branchBatchId: batch.id } } },
      select: { items: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, testType: true } } },
    });
    items = tests.flatMap((test) => test.items || []).sort((left, right) => left.sequence - right.sequence);
    const itemIds = items.map((item) => item.id);
    schedules = itemIds.length
      ? await tx.academicScheduledTest.findMany({
          where: { branchBatchId: batch.id, academicTestItemId: { in: itemIds }, status: { not: "CANCELLED" } },
          orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
          select: { id: true, academicTestItemId: true, isRetest: true, retestStudentId: true, attemptNumber: true, createdAt: true },
        })
      : [];
  }

  const loadResults = async () => {
    const scheduleIds = schedules.map((item) => item.id);
    [submissions, projects, projectConfigs] = await Promise.all([
      scheduleIds.length ? tx.academicTestSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: scheduleIds } } }) : [],
      scheduleIds.length ? tx.academicProjectSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: scheduleIds } } }) : [],
      batch && items.length ? tx.academicTestProject.findMany({ where: { branchBatchId: batch.id, academicTestItemId: { in: items.map((item) => item.id) } }, select: { academicTestItemId: true, projectMarks: true } }) : [],
    ]);
  };

  await loadResults();

  // Imported reports do not contain test IDs. Reuse the student's existing
  // course-scoped submissions when the enrollment batch mapping is stale.
  if (!items.length || !schedules.length || !submissions.length || !projects.length) {
    const [testResults, projectResults] = await Promise.all([
      tx.academicTestSubmission.findMany({ where: { branchStudentId: student.id }, select: { academicTestId: true } }),
      tx.academicProjectSubmission.findMany({ where: { branchStudentId: student.id }, select: { academicTestId: true } }),
    ]);
    const existingScheduleIds = [...new Set([...testResults, ...projectResults].map((item) => item.academicTestId).filter(Boolean))];
    if (existingScheduleIds.length) {
      schedules = await tx.academicScheduledTest.findMany({
        where: { id: { in: existingScheduleIds }, branchCourseId: course.id, status: { not: "CANCELLED" } },
        orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
        select: { id: true, academicTestItemId: true, isRetest: true, retestStudentId: true, attemptNumber: true, createdAt: true },
      });
      const itemIds = [...new Set(schedules.map((item) => item.academicTestItemId))];
      items = itemIds.length
        ? await tx.academicTestItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, sequence: true, testType: true }, orderBy: { sequence: "asc" } })
        : [];
      [submissions, projects, projectConfigs] = await Promise.all([
        tx.academicTestSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: schedules.map((item) => item.id) } } }),
        tx.academicProjectSubmission.findMany({ where: { branchStudentId: student.id, academicTestId: { in: schedules.map((item) => item.id) } } }),
        tx.academicTestProject.findMany({ where: { academicTestItemId: { in: itemIds }, branchCourseId: course.id }, select: { academicTestItemId: true, projectMarks: true } }),
      ]);
    }
  }

  return { items, schedules, submissions, projects, projectConfigs };
}

export async function validateAcademicImportValues(tx, student, course, enrollment, data, errors) {
  const values = Object.entries(data).filter(([field, value]) => /^assessment\d+$/.test(field) || field === "academicProject").filter(([, value]) => !missing(value));
  if (!values.length) return;
  const academic = await context(tx, student, course, enrollment?.batchId || student.batchId);
  // Historical rows may refer to tests/projects that are no longer configured.
  // Score format/range is validated by the import service; missing current setup
  // must not make an old completed record invalid.
  if (!academic.items.length || !academic.schedules.length) return;
  const tests = values.filter(([field]) => field !== "academicProject");
  for (const [field, value] of tests) { const parsed = score(value); if (parsed === null || parsed < 0 || parsed > 100) continue; const index = Number(field.replace("assessment", "")); if (!academic.items[index - 1]) continue; }
  if (!missing(data.academicProject)) { const projectItem = academic.items.find((item) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)); if (!projectItem) return; }
}

export async function applyAcademicImportValues(tx, student, course, enrollment, data) {
  const values = Object.entries(data).filter(([field, value]) => (/^assessment\d+$/.test(field) || field === "academicProject") && !missing(value));
  if (!values.length) return;
  const academic = await context(tx, student, course, enrollment?.batchId || student.batchId);
  if (!academic.items.length) return;
  const scheduleByItem = new Map();
  for (const item of academic.items) scheduleByItem.set(item.id, chooseSchedule(academic.schedules.filter((schedule) => schedule.academicTestItemId === item.id), academic.submissions, academic.projects, student.id));
  for (const [field, rawValue] of Object.entries(data)) {
    if (!/^assessment\d+$/.test(field) || missing(rawValue)) continue;
    const item = academic.items[Number(field.replace("assessment", "")) - 1]; const schedule = item ? scheduleByItem.get(item.id) : null; const value = score(rawValue); if (!item || !schedule || value === null) continue;
    if (item.testType === "PROJECT") {
      const projectSchedule = item.testType === "TEST_AND_PROJECT" ? (academic.schedules.find((candidate) => candidate.academicTestItemId === item.id && !candidate.isRetest) || schedule) : schedule;
      const projectConfig = academic.projectConfigs.find((config) => config.academicTestItemId === item.id); const projectMarks = Number(projectConfig?.projectMarks || 0); await tx.academicProjectSubmission.upsert({ where: { academicTestId_branchStudentId: { academicTestId: projectSchedule.id, branchStudentId: student.id } }, update: { marksAwarded: projectMarks > 0 ? Math.round((value / 100) * projectMarks) : Math.round(value), status: "GRADED", submittedAt: new Date() }, create: { academicTestId: projectSchedule.id, branchStudentId: student.id, marksAwarded: projectMarks > 0 ? Math.round((value / 100) * projectMarks) : Math.round(value), status: "GRADED", submittedAt: new Date() } });
    }
    if (item.testType !== "PROJECT") {
      const existing = academic.submissions.find((submission) => submission.academicTestId === schedule.id); const totalMarks = Number(existing?.totalMarks || 100); const obtainedMarks = Math.round((value / 100) * totalMarks); await tx.academicTestSubmission.upsert({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } }, update: { percentage: value, obtainedMarks, status: "EVALUATED", resultStatus: "PASS", submittedAt: existing?.submittedAt || new Date() }, create: { academicTestId: schedule.id, branchStudentId: student.id, totalQuestions: existing?.totalQuestions || 0, totalMarks, obtainedMarks, percentage: value, status: "EVALUATED", resultStatus: "PASS", submittedAt: new Date() } });
    }
  }
  if (!missing(data.academicProject)) {
    const projectItem = academic.items.find((item) => ["PROJECT", "TEST_AND_PROJECT"].includes(item.testType)); const schedule = projectItem ? (academic.schedules.find((candidate) => candidate.academicTestItemId === projectItem.id && !candidate.isRetest) || scheduleByItem.get(projectItem.id)) : null; const value = score(data.academicProject); if (projectItem && schedule && value !== null) { const config = academic.projectConfigs.find((item) => item.academicTestItemId === projectItem.id); const marks = Number(config?.projectMarks || 0); await tx.academicProjectSubmission.upsert({ where: { academicTestId_branchStudentId: { academicTestId: schedule.id, branchStudentId: student.id } }, update: { marksAwarded: marks > 0 ? Math.round((value / 100) * marks) : Math.round(value), status: "GRADED", submittedAt: new Date() }, create: { academicTestId: schedule.id, branchStudentId: student.id, marksAwarded: marks > 0 ? Math.round((value / 100) * marks) : Math.round(value), status: "GRADED", submittedAt: new Date() } }); } }
}