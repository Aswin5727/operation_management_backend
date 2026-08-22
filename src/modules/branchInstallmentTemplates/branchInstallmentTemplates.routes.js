import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import {
  createBranchInstallmentTemplateHandler,
  deleteBranchInstallmentTemplateHandler,
  getBranchInstallmentTemplateHandler,
  listBranchInstallmentTemplatesHandler,
  updateBranchInstallmentTemplateHandler,
} from "./branchInstallmentTemplates.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN));

router.get("/", listBranchInstallmentTemplatesHandler);
router.post("/", createBranchInstallmentTemplateHandler);
router.get("/:templateId", getBranchInstallmentTemplateHandler);
router.patch("/:templateId", updateBranchInstallmentTemplateHandler);
router.delete("/:templateId", deleteBranchInstallmentTemplateHandler);

export default router;

