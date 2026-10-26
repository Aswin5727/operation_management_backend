import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { listBranchBatchRequestsHandler, updateBranchBatchRequestHandler } from "./branchBatchRequests.controller.js";

const router = express.Router();
router.use(authenticate, authorize("BRANCH_ADMIN", "SUPER_ADMIN"));
router.get("/", listBranchBatchRequestsHandler);
router.patch("/:requestId", updateBranchBatchRequestHandler);
export default router;
