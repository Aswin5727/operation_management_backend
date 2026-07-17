import AppError from "../errors/AppError.js";

function authorize(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles
    .map((role) => String(role || "").trim().toUpperCase())
    .filter(Boolean);

  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const currentRole = String(req.user.role || "").trim().toUpperCase();

    if (!normalizedAllowedRoles.includes(currentRole)) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    next();
  };
}

export { authorize };
