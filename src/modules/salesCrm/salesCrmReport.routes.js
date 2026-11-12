import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { monthlySalesCrmReportHandler } from "./salesCrmReport.controller.js";
import { authorizeSalesAccess } from "../../common/middlewares/authorizeSalesAccess.js";

const router = express.Router();
router.use(authenticate, authorize("SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER", "BRANCH_ADMIN", "SALES_ADMIN"));
router.get("/monthly", (req, res, next) => {
  const role = String(req.auth?.role || req.user?.role || "").toUpperCase();
  if (role === "BRANCH_ADMIN") return monthlySalesCrmReportHandler(req, res, next);
  return authorizeSalesAccess(req, res, () => monthlySalesCrmReportHandler(req, res, next));
});
export default router;