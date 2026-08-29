import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import {
  createBranchBatchHandler,
  deleteBranchBatchHandler,
  getBranchBatchHandler,
  listBranchBatchesHandler,
  updateBranchBatchHandler,
} from "./branchBatches.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN));

router.get("/", listBranchBatchesHandler);
router.post("/", createBranchBatchHandler);
router.get("/:batchGroupId", getBranchBatchHandler);
router.patch("/:batchGroupId", updateBranchBatchHandler);
router.delete("/:batchGroupId", deleteBranchBatchHandler);

export default router;

