import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const userSelect = { id: true, fullName: true, email: true };

function roleOf(user) {
  return String(user?.role || "").trim().toUpperCase();
}

async function resolveBranchId(user, requestedBranchId = "") {
  const role = roleOf(user);
  const requested = String(requestedBranchId || "").trim();

  if (requested && ["SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"].includes(role)) {
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
      batchTiming: true, facultyName: true,
      courseEnrollments: {
        orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }],
        select: { courseId: true, courseName: true, batchId: true, batchName: true, batchTiming: true, facultyName: true, status: true, sequenceOrder: true },
      },
    },
  });
  if (!student) throw new AppError("Student not found in this branch", 404);
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
      batchTiming: true, facultyName: true,
    },
  });
  if (!students.length) throw new AppError("No students found in the selected batch", 404);
  const records = await recordsForStudents(students, fromDate, toDate);
  if (!records.length) throw new AppError("No attendance records found for the selected date range", 404);
  return { batch, students, records };
}

export { resolveBranchId };
