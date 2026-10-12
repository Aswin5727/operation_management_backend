import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { sendStudentDiscontinuationApprovalEmail } from "../../common/services/resendEmail.js";
import { isAffected } from "../instituteLeave/instituteSchedule.js";

const REVIEW_ROLES = new Set(["BRANCH_ADMIN", "SUPER_ADMIN"]);
const SUPER_ADMIN_ROLES = new Set(["SUPER_ADMIN"]);
const ACTIVE_REQUEST_STATUSES = ["PENDING", "SUPER_ADMIN_REVIEW", "SUPER_ADMIN_WAIT", "UNABLE_TO_CONTACT"];

function text(value) {
  return String(value ?? "").trim();
}

function isFutureDate(value) {
  const dateText = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
  const selected = new Date(`${dateText}T00:00:00`);
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return selected >= tomorrow;
}
function number(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function normalizeRequest(request) {
  if (!request) return null;
  const student = request.branchStudent;
  return {
    id: request.id,
    branchStudentId: request.branchStudentId,
    branchId: request.branchId,
    branchName: student?.branch?.branchName || "",
    branchCode: student?.branch?.branchId || "",
    student: student
      ? {
          id: student.id,
          studentId: student.studentId,
          studentName: student.studentName,
          mobileNumber: student.mobileNumber || "",
          parentSpouseNumber: student.parentSpouseNumber || "",
          emailAddress: student.emailAddress,
          courseName: student.courseName || "",
          batchName: student.batchName || "",
          courseAmount: student.courseAmount || 0,
          installments: Array.isArray(student.installments) ? student.installments : [],
          recordStatus: student.recordStatus,
        }
      : null,
    reason: request.reason,
    details: request.details || "",
    status: request.status,
    contactOutcome: request.contactOutcome || "",
    contactNotes: request.contactNotes || "",
    contactedBy: request.contactedBy,
    contactedAt: request.contactedAt,
    nextFollowUpDate: request.nextFollowUpDate || "",
    contactAttemptCount: request.contactAttemptCount || 0,
    installmentOverdueCount: request.installmentOverdueCount || 0,
    nextInstallmentDueDate: request.nextInstallmentDueDate || "",
    contactHistory: Array.isArray(request.contactHistory) ? request.contactHistory : [],
    escalationReason: request.escalationReason || "",
    branchReviewedBy: request.branchReviewedBy,
    branchReviewedAt: request.branchReviewedAt,
    branchReviewNote: request.branchReviewNote || "",
    superAdminReviewedBy: request.superAdminReviewedBy,
    superAdminReviewedAt: request.superAdminReviewedAt,
    superAdminReviewNote: request.superAdminReviewNote || "",
    accessDeactivationAt: request.accessDeactivationAt,
    financialSnapshot: {
      courseProgress: request.courseProgress,
      progressEarnedAmount: request.progressEarnedAmount,
      balanceDue: request.balanceDue,
      refundRequested: request.refundRequested,
      totalCourseFee: request.totalCourseFee,
      actualCourseAmount: request.actualCourseAmount || 0,
      gstAmount: request.gstAmount || 0,
      registrationFee: request.registrationFee || 0,
      discountAmount: request.discountAmount || 0,
      finalCourseFee: request.finalCourseFee || 0,
      totalCourseHours: request.totalCourseHours || 0,
      conductedDays: request.conductedDays || 0,
      conductedHours: request.conductedHours || 0,
      completedCourseAmount: request.completedCourseAmount || 0,
      totalPaid: request.totalPaid,
      outstandingAmount: request.outstandingAmount,
      refundEligibleAmount: request.refundEligibleAmount,
      waiverAmount: request.waiverAmount,
      finalOutstandingAmount: request.finalOutstandingAmount ?? request.outstandingAmount,
      settlementStatus: request.settlementStatus,
      financeNote: request.financeNote || "",
    },
    motivationMailHistory: (student?.motivationMailHistory || []).map((mail) => ({
      stage: mail.stage,
      status: mail.status,
      sentAt: mail.sentAt,
    })),
    motivationMailComplete: (student?.motivationMailHistory || []).some(
      (mail) => mail.stage === "MOTIVATION_MAIL_3" && mail.status === "SENT",
    ),    latestMotivationMail: [...(student?.motivationMailHistory || [])]
      .filter((mail) => mail.status === "SENT")
      .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime())[0] || null,    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

async function branchForActor(actor) {
  if (!actor || !["BRANCH_ADMIN", "STUDENT"].includes(String(actor.role || "").toUpperCase())) return null;
  return getCurrentBranchProfile(actor);
}

async function loadStudentForActor(studentId, actor) {
  const role = String(actor?.role || "").toUpperCase();
  const where = {};
  if (role === "STUDENT") {
    where.emailAddress = { equals: text(actor.email), mode: "insensitive" };
  } else {
    where.id = studentId;
    if (role === "BRANCH_ADMIN") {
      const branch = await branchForActor(actor);
      if (!branch?.id) throw new AppError("Branch profile not found", 404);
      where.branchId = branch.id;
    }
  }

  const student = await prisma.branchStudent.findFirst({
    where,
    include: {
      installments: { orderBy: { installmentNumber: "asc" } },
      payments: { select: { amount: true } },
      calendarAttendanceRecords: { select: { attendanceDate: true, status: true, courseId: true, batchId: true } },
      courseEnrollments: {
        where: { status: "ACTIVE" },
        orderBy: [{ sequenceOrder: "asc" }, { createdAt: "asc" }],
        include: {
          course: { select: { actualFees: true, registrationFees: true, discount: true, afterDiscount: true, hours: true } },
        },
      },
    },
  });
  if (!student) throw new AppError("Branch student not found", 404);
  return student;
}

function currentDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function batchHoursPerDay(student, batch) {
  const mode = text(batch?.mode || student.courseMode).toUpperCase();
  const weekType = text(batch?.weekType || student.classSchedule).toUpperCase();
  if (mode === "ONLINE") return 1;
  if (weekType.includes("WEEKEND")) return 3;
  return 2;
}


function getOverdueInstallments(student, today = currentDateKey()) {
  return (Array.isArray(student?.installments) ? student.installments : [])
    .filter((installment) => {
      const dueDate = text(installment?.dueDate);
      const amount = number(installment?.amount);
      const paid = Math.min(number(installment?.amountPaid), amount);
      return dueDate && dueDate < today && amount > paid;
    })
    .sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)));
}

