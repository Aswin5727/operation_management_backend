import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const userSelect = { id: true, fullName: true, email: true };
function isActiveAttendanceStudent(student = {}) {
  const lifecycleValues = [
    student.status,
    student.recordStatus,
    student.studentStatus,
    student.currentStatus,
    student.lifecycleStatus,
    student.studentLifecycleStatus,
    student.courseCompletion,
    student.courseCompletionStatus,
  ].map((value) => String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_"));

  if (student.isDiscontinued === true || student.courseCompletedAt || student.completedAt) return false;
  if (lifecycleValues.some((value) => ["COMPLETED", "DISCONTINUED", "COURSE_COMPLETED"].includes(value))) return false;

  const enrollments = Array.isArray(student.courseEnrollments) ? student.courseEnrollments : [];
  if (enrollments.length && !enrollments.some((entry) => {
    const status = String(entry?.status || entry?.recordStatus || "").trim().toUpperCase();
    return !["COMPLETED", "DISCONTINUED"].includes(status) && !entry?.courseCompletedAt && !entry?.completedAt;
  })) return false;

  return true;
}


function roleOf(user) {
  return String(user?.role || "").trim().toUpperCase();
}

async function resolveBranchId(user, requestedBranchId = "") {
  const role = roleOf(user);
  const requested = String(requestedBranchId || "").trim();

  if (requested && ["BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"].includes(role)) {
    const branch = await prisma.branch.findFirst({
      where: { OR: [{ id: requested }, { branchId: requested }] },
      select: { id: true },
    });
    if (!branch) throw new AppError("Branch profile not found", 404);
    return branch.id;
  }

  const branch = await getCurrentBranchProfile(user);
  if (!branch?.id) throw new AppError("Branch profile not found", 404);
  return branch.id;
}


export async function listReportBranches() {
  return prisma.branch.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ branchName: "asc" }, { branchId: "asc" }],
    select: { id: true, branchId: true, branchName: true },
  });
}


export async function resolveBranchIds(user, requestedBranchId = "") {
  const role = roleOf(user);
  const requested = String(requestedBranchId || "").trim().toLowerCase();
  if (requested === "all") {
    if (!["BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"].includes(role)) {
      throw new AppError("Branch report access is required", 403);
    }
    const branches = await prisma.branch.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    return branches.map((branch) => branch.id);
  }
  return [await resolveBranchId(user, requestedBranchId)];
}
export async function findBranchReportOptions({ branchId }) {
  const [students, batches] = await Promise.all([
    prisma.branchStudent.findMany({
      where: { branchId, recordStatus: "ACTIVE" },
      orderBy: [{ studentName: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, studentId: true, studentName: true, courseId: true,
        courseName: true, batchId: true, batchName: true, batchTiming: true,
        facultyName: true, recordStatus: true, currentStatus: true,
        courseProgress: true, courseCompletedAt: true,
        courseEnrollments: {
          orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }],
          select: { courseId: true, courseName: true, batchId: true, batchName: true, status: true, courseCompletedAt: true },
        },
      },
    }),
    prisma.branchBatch.findMany({
      where: { branchId, status: "ACTIVE" },
      orderBy: [{ batchName: "asc" }, { createdAt: "asc" }],
      select: { id: true, batchId: true, batchName: true, batchTiming: true, courseId: true, courseName: true, facultyName: true },
    }),
  ]);
  return { students: students.filter(isActiveAttendanceStudent), batches };
}
function dateFilter(fromDate, toDate) {
  return { attendanceDate: { gte: fromDate, lte: toDate } };
}

