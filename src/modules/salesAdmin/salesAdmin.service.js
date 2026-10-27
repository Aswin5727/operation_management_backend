import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { toSafeUser } from "../../common/utils/user.js";
import { sendPasswordResetEmail, sendSalesAdminCredentialsEmail } from "../../common/services/resendEmail.js";
import { createBranchStudent } from "../branchStudents/branchStudents.service.js";
import { listBranchCourses } from "../branchCourses/branchCourses.service.js";
import { listBranchBatches } from "../branchBatches/branchBatches.service.js";
import { listBranchFaculty } from "../branchFaculty/branchFaculty.service.js";
import { listBranchInstallmentTemplates } from "../branchInstallmentTemplates/branchInstallmentTemplates.service.js";
import { calculateAdmissionFeeDetails } from "./admissionFeeDetails.js";

const USER_SELECT = { id: true, userCode: true, fullName: true, email: true, phone: true, country: true, state: true, city: true, address: true, role: true, active: true, passwordChangedAt: true, lastLoginAt: true, createdAt: true, salesAdminBranches: { select: { branch: { select: { id: true, branchId: true, branchName: true, status: true } } } } };
const clean = (value) => String(value ?? "").trim();
const required = (value, label) => { const result = clean(value); if (!result) throw new AppError(`${label} is required`, 400); return result; };
const emailValue = (value) => { const email = required(value, "Email address").toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError("Enter a valid email address", 400); return email; };
const phoneValue = (value) => { const phone = required(value, "Phone number"); if (!/^\d{10}$/.test(phone)) throw new AppError("Phone number must contain exactly 10 digits", 400); return phone; };
const transientDatabaseError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "P1001", "P1002", "P1017"].includes(code)
    || message.includes("client network socket disconnected")
    || message.includes("can't reach database server")
    || message.includes("server has closed the connection");
};

async function withDatabaseRetry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!transientDatabaseError(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

async function resolveBranches(values) {
  const ids = [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
  if (!ids.length) throw new AppError("Select at least one branch", 400);
  const branches = await prisma.branch.findMany({ where: { OR: ids.flatMap((id) => [{ id }, { branchId: id }]) }, select: { id: true, branchId: true, branchName: true, status: true } });
  const found = new Set(branches.flatMap((branch) => [branch.id, branch.branchId]));
  if (ids.some((id) => !found.has(id))) throw new AppError("One or more selected branches are invalid", 400);
  if (branches.some((branch) => branch.status !== "ACTIVE")) throw new AppError("Sales Admins can only be assigned active branches", 400);
  return branches;
}

async function issueResetToken(userId, createdBy) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.$transaction([prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }), prisma.passwordResetToken.create({ data: { userId, tokenHash, createdBy, expiresAt: new Date(Date.now() + config.credentialResetTokenExpiresMinutes * 60 * 1000) } })]);
  return token;
}

async function nextSalesAdminId(client = prisma) {
  const users = await client.user.findMany({ where: { role: "SALES_ADMIN", userCode: { startsWith: "CISSALES" } }, select: { userCode: true } });
  const highest = users.reduce((max, user) => { const match = String(user.userCode || "").match(/^CISSALES(\d+)$/i); return match ? Math.max(max, Number(match[1])) : max; }, 0);
  return `CISSALES${String(highest + 1).padStart(3, "0")}`;
}

