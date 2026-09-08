import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import {
  createCourseEditModuleUpdatedNotification,
} from "../notifications/notifications.service.js";

const LOCAL_TIME_ZONE = "Asia/Calcutta";
const FACULTY_ROLES = new Set([
  "FACULTY",
  "BRANCH_ADMIN",
  "OPERATION_MANAGER",
  "BUSINESS_OWNER",
  "SUPER_ADMIN",
]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function toDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LOCAL_TIME_ZONE }).format(date);
}

function parseDateKey(value, fallback = toDateKey()) {
  const text = normalizeString(value || fallback);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError("Date must be in YYYY-MM-DD format", 400);
  }
  return text;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const text = normalizeString(value).toLowerCase();
  if (!text) return Boolean(fallback);
  return ["true", "1", "yes", "y", "on"].includes(text);
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.slice();
  if (value == null) return [];

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function parseIdList(value) {
  return parseJsonArray(value)
    .map((item) => normalizeString(typeof item === "object" ? item?.id ?? item?.value ?? "" : item))
    .filter(Boolean);
}

function parseSubmoduleList(value) {
  return parseJsonArray(value)
    .map((item, index) => {
      if (item && typeof item === "object") {
        return {
          id: normalizeString(item.id || item.submoduleId || item.value || item.key || `submodule-${index + 1}`),
          name: normalizeString(item.name || item.title || item.submoduleName || `Sub-module ${index + 1}`),
        };
      }

      const id = normalizeString(item);
      return {
        id,
        name: id || `Sub-module ${index + 1}`,
      };
    })
    .filter((item) => item.id);
}

function dedupeIds(ids = []) {
  return Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((value) => normalizeString(value))
        .filter(Boolean),
    ),
  );
}

function sortBySequenceNo(items = []) {
  return [...(Array.isArray(items) ? items : [])].sort((left, right) => {
    const leftSeq = Number(left?.sequenceNo ?? left?.sequence ?? left?.order ?? 0) || 0;
    const rightSeq = Number(right?.sequenceNo ?? right?.sequence ?? right?.order ?? 0) || 0;
    return leftSeq - rightSeq;
  });
}

function ensureFacultyRole(user) {
  const role = normalizeString(user?.role).toUpperCase();

  if (!FACULTY_ROLES.has(role)) {
    throw new AppError("You do not have permission for this action", 403);
  }

  return role;
}

async function getBranchCourseWithStructure(courseId, branchId = "") {
  const normalizedCourseId = normalizeString(courseId);
  if (!normalizedCourseId) {
    throw new AppError("Course ID is required", 400);
  }

  const branchCourse = await prisma.branchCourse.findFirst({
    where: {
      id: normalizedCourseId,
      ...(normalizeString(branchId) ? { branchId: normalizeString(branchId) } : {}),
    },
    include: {
      modules: {
        include: {
          submodules: true,
        },
      },
    },
  });

  if (!branchCourse) {
    throw new AppError("Selected course was not found", 404);
  }

  const modules = sortBySequenceNo(branchCourse.modules).map((module) => ({
    ...module,
    submodules: sortBySequenceNo(module.submodules),
  }));

  return {
    ...branchCourse,
    modules,
  };
}

function resolveSelectedModule(course, moduleId) {
  const normalizedModuleId = normalizeString(moduleId);
  const modules = Array.isArray(course?.modules) ? course.modules : [];

  if (!modules.length) {
    throw new AppError("No modules found for this course", 404);
  }

  const selectedModule = modules.find((module) => normalizeString(module?.id) === normalizedModuleId) || null;

  if (!selectedModule) {
    throw new AppError("Selected module was not found", 404);
  }

  return selectedModule;
}

function calculateProgress(course, module, selectedSubmoduleIds = []) {
  const modules = Array.isArray(course?.modules) ? course.modules : [];
  const submodules = sortBySequenceNo(module?.submodules);
  const uniqueSelectedIds = dedupeIds(selectedSubmoduleIds);
  const selectedLookup = new Map(submodules.map((submodule) => [normalizeString(submodule?.id), submodule]));

  const invalidIds = uniqueSelectedIds.filter((id) => !selectedLookup.has(id));
  if (invalidIds.length) {
    throw new AppError("One or more selected sub-modules are invalid", 400);
  }

  const totalSubmodules = submodules.length || uniqueSelectedIds.length || 1;
  const selectedSubmoduleCount = uniqueSelectedIds.length;
  const submoduleProgress = totalSubmodules > 0
    ? Math.min(100, (selectedSubmoduleCount / totalSubmodules) * 100)
    : 0;
  const totalModules = modules.length || 1;
  const moduleWeight = totalModules > 0 ? 100 / totalModules : 100;
  const moduleProgress = submoduleProgress;
  const courseProgress = Math.min(100, moduleWeight * (moduleProgress / 100));

  return {
    totalModules,
    totalSubmodules,
    selectedSubmoduleCount,
    moduleWeight,
    moduleProgress,
    submoduleProgress,
    courseProgress,
  };
}

