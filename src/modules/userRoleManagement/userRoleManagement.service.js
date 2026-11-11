import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import { sendBranchCredentialsEmail, sendEmailChangeVerificationEmail } from "../../common/services/resendEmail.js";
import { createSalesAdmin } from "../salesAdmin/salesAdmin.service.js";
import { createBranch } from "../branches/branches.service.js";
import { BRANCH_ROLE_ACCESS, BRANCH_ROLE_ACCESS_LABELS, parseBranchRoleAccess } from "../../common/constants/branchRoleAccess.js";
import { createNotification } from "../notifications/notifications.service.js";

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
  if (normalizedAccountType && !["BRANCH_ADMIN", "SALES_ADMIN"].includes(normalizedAccountType)) throw new AppError("Invalid account type filter", 400);
  const users = await prisma.user.findMany({
    where: { role: { in: ["BRANCH_ADMIN", "SALES_ADMIN"] }, ...(normalizedAccountType === "SALES_ADMIN" ? {} : { active: true }) },
    orderBy: { fullName: "asc" },
    select: { id: true, userCode: true, fullName: true, email: true, phone: true, country: true, state: true, city: true, address: true, role: true, active: true, status: true, managedBranch: { select: { id: true, branchId: true, branchName: true, branchAdminName: true, branchEmail: true, branchPhone: true, branchCountryCode: true, branchCountry: true, branchStateCode: true, branchState: true, branchCity: true, branchAddress: true, status: true, roleAccess: true, adminUserId: true } }, salesAdminBranches: { select: { branchId: true, branch: { select: { id: true, branchId: true, branchName: true, branchCountry: true, branchState: true, branchCity: true, branchAddress: true, status: true } } } } },
  });
  return users.map((user) => {
    const isCombined = user.role === "BRANCH_ADMIN" && user.managedBranch?.roleAccess === "BRANCH_ADMIN_SALES_ADMIN";
    return { id: user.id, userCode: user.userCode, fullName: user.fullName, email: user.email, phone: user.phone, country: user.country, state: user.state, city: user.city, address: user.address, role: user.role, active: user.active, status: user.status || (user.active ? "ACTIVE" : "INACTIVE"), accountType: isCombined ? "BRANCH_ADMIN_SALES_ADMIN" : user.role, managedBranch: user.managedBranch, assignedBranchIds: user.salesAdminBranches.map((item) => item.branchId), assignedBranches: user.salesAdminBranches.map((item) => ({ ...item.branch, salesAdminStatus: user.status || (user.active ? "ACTIVE" : "INACTIVE"), salesAdminActive: user.active })) };
  }).filter((user) => !normalizedAccountType || (normalizedAccountType === "BRANCH_ADMIN" ? ["BRANCH_ADMIN", "BRANCH_ADMIN_SALES_ADMIN"].includes(user.accountType) : user.accountType === "SALES_ADMIN"));
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