async function createSalesAdmin(payload, auth) {
  const fullName = required(payload.fullName || payload.name, "Sales Admin name");
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(fullName)) throw new AppError("Sales Admin name contains invalid characters", 400);
  const email = emailValue(payload.email); const phone = phoneValue(payload.phone); const country = clean(payload.country) || null; const state = clean(payload.state) || null; const city = clean(payload.city) || null; const address = clean(payload.address) || null; const branches = await resolveBranches(payload.branchIds || payload.branches);
  const status = clean(payload.status || "ACTIVE").toUpperCase();
  if (!["ACTIVE", "INACTIVE"].includes(status)) throw new AppError("Status must be Active or Inactive", 400);
  const temporaryPassword = `${crypto.randomBytes(9).toString("base64url")}Aa1!`;
  const user = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.user.findFirst({ where: { OR: [{ email: { equals: email, mode: "insensitive" } }, { phone }] }, select: { email: true, phone: true } });
    if (duplicate?.email?.toLowerCase() === email) throw new AppError("Email address is already in use", 409);
    if (duplicate?.phone === phone) throw new AppError("Phone number is already in use", 409);
    const salesAdminId = await nextSalesAdminId(tx);
    return tx.user.create({ data: { userCode: salesAdminId, fullName, email, phone, country, state, city, address, role: "SALES_ADMIN", active: status === "ACTIVE", passwordHash: await hashPassword(temporaryPassword), passwordChangedAt: null, createdBy: auth.userId, updatedBy: auth.userId, salesAdminBranches: { create: branches.map((branch) => ({ branchId: branch.id })) } }, select: USER_SELECT });
  });
  try { const token = await issueResetToken(user.id, "CREDENTIAL_EMAIL"); await sendSalesAdminCredentialsEmail({ to: email, fullName, salesAdminId: user.userCode, temporaryPassword, branchNames: branches.map((branch) => branch.branchName), resetToken: token }); } catch (error) { await prisma.user.delete({ where: { id: user.id } }); throw new AppError("Account was not created because the activation email could not be sent", error?.status || 502); }
  return { user: { ...toSafeUser(user), country: user.country, state: user.state, city: user.city, address: user.address }, salesAdminId: user.userCode, branches: user.salesAdminBranches.map(({ branch }) => branch), invitationSent: true };
}

async function listSalesAdmins() { const users = await prisma.user.findMany({ where: { role: "SALES_ADMIN" }, orderBy: { createdAt: "desc" }, select: USER_SELECT }); return { data: users.map((user) => ({ ...toSafeUser(user), country: user.country, state: user.state, city: user.city, address: user.address, branches: user.salesAdminBranches.map(({ branch }) => branch) })) }; }

async function updateSalesAdmin(userId, payload, auth) {
  const existing = await prisma.user.findFirst({ where: { id: userId, role: "SALES_ADMIN" }, select: { id: true, country: true, state: true, city: true, address: true } });
  if (!existing) throw new AppError("Sales Admin account not found", 404);
  const fullName = required(payload.fullName || payload.name, "Sales Admin name");
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(fullName)) throw new AppError("Sales Admin name contains invalid characters", 400);
  const email = emailValue(payload.email); const phone = phoneValue(payload.phone); const country = Object.hasOwn(payload, "country") ? clean(payload.country) || null : existing.country; const state = Object.hasOwn(payload, "state") ? clean(payload.state) || null : existing.state; const city = Object.hasOwn(payload, "city") ? clean(payload.city) || null : existing.city; const address = Object.hasOwn(payload, "address") ? clean(payload.address) || null : existing.address; const status = clean(payload.status || "ACTIVE").toUpperCase();
  if (!["ACTIVE", "INACTIVE"].includes(status)) throw new AppError("Status must be Active or Inactive", 400);
  const branches = await resolveBranches(payload.branchIds || payload.branches);
  const duplicate = await prisma.user.findFirst({ where: { id: { not: userId }, OR: [{ email: { equals: email, mode: "insensitive" } }, { phone }] }, select: { email: true, phone: true } });
  if (duplicate?.email?.toLowerCase() === email) throw new AppError("Email address is already in use", 409);
  if (duplicate?.phone === phone) throw new AppError("Phone number is already in use", 409);
  const user = await prisma.$transaction(async (tx) => {
    await tx.salesAdminBranch.deleteMany({ where: { salesAdminId: userId } });
    return tx.user.update({ where: { id: userId }, data: { fullName, email, phone, country, state, city, address, active: status === "ACTIVE", updatedBy: auth.userId, salesAdminBranches: { create: branches.map((branch) => ({ branchId: branch.id })) } }, select: USER_SELECT });
  });
  return { user: { ...toSafeUser(user), country: user.country, state: user.state, city: user.city, address: user.address }, branches: user.salesAdminBranches.map(({ branch }) => branch) };
}

async function deleteSalesAdmin(userId) {
  const user = await prisma.user.findFirst({ where: { id: userId, role: "SALES_ADMIN" }, select: { id: true } });
  if (!user) throw new AppError("Sales Admin account not found", 404);
  await prisma.user.delete({ where: { id: userId } });
  return { deleted: true };
}

