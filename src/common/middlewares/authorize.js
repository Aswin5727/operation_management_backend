import AppError from "../errors/AppError.js";

function authorize(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles
    .map((role) => String(role || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);

  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const currentRole = String(req.user.role || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Super Admin is the platform-wide administrator. Keep feature routes
    // safe for normal roles while allowing Super Admin branch/faculty views
    // even when an older route has not listed the role explicitly.
    if (currentRole === "SUPERADMIN") {
      return next();
    }

    if (!normalizedAllowedRoles.includes(currentRole)) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    next();
  };
}

export { authorize };
