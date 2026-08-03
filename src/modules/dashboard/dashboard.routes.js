import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { getRevenueInsightsHandler, getRevenueSummaryHandler } from "./dashboard.controller.js";

const router = express.Router();

router.use(authenticate, authorize("OPERATION_MANAGER", "BUSINESS_OWNER"));

router.get("/revenue-summary", getRevenueSummaryHandler);
router.get("/revenue-insights", getRevenueInsightsHandler);

export default router;
