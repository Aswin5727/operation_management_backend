import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { buildBranchStudentCourseProgressView } from "../facultyTodayWork/facultyTodayWork.service.js";

const text = (value) => String(value ?? "").trim();

async function findStudent(user) {
  const email = text(user?.email).toLowerCase();
  const userCode = text(user?.userCode);
  if (!email && !userCode) throw new AppError("Student session is required", 401);

  const branchStudent = await prisma.branchStudent.findFirst({
    where: {
      OR: [
        ...(email ? [{ emailAddress: { equals: email, mode: "insensitive" } }] : []),
        ...(userCode ? [{ studentId: userCode }, { id: userCode }] : []),
      ],
    },
    include: {
      course: { include: { modules: { where: { status: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, include: { submodules: { where: { status: "ACTIVE" }, orderBy: { sequenceNo: "asc" } } } } } },
      courseEnrollments: { where: { status: "ACTIVE" }, include: { course: { include: { modules: { where: { status: "ACTIVE" }, orderBy: { sequenceNo: "asc" }, include: { submodules: { where: { status: "ACTIVE" }, orderBy: { sequenceNo: "asc" } } } } } } } },
    },
  });
  if (branchStudent) return { type: "branch", value: branchStudent };

  const student = await prisma.studentProfile.findFirst({
    where: {
      OR: [
        ...(email ? [{ emailAddress: { equals: email, mode: "insensitive" } }] : []),
        ...(userCode ? [{ studentCode: userCode }, { id: userCode }] : []),
      ],
    },
    include: { course: { include: { modules: { orderBy: { sequenceNo: "asc" } } } } },
  });
  if (student) return { type: "student", value: student };
  throw new AppError("Student profile not found", 404);
}

export async function getStudentCourse(user, requestedCourseId = "") {
  const identity = await findStudent(user);
  const baseStudent = identity.value;
  const courseId = text(requestedCourseId);
  const enrollment = identity.type === "branch" && courseId
    ? (baseStudent.courseEnrollments || []).find((item) => item.courseId === courseId)
    : null;
  if (courseId && identity.type === "branch" && !enrollment) throw new AppError("Selected course enrollment was not found", 404);
  const student = enrollment ? {
    ...baseStudent,
    courseId: enrollment.courseId,
    courseName: enrollment.courseName || enrollment.course?.name || "",
    batchId: enrollment.batchId || null,
    batchName: enrollment.batchName || null,
    batchTiming: enrollment.batchTiming || null,
    facultyId: enrollment.facultyId || null,
    facultyName: enrollment.facultyName || null,
    course: enrollment.course || null,
  } : baseStudent;

  if (identity.type === "branch") {
    const course = student.course;
    const entries = course
      ? await prisma.facultyTodayWorkEntry.findMany({
        where: { branchId: student.branchId, courseId: course.id, ...(student.batchId ? { batchId: student.batchId } : {}) },
        orderBy: [{ createdAt: "asc" }, { updatedAt: "asc" }],
      })
      : [];
    const attempts = course
      ? await prisma.facultyTodayWorkStudentEntry.findMany({
        where: { branchStudentId: student.id, ...(student.courseId ? { courseId: student.courseId } : {}) },
        orderBy: [{ createdAt: "asc" }, { updatedAt: "asc" }],
      })
      : [];
    const progress = course ? buildBranchStudentCourseProgressView(course, entries, student, attempts) : { progress: null, completedCount: 0, totalCount: 0, modules: [] };
    return {
      course: course ? { id: course.id, name: course.name, progress: progress.progress } : null,
      faculty: student.facultyId || student.facultyName ? { id: student.facultyId || null, name: student.facultyName || null } : null,
      batch: student.batchId || student.batchName || student.batchTiming ? { id: student.batchId || null, name: student.batchName || null, timing: student.batchTiming || null } : null,
      progress: { overall: progress.progress, completedCount: progress.completedCount, totalCount: progress.totalCount },
      modules: progress.modules,
    };
  }

  const course = student.course;
  const modules = Array.isArray(course?.modules) ? course.modules.map((module, index) => ({
    id: module.id,
    name: module.title || "",
    sequenceNo: module.sequenceNo ?? index + 1,
    completedCount: 0,
    totalCount: 0,
    progress: null,
    subModules: [],
  })) : [];
  return {
    course: course ? { id: course.id, name: course.name, progress: null } : null,
    faculty: student.facultyId || student.facultyName ? { id: student.facultyId || null, name: student.facultyName || null } : null,
    batch: student.batchId || student.batchName ? { id: student.batchId || null, name: student.batchName || null, timing: student.classSchedule || null } : null,
    progress: { overall: null, completedCount: 0, totalCount: 0 },
    modules,
  };
}
