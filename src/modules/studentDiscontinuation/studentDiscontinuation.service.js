import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { createNotification } from "../notifications/notifications.service.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";

const REVIEW_ROLES = new Set(["BRANCH_ADMIN", "SUPER_ADMIN"]);
const SUPER_ADMIN_ROLES = new Set(["SUPER_ADMIN"]);
const ACTIVE_REQUEST_STATUSES = ["PENDING", "SUPER_ADMIN_REVIEW"];

function text(value) {
  return String(value ?? "").trim();
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
    financialSnapshot: {
      totalCourseFee: request.totalCourseFee,
      totalPaid: request.totalPaid,
      outstandingAmount: request.outstandingAmount,
      refundEligibleAmount: request.refundEligibleAmount,
      waiverAmount: request.waiverAmount,
      finalOutstandingAmount: request.finalOutstandingAmount ?? request.outstandingAmount,
      settlementStatus: request.settlementStatus,
      financeNote: request.financeNote || "",
    },
    createdAt: request.createdAt,
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

function financialSnapshot(student) {
  const installmentTotal = (student.installments || []).reduce((sum, item) => sum + number(item.amount), 0);
  const installmentPaid = (student.installments || []).reduce((sum, item) => sum + number(item.amountPaid), 0);
  const paymentTotal = (student.payments || []).reduce((sum, item) => sum + number(item.amount), 0);
  const totalCourseFee = installmentTotal || number(student.courseAmount);
  const totalPaid = paymentTotal || installmentPaid;
  return {
    totalCourseFee,
    totalPaid,
    outstandingAmount: Math.max(totalCourseFee - totalPaid, 0),
    refundEligibleAmount: 0,
    waiverAmount: 0,
    finalOutstandingAmount: Math.max(totalCourseFee - totalPaid, 0),
    settlementStatus: totalCourseFee - totalPaid > 0 ? "SETTLEMENT_PENDING" : "SETTLED",
    financeNote: "",
  };
}

async function notifyBranchAdmin(request, student, branch) {
  const requestDescription = "DISCONTINUATION_REQUEST:" + request.id;
  await createNotification({
    kind: "STUDENT_DISCONTINUATION",
    tone: "red",
    title: "Student discontinuation request submitted",
    message: student.studentName + " submitted a discontinuation request for " + (student.courseName || "the assigned course") + ". Outstanding amount: INR " + request.outstandingAmount + ".",
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
      message: student.studentName + " has a discontinuation request ready for final approval. Outstanding amount: INR " + request.finalOutstandingAmount + ".",
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

  const snapshot = financialSnapshot(student);
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
          emailAddress: true,
          courseName: true,
          batchName: true,
          recordStatus: true,
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
  if (request.status !== "PENDING") throw new AppError("This request is no longer waiting for Branch Admin review", 409);
  const decision = text(payload.decision).toUpperCase();
  if (!["FORWARD", "REJECT", "DISCONTINUE", "CONTINUE", "LEAVE", "UNABLE_TO_CONTACT"].includes(decision)) {
    throw new AppError("Select a valid contact outcome", 400);
  }
  const note = text(payload.note);
  if (decision === "REJECT" && !note) throw new AppError("Rejection note is required", 400);

  const nextStatus = ["FORWARD", "DISCONTINUE"].includes(decision)
    ? "SUPER_ADMIN_REVIEW"
    : decision === "REJECT"
      ? "REJECTED"
      : decision === "CONTINUE"
        ? "CONTACTED_CONTINUE"
        : decision === "LEAVE"
          ? "LEAVE_REQUESTED"
          : "UNABLE_TO_CONTACT";
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
      nextFollowUpDate: text(payload.nextFollowUpDate) || null,
    },
    include: { branchStudent: { select: { id: true, studentId: true, studentName: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
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
    await notifyStudent(updated, updated.branchStudent, "Course continuation recorded", "Your Branch Admin recorded that you plan to continue the course. Please contact the branch if you need support.", "green");
  } else if (decision === "LEAVE") {
    await notifyStudent(updated, updated.branchStudent, "Leave request noted", "Your Branch Admin recorded your leave request. The branch will contact you with the next steps.", "amber");
  } else if (decision === "UNABLE_TO_CONTACT") {
    await notifyStudent(updated, updated.branchStudent, "Follow-up scheduled", "The branch could not reach you and has recorded a follow-up. Please contact your branch as soon as possible.", "amber");
  } else {
    await notifyStudent(updated, updated.branchStudent, "Discontinuation request rejected", "Your discontinuation request was rejected by the Branch Admin. Please review the note and contact your branch.", "red");
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
      include: { branchStudent: { select: { id: true, studentId: true, studentName: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
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

  const waiverAmount = Math.min(number(payload.waiverAmount), request.outstandingAmount);
  const refundEligibleAmount = number(payload.refundEligibleAmount);
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
        financeNote: text(payload.financeNote) || null,
      },
      include: { branchStudent: { select: { id: true, studentId: true, studentName: true, emailAddress: true, courseName: true, batchName: true, recordStatus: true } } },
    });
    await tx.branchStudent.update({
      where: { id: request.branchStudentId },
      data: { recordStatus: "INACTIVE" },
    });
    await tx.user.updateMany({
      where: { email: { equals: request.branchStudent.emailAddress, mode: "insensitive" }, role: "STUDENT" },
      data: { active: false },
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
  await notifyStudent(approved, approved.branchStudent, "Discontinuation request approved", "Your discontinuation request has been approved. Your final outstanding amount is INR " + finalOutstandingAmount + ".", "green");
  return normalizeRequest(approved);
}