function appendContactHistory(request, entry) {
  const history = Array.isArray(request?.contactHistory) ? request.contactHistory : [];
  return [...history, { ...entry, recordedAt: new Date().toISOString() }].slice(-50);
}
async function calculateSingleCourseDiscontinuationFinance(student) {
  const date = currentDateKey();
  const course = student.courseId ? await prisma.branchCourse.findUnique({
    where: { id: student.courseId },
    select: { actualFees: true, registrationFees: true, discount: true, afterDiscount: true, hours: true },
  }) : null;
  const batch = student.batchId ? await prisma.branchBatch.findFirst({
    where: { OR: [{ id: student.batchId }, { batchId: student.batchId }], branchId: student.branchId, courseId: student.courseId || undefined },
    orderBy: { createdAt: "desc" },
    select: { batchId: true, weekType: true, mode: true, weeklyOffDay: true, courseStartDate: true, courseEndDate: true, branchFacultyId: true, facultyId: true },
  }) : null;
  const actualCourseAmount = number(student.discontinuationActualCourseAmount ?? course?.actualFees ?? student.courseAmount);
  const registrationFee = number(student.discontinuationRegistrationFee ?? course?.registrationFees);
  const discount = Math.min(number(student.discontinuationDiscount ?? course?.discount), actualCourseAmount);
  const finalCourseFee = Math.max(number(student.discontinuationFinalCourseFee ?? (actualCourseAmount - discount)), 0);
  const gstAmount = Math.round((actualCourseAmount * 18) / 118);
  const totalHours = number(course?.hours);
  const dailyHours = batchHoursPerDay(student, batch);
  const workEntries = student.id && student.courseId ? await prisma.facultyTodayWorkEntry.findMany({
    where: {
      courseId: student.courseId,
      workDate: { lte: date },
      ...(student.batchId ? { batchId: student.batchId } : {}),
      studentEntries: { some: { branchStudentId: student.id } },
    },
    select: { workDate: true },
  }) : [];
  const presentAttendanceDates = (student.calendarAttendanceRecords || [])
    .filter((record) => String(record.status || "").toUpperCase() === "PRESENT")
    .map((record) => record.attendanceDate);
  const workDates = [...new Set([...workEntries.map((entry) => entry.workDate), ...presentAttendanceDates])];
  const [holidays, leaves, weekOffOverrides, affectedSessions] = await Promise.all([
    prisma.branchCalendarHoliday.findMany({
      where: { status: "ACTIVE", OR: [{ branchId: student.branchId }, { branchId: null }], holidayDate: { in: workDates } },
      select: { holidayDate: true },
    }),
    prisma.branchCalendarLeave.findMany({
      where: { branchId: student.branchId, status: "ACTIVE", leaveDate: { in: workDates } },
      select: { batchId: true, leaveDate: true, leaveStartTime: true, leaveEndTime: true, declaredAt: true },
    }),
    prisma.facultyWeekOffRequest.findMany({
      where: { branchId: student.branchId, status: "APPROVED", facultyId: { in: [batch?.branchFacultyId, batch?.facultyId].filter(Boolean) } },
      select: { requestedWeekStartDate: true, requestedWeekEndDate: true, requestedWeekOffDay: true },
    }),
    prisma.facultyLeaveAffectedSession.findMany({
      where: { branchId: student.branchId, batchId: student.batchId || undefined, courseId: student.courseId, sessionDate: { in: workDates }, resolutionStatus: { not: "UNRESOLVED" } },
      select: { sessionDate: true },
    }),
  ]);
  const holidayDates = new Set(holidays.map((item) => item.holidayDate));
  const cancelledDates = new Set(affectedSessions.map((item) => item.sessionDate));
  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const weekend = String(batch?.weekType || "").toUpperCase() === "WEEKEND" || /weekend/i.test(student.classSchedule || "");
  const weeklyOff = String(batch?.weeklyOffDay || student.weeklyOffDay || "").toUpperCase();
  const hasWeeklyOff = (date) => {
    const override = weekOffOverrides.find((item) => date >= item.requestedWeekStartDate && date <= item.requestedWeekEndDate);
    const day = override?.requestedWeekOffDay || weeklyOff;
    return dayNames[new Date(`${date}T00:00:00Z`).getUTCDay()] === String(day || "").toUpperCase();
  };
  const validWorkDates = workDates.filter((date) => {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    const eligible = weekend ? [0, 6].includes(day) : ![0, 6].includes(day) && !hasWeeklyOff(date);
    const inCoursePeriod = (!batch?.courseStartDate || date >= batch.courseStartDate) && (!batch?.courseEndDate || date <= batch.courseEndDate);
    const leave = leaves.find((item) => (!item.batchId || [student.batchId, batch?.batchId].includes(item.batchId)) && isAffected(item, date, batch));
    return eligible && inCoursePeriod && !holidayDates.has(date) && !cancelledDates.has(date) && !leave;
  });
  const conductedDays = validWorkDates.length;
  const conductedHours = totalHours > 0 ? Math.min(totalHours, conductedDays * dailyHours) : 0;
  const completedCourseAmount = totalHours > 0 ? Math.round((finalCourseFee * conductedHours) / totalHours) : 0;
  return { actualCourseAmount, registrationFee, discount, finalCourseFee, gstAmount, totalHours, dailyHours, conductedDays, conductedHours, completedCourseAmount };
}

