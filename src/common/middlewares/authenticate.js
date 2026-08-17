import prisma from "../../config/prisma.js";
import AppError from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { ACCESS_COOKIE_NAME } from "../constants/auth.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme && scheme.toLowerCase() === "bearer" && token) {
    return token;
  }

  return req.cookies?.[ACCESS_COOKIE_NAME] || null;
}

async function authenticate(req, _res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const payload = verifyAccessToken(token);
    const userId = payload.subject || payload.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.active || user.refreshTokenVersion !== payload.tokenVersion) {
      throw new AppError("Session expired", 401);
    }

    req.auth = {
      userId: user.id,
      role: user.role,
      tokenVersion: user.refreshTokenVersion,
    };
    req.user = user;

    const userRole = String(user.role || '').trim().toUpperCase();
    if (userRole === 'SUPER_ADMIN') {
      const impersonatedBranchId = req.headers['x-impersonate-branch-id'];
      if (impersonatedBranchId && impersonatedBranchId.trim()) {
        req.user.impersonatedBranchId = impersonatedBranchId.trim();
      }
    }

    next();
  } catch (error) {
    next(new AppError(error.message || "Authentication required", 401));
  }
}

export { authenticate };
