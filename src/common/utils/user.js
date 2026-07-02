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
    lastLoginAt: user.lastLoginAt,
    lastLogoutAt: user.lastLogoutAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  toSafeUser,
};
