import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { getFacultyDashboardOverviewHandler, getFacultyMyBatchesSummaryHandler, getRevenueSummaryHandler } from "./dashboard.controller.js";
import { getBranchAdminWidgetsHandler, resetBranchAdminWidgetsHandler, saveBranchAdminWidgetsHandler } from "./branchDashboardWidgets.controller.js";

const router = express.Router();

router.get("/faculty/my-batches-summary", authenticate, authorize("FACULTY"), getFacultyMyBatchesSummaryHandler);
router.get("/faculty/overview", authenticate, authorize("FACULTY"), getFacultyDashboardOverviewHandler);

const branchWidgetRoles = ["BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"];
router.get("/branch/widgets", authenticate, authorize(...branchWidgetRoles), getBranchAdminWidgetsHandler);
router.put("/branch/widgets", authenticate, authorize(...branchWidgetRoles), saveBranchAdminWidgetsHandler);
router.post("/branch/widgets/reset", authenticate, authorize(...branchWidgetRoles), resetBranchAdminWidgetsHandler);

router.use(authenticate, authorize("OPERATION_MANAGER", "BUSINESS_OWNER"));

router.get("/revenue-summary", getRevenueSummaryHandler);

export default router;
