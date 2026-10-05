import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createDiscontinuationRequestHandler,
  getDiscontinuationRequestHandler,
  listDiscontinuationRequestsHandler,
  reviewDiscontinuationByBranchHandler,
  reviewDiscontinuationBySuperAdminHandler,
} from "./studentDiscontinuation.controller.js";

const router = express.Router();

router.post(
  "/me",
  authenticate,
  authorize("STUDENT"),
  createDiscontinuationRequestHandler,
);
router.get(
  "/",
  authenticate,
  authorize("BRANCH_ADMIN", "SUPER_ADMIN", "STUDENT"),
  listDiscontinuationRequestsHandler,
);
router.get(
  "/:requestId",
  authenticate,
  authorize("STUDENT", "BRANCH_ADMIN", "SUPER_ADMIN"),
  getDiscontinuationRequestHandler,
);
router.patch(
  "/:requestId/branch-review",
  authenticate,
  authorize("BRANCH_ADMIN"),
  reviewDiscontinuationByBranchHandler,
);
router.patch(
  "/:requestId/super-review",
  authenticate,
  authorize("SUPER_ADMIN"),
  reviewDiscontinuationBySuperAdminHandler,
);

export default router;
