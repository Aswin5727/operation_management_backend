import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { normalizeString } from "./reports.utils.js";

const FACULTY_SESSION_SOURCE = "ATTENDANCE";

const studentReportSelect = {
  id: true,
  studentCode: true,
  studentName: true,
  emailAddress: true,
  mobileNumber: true,
  batchName: true,
  admissionDate: true,
  courseInterested: true,
  currentStatus: true,
  recordStatus: true,
  course: {
    select: {
      id: true,
      name: true,
      mode: true,
      status: true,
    },
  },
};

const courseReportSelect = {
  id: true,
  name: true,
  mode: true,
  status: true,
};

const facultyUserSelect = {
  id: true,
  userCode: true,
  fullName: true,
  email: true,
  active: true,
};

const facultyProfileReportSelect = {
  id: true,
  facultyName: true,
  facultyEmail: true,
  facultyPhone: true,
  status: true,
  course: {
    select: {
      id: true,
      name: true,
    },
  },
  courseAssignments: {
    orderBy: { createdAt: "asc" },
    include: {
      course: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  batchEntries: {
    orderBy: { sequenceNo: "asc" },
    select: {
      id: true,
      courseId: true,
      batchName: true,
      batchTiming: true,
      sequenceNo: true,
      course: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

const facultyReportAccessSelect = {
  id: true,
  facultyName: true,
  facultyEmail: true,
  courseId: true,
  courseAssignments: {
    select: {
      courseId: true,
    },
  },
  batchEntries: {
    select: {
      id: true,
      courseId: true,
      batchName: true,
    },
  },
};

async function getStudentOrThrow(studentId) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: studentReportSelect,
  });

  if (!student) {
    throw new AppError("Invalid studentId", 404);
  }

  return student;
}

async function getBatchOrThrow(batchId) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          mode: true,
          status: true,
        },
      },
    },
  });

  if (!batch) {
    throw new AppError("Invalid batchId", 404);
  }

  return batch;
}

async function getCourseOrThrow(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: courseReportSelect,
  });

  if (!course) {
    throw new AppError("Invalid courseId", 404);
  }

  return course;
}

