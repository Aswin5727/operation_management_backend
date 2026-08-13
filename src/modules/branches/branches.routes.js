import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createBranchHandler,
  deleteBranchHandler,
  getCurrentBranchProfileHandler,
  listBranchesHandler,
  resendBranchInvitationHandler,
  updateBranchHandler,
} from "./branches.controller.js";

const router = express.Router();

router.get("/me", authenticate, authorize("BRANCH_ADMIN"), getCurrentBranchProfileHandler);

router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/", listBranchesHandler);
router.post("/", createBranchHandler);
router.patch("/:branchId", updateBranchHandler);
router.delete("/:branchId", deleteBranchHandler);
router.post("/:branchId/resend-invitation", resendBranchInvitationHandler);

export default router;
