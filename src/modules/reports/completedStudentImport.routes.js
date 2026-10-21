import express from "express";
import multer from "multer";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { downloadCompletedStudentTemplateHandler, importCompletedStudentsHandler, previewCompletedStudentImportHandler } from "./completedStudentImport.controller.js";
import { downloadCompletedStudentFailedRowsHandler } from "./completedStudentImportFailed.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
router.use(authenticate, authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"));
router.get("/template", downloadCompletedStudentTemplateHandler);
router.post("/preview", upload.single("file"), previewCompletedStudentImportHandler);
router.post("/import", importCompletedStudentsHandler);
router.post("/failed-rows", downloadCompletedStudentFailedRowsHandler);
export default router;