async function resolveBatchForReport({ batchId = "", batchName = "", courseId = "" } = {}) {
  const normalizedBatchId = normalizeString(batchId);
  const normalizedBatchName = normalizeString(batchName);
  const normalizedCourseId = normalizeString(courseId);

  if (normalizedBatchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: normalizedBatchId },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
      },
    });

    if (batch) {
      return batch;
    }

    const batchEntry = await prisma.facultyBatchEntry.findUnique({
      where: { id: normalizedBatchId },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
      },
    });

    if (batchEntry) {
      const mappedBatch = await prisma.batch.findFirst({
        where: {
          batchName: batchEntry.batchName,
          ...(batchEntry.courseId ? { courseId: batchEntry.courseId } : {}),
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              mode: true,
              status: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      });

      if (mappedBatch) {
        return mappedBatch;
      }

      return {
        id: batchEntry.id,
        batchName: batchEntry.batchName,
        courseId: batchEntry.courseId || "",
        course: batchEntry.course || null,
      };
    }
  }

  if (normalizedBatchName) {
    const batch = await prisma.batch.findFirst({
      where: {
        batchName: normalizedBatchName,
        ...(normalizedCourseId ? { courseId: normalizedCourseId } : {}),
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    if (batch) {
      return batch;
    }

    const batchEntry = await prisma.facultyBatchEntry.findFirst({
      where: {
        batchName: normalizedBatchName,
        ...(normalizedCourseId ? { courseId: normalizedCourseId } : {}),
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            mode: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    if (batchEntry) {
      return {
        id: batchEntry.id,
        batchName: batchEntry.batchName,
        courseId: batchEntry.courseId || normalizedCourseId,
        course: batchEntry.course || null,
      };
    }
  }

  throw new AppError("Invalid batchId", 404);
}

async function getFacultyProfileOrThrow(facultyId) {
  const facultyProfile = await prisma.facultyProfile.findUnique({
    where: { id: facultyId },
    select: facultyProfileReportSelect,
  });

  if (facultyProfile) return facultyProfile;

  // Branch Faculty View sends the BranchFaculty record id, while the legacy
  // report screen sends FacultyProfile id. Support both identifiers.
  const branchFaculty = await prisma.branchFaculty.findUnique({
    where: { id: facultyId },
    include: {
      course: { select: { id: true, name: true } },
      courseAssignments: { include: { branchCourse: { select: { id: true, name: true } } } },
    },
  });
  if (!branchFaculty) throw new AppError("Invalid facultyId", 404);

  return {
    id: branchFaculty.id,
    facultyName: branchFaculty.name,
    facultyEmail: branchFaculty.email,
    facultyPhone: branchFaculty.phone,
    course: branchFaculty.course,
    courseAssignments: branchFaculty.courseAssignments.map((assignment) => ({ course: assignment.branchCourse })),
    batchEntries: [],
  };
}

async function getFacultyReportAccessProfile(actorUser) {
  const normalizedRole = normalizeString(actorUser?.role).toUpperCase();

  if (normalizedRole !== "FACULTY") {
    return null;
  }

  const email = normalizeString(actorUser?.email).toLowerCase();

  if (!email) {
    throw new AppError("You do not have permission for this action", 403);
  }

  const facultyProfile = await prisma.facultyProfile.findFirst({
    where: {
      facultyEmail: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: facultyReportAccessSelect,
  });

  if (!facultyProfile) {
    throw new AppError("You do not have permission for this action", 403);
  }

  return facultyProfile;
}

function getFacultyAllowedBatchEntries(facultyProfile, courseId = "") {
  const normalizedCourseId = normalizeString(courseId);

  return (Array.isArray(facultyProfile?.batchEntries) ? facultyProfile.batchEntries : []).filter((entry) => {
    const entryBatchName = normalizeString(entry?.batchName);
    if (!entryBatchName) return false;

    if (!normalizedCourseId) return true;

    return normalizeString(entry?.courseId) === normalizedCourseId;
  });
}

async function getFacultyUserByProfileOrThrow(facultyProfile) {
  const email = normalizeString(facultyProfile?.facultyEmail).toLowerCase();

  const facultyUser = await prisma.user.findFirst({
    where: {
      role: "FACULTY",
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: facultyUserSelect,
  });

  if (!facultyUser) {
    throw new AppError("Invalid facultyId", 404);
  }

  return facultyUser;
}

async function findStudentAttendanceReportData({ studentId, fromDate, toDate }) {
  const student = await getStudentOrThrow(studentId);

  const records = await prisma.studentAttendance.findMany({
    where: {
      studentId,
      attendanceDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: [{ attendanceDate: "asc" }, { markedAt: "asc" }],
    include: {
      facultyUser: {
        select: facultyUserSelect,
      },
    },
  });

  if (!records.length) {
    throw new AppError("No records found for the selected student and date range", 404);
  }

  return {
    student,
    records,
  };
}

async function findBatchAttendanceReportData({ batchId, batchName, courseId, fromDate, toDate, actorUser = null }) {
  const normalizedBatchId = normalizeString(batchId);
  const normalizedBatchName = normalizeString(batchName);
  const normalizedCourseId = normalizeString(courseId);
  const usesAllBatches =
    !normalizedBatchId &&
    Boolean(normalizedCourseId) &&
    ["all batches", "all", "*"].includes(normalizedBatchName.toLowerCase());
  const facultyProfile = await getFacultyReportAccessProfile(actorUser);

  let scope = null;
  let studentWhere = {};

  if (!usesAllBatches && (normalizedBatchId || normalizedBatchName)) {
    const batch = await resolveBatchForReport({
      batchId: normalizedBatchId,
      batchName: normalizedBatchName,
      courseId: normalizedCourseId,
    });

    scope = {
      kind: "batch",
      id: batch.id,
      batchName: batch.batchName,
      courseId: batch.courseId || "",
      course: batch.course || null,
    };

    studentWhere = {
      ...(batch.courseId ? { courseId: batch.courseId } : {}),
      batchName: batch.batchName,
    };
  } else {
    const course = await getCourseOrThrow(normalizedCourseId);

    scope = {
      kind: "course",
      id: course.id,
      courseId: course.id,
      course,
      batchName: "",
    };

    studentWhere = {
      courseId: course.id,
    };
  }

  if (facultyProfile) {
    const allowedBatchEntries = getFacultyAllowedBatchEntries(
      facultyProfile,
      scope.kind === "course" ? scope.courseId : scope.courseId || normalizedCourseId,
    );

    if (!allowedBatchEntries.length) {
      throw new AppError("You do not have permission to download this attendance report", 403);
    }

    if (scope.kind === "batch") {
      const hasBatchAccess = allowedBatchEntries.some(
        (entry) =>
          normalizeString(entry?.batchName) === normalizeString(scope.batchName) &&
          normalizeString(entry?.courseId || "") === normalizeString(scope.courseId || ""),
      );

      if (!hasBatchAccess) {
        throw new AppError("You do not have permission to download this attendance report", 403);
      }
    }

    if (scope.kind === "course") {
      const allowedBatchNames = Array.from(
        new Set(
          allowedBatchEntries
            .map((entry) => normalizeString(entry?.batchName))
            .filter(Boolean),
        ),
      );

      if (!allowedBatchNames.length) {
        throw new AppError("You do not have permission to download this attendance report", 403);
      }

      studentWhere = {
        ...studentWhere,
        batchName: {
          in: allowedBatchNames,
        },
      };
    }
  }

  const students = await prisma.studentProfile.findMany({
    where: studentWhere,
    orderBy: [{ studentName: "asc" }, { createdAt: "asc" }],
    select: studentReportSelect,
  });

  if (!students.length) {
    throw new AppError(
      scope.kind === "course"
        ? "No records found for the selected course"
        : "No records found for the selected batch",
      404,
    );
  }

  const studentIds = students.map((student) => student.id);

  const records = await prisma.studentAttendance.findMany({
    where: {
      studentId: {
        in: studentIds,
      },
      attendanceDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: [
      { attendanceDate: "asc" },
      { markedAt: "asc" },
    ],
    include: {
      student: {
        select: studentReportSelect,
      },
      facultyUser: {
        select: facultyUserSelect,
      },
    },
  });

  if (!records.length) {
    throw new AppError(
      scope.kind === "course"
        ? "No records found for the selected course and date range"
        : "No records found for the selected batch and date range",
      404,
    );
  }

  return {
    scope,
    students,
    records,
  };
}

async function findFacultyAttendanceReportData({ facultyId, fromDate, toDate }) {
  const facultyProfile = await getFacultyProfileOrThrow(facultyId);
  const facultyUser = await getFacultyUserByProfileOrThrow(facultyProfile);

  const sessions = await prisma.facultyAttendanceSession.findMany({
    where: {
      facultyUserId: facultyUser.id,
      sessionSource: FACULTY_SESSION_SOURCE,
      attendanceDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: [{ attendanceDate: "asc" }, { loginAt: "asc" }, { createdAt: "asc" }],
  });

  const leaveRequests = await prisma.facultyLeaveRequest.findMany({
    where: {
      facultyUserId: facultyUser.id,
      status: "APPROVED",
      fromDate: { lte: toDate },
      toDate: { gte: fromDate },
    },
    orderBy: [{ fromDate: "asc" }, { createdAt: "asc" }],
    select: {
      fromDate: true,
      toDate: true,
      leaveType: true,
      durationType: true,
      halfDayStart: true,
      halfDayEnd: true,
      permissionStart: true,
      permissionEnd: true,
      permissionHours: true,
      reason: true,
    },
  });

  if (!sessions.length && !leaveRequests.length) {
    throw new AppError("No records found for the selected faculty and date range", 404);
  }

  return {
    facultyProfile,
    facultyUser,
    sessions,
    leaveRequests,
  };
}

async function findAllFacultyAttendanceReportData({ fromDate, toDate }) {
  const sessions = await prisma.facultyAttendanceSession.findMany({
    where: {
      sessionSource: FACULTY_SESSION_SOURCE,
      attendanceDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: [
      { attendanceDate: "asc" },
      { loginAt: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      facultyUser: {
        select: facultyUserSelect,
      },
    },
  });

  if (!sessions.length) {
    throw new AppError("No records found for the selected date range", 404);
  }

  const facultyEmails = Array.from(
    new Set(
      sessions
        .map((session) => normalizeString(session.facultyUser?.email).toLowerCase())
        .filter(Boolean),
    ),
  );

  const facultyProfiles = facultyEmails.length
    ? await prisma.facultyProfile.findMany({
        where: {
          facultyEmail: {
            in: facultyEmails,
          },
        },
        select: facultyProfileReportSelect,
      })
    : [];

  return {
    sessions,
    facultyProfiles,
  };
}

export {
  findAllFacultyAttendanceReportData,
  findBatchAttendanceReportData,
  findFacultyAttendanceReportData,
  findStudentAttendanceReportData,
};
