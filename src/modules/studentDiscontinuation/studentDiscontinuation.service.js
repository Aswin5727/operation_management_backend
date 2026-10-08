import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import { sendStudentDiscontinuationApprovalEmail } from "../../common/services/resendEmail.js";

const REVIEW_ROLES = new Set(["BRANCH_ADMIN", "SUPER_ADMIN"]);
const SUPER_ADMIN_ROLES = new Set(["SUPER_ADMIN"]);
const ACTIVE_REQUEST_STATUSES = ["PENDING", "SUPER_ADMIN_REVIEW"];

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
    student: student
      ? {
          id: student.id,
          studentId: student.studentId,
          studentName: student.studentName,
          mobileNumber: student.mobileNumber || "",
          emailAddress: student.emailAddress,
          courseName: student.courseName || "",
          batchName: student.batchName || "",
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
    },
  });
  if (!student) throw new AppError("Branch student not found", 404);
  return student;
}

function financialSnapshot(student, refundRequested = false) {
  const installmentTotal = (student.installments || []).reduce((sum, item) => sum + number(item.amount), 0);
  const installmentPaid = (student.installments || []).reduce((sum, item) => sum + number(item.amountPaid), 0);
  const paymentTotal = (student.payments || []).reduce((sum, item) => sum + number(item.amount), 0);
  const totalCourseFee = installmentTotal || number(student.courseAmount);
  const totalPaid = paymentTotal || installmentPaid;
  const courseProgress = Math.min(Math.max(number(student.courseProgress), 0), 100);
  const progressEarnedAmount = Math.round(totalCourseFee * (courseProgress / 100));
  const balanceDue = Math.max(totalCourseFee - totalPaid, 0);
  const refundCandidate = Math.max(totalPaid - progressEarnedAmount, 0);
  const refundEligibleAmount = refundRequested ? refundCandidate : 0;
  return {
    totalCourseFee,
    totalPaid,
    courseProgress,
    progressEarnedAmount,
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
    message: student.studentName + " submitted a discontinuation request for " + (student.courseName || "the assigned course") + ". Outstanding amount: â‚¹" + request.outstandingAmount + ".",
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
    message: student.studentName + "'s discontinuation request was approved by Super Admin. Student access will be disabled on " + deactivationLabel + ". Final outstanding amount: â‚¹" + finalOutstandingAmount + ".",
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

async function notifySuperAdmins(request, student) {
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", active: true },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotification({
      kind: "STUDENT_DISCONTINUATION",
      tone: "amber",
      title: "Discontinuation request needs approval",
      message: student.studentName + " has a discontinuation request ready for final approval. Outstanding amount: â‚¹" + request.finalOutstandingAmount + ".",
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
          id: true,
          studentId: true,
          studentName: true,
          mobileNumber: true,
          emailAddress: true,
          courseName: true,
          batchName: true,
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

  const existing = await prisma.studentDiscontinuationRequest.findFirst({
    where: { branchStudentId: student.id, status: { in: ACTIVE_REQUEST_STATUSES } },
    select: { id: true },
  });
  if (existing) throw new AppError("A discontinuation request is already under review", 409);

  const refundRequested = payload.refundRequested === true || String(payload.refundRequested || "").toLowerCase() === "true";
  const snapshot = financialSnapshot(student, refundRequested);
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
          id: true,
          studentId: true,
          studentName: true,
          mobileNumber: true,
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
    if (!["PENDING", "SUPER_ADMIN_REVIEW", "APPROVED", "REJECTED", "CANCELLED", "CONTACTED_CONTINUE", "LEAVE_REQUESTED", "UNABLE_TO_CONTACT"].includes(status)) {
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
          id: true,
          studentId: true,
          studentName: true,
          mobileNumber: true,
          emailAddress: true,
          courseName: true,
          batchName: true,
          recordStatus: true,
          motivationMailHistory: {
            select: { stage: true, status: true, sentAt: true },
            orderBy: { sentAt: "asc" },
          },
        },
      },
    },
  });
  return rows.map(normalizeRequest);
}

export async function getDiscontinuationRequest(requestId, actor) {
  return normalizeRequest(await requestWhereForActor(requestId, actor));
}

