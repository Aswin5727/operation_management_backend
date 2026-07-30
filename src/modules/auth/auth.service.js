import crypto from "node:crypto";

import prisma from "../../config/prisma.js";
import config from "../../config/env.js";
import AppError from "../../common/errors/AppError.js";
import { comparePassword, hashPassword } from "../../common/utils/password.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../../common/utils/tokens.js";
import { toSafeUser } from "../../common/utils/user.js";
import { LOGIN_EVENT_TYPES } from "../../common/constants/auth.js";
import {
  sendFacultyWelcomeEmail,
  sendPasswordResetEmail,
  sendStudentWelcomeEmail,
} from "../../common/services/resendEmail.js";
import {
  recordFacultyLoginSession,
  recordFacultyLogoutSession,
} from "../attendance/attendance.service.js";

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

  setImmediate(() => {
    void createLoginEvent(userId, LOGIN_EVENT_TYPES.LOGIN_SUCCESS, meta).catch((error) => {
      console.error("Failed to record login success event:", error);
    });
  });
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

  const role = String(user.role || "").toUpperCase();
  const isFirstLogin = !user.lastLoginAt;
  const isDashboardHeavyRole = role === "BUSINESS_OWNER" || role === "OPERATION_MANAGER";
  let studentCourseName = "";
  let facultyWelcomeCourseName = "";
  let facultyWelcomeBatchNames = [];

  if (isFirstLogin && role === "STUDENT") {
    const studentProfile = await prisma.studentProfile.findFirst({
      where: {
        OR: [{ emailAddress: user.email }, { studentCode: user.userCode }],
      },
      select: {
        courseInterested: true,
        course: {
          select: {
            name: true,
          },
        },
      },
    });

    studentCourseName = studentProfile?.course?.name || studentProfile?.courseInterested || "";
  }

  if (isFirstLogin && role === "FACULTY") {
    const facultyProfile = await prisma.facultyProfile.findFirst({
      where: {
        facultyEmail: user.email,
      },
      select: {
        course: {
          select: {
            name: true,
          },
        },
        batchEntries: {
          orderBy: { sequenceNo: "asc" },
          select: {
            batchName: true,
          },
        },
      },
    });

    facultyWelcomeCourseName = facultyProfile?.course?.name || "";
    facultyWelcomeBatchNames = Array.isArray(facultyProfile?.batchEntries)
      ? facultyProfile.batchEntries.map((entry) => entry.batchName).filter(Boolean)
      : [];
  }

  const refreshedUserPromise = isDashboardHeavyRole
    ? (setImmediate(() => {
        void resetLoginState(user.id, { ipAddress, userAgent }).catch((error) => {
          console.error("Failed to update login state:", error);
        });
      }), Promise.resolve(user))
    : resetLoginState(user.id, { ipAddress, userAgent });

  const refreshedUser = await refreshedUserPromise;
  const accessToken = createAccessToken(refreshedUser);
  const refreshToken = createRefreshToken(refreshedUser);

  if (isFirstLogin && role === "STUDENT") {
    setImmediate(() => {
      void sendStudentWelcomeEmail({
        to: refreshedUser.email,
        fullName: refreshedUser.fullName,
        courseName: studentCourseName,
      }).catch((error) => {
        console.error("Failed to send student welcome email:", error);
      });
    });
  }

  if (isFirstLogin && role === "FACULTY") {
    setImmediate(() => {
      void sendFacultyWelcomeEmail({
        to: refreshedUser.email,
        fullName: refreshedUser.fullName,
        courseName: facultyWelcomeCourseName,
        batchNames: facultyWelcomeBatchNames,
      }).catch((error) => {
        console.error("Failed to send faculty welcome email:", error);
      });
    });
  }

  if (role === "FACULTY") {
    setImmediate(() => {
      void recordFacultyLoginSession(refreshedUser.id).catch((error) => {
        console.error("Failed to record faculty login attendance:", error);
      });
    });
  }

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

  setImmediate(() => {
    void createLoginEvent(user.id, LOGIN_EVENT_TYPES.REFRESH, {
      ipAddress,
      userAgent,
    }).catch((error) => {
      console.error("Failed to record refresh event:", error);
    });
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

    setImmediate(() => {
      void createLoginEvent(user.id, LOGIN_EVENT_TYPES.LOGOUT, {
        ipAddress,
        userAgent,
      }).catch((error) => {
        console.error("Failed to record logout event:", error);
      });
    });

    if (String(user.role || "").toUpperCase() === "FACULTY") {
      setImmediate(() => {
        void recordFacultyLogoutSession(user.id).catch((error) => {
          console.error("Failed to record faculty logout attendance:", error);
        });
      });
    }
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

  try {
    await sendPasswordResetEmail({
      to: user.email,
      resetToken,
    });
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        tokenHash,
      },
    });
    throw error;
  }

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

  const newPasswordMatchesOld = await comparePassword(password, resetToken.user.passwordHash);

  if (newPasswordMatchesOld) {
    throw new AppError("This password already exists. Please choose a different strong password.", 400);
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

export {
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  createLoginEvent,
};