function normalizeWorkStudentId(value = "") {
  return normalizeString(value).toLowerCase();
}

function getWorkEntryStudentIds(entry = {}) {
  return parseIdList(entry.studentIds);
}

function getWorkEntrySubmoduleIds(entry = {}) {
  return parseIdList(entry.submoduleIds || entry.selectedSubmoduleIds || entry.submodules);
}

function getWorkEntrySubmoduleStatus(entry = {}, submoduleId = "", studentId = "") {
  const statuses = entry?.submoduleStatuses;
  if (!statuses || typeof statuses !== "object") return "";

  const normalizedStudentId = normalizeWorkStudentId(studentId);
  const normalizedSubmoduleId = normalizeWorkStudentId(submoduleId);
  const studentStatuses = statuses[studentId] || statuses[normalizedStudentId];
  const status = studentStatuses && typeof studentStatuses === "object"
    ? studentStatuses[submoduleId] || studentStatuses[normalizedSubmoduleId]
    : statuses[submoduleId] || statuses[normalizedSubmoduleId];

  return normalizeString(status);
}

async function validateFacultyBatchScope({ branchId, courseId, batchId, facultyProfileId, facultyUserId, studentIds }) {
  const normalizedBatchId = normalizeString(batchId);
  if (!normalizedBatchId) {
    throw new AppError("Batch is required", 400);
  }

  const batch = await prisma.branchBatch.findFirst({
    where: {
      batchId: normalizedBatchId,
      status: "ACTIVE",
      branchId: normalizeString(branchId),
      branchCourseId: normalizeString(courseId),
      OR: [
        { branchFacultyId: normalizeString(facultyProfileId) },
        { facultyId: normalizeString(facultyProfileId) },
        { facultyEmail: normalizeString(facultyUserId) },
      ],
    },
    select: {
      batchId: true,
      batchName: true,
      batchTiming: true,
      facultyId: true,
    },
  });

  if (!batch) {
    throw new AppError("Selected batch is not assigned to this faculty course", 403);
  }

  const normalizedStudentIds = dedupeIds(studentIds);
  const students = await prisma.branchStudent.findMany({
    where: {
      branchId: normalizeString(branchId),
      courseId: normalizeString(courseId),
      batchId: normalizedBatchId,
      recordStatus: "ACTIVE",
      OR: [
        { id: { in: normalizedStudentIds } },
        { studentId: { in: normalizedStudentIds } },
      ],
    },
    select: { id: true, studentId: true, facultyId: true },
  });

  const expectedFacultyId = normalizeString(batch.facultyId);
  const validStudents = students.filter((student) => (
    !expectedFacultyId || normalizeString(student.facultyId) === expectedFacultyId
  ));

  if (validStudents.length !== normalizedStudentIds.length) {
    throw new AppError("One or more selected students are not assigned to this faculty batch", 403);
  }

  return batch;
}

function isWorkEntryForBranchStudent(entry = {}, student = {}) {
  if (!entry || !student) return false;

  const entryBatchId = normalizeWorkStudentId(entry.batchId);
  const studentBatchId = normalizeWorkStudentId(student.batchId);
  if (entryBatchId && studentBatchId && entryBatchId !== studentBatchId) return false;
  if (entryBatchId && !studentBatchId) return false;

  const applyToAllStudents = Boolean(entry.applyToAllStudents);
  const entryStudentIds = getWorkEntryStudentIds(entry).map((value) => normalizeWorkStudentId(value));
  const studentIdsToMatch = [
    normalizeWorkStudentId(student?.id),
    normalizeWorkStudentId(student?.studentId),
  ].filter(Boolean);

  // The selected student IDs are the reliable scope for older entries that
  // do not have batch columns, including apply-to-all submissions.
  if (entryStudentIds.length && !studentIdsToMatch.some((value) => entryStudentIds.includes(value))) {
    return false;
  }

  return entryStudentIds.length > 0 || applyToAllStudents;
}

