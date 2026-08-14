import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { hashPassword } from "../../common/utils/password.js";
import {
  sendBranchCredentialsEmail,
} from "../../common/services/resendEmail.js";

const RECORD_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeSearchKey(value) {
  return normalizeString(value).toLowerCase();
}

function parsePage(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseLimit(value) {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 100);
}

function buildPagination({ page, limit }) {
  const safePage = parsePage(page);
  const safeLimit = parseLimit(limit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function parseSortOrder(value, defaultOrder = "desc") {
  const order = normalizeString(value).toLowerCase();
  return order === "asc" || order === "desc" ? order : defaultOrder;
}

function parseRequiredText(value, fieldName) {
  const text = normalizeString(value);
  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return text;
}

function parseEmail(value) {
  const email = parseRequiredText(value, "Branch email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Enter a valid branch email address", 400);
  }
  return email;
}

function parsePhone(value) {
  const phone = parseRequiredText(value, "Branch phone");
  if (!/^\d{10}$/.test(phone)) {
    throw new AppError("Enter a valid 10-digit branch phone number", 400);
  }
  return phone;
}

function parseStatus(value) {
  const status = normalizeString(value).toUpperCase() || "ACTIVE";
  if (!RECORD_STATUSES.has(status)) {
    throw new AppError("Invalid branch status", 400);
  }
  return status;
}

function parseBranchId(value) {
  const branchId = parseRequiredText(value, "Branch ID").toUpperCase();
  if (!/^BR-\d{3}$/.test(branchId)) {
    throw new AppError("Branch ID must follow BR-001 format", 400);
  }
  return branchId;
}

function parseLocationCode(value, fieldName) {
  return parseRequiredText(value, fieldName).toUpperCase();
}

function formatBranchLocation(record) {
  const addressParts = [
    normalizeString(record?.branchAddress),
    normalizeString(record?.branchCity || record?.branchDistrict),
    normalizeString(record?.branchState),
    normalizeString(record?.branchCountry),
  ].filter(Boolean);

  return addressParts.join(", ");
}

function parsePersonName(value, fieldName) {
  const text = parseRequiredText(value, fieldName);
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(text)) {
    throw new AppError(`${fieldName} must contain letters only`, 400);
  }
  return text;
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function hasBranchActivated(record) {
  return Boolean(record?.adminUser?.lastLoginAt);
}

function toDisplayStatus(record) {
  if (String(record?.status || "").toUpperCase() === "INACTIVE") {
    return "Inactive";
  }

  return hasBranchActivated(record) ? "Active" : "Inactive";
}

function toResendMailStatus(record) {
  return hasBranchActivated(record) ? "Active" : "Inactive";
}

function getBranchMustResetPassword(record, explicitValue) {
  if (typeof explicitValue === "boolean") {
    return explicitValue;
  }

  return Boolean(record?.adminUser && !record.adminUser.passwordChangedAt);
}

function toBranchSummary(record, options = {}) {
  if (!record) return null;

  return {
    id: record.id,
    branchId: record.branchId,
    branchName: record.branchName,
    branchAdminName: record.branchAdminName,
    branchEmail: record.branchEmail,
    branchPhone: record.branchPhone,
    branchCountryCode: record.branchCountryCode || "",
    branchCountry: record.branchCountry || "",
    branchStateCode: record.branchStateCode || "",
    branchState: record.branchState || "",
    branchCity: record.branchCity || "",
    branchDistrict: record.branchCity || "",
    branchAddress: record.branchAddress,
    branchLocation: formatBranchLocation(record),
    status: toDisplayStatus(record),
    resendMailStatus: toResendMailStatus(record),
    welcomeMailSent: hasBranchActivated(record),
    lastLoginAt: record?.adminUser?.lastLoginAt || null,
    mustResetPassword: getBranchMustResetPassword(record, options.mustResetPassword),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(options.tempPassword ? { tempPassword: options.tempPassword } : {}),
  };
}

function buildBranchWhere(query) {
  const where = {};
  const search = normalizeString(query.search);

  if (query.status) {
    where.status = parseStatus(query.status);
  }

  if (search) {
    where.OR = [
      { branchId: { contains: search, mode: "insensitive" } },
      { branchName: { contains: search, mode: "insensitive" } },
      { branchAdminName: { contains: search, mode: "insensitive" } },
      { branchEmail: { contains: search, mode: "insensitive" } },
      { branchPhone: { contains: search, mode: "insensitive" } },
      { branchCountry: { contains: search, mode: "insensitive" } },
      { branchState: { contains: search, mode: "insensitive" } },
      { branchCity: { contains: search, mode: "insensitive" } },
      { branchAddress: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildBranchOrderBy(sortBy, sortOrder) {
  switch (sortBy) {
    case "branchid":
      return { branchId: sortOrder };
    case "branchname":
      return { branchName: sortOrder };
    case "branchadminname":
      return { branchAdminName: sortOrder };
    case "branchemail":
      return { branchEmail: sortOrder };
    case "updatedat":
      return { updatedAt: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

async function ensureUniqueBranchProfile({ branchId, branchEmail, branchPhone }, excludeId = null) {
  const existing = await prisma.branch.findFirst({
    where: {
      OR: [{ branchId }, { branchEmail }, { branchPhone }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      branchId: true,
      branchEmail: true,
      branchPhone: true,
    },
  });

  if (!existing) return;

  if (existing.branchId === branchId) {
    throw new AppError("Branch ID already exists", 409);
  }
  if (existing.branchEmail === branchEmail) {
    throw new AppError("Branch email already exists", 409);
  }
  if (existing.branchPhone === branchPhone) {
    throw new AppError("Branch phone number already exists", 409);
  }
  throw new AppError("Branch already exists", 409);
}

async function ensureUniqueBranchLogin({ branchEmail, branchPhone }, excludeUserId = null) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: branchEmail }, { phone: branchPhone }],
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });

  if (!existing) return;

  if (existing.email === branchEmail) {
    throw new AppError("Branch email already exists", 409);
  }
  if (existing.phone === branchPhone) {
    throw new AppError("Branch phone number already exists", 409);
  }

  throw new AppError("Duplicate branch login account", 409);
}

async function loadBranch(branchId) {
  return prisma.branch.findUnique({
    where: { id: branchId },
    include: {
      adminUser: {
        select: {
          id: true,
          userCode: true,
          email: true,
          phone: true,
          active: true,
          passwordChangedAt: true,
          lastLoginAt: true,
        },
      },
    },
  });
}

function buildBranchPayload(payload, existing = null) {
  return {
    branchId: payload.branchId !== undefined ? parseBranchId(payload.branchId) : existing?.branchId,
    branchName:
      payload.branchName !== undefined
        ? parsePersonName(payload.branchName, "Branch name")
        : existing?.branchName,
    branchAdminName:
      payload.branchAdminName !== undefined
        ? parsePersonName(payload.branchAdminName, "Branch admin name")
        : existing?.branchAdminName,
    branchEmail: payload.branchEmail !== undefined ? parseEmail(payload.branchEmail) : existing?.branchEmail,
    branchPhone: payload.branchPhone !== undefined ? parsePhone(payload.branchPhone) : existing?.branchPhone,
    branchCountryCode:
      payload.branchCountryCode !== undefined
        ? parseLocationCode(payload.branchCountryCode, "Branch country code")
        : existing?.branchCountryCode || "",
    branchCountry:
      payload.branchCountry !== undefined
        ? parseRequiredText(payload.branchCountry, "Branch country")
        : existing?.branchCountry || "",
    branchStateCode:
      payload.branchStateCode !== undefined
        ? parseLocationCode(payload.branchStateCode, "Branch state code")
        : existing?.branchStateCode || "",
    branchState:
      payload.branchState !== undefined
        ? parseRequiredText(payload.branchState, "Branch state")
        : existing?.branchState || "",
    branchCity:
      payload.branchCity !== undefined
        ? parseRequiredText(payload.branchCity, "Branch city")
        : payload.branchDistrict !== undefined
          ? parseRequiredText(payload.branchDistrict, "Branch city")
          : existing?.branchCity || "",
    branchAddress:
      payload.branchAddress !== undefined
        ? parseRequiredText(payload.branchAddress, "Branch address")
        : existing?.branchAddress,
    status: payload.status !== undefined ? parseStatus(payload.status) : existing?.status || "ACTIVE",
  };
}

function createResetTokenArtifacts() {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.credentialResetTokenExpiresMinutes * 60 * 1000);

  return { resetToken, tokenHash, expiresAt };
}

export async function listBranches(query = {}) {
  const { page, limit, skip, take } = buildPagination(query);
  const where = buildBranchWhere(query);
  const sortBy = normalizeSearchKey(query.sortBy) || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder);

  const [total, rows] = await prisma.$transaction([
    prisma.branch.count({ where }),
    prisma.branch.findMany({
      where,
      orderBy: buildBranchOrderBy(sortBy, sortOrder),
      skip,
      take,
      include: {
        adminUser: {
          select: {
            active: true,
            passwordChangedAt: true,
            lastLoginAt: true,
          },
        },
      },
    }),
  ]);

  return {
    data: rows.map((row) => toBranchSummary(row)),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function createBranch(payload, actor) {
  const parsed = buildBranchPayload(payload);
  await ensureUniqueBranchProfile(parsed);
  await ensureUniqueBranchLogin(parsed);

  const actorId = actor?.userId ?? actor?.id ?? null;
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        userCode: parsed.branchId,
        fullName: parsed.branchAdminName,
        email: parsed.branchEmail,
        phone: parsed.branchPhone,
        role: "BRANCH_ADMIN",
        active: parsed.status === "ACTIVE",
        passwordHash,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        createdBy: actorId,
      },
    });

    return tx.branch.create({
      data: {
        ...parsed,
        adminUserId: user.id,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  });

  void sendBranchCredentialsEmail({
    to: parsed.branchEmail,
    fullName: parsed.branchAdminName,
    temporaryPassword,
    resetToken,
    branchId: parsed.branchId,
    branchName: parsed.branchName,
    branchAddress: formatBranchLocation(parsed),
  }).catch((error) => {
    console.warn("Branch credentials email failed to send", error);
  });

  const createdBranch = await loadBranch(created.id);
  return toBranchSummary(createdBranch, { tempPassword: temporaryPassword });
}

export async function updateBranch(branchRecordId, payload, actor) {
  const existing = await loadBranch(branchRecordId);
  if (!existing) {
    throw new AppError("Branch not found", 404);
  }

  const parsed = buildBranchPayload(payload, existing);
  await ensureUniqueBranchProfile(parsed, branchRecordId);
  if (existing.adminUserId) {
    await ensureUniqueBranchLogin(parsed, existing.adminUserId);
  } else {
    await ensureUniqueBranchLogin(parsed);
  }

  const actorId = actor?.userId ?? actor?.id ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.update({
      where: { id: branchRecordId },
      data: {
        ...parsed,
        updatedBy: actorId,
      },
    });

    if (existing.adminUserId) {
      await tx.user.update({
        where: { id: existing.adminUserId },
        data: {
          userCode: parsed.branchId,
          fullName: parsed.branchAdminName,
          email: parsed.branchEmail,
          phone: parsed.branchPhone,
          active: parsed.status === "ACTIVE",
          updatedBy: actorId,
        },
      });
    }

    return branch;
  });

  const updatedBranch = await loadBranch(updated.id);
  return toBranchSummary(updatedBranch);
}

