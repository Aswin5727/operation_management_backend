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

const USER_SELECT = { id: true, userCode: true, fullName: true, email: true, phone: true, country: true, state: true, city: true, address: true, role: true, active: true, passwordChangedAt: true, lastLoginAt: true, createdAt: true, salesAdminBranches: { select: { branch: { select: { id: true, branchId: true, branchName: true, status: true, timezone: true } } } } };
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

async function resolveBranches(values, options = {}) {
  const ids = [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
  if (!ids.length) { if (options.allowEmpty) return []; throw new AppError("Select at least one branch", 400); }
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
  const email = emailValue(payload.email); const phone = phoneValue(payload.phone); const country = clean(payload.country) || null; const state = clean(payload.state) || null; const city = clean(payload.city) || null; const address = clean(payload.address) || null; const branches = await resolveBranches(payload.branchIds || payload.branches, { allowEmpty: payload.allowUnassigned === true });
  const requestedSalesAdminId = clean(payload.salesAdminId || payload.userCode).toUpperCase();
  if (requestedSalesAdminId && !/^CISSALES\d{3,}$/.test(requestedSalesAdminId)) throw new AppError("Sales Admin ID must use the format CISSALES001", 400);
  const status = clean(payload.status || "ACTIVE").toUpperCase();
  if (!["ACTIVE", "INACTIVE"].includes(status)) throw new AppError("Status must be Active or Inactive", 400);
  const temporaryPassword = `${crypto.randomBytes(9).toString("base64url")}Aa1!`;
  const user = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.user.findFirst({ where: { OR: [{ email: { equals: email, mode: "insensitive" } }, { phone }] }, select: { email: true, phone: true } });
    if (duplicate?.email?.toLowerCase() === email) throw new AppError("Email address is already in use", 409);
    if (duplicate?.phone === phone) throw new AppError("Phone number is already in use", 409);
    const salesAdminId = requestedSalesAdminId || await nextSalesAdminId(tx);
    const duplicateUserCode = await tx.user.findUnique({ where: { userCode: salesAdminId }, select: { id: true } });
    if (duplicateUserCode) throw new AppError("Sales Admin ID is already in use", 409);
    return tx.user.create({ data: { userCode: salesAdminId, fullName, email, phone, country, state, city, address, role: "SALES_ADMIN", active: status === "ACTIVE", passwordHash: await hashPassword(temporaryPassword), passwordChangedAt: null, createdBy: auth.userId, updatedBy: auth.userId, salesAdminBranches: { create: branches.map((branch) => ({ branchId: branch.id })) } }, select: USER_SELECT });
  });
  try { const token = await issueResetToken(user.id, "CREDENTIAL_EMAIL"); await sendSalesAdminCredentialsEmail({ to: email, fullName, salesAdminId: user.userCode, temporaryPassword, branchNames: branches.map((branch) => branch.branchName), resetToken: token }); } catch (error) { await prisma.user.delete({ where: { id: user.id } }); throw new AppError("Account was not created because the activation email could not be sent", error?.status || 502); }
  return { user: { ...toSafeUser(user), country: user.country, state: user.state, city: user.city, address: user.address }, salesAdminId: user.userCode, branches: user.salesAdminBranches.map(({ branch }) => branch), invitationSent: true };
}

