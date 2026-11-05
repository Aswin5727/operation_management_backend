import express from "express";
import multer from "multer";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import AppError from "../../common/errors/AppError.js";
import { downloadCompletedStudentTemplateHandler, importCompletedStudentsHandler, previewCompletedStudentImportHandler } from "./completedStudentImport.controller.js";
import { downloadCompletedStudentFailedRowsHandler } from "./completedStudentImportFailed.controller.js";
import { cancelCompletedStudentImportJobHandler, createCompletedStudentImportJobHandler, downloadCompletedStudentImportFailedRowsHandler as downloadCompletedStudentImportJobFailedRowsHandler, getCompletedStudentImportJobHandler, listCompletedStudentImportJobsHandler, retryCompletedStudentImportJobHandler } from "./completedStudentImport.job.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1 } });
const uploadCompletedStudentWorkbook = (req, res, next) => upload.single("file")(req, res, (error) => {
  if (error) return next(new AppError(error.code === "LIMIT_FILE_SIZE" ? "The workbook must be 20 MB or smaller." : "Upload one .xlsx file only.", 400));
  return next();
});
router.use(authenticate, authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"));
router.get("/template", downloadCompletedStudentTemplateHandler);
router.post("/preview", uploadCompletedStudentWorkbook, previewCompletedStudentImportHandler);
router.post("/import", importCompletedStudentsHandler);
router.post("/failed-rows", downloadCompletedStudentFailedRowsHandler);
router.post("/jobs", createCompletedStudentImportJobHandler);
router.get("/jobs/active", listCompletedStudentImportJobsHandler);
router.get("/jobs/:jobId", getCompletedStudentImportJobHandler);
router.post("/jobs/:jobId/cancel", cancelCompletedStudentImportJobHandler);
router.post("/jobs/:jobId/retry", retryCompletedStudentImportJobHandler);
router.get("/jobs/:jobId/failed-rows", downloadCompletedStudentImportJobFailedRowsHandler);
export default router;
