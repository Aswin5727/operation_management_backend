import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { sendBranchCredentialsEmail } from "../../common/services/resendEmail.js";
import { createSalesAdmin } from "../salesAdmin/salesAdmin.service.js";
import { createBranch } from "../branches/branches.service.js";
import { BRANCH_ROLE_ACCESS, BRANCH_ROLE_ACCESS_LABELS, parseBranchRoleAccess } from "../../common/constants/branchRoleAccess.js";

const ACCOUNT_TYPES = new Set(["BRANCH_ADMIN", "BRANCH_ADMIN_SALES_ADMIN", "SALES_ADMIN"]);
const text = (value) => String(value ?? "").trim();
const required = (value, label) => { const result = text(value); if (!result) throw new AppError(`${label} is required`, 400); return result; };
const normalizeEmail = (value) => { const email = required(value, "Email address").toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError("Enter a valid email address", 400); return email; };
const normalizePhone = (value) => { const phone = required(value, "Phone number"); if (!/^\d{10}$/.test(phone)) throw new AppError("Phone number must contain exactly 10 digits", 400); return phone; };
const normalizeAccountType = (value) => { const accountType = text(value).toUpperCase(); if (!ACCOUNT_TYPES.has(accountType)) throw new AppError("Select a valid account type", 400); return accountType; };

function createResetTokenArtifacts() {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.credentialResetTokenExpiresMinutes * 60 * 1000);
  return { resetToken, tokenHash, expiresAt };
}

async function assertUniqueUser(tx, { email, phone, userCode }) {
  const duplicate = await tx.user.findFirst({ where: { OR: [{ email: { equals: email, mode: "insensitive" } }, { phone }, ...(userCode ? [{ userCode }] : [])] }, select: { email: true, phone: true } });
  if (!duplicate) return;
  if (duplicate.email?.toLowerCase() === email) throw new AppError("Email address is already in use", 409);
  if (duplicate.phone === phone) throw new AppError("Phone number is already in use", 409);
  throw new AppError("User ID is already in use", 409);
}

async function nextUnassignedBranchAdminCode(tx) {
  const users = await tx.user.findMany({ where: { userCode: { startsWith: "CISADMIN" } }, select: { userCode: true } });
  const highest = users.reduce((max, user) => {
    const match = String(user.userCode || "").match(/^CISADMIN(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `CISADMIN${String(highest + 1).padStart(3, "0")}`;
}
async function createBranchAccount({ accountType, payload, actor }) {
  const branchIds = Array.isArray(payload.branchIds) ? payload.branchIds.map(text).filter(Boolean) : [text(payload.branchId)].filter(Boolean);
  if (branchIds.length > 1) throw new AppError("Only one branch can be assigned to a Branch Admin account", 400);
  const fullName = required(payload.fullName || payload.name, "Full name");
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(fullName)) throw new AppError("Full name contains invalid characters", 400);
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const actorId = actor?.userId || actor?.id || null;
  const temporaryPassword = `${crypto.randomBytes(9).toString("base64url")}Aa1!`;
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  const result = await prisma.$transaction(async (tx) => {
    const branch = branchIds.length
      ? await tx.branch.findFirst({ where: { OR: [{ id: branchIds[0] }, { branchId: branchIds[0] }] }, select: { id: true, branchId: true, branchName: true, status: true, adminUserId: true } })
      : null;
    if (branch && String(branch.status).toUpperCase() !== "ACTIVE") throw new AppError("Only an active branch can receive an administrator", 400);
    if (branch?.adminUserId) throw new AppError("This branch already has a Branch Admin. Use the admin replacement flow.", 409);
    if (branch) {
      const conflictingBranch = await tx.branch.findFirst({ where: { id: { not: branch.id }, OR: [{ branchEmail: { equals: email, mode: "insensitive" } }, { branchPhone: phone }] }, select: { id: true } });
      if (conflictingBranch) throw new AppError("Email or phone number is already used by another branch", 409);
    }
    const userCode = branch?.branchId || await nextUnassignedBranchAdminCode(tx);
    await assertUniqueUser(tx, { email, phone, userCode });

    const user = await tx.user.create({ data: { userCode, fullName, email, phone, country: text(payload.country) || null, state: text(payload.state) || null, city: text(payload.city) || null, address: text(payload.address) || null, role: "BRANCH_ADMIN", active: true, passwordHash, passwordChangedAt: null, createdBy: actorId, updatedBy: actorId }, select: { id: true, userCode: true, fullName: true, email: true, role: true } });
    await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt, createdBy: actorId } });
    const updatedBranch = branch
      ? await tx.branch.update({ where: { id: branch.id }, data: { adminUserId: user.id, branchAdminName: fullName, branchEmail: email, branchPhone: phone, roleAccess: accountType === "BRANCH_ADMIN_SALES_ADMIN" ? "BRANCH_ADMIN_SALES_ADMIN" : "BRANCH_ADMIN_ONLY", updatedBy: actorId }, select: { id: true, branchId: true, branchName: true, roleAccess: true } })
      : null;
    return { user, branch: updatedBranch };
  });

  let invitationSent = false;
  try {
    await sendBranchCredentialsEmail({ to: email, fullName, temporaryPassword, resetToken, branchId: result.branch?.branchId || "", branchName: result.branch?.branchName || "Branch access pending", roleAccess: result.branch?.roleAccess || (accountType === "BRANCH_ADMIN_SALES_ADMIN" ? "BRANCH_ADMIN_SALES_ADMIN" : "BRANCH_ADMIN_ONLY") });
    invitationSent = true;
  } catch (error) {
    console.warn("Unified branch account invitation failed", error);
  }
  return { accountType, invitationSent, accessAssigned: Boolean(result.branch), user: result.user, branch: result.branch };
}