export async function replaceBranchAdmin(branchRecordId, payload = {}, actor = {}) {
  const fullName = required(payload.fullName || payload.name, "Branch Admin name");
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(fullName)) throw new AppError("Branch Admin name contains invalid characters", 400);
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const accountType = normalizeAccountType(payload.accountType || "BRANCH_ADMIN");
  if (!["BRANCH_ADMIN", "BRANCH_ADMIN_SALES_ADMIN"].includes(accountType)) throw new AppError("Replacement account must be a Branch Admin", 400);
  const actorId = actor?.userId || actor?.id || null;
  const temporaryPassword = `${crypto.randomBytes(9).toString("base64url")}Aa1!`;
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  const result = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUnique({
      where: { id: branchRecordId },
      include: { adminUser: { select: { id: true, userCode: true, fullName: true, email: true, role: true, active: true } } },
    });
    if (!branch) throw new AppError("Branch not found", 404);
    const duplicate = await tx.user.findFirst({
      where: { id: { not: branch.adminUserId || "" }, OR: [{ email: { equals: email, mode: "insensitive" } }, { phone }] },
      select: { email: true, phone: true },
    });
    if (duplicate?.email?.toLowerCase() === email) throw new AppError("Email address is already in use", 409);
    if (duplicate?.phone === phone) throw new AppError("Phone number is already in use", 409);
    const conflictingBranch = await tx.branch.findFirst({ where: { id: { not: branch.id }, OR: [{ branchEmail: { equals: email, mode: "insensitive" } }, { branchPhone: phone }] }, select: { id: true } });
    if (conflictingBranch) throw new AppError("Email or phone number is already used by another branch", 409);

    if (branch.adminUserId) {
      await tx.user.update({
        where: { id: branch.adminUserId },
        data: { active: false, refreshTokenVersion: { increment: 1 }, userCode: `ARCHIVED-${branch.branchId}-${Date.now()}`, updatedBy: actorId },
      });
    }
    const newUser = await tx.user.create({
      data: {
        userCode: branch.branchId,
        fullName,
        email,
        phone,
        country: text(payload.country) || null,
        state: text(payload.state) || null,
        city: text(payload.city) || null,
        address: text(payload.address) || null,
        role: "BRANCH_ADMIN",
        active: true,
        passwordHash,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: { id: true, userCode: true, fullName: true, email: true, role: true },
    });
    await tx.passwordResetToken.create({ data: { userId: newUser.id, tokenHash, expiresAt, createdBy: actorId } });
    const updatedBranch = await tx.branch.update({
      where: { id: branch.id },
      data: {
        adminUserId: newUser.id,
        branchAdminName: fullName,
        branchEmail: email,
        branchPhone: phone,
        branchCountry: text(payload.country) || branch.branchCountry,
        branchState: text(payload.state) || branch.branchState,
        branchCity: text(payload.city) || branch.branchCity,
        branchAddress: text(payload.address) || branch.branchAddress,
        roleAccess: accountType === "BRANCH_ADMIN_SALES_ADMIN" ? "BRANCH_ADMIN_SALES_ADMIN" : "BRANCH_ADMIN_ONLY",
        updatedBy: actorId,
      },
      select: { id: true, branchId: true, branchName: true, branchEmail: true, roleAccess: true, adminUserId: true },
    });
    await tx.adminChangeHistory.create({
      data: {
        branchId: branch.id,
        previousAdminId: branch.adminUserId,
        newAdminId: newUser.id,
        previousAccountType: branch.roleAccess === "BRANCH_ADMIN_SALES_ADMIN" ? "BRANCH_ADMIN_SALES_ADMIN" : "BRANCH_ADMIN",
        newAccountType: accountType,
        oldEmail: branch.branchEmail,
        newEmail: email,
        changedBy: actorId,
        operationType: "ADMIN_REPLACED",
        metadata: { previousAdminActive: Boolean(branch.adminUser?.active) },
      },
    });
    return { branch: updatedBranch, user: newUser, previousAdmin: branch.adminUser, resetToken, temporaryPassword };
  });

  let invitationSent = false;
  try {
    await sendBranchCredentialsEmail({ to: email, fullName, temporaryPassword, resetToken, branchId: result.branch.branchId, branchName: result.branch.branchName, roleAccess: result.branch.roleAccess });
    invitationSent = true;
  } catch (error) {
    console.warn("Replacement Branch Admin invitation failed", error);
  }
  void createNotification({
    kind: "BRANCH_ADMIN_REPLACED",
    tone: "blue",
    title: "Branch Admin Replaced",
    message: `${fullName} is now the Branch Admin for ${result.branch.branchName}.`,
    actionLabel: "View Branch",
    createdBy: actorId,
    targetUserId: result.user.id,
    targetBranchId: result.branch.branchId,
    targetBranchName: result.branch.branchName,
    targetBranchEmail: result.branch.branchEmail,
  }).catch((error) => console.warn("Branch admin replacement notification failed", error));
  return { invitationSent, branch: result.branch, user: result.user, previousAdmin: result.previousAdmin ? { id: result.previousAdmin.id, email: result.previousAdmin.email } : null };
}