function calculateBranchStudentCourseProgress(course = {}, entries = [], student = null) {
  const modules = Array.isArray(course?.modules) ? course.modules : [];
  if (!modules.length) return 0;

  const normalizedCourseId = normalizeString(course?.id || course?.courseId || "");
  const matchingEntries = (Array.isArray(entries) ? entries : []).filter((entry) => {
    const entryCourseId = normalizeString(entry?.courseId || "");
    if (normalizedCourseId && entryCourseId && entryCourseId !== normalizedCourseId) {
      return false;
    }

    if (!student) {
      return true;
    }

    return isWorkEntryForBranchStudent(entry, student);
  });

  if (!matchingEntries.length) return 0;

  const moduleCompletionMap = new Map();
  const moduleSubmoduleIdMap = new Map();
  modules.forEach((module, moduleIndex) => {
    const moduleId = normalizeString(module?.id || `module-${moduleIndex}`);
    if (!moduleId) return;
    moduleCompletionMap.set(moduleId, new Set());
    moduleSubmoduleIdMap.set(
      moduleId,
      new Set(
        (Array.isArray(module?.submodules) ? module.submodules : [])
          .map((submodule, submoduleIndex) => normalizeString(
            submodule?.id || submodule?.submoduleId || `submodule-${submoduleIndex}`,
          ))
          .filter(Boolean),
      ),
    );
  });

  matchingEntries.forEach((entry) => {
    const entryModuleId = normalizeString(entry?.moduleId || "");
    const submoduleSet = moduleCompletionMap.get(entryModuleId);
    const validSubmoduleIds = moduleSubmoduleIdMap.get(entryModuleId);
    if (!submoduleSet) return;

    getWorkEntrySubmoduleIds(entry).forEach((submoduleId) => {
      const normalizedSubmoduleId = normalizeString(submoduleId);
      const studentId = student?.id || student?.studentId || "";
      const status = getWorkEntrySubmoduleStatus(entry, normalizedSubmoduleId, studentId).toLowerCase();
      const hasStudentStatuses = Boolean(
        entry?.submoduleStatuses && typeof entry.submoduleStatuses === "object" && Object.keys(entry.submoduleStatuses).length,
      );
      const isCompleted = status
        ? status === "completed"
        : !hasStudentStatuses;
      if (isCompleted && normalizedSubmoduleId && validSubmoduleIds?.has(normalizedSubmoduleId)) {
        submoduleSet.add(normalizedSubmoduleId);
      }
    });
  });

  const totals = modules.reduce(
    (acc, module, moduleIndex) => {
      const moduleId = normalizeString(module?.id || `module-${moduleIndex}`);
      const submodules = Array.isArray(module?.submodules) ? module.submodules : [];
      const completedCount = Math.min(submodules.length, (moduleCompletionMap.get(moduleId) || new Set()).size);

      acc.completed += completedCount;
      acc.total += submodules.length;
      return acc;
    },
    { completed: 0, total: 0 },
  );

  if (!totals.total) return 0;

  return Math.min(100, Math.max(0, (totals.completed / totals.total) * 100));
}

async function syncBranchStudentCourseProgress(tx, { branchCourse, branchId, batchId, studentIds = [], actorId = null }) {
  const normalizedBranchId = normalizeString(branchId);
  const normalizedStudentIds = dedupeIds(studentIds)
  const normalizedCourseId = normalizeString(branchCourse?.id || "");

  if (!normalizedBranchId || !normalizedCourseId || !normalizedStudentIds.length) {
    return;
  }

  const matchingBranchStudents = await tx.branchStudent.findMany({
    where: {
      branchId: normalizedBranchId,
      batchId: normalizeString(batchId),
      OR: [
        { id: { in: normalizedStudentIds } },
        { studentId: { in: normalizedStudentIds } },
      ],
    },
  });

  if (!matchingBranchStudents.length) {
    return;
  }

  const allWorkEntries = await tx.facultyTodayWorkEntry.findMany({
    where: {
      branchId: normalizedBranchId,
      courseId: normalizedCourseId,
      ...(normalizeString(batchId) ? { batchId: normalizeString(batchId) } : {}),
    },
    orderBy: [
      { createdAt: "asc" },
      { updatedAt: "asc" },
    ],
  });

  for (const student of matchingBranchStudents) {
    const courseProgress = calculateBranchStudentCourseProgress(branchCourse, allWorkEntries, student);

    await tx.branchStudent.update({
      where: { id: student.id },
      data: {
        courseProgress: Math.max(0, Math.min(100, Math.round(courseProgress))),
        updatedBy: actorId || null,
      },
    });
  }
}