export async function deleteBranch(branchRecordId) {
  const existing = await loadBranch(branchRecordId);
  if (!existing) {
    throw new AppError("Branch not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    if (existing.adminUserId) {
      await tx.passwordResetToken.deleteMany({
        where: { userId: existing.adminUserId },
      });

      await tx.user.delete({
        where: { id: existing.adminUserId },
      });
    }

    await tx.branch.delete({
      where: { id: branchRecordId },
    });
  });

  return {
    id: existing.id,
    branchId: existing.branchId,
    branchName: existing.branchName,
    branchEmail: existing.branchEmail,
  };
}

export async function resendBranchInvitation(branchRecordId, actor) {
  const existing = await loadBranch(branchRecordId);
  if (!existing) {
    throw new AppError("Branch not found", 404);
  }

  if (!existing.adminUserId) {
    throw new AppError("Branch admin account not found", 404);
  }

  const actorId = actor?.userId ?? actor?.id ?? null;
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const { resetToken, tokenHash, expiresAt } = createResetTokenArtifacts();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.adminUserId },
      data: {
        fullName: existing.branchAdminName,
        email: existing.branchEmail,
        phone: existing.branchPhone,
        role: "BRANCH_ADMIN",
        active: existing.status === "ACTIVE",
        passwordHash,
        refreshTokenVersion: { increment: 1 },
        updatedBy: actorId,
      },
    });

    await tx.passwordResetToken.deleteMany({
      where: {
        userId: existing.adminUserId,
        usedAt: null,
      },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: existing.adminUserId,
        tokenHash,
        expiresAt,
        createdBy: actorId,
      },
    });
  });

  void sendBranchCredentialsEmail({
    to: existing.branchEmail,
    fullName: existing.branchAdminName,
    temporaryPassword,
    resetToken,
    branchId: existing.branchId,
    branchName: existing.branchName,
    branchAddress: formatBranchLocation(existing),
  }).catch((error) => {
    console.warn("Branch invitation email failed to send", error);
  });

  const refreshedBranch = await loadBranch(existing.id);

  return {
    branch: toBranchSummary(refreshedBranch, { tempPassword: temporaryPassword }),
    message: "Invitation email sent successfully",
  };
}

export async function getCurrentBranchProfile(user) {
  const userId = normalizeString(user?.userId || user?.id);
  const normalizedEmail = normalizeString(user?.email).toLowerCase();

  const branch = userId
    ? await prisma.branch.findFirst({
        where: {
          adminUserId: userId,
        },
        include: {
          adminUser: {
            select: {
              passwordChangedAt: true,
              lastLoginAt: true,
            },
          },
        },
      })
    : await prisma.branch.findFirst({
        where: {
          branchEmail: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
        include: {
          adminUser: {
            select: {
              passwordChangedAt: true,
              lastLoginAt: true,
            },
          },
        },
      });

  if (!branch) {
    throw new AppError("Branch profile not found", 404);
  }

  return toBranchSummary(branch);
}
