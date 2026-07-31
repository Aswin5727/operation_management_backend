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

  if (!facultyProfile) {
    throw new AppError("Invalid facultyId", 404);
  }

  return facultyProfile;
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

async function findBatchAttendanceReportData({ batchId, batchName, courseId, fromDate, toDate }) {
  const batch = await resolveBatchForReport({ batchId, batchName, courseId });

  const students = await prisma.studentProfile.findMany({
    where: {
      ...(batch.courseId ? { courseId: batch.courseId } : {}),
      batchName: batch.batchName,
    },
    orderBy: [{ studentName: "asc" }, { createdAt: "asc" }],
    select: studentReportSelect,
  });

  if (!students.length) {
    throw new AppError("No records found for the selected batch", 404);
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
    throw new AppError("No records found for the selected batch and date range", 404);
  }

  return {
    batch,
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

  if (!sessions.length) {
    throw new AppError("No records found for the selected faculty and date range", 404);
  }

  return {
    facultyProfile,
    facultyUser,
    sessions,
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