async function listSalesAdmins(includeCombinedBranchAdmins = false, startDateValue = "", endDateValue = "") {
  const rangeStart = startDateValue ? new Date(`${startDateValue}T00:00:00.000Z`) : null;
  const rangeEnd = endDateValue ? new Date(`${endDateValue}T23:59:59.999Z`) : null;
  const hasDateRange = rangeStart && rangeEnd && !Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime()) && rangeStart <= rangeEnd;
  const users = await prisma.user.findMany({ where: { role: "SALES_ADMIN" }, orderBy: { createdAt: "desc" }, select: USER_SELECT });
  const salesRows = users.map((user) => ({ ...toSafeUser(user), country: user.country, state: user.state, city: user.city, address: user.address, branches: user.salesAdminBranches.map(({ branch }) => branch) }));
  if (!includeCombinedBranchAdmins) return { data: salesRows };
  const combinedBranches = await prisma.branch.findMany({ where: { status: "ACTIVE", roleAccess: "BRANCH_ADMIN_SALES_ADMIN", adminUserId: { not: null } }, orderBy: { createdAt: "desc" }, select: { id: true, branchId: true, branchName: true, status: true, timezone: true, branchCountry: true, branchState: true, branchCity: true, branchAddress: true, adminUser: { select: { id: true, userCode: true, fullName: true, email: true, phone: true, country: true, state: true, city: true, address: true, role: true, active: true, createdAt: true, updatedAt: true, passwordChangedAt: true, lastLoginAt: true } } } });
  const branchRows = combinedBranches.filter((branch) => branch.adminUser?.active && branch.adminUser?.role === "BRANCH_ADMIN").map((branch) => ({ ...toSafeUser(branch.adminUser), country: branch.adminUser.country || branch.branchCountry || "", state: branch.adminUser.state || branch.branchState || "", city: branch.adminUser.city || branch.branchCity || "", address: branch.adminUser.address || branch.branchAddress || "", branches: [{ id: branch.id, branchId: branch.branchId, branchName: branch.branchName, status: branch.status, timezone: branch.timezone, branchCountry: branch.branchCountry, branchState: branch.branchState, branchCity: branch.branchCity, branchAddress: branch.branchAddress }], accountType: "BRANCH_ADMIN_SALES_ADMIN" }));
  const rows = [...salesRows, ...branchRows];
  const adminIds = rows.map((row) => row.id).filter(Boolean);
  const leadRows = adminIds.length ? await prisma.lead.findMany({ where: { deletedAt: null, createdById: { in: adminIds }, ...(hasDateRange ? { createdAt: { gte: rangeStart, lte: rangeEnd } } : {}) }, orderBy: { createdAt: "desc" }, select: { id: true, leadId: true, studentName: true, phoneNumber: true, email: true, createdById: true, branch: { select: { branchName: true } }, stage: true, status: true, leadSource: true, createdAt: true, nextFollowUpDate: true, nextFollowUpTime: true, course: { select: { name: true } }, followUps: { orderBy: { followUpDate: "desc" }, take: 1, select: { followUpDate: true, callStatus: true, notes: true, nextFollowUpDate: true, nextFollowUpTime: true } } } }) : [];
  const leadById = new Map(leadRows.map((lead) => [lead.id, lead.createdById]));
  const activityRows = leadRows.length ? await prisma.leadActivity.findMany({ where: { leadId: { in: leadRows.map((lead) => lead.id) }, ...(hasDateRange ? { createdAt: { gte: rangeStart, lte: rangeEnd } } : {}) }, include: { lead: { select: { id: true, leadId: true, studentName: true, branch: { select: { branchName: true } } }, }, createdBy: { select: { fullName: true } } }, orderBy: { createdAt: "desc" }, take: 100 }) : [];
  const metrics = new Map(adminIds.map((id) => [id, { leadCount: 0, hotCount: 0, warmCount: 0, coldCount: 0, closedCount: 0, admissionCount: 0, pendingFollowUpCount: 0, overdueFollowUpCount: 0, sourceBreakdown: {}, courseBreakdown: {}, statusBreakdown: {}, ageingBreakdown: { "0_7_DAYS": 0, "8_30_DAYS": 0, "30_PLUS_DAYS": 0 }, recentLeads: [], admissionRecords: [], followUpRecords: [], activityRecords: [] }]));
  const now = Date.now();
  leadRows.forEach((lead) => {
    const metric = metrics.get(lead.createdById);
    if (!metric) return;
    metric.leadCount += 1;
    const stage = String(lead.stage || "").toUpperCase();
    if (stage === "HOT") metric.hotCount += 1;
    if (stage === "WARM") metric.warmCount += 1;
    if (stage === "COLD") metric.coldCount += 1;
    if (stage === "CLOSED") metric.closedCount += 1;
    const source = String(lead.leadSource || "Unknown"); metric.sourceBreakdown[source] = (metric.sourceBreakdown[source] || 0) + 1;
    const course = String(lead.course?.name || "Unknown"); metric.courseBreakdown[course] = (metric.courseBreakdown[course] || 0) + 1;
    const status = String(lead.status || "Unknown"); metric.statusBreakdown[status] = (metric.statusBreakdown[status] || 0) + 1;
    const ageDays = Math.max(0, Math.floor((now - new Date(lead.createdAt).getTime()) / 86400000));
    metric.ageingBreakdown[ageDays <= 7 ? "0_7_DAYS" : ageDays <= 30 ? "8_30_DAYS" : "30_PLUS_DAYS"] += 1;
    if (lead.nextFollowUpDate && !["CONVERTED", "CLOSED"].includes(status)) {
      if (new Date(lead.nextFollowUpDate).getTime() < now) metric.overdueFollowUpCount += 1;
      else metric.pendingFollowUpCount += 1;
    }
    const latestFollowUp = lead.followUps?.[0];
    if (latestFollowUp || lead.nextFollowUpDate) metric.followUpRecords.push({ leadId: lead.leadId, studentName: lead.studentName, phoneNumber: lead.phoneNumber, email: lead.email, stage: lead.stage, status: lead.status, courseName: lead.course?.name, branchName: lead.branch?.branchName, lastFollowUpDate: latestFollowUp?.followUpDate || null, nextFollowUpDate: lead.nextFollowUpDate || latestFollowUp?.nextFollowUpDate || null, nextFollowUpTime: lead.nextFollowUpTime || latestFollowUp?.nextFollowUpTime || null, followUpStatus: lead.nextFollowUpDate ? (new Date(lead.nextFollowUpDate).getTime() < now ? "OVERDUE" : "PENDING") : "COMPLETED", notes: latestFollowUp?.notes || "" });
    if (metric.recentLeads.length < 5) metric.recentLeads.push({ leadId: lead.leadId, studentName: lead.studentName, stage: lead.stage, status: lead.status, createdAt: lead.createdAt, courseName: lead.course?.name || null });
  });
  activityRows.forEach((activity) => {
    const metric = metrics.get(leadById.get(activity.lead?.id));
    if (metric) metric.activityRecords.push({ id: activity.id, action: activity.action, leadId: activity.lead?.leadId || "", studentName: activity.lead?.studentName || "", branchName: activity.lead?.branch?.branchName || "", updatedBy: activity.createdBy?.fullName || "Sales Admin", createdAt: activity.createdAt });
  });
  if (leadRows.length) {
    const admittedStudents = await prisma.branchStudent.findMany({ where: { sourceLeadId: { in: leadRows.map((lead) => lead.id) }, admissionDate: { not: "" } }, orderBy: { admissionDate: "desc" }, select: { studentId: true, studentName: true, mobileNumber: true, emailAddress: true, admissionDate: true, courseName: true, branchId: true, batchName: true, batchTiming: true, courseMode: true, facultyName: true, sourceLeadId: true, sourceLead: { select: { leadId: true } }, branch: { select: { branchName: true } } } });
    admittedStudents.forEach((student) => {
      if (hasDateRange) {
        const admissionDate = new Date(`${String(student.admissionDate).slice(0, 10)}T00:00:00.000Z`);
        if (Number.isNaN(admissionDate.getTime()) || admissionDate < rangeStart || admissionDate > rangeEnd) return;
      }
      const adminId = leadById.get(student.sourceLeadId);
      const metric = metrics.get(adminId);
      if (metric) {
        metric.admissionCount += 1;
        metric.admissionRecords.push({ studentId: student.studentId, studentName: student.studentName, phoneNumber: student.mobileNumber, email: student.emailAddress, admissionDate: student.admissionDate, courseName: student.courseName, branchName: student.branch?.branchName, batchName: student.batchName, batchTiming: student.batchTiming, courseMode: student.courseMode, facultyName: student.facultyName, leadId: student.sourceLead?.leadId || "" });
      }
    });
    metrics.forEach((metric) => {
      const admittedLeadIds = new Set(metric.admissionRecords.map((record) => record.leadId).filter(Boolean));
      metric.followUpRecords.forEach((record) => {
        if (admittedLeadIds.has(record.leadId)) record.followUpStatus = "ADMISSION COMPLETED";
      });
    });
  }
  const emptyMetrics = { leadCount: 0, hotCount: 0, warmCount: 0, coldCount: 0, closedCount: 0, admissionCount: 0, pendingFollowUpCount: 0, overdueFollowUpCount: 0, sourceBreakdown: {}, courseBreakdown: {}, statusBreakdown: {}, ageingBreakdown: { "0_7_DAYS": 0, "8_30_DAYS": 0, "30_PLUS_DAYS": 0 }, recentLeads: [], admissionRecords: [], followUpRecords: [], activityRecords: [] };
  return { data: rows.map((row) => ({ ...row, leadMetrics: metrics.get(row.id) || emptyMetrics })) };
}

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