export async function reviewDiscontinuationByBranch(requestId, actor, payload = {}) {
  const request = await requestWhereForActor(requestId, actor);
  if (String(actor.role).toUpperCase() !== "BRANCH_ADMIN") throw new AppError("Only Branch Admin can review this request", 403);
  if (!['PENDING', 'UNABLE_TO_CONTACT'].includes(request.status)) throw new AppError("This request is no longer waiting for Branch Admin review", 409);
  const decision = text(payload.decision).toUpperCase();
  if (!["FORWARD", "REJECT", "DISCONTINUE", "CONTINUE", "LEAVE", "UNABLE_TO_CONTACT"].includes(decision)) {
    throw new AppError("Select a valid contact outcome", 400);
  }
  const note = text(payload.note);
  if (decision === "REJECT" && !note) throw new AppError("Rejection note is required", 400);

  const nextFollowUpDate = text(payload.nextFollowUpDate);
  if (decision === "UNABLE_TO_CONTACT" && !nextFollowUpDate) {
    throw new AppError("Next follow-up date is required when the student cannot be reached", 400);
  }
  if (decision === "UNABLE_TO_CONTACT" && !isFutureDate(nextFollowUpDate)) {
    throw new AppError("Next follow-up date must be tomorrow or later", 400);
  }

  const nextStatus = ["FORWARD", "DISCONTINUE"].includes(decision)
    ? "SUPER_ADMIN_REVIEW"
    : decision === "REJECT"
      ? "REJECTED"
      : decision === "CONTINUE"
        ? "CONTACTED_CONTINUE"
        : decision === "LEAVE"
          ? "LEAVE_REQUESTED"
          : "UNABLE_TO_CONTACT";
  const branchStudent = await loadStudentForActor(request.branchStudentId, actor);
  const snapshot = financialSnapshot(branchStudent, Boolean(request.refundRequested));
  const contactOutcome = decision === "FORWARD" ? "DISCONTINUE" : decision;
  const updated = await prisma.studentDiscontinuationRequest.update({
    where: { id: request.id },
    data: {
      status: nextStatus,
      branchReviewedBy: actor.id,
      branchReviewedAt: new Date(),
      branchReviewNote: note || null,
      contactOutcome,
      contactNotes: note || null,
      contactedBy: actor.id,
      contactedAt: new Date(),
      nextFollowUpDate: nextFollowUpDate || null,
      totalCourseFee: snapshot.totalCourseFee,
      totalPaid: snapshot.totalPaid,
      outstandingAmount: snapshot.outstandingAmount,
      refundEligibleAmount: snapshot.refundEligibleAmount,
      waiverAmount: 0,
      finalOutstandingAmount: snapshot.finalOutstandingAmount,
      settlementStatus: snapshot.settlementStatus,
      financeNote: null,
    },
    include: { branchStudent: { select: { id: true, studentId: true, studentName: true, mobileNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
  });
  await prisma.notification.updateMany({
    where: {
      kind: "STUDENT_DISCONTINUATION",
      requestDescription: "DISCONTINUATION_REQUEST:" + request.id,
    },
    data: { requestStatus: nextStatus, read: true, readAt: new Date() },
  });
  if (["FORWARD", "DISCONTINUE"].includes(decision)) {
    await notifySuperAdmins(updated, updated.branchStudent);
  } else if (decision === "CONTINUE") {
    await notifyStudent(updated, updated.branchStudent, "Course continuation confirmed", "Your Branch Admin recorded that you will continue the course. Keep going with your learning, and contact the branch whenever you need support.", "green");
  } else if (decision === "LEAVE") {
    await notifyStudent(updated, updated.branchStudent, "Leave request noted", "Your Branch Admin recorded your leave request. The branch will contact you with the next steps.", "amber");
  } else if (decision === "UNABLE_TO_CONTACT") {
    await notifyStudent(updated, updated.branchStudent, "Follow-up scheduled", "The branch could not reach you. A follow-up call is scheduled for " + nextFollowUpDate + ". Please contact your branch if you are available sooner.", "amber");
  } else {
    await notifyStudent(updated, updated.branchStudent, "Discontinuation request rejected", "Your discontinuation request was not accepted by the Branch Admin. Reason: " + note + ". Please contact your branch if you need clarification.", "red");
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
    where: {
      branchStudentId: student.id,
      stage: 'MOTIVATION_MAIL_3',
      status: 'SENT',
    },
    select: { id: true },
  });
  if (!finalMotivationMail) {
    throw new AppError('Contact outcome is available after the third motivation email is sent', 409);
  }
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
  if (decision === 'DISCONTINUE' && !note) {
    throw new AppError('Call notes are required when the student wants to discontinue', 400);
  }

  const snapshot = financialSnapshot(student, false);
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
    include: {
      branchStudent: {
        select: { id: true, studentId: true, studentName: true, mobileNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true },
      },
    },
  });

  const nextStatus = decision === 'DISCONTINUE'
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
      totalCourseFee: snapshot.totalCourseFee,
      totalPaid: snapshot.totalPaid,
      outstandingAmount: snapshot.outstandingAmount,
      refundEligibleAmount: snapshot.refundEligibleAmount,
      waiverAmount: 0,
      finalOutstandingAmount: snapshot.finalOutstandingAmount,
      settlementStatus: snapshot.settlementStatus,
      financeNote: null,
    },
    include: {
      branchStudent: {
        select: { id: true, studentId: true, studentName: true, mobileNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true },
      },
    },
  });

  const motivationDescription = text(payload.motivationDescription);
  if (motivationDescription) {
    await prisma.notification.updateMany({
      where: { kind: 'STUDENT_MOTIVATION', requestDescription: motivationDescription },
      data: { requestStatus: nextStatus, read: true, readAt: new Date() },
    });
  }

  if (decision === 'DISCONTINUE') {
    await notifySuperAdmins(updated, updated.branchStudent);
  } else if (decision === 'CONTINUE') {
    await notifyStudent(updated, updated.branchStudent, 'Course continuation recorded', 'Your Branch Admin recorded that you plan to continue the course after the long-absence follow-up.', 'green');
  } else if (decision === 'LEAVE') {
    await notifyStudent(updated, updated.branchStudent, 'Leave request noted', 'Your Branch Admin recorded your leave request after the long-absence follow-up.', 'amber');
  } else {
    await notifyStudent(updated, updated.branchStudent, 'Follow-up scheduled', 'The branch could not reach you and has recorded a follow-up. Please contact your branch as soon as possible.', 'amber');
  }

  return normalizeRequest(updated);
}

