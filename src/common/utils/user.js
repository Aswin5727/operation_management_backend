function requiresPasswordReset(user) {
  const role = String(user?.role || "").trim().toUpperCase();
  return role === "BRANCH_ADMIN" && !user?.passwordChangedAt;
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
    active: user.active,
    mustResetPassword: requiresPasswordReset(user),
    lastLoginAt: user.lastLoginAt,
    lastLogoutAt: user.lastLogoutAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export { toSafeUser, requiresPasswordReset };
