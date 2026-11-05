import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { submitHandler, listHandler, viewHandler, downloadHandler } from "./salesCrmReportSubmission.controller.js";

const router = express.Router();
router.use(authenticate);
router.post("/", authorize("SALES_ADMIN", "BRANCH_ADMIN"), submitHandler);
router.get("/admin/:salesAdminId", authorize("SUPER_ADMIN"), listHandler);
router.get("/:reportId/download", authorize("SUPER_ADMIN"), downloadHandler);
router.get("/:reportId", authorize("SUPER_ADMIN"), viewHandler);
export default router;