async function createBranchRoleAccount({ accountType, payload, actor }) {
  const branchPayload = {
    branchId: required(payload.branchId, "Branch ID").toUpperCase(),
    branchName: required(payload.branchName, "Branch name"),
    branchAdminName: required(payload.branchAdminName || payload.fullName, "Branch admin name"),
    branchEmail: payload.branchEmail || payload.email,
    branchPhone: payload.branchPhone || payload.phone,
    branchCountryCode: payload.branchCountryCode,
    branchCountry: payload.branchCountry || payload.country,
    branchStateCode: payload.branchStateCode,
    branchState: payload.branchState || payload.state,
    branchCity: payload.branchCity || payload.city,
    branchAddress: payload.branchAddress || payload.address,
    status: payload.status || "ACTIVE",
    roleAccess: payload.roleAccess || (accountType === "BRANCH_ADMIN_SALES_ADMIN" ? "BRANCH_ADMIN_SALES_ADMIN" : "BRANCH_ADMIN_ONLY"),
  };
  const branch = await createBranch(branchPayload, actor);
  return {
    accountType,
    invitationSent: true,
    accessAssigned: true,
    user: branch?.adminUser || {
      userCode: branch.branchId,
      fullName: branch.branchAdminName,
      email: branch.branchEmail,
      role: "BRANCH_ADMIN",
    },
    branch,
  };
}

export async function createUserRoleAccount(payload = {}, actor = {}) {
  const accountType = normalizeAccountType(payload.accountType);
  if (accountType === "SALES_ADMIN") {
    const result = await createSalesAdmin({ ...payload, allowUnassigned: true, branchIds: Array.isArray(payload.branchIds) ? payload.branchIds : [payload.branchId].filter(Boolean) }, actor);
    return { accountType, ...result };
  }
  if (payload.branchName || payload.branchAdminName || payload.branchEmail) return createBranchRoleAccount({ accountType, payload, actor });
  return createBranchAccount({ accountType, payload, actor });
}


