import AppError from "../errors/AppError.js";

const BRANCH_ROLE_ACCESS = {
  BRANCH_ADMIN_ONLY: "BRANCH_ADMIN_ONLY",
  BRANCH_ADMIN_SALES_ADMIN: "BRANCH_ADMIN_SALES_ADMIN",
};

const BRANCH_ROLE_ACCESS_LABELS = {
  BRANCH_ADMIN_ONLY: "Branch Admin Only",
  BRANCH_ADMIN_SALES_ADMIN: "Branch Admin + Sales Admin",
};

function parseBranchRoleAccess(value) {
  const normalized = String(value || BRANCH_ROLE_ACCESS.BRANCH_ADMIN_ONLY)
    .trim()
    .toUpperCase()
    .replace(/[ +\-]+/g, "_");

  if (!Object.hasOwn(BRANCH_ROLE_ACCESS, normalized)) {
    throw new AppError("Invalid role access", 400);
  }

  return normalized;
}

function hasSalesAdminAccess(actor) {
  const role = String(actor?.role || "").toUpperCase();
  return role === "SUPER_ADMIN" || role === "SALES_ADMIN" || (
    role === "BRANCH_ADMIN" &&
    actor?.roleAccess === BRANCH_ROLE_ACCESS.BRANCH_ADMIN_SALES_ADMIN
  );
}

export { BRANCH_ROLE_ACCESS, BRANCH_ROLE_ACCESS_LABELS, parseBranchRoleAccess, hasSalesAdminAccess };
