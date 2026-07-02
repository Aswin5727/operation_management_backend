const AppError = require("../errors/AppError");

function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    next();
  };
}

module.exports = {
  authorize,
};