async function calculateDiscontinuationFinance(student) {
  const enrollments = (Array.isArray(student.courseEnrollments) ? student.courseEnrollments : [])
    .filter((enrollment) => enrollment?.courseId && String(enrollment.status || "ACTIVE").toUpperCase() === "ACTIVE");
  if (enrollments.length <= 1) return calculateSingleCourseDiscontinuationFinance(student);

  const courseCalculations = await Promise.all(enrollments.map((enrollment) => calculateSingleCourseDiscontinuationFinance({
    ...student,
    courseId: enrollment.courseId,
    batchId: enrollment.batchId || student.batchId,
    courseAmount: enrollment.finalCourseAmount ?? enrollment.totalCourseAmount ?? student.courseAmount,
    courseMode: enrollment.mode || student.courseMode,
    classSchedule: enrollment.scheduleType || student.classSchedule,
    courseStartDate: enrollment.startDate || student.courseStartDate,
    courseEndDate: enrollment.endDate || student.courseEndDate,
    discontinuationActualCourseAmount: enrollment.totalCourseAmount ?? enrollment.course?.actualFees ?? student.courseAmount,
    discontinuationRegistrationFee: enrollment.course?.registrationFees,
    discontinuationDiscount: enrollment.discountAmount ?? enrollment.course?.discount,
    discontinuationFinalCourseFee: enrollment.finalCourseAmount ?? enrollment.course?.afterDiscount,
    calendarAttendanceRecords: (student.calendarAttendanceRecords || []).filter((record) => (
      String(record.courseId || "") === String(enrollment.courseId) ||
      (!record.courseId && String(enrollment.courseId) === String(student.courseId))
    )),
  })));
  const sum = (field) => courseCalculations.reduce((total, calculation) => total + number(calculation[field]), 0);
  const totalHours = sum("totalHours");
  const conductedHours = sum("conductedHours");
  return {
    actualCourseAmount: sum("actualCourseAmount"),
    registrationFee: sum("registrationFee"),
    discount: sum("discount"),
    finalCourseFee: sum("finalCourseFee"),
    gstAmount: sum("gstAmount"),
    totalHours,
    dailyHours: 0,
    conductedDays: sum("conductedDays"),
    conductedHours,
    completedCourseAmount: sum("completedCourseAmount"),
    courseCalculations,
  };
}

async function financialSnapshot(student, refundRequested = false) {
  const installmentTotal = (student.installments || []).reduce((sum, item) => sum + number(item.amount), 0);
  const installmentPaid = (student.installments || []).reduce((sum, item) => sum + number(item.amountPaid), 0);
  const paymentTotal = (student.payments || []).reduce((sum, item) => sum + number(item.amount), 0);
  const totalPaid = paymentTotal || installmentPaid;
  const calculation = await calculateDiscontinuationFinance(student);
  const totalPayable = calculation.gstAmount + calculation.registrationFee + calculation.completedCourseAmount;
  const courseProgress = calculation.totalHours > 0 ? Math.min(100, Math.round((calculation.conductedHours / calculation.totalHours) * 100)) : 0;
  const balanceDue = Math.max(totalPayable - totalPaid, 0);
  const refundCandidate = Math.max(totalPaid - totalPayable, 0);
  const refundEligibleAmount = refundRequested ? refundCandidate : 0;
  return {
    totalCourseFee: totalPayable,
    actualCourseAmount: calculation.actualCourseAmount,
    gstAmount: calculation.gstAmount,
    registrationFee: calculation.registrationFee,
    discountAmount: calculation.discount,
    finalCourseFee: calculation.finalCourseFee,
    totalCourseHours: calculation.totalHours,
    conductedDays: calculation.conductedDays,
    conductedHours: calculation.conductedHours,
    completedCourseAmount: calculation.completedCourseAmount,
    totalPaid,
    courseProgress,
    progressEarnedAmount: calculation.completedCourseAmount,
    balanceDue,
    refundRequested: Boolean(refundRequested),
    outstandingAmount: balanceDue,
    refundEligibleAmount,
    waiverAmount: 0,
    finalOutstandingAmount: balanceDue,
    settlementStatus: refundEligibleAmount > 0 ? "REFUND_PENDING" : balanceDue > 0 ? "SETTLEMENT_PENDING" : "SETTLED",
    financeNote: "",
  };
}

async function notifyBranchAdmin(request, student, branch) {
  const requestDescription = "DISCONTINUATION_REQUEST:" + request.id;
  await createNotification({
    kind: "STUDENT_DISCONTINUATION",
    tone: "red",
    title: "Student discontinuation request submitted",
    message: student.studentName + " submitted a discontinuation request for " + (student.courseName || "the assigned course") + ". Outstanding amount: \u20B9" + request.outstandingAmount + ".",
    actionLabel: "Review request",
    targetUserId: branch?.adminUserId || null,
    targetBranchId: branch?.id || request.branchId,
    targetBranchEmail: branch?.branchEmail || null,
    targetBranchName: branch?.branchName || null,
    requestDescription,
    requestTitle: "Student discontinuation request",
    requestStatus: request.status,
    createdBy: request.requestedByUserId || "SYSTEM",
  });
}

async function notifyBranchAdminAfterApproval(request, student, deactivationAt, finalOutstandingAmount) {
  const branch = await prisma.branch.findUnique({
    where: { id: request.branchId },
    select: {
      id: true,
      adminUserId: true,
      branchEmail: true,
      branchName: true,
    },
  });
  if (!branch?.adminUserId) return;

  const deactivationLabel = deactivationAt
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Calcutta" }).format(deactivationAt)
    : "within 2 hours";
  await createNotification({
    kind: "STUDENT_DISCONTINUATION",
    tone: "green",
    title: "Student discontinuation approved",
    message: student.studentName + "'s discontinuation request was approved by Super Admin. Student access will be disabled on " + deactivationLabel + ". Final outstanding amount: \u20B9" + finalOutstandingAmount + ".",
    actionLabel: "View discontinuation",
    targetUserId: branch.adminUserId,
    targetBranchId: branch.id,
    targetBranchEmail: branch.branchEmail || null,
    targetBranchName: branch.branchName || null,
    requestDescription: "DISCONTINUATION_REQUEST:" + request.id,
    requestTitle: "Discontinuation approved",
    requestStatus: "APPROVED",
    createdBy: request.superAdminReviewedBy || "SYSTEM",
  });
}

