import prisma from "../../config/prisma.js";
import AppError from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme && scheme.toLowerCase() === "bearer" && token) {
    return token;
  }

  return req.cookies?.accessToken || null;
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
    next();
  } catch (error) {
    next(new AppError(error.message || "Authentication required", 401));
  }
}

export { authenticate };
