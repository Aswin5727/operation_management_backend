import prisma from "../../config/prisma.js";
import AppError from "../errors/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { ACCESS_COOKIE_NAME } from "../constants/auth.js";
import { findBranchForAdmin, isInactiveBranch, isInactiveSalesAdmin } from "../utils/branchAccess.js";
import { normalizeModuleAccess } from "../constants/moduleAccess.js";

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

function requiredModuleForPath(pathname = "") {
  const path = String(pathname || "").toLowerCase();
  if (path.includes("/branch-students")) return ["STUDENT_MANAGEMENT", "ADMISSION_MANAGEMENT"];
  if (path.includes("/branch-courses") || path.includes("/branch-batches")) return ["ACADEMIC_OPERATIONS", "ADMISSION_MANAGEMENT"];
  if (path.includes("/branch-faculty") || path.includes("/branch-installment-templates") || path.includes("/academic-tests") || path.includes("/academic-test-preparation") || path.includes("/faculty-skills") || path.includes("/exams")) return ["ACADEMIC_OPERATIONS"];
  if (path.includes("/payments") || path.includes("/student-payments") || path.includes("/fee")) return "FEE_ACCOUNTS";
  if (path.includes("/reports") || path.includes("/report")) return path.includes("sales-crm") ? "SALES_CRM_REPORTS" : "REPORTS_ANALYTICS";
  if (path.includes("/leads") || path.includes("/sales-crm") || path.includes("/lead-recording-shares") || path.includes("/sales-crm-report-submissions")) return "LEAD_MANAGEMENT";
  return null;
}

function assertModuleAccess(req, user) {
  const role = String(user?.role || "").trim().toUpperCase();
  if (!["BRANCH_ADMIN", "SALES_ADMIN"].includes(role)) return;
  const moduleKey = requiredModuleForPath(req.originalUrl || req.baseUrl || req.path);
  if (!moduleKey) return;
  const accountType = role === "BRANCH_ADMIN" && user.roleAccess === "BRANCH_ADMIN_SALES_ADMIN" ? "BRANCH_ADMIN_SALES_ADMIN" : role;
  const access = normalizeModuleAccess(user.moduleAccess, accountType);
  const requiredModules = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
  if (!requiredModules.some((key) => access.includes(key))) throw new AppError("This module is not enabled for your account. Contact the Super Admin.", 403);
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

    const branch = await findBranchForAdmin(user);
    const inactiveBranchAdmin = isInactiveBranch(branch);
    const inactiveSalesAdmin = isInactiveSalesAdmin(user);
    const readOnlyUser = inactiveBranchAdmin || inactiveSalesAdmin;

    if (!user || ((!user.active && !readOnlyUser) || user.refreshTokenVersion !== payload.tokenVersion)) {
      throw new AppError("Session expired", 401);
    }

    if (user.role === "BRANCH_ADMIN") user.roleAccess = branch?.roleAccess || "BRANCH_ADMIN_ONLY";

    req.auth = {
      userId: user.id,
      role: user.role,
      tokenVersion: user.refreshTokenVersion,
      branchId: branch?.id || null,
      branchStatus: branch?.status || null,
      readOnly: readOnlyUser,
      salesAdminStatus: user.role === "SALES_ADMIN" ? (user.status || (user.active ? "ACTIVE" : "INACTIVE")) : null,
      roleAccess: user.role === "BRANCH_ADMIN" ? user.roleAccess : null,
      moduleAccess: Array.isArray(user.moduleAccess) ? user.moduleAccess : null,
    };
    req.user = user;
    assertModuleAccess(req, user);

    if (readOnlyUser && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      throw new AppError(
        inactiveSalesAdmin
          ? "Your account is currently inactive. You have view-only access. Please contact the Super Admin to reactivate your account."
          : "This branch is inactive. You can view data, but changes are not allowed.",
        403,
      );
    }

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
