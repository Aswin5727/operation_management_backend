import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { getFacultyMyBatchesSummaryHandler, getRevenueSummaryHandler } from "./dashboard.controller.js";
import { getBranchAdminWidgetsHandler, resetBranchAdminWidgetsHandler, saveBranchAdminWidgetsHandler } from "./branchDashboardWidgets.controller.js";

const router = express.Router();

router.get("/faculty/my-batches-summary", authenticate, authorize("FACULTY"), getFacultyMyBatchesSummaryHandler);

router.get("/branch/widgets", authenticate, authorize("BRANCH_ADMIN"), getBranchAdminWidgetsHandler);
router.put("/branch/widgets", authenticate, authorize("BRANCH_ADMIN"), saveBranchAdminWidgetsHandler);
router.post("/branch/widgets/reset", authenticate, authorize("BRANCH_ADMIN"), resetBranchAdminWidgetsHandler);

router.use(authenticate, authorize("OPERATION_MANAGER", "BUSINESS_OWNER"));

router.get("/revenue-summary", getRevenueSummaryHandler);

export default router;
