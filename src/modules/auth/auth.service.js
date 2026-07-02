const crypto = require("crypto");
const prisma = require("../../config/prisma");
const config = require("../../config/env");
const AppError = require("../../common/errors/AppError");
const { comparePassword, hashPassword } = require("../../common/utils/password");
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} = require("../../common/utils/tokens");
const { toSafeUser } = require("../../common/utils/user");
const { LOGIN_EVENT_TYPES } = require("../../common/constants/auth");

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim().toLowerCase();
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: "/api/v1/auth",
  };
}

async function createLoginEvent(userId, eventType, data = {}) {
  await prisma.loginEvent.create({
    data: {
      userId,
      eventType,
      success: eventType === LOGIN_EVENT_TYPES.LOGIN_SUCCESS || eventType === LOGIN_EVENT_TYPES.REFRESH,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      reason: data.reason || null,
      meta: data.meta || undefined,
    },
  });
}

async function applyFailedLogin(user, meta) {
  const now = new Date();
  const windowMs = config.loginAttemptWindowMinutes * 60 * 1000;
  const windowExpired =
    !user.failedLoginWindowExpiresAt || user.failedLoginWindowExpiresAt.getTime() <= now.getTime();

  let failedLoginCount = windowExpired ? 1 : user.failedLoginCount + 1;
  let failedLoginWindowExpiresAt = windowExpired ? new Date(now.getTime() + windowMs) : user.failedLoginWindowExpiresAt;
  let lockedUntil = user.lockedUntil;
  let resetAfterLock = false;

  if (failedLoginCount >= config.loginAttemptMax) {
    lockedUntil = new Date(now.getTime() + windowMs);
    failedLoginCount = 0;
    failedLoginWindowExpiresAt = null;
    resetAfterLock = true;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount,
      failedLoginWindowExpiresAt,
      lockedUntil,
      updatedBy: "system",
    },
  });

  await createLoginEvent(user.id, LOGIN_EVENT_TYPES.LOGIN_FAILURE, {
    ...meta,
    reason: resetAfterLock ? "Account locked after repeated failures" : "Invalid credentials",
  });
}

async function resetLoginState(userId, meta) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      failedLoginWindowExpiresAt: null,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: meta.ipAddress || null,
      lastLoginUserAgent: meta.userAgent || null,
      updatedBy: userId,
    },
  });

  await createLoginEvent(userId, LOGIN_EVENT_TYPES.LOGIN_SUCCESS, meta);
  return updatedUser;
}

async function login({ identifier, password, ipAddress, userAgent }) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedIdentifier },
        { userCode: String(identifier || "").trim() },
      ],
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.active) {
    throw new AppError("Account is inactive", 403);
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError("Account is temporarily locked due to failed login attempts", 423);
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);

  if (!passwordMatches) {
    await applyFailedLogin(user, { ipAddress, userAgent });
    throw new AppError("Invalid credentials", 401);
  }

  const refreshedUser = await resetLoginState(user.id, { ipAddress, userAgent });
  const accessToken = createAccessToken(refreshedUser);
  const refreshToken = createRefreshToken(refreshedUser);

  return {
    user: toSafeUser(refreshedUser),
    accessToken,
    refreshToken,
    cookieOptions: getCookieOptions(),
  };
}

async function refreshSession({ refreshToken, ipAddress, userAgent }) {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 401);
  }

  const payload = verifyRefreshToken(refreshToken);
  const userId = payload.subject || payload.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.active || user.refreshTokenVersion !== payload.tokenVersion) {
    throw new AppError("Session expired", 401);
  }

  const accessToken = createAccessToken(user);
  const newRefreshToken = createRefreshToken(user);

  await createLoginEvent(user.id, LOGIN_EVENT_TYPES.REFRESH, {
    ipAddress,
    userAgent,
  });

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken: newRefreshToken,
    cookieOptions: getCookieOptions(),
  };
}

async function logout({ refreshToken, ipAddress, userAgent }) {
  if (!refreshToken) {
    return {
      cookieOptions: getCookieOptions(),
    };
  }

  const payload = verifyRefreshToken(refreshToken);
  const userId = payload.subject || payload.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user && user.refreshTokenVersion === payload.tokenVersion) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenVersion: { increment: 1 },
        lastLogoutAt: new Date(),
        updatedBy: user.id,
      },
    });

    await createLoginEvent(user.id, LOGIN_EVENT_TYPES.LOGOUT, {
      ipAddress,
      userAgent,
    });
  }

  return {
    cookieOptions: getCookieOptions(),
  };
}

async function forgotPassword({ identifier, ipAddress, userAgent }) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedIdentifier },
        { userCode: String(identifier || "").trim() },
      ],
    },
  });

  if (!user || !user.active) {
    return {
      message: "If the account exists, a reset token has been generated.",
      resetToken: null,
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.passwordResetTokenExpiresMinutes * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        createdBy: user.id,
      },
    }),
    prisma.loginEvent.create({
      data: {
        userId: user.id,
        eventType: LOGIN_EVENT_TYPES.FORGOT_PASSWORD,
        success: true,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }),
  ]);

  return {
    message: "If the account exists, a reset token has been generated.",
    resetToken,
  };
}

async function resetPassword({ token, password, ipAddress, userAgent }) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Reset token is invalid or expired", 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        refreshTokenVersion: { increment: 1 },
        failedLoginCount: 0,
        failedLoginWindowExpiresAt: null,
        lockedUntil: null,
        updatedBy: resetToken.userId,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.loginEvent.create({
      data: {
        userId: resetToken.userId,
        eventType: LOGIN_EVENT_TYPES.RESET_PASSWORD_COMPLETED,
        success: true,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }),
  ]);

  return {
    message: "Password reset successfully.",
  };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.active) {
    throw new AppError("Session expired", 401);
  }

  return toSafeUser(user);
}

module.exports = {
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  createLoginEvent,
};