async function notifySuperAdmins(request, student, options = {}) {
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", active: true },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotification({
      kind: "STUDENT_DISCONTINUATION",
      tone: "amber",
      title: options.title || "Discontinuation request needs approval",
      message: options.message || (student.studentName + " has a discontinuation request ready for final approval. Outstanding amount: \u20B9" + request.finalOutstandingAmount + "."),
      actionLabel: "Review request",
      targetUserId: admin.id,
      requestDescription: "DISCONTINUATION_SUPER_REVIEW:" + request.id,
      requestTitle: "Student discontinuation approval",
      requestStatus: request.status,
      createdBy: request.branchReviewedBy || "SYSTEM",
    });
  }
}

async function notifyStudent(request, student, title, message, tone = "blue") {
  const target = await prisma.user.findFirst({
    where: { email: { equals: text(student.emailAddress), mode: "insensitive" }, role: "STUDENT" },
    select: { id: true },
  });
  if (!target) return;
  await createNotification({
    kind: "STUDENT_DISCONTINUATION",
    tone,
    title,
    message,
    actionLabel: "View request",
    targetUserId: target.id,
    requestDescription: "DISCONTINUATION_STUDENT:" + request.id + ":" + request.status,
    requestTitle: "Discontinuation request",
    requestStatus: request.status,
    createdBy: "SYSTEM",
  });
}

async function requestWhereForActor(requestId, actor) {
  const role = String(actor?.role || "").toUpperCase();
  const request = await prisma.studentDiscontinuationRequest.findUnique({
    where: { id: requestId },
    include: {
      branchStudent: {
        select: {
          branch: { select: { id: true, branchId: true, branchName: true } },
          id: true,
          studentId: true,
          studentName: true,
          mobileNumber: true,
          parentSpouseNumber: true,
          emailAddress: true,
          courseName: true,
          batchName: true,
          courseAmount: true,
          installments: { select: { amount: true, amountPaid: true } },
          recordStatus: true,
        },
      },
    },
  });
  if (!request) throw new AppError("Discontinuation request not found", 404);
  if (role === "BRANCH_ADMIN") {
    const branch = await branchForActor(actor);
    if (!branch?.id || request.branchId !== branch.id) throw new AppError("You do not have access to this request", 403);
  } else if (role === "STUDENT" && request.requestedByUserId !== actor.id) {
    throw new AppError("You do not have access to this request", 403);
  }
  return request;
}

export async function createDiscontinuationRequest(actor, payload = {}) {
  const student = await loadStudentForActor(null, actor);
  if (String(student.recordStatus).toUpperCase() !== "ACTIVE") {
    throw new AppError("This student account is not active", 409);
  }
  const reason = text(payload.reason);
  if (!reason) throw new AppError("Discontinuation reason is required", 400);

  const refundRequested = payload.refundRequested === true || String(payload.refundRequested || "").toLowerCase() === "true";
  const snapshot = await financialSnapshot(student, refundRequested);
  const existing = await prisma.studentDiscontinuationRequest.findFirst({
    where: { branchStudentId: student.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (existing && !["REJECTED", "CANCELLED"].includes(String(existing.status || "").toUpperCase())) {
    throw new AppError("A discontinuation request is already under review for this student", 409);
  }
  if (existing?.status === "REJECTED" && snapshot.outstandingAmount > 0) {
    throw new AppError("Please pay the current eligible amount before requesting discontinuation again", 409);
  }
  const request = await prisma.studentDiscontinuationRequest.create({
    data: {
      branchStudentId: student.id,
      branchId: student.branchId,
      requestedByUserId: actor.id,
      reason,
      details: text(payload.details) || null,
      ...snapshot,
    },
    include: {
      branchStudent: {
        select: {
          branch: { select: { id: true, branchId: true, branchName: true } },
          id: true,
          studentId: true,
          studentName: true,
          mobileNumber: true,
          parentSpouseNumber: true,
          emailAddress: true,
          courseName: true,
          batchName: true,
          recordStatus: true,
        },
      },
    },
  });
  const branch = await prisma.branch.findUnique({
    where: { id: student.branchId },
    select: { id: true, branchName: true, branchEmail: true, adminUserId: true },
  });
  await notifyBranchAdmin(request, student, branch);
  return normalizeRequest(request);
}

export async function getDiscontinuationFinancePreview(actor) {
  const student = await loadStudentForActor(null, actor);
  const snapshot = await financialSnapshot(student, false);
  return {
    outstandingAmount: snapshot.outstandingAmount,
    refundEligibleAmount: snapshot.refundEligibleAmount,
  };
}

async function normalizeRequestWithCurrentFinance(row, actor) {
  const normalized = normalizeRequest(row)
  if (!normalized || ["APPROVED", "CANCELLED"].includes(String(row.status || "").toUpperCase())) {
    return normalized
  }

  try {
    const student = await loadStudentForActor(row.branchStudentId, actor)
    const snapshot = await financialSnapshot(student, Boolean(row.refundRequested))
    return { ...normalized, financialSnapshot: { ...normalized.financialSnapshot, ...snapshot } }
  } catch {
    return normalized
  }
}

export async function listDiscontinuationRequests(actor, query = {}) {
  const role = String(actor?.role || "").toUpperCase();
  if (!REVIEW_ROLES.has(role) && role !== "STUDENT") throw new AppError("Only authorized users can view discontinuation requests", 403);
  const where = {};
  if (role === "BRANCH_ADMIN") {
    const branch = await branchForActor(actor);
    if (!branch?.id) throw new AppError("Branch profile not found", 404);
    where.branchId = branch.id;
    if (!text(query.status)) where.status = { not: "CANCELLED" };
  } else if (role === "STUDENT") {
    where.requestedByUserId = actor.id;
  }
  const status = text(query.status).toUpperCase();
  if (status) {
    if (!["PENDING", "SUPER_ADMIN_REVIEW", "SUPER_ADMIN_WAIT", "APPROVED", "REJECTED", "CANCELLED", "CONTACTED_CONTINUE", "LEAVE_REQUESTED", "UNABLE_TO_CONTACT"].includes(status)) {
      throw new AppError("Invalid discontinuation request status", 400);
    }
    where.status = status;
  }
  const rows = await prisma.studentDiscontinuationRequest.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      branchStudent: {
        select: {
          branch: { select: { id: true, branchId: true, branchName: true } },
          id: true,
          studentId: true,
          studentName: true,
          mobileNumber: true,
          parentSpouseNumber: true,
          emailAddress: true,
          courseName: true,
          batchName: true,
          courseAmount: true,
          installments: { select: { amount: true, amountPaid: true } },
          recordStatus: true,
          motivationMailHistory: {
            select: { stage: true, status: true, sentAt: true },
            orderBy: { sentAt: "asc" },
          },
        },
      },
    },
  });
  const branchIds = [...new Set(rows.map((row) => row.branchId).filter(Boolean))]
  const branches = branchIds.length
    ? await prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, branchId: true, branchName: true },
      })
    : []
  const branchById = new Map(branches.map((branch) => [branch.id, branch]))
  const normalizedRows = await Promise.all(rows.map(async (row) => {
    const normalized = await normalizeRequestWithCurrentFinance(row, actor)
    const branch = branchById.get(row.branchId)
    return {
      ...normalized,
      branchName: branch?.branchName || normalized?.branchName || '',
      branchCode: branch?.branchId || normalized?.branchCode || '',
    }
  }))
  return normalizedRows;
}