export async function requestEmailChange(userId, payload = {}, actor = {}) {
  const newEmail = normalizeEmail(payload.email);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true, role: true } });
  if (!user || !["BRANCH_ADMIN", "SALES_ADMIN"].includes(user.role)) throw new AppError("Administrator account not found", 404);
  if (user.email.toLowerCase() === newEmail) return { verificationRequired: false, email: user.email };
  const duplicate = await prisma.user.findFirst({ where: { id: { not: user.id }, email: { equals: newEmail, mode: "insensitive" } }, select: { id: true } });
  if (duplicate) throw new AppError("Email address is already in use", 409);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const temporaryPassword = `${crypto.randomBytes(9).toString("base64url")}Aa1!`;
  const temporaryPasswordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash: resetTokenHash, expiresAt: resetExpiresAt } = createResetTokenArtifacts();
  await prisma.$transaction(async (tx) => {
    await tx.emailChangeVerification.deleteMany({ where: { userId: user.id, verifiedAt: null } });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null, createdBy: "EMAIL_CHANGE" } });
    await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: resetTokenHash, expiresAt: resetExpiresAt, createdBy: "EMAIL_CHANGE" } });
    await tx.emailChangeVerification.create({ data: { userId: user.id, oldEmail: user.email, newEmail, tokenHash, expiresAt, temporaryPasswordHash, createdBy: actor?.userId || actor?.id || null } });
  });
  try {
    await sendEmailChangeVerificationEmail({ to: newEmail, fullName: user.fullName, verificationToken: token, temporaryPassword, resetToken, resetExpiryMinutes: config.credentialResetTokenExpiresMinutes });
  } catch (error) {
    await prisma.emailChangeVerification.deleteMany({ where: { userId: user.id, tokenHash } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash: resetTokenHash } });
    throw new AppError("Verification email could not be sent", error?.status || 502);
  }
  return { verificationRequired: true, email: newEmail };
}

export async function verifyEmailChange(token) {
  const tokenHash = crypto.createHash("sha256").update(String(token || "").trim()).digest("hex");
  const request = await prisma.emailChangeVerification.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, fullName: true, email: true, role: true } } } });
  if (!request || request.expiresAt.getTime() < Date.now()) throw new AppError("Email verification link is invalid or expired", 400);
  if (request.verifiedAt) {
    const { resetToken, tokenHash: resetTokenHash, expiresAt: resetExpiresAt } = createResetTokenArtifacts();
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: request.userId, usedAt: null, createdBy: "EMAIL_CHANGE" } });
      await tx.passwordResetToken.create({ data: { userId: request.userId, tokenHash: resetTokenHash, expiresAt: resetExpiresAt, createdBy: "EMAIL_CHANGE" } });
    });
    return { verified: true, email: request.user.email, resetToken };
  }
  const { resetToken: verifiedResetToken, tokenHash: verifiedResetTokenHash, expiresAt: verifiedResetExpiresAt } = createResetTokenArtifacts();
  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.user.findFirst({ where: { id: { not: request.userId }, email: { equals: request.newEmail, mode: "insensitive" } }, select: { id: true } });
    if (duplicate) throw new AppError("Email address is already in use", 409);
    const branch = await tx.branch.findUnique({ where: { adminUserId: request.userId }, select: { id: true, branchEmail: true, branchName: true } });
    const assignedBranches = request.user.role === "SALES_ADMIN"
      ? await tx.salesAdminBranch.findMany({ where: { salesAdminId: request.userId }, select: { branch: { select: { id: true, branchName: true } } } })
      : [];
    const user = await tx.user.update({ where: { id: request.userId }, data: { email: request.newEmail, ...(request.temporaryPasswordHash ? { passwordHash: request.temporaryPasswordHash, passwordChangedAt: null } : {}), refreshTokenVersion: { increment: 1 }, updatedBy: request.userId }, select: { id: true, fullName: true, email: true, role: true } });
    if (branch) await tx.branch.update({ where: { id: branch.id }, data: { branchEmail: request.newEmail, updatedBy: request.userId } });
    await tx.emailChangeVerification.update({ where: { id: request.id }, data: { verifiedAt: new Date() } });
    await tx.passwordResetToken.deleteMany({ where: { userId: request.userId, usedAt: null, createdBy: "EMAIL_CHANGE" } });
    await tx.passwordResetToken.create({ data: { userId: request.userId, tokenHash: verifiedResetTokenHash, expiresAt: verifiedResetExpiresAt, createdBy: "EMAIL_CHANGE" } });
    const historyBranches = branch ? [{ id: branch.id, branchName: branch.branchName }] : assignedBranches.map(({ branch: assignedBranch }) => assignedBranch);
    if (historyBranches.length) await tx.adminChangeHistory.createMany({ data: historyBranches.map((historyBranch) => ({ branchId: historyBranch.id, previousAdminId: request.userId, newAdminId: request.userId, oldEmail: request.oldEmail, newEmail: request.newEmail, operationType: "EMAIL_VERIFIED", changedBy: request.createdBy, metadata: { verified: true, accountRole: request.user.role } })) });
    return { user, branch: branch || historyBranches[0] || null };
  });
  void createNotification({ kind: "EMAIL_CHANGED", tone: "green", title: "Email Address Updated", message: `Your CISPRO login email is now ${result.user.email}.`, actionLabel: "View Account", targetUserId: result.user.id, targetBranchId: result.branch?.id, targetBranchName: result.branch?.branchName }).catch((error) => console.warn("Email change notification failed", error));
  return { verified: true, email: result.user.email, resetToken: verifiedResetToken };
}