function resolveStudentIds(payload = {}) {
  const selectedStudentIds = dedupeIds(
    parseIdList(payload.selectedStudentIds || payload.studentIds || payload.students),
  );

  return selectedStudentIds;
}

function mapWorkEntry(record) {
  if (!record) return null;

  const selectedStudentIds = parseIdList(record.studentIds);
  const selectedSubmoduleIds = parseIdList(record.submoduleIds);
  const submodules = Array.isArray(record.submodules) ? record.submodules : [];
  const persistedSubmoduleStatuses = submodules.find((item) => item?.studentStatuses)?.studentStatuses || {};

  return {
    id: record.id,
    facultyUserId: record.facultyUserId,
    facultyProfileId: record.facultyProfileId || "",
    facultyId: record.facultyProfileId || record.facultyUserId,
    facultyName: record.facultyName || "",
    facultyEmail: record.facultyEmail || "",
    branchId: record.branchId || "",
    courseId: record.courseId,
    courseName: record.courseName,
    batchId: record.batchId || "",
    batchName: record.batchName || "",
    batchTiming: record.batchTiming || "",
    moduleId: record.moduleId,
    moduleName: record.moduleName,
    applyToAllStudents: Boolean(record.applyToAllStudents),
    studentIds: selectedStudentIds,
    selectedStudentIds,
    studentCount: Number(record.studentCount || selectedStudentIds.length || 0),
    submoduleIds: selectedSubmoduleIds,
    selectedSubmoduleIds,
    submodules,
    submoduleStatuses: persistedSubmoduleStatuses,
    moduleProgress: Number(record.moduleProgress || 0),
    submoduleProgress: Number(record.submoduleProgress || 0),
    courseProgress: Number(record.courseProgress || 0),
    moduleWeight: Number(record.moduleWeight || 0),
    workDate: record.workDate || "",
    createdBy: record.createdBy || "",
    updatedBy: record.updatedBy || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listFacultyTodayWorkEntries(query = {}, user = null) {
  ensureFacultyRole(user);

  const where = {
    facultyUserId: normalizeString(user?.id),
  };

  const workDate = normalizeString(query.workDate);
  if (workDate) {
    where.workDate = parseDateKey(workDate);
  }

  const records = await prisma.facultyTodayWorkEntry.findMany({
    where,
    orderBy: [
      { createdAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return records.map(mapWorkEntry);
}

export async function createFacultyTodayWorkEntry(payload = {}, user = null) {
  ensureFacultyRole(user);
  const facultyUserId = normalizeString(user?.id);

  if (!facultyUserId) {
    throw new AppError("Faculty session is required", 401);
  }

  const courseId = normalizeString(payload.courseId);
  const batchId = normalizeString(payload.batchId || payload.batchEntryId);
  const moduleId = normalizeString(payload.moduleId);
  const facultyProfileId = normalizeString(payload.facultyProfileId || payload.facultyId || "");
  const branchId = normalizeString(payload.branchId || "");
  const workDate = parseDateKey(payload.workDate);
  const applyToAllStudents = parseBoolean(payload.applyToAllStudents, true);
  const studentIds = resolveStudentIds(payload);
  const submodules = parseSubmoduleList(payload.submodules);
  const selectedSubmoduleIds = dedupeIds(
    parseIdList(payload.selectedSubmoduleIds || payload.submoduleIds || submodules.map((item) => item.id)),
  );

  if (!courseId) {
    throw new AppError("Course is required", 400);
  }

  if (!moduleId) {
    throw new AppError("Module is required", 400);
  }

  if (!selectedSubmoduleIds.length) {
    throw new AppError("Please select at least one sub-module", 400);
  }

  if (!studentIds.length) {
    throw new AppError("Please select at least one student", 400);
  }

  const branchCourse = await getBranchCourseWithStructure(courseId, branchId);
  if (branchId && normalizeString(branchCourse.branchId) !== branchId) {
    throw new AppError("Selected course does not belong to the current branch", 400);
  }

  const branchRecord = branchCourse?.branchId
    ? await prisma.branch.findUnique({
        where: { id: normalizeString(branchCourse.branchId) },
        select: {
          id: true,
          branchId: true,
          branchName: true,
          branchEmail: true,
        },
      })
    : null;

  const selectedModule = resolveSelectedModule(branchCourse, moduleId);
  const selectedSubmodules = Array.isArray(selectedModule.submodules) ? selectedModule.submodules : [];
  const selectedSubmoduleLookup = new Map(
    selectedSubmodules.map((submodule) => [normalizeString(submodule?.id), submodule]),
  );

  const invalidSubmoduleIds = selectedSubmoduleIds.filter((id) => !selectedSubmoduleLookup.has(id));
  if (invalidSubmoduleIds.length) {
    throw new AppError("One or more selected sub-modules are invalid", 400);
  }

  const progress = calculateProgress(branchCourse, selectedModule, selectedSubmoduleIds);

  const selectedBatch = await validateFacultyBatchScope({
    branchId: branchCourse.branchId || branchId,
    courseId,
    batchId,
    facultyProfileId,
    facultyUserId,
    studentIds,
  });

  const selectedSubmodulePayload = selectedSubmoduleIds.map((submoduleId) => {
    const source = selectedSubmoduleLookup.get(submoduleId) || {};
    return {
      id: submoduleId,
      name: normalizeString(source.title || source.name || source.submoduleName || submoduleId),
      sequenceNo: Number(source.sequenceNo || 0) || 0,
      studentStatuses: payload.submoduleStatuses || {},
    };
  });

  const created = await prisma.$transaction(async (tx) => {
    const workEntry = await tx.facultyTodayWorkEntry.create({
      data: {
        facultyUserId,
        facultyProfileId: facultyProfileId || null,
        branchId: branchId || branchCourse.branchId || null,
        courseId,
        courseName: normalizeString(branchCourse.name || payload.courseName || "Course"),
        batchId,
        batchName: normalizeString(selectedBatch.batchName || payload.batchName),
        batchTiming: normalizeString(selectedBatch.batchTiming || payload.batchTiming),
        moduleId,
        moduleName: normalizeString(selectedModule.title || payload.moduleName || "Module"),
        submoduleIds: selectedSubmoduleIds,
        submodules: selectedSubmodulePayload,
        studentIds,
        studentCount: studentIds.length,
        applyToAllStudents,
        moduleProgress: progress.moduleProgress,
        submoduleProgress: progress.submoduleProgress,
        courseProgress: progress.courseProgress,
        moduleWeight: progress.moduleWeight,
        workDate,
        createdBy: normalizeString(user?.id) || null,
        updatedBy: normalizeString(user?.id) || null,
      },
    });

    await syncBranchStudentCourseProgress(tx, {
      branchCourse,
      branchId: branchCourse.branchId || branchId,
      batchId,
      studentIds,
      actorId: normalizeString(user?.id) || null,
    });

    return workEntry;
  });

  void createCourseEditModuleUpdatedNotification({
    request: { branchId: branchCourse.branchId || branchId },
    branch: branchRecord || {
      id: normalizeString(branchCourse.branchId || branchId || ""),
      branchId: normalizeString(branchCourse.branchId || branchId || ""),
      branchName: normalizeString(branchCourse?.branchName || branchCourse.name || "Branch"),
      branchEmail: normalizeString(branchCourse?.branchEmail || ""),
    },
    branchCourse: {
      id: branchCourse.id || courseId,
      branchId: branchCourse.branchId || branchId || "",
      name: normalizeString(branchCourse.name || payload.courseName || "Course"),
    },
    faculty: {
      facultyId: facultyProfileId || facultyUserId,
      userId: facultyUserId,
      facultyName: normalizeString(user?.fullName || user?.name || user?.email || "Faculty"),
      name: normalizeString(user?.fullName || user?.name || user?.email || "Faculty"),
      facultyEmail: normalizeString(user?.email || ""),
    },
    module: {
      id: selectedModule.id || moduleId,
      title: normalizeString(selectedModule.title || payload.moduleName || "Module"),
    },
    subModule: selectedSubmodulePayload[0]
      ? {
          id: selectedSubmodulePayload[0].id,
          title: selectedSubmodulePayload[0].name,
        }
      : null,
    actor: {
      id: normalizeString(user?.id) || null,
      userId: normalizeString(user?.id) || null,
    },
    updatedFields: ["module progress", "sub-module progress", "course progress"],
  }).catch((error) => {
    console.warn("Faculty work notification failed to send", error);
  });

  return mapWorkEntry(created);
}
