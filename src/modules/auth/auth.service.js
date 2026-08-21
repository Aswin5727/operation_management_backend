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
  sendBranchWelcomeEmail,
  sendFacultyWelcomeEmail,
  sendPasswordResetEmail,
  sendStudentWelcomeEmail,
} from "../../common/services/resendEmail.js";
import {
  createBranchFacultyLoginNotification,
  createBranchLoginNotification,
} from "../notifications/notifications.service.js";
import {
  recordFacultyLoginSession,
  recordFacultyLogoutSession,
} from "../attendance/attendance.service.js";
import { requiresPasswordReset } from "../../common/utils/user.js";

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim().toLowerCase();
}

function formatBranchLocation(record) {
  return [
    String(record?.branchAddress || "").trim(),
    String(record?.branchCity || "").trim(),
    String(record?.branchState || "").trim(),
    String(record?.branchCountry || "").trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

const AUTH_USER_SELECT = {
  id: true,
  userCode: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  passwordHash: true,
  passwordChangedAt: true,
  refreshTokenVersion: true,
  failedLoginCount: true,
  failedLoginWindowExpiresAt: true,
  lockedUntil: true,
  lastLoginAt: true,
  lastLogoutAt: true,
  lastLoginIp: true,
  lastLoginUserAgent: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
};

async function findUserByIdentifier(identifier) {
  const rawIdentifier = String(identifier || "").trim();
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!rawIdentifier) {
    return null;
  }

  const byEmail = normalizedIdentifier.includes("@")
    ? await prisma.user.findUnique({
        where: { email: normalizedIdentifier },
        select: AUTH_USER_SELECT,
      })
    : null;

  if (byEmail) {
    return byEmail;
  }

  return prisma.user.findUnique({
    where: { userCode: rawIdentifier },
    select: AUTH_USER_SELECT,
  });
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
  const user = await findUserByIdentifier(identifier);

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
  const isDashboardHeavyRole =
    role === "SUPER_ADMIN" || role === "BUSINESS_OWNER" || role === "OPERATION_MANAGER";

  const studentProfilePromise =
    isFirstLogin && role === "STUDENT"
      ? prisma.studentProfile.findFirst({
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
        })
      : Promise.resolve(null);

  const facultyProfilePromise =
    isFirstLogin && role === "FACULTY"
      ? prisma.facultyProfile.findFirst({
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
        })
      : Promise.resolve(null);

  const branchRecordPromise =
    isFirstLogin && role === "BRANCH_ADMIN"
      ? prisma.branch.findFirst({
          where: {
            branchEmail: {
              equals: user.email,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            branchId: true,
            branchName: true,
            branchAdminName: true,
            branchEmail: true,
            branchCountry: true,
            branchState: true,
            branchCity: true,
            branchAddress: true,
          },
        })
      : Promise.resolve(null);

  let studentCourseName = "";
  let facultyWelcomeCourseName = "";
  let facultyWelcomeBatchNames = [];
  let branchWelcomeMeta = null;

  const refreshedUserPromise = isDashboardHeavyRole
    ? (setImmediate(() => {
        void resetLoginState(user.id, { ipAddress, userAgent }).catch((error) => {
          console.error("Failed to update login state:", error);
        });
      }), Promise.resolve(user))
    : resetLoginState(user.id, { ipAddress, userAgent });

  const [refreshedUser, studentProfile, facultyProfile, branchRecord] = await Promise.all([
    refreshedUserPromise,
    studentProfilePromise,
    facultyProfilePromise,
    branchRecordPromise,
  ]);

  studentCourseName = studentProfile?.course?.name || studentProfile?.courseInterested || "";
  facultyWelcomeCourseName = facultyProfile?.course?.name || "";
  facultyWelcomeBatchNames = Array.isArray(facultyProfile?.batchEntries)
    ? facultyProfile.batchEntries.map((entry) => entry.batchName).filter(Boolean)
    : [];
  branchWelcomeMeta = branchRecord
    ? {
        id: branchRecord.id,
        branchId: branchRecord.branchId,
        branchName: branchRecord.branchName,
        branchAdminName: branchRecord.branchAdminName || user.fullName,
        branchEmail: branchRecord.branchEmail || user.email,
        branchAddress: formatBranchLocation(branchRecord),
      }
    : null;

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
        facultyId: refreshedUser.userCode?.includes("-FC-") 
          ? "FC-" + refreshedUser.userCode.split("-FC-")[1] 
          : refreshedUser.userCode,
        courseName: facultyWelcomeCourseName,
        batchNames: facultyWelcomeBatchNames,
      }).catch((error) => {
        console.error("Failed to send faculty welcome email:", error);
      });
    });
  }

  if (isFirstLogin && role === "BRANCH_ADMIN") {
    setImmediate(() => {
      void Promise.allSettled([
        sendBranchWelcomeEmail({
          to: refreshedUser.email,
          fullName: refreshedUser.fullName,
          branchId: branchWelcomeMeta?.branchId || "",
          branchName: branchWelcomeMeta?.branchName || "",
          branchAddress: branchWelcomeMeta?.branchAddress || "",
        }),
        createBranchLoginNotification(
          {
            id: branchWelcomeMeta?.id || refreshedUser.id,
            branchId: branchWelcomeMeta?.branchId || refreshedUser.userCode,
            branchName: branchWelcomeMeta?.branchName || refreshedUser.fullName,
            branchAdminName: branchWelcomeMeta?.branchAdminName || refreshedUser.fullName,
            branchEmail: branchWelcomeMeta?.branchEmail || refreshedUser.email,
          },
          { userId: refreshedUser.id },
        ),
      ]).then((results) => {
        const [emailResult, notificationResult] = results;

        if (emailResult.status === "rejected") {
          console.error("Failed to send branch welcome email:", emailResult.reason);
        }

        if (notificationResult.status === "rejected") {
          console.error("Failed to create branch login notification:", notificationResult.reason);
        }
      });
    });
  }

  if (role === "FACULTY") {
    setImmediate(() => {
      void (async () => {
        try {
          const [branchFacultyResult, attendanceResult] = await Promise.allSettled([
            prisma.branchFaculty.findFirst({
              where: {
                email: {
                  equals: refreshedUser.email,
                  mode: "insensitive",
                },
              },
              select: {
                name: true,
                email: true,
                facultyId: true,
                branch: {
                  select: {
                    id: true,
                    branchId: true,
                    branchName: true,
                    branchAdminName: true,
                    branchEmail: true,
                  },
                },
              },
            }),
            recordFacultyLoginSession(refreshedUser.id),
          ]);

          const branchFaculty = branchFacultyResult.status === "fulfilled" ? branchFacultyResult.value : null;

          if (isFirstLogin && branchFaculty?.branch) {
            await createBranchFacultyLoginNotification(
              branchFaculty.branch,
              {
                name: branchFaculty.name || refreshedUser.fullName,
                fullName: refreshedUser.fullName,
                email: branchFaculty.email || refreshedUser.email,
                facultyId: branchFaculty.facultyId || refreshedUser.userCode,
              },
              { userId: refreshedUser.id },
            );
          }

          if (branchFacultyResult.status === "rejected") {
            console.error("Failed to create branch faculty login notification:", branchFacultyResult.reason);
          }

          if (attendanceResult.status === "rejected") {
            console.error("Failed to record faculty login attendance:", attendanceResult.reason);
          }
        } catch (error) {
          console.error("Failed to create branch faculty login notification:", error);
        }
      })();
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
  const user = await findUserByIdentifier(identifier);

  if (!user || !user.active) {
    return {
      message: "If the account exists, a reset token has been generated.",
      resetToken: null,
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.forgotPasswordResetTokenExpiresMinutes * 60 * 1000);

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
      expiryMinutes: config.forgotPasswordResetTokenExpiresMinutes,
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

async function changePassword({ userId, password, ipAddress, userAgent }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.active) {
    throw new AppError("Session expired", 401);
  }

  if (!password) {
    throw new AppError("Password is required", 400);
  }

  const newPasswordMatchesOld = await comparePassword(password, user.passwordHash);

  if (newPasswordMatchesOld) {
    throw new AppError("This password already exists. Please choose a different strong password.", 400);
  }

  if (!requiresPasswordReset(user)) {
    throw new AppError("Password reset is not required for this account.", 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        refreshTokenVersion: { increment: 1 },
        failedLoginCount: 0,
        failedLoginWindowExpiresAt: null,
        lockedUntil: null,
        updatedBy: user.id,
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.loginEvent.create({
      data: {
        userId: user.id,
        eventType: LOGIN_EVENT_TYPES.RESET_PASSWORD_COMPLETED,
        success: true,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        reason: "Password changed after temporary-password login",
      },
    }),
  ]);

  return {
    message: "Password updated successfully. Please sign in again with your new password.",
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
  changePassword,
  getCurrentUser,
  createLoginEvent,
};
