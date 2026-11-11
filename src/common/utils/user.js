function requiresPasswordReset(user) {
  const role = String(user?.role || "").trim().toUpperCase();
  return (
    role === "BRANCH_ADMIN" ||
    role === "FACULTY" ||
    role === "STUDENT" ||
    role === "SALES_ADMIN"
  ) && !user?.passwordChangedAt;
}

function toSafeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    userCode: user.userCode,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ...(user.role === "BRANCH_ADMIN" ? { roleAccess: user.roleAccess || "BRANCH_ADMIN_ONLY" } : {}),
    active: user.active,
    status: user.status || (user.active ? "ACTIVE" : "INACTIVE"),
    mustResetPassword: requiresPasswordReset(user),
    lastLoginAt: user.lastLoginAt,
    lastLogoutAt: user.lastLogoutAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export { toSafeUser, requiresPasswordReset };
