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

async function findUserForAuthentication(userId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  throw new AppError(
    "Database temporarily unavailable. Please try again.",
    503,
  );
}

async function authenticate(req, _res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const payload = verifyAccessToken(token);
    const userId = payload.subject || payload.sub;
    const user = await findUserForAuthentication(userId);

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
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(error.message || "Authentication required", 401));
  }
}

export { authenticate };
