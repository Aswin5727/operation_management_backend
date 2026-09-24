import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import * as branchFacultyController from "./branchFaculty.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN));

router.get("/", branchFacultyController.listBranchFacultyHandler);
router.get("/phone-availability", branchFacultyController.checkBranchFacultyPhoneHandler);
router.post("/", branchFacultyController.createBranchFacultyHandler);
router.patch("/:id", branchFacultyController.updateBranchFacultyHandler);
router.delete("/:id", branchFacultyController.deleteBranchFacultyHandler);

export default router;