export async function getDiscontinuationRequest(requestId, actor) {
  const request = await requestWhereForActor(requestId, actor)
  return normalizeRequestWithCurrentFinance(request, actor)
}

export async function reviewDiscontinuationByBranch(requestId, actor, payload = {}) {
  const request = await requestWhereForActor(requestId, actor);
  if (String(actor.role).toUpperCase() !== "BRANCH_ADMIN") throw new AppError("Only Branch Admin can review this request", 403);
  if (!["PENDING", "UNABLE_TO_CONTACT", "SUPER_ADMIN_WAIT"].includes(request.status)) throw new AppError("This request is no longer waiting for Branch Admin review", 409);
  const decision = text(payload.decision).toUpperCase();
  if (!["FORWARD", "REJECT", "DISCONTINUE", "CONTINUE", "LEAVE", "UNABLE_TO_CONTACT"].includes(decision)) {
    throw new AppError("Select a valid contact outcome", 400);
  }
  const note = text(payload.note);
  const nextFollowUpDate = text(payload.nextFollowUpDate);
  if (decision === "UNABLE_TO_CONTACT" && !nextFollowUpDate) {
    throw new AppError("Next follow-up date is required when the student cannot be reached", 400);
  }
  if (decision === "UNABLE_TO_CONTACT" && !isFutureDate(nextFollowUpDate)) {
    throw new AppError("Next follow-up date must be tomorrow or later", 400);
  }

  const branchStudent = await loadStudentForActor(request.branchStudentId, actor);
  const snapshot = await financialSnapshot(branchStudent, Boolean(request.refundRequested));
  const overdueInstallments = getOverdueInstallments(branchStudent);
  const contactAttemptCount = Number(request.contactAttemptCount || 0) + 1;
  const shouldEscalateOverdue = decision === "UNABLE_TO_CONTACT"
    && contactAttemptCount >= 2
    && overdueInstallments.length > 0;
  const nextStatus = shouldEscalateOverdue
    ? "SUPER_ADMIN_REVIEW"
    : ["FORWARD", "DISCONTINUE"].includes(decision)
      ? "SUPER_ADMIN_REVIEW"
      : decision === "REJECT"
        ? "REJECTED"
        : decision === "CONTINUE"
          ? "CONTACTED_CONTINUE"
          : decision === "LEAVE"
            ? "LEAVE_REQUESTED"
            : "UNABLE_TO_CONTACT";

  if (["FORWARD", "DISCONTINUE"].includes(decision) && snapshot.outstandingAmount > 0) {
    throw new AppError(
      "Discontinuation cannot proceed until the eligible amount of " + "\u20B9" + snapshot.outstandingAmount + " is paid.",
      409,
    );
  }
  const paymentRequiredNote = "Please pay the eligible amount of " + "\u20B9" + snapshot.outstandingAmount + " before discontinuation can proceed.";
  const resolvedNote = decision === "REJECT" && snapshot.outstandingAmount > 0 ? paymentRequiredNote : note;
  if (decision === "REJECT" && !resolvedNote) throw new AppError("Rejection note is required", 400);
  const contactOutcome = decision === "FORWARD" ? "DISCONTINUE" : decision;
  const updated = await prisma.studentDiscontinuationRequest.update({
    where: { id: request.id },
    data: {
      status: nextStatus,
      branchReviewedBy: actor.id,
      branchReviewedAt: new Date(),
      branchReviewNote: resolvedNote || null,
      contactOutcome,
      contactNotes: resolvedNote || note || null,
      contactedBy: actor.id,
      contactedAt: new Date(),
      nextFollowUpDate: nextFollowUpDate || null,
      contactAttemptCount,
      installmentOverdueCount: overdueInstallments.length,
      nextInstallmentDueDate: overdueInstallments[0]?.dueDate || null,
      contactHistory: appendContactHistory(request, {
        outcome: decision,
        note: resolvedNote || note || "",
        followUpDate: nextFollowUpDate || null,
        overdueInstallmentCount: overdueInstallments.length,
        overdueInstallmentDueDate: overdueInstallments[0]?.dueDate || null,
      }),
      escalationReason: shouldEscalateOverdue
        ? "Student could not be reached after repeated calls and an installment is overdue. Course continuation could not be confirmed."
        : null,
      totalCourseFee: snapshot.totalCourseFee,
      actualCourseAmount: snapshot.actualCourseAmount,
      gstAmount: snapshot.gstAmount,
      registrationFee: snapshot.registrationFee,
      discountAmount: snapshot.discountAmount,
      finalCourseFee: snapshot.finalCourseFee,
      totalCourseHours: snapshot.totalCourseHours,
      conductedDays: snapshot.conductedDays,
      conductedHours: snapshot.conductedHours,
      completedCourseAmount: snapshot.completedCourseAmount,
      courseProgress: snapshot.courseProgress,
      progressEarnedAmount: snapshot.progressEarnedAmount,
      balanceDue: snapshot.balanceDue,
      totalPaid: snapshot.totalPaid,
      outstandingAmount: snapshot.outstandingAmount,
      refundEligibleAmount: snapshot.refundEligibleAmount,
      waiverAmount: 0,
      finalOutstandingAmount: snapshot.finalOutstandingAmount,
      settlementStatus: snapshot.settlementStatus,
      financeNote: null,
    },
    include: { branchStudent: { select: { branch: { select: { id: true, branchId: true, branchName: true } },
          id: true, studentId: true, studentName: true, mobileNumber: true,
      parentSpouseNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
  });
  await prisma.notification.updateMany({
    where: { kind: "STUDENT_DISCONTINUATION", requestDescription: "DISCONTINUATION_REQUEST:" + request.id },
    data: { requestStatus: nextStatus, read: true, readAt: new Date() },
  });

  if (shouldEscalateOverdue) {
    await notifySuperAdmins(updated, updated.branchStudent, {
      title: "Installment overdue - discontinuation review required",
      message: `${updated.branchStudent.studentName} could not be reached after repeated calls and the installment due on ${overdueInstallments[0]?.dueDate} is overdue. Please decide whether to approve, wait, or reject discontinuation.`,
    });
  } else if (["FORWARD", "DISCONTINUE"].includes(decision)) {
    await notifySuperAdmins(updated, updated.branchStudent);
  } else if (decision === "CONTINUE") {
    await notifyStudent(updated, updated.branchStudent, "Course continuation confirmed", "Your Branch Admin recorded that you will continue the course. Keep going with your learning, and contact the branch whenever you need support.", "green");
  } else if (decision === "LEAVE") {
    await notifyStudent(updated, updated.branchStudent, "Leave request noted", "Your Branch Admin recorded your leave request. The branch will contact you with the next steps.", "amber");
  } else if (decision === "UNABLE_TO_CONTACT") {
    await notifyStudent(updated, updated.branchStudent, "Follow-up scheduled", "The branch could not reach you. A follow-up call is scheduled for " + nextFollowUpDate + ". Please contact your branch if you are available sooner.", "amber");
  } else {
    await notifyStudent(updated, updated.branchStudent, "Discontinuation request rejected", "Your discontinuation request was not accepted by the Branch Admin. Reason: " + resolvedNote + ". Please contact your branch after the eligible amount is paid.", "red");
  }
  return normalizeRequest(updated);
}
export async function reviewMotivationFollowUpByBranch(studentId, actor, payload = {}) {
  if (String(actor?.role || '').toUpperCase() !== 'BRANCH_ADMIN') {
    throw new AppError('Only Branch Admin can record a motivation follow-up outcome', 403);
  }
  const student = await loadStudentForActor(studentId, actor);
  if (String(student.recordStatus).toUpperCase() !== 'ACTIVE') {
    throw new AppError('This student account is not active', 409);
  }
  const finalMotivationMail = await prisma.motivationMailHistory.findFirst({
    where: { branchStudentId: student.id, stage: 'MOTIVATION_MAIL_3', status: 'SENT' },
    select: { id: true },
  });
  if (!finalMotivationMail) throw new AppError('Contact outcome is available after the third motivation email is sent', 409);

  const decision = text(payload.decision).toUpperCase();
  if (!['DISCONTINUE', 'CONTINUE', 'UNABLE_TO_CONTACT'].includes(decision)) {
    throw new AppError('Select a valid contact outcome', 400);
  }
  const note = text(payload.note);
  const nextFollowUpDate = text(payload.nextFollowUpDate);
  if (['UNABLE_TO_CONTACT', 'CONTINUE'].includes(decision) && !nextFollowUpDate) {
    throw new AppError(decision === 'CONTINUE' ? 'Continue date is required when the student will continue' : 'Next follow-up date is required when the student cannot be reached', 400);
  }
  if (['UNABLE_TO_CONTACT', 'CONTINUE'].includes(decision) && !isFutureDate(nextFollowUpDate)) {
    throw new AppError(decision === 'CONTINUE' ? 'Continue date must be tomorrow or later' : 'Next follow-up date must be tomorrow or later', 400);
  }
  if (decision === 'DISCONTINUE' && !note) throw new AppError('Call notes are required when the student wants to discontinue', 400);

  const snapshot = await financialSnapshot(student, false);
  const existing = await prisma.studentDiscontinuationRequest.findFirst({
    where: { branchStudentId: student.id, status: { in: ACTIVE_REQUEST_STATUSES } },
    orderBy: { createdAt: 'desc' },
  });
  const request = existing || await prisma.studentDiscontinuationRequest.create({
    data: {
      branchStudentId: student.id,
      branchId: student.branchId,
      reason: 'Long absence follow-up after motivation email',
      details: note || null,
      ...snapshot,
    },
    include: { branchStudent: { select: { branch: { select: { id: true, branchId: true, branchName: true } },
          id: true, studentId: true, studentName: true, mobileNumber: true,
      parentSpouseNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
  });
  const overdueInstallments = getOverdueInstallments(student);
  const contactAttemptCount = Number(request.contactAttemptCount || 0) + 1;
  const shouldEscalateOverdue = decision === 'UNABLE_TO_CONTACT'
    && contactAttemptCount >= 2
    && overdueInstallments.length > 0;
  const nextStatus = shouldEscalateOverdue
    ? 'SUPER_ADMIN_REVIEW'
    : decision === 'DISCONTINUE'
      ? 'SUPER_ADMIN_REVIEW'
      : decision === 'CONTINUE'
        ? 'CONTACTED_CONTINUE'
        : 'UNABLE_TO_CONTACT';
  const updated = await prisma.studentDiscontinuationRequest.update({
    where: { id: request.id },
    data: {
      status: nextStatus,
      contactOutcome: decision,
      contactNotes: note || null,
      contactedBy: actor.id,
      contactedAt: new Date(),
      branchReviewedBy: actor.id,
      branchReviewedAt: new Date(),
      branchReviewNote: note || null,
      nextFollowUpDate: nextFollowUpDate || null,
      contactAttemptCount,
      installmentOverdueCount: overdueInstallments.length,
      nextInstallmentDueDate: overdueInstallments[0]?.dueDate || null,
      contactHistory: appendContactHistory(request, {
        outcome: decision,
        note,
        followUpDate: nextFollowUpDate || null,
        overdueInstallmentCount: overdueInstallments.length,
        overdueInstallmentDueDate: overdueInstallments[0]?.dueDate || null,
      }),
      escalationReason: shouldEscalateOverdue
        ? 'Student could not be reached after repeated calls and an installment is overdue. Course continuation could not be confirmed.'
        : null,
      totalCourseFee: snapshot.totalCourseFee,
      actualCourseAmount: snapshot.actualCourseAmount,
      gstAmount: snapshot.gstAmount,
      registrationFee: snapshot.registrationFee,
      discountAmount: snapshot.discountAmount,
      finalCourseFee: snapshot.finalCourseFee,
      totalCourseHours: snapshot.totalCourseHours,
      conductedDays: snapshot.conductedDays,
      conductedHours: snapshot.conductedHours,
      completedCourseAmount: snapshot.completedCourseAmount,
      courseProgress: snapshot.courseProgress,
      progressEarnedAmount: snapshot.progressEarnedAmount,
      balanceDue: snapshot.balanceDue,
      totalPaid: snapshot.totalPaid,
      outstandingAmount: snapshot.outstandingAmount,
      refundEligibleAmount: snapshot.refundEligibleAmount,
      waiverAmount: 0,
      finalOutstandingAmount: snapshot.finalOutstandingAmount,
      settlementStatus: snapshot.settlementStatus,
      financeNote: null,
    },
    include: { branchStudent: { select: { branch: { select: { id: true, branchId: true, branchName: true } },
          id: true, studentId: true, studentName: true, mobileNumber: true,
      parentSpouseNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
  });
  const motivationDescription = text(payload.motivationDescription);
  if (motivationDescription) {
    await prisma.notification.updateMany({
      where: { kind: 'STUDENT_MOTIVATION', requestDescription: motivationDescription },
      data: { requestStatus: nextStatus, read: true, readAt: new Date() },
    });
  }
  if (shouldEscalateOverdue) {
    await notifySuperAdmins(updated, updated.branchStudent, {
      title: 'Installment overdue - discontinuation review required',
      message: `${updated.branchStudent.studentName} could not be reached after repeated calls and the installment due on ${overdueInstallments[0]?.dueDate} is overdue. Please decide whether to approve, wait, or reject discontinuation.`,
    });
  } else if (decision === 'DISCONTINUE') {
    await notifySuperAdmins(updated, updated.branchStudent);
  } else if (decision === 'CONTINUE') {
    await notifyStudent(updated, updated.branchStudent, 'Course continuation recorded', 'Your Branch Admin recorded that you plan to continue the course after the long-absence follow-up.', 'green');
  } else {
    await notifyStudent(updated, updated.branchStudent, 'Follow-up scheduled', 'The branch could not reach you. A follow-up call is scheduled for ' + nextFollowUpDate + '.', 'amber');
  }
  return normalizeRequest(updated);
}

async function notifyBranchAdminAfterSuperDecision(request, student, decision, note, waitUntil = null) {
  const branch = await prisma.branch.findUnique({
    where: { id: request.branchId },
    select: { id: true, adminUserId: true, branchEmail: true, branchName: true },
  });
  if (!branch?.adminUserId) return;
  const title = decision === 'WAIT'
    ? 'Super Admin requested another follow-up'
    : decision === 'REJECT'
      ? 'Discontinuation request rejected by Super Admin'
      : 'Discontinuation request approved by Super Admin';
  const message = decision === 'WAIT'
    ? `Super Admin asked Branch Admin to contact ${student.studentName} again after the installment due date ${waitUntil}.`
    : decision === 'REJECT'
      ? `Super Admin rejected ${student.studentName}'s discontinuation request. Reason: ${note || 'No reason provided.'}`
      : `${student.studentName}'s discontinuation request was approved by Super Admin.`;
  await createNotification({
    kind: 'STUDENT_DISCONTINUATION',
    tone: decision === 'REJECT' ? 'red' : decision === 'WAIT' ? 'amber' : 'green',
    title,
    message,
    actionLabel: 'Open Discontinuation',
    targetUserId: branch.adminUserId,
    targetBranchId: branch.id,
    targetBranchEmail: branch.branchEmail || null,
    targetBranchName: branch.branchName || null,
    requestDescription: 'DISCONTINUATION_SUPER_DECISION:' + request.id,
    requestTitle: title,
    requestStatus: decision === 'WAIT' ? 'SUPER_ADMIN_WAIT' : decision === 'REJECT' ? 'REJECTED' : 'APPROVED',
    createdBy: request.superAdminReviewedBy || 'SYSTEM',
  });
}
export async function reviewDiscontinuationBySuperAdmin(requestId, actor, payload = {}) {
  const request = await requestWhereForActor(requestId, actor);
  if (!SUPER_ADMIN_ROLES.has(String(actor.role).toUpperCase())) throw new AppError("Only Super Admin can complete this approval", 403);
  if (request.status !== "SUPER_ADMIN_REVIEW") throw new AppError("This request is not ready for final approval", 409);
  const decision = text(payload.decision).toUpperCase();
  if (!["APPROVE", "WAIT", "REJECT"].includes(decision)) throw new AppError("Select Approve, Wait, or Reject", 400);
  const note = text(payload.note);
  const waitUntil = text(payload.waitUntil || payload.nextFollowUpDate);
  if (decision === "WAIT" && String(request.contactOutcome || "").toUpperCase() !== "UNABLE_TO_CONTACT" && !request.escalationReason) throw new AppError("Wait is available only for Unable to Contact follow-ups", 400);
  if (decision === "WAIT" && !waitUntil) throw new AppError("Next installment due date is required when waiting", 400);
  if (decision === "WAIT" && !isFutureDate(waitUntil)) throw new AppError("Wait date must be tomorrow or later", 400);
  if (decision === "WAIT") {
    const waiting = await prisma.studentDiscontinuationRequest.update({
      where: { id: request.id },
      data: {
        status: "SUPER_ADMIN_WAIT",
        superAdminReviewedBy: actor.id,
        superAdminReviewedAt: new Date(),
        superAdminReviewNote: note || "Waiting for the next installment due date and another student contact attempt.",
        nextFollowUpDate: waitUntil,
        nextInstallmentDueDate: waitUntil,
      },
      include: { branchStudent: { select: { branch: { select: { id: true, branchId: true, branchName: true } },
          id: true, studentId: true, studentName: true, mobileNumber: true,
        parentSpouseNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
    });
    await prisma.notification.updateMany({
      where: { kind: "STUDENT_DISCONTINUATION", requestDescription: "DISCONTINUATION_SUPER_REVIEW:" + request.id },
      data: { requestStatus: "SUPER_ADMIN_WAIT", read: true, readAt: new Date() },
    });
    await notifyBranchAdminAfterSuperDecision(waiting, waiting.branchStudent, "WAIT", note, waitUntil);
    return normalizeRequest(waiting);
  }

  if (decision === "REJECT" && !note) throw new AppError("Rejection reason is required", 400);
  if (decision === "REJECT") {
    const rejected = await prisma.studentDiscontinuationRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        superAdminReviewedBy: actor.id,
        superAdminReviewedAt: new Date(),
        superAdminReviewNote: note,
      },
      include: { branchStudent: { select: { branch: { select: { id: true, branchId: true, branchName: true } },
          id: true, studentId: true, studentName: true, mobileNumber: true,
          parentSpouseNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
    });
    await prisma.notification.updateMany({
      where: {
        kind: "STUDENT_DISCONTINUATION",
        requestDescription: "DISCONTINUATION_SUPER_REVIEW:" + request.id,
      },
      data: { requestStatus: "REJECTED", read: true, readAt: new Date() },
    });
    await notifyBranchAdminAfterSuperDecision(rejected, rejected.branchStudent, "REJECT", note);
    await notifyStudent(rejected, rejected.branchStudent, "Discontinuation request rejected", "Your discontinuation request was rejected by Super Admin. Please contact your branch for details. Reason: " + note, "red");
    return normalizeRequest(rejected);
  }

  const installments = Array.isArray(request.branchStudent?.installments) ? request.branchStudent.installments : [];
  const totalCourseFee = installments.length
    ? installments.reduce((sum, installment) => sum + number(installment.amount), 0)
    : number(request.branchStudent?.courseAmount);
  const totalPaid = installments.reduce((sum, installment) => sum + number(installment.amountPaid), 0);
  const fullOutstandingAmount = totalCourseFee > 0
    ? Math.max(totalCourseFee - totalPaid, 0)
    : number(request.outstandingAmount);
  const waiverAmount = Math.min(number(request.waiverAmount), fullOutstandingAmount);
  const refundEligibleAmount = number(request.refundEligibleAmount);
  const finalOutstandingAmount = Math.max(fullOutstandingAmount - waiverAmount, 0);
  const settlementStatus = finalOutstandingAmount > 0
    ? "SETTLEMENT_PENDING"
    : refundEligibleAmount > 0
      ? "REFUND_PENDING"
      : "SETTLED";
  const approved = await prisma.$transaction(async (tx) => {
    const saved = await tx.studentDiscontinuationRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        superAdminReviewedBy: actor.id,
        superAdminReviewedAt: new Date(),
        superAdminReviewNote: note || null,
        waiverAmount,
        refundEligibleAmount,
        finalOutstandingAmount,
        settlementStatus,
        financeNote: request.financeNote || null,
        accessDeactivationAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      include: { branchStudent: { select: { branch: { select: { id: true, branchId: true, branchName: true } },
          id: true, studentId: true, studentName: true, mobileNumber: true,
          parentSpouseNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
    });
    return saved;
  });
  await prisma.notification.updateMany({
    where: {
      kind: "STUDENT_DISCONTINUATION",
      requestDescription: "DISCONTINUATION_SUPER_REVIEW:" + request.id,
    },
    data: { requestStatus: "APPROVED", read: true, readAt: new Date() },
  });
  const deactivationAt = approved.accessDeactivationAt;
  const deactivationLabel = deactivationAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Calcutta" }).format(deactivationAt) : "within 2 hours";
  const approvalMessage = "Your discontinuation request has been approved. You can continue using your student account for 2 hours. Access will be disabled on " + deactivationLabel + ". Final outstanding amount: \u20B9" + finalOutstandingAmount + ".";
  await notifyBranchAdminAfterApproval(approved, approved.branchStudent, deactivationAt, finalOutstandingAmount);
  await notifyStudent(approved, approved.branchStudent, "Discontinuation approved - 2 hour access window", approvalMessage, "green");
  void sendStudentDiscontinuationApprovalEmail({
    to: approved.branchStudent.emailAddress,
    fullName: approved.branchStudent.studentName,
    courseName: approved.branchStudent.courseName,
    batchName: approved.branchStudent.batchName,
    deactivationAt,
    finalOutstandingAmount,
  }).catch((error) => console.warn("Discontinuation approval email failed", error?.message || error));
  return normalizeRequest(approved);
}
