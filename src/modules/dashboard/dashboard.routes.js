import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { getFacultyMyBatchesSummaryHandler, getRevenueSummaryHandler } from "./dashboard.controller.js";

const router = express.Router();

router.get("/faculty/my-batches-summary", authenticate, authorize("FACULTY"), getFacultyMyBatchesSummaryHandler);

router.use(authenticate, authorize("OPERATION_MANAGER", "BUSINESS_OWNER"));

router.get("/revenue-summary", getRevenueSummaryHandler);

export default router;
