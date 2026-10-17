import { assertAttendanceAllowed, attendanceExclusions } from "../instituteLeave/instituteLeave.service.js";
import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";
import { assertStudentsNotDiscontinued } from "../../common/utils/studentDiscontinuationGuard.js";

const ATTENDANCE_STATUSES = new Set(["PRESENT", "ABSENT"]);
const LOCAL_TIME_ZONE = "Asia/Calcutta";
const FACULTY_SESSION_SOURCES = {
  ATTENDANCE: "ATTENDANCE",
  AUTH: "AUTH",
};

function normalizeString(value) {
  return String(value ?? "").trim();
}

function formatDateValue(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LOCAL_TIME_ZONE,
  }).format(date);
}

function getTodayValue() {
  return formatDateValue(new Date());
}

function parseDateString(value, fallback = getTodayValue()) {
  const text = normalizeString(value || fallback);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError("Date must be in YYYY-MM-DD format", 400);
  }

  return text;
}

function parseTime(value) {
  const match = normalizeString(value).match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = normalizeString(match[3]).toUpperCase();

  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "AM" && hour === 12) hour = 0;
    if (period === "PM" && hour !== 12) hour += 12;
  }

  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function parseAttendanceStatus(value) {
  const status = normalizeString(value).toUpperCase();

  if (!ATTENDANCE_STATUSES.has(status)) {
    throw new AppError("Invalid attendance status", 400);
  }

  return status;
}

function parseFacultySessionSource(value, fallback = FACULTY_SESSION_SOURCES.ATTENDANCE) {
  const source = normalizeString(value || fallback).toUpperCase();
  return source === FACULTY_SESSION_SOURCES.AUTH
    ? FACULTY_SESSION_SOURCES.AUTH
    : FACULTY_SESSION_SOURCES.ATTENDANCE;
}

function buildMonthLabel(year, monthIndex) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: LOCAL_TIME_ZONE,
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function getRecentMonths(count = 6) {
  const now = new Date();
  const months = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: buildMonthLabel(year, month),
      start: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    });
  }

  return months;
}

function getWeekDates(referenceDate = getTodayValue()) {
  const currentDate = new Date(`${referenceDate}T00:00:00`);
  const currentDay = currentDate.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const mondayDate = new Date(currentDate);
  mondayDate.setDate(currentDate.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    return formatDateValue(date);
  });
}

function formatDateTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LOCAL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mapFacultySessionRecord(session) {
  if (!session) return null;

  return {
    id: session.id,
    attendanceDate: session.attendanceDate,
    sessionSource: session.sessionSource,
    loginAt: session.loginAt || null,
    logoutAt: session.logoutAt || null,
    loginAtLabel: formatDateTime(session.loginAt),
    logoutAtLabel: formatDateTime(session.logoutAt),
    logoutType: session.logoutType || null,
    logoutReason: session.logoutReason || "",
    workReport: session.workReport || "",
    workCompleted: session.workCompleted || "",
  };
}

async function listFacultySessionsForDate(facultyUserId, attendanceDate, sessionSource = FACULTY_SESSION_SOURCES.ATTENDANCE) {
  if (!facultyUserId) {
    return [];
  }

  return prisma.facultyAttendanceSession.findMany({
    where: {
      facultyUserId,
      attendanceDate,
      sessionSource,
    },
    orderBy: [
      { loginAt: "asc" },
      { createdAt: "asc" },
    ],
  });
}

async function findActiveFacultySession(facultyUserId, attendanceDate, sessionSource = FACULTY_SESSION_SOURCES.ATTENDANCE) {
  if (!facultyUserId) {
    return null;
  }

  return prisma.facultyAttendanceSession.findFirst({
    where: {
      facultyUserId,
      attendanceDate,
      sessionSource,
      logoutAt: null,
    },
    orderBy: [
      { loginAt: "desc" },
      { createdAt: "desc" },
    ],
  });
}

function getLatestOpenSession(sessions = []) {
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (!sessions[index]?.logoutAt) {
      return sessions[index];
    }
  }

  return null;
}

function uniqueByKey(items, getKey) {
  return Array.from(
    new Map(
      items
        .filter(Boolean)
        .map((item) => [getKey(item), item]),
    ).values(),
  );
}