async function getSalesAdminProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user || user.role !== "SALES_ADMIN") throw new AppError("Sales Admin account not found", 404);
  return {
    ...toSafeUser(user),
    country: user.country,
    state: user.state,
    city: user.city,
    address: user.address,
    branches: user.salesAdminBranches.map(({ branch }) => branch),
  };
}

async function updateOwnSalesAdminProfile(userId, payload = {}) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "SALES_ADMIN" },
    select: { id: true },
  });
  if (!user) throw new AppError("Sales Admin account not found", 404);

  const fullName = required(payload.fullName, "Full name");
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(fullName)) throw new AppError("Full name contains invalid characters", 400);
  const phone = phoneValue(payload.phone);
  const address = clean(payload.address) || null;
  if (address && address.length > 500) throw new AppError("Address must be 500 characters or fewer", 400);

  const duplicatePhone = await prisma.user.findFirst({
    where: { id: { not: userId }, phone },
    select: { id: true },
  });
  if (duplicatePhone) throw new AppError("Phone number is already in use", 409);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { fullName, phone, address, updatedBy: userId },
      select: { id: true },
    });
  } catch (error) {
    if (error?.code === "P2002") throw new AppError("Phone number is already in use", 409);
    throw error;
  }

  return getSalesAdminProfile(userId);
}
function dateKeyInTimezone(value, timezone = "Asia/Kolkata") {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateKeyStart(dateKey) { return new Date(`${dateKey}T00:00:00.000Z`); }

function followUpTimeLabel(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
}

function parseDashboardDate(value, endOfDay = false) {
  const text = clean(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return new Date(text);
}

function dashboardActivityTitle(action) {
  const titles = {
    LEAD_CREATED: "Lead created",
    LEAD_UPDATED: "Lead details updated",
    LEAD_UPDATED_STAGE_CHANGED: "Lead stage changed",
    LEAD_STAGE_CHANGED: "Lead stage changed",
    LEAD_STATUS_CHANGED: "Lead status changed",
    FOLLOW_UP_ADDED: "Follow-up added",
    NEXT_FOLLOW_UP_CHANGED: "Follow-up scheduled",
    CALL_RECORDING_UPLOADED: "Call recording uploaded",
    CALL_RECORDING_DELETED: "Call recording deleted",
    ADMISSION_STARTED: "Admission started",
    LEAD_CONVERTED_TO_STUDENT: "Admission completed",
  };
  return titles[action] || clean(action).toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function dateOnlyKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

async function getDashboard(userId, query = {}, auth = {}) {
  let profile;
  if (String(auth.role || "").toUpperCase() === "SALES_ADMIN") {
    profile = await getSalesAdminProfile(userId);
  } else if (
    String(auth.role || "").toUpperCase() === "BRANCH_ADMIN"
    && String(auth.roleAccess || "").toUpperCase() === "BRANCH_ADMIN_SALES_ADMIN"
  ) {
    if (!auth.branchId) throw new AppError("Branch access could not be verified", 403);
    const [user, branch] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT }),
      prisma.branch.findUnique({ where: { id: auth.branchId }, select: { id: true, branchId: true, branchName: true, status: true, timezone: true } }),
    ]);
    if (!user || user.role !== "BRANCH_ADMIN" || !branch) throw new AppError("Sales Admin dashboard access is unavailable", 403);
    profile = { ...toSafeUser(user), branches: [branch] };
  } else {
    throw new AppError("Sales Admin dashboard access is required", 403);
  }

  // The branch for a combined-role Branch Admin comes from authenticated server
  // context. A request parameter can narrow that scope, but cannot expand it.
  const allowed = profile.branches.map((branch) => branch.id);
  const branchId = clean(query.branchId);
  if (branchId && !allowed.includes(branchId)) throw new AppError("You do not have access to this branch", 403);

  const branchIds = branchId ? [branchId] : allowed;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = query.from ? parseDashboardDate(query.from) : defaultFrom;
  const to = query.to ? parseDashboardDate(query.to, true) : now;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new AppError("Dashboard date range is invalid", 400);
  if (from > to) throw new AppError("Dashboard start date cannot be after end date", 400);

  const leadScope = { deletedAt: null, branchId: { in: branchIds }, assignedToId: userId };
  const periodScope = { createdAt: { gte: from, lte: to } };
  const selectedLeadScope = { ...leadScope, ...periodScope };
  const activeFollowUpScope = { ...leadScope, stage: { in: ["COLD", "WARM", "HOT"] }, status: { not: "CONVERTED" } };
  const branches = profile.branches.filter((branch) => branchIds.includes(branch.id));
  const chartTimezone = branches[0]?.timezone || "Asia/Kolkata";
  const chartTodayKey = dateKeyInTimezone(now, chartTimezone);
  const chartWeekday = new Date(`${chartTodayKey}T00:00:00.000Z`).getUTCDay();
  const chartWeekStartKey = shiftDateKey(chartTodayKey, -((chartWeekday + 6) % 7));
  const chartWeekEndKey = shiftDateKey(chartWeekStartKey, 6);
  const chartQueryFrom = dateKeyStart(shiftDateKey(chartWeekStartKey, -1));
  const chartQueryTo = dateKeyStart(shiftDateKey(chartWeekEndKey, 2));
  const chartBranchTimezones = new Map(branches.map((branch) => [branch.id, branch.timezone || chartTimezone]));
  const followUpDayScopes = branches.map((branch) => {
    const todayKey = dateKeyInTimezone(now, branch.timezone);
    const todayStart = dateKeyStart(todayKey);
    const tomorrowStart = dateKeyStart(shiftDateKey(todayKey, 1));
    const weekEnd = dateKeyStart(shiftDateKey(todayKey, 8));
    return { branch, todayKey, todayStart, tomorrowStart, weekEnd, rangeStart: from, rangeEnd: to, rangeUpcomingStart: new Date(Math.max(from.getTime(), now.getTime())) };
  });

  const queryJobs = branchIds.length ? [
    prisma.lead.count({ where: leadScope }),
    prisma.lead.count({ where: { ...leadScope, ...periodScope } }),
    prisma.lead.count({ where: { ...selectedLeadScope, stage: "HOT" } }),
    prisma.lead.count({ where: { ...selectedLeadScope, stage: "WARM" } }),
    prisma.lead.count({ where: { ...selectedLeadScope, stage: "COLD" } }),
    prisma.lead.count({ where: { ...selectedLeadScope, stage: "CLOSED" } }),
    prisma.lead.count({ where: { ...selectedLeadScope, status: "CONVERTED" } }),
    prisma.lead.count({ where: { ...selectedLeadScope, stage: "HOT", status: { notIn: ["CONVERTED", "CLOSED", "LOST_LEAD"] } } }),
    prisma.lead.count({ where: { ...selectedLeadScope, stage: "HOT", status: { not: "CONVERTED" }, admissionStatus: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.branchStudent.count({ where: { branchId: { in: branchIds }, sourceLeadId: { not: null }, sourceLead: { is: { assignedToId: userId, deletedAt: null, status: "CONVERTED" } }, admissionDate: { not: "" }, createdAt: { gte: from, lte: to } } }),
    prisma.lead.findMany({ where: { ...leadScope, createdAt: { gte: chartQueryFrom, lt: chartQueryTo } }, select: { createdAt: true, branchId: true } }),
    prisma.branchStudent.findMany({ where: { branchId: { in: branchIds }, sourceLeadId: { not: null }, sourceLead: { is: { assignedToId: userId, deletedAt: null, status: "CONVERTED" } }, admissionDate: { not: "" }, createdAt: { gte: chartQueryFrom, lt: chartQueryTo } }, select: { createdAt: true, branchId: true } }),
    prisma.lead.groupBy({ by: ["leadSource"], where: leadScope, _count: { _all: true } }),
    prisma.leadActivity.findMany({
      where: { lead: { is: leadScope }, createdAt: { gte: from, lte: to }, action: { notIn: ["REMINDER_LOOP_ACTIVATED", "REMINDER_LOOP_STOPPED", "DAILY_REMINDER_GENERATED"] } },
      include: { lead: { select: { id: true, leadId: true, studentName: true, branch: { select: { branchName: true } } }, }, createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" }, take: 12,
    }),
    ...followUpDayScopes.flatMap(({ branch, todayStart, tomorrowStart, weekEnd, rangeStart, rangeEnd, rangeUpcomingStart }) => [
      prisma.lead.count({ where: { ...activeFollowUpScope, branchId: branch.id, nextFollowUpDate: { gte: rangeStart, lte: rangeEnd } } }),
      prisma.lead.count({ where: { ...activeFollowUpScope, branchId: branch.id, nextFollowUpDate: { gte: rangeStart, lte: rangeEnd, lt: now } } }),
      prisma.lead.count({ where: { ...activeFollowUpScope, branchId: branch.id, nextFollowUpDate: { gte: rangeUpcomingStart, lte: rangeEnd } } }),
      prisma.lead.count({ where: { ...selectedLeadScope, branchId: branch.id, nextFollowUpDate: null } }),
    ]),
  ] : [];
  const results = await Promise.all(queryJobs);
  let [totalLeads, newLeads, hotLeads, warmLeads, coldLeads, closedLeads, convertedLeads, expectedAdmissions, pendingAdmissions, admissions, leadsByDate, admissionsByDate, leadSourceGroups, activityRows] = results;
  let followUpsDueToday = 0;
  let overdueFollowUps = 0;
  let upcomingFollowUpsCount = 0;
  let leadsWithoutFollowUp = 0;
  let resultIndex = 14;
  for (let index = 0; index < followUpDayScopes.length; index += 1) {
    followUpsDueToday += results[resultIndex++];
    overdueFollowUps += results[resultIndex++];
    upcomingFollowUpsCount += results[resultIndex++];
    leadsWithoutFollowUp += results[resultIndex++];
  }

  const chartBuckets = new Map();
  const rangeDays = 7;
  const bucketDays = 1;
  const addChartValue = (dateValue, branchId, field) => {
    const dateKey = dateKeyInTimezone(dateValue, chartBranchTimezones.get(branchId) || chartTimezone);
    if (dateKey < chartWeekStartKey || dateKey > chartWeekEndKey) return;
    const bucket = chartBuckets.get(dateKey) || { date: dateKey, leads: 0, admissions: 0 };
    bucket[field] += 1;
    chartBuckets.set(dateKey, bucket);
  };
  (leadsByDate || []).forEach(({ createdAt, branchId: leadBranchId }) => addChartValue(createdAt, leadBranchId, "leads"));
  (admissionsByDate || []).forEach(({ createdAt, branchId: admissionBranchId }) => addChartValue(createdAt, admissionBranchId, "admissions"));
  const chart = [];
  for (let offset = 0; offset < rangeDays; offset += bucketDays) {
    const bucketDate = shiftDateKey(chartWeekStartKey, offset);
    chart.push(chartBuckets.get(bucketDate) || { date: bucketDate, endDate: bucketDate, leads: 0, admissions: 0 });
  }
  const upcomingFollowUps = branchIds.length
    ? (await Promise.all(followUpDayScopes.map(async ({ branch, todayStart, weekEnd }) => prisma.lead.findMany({
      where: { ...activeFollowUpScope, branchId: branch.id, nextFollowUpDate: { gte: todayStart, lt: weekEnd } },
      select: { id: true, leadId: true, studentName: true, phoneNumber: true, stage: true, nextFollowUpDate: true, nextFollowUpTime: true, branch: { select: { id: true, branchName: true } }, course: { select: { name: true } } },
      orderBy: [{ nextFollowUpDate: "asc" }, { nextFollowUpTime: "asc" }],
      take: 12,
    })))).flat().sort((left, right) => {
      const dateCompare = new Date(left.nextFollowUpDate).getTime() - new Date(right.nextFollowUpDate).getTime();
      if (dateCompare) return dateCompare;
      return String(left.nextFollowUpTime || "").localeCompare(String(right.nextFollowUpTime || ""));
    }).slice(0, 8).map((lead) => ({ ...lead, nextFollowUpTimeLabel: followUpTimeLabel(lead.nextFollowUpTime) }))
    : [];

  const branchOverview = await Promise.all(branches.map(async (branch) => {
    const scope = { ...selectedLeadScope, branchId: branch.id };
    const [branchTotal, branchHot, branchWarm, branchCold, branchConverted, branchAdmissions] = await Promise.all([
      prisma.lead.count({ where: scope }),
      prisma.lead.count({ where: { ...scope, stage: "HOT" } }),
      prisma.lead.count({ where: { ...scope, stage: "WARM" } }),
      prisma.lead.count({ where: { ...scope, stage: "COLD" } }),
      prisma.lead.count({ where: { ...scope, status: "CONVERTED" } }),
      prisma.branchStudent.count({ where: { branchId: branch.id, sourceLeadId: { not: null }, sourceLead: { is: { assignedToId: userId, deletedAt: null, status: "CONVERTED" } }, admissionDate: { not: "" }, createdAt: { gte: from, lte: to } } }),
    ]);
    return { branchId: branch.branchId, branchName: branch.branchName, totalLeads: branchTotal, hotLeads: branchHot, warmLeads: branchWarm, coldLeads: branchCold, admissionsCompleted: branchAdmissions, convertedLeads: branchConverted, conversionRate: branchTotal ? Number(((branchConverted / branchTotal) * 100).toFixed(1)) : 0 };
  }));

  const sourceBreakdown = (leadSourceGroups || []).map(({ leadSource, _count }) => ({ source: clean(leadSource) || "Unspecified", count: _count._all })).sort((left, right) => right.count - left.count);
  const conversionRate = newLeads ? Number(((convertedLeads / newLeads) * 100).toFixed(1)) : 0;
  const recentActivities = (activityRows || []).map((activity) => {
    const previous = activity.previousValue && typeof activity.previousValue === "object" ? activity.previousValue : {};
    const next = activity.newValue && typeof activity.newValue === "object" ? activity.newValue : {};
    let detail = "";
    if (previous.stage && next.stage && previous.stage !== next.stage) detail = `${previous.stage} → ${next.stage}`;
    else if (next.nextFollowUpDate) detail = `Follow-up: ${dateOnlyKey(next.nextFollowUpDate)}${next.nextFollowUpTime ? ` · ${followUpTimeLabel(next.nextFollowUpTime) || next.nextFollowUpTime}` : ""}`;
    else if (next.callStatus) detail = `Call status: ${clean(next.callStatus).replaceAll("_", " ")}`;
    return { id: activity.id, action: activity.action, title: dashboardActivityTitle(activity.action), detail, leadId: activity.lead.leadId, studentName: activity.lead.studentName, branchName: activity.lead.branch?.branchName || "", updatedBy: activity.createdBy?.fullName || "Sales Admin", createdAt: activity.createdAt };
  });

  return {
    data: {
      profile,
      scope: { branchIds },
      range: { from, to },
      cards: { newLeads, totalLeads, hotLeads, warmLeads, coldLeads, closedLeads, admissionsCompleted: admissions, convertedLeads, conversionRate, expectedAdmissions, pendingAdmissions, followUpsDueToday, overdueFollowUps },
      chart,
      leadStatusChart: [{ stage: "HOT", count: hotLeads }, { stage: "WARM", count: warmLeads }, { stage: "COLD", count: coldLeads }, { stage: "CLOSED", count: closedLeads }],
      conversionDetails: { totalLeads: newLeads, convertedLeads, notConvertedLeads: Math.max(0, newLeads - convertedLeads), conversionRate, admissionsCompleted: admissions, expectedAdmissions },
      followUps: { upcoming: upcomingFollowUps, dueToday: followUpsDueToday, overdue: overdueFollowUps, nextSevenDays: upcomingFollowUpsCount, withoutSchedule: leadsWithoutFollowUp },
      leadSources: sourceBreakdown,
      branchOverview,
      recentActivities,
    },
  };
}
function salesAdminReminderDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function checkPendingHotAdmissionReminderOnce(actorOrUserId) {
  const actor = typeof actorOrUserId === "string" ? { userId: actorOrUserId, role: "SALES_ADMIN" } : (actorOrUserId || {});
  const userId = actor.userId;
  const role = String(actor.role || "").toUpperCase();
  const branchIds = role === "BRANCH_ADMIN"
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
    const reminderKey = { salesAdminId_notificationType_reminderDate: { salesAdminId: userId, notificationType: "PENDING_HOT_ADMISSIONS", reminderDate } };
    const existing = await tx.salesAdminAdmissionReminder.findUnique({ where: reminderKey, select: { notificationId: true } });
    if (!students.length) {
      if (!existing?.notificationId) return { notification: null, created: false, updated: false, removed: false };
      const deleted = await tx.notification.deleteMany({ where: { id: existing.notificationId, kind: "PENDING_STUDENT_ADMISSION_REMINDER", targetUserId: userId, requestDescription: notificationDescription } });
      if (deleted.count) await tx.salesAdminAdmissionReminder.update({ where: reminderKey, data: { notificationId: null } });
      return { notification: null, created: false, updated: false, removed: deleted.count > 0 };
    }

    const studentDetails = students.map((student) => {
      const identifier = student.studentId ? `Student ID: ${student.studentId}` : `Lead ID: ${student.leadId}`;
      return `• ${identifier} | Name: ${student.studentName}`;
    }).join("\n");
    const message = `You have ${students.length} HOT lead${students.length === 1 ? "" : "s"} whose student admissions are still pending.\n\nPending students:\n${studentDetails}\n\nPlease review the list and complete the admission process.`;
    const claim = await tx.salesAdminAdmissionReminder.createMany({ data: [{ salesAdminId: userId, notificationType: "PENDING_HOT_ADMISSIONS", reminderDate }], skipDuplicates: true });
    if (existing?.notificationId) {
      const existingNotification = await tx.notification.findUnique({ where: { id: existing.notificationId }, select: { id: true, message: true, kind: true, targetUserId: true, requestDescription: true } });
      if (existingNotification?.kind === "PENDING_STUDENT_ADMISSION_REMINDER" && existingNotification.targetUserId === userId && existingNotification.requestDescription === notificationDescription) {
        const updated = existingNotification.message !== message;
        const notification = updated
          ? await tx.notification.update({ where: { id: existingNotification.id }, data: { message, read: false, readAt: null } })
          : existingNotification;
        return { notification, created: false, updated, removed: false };
      }
    }
    if (!claim.count && !existing) return { notification: null, created: false };
    const created = await tx.notification.create({ data: {
      kind: "PENDING_STUDENT_ADMISSION_REMINDER",
      tone: "blue",
      title: "Good Morning! Pending HOT Student Admissions",
      message,
      actionLabel: "View Pending Admissions",
      targetUserId: userId,
      targetBranchId: role === "BRANCH_ADMIN" ? actor.branchId : null,
      targetBranchName: role === "BRANCH_ADMIN" ? (students[0]?.branchName || leads[0]?.branch?.branchName || null) : null,
      createdBy: userId,
      requestDescription: notificationDescription,
    } });
    await tx.salesAdminAdmissionReminder.update({ where: reminderKey, data: { notificationId: created.id } });
    return { notification: created, created: true, updated: false, removed: false };
  });
  return { count: students.length, students, notificationCreated: result.created, notificationUpdated: result.updated || false, notificationRemoved: result.removed || false, notification: result.notification };
}

async function checkPendingHotAdmissionReminder(actorOrUserId) {
  return withDatabaseRetry(() => checkPendingHotAdmissionReminderOnce(actorOrUserId));
}

function admissionListInclude() {
  return {
    branch: { select: { id: true, branchId: true, branchName: true, status: true, adminUserId: true } },
    course: { select: { id: true, name: true, courseCode: true, status: true, mode: true } },
    assignedTo: { select: { id: true, fullName: true } },
    convertedStudent: { select: {
      id: true,
      studentId: true,
      studentName: true,
      mobileNumber: true,
      emailAddress: true,
      admissionDate: true,
      courseName: true,
      facultyName: true,
      batchName: true,
      batchTiming: true,
      courseMode: true,
      classSchedule: true,
    } },
  };
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

async function listAdmissionBatchesByBranches(branchIds = []) {
  const ids = [...new Set(branchIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await prisma.branchBatch.findMany({
    where: { branchId: { in: ids }, status: "ACTIVE" },
    select: {
      id: true,
      batchId: true,
      branchId: true,
      courseId: true,
      courseName: true,
      facultyId: true,
      facultyName: true,
      facultyEmail: true,
      batchName: true,
      batchTiming: true,
      mode: true,
      weekType: true,
      totalSeats: true,
      cycles: {
        orderBy: { cycleNumber: "desc" },
        take: 1,
        select: {
          id: true,
          cycleNumber: true,
          cycleName: true,
          status: true,
          completedAt: true,
          freezeUntil: true,
          enrollments: {
            where: { status: "ACTIVE", branchStudent: { recordStatus: "ACTIVE", discontinuationRequests: { none: { status: "APPROVED" } } } },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const byBranch = new Map();
  rows.forEach((row) => {
    const cycle = row.cycles?.[0] || null;
    const branchRows = byBranch.get(row.branchId) || [];
    branchRows.push({
      id: row.id,
      batchId: row.batchId,
      branchId: row.branchId,
      courseId: row.courseId,
      courseName: row.courseName,
      facultyId: row.facultyId,
      facultyName: row.facultyName,
      facultyEmail: row.facultyEmail,
      batchName: row.batchName,
      batchTiming: row.batchTiming,
      mode: row.mode,
      weekType: row.weekType,
      totalSeats: row.totalSeats,
      status: "ACTIVE",
      currentCycleId: cycle?.id || null,
      currentCycleNumber: cycle?.cycleNumber || null,
      currentCycleName: cycle?.cycleName || null,
      currentCycleStatus: cycle?.status || null,
      completedAt: cycle?.completedAt || null,
      freezeUntil: cycle?.freezeUntil || null,
      completionStatus: cycle?.status === "COMPLETED" ? "COMPLETED" : "AVAILABLE",
      activeStudentCount: cycle?.enrollments?.length || 0,
    });
    byBranch.set(row.branchId, branchRows);
  });
  return byBranch;
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
    prisma.lead.findMany({ where, include: admissionListInclude(), orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.lead.count({ where: allHotWhere }),
    prisma.lead.count({ where: { ...allHotWhere, status: { not: "CONVERTED" }, admissionStatus: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.lead.count({ where: { ...allHotWhere, status: "CONVERTED" } }),
    prisma.lead.aggregate({ where: allHotWhere, _sum: { paymentAmount: true } }),
    prisma.branchCourse.findMany({ where: { branchId: { in: scopedBranchIds }, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    isBranchAdmin ? prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true } }) : Promise.resolve(null),
  ]);
  const batchesByBranch = await listAdmissionBatchesByBranches([...new Set(rows.map((lead) => lead.branchId).filter(Boolean))]);
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
    summary: { hotLeads, pendingAdmissions, completedAdmissions, totalCollections: Number(collections._sum.paymentAmount || 0) },
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

export { createSalesAdmin, listSalesAdmins, updateSalesAdmin, deleteSalesAdmin, resetSalesAdminPassword, getSalesAdminProfile, updateOwnSalesAdminProfile, getDashboard, listSalesAdminAdmissions, getSalesAdminAdmissionLead, getSalesAdminAvailableBatches, getSalesAdminStudentFeeDetails, getPendingHotAdmissionReminder, startSalesAdminAdmission, convertSalesAdminLead };