export async function reviewDiscontinuationBySuperAdmin(requestId, actor, payload = {}) {
  const request = await requestWhereForActor(requestId, actor);
  if (!SUPER_ADMIN_ROLES.has(String(actor.role).toUpperCase())) throw new AppError("Only Super Admin can complete this approval", 403);
  if (request.status !== "SUPER_ADMIN_REVIEW") throw new AppError("This request is not ready for final approval", 409);
  const decision = text(payload.decision).toUpperCase();
  if (!["APPROVE", "REJECT"].includes(decision)) throw new AppError("Select Approve or Reject", 400);
  const note = text(payload.note);
  if (decision === "REJECT" && !note) throw new AppError("Rejection note is required", 400);

  if (decision === "REJECT") {
    const rejected = await prisma.studentDiscontinuationRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        superAdminReviewedBy: actor.id,
        superAdminReviewedAt: new Date(),
        superAdminReviewNote: note,
      },
      include: { branchStudent: { select: { id: true, studentId: true, studentName: true, mobileNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
    });
    await prisma.notification.updateMany({
      where: {
        kind: "STUDENT_DISCONTINUATION",
        requestDescription: "DISCONTINUATION_SUPER_REVIEW:" + request.id,
      },
      data: { requestStatus: "REJECTED", read: true, readAt: new Date() },
    });
    await notifyStudent(rejected, rejected.branchStudent, "Discontinuation request rejected", "Your discontinuation request was rejected by Super Admin. Please contact your branch for details.", "red");
    return normalizeRequest(rejected);
  }

  const waiverAmount = Math.min(number(request.waiverAmount), request.outstandingAmount);
  const refundEligibleAmount = number(request.refundEligibleAmount);
  const finalOutstandingAmount = Math.max(request.outstandingAmount - waiverAmount, 0);
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
      include: { branchStudent: { select: { id: true, studentId: true, studentName: true, mobileNumber: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
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
  const approvalMessage = "Your discontinuation request has been approved. You can continue using your student account for 2 hours. Access will be disabled on " + deactivationLabel + ". Final outstanding amount: â‚¹" + finalOutstandingAmount + ".";
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
