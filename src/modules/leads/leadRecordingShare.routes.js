import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { authorizeSalesAccess } from "../../common/middlewares/authorizeSalesAccess.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import { createShareHandler, listSalesAdminSharesHandler, listSharesHandler, sharedRecordingFileHandler } from "./leadRecordingShare.controller.js";

const router = express.Router();
router.use(authenticate, authorize(USER_ROLES.SALES_ADMIN, USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN), authorizeSalesAccess);
router.post("/", createShareHandler);
router.get("/mine", listSharesHandler);
router.get("/admin/:salesAdminId", authorize(USER_ROLES.SUPER_ADMIN), listSalesAdminSharesHandler);
router.get("/:shareId/recordings/:recordingId", sharedRecordingFileHandler);
export default router;