export async function listBranchAccessUsers(accountType = "") {
  const normalizedAccountType = text(accountType).toUpperCase();
  if (normalizedAccountType && !["BRANCH_ADMIN", "SALES_ADMIN"].includes(normalizedAccountType)) {
    throw new AppError("Invalid account type filter", 400);
  }
  const users = await prisma.user.findMany({
    where: { role: { in: ["BRANCH_ADMIN", "SALES_ADMIN"] }, active: true },
    orderBy: { fullName: "asc" },
    select: { id: true, userCode: true, fullName: true, email: true, phone: true, role: true, managedBranch: { select: { id: true, branchId: true, branchName: true, roleAccess: true } }, salesAdminBranches: { select: { branchId: true, branch: { select: { id: true, branchId: true, branchName: true } } } } },
  });
  return users
    .map((user) => {
      const isCombinedBranchAdmin = user.role === "BRANCH_ADMIN" && user.managedBranch?.roleAccess === "BRANCH_ADMIN_SALES_ADMIN";
      const resolvedAccountType = isCombinedBranchAdmin ? "BRANCH_ADMIN_SALES_ADMIN" : user.role;
      return { id: user.id, userCode: user.userCode, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, accountType: resolvedAccountType, managedBranch: user.managedBranch, assignedBranchIds: user.salesAdminBranches.map((item) => item.branchId), assignedBranches: user.salesAdminBranches.map((item) => item.branch) };
    })
    .filter((user) => !normalizedAccountType || (normalizedAccountType === "BRANCH_ADMIN" ? ["BRANCH_ADMIN", "BRANCH_ADMIN_SALES_ADMIN"].includes(user.accountType) : user.accountType === "SALES_ADMIN"));
}

export async function assignBranchAccess(branchRecordId, payload = {}, actor = {}) {
  const userId = required(payload.userId, "User");
  const roleAccess = parseBranchRoleAccess(text(payload.roleAccess || "BRANCH_ADMIN_ONLY").toUpperCase());
  const actorId = actor?.userId || actor?.id || null;
  const result = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUnique({ where: { id: branchRecordId }, select: { id: true, branchId: true, branchName: true, status: true, adminUserId: true, branchAdminName: true, branchEmail: true, branchPhone: true, roleAccess: true } });
    if (!branch) throw new AppError("Branch not found", 404);
    if (String(branch.status).toUpperCase() !== "ACTIVE") throw new AppError("Only an active branch can receive access", 400);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, userCode: true, fullName: true, email: true, phone: true, role: true, active: true, managedBranch: { select: { id: true } } } });
    if (!user || !["BRANCH_ADMIN", "SALES_ADMIN"].includes(user.role)) throw new AppError("Select a Branch Admin or Sales Admin account", 400);
    if (!user.active) throw new AppError("Only an active account can receive branch access", 400);
    if (user.role === "SALES_ADMIN") {
      await tx.salesAdminBranch.upsert({ where: { salesAdminId_branchId: { salesAdminId: user.id, branchId: branch.id } }, create: { salesAdminId: user.id, branchId: branch.id }, update: {} });
      return { branch, user, accessType: "SALES_ADMIN" };
    }
    if (user.managedBranch && user.managedBranch.id !== branch.id) throw new AppError("This Branch Admin is already assigned to another branch", 409);
    if (branch.adminUserId && branch.adminUserId !== user.id) throw new AppError("This branch already has a Branch Admin", 409);
    const updatedBranch = await tx.branch.update({ where: { id: branch.id }, data: { adminUserId: user.id, branchAdminName: user.fullName, branchEmail: user.email, branchPhone: user.phone || branch.branchPhone, roleAccess, updatedBy: actorId }, select: { id: true, branchId: true, branchName: true, roleAccess: true, adminUserId: true } });
    return { branch: updatedBranch, user, accessType: "BRANCH_ADMIN" };
  });
  return { branch: { ...result.branch, roleAccessLabel: BRANCH_ROLE_ACCESS_LABELS[result.branch.roleAccess || BRANCH_ROLE_ACCESS.BRANCH_ADMIN_ONLY] }, user: { id: result.user.id, userCode: result.user.userCode, fullName: result.user.fullName, role: result.user.role }, accessType: result.accessType };
}
