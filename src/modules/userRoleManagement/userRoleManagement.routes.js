import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { assignBranchAccessHandler, createUserRoleAccountHandler, listAdminChangeHistoryHandler, listBranchAccessUsersHandler, replaceBranchAdminHandler, requestEmailChangeHandler, verifyEmailChangeHandler } from "./userRoleManagement.controller.js";

const router = express.Router();
router.get("/branch-access/users", authenticate, authorize("SUPER_ADMIN"), listBranchAccessUsersHandler);
router.patch("/branch-access/:branchId", authenticate, authorize("SUPER_ADMIN"), assignBranchAccessHandler);
router.post("/branches/:branchId/replace-admin", authenticate, authorize("SUPER_ADMIN"), replaceBranchAdminHandler);
router.get("/branches/:branchId/admin-history", authenticate, authorize("SUPER_ADMIN"), listAdminChangeHistoryHandler);
router.post("/email-change/verify", verifyEmailChangeHandler);
router.post("/:userId/email-change", authenticate, authorize("SUPER_ADMIN"), requestEmailChangeHandler);
router.post("/", authenticate, authorize("SUPER_ADMIN"), createUserRoleAccountHandler);
export default router;

