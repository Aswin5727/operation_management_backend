import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { toSafeUser } from "../../common/utils/user.js";
import { sendPasswordResetEmail, sendSalesAdminCredentialsEmail } from "../../common/services/resendEmail.js";

const USER_SELECT = { id: true, userCode: true, fullName: true, email: true, phone: true, address: true, role: true, active: true, passwordChangedAt: true, lastLoginAt: true, createdAt: true, salesAdminBranches: { select: { branch: { select: { id: true, branchId: true, branchName: true, status: true } } } } };
const clean = (value) => String(value ?? "").trim();
const required = (value, label) => { const result = clean(value); if (!result) throw new AppError(`${label} is required`, 400); return result; };
const emailValue = (value) => { const email = required(value, "Email address").toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError("Enter a valid email address", 400); return email; };
const phoneValue = (value) => { const phone = required(value, "Phone number"); if (!/^\d{10}$/.test(phone)) throw new AppError("Phone number must contain exactly 10 digits", 400); return phone; };

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
  const email = emailValue(payload.email); const phone = phoneValue(payload.phone); const branches = await resolveBranches(payload.branchIds || payload.branches);
  const status = clean(payload.status || "ACTIVE").toUpperCase();
  if (!["ACTIVE", "INACTIVE"].includes(status)) throw new AppError("Status must be Active or Inactive", 400);
  const temporaryPassword = `${crypto.randomBytes(9).toString("base64url")}Aa1!`;
  const user = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.user.findFirst({ where: { OR: [{ email: { equals: email, mode: "insensitive" } }, { phone }] }, select: { email: true, phone: true } });
    if (duplicate?.email?.toLowerCase() === email) throw new AppError("Email address is already in use", 409);
    if (duplicate?.phone === phone) throw new AppError("Phone number is already in use", 409);
    const salesAdminId = await nextSalesAdminId(tx);
    return tx.user.create({ data: { userCode: salesAdminId, fullName, email, phone, role: "SALES_ADMIN", active: status === "ACTIVE", passwordHash: await hashPassword(temporaryPassword), passwordChangedAt: null, createdBy: auth.userId, updatedBy: auth.userId, salesAdminBranches: { create: branches.map((branch) => ({ branchId: branch.id })) } }, select: USER_SELECT });
  });
  try { const token = await issueResetToken(user.id, "CREDENTIAL_EMAIL"); await sendSalesAdminCredentialsEmail({ to: email, fullName, salesAdminId: user.userCode, temporaryPassword, branchNames: branches.map((branch) => branch.branchName), resetToken: token }); } catch (error) { await prisma.user.delete({ where: { id: user.id } }); throw new AppError("Account was not created because the activation email could not be sent", error?.status || 502); }
  return { user: toSafeUser(user), salesAdminId: user.userCode, branches: user.salesAdminBranches.map(({ branch }) => branch), invitationSent: true };
}

async function listSalesAdmins() { const users = await prisma.user.findMany({ where: { role: "SALES_ADMIN" }, orderBy: { createdAt: "desc" }, select: USER_SELECT }); return { data: users.map((user) => ({ ...toSafeUser(user), branches: user.salesAdminBranches.map(({ branch }) => branch) })) }; }

async function updateSalesAdmin(userId, payload, auth) {
  const existing = await prisma.user.findFirst({ where: { id: userId, role: "SALES_ADMIN" }, select: { id: true } });
  if (!existing) throw new AppError("Sales Admin account not found", 404);
  const fullName = required(payload.fullName || payload.name, "Sales Admin name");
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(fullName)) throw new AppError("Sales Admin name contains invalid characters", 400);
  const email = emailValue(payload.email); const phone = phoneValue(payload.phone); const status = clean(payload.status || "ACTIVE").toUpperCase();
  if (!["ACTIVE", "INACTIVE"].includes(status)) throw new AppError("Status must be Active or Inactive", 400);
  const branches = await resolveBranches(payload.branchIds || payload.branches);
  const duplicate = await prisma.user.findFirst({ where: { id: { not: userId }, OR: [{ email: { equals: email, mode: "insensitive" } }, { phone }] }, select: { email: true, phone: true } });
  if (duplicate?.email?.toLowerCase() === email) throw new AppError("Email address is already in use", 409);
  if (duplicate?.phone === phone) throw new AppError("Phone number is already in use", 409);
  const user = await prisma.$transaction(async (tx) => {
    await tx.salesAdminBranch.deleteMany({ where: { salesAdminId: userId } });
    return tx.user.update({ where: { id: userId }, data: { fullName, email, phone, active: status === "ACTIVE", updatedBy: auth.userId, salesAdminBranches: { create: branches.map((branch) => ({ branchId: branch.id })) } }, select: USER_SELECT });
  });
  return { user: toSafeUser(user), branches: user.salesAdminBranches.map(({ branch }) => branch) };
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
async function getDashboard(userId, query = {}) { const profile = await getSalesAdminProfile(userId); const allowed = profile.branches.map((branch) => branch.id); const branchId = clean(query.branchId); if (branchId && !allowed.includes(branchId)) throw new AppError("You do not have access to this branch", 403); const branchIds = branchId ? [branchId] : allowed; const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1); const to = query.to ? new Date(query.to) : new Date(); const admissions = branchIds.length ? await prisma.branchStudent.count({ where: { branchId: { in: branchIds }, admissionDate: { not: "" }, createdAt: { gte: from, lte: to } } }) : 0; return { data: { profile, scope: { branchIds }, range: { from, to }, cards: { newLeads: null, totalLeads: null, hotLeads: null, warmLeads: null, coldLeads: null, admissionsCompleted: admissions, expectedAdmissions: null }, chart: [], recentActivities: [] } }; }
export { createSalesAdmin, listSalesAdmins, updateSalesAdmin, deleteSalesAdmin, resetSalesAdminPassword, getSalesAdminProfile, getDashboard };
