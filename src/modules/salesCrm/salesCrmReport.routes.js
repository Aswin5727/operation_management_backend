import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { monthlySalesCrmReportHandler } from "./salesCrmReport.controller.js";

const router = express.Router();
router.use(authenticate, authorize("SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER", "BRANCH_ADMIN", "SALES_ADMIN"));
router.get("/monthly", monthlySalesCrmReportHandler);
export default router;