async function resetSalesAdminPassword(userId, auth) {
  const user = await prisma.user.findFirst({ where: { id: userId, role: "SALES_ADMIN" }, select: { id: true, email: true } });
  if (!user) throw new AppError("Sales Admin account not found", 404);
  const token = await issueResetToken(user.id, auth.userId);
  try { await sendPasswordResetEmail({ to: user.email, resetToken: token, expiryMinutes: config.credentialResetTokenExpiresMinutes }); } catch (error) { throw new AppError("Password reset email could not be sent", error?.status || 502); }
  return { resetSent: true };
}

async function getSalesAdminProfile(userId) { const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT }); if (!user || user.role !== "SALES_ADMIN") throw new AppError("Sales Admin account not found", 404); return { ...toSafeUser(user), branches: user.salesAdminBranches.map(({ branch }) => branch) }; }
async function getDashboard(userId, query = {}) { try { await checkPendingHotAdmissionReminder(userId); } catch (error) { console.error("Unable to create daily pending admission reminder:", error?.message || error); } const profile = await getSalesAdminProfile(userId); const allowed = profile.branches.map((branch) => branch.id); const branchId = clean(query.branchId); if (branchId && !allowed.includes(branchId)) throw new AppError("You do not have access to this branch", 403); const branchIds = branchId ? [branchId] : allowed; const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1); const to = query.to ? new Date(query.to) : new Date(); const admissions = branchIds.length ? await prisma.branchStudent.count({ where: { branchId: { in: branchIds }, admissionDate: { not: "" }, createdAt: { gte: from, lte: to } } }) : 0; return { data: { profile, scope: { branchIds }, range: { from, to }, cards: { newLeads: null, totalLeads: null, hotLeads: null, warmLeads: null, coldLeads: null, admissionsCompleted: admissions, expectedAdmissions: null }, chart: [], recentActivities: [] } }; }

function salesAdminReminderDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function checkPendingHotAdmissionReminderOnce(actorOrUserId) {
  const actor = typeof actorOrUserId === "string" ? { userId: actorOrUserId, role: "SALES_ADMIN" } : (actorOrUserId || {});
  const userId = actor.userId;
  const branchIds = String(actor.role || "").toUpperCase() === "BRANCH_ADMIN"
    ? [actor.branchId]
    : (await prisma.salesAdminBranch.findMany({ where: { salesAdminId: userId, branch: { status: "ACTIVE" } }, select: { branchId: true } })).map(({ branchId }) => branchId);
  const where = { branchId: { in: branchIds }, assignedToId: userId, stage: "HOT", status: { not: "CONVERTED" }, admissionStatus: { in: ["PENDING", "IN_PROGRESS"] }, deletedAt: null };
  const leads = branchIds.length ? await prisma.lead.findMany({ where, include: {
    branch: { select: { id: true, branchId: true, branchName: true, status: true } },
    course: { select: { id: true, name: true, courseCode: true } },
    assignedTo: { select: { id: true, fullName: true } },
    convertedStudent: { select: { studentId: true } },
  }, orderBy: [{ studentName: "asc" }, { leadId: "asc" }] }) : [];
  const students = leads.map((lead) => ({ ...admissionRow(lead), admissionStatus: lead.admissionStatus === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING" }));
  const reminderDate = salesAdminReminderDate();
  const notificationDescription = `PENDING_HOT_ADMISSIONS:${reminderDate}`;
  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.salesAdminAdmissionReminder.createMany({ data: [{ salesAdminId: userId, notificationType: "PENDING_HOT_ADMISSIONS", reminderDate }], skipDuplicates: true });
    if (!claim.count) {
      const existing = await tx.salesAdminAdmissionReminder.findUnique({ where: { salesAdminId_notificationType_reminderDate: { salesAdminId: userId, notificationType: "PENDING_HOT_ADMISSIONS", reminderDate } }, select: { notificationId: true } });
      return { notification: existing?.notificationId ? await tx.notification.findUnique({ where: { id: existing.notificationId } }) : null, created: false };
    }
    if (!students.length) return { notification: null, created: false };
    const created = await tx.notification.create({ data: {
      kind: "PENDING_STUDENT_ADMISSION_REMINDER",
      tone: "blue",
      title: "Good Morning! Pending HOT Student Admissions",
      message: `You have ${students.length} HOT lead${students.length === 1 ? "" : "s"} whose student admissions are still pending. Please review the list and complete the admission process.`,
      actionLabel: "View Pending Admissions",
      targetUserId: userId,
      targetBranchId: String(actor.role || "").toUpperCase() === "BRANCH_ADMIN" ? actor.branchId : null,
      targetBranchName: String(actor.role || "").toUpperCase() === "BRANCH_ADMIN" ? (students[0]?.branchName || leads[0]?.branch?.branchName || null) : null,
      createdBy: userId,
      requestDescription: notificationDescription,
    } });
    await tx.salesAdminAdmissionReminder.update({ where: { salesAdminId_notificationType_reminderDate: { salesAdminId: userId, notificationType: "PENDING_HOT_ADMISSIONS", reminderDate } }, data: { notificationId: created.id } });
    return { notification: created, created: true };
  });
  return { count: students.length, students, notificationCreated: result.created, notification: result.notification };
}

async function checkPendingHotAdmissionReminder(actorOrUserId) {
  return withDatabaseRetry(() => checkPendingHotAdmissionReminderOnce(actorOrUserId));
}

function admissionLeadInclude() {
  return {
    branch: { select: { id: true, branchId: true, branchName: true, status: true, branchEmail: true, adminUserId: true } },
    course: { select: { id: true, name: true, courseCode: true, status: true, mode: true } },
    assignedTo: { select: { id: true, fullName: true } },
    convertedStudent: { include: { installments: { orderBy: { installmentNumber: "asc" } }, payments: { orderBy: { paymentDate: "asc" } }, courseEnrollments: { orderBy: { sequenceOrder: "asc" } } } },
  };
}

async function getSalesScope(actorOrUserId) {
  const actor = typeof actorOrUserId === "string"
    ? { userId: actorOrUserId, role: "SALES_ADMIN" }
    : (actorOrUserId || {});
  const role = String(actor.role || "").toUpperCase();
  if (role === "BRANCH_ADMIN") {
    const branch = await prisma.branch.findUnique({ where: { id: actor.branchId }, select: { id: true, branchId: true, branchName: true, status: true } });
    if (!branch || branch.status !== "ACTIVE") throw new AppError("You do not have access to this branch", 403);
    return { actor, userId: actor.userId, branchIds: [branch.id], branches: [branch] };
  }
  const branches = await prisma.salesAdminBranch.findMany({ where: { salesAdminId: actor.userId, branch: { status: "ACTIVE" } }, select: { branch: { select: { id: true, branchId: true, branchName: true, status: true } } } });
  return { actor, userId: actor.userId, branchIds: branches.map(({ branch }) => branch.id), branches: branches.map(({ branch }) => branch) };
}

async function getAdmissionLeadForSalesAdmin(actorOrUserId, leadKey) {
  const { branchIds } = await getSalesScope(actorOrUserId);
  const lead = await prisma.lead.findFirst({
    where: { OR: [{ id: clean(leadKey) }, { leadId: clean(leadKey) }], branchId: { in: branchIds }, deletedAt: null },
    include: admissionLeadInclude(),
  });
  if (!lead) throw new AppError("Lead not found in your authorized branches", 404);
  if (String((typeof actorOrUserId === "object" ? actorOrUserId?.role : "SALES_ADMIN") || "").toUpperCase() === "BRANCH_ADMIN" && lead.assignedToId && lead.assignedToId !== (typeof actorOrUserId === "object" ? actorOrUserId.userId : "")) {
    throw new AppError("Lead is assigned to another Sales Admin", 403);
  }
  if (lead.stage !== "HOT" && lead.status !== "CONVERTED") throw new AppError("Only HOT leads can be admitted", 400);
  if (lead.branch?.status !== "ACTIVE") throw new AppError("The lead branch is inactive", 400);
  return lead;
}

function admissionRow(lead) {
  const student = lead.convertedStudent;
  return {
    id: lead.id,
    leadId: lead.leadId,
    studentId: student?.studentId || "",
    studentName: lead.studentName,
    phoneNumber: lead.phoneNumber,
    branchId: lead.branchId,
    branchName: lead.branch?.branchName || "",
    courseId: lead.courseId,
    courseName: lead.course?.name || "",
    otherCourse: lead.otherCourse || "",
    trainingMode: lead.courseMode || lead.trainingMode || "",
    classSchedule: lead.classSchedule || "",
    stage: lead.stage,
    paymentStatus: lead.paymentStatus,
    paymentAmount: lead.paymentAmount,
    assignedAdminName: lead.assignedTo?.fullName || "",
    assignedToId: lead.assignedToId || "",
    admissionStatus: lead.status === "CONVERTED" ? "ADMITTED" : (lead.admissionStatus || "PENDING"),
    admissionStudent: student,
  };
}

async function getSalesAdminStudentFeeDetails(actorOrUserId, studentId) {
  const { userId, branchIds } = await getSalesScope(actorOrUserId);
  const student = await prisma.branchStudent.findFirst({
    where: { id: clean(studentId), branchId: { in: branchIds }, sourceLead: { is: { ...(String((typeof actorOrUserId === "object" ? actorOrUserId?.role : "SALES_ADMIN")).toUpperCase() === "SALES_ADMIN" ? { assignedToId: userId } : {}), deletedAt: null, status: "CONVERTED" } } },
    include: {
      sourceLead: { select: { branchId: true } },
      courseEnrollments: { orderBy: { sequenceOrder: "asc" } },
      installments: { orderBy: [{ installmentNumber: "asc" }, { createdAt: "asc" }] },
      payments: { include: { installment: { select: { courseId: true, installmentNumber: true } } }, orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!student) throw new AppError("Admitted student not found", 404);
  if (!branchIds.includes(student.branchId)) throw new AppError("You do not have access to this student", 403);
  return calculateAdmissionFeeDetails(student);
}

async function listAllBranchAdmissionBatches(userId, branchId) {
  const branchActor = { id: userId, userId, role: "SUPER_ADMIN", impersonatedBranchId: branchId };
  const firstPage = await listBranchBatches({ page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }, branchActor);
  const batches = [...(firstPage.data || [])];
  const totalPages = Math.max(1, Number(firstPage.meta?.totalPages || 1));
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await listBranchBatches({ page, limit: 100, sortBy: "createdAt", sortOrder: "desc" }, branchActor);
    batches.push(...(result.data || []));
  }
  return batches;
}

function getEligibleAdmissionBatches(lead, branchBatches = []) {
  const courseId = clean(lead.courseId);
  if (!courseId) return [];
  const requestedMode = clean(lead.courseMode || lead.trainingMode).toUpperCase();
  const requestedSchedule = clean(lead.classSchedule).toUpperCase();
  const now = Date.now();
  return branchBatches.flatMap((batch) => {
    if (clean(batch.branchId) !== clean(lead.branchId)) return [];
    if (clean(batch.courseId || batch.branchCourseId) !== courseId) return [];
    if (clean(batch.status).toUpperCase() !== "ACTIVE") return [];
    if (!batch.currentCycleId || clean(batch.currentCycleStatus).toUpperCase() !== "ACTIVE") return [];
    if (clean(batch.completionStatus).toUpperCase() === "COMPLETED") return [];
    if (batch.freezeUntil && new Date(batch.freezeUntil).getTime() > now) return [];
    const batchMode = clean(batch.mode).toUpperCase();
    if (requestedMode && batchMode && batchMode !== requestedMode) return [];
    const batchSchedule = clean(batch.weekType).toUpperCase();
    if (requestedSchedule && batchSchedule && batchSchedule !== requestedSchedule) return [];
    const totalSeats = Math.max(0, Number(batch.totalSeats || 0));
    const occupiedSeats = Math.max(0, Number(batch.activeStudentCount || 0));
    const availableSeats = Math.max(0, totalSeats - occupiedSeats);
    if (availableSeats <= 0) return [];
    const facultyId = batch.branchFacultyId || batch.facultyId || "";
    const facultyName = batch.facultyName || "";
    return [{
      id: batch.id || batch.batchId,
      batchId: batch.batchId || batch.id,
      batchName: batch.batchName || "",
      courseName: batch.courseName || lead.course?.name || "",
      faculty: facultyName || facultyId ? [{ id: facultyId, name: facultyName, email: batch.facultyEmail || "" }] : [],
      batchTiming: batch.batchTiming || "",
      schedule: batchSchedule,
      trainingMode: batchMode,
      totalSeats,
      occupiedSeats,
      availableSeats,
      status: clean(batch.status).toUpperCase(),
      displayStatus: "RUNNING",
    }];
  });
}

async function getAdmissionBatchContext(actorOrUserId, lead) {
  const userId = typeof actorOrUserId === "string" ? actorOrUserId : actorOrUserId.userId;
  const branchBatches = await listAllBranchAdmissionBatches(userId, lead.branchId);
  const batches = getEligibleAdmissionBatches(lead, branchBatches);
  return {
    leadId: lead.leadId,
    branchId: lead.branchId,
    branchName: lead.branch?.branchName || "",
    courseId: lead.courseId || "",
    courseName: lead.course?.name || lead.otherCourse || "",
    trainingMode: lead.courseMode || lead.trainingMode || "",
    schedule: lead.classSchedule || "",
    availableBatchCount: batches.length,
    batches,
  };
}

async function listSalesAdminAdmissions(actorOrUserId, query = {}) {
  const scope = await getSalesScope(actorOrUserId);
  const userId = scope.userId;
  const branchIds = scope.branchIds;
  const branchId = clean(query.branchId);
  if (branchId && !branchIds.includes(branchId)) throw new AppError("You do not have access to this branch", 403);
  const scopedBranchIds = branchId ? [branchId] : branchIds;
  const status = clean(query.status || "ALL").toUpperCase();
  if (!["ALL", "PENDING", "IN_PROGRESS", "PENDING_HOT", "ADMITTED"].includes(status)) throw new AppError("Invalid admission status filter", 400);
  const isBranchAdmin = String((typeof actorOrUserId === "object" ? actorOrUserId?.role : "SALES_ADMIN") || "").toUpperCase() === "BRANCH_ADMIN";
  const branchAdminAssignmentScope = isBranchAdmin ? { OR: [{ assignedToId: userId }, { assignedToId: null }] } : null;
  const where = { branchId: { in: scopedBranchIds }, stage: "HOT", deletedAt: null };
  if (branchAdminAssignmentScope) where.AND = [branchAdminAssignmentScope];
  if (status === "ADMITTED") where.status = "CONVERTED";
  if (status === "IN_PROGRESS") { where.status = { not: "CONVERTED" }; where.admissionStatus = "IN_PROGRESS"; }
  if (status === "PENDING") { where.status = { not: "CONVERTED" }; where.AND = [...(where.AND || []), { OR: [{ admissionStatus: "PENDING" }, { admissionStatus: null }] }]; }
  if (status === "PENDING_HOT") { where.status = { not: "CONVERTED" }; where.AND = [...(where.AND || []), { admissionStatus: { in: ["PENDING", "IN_PROGRESS"] } }]; }
  const courseId = clean(query.courseId);
  if (courseId) where.courseId = courseId;
  const search = clean(query.search);
  if (search) {
    const searchClause = { OR: [
      { leadId: { contains: search, mode: "insensitive" } },
      { studentName: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search, mode: "insensitive" } },
      { convertedStudent: { is: { studentId: { contains: search, mode: "insensitive" } } } },
    ] };
    where.AND = [...(where.AND || []), searchClause];
  }
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const allHotWhere = { branchId: { in: scopedBranchIds }, stage: "HOT", deletedAt: null };
  if (branchAdminAssignmentScope) allHotWhere.AND = [branchAdminAssignmentScope];
  const [total, rows, hotLeads, pendingAdmissions, completedAdmissions, collections, availableCourses, branchAdmin] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({ where, include: admissionLeadInclude(), orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.lead.count({ where: allHotWhere }),
    prisma.lead.count({ where: { ...allHotWhere, status: { not: "CONVERTED" }, admissionStatus: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.lead.count({ where: { ...allHotWhere, status: "CONVERTED" } }),
    prisma.branchStudentPayment.aggregate({ where: { branchId: { in: scopedBranchIds }, branchStudent: { is: { sourceLeadId: { not: null } } } }, _sum: { amount: true } }),
    prisma.branchCourse.findMany({ where: { branchId: { in: scopedBranchIds }, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    isBranchAdmin ? prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true } }) : Promise.resolve(null),
  ]);
  const branchBatchEntries = await Promise.all([...new Set(rows.map((lead) => lead.branchId).filter(Boolean))].map(async (id) => [id, await listAllBranchAdmissionBatches(userId, id)]));
  const batchesByBranch = new Map(branchBatchEntries);
  return {
    data: rows.map((lead) => {
      const row = admissionRow(lead);
      if (isBranchAdmin && !row.assignedAdminName && branchAdmin) {
        row.assignedAdminName = branchAdmin.fullName;
        row.assignedToId = branchAdmin.id;
      }
      return { ...row, canRequestBatch: !lead.assignedToId || lead.assignedToId === userId, availableBatchCount: getEligibleAdmissionBatches(lead, batchesByBranch.get(lead.branchId) || []).length };
    }),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: { hotLeads, pendingAdmissions, completedAdmissions, totalCollections: Number(collections._sum.amount || 0) },
    filters: { branches: scope.branches.filter((branch) => scopedBranchIds.includes(branch.id)), courses: availableCourses },
  };
}

async function getSalesAdminAdmissionLead(actorOrUserId, leadKey) {
  const userId = typeof actorOrUserId === "string" ? actorOrUserId : actorOrUserId.userId;
  const lead = await getAdmissionLeadForSalesAdmin(actorOrUserId, leadKey);
  if (lead.status === "CONVERTED") return { lead: admissionRow(lead) };
  const branchActor = { id: userId, userId, role: "SUPER_ADMIN", impersonatedBranchId: lead.branchId };
  const [courses, batches, faculty, installmentTemplates] = await Promise.all([
    listBranchCourses({ page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }, branchActor),
    listBranchBatches({ page: 1, limit: 100, branchId: lead.branchId, sortBy: "createdAt", sortOrder: "desc" }, branchActor),
    listBranchFaculty(branchActor, { page: 1, limit: 100, status: "ACTIVE" }),
    listBranchInstallmentTemplates({ page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }, branchActor),
  ]);
  return {
    lead: {
      ...admissionRow(lead),
      email: lead.email || "",
      alternativeNumber: lead.alternativeNumber || "",
      qualification: lead.qualification || "",
      location: lead.location || "",
      leadSource: lead.leadSource || "",
      course: lead.course,
      branch: lead.branch,
      admissionContext: { courses: courses.data || [], batches: batches.data || [], faculty: faculty.data || [], installmentTemplates: installmentTemplates.data || [] },
    },
  };
}

async function getSalesAdminAvailableBatches(actorOrUserId, leadKey) {
  const lead = await getAdmissionLeadForSalesAdmin(actorOrUserId, leadKey);
  return getAdmissionBatchContext(actorOrUserId, lead);
}

async function getPendingHotAdmissionReminder(actor) {
  return checkPendingHotAdmissionReminder(actor);
}

async function startSalesAdminAdmission(actorOrUserId, leadKey) {
  const userId = typeof actorOrUserId === "string" ? actorOrUserId : actorOrUserId.userId;
  const lead = await getAdmissionLeadForSalesAdmin(actorOrUserId, leadKey);
  if (lead.status !== "CONVERTED" && lead.admissionStatus !== "IN_PROGRESS") {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: lead.id }, data: { admissionStatus: "IN_PROGRESS", updatedById: userId } });
      await tx.leadActivity.create({ data: { leadId: lead.id, action: "ADMISSION_STARTED", previousValue: { admissionStatus: lead.admissionStatus || "PENDING" }, newValue: { admissionStatus: "IN_PROGRESS" }, createdById: userId } });
    });
  }
  return getSalesAdminAdmissionLead(actorOrUserId, lead.id);
}

async function convertSalesAdminLead(auth, leadKey, payload = {}) {
  const userId = clean(auth?.userId || auth?.id);
  if (!userId) throw new AppError("Sales Admin session is required", 401);
  const lead = await getAdmissionLeadForSalesAdmin(auth, leadKey);
  if (lead.status === "CONVERTED" && lead.convertedStudent) return lead.convertedStudent;
  // Keep the authenticated role here. A combined Branch Admin is authorized by
  // the Sales CRM route, but is not a row in salesAdminBranch. Re-labeling the
  // actor as SALES_ADMIN made the final student creation check reject the same
  // branch with 403.
  return createBranchStudent(
    { ...payload, branchId: lead.branchId, sourceLeadId: lead.id, admissionSource: "SALES_CRM" },
    { ...auth, id: userId, userId, role: auth?.role || "SALES_ADMIN" },
  );
}

export { createSalesAdmin, listSalesAdmins, updateSalesAdmin, deleteSalesAdmin, resetSalesAdminPassword, getSalesAdminProfile, getDashboard, listSalesAdminAdmissions, getSalesAdminAdmissionLead, getSalesAdminAvailableBatches, getSalesAdminStudentFeeDetails, getPendingHotAdmissionReminder, startSalesAdminAdmission, convertSalesAdminLead };

