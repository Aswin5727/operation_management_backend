import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { assignBranchAccessHandler, createUserRoleAccountHandler, listBranchAccessUsersHandler } from "./userRoleManagement.controller.js";

const router = express.Router();
router.get("/branch-access/users", authenticate, authorize("SUPER_ADMIN"), listBranchAccessUsersHandler);
router.patch("/branch-access/:branchId", authenticate, authorize("SUPER_ADMIN"), assignBranchAccessHandler);
router.post("/", authenticate, authorize("SUPER_ADMIN"), createUserRoleAccountHandler);
export default router;