export async function listAdminChangeHistory(branchRecordId) {
  const branch = await prisma.branch.findUnique({ where: { id: branchRecordId }, select: { id: true } });
  if (!branch) throw new AppError("Branch not found", 404);
  return prisma.adminChangeHistory.findMany({
    where: { branchId: branchRecordId },
    orderBy: { createdAt: "desc" },
    include: {
      previousAdmin: { select: { id: true, userCode: true, fullName: true, email: true } },
      newAdmin: { select: { id: true, userCode: true, fullName: true, email: true } },
      changedByUser: { select: { id: true, userCode: true, fullName: true, email: true } },
    },
  });
}

export async function listUserChangeHistory(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, managedBranch: { select: { id: true } }, salesAdminBranches: { select: { branchId: true } } } });
  if (!user || !["BRANCH_ADMIN", "SALES_ADMIN"].includes(user.role)) throw new AppError("Administrator account not found", 404);
  const branchIds = [user.managedBranch?.id, ...user.salesAdminBranches.map(({ branchId }) => branchId)].filter(Boolean);
  const history = await prisma.adminChangeHistory.findMany({
    where: { OR: [{ previousAdminId: userId }, { newAdminId: userId }, ...(branchIds.length ? [{ branchId: { in: branchIds } }] : [])] },
    orderBy: { createdAt: "desc" },
    include: { previousAdmin: { select: { id: true, userCode: true, fullName: true, email: true } }, newAdmin: { select: { id: true, userCode: true, fullName: true, email: true } }, changedByUser: { select: { id: true, userCode: true, fullName: true, email: true } } },
  });
  const verifiedEmailChanges = await prisma.emailChangeVerification.findMany({
    where: { userId, verifiedAt: { not: null } },
    select: { id: true, oldEmail: true, newEmail: true, verifiedAt: true, createdAt: true },
    orderBy: { verifiedAt: "desc" },
  });
  const recordedEmailChanges = new Set(history.filter((item) => item.operationType === "EMAIL_VERIFIED").map((item) => `${item.oldEmail}|${item.newEmail}`));
  const legacyEmailHistory = verifiedEmailChanges
    .filter((item) => !recordedEmailChanges.has(`${item.oldEmail}|${item.newEmail}`))
    .map((item) => ({ id: `email-change-${item.id}`, operationType: "EMAIL_VERIFIED", status: "COMPLETED", oldEmail: item.oldEmail, newEmail: item.newEmail, createdAt: item.verifiedAt || item.createdAt }));
  return [...history, ...legacyEmailHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