async function findBranchStudent(studentKey, branchId) {
  const key = String(studentKey || "").trim();
  if (!key) throw new AppError("studentId is required", 400);

  const student = await prisma.branchStudent.findFirst({
    where: { branchId, OR: [{ id: key }, { studentId: key }] },
    select: {
      id: true, studentId: true, studentName: true, emailAddress: true,
      courseName: true, courseId: true, batchId: true, batchName: true,
      batchTiming: true, facultyName: true, recordStatus: true, currentStatus: true,
      courseProgress: true, courseCompletedAt: true,
      courseEnrollments: {
        orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }],
        select: { courseId: true, courseName: true, batchId: true, batchName: true, batchTiming: true, facultyName: true, status: true, sequenceOrder: true, courseCompletedAt: true },
      },
    },
  });
  if (!student) throw new AppError("Student not found in this branch", 404);
  if (!isActiveAttendanceStudent(student)) throw new AppError("Attendance reports are available only for active students", 400);
  return student;
}

async function findBranchBatch(batchKey, branchId) {
  const key = String(batchKey || "").trim();
  if (!key) throw new AppError("batchId is required", 400);

  const batch = await prisma.branchBatch.findFirst({
    where: { branchId, OR: [{ id: key }, { batchId: key }] },
    select: {
      id: true, batchId: true, batchName: true, batchTiming: true,
      courseId: true, courseName: true, facultyName: true,
    },
  });
  if (!batch) throw new AppError("Batch not found in this branch", 404);
  return batch;
}

async function recordsForStudents(students, fromDate, toDate, courseId = "") {
  const ids = students.map((student) => student.id);
  return prisma.branchStudentAttendance.findMany({
    where: { branchStudentId: { in: ids }, ...(courseId ? { courseId } : {}), ...dateFilter(fromDate, toDate) },
    orderBy: [{ attendanceDate: "asc" }, { markedAt: "asc" }],
    include: { facultyUser: { select: userSelect } },
  });
}

export async function findBranchStudentAttendanceReportData({ studentId, branchId, fromDate, toDate, courseId = "" }) {
  const student = await findBranchStudent(studentId, branchId);
  let reportStudent = student;
  if (courseId) {
    const enrollment = (student.courseEnrollments || []).find((item) => String(item.courseId) === String(courseId));
    const isPrimaryCourse = String(student.courseId || "") === String(courseId);
    if (!enrollment && !isPrimaryCourse) throw new AppError("Selected course is not assigned to this student", 400);
    reportStudent = {
      ...student,
      courseId,
      courseName: enrollment?.courseName || (isPrimaryCourse ? student.courseName : "") || "",
      batchId: enrollment?.batchId || (isPrimaryCourse ? student.batchId : null),
      batchName: enrollment?.batchName || (isPrimaryCourse ? student.batchName : "") || "",
      batchTiming: enrollment?.batchTiming || (isPrimaryCourse ? student.batchTiming : "") || "",
      facultyName: enrollment?.facultyName || (isPrimaryCourse ? student.facultyName : "") || "",
    };
  }
  const records = await recordsForStudents([student], fromDate, toDate, courseId);
  if (!records.length) throw new AppError("No attendance records found for the selected date range", 404);
  return { student: reportStudent, records };
}

export async function findBranchBatchAttendanceReportData({ batchId, branchId, fromDate, toDate }) {
  const batch = await findBranchBatch(batchId, branchId);
  const students = await prisma.branchStudent.findMany({
    where: { branchId, batchId: batch.batchId },
    orderBy: [{ studentName: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, studentId: true, studentName: true, emailAddress: true,
      courseName: true, courseId: true, batchId: true, batchName: true,
      batchTiming: true, facultyName: true, recordStatus: true, currentStatus: true,
      courseProgress: true, courseCompletedAt: true,
      courseEnrollments: { select: { status: true, courseCompletedAt: true } },
    },
  });
  const activeStudents = students.filter(isActiveAttendanceStudent);
  if (!activeStudents.length) throw new AppError("No active students found in the selected batch", 404);
  const records = await recordsForStudents(activeStudents, fromDate, toDate);
  if (!records.length) throw new AppError("No attendance records found for the selected date range", 404);
  return { batch, students: activeStudents, records };
}

export { resolveBranchId };