async function getFacultyProfileForUser(user) {
  const normalizedEmail = normalizeString(user?.email).toLowerCase();

  if (!normalizedEmail) {
    throw new AppError("Faculty profile not found", 404);
  }

  const profile = await prisma.facultyProfile.findFirst({
    where: {
      facultyEmail: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
      status: "ACTIVE",
    },
    include: {
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
      },
      courseAssignments: {
        include: {
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      course: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!profile) {
    throw new AppError("Faculty profile not found", 404);
  }

  return profile;
}

function buildFallbackFacultyProfile(user) {
  const normalizedName = normalizeString(user?.fullName || user?.userCode || "Faculty");
  const normalizedEmail = normalizeString(user?.email).toLowerCase();

  return {
    id: normalizeString(user?.id),
    facultyName: normalizedName || "Faculty",
    facultyEmail: normalizedEmail,
    facultyPhone: "",
    courseId: null,
    course: null,
    status: "ACTIVE",
    courseAssignments: [],
    batchEntries: [],
  };
}

async function getFacultyProfileById(facultyId) {
  const normalizedFacultyId = normalizeString(facultyId);

  if (!normalizedFacultyId) {
    throw new AppError("Faculty profile not found", 404);
  }

  const profile = await prisma.facultyProfile.findFirst({
    where: {
      id: normalizedFacultyId,
      status: "ACTIVE",
    },
    include: {
      batchEntries: {
        orderBy: { sequenceNo: "asc" },
      },
      courseAssignments: {
        include: {
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      course: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!profile) {
    throw new AppError("Faculty profile not found", 404);
  }

  return profile;
}

async function resolveFacultyAttendanceContext(user, facultyId = "") {
  const currentRole = normalizeString(user?.role).toUpperCase();

  if (currentRole === "FACULTY") {
    let profile;
    try {
      profile = await getFacultyProfileForUser(user);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        profile = buildFallbackFacultyProfile(user);
      } else {
        throw error;
      }
    }

    return {
      profile,
      facultyUserId: user.id,
      actingUserId: user.id,
    };
  }

  if (!["BUSINESS_OWNER", "OPERATION_MANAGER"].includes(currentRole)) {
    throw new AppError("You do not have permission for this action", 403);
  }

  const profile = await getFacultyProfileById(facultyId);
  const facultyUser = await prisma.user.findFirst({
    where: {
      active: true,
      role: "FACULTY",
      email: {
        equals: normalizeString(profile.facultyEmail).toLowerCase(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  return {
    profile,
    facultyUserId: facultyUser?.id || null,
    actingUserId: user.id,
  };
}

function buildFacultyScope(profile) {
  const batchEntries = Array.isArray(profile?.batchEntries) ? profile.batchEntries : [];

  return uniqueByKey(
    batchEntries
      .map((entry) => ({
        courseId: normalizeString(entry?.courseId),
        courseName: normalizeString(entry?.course?.name || ""),
        batchName: normalizeString(entry?.batchName),
        batchTiming: normalizeString(entry?.batchTiming),
        batchEntryId: normalizeString(entry?.id),
        sequenceNo: Number(entry?.sequenceNo || 0) || 0,
      }))
      .filter((entry) => entry.courseId && entry.batchName),
    (entry) => `${entry.courseId}::${entry.batchName}`.toLowerCase(),
  );
}

async function resolveBranchFacultyCandidates(user, facultyId = "") {
  const role = normalizeString(user?.role).toUpperCase();
  if (role === "FACULTY") {
    const email = normalizeString(user?.email).toLowerCase();
    if (!email) return [];
    const faculty = await prisma.branchFaculty.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        status: "ACTIVE",
      },
      select: { id: true, facultyId: true },
    });
    return uniqueByKey([faculty?.id, faculty?.facultyId].map(normalizeString).filter(Boolean), (value) => value.toLowerCase());
  }

  return uniqueByKey([facultyId].map(normalizeString).filter(Boolean), (value) => value.toLowerCase());
}

async function findBranchAttendanceBatch(user, payload = {}, facultyId = "", attendanceDate = "") {
  const courseId = normalizeString(payload.courseId);
  const batchName = normalizeString(payload.batchName);
  const batchId = normalizeString(payload.batchId || payload.batchEntryId);
  const branchId = normalizeString(payload.branchId || payload.branchCode);
  const facultyCandidates = await resolveBranchFacultyCandidates(user, facultyId);
  const facultyEmail = normalizeString(user?.email).toLowerCase();
  const movedOriginalAssignments = attendanceDate && facultyCandidates.length
    ? await prisma.facultyLeaveAffectedSession.findMany({ where: { sessionDate: attendanceDate, originalFacultyId: { in: facultyCandidates }, resolutionStatus: "RESCHEDULED", ...(batchId ? { OR: [{ batchRecordId: batchId }, { batchId }] } : {}) }, select: { id: true, batchRecordId: true, batchId: true, rescheduledDate: true, rescheduledStartTime: true, rescheduledEndTime: true } })
    : [];
  if (movedOriginalAssignments.length) throw new AppError("This class was rescheduled and attendance is available only on the new session date", 403);
  const replacementAssignments = attendanceDate && facultyCandidates.length
    ? await prisma.facultyLeaveAffectedSession.findMany({ where: { replacementDate: attendanceDate, replacementFacultyId: { in: facultyCandidates }, replacementStatus: "CONFIRMED", resolutionStatus: "REPLACEMENT_ASSIGNED" }, select: { batchRecordId: true, batchId: true, replacementDate: true, replacementStartTime: true, replacementEndTime: true } })
    : [];
  const combinedLinks = attendanceDate && facultyCandidates.length
    ? await prisma.facultyLeaveCombinedSession.findMany({ where: { sessionDate: attendanceDate, facultyId: { in: facultyCandidates }, status: "ACTIVE" }, select: { id: true, sessionDate: true, startTime: true, endTime: true } })
    : [];
  const combinedAssignments = combinedLinks.length
    ? await prisma.facultyLeaveAffectedSession.findMany({ where: { combinedSessionId: { in: combinedLinks.map((item) => item.id) }, resolutionStatus: "COMBINED" }, select: { batchRecordId: true, batchId: true, sessionDate: true, combinedSessionId: true } })
    : [];
  const temporaryAssignments = [...replacementAssignments, ...combinedAssignments.map((item) => ({ ...item, replacementDate: item.sessionDate, replacementStartTime: combinedLinks.find((link) => link.id === item.combinedSessionId)?.startTime, replacementEndTime: combinedLinks.find((link) => link.id === item.combinedSessionId)?.endTime, combined: true }))];
  const rescheduledAssignments = attendanceDate && facultyCandidates.length
    ? await prisma.facultyLeaveAffectedSession.findMany({ where: { rescheduledDate: attendanceDate, originalFacultyId: { in: facultyCandidates }, resolutionStatus: "RESCHEDULED", ...(batchId ? { OR: [{ batchRecordId: batchId }, { batchId }] } : {}) }, select: { batchRecordId: true, batchId: true, rescheduledDate: true, rescheduledStartTime: true, rescheduledEndTime: true } })
    : [];
  temporaryAssignments.push(...rescheduledAssignments.map((item) => ({ ...item, replacementDate: item.rescheduledDate, replacementStartTime: item.rescheduledStartTime, replacementEndTime: item.rescheduledEndTime, rescheduled: true })));

  if (!courseId || !batchName) return null;

  const batch = await prisma.branchBatch.findFirst({
    where: {
      ...(branchId ? { branchId } : {}),
      status: "ACTIVE",
      courseId,
      batchName: { equals: batchName, mode: "insensitive" },
      ...(batchId ? { OR: [{ id: batchId }, { batchId }] } : {}),
      AND: [{
        OR: [
          ...(facultyCandidates.length ? [
            { facultyId: { in: facultyCandidates } },
            { branchFacultyId: { in: facultyCandidates } },
          ] : []),
          ...(facultyEmail ? [{ facultyEmail: { equals: facultyEmail, mode: "insensitive" } }] : []),
          ...(temporaryAssignments.length ? [{ id: { in: temporaryAssignments.map((item) => item.batchRecordId).filter(Boolean) } }, { batchId: { in: temporaryAssignments.map((item) => item.batchId).filter(Boolean) } }] : []),
        ],
      }],
    },
    select: {
      id: true,
      branchId: true,
      branchCourseId: true,
      batchId: true,
      batchName: true,
      batchTiming: true,
      courseId: true,
      courseName: true,
      facultyId: true,
      facultyName: true,
      facultyEmail: true,
    },
  });
  if (!batch) return null;
  const temporaryAssignment = temporaryAssignments.find((item) => item.batchRecordId === batch.id || item.batchId === batch.batchId);
  return temporaryAssignment ? {
    ...batch,
    temporarySessionWindow: {
      kind: temporaryAssignment.combined ? "COMBINED" : temporaryAssignment.rescheduled ? "RESCHEDULED" : "REPLACEMENT",
      date: temporaryAssignment.replacementDate || attendanceDate,
      startTime: temporaryAssignment.replacementStartTime,
      endTime: temporaryAssignment.replacementEndTime,
    },
  } : batch;
}

function mapBranchAttendanceStudent(student, attendance) {
  return {
    id: student.id,
    studentCode: student.studentId,
    studentName: student.studentName,
    emailAddress: student.emailAddress,
    mobileNumber: student.mobileNumber,
    location: student.city || student.state || student.country || "",
    qualification: student.qualification,
    passedOutYear: student.passedOutYear,
    currentStatus: student.currentStatus,
    admissionDate: student.admissionDate,
    courseId: student.courseId || null,
    batchId: student.batchId || null,
    batchName: student.batchName || null,
    classSchedule: student.classSchedule || null,
    courseStartDate: student.courseStartDate || null,
    courseEndDate: student.courseEndDate || null,
    weeklyOffDay: student.weeklyOffDay || null,
    attendanceStatus: attendance?.status || "UNMARKED",
    attendanceMarkedAt: attendance?.markedAt || null,
    attendanceMarkedAtLabel: formatDateTime(attendance?.markedAt),
    attendanceNotes: attendance?.notes || "",
  };
}

async function markBranchStudentAttendance(user, payload, date, batch) {
  if (batch.temporarySessionWindow) {
    const start = parseTime(batch.temporarySessionWindow.startTime);
    const end = parseTime(batch.temporarySessionWindow.endTime);
    const todayValue = getTodayValue();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    if (date !== batch.temporarySessionWindow.date || date < todayValue || start == null || end == null || (date === todayValue && (nowMinutes < start || nowMinutes >= end))) {
      const label = batch.temporarySessionWindow.kind === "COMBINED" ? "Combined class" : batch.temporarySessionWindow.kind === "RESCHEDULED" ? "Rescheduled class" : "Replacement class";
      throw new AppError(`${label} attendance is available only during the assigned session time`, 403);
    }
  }
  const entries = Array.isArray(payload.students) ? payload.students : [];
  const submittedStudents = uniqueByKey(
    entries
      .map((entry) => ({
        studentId: normalizeString(entry?.studentId),
        status: parseAttendanceStatus(entry?.status),
        notes: normalizeString(entry?.notes),
      }))
      .filter((entry) => entry.studentId),
    (entry) => entry.studentId,
  );

  if (!submittedStudents.length) throw new AppError("Valid student attendance entries are required", 400);

  const students = await prisma.branchStudent.findMany({
    where: {
      branchId: batch.branchId,
      recordStatus: "ACTIVE",
      AND: [
        { OR: [
          { courseId: batch.courseId, batchId: batch.batchId },
          { courseEnrollments: { some: { status: "ACTIVE", courseId: batch.courseId, batchId: batch.batchId } } },
        ] },
        { OR: [
          { id: { in: submittedStudents.map((entry) => entry.studentId) } },
          { studentId: { in: submittedStudents.map((entry) => entry.studentId) } },
        ] },
      ],
    },
    select: { id: true, studentId: true },
  });
  await assertStudentsNotDiscontinued(students.map((student) => student.id));
  const studentByIdentifier = new Map(students.flatMap((student) => [[student.id, student], [student.studentId, student]]));
  if (students.length !== submittedStudents.length) throw new AppError("One or more students do not belong to this batch", 400);

  const firstSubmodule = Array.isArray(payload.submodules) ? payload.submodules[0] : null;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Branch" WHERE id = ${batch.branchId} FOR UPDATE`;
    await assertAttendanceAllowed(tx, students, date, batch.branchId);
    for (const entry of submittedStudents) {
      const student = studentByIdentifier.get(entry.studentId);
      await tx.branchStudentAttendance.upsert({
        where: { branchStudentId_attendanceDate_courseId: { branchStudentId: student.id, attendanceDate: date, courseId: batch.courseId } },
        create: {
          branchStudentId: student.id,
          facultyUserId: normalizeString(user?.id) || null,
          courseId: batch.courseId,
          batchId: batch.batchId,
          moduleId: normalizeString(payload.moduleId) || null,
          moduleName: normalizeString(payload.moduleName) || null,
          submoduleId: normalizeString(payload.submoduleId || firstSubmodule?.id) || null,
          submoduleName: normalizeString(payload.submoduleName || firstSubmodule?.name) || null,
          attendanceDate: date,
          status: entry.status,
          notes: entry.notes || null,
        },
        update: {
          facultyUserId: normalizeString(user?.id) || null,
          courseId: batch.courseId,
          batchId: batch.batchId,
          moduleId: normalizeString(payload.moduleId) || null,
          moduleName: normalizeString(payload.moduleName) || null,
          submoduleId: normalizeString(payload.submoduleId || firstSubmodule?.id) || null,
          submoduleName: normalizeString(payload.submoduleName || firstSubmodule?.name) || null,
          status: entry.status,
          notes: entry.notes || null,
          markedAt: new Date(),
        },
      });
    }
  });

  const presentStudentIds = submittedStudents
    .filter((entry) => entry.status === "PRESENT")
    .map((entry) => studentByIdentifier.get(entry.studentId)?.id)
    .filter(Boolean);
  if (presentStudentIds.length) {
    await prisma.studentDiscontinuationRequest.updateMany({
      where: {
        branchStudentId: { in: presentStudentIds },
        reason: "Long absence follow-up after motivation email",
        status: { in: ["PENDING", "CONTACTED_CONTINUE"] },
      },
      data: {
        status: "CANCELLED",
        contactNotes: "Automatically closed because the student was marked present.",
        updatedAt: new Date(),
      },
    });
  }
  const absentStudentIds = submittedStudents
    .filter((entry) => entry.status === "ABSENT")
    .map((entry) => studentByIdentifier.get(entry.studentId)?.id)
    .filter(Boolean);
  if (absentStudentIds.length) {
    const continueRequests = await prisma.studentDiscontinuationRequest.findMany({
      where: {
        branchStudentId: { in: absentStudentIds },
        reason: "Long absence follow-up after motivation email",
        status: "CONTACTED_CONTINUE",
        nextFollowUpDate: { lte: date },
      },
      include: {
        branchStudent: {
          select: { id: true, studentName: true, studentId: true, courseName: true },
        },
      },
    });

    for (const request of continueRequests) {
      const updated = await prisma.studentDiscontinuationRequest.updateMany({
        where: { id: request.id, status: "CONTACTED_CONTINUE" },
        data: {
          status: "PENDING",
          contactOutcome: null,
          nextFollowUpDate: null,
          contactNotes: "Student was marked absent on the planned continuation date.",
          updatedAt: new Date(),
        },
      });
      if (!updated.count) continue;

      const branch = await prisma.branch.findUnique({
        where: { id: batch.branchId },
        select: { id: true, branchName: true, branchEmail: true, adminUserId: true },
      });
      if (!branch?.adminUserId) continue;

      const requestDescription = "MOTIVATION_CONTINUE_ABSENT:" + request.branchStudentId + ":" + date;
      const existingNotification = await prisma.notification.findFirst({
        where: { requestDescription },
        select: { id: true },
      });
      if (existingNotification) continue;

      await createNotification({
        kind: "STUDENT_MOTIVATION",
        tone: "red",
        title: "Student absent after continuation date",
        message: (request.branchStudent?.studentName || "Student") + " was absent on " + date + " after confirming course continuation. Please contact the student and record the next outcome.",
        actionLabel: "Review student",
        targetUserId: branch.adminUserId,
        targetBranchId: branch.id,
        targetBranchEmail: branch.branchEmail,
        targetBranchName: branch.branchName,
        batchId: batch.batchId || null,
        requestDescription,
        requestTitle: "Continuation attendance follow-up",
        requestStatus: "PENDING",
        createdBy: "SYSTEM",
      });
    }
  }
  return getCurrentFacultyAttendanceOverview(user, date, "");
}

async function getBranchFacultyAttendanceOverview(user, date, facultyId = "") {
  const candidates = await resolveBranchFacultyCandidates(user, facultyId);
  const email = normalizeString(user?.email).toLowerCase();
  const facultyOr = [
    ...(candidates.length ? [{ facultyId: { in: candidates } }, { branchFacultyId: { in: candidates } }] : []),
    ...(email ? [{ facultyEmail: { equals: email, mode: "insensitive" } }] : []),
  ];
  if (!facultyOr.length) return null;

  const branchBatches = await prisma.branchBatch.findMany({
    where: { status: "ACTIVE", OR: facultyOr },
    orderBy: { sequenceNo: "asc" },
    select: { id: true, branchId: true, courseId: true, courseName: true, batchId: true, batchName: true, batchTiming: true, sequenceNo: true, weekType: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true },
  });
  if (!branchBatches.length) return null;

  const students = await prisma.branchStudent.findMany({
    where: {
      recordStatus: "ACTIVE",
      OR: branchBatches.flatMap((batch) => [
        { branchId: batch.branchId, courseId: batch.courseId, batchId: batch.batchId },
        { branchId: batch.branchId, courseEnrollments: { some: { status: "ACTIVE", courseId: batch.courseId, batchId: batch.batchId } } },
      ]),
    },
    select: { id: true, studentId: true, studentName: true, emailAddress: true, mobileNumber: true, city: true, state: true, country: true, qualification: true, passedOutYear: true, currentStatus: true, admissionDate: true, courseId: true, batchId: true, branchId: true, classSchedule: true, courseStartDate: true, courseEndDate: true, weeklyOffDay: true, courseEnrollments: { where: { status: "ACTIVE" }, select: { courseId: true, courseName: true, batchId: true, batchName: true, batchTiming: true, scheduleType: true, startDate: true, endDate: true } } },
    select: { id: true, studentId: true, studentName: true, emailAddress: true, mobileNumber: true, city: true, state: true, country: true, qualification: true, passedOutYear: true, currentStatus: true, admissionDate: true, courseId: true, batchId: true, branchId: true, classSchedule: true, courseStartDate: true, courseEndDate: true, weeklyOffDay: true, courseEnrollments: { where: { status: "ACTIVE" }, select: { courseId: true, courseName: true, batchId: true, batchName: true, batchTiming: true, scheduleType: true, startDate: true, endDate: true } } },
  });
  const studentIds = students.map((student) => student.id);
  const attendanceRecords = studentIds.length
    ? await prisma.branchStudentAttendance.findMany({
        where: { branchStudentId: { in: studentIds }, attendanceDate: { gte: getRecentMonths(6)[0]?.start || date } },
        select: { branchStudentId: true, courseId: true, batchId: true, attendanceDate: true, status: true, markedAt: true, notes: true },
      })
    : [];
  const instituteExclusions = await attendanceExclusions(prisma, students, date);
  const todayMap = new Map(attendanceRecords.filter((record) => record.attendanceDate === date).map((record) => [`${record.branchStudentId}|${record.courseId || ""}|${record.batchId || ""}`, record]));
  const batches = branchBatches.map((batch) => {
    const batchStudents = students
      .filter((student) => student.branchId === batch.branchId && ((student.courseId === batch.courseId && student.batchId === batch.batchId) || (student.courseEnrollments || []).some((enrollment) => enrollment.courseId === batch.courseId && enrollment.batchId === batch.batchId)))
      .map((student) => {
        const enrollment = (student.courseEnrollments || []).find((item) => item.courseId === batch.courseId && item.batchId === batch.batchId);
        const attendance = todayMap.get(`${student.id}|${batch.courseId}|${batch.batchId}`) || todayMap.get(`${student.id}||`);
        const effectiveStudent = { ...student, courseId: batch.courseId, batchId: batch.batchId, classSchedule: enrollment?.scheduleType || student.classSchedule, courseStartDate: enrollment?.startDate || student.courseStartDate, courseEndDate: enrollment?.endDate || student.courseEndDate };
        return { ...mapBranchAttendanceStudent(effectiveStudent, instituteExclusions.has(student.id) ? { status: "NOT_APPLICABLE" } : attendance), courseId: batch.courseId, courseName: enrollment?.courseName || batch.courseName, batchId: batch.batchId, batchName: enrollment?.batchName || batch.batchName, batchTiming: enrollment?.batchTiming || batch.batchTiming, classSchedule: batch.weekType || enrollment?.scheduleType || student.classSchedule, weeklyOffDay: batch.weeklyOffDay || student.weeklyOffDay, courseStartDate: enrollment?.startDate || batch.courseStartDate || student.courseStartDate, courseEndDate: enrollment?.endDate || batch.courseEndDate || student.courseEndDate, records: attendanceRecords.filter((record) => record.branchStudentId === student.id && record.courseId === batch.courseId && record.batchId === batch.batchId).map(({ branchStudentId, ...record }) => record) };
      });
    const present = batchStudents.filter((student) => student.attendanceStatus === "PRESENT").length;
    const absent = batchStudents.filter((student) => student.attendanceStatus === "ABSENT").length;
    return { id: batch.id || batch.batchId, courseId: batch.courseId, courseName: batch.courseName, batchId: batch.batchId, batchName: batch.batchName, batchTiming: batch.batchTiming, sequenceNo: batch.sequenceNo, present, absent, notApplicable: batchStudents.filter(s => s.attendanceStatus === "NOT_APPLICABLE").length, unmarked: batchStudents.filter(s => s.attendanceStatus === "UNMARKED").length, totalStudents: batchStudents.length, students: batchStudents };
  });
  const present = batches.reduce((sum, batch) => sum + batch.present, 0);
  const absent = batches.reduce((sum, batch) => sum + batch.absent, 0);
  const marked = present + absent;
  return {
    date,
    facultySession: { loginAt: null, logoutAt: null, loginAtLabel: "", logoutAtLabel: "", activeSessionId: null, totalSessions: 0, sessions: [] },
    summary: { totalBatches: batches.length, totalStudents: students.length, present, absent, notApplicable: instituteExclusions.size, unmarked: Math.max(0, students.length - marked - instituteExclusions.size), attendancePercentage: marked ? Math.round((present / marked) * 1000) / 10 : 0 },
    monthlySeries: buildMonthlySeries(attendanceRecords),
    batches,
    exclusions: { holidays: [], leaves: [] },
    students: batches.flatMap((batch) => batch.students).filter((student, index, list) => list.findIndex((item) => item.id === student.id) === index),
  };
}

function groupStudentsByBatch(scopeEntries, students, attendanceMap) {
  return scopeEntries.map((scopeEntry) => {
    const batchStudents = students
      .filter(
        (student) =>
          normalizeString(student.courseId) === scopeEntry.courseId &&
          normalizeString(student.batchName) === scopeEntry.batchName,
      )
      .map((student) => {
        const attendance = attendanceMap.get(student.id) || null;
        return {
          id: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          emailAddress: student.emailAddress,
          mobileNumber: student.mobileNumber,
          location: student.location,
          qualification: student.qualification,
          passedOutYear: student.passedOutYear,
          currentStatus: student.currentStatus,
          admissionDate: student.admissionDate,
          attendanceStatus: attendance?.status || "UNMARKED",
          attendanceMarkedAt: attendance?.markedAt || null,
          attendanceMarkedAtLabel: formatDateTime(attendance?.markedAt),
          attendanceNotes: attendance?.notes || "",
        };
      });

    const present = batchStudents.filter((student) => student.attendanceStatus === "PRESENT").length;
    const absent = batchStudents.filter((student) => student.attendanceStatus === "ABSENT").length;
    const unmarked = Math.max(0, batchStudents.length - present - absent);

    return {
      id: scopeEntry.batchEntryId || `${scopeEntry.courseId}-${scopeEntry.batchName}`,
      courseId: scopeEntry.courseId,
      courseName: scopeEntry.courseName || scopeEntry.courseId,
      batchName: scopeEntry.batchName,
      batchTiming: scopeEntry.batchTiming,
      sequenceNo: scopeEntry.sequenceNo,
      present,
      absent,
      unmarked,
      totalStudents: batchStudents.length,
      students: batchStudents,
    };
  });
}

function buildMonthlySeries(records) {
  const months = getRecentMonths(6);

  return months.map((month) => {
    const monthRecords = records.filter((record) => String(record.attendanceDate || "").startsWith(month.key));
    const total = monthRecords.length;
    const present = monthRecords.filter((record) => record.status === "PRESENT").length;
    const value = total ? Math.round((present / total) * 1000) / 10 : 0;

    return {
      label: month.label,
      value,
      present,
      total,
    };
  });
}

function buildStudentMonthlySeries(student, records) {
  const durationMonths = Math.max(1, Math.min(12, Number(student?.course?.duration || 6) || 6));
  const admissionDate = normalizeString(student?.admissionDate) || getTodayValue();
  const start = new Date(`${admissionDate}T00:00:00`);

  if (Number.isNaN(start.getTime())) {
    return [];
  }

  return Array.from({ length: durationMonths }, (_, index) => {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthRecords = records.filter((record) => String(record.attendanceDate || "").startsWith(key));
    const total = monthRecords.length;
    const present = monthRecords.filter((record) => record.status === "PRESENT").length;

    return {
      month: buildMonthLabel(date.getFullYear(), date.getMonth()),
      value: total ? Math.round((present / total) * 100) : 0,
    };
  });
}

function buildStudentWeeklyOverview(records, todayDate) {
  const weekDates = getWeekDates(todayDate);
  const recordMap = new Map(records.map((record) => [record.attendanceDate, record]));
  const days = weekDates.map((date) => ({
    date,
    status: recordMap.get(date)?.status || "UNMARKED",
  }));
  const presentCount = days.filter((day) => day.status === "PRESENT").length;
  const absentCount = days.filter((day) => day.status === "ABSENT").length;
  const totalMarked = presentCount + absentCount;
  const weeklyPercentage = totalMarked ? Math.round((presentCount / totalMarked) * 100) : 0;
  const todayRecord = recordMap.get(todayDate) || null;

  return {
    todayStatus: todayRecord?.status || "UNMARKED",
    todayMarkedAt: todayRecord?.markedAt || null,
    todayMarkedAtLabel: formatDateTime(todayRecord?.markedAt),
    presentCount,
    absentCount,
    weeklyPercentage,
    weekDates,
  };
}

export async function recordFacultyLoginSession(
  userId,
  attendanceDate = getTodayValue(),
  options = {},
) {
  const parsedDate = parseDateString(attendanceDate);
  const now = new Date();
  const sessionSource = parseFacultySessionSource(options.sessionSource, FACULTY_SESSION_SOURCES.AUTH);

  await prisma.facultyAttendanceSession.create({
    data: {
      facultyUserId: userId,
      attendanceDate: parsedDate,
      sessionSource,
      loginAt: now,
      logoutType: options.logoutType || null,
      logoutReason: options.logoutReason || null,
      workReport: options.workReport || null,
      workCompleted: options.workCompleted || null,
    },
  });
}

export async function recordFacultyLogoutSession(
  userId,
  attendanceDate = getTodayValue(),
  options = {},
) {
  const parsedDate = parseDateString(attendanceDate);
  const now = new Date();
  const sessionSource = parseFacultySessionSource(options.sessionSource, FACULTY_SESSION_SOURCES.AUTH);
  const activeSession = await findActiveFacultySession(userId, parsedDate, sessionSource);

  if (!activeSession) {
    return null;
  }

  await prisma.facultyAttendanceSession.update({
    where: {
      id: activeSession.id,
    },
    data: {
      logoutAt: now,
      logoutType: options.logoutType || null,
      logoutReason: options.logoutReason || null,
      workReport: options.workReport || null,
      workCompleted: options.workCompleted || null,
    },
  });

  return activeSession.id;
}

export async function recordFacultyAttendanceLogin(user, payload = {}) {
  const date = parseDateString(payload.date);
  const facultyId = normalizeString(payload.facultyId);
  const { facultyUserId } = await resolveFacultyAttendanceContext(user, facultyId);
  const activeSession = await findActiveFacultySession(facultyUserId, date, FACULTY_SESSION_SOURCES.ATTENDANCE);

  if (activeSession) {
    throw new AppError("Faculty attendance is already logged in for the current session", 409);
  }

  await prisma.facultyAttendanceSession.create({
    data: {
      facultyUserId,
      attendanceDate: date,
      sessionSource: FACULTY_SESSION_SOURCES.ATTENDANCE,
      loginAt: new Date(),
    },
  });

  return getCurrentFacultyAttendanceOverview(user, date, facultyId);
}

export async function recordFacultyAttendanceLogout(user, payload = {}) {
  const date = parseDateString(payload.date);
  const facultyId = normalizeString(payload.facultyId);
  const logoutType = normalizeString(payload.logoutType || "normal").toLowerCase();
  const logoutReason = normalizeString(payload.logoutReason);
  const workReport = normalizeString(payload.workReport);
  const workCompleted = normalizeString(payload.workCompleted);
  const { facultyUserId } = await resolveFacultyAttendanceContext(user, facultyId);
  const activeSession = await findActiveFacultySession(facultyUserId, date, FACULTY_SESSION_SOURCES.ATTENDANCE);

  if (!activeSession) {
    throw new AppError("No active faculty attendance login session found", 409);
  }

  await prisma.facultyAttendanceSession.update({
    where: {
      id: activeSession.id,
    },
    data: {
      logoutAt: new Date(),
      logoutType: logoutType || "normal",
      logoutReason: logoutReason || null,
      workReport: workReport || null,
      workCompleted: workCompleted || null,
    },
  });

  return getCurrentFacultyAttendanceOverview(user, date, facultyId);
}

export async function getCurrentFacultyAttendanceOverview(user, dateValue, facultyId = "") {
  const date = parseDateString(dateValue);
  const branchOverview = await getBranchFacultyAttendanceOverview(user, date, facultyId);
  if (branchOverview) return branchOverview;

  const { profile, facultyUserId } = await resolveFacultyAttendanceContext(user, facultyId);
  const scopeEntries = buildFacultyScope(profile);

  const students = scopeEntries.length
    ? await prisma.studentProfile.findMany({
        where: {
          recordStatus: "ACTIVE",
          OR: scopeEntries.map((entry) => ({
            courseId: entry.courseId,
            batchName: entry.batchName,
          })),
        },
        select: {
          id: true,
          studentCode: true,
          studentName: true,
          emailAddress: true,
          mobileNumber: true,
          location: true,
          qualification: true,
          passedOutYear: true,
          currentStatus: true,
          admissionDate: true,
          courseId: true,
          batchName: true,
        },
      })
    : [];

  const studentIds = students.map((student) => student.id);
  const monthlyWindowStart = getRecentMonths(6)[0]?.start || date;
  const attendanceRecords = studentIds.length
    ? await prisma.studentAttendance.findMany({
        where: {
          studentId: {
            in: studentIds,
          },
          attendanceDate: {
            gte: monthlyWindowStart,
          },
        },
        select: {
          studentId: true,
          attendanceDate: true,
          status: true,
          markedAt: true,
          notes: true,
        },
      })
    : [];

  const todayAttendanceMap = new Map(
    attendanceRecords
      .filter((record) => record.attendanceDate === date)
      .map((record) => [record.studentId, record]),
  );

  const sessions = facultyUserId
    ? await listFacultySessionsForDate(facultyUserId, date, FACULTY_SESSION_SOURCES.ATTENDANCE)
    : [];
  const latestSession = sessions.length ? sessions[sessions.length - 1] : null;
  const activeSession = getLatestOpenSession(sessions);
  const displaySession = activeSession || latestSession || null;
  const mappedSessions = sessions.map(mapFacultySessionRecord);

  const batches = groupStudentsByBatch(scopeEntries, students, todayAttendanceMap);
  const totalMarked = batches.reduce((sum, batch) => sum + batch.present + batch.absent, 0);
  const totalPresent = batches.reduce((sum, batch) => sum + batch.present, 0);
  const overallPercentage = totalMarked ? Math.round((totalPresent / totalMarked) * 1000) / 10 : 0;

  return {
    date,
    facultySession: {
      loginAt: displaySession?.loginAt || null,
      logoutAt: displaySession?.logoutAt || null,
      loginAtLabel: formatDateTime(displaySession?.loginAt),
      logoutAtLabel: formatDateTime(displaySession?.logoutAt),
      activeSessionId: activeSession?.id || null,
      totalSessions: mappedSessions.length,
      sessions: mappedSessions,
    },
    summary: {
      totalBatches: batches.length,
      totalStudents: students.length,
      present: totalPresent,
      absent: batches.reduce((sum, batch) => sum + batch.absent, 0),
      unmarked: batches.reduce((sum, batch) => sum + batch.unmarked, 0),
      attendancePercentage: overallPercentage,
    },
    monthlySeries: buildMonthlySeries(attendanceRecords),
    batches,
  };
}

export async function markFacultyStudentAttendance(user, payload = {}) {
  const date = parseDateString(payload.date);
  const facultyId = normalizeString(payload.facultyId);
  const courseId = normalizeString(payload.courseId);
  const batchName = normalizeString(payload.batchName);
  const entries = Array.isArray(payload.students) ? payload.students : [];

  if (!courseId || !batchName) {
    throw new AppError("Course and batch are required", 400);
  }

  if (!entries.length) {
    throw new AppError("At least one student attendance entry is required", 400);
  }

  const branchBatch = await findBranchAttendanceBatch(user, payload, facultyId, date);
  if (branchBatch) {
    return markBranchStudentAttendance(user, payload, date, branchBatch);
  }

  const { profile, facultyUserId, actingUserId } = await resolveFacultyAttendanceContext(user, facultyId);
  const scopeEntries = buildFacultyScope(profile);
  const hasBatchAccess = scopeEntries.some(
    (entry) => entry.courseId === courseId && entry.batchName.toLowerCase() === batchName.toLowerCase(),
  );

  if (!hasBatchAccess) {
    throw new AppError("You do not have permission to mark attendance for this batch", 403);
  }

  const studentIds = uniqueByKey(
    entries
      .map((entry) => ({
        studentId: normalizeString(entry?.studentId),
        status: parseAttendanceStatus(entry?.status),
        notes: normalizeString(entry?.notes),
      }))
      .filter((entry) => entry.studentId),
    (entry) => entry.studentId,
  );

  if (!studentIds.length) {
    throw new AppError("Valid student attendance entries are required", 400);
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      id: {
        in: studentIds.map((entry) => entry.studentId),
      },
      recordStatus: "ACTIVE",
      courseId,
      batchName,
    },
    select: {
      id: true,
    },
  });

  if (students.length !== studentIds.length) {
    throw new AppError("One or more students do not belong to this batch", 400);
  }

  await prisma.$transaction(
    studentIds.map((entry) =>
      prisma.studentAttendance.upsert({
        where: {
          studentId_attendanceDate: {
            studentId: entry.studentId,
            attendanceDate: date,
          },
        },
        create: {
          studentId: entry.studentId,
          facultyUserId,
          courseId,
          batchName,
          attendanceDate: date,
          status: entry.status,
          notes: entry.notes || null,
          createdBy: actingUserId,
          updatedBy: actingUserId,
        },
        update: {
          facultyUserId,
          courseId,
          batchName,
          status: entry.status,
          notes: entry.notes || null,
          markedAt: new Date(),
          updatedBy: actingUserId,
        },
      }),
    ),
  );

  return getCurrentFacultyAttendanceOverview(user, date, facultyId);
}

export async function getCurrentStudentAttendanceOverview(user, dateValue) {
  const date = parseDateString(dateValue);
  const normalizedEmail = normalizeString(user?.email).toLowerCase();
  const normalizedUserCode = normalizeString(user?.userCode);

  const student = await prisma.studentProfile.findFirst({
    where: {
      OR: [
        ...(normalizedEmail
          ? [
              {
                emailAddress: {
                  equals: normalizedEmail,
                  mode: "insensitive",
                },
              },
            ]
          : []),
        ...(normalizedUserCode ? [{ studentCode: normalizedUserCode }] : []),
      ],
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          duration: true,
        },
      },
    },
  });

  if (!student) {
    throw new AppError("Student profile not found", 404);
  }

  const attendanceRecords = await prisma.studentAttendance.findMany({
    where: {
      studentId: student.id,
    },
    orderBy: {
      attendanceDate: "asc",
    },
    select: {
      attendanceDate: true,
      status: true,
      markedAt: true,
    },
  });

  return {
    date,
    monthlySeries: buildStudentMonthlySeries(student, attendanceRecords),
    weeklyOverview: buildStudentWeeklyOverview(attendanceRecords, date),
  };
}
