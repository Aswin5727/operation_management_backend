import asyncHandler from "../../common/utils/asyncHandler.js";
import AppError from "../../common/errors/AppError.js";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../../common/constants/auth.js";
import {
  login,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from "./auth.service.js";

function setRefreshCookie(res, refreshToken, cookieOptions) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function setAccessCookie(res, accessToken, cookieOptions) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
    path: "/api/v1",
  });
}

function clearRefreshCookie(res, cookieOptions) {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
}

function clearAccessCookie(res, cookieOptions) {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    ...cookieOptions,
    path: "/api/v1",
  });
}

const loginHandler = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const identifier = body.identifier || body.email || body.userCode || "";
  const password = body.password || "";

  if (!identifier || !password) {
    throw new AppError("Identifier/email and password are required", 400);
  }

  const result = await login({
    identifier,
    password,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  setRefreshCookie(res, result.refreshToken, result.cookieOptions);
  setAccessCookie(res, result.accessToken, result.cookieOptions);

  res.status(200).json({
    message: "Login successful",
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const refreshHandler = asyncHandler(async (req, res) => {
  const refreshToken =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const result = await refreshSession({
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  setRefreshCookie(res, result.refreshToken, result.cookieOptions);
  setAccessCookie(res, result.accessToken, result.cookieOptions);

  res.status(200).json({
    message: "Session refreshed",
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const logoutHandler = asyncHandler(async (req, res) => {
  const refreshToken =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    req.get("authorization")?.replace(/^Bearer\s+/i, "");
  const result = await logout({
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  clearRefreshCookie(res, result.cookieOptions);
  clearAccessCookie(res, result.cookieOptions);

  res.status(200).json({
    message: "Logged out successfully",
  });
});

const forgotPasswordHandler = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const identifier = body.identifier || body.email || body.userCode || "";

  if (!identifier) {
    throw new AppError("Identifier/email is required", 400);
  }

  const result = await forgotPassword({
    identifier,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(200).json({
    message: result.message,
    data: {
      resetToken: process.env.NODE_ENV === "production" ? null : result.resetToken,
    },
  });
});

const resetPasswordHandler = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const token = body.token || "";
  const password = body.password || "";

  if (!token || !password) {
    throw new AppError("Token and password are required", 400);
  }

  const result = await resetPassword({
    token,
    password,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(200).json({
    message: result.message,
  });
});

const meHandler = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth.userId);

  res.status(200).json({
    data: {
      user,
    },
  });
});

export {
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  meHandler,
};
