import AppError from "../errors/AppError.js";
import { hasSalesAdminAccess } from "../constants/branchRoleAccess.js";

function authorizeSalesAccess(req, _res, next) {
  if (!hasSalesAdminAccess(req.auth || req.user)) {
    return next(new AppError("Sales Admin access is required", 403));
  }
  next();
}

export { authorizeSalesAccess };
