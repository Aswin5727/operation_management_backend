import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createBatchFacultyAssignmentHandler,
  createBatchHandler,
  createCourseHandler,
  createCourseModuleHandler,
  deleteBatchFacultyAssignmentHandler,
  deleteBatchHandler,
  deleteCourseHandler,
  deleteCourseModuleHandler,
  getBatchHandler,
  getCourseHandler,
  listBatchFacultyAssignmentsHandler,
  listBatchStatusHistoryHandler,
  listBatchesHandler,
  listCourseModulesHandler,
  listCourseStatusHistoryHandler,
  listCoursesHandler,
  reorderCourseModulesHandler,
  updateBatchFacultyAssignmentHandler,
  updateBatchHandler,
  updateBatchStatusHandler,
  updateCourseHandler,
  updateCourseModuleHandler,
  updateCourseStatusHandler,
} from "./masterSetup.controller.js";

const router = express.Router();

router.use(authenticate, authorize("OPERATION_MANAGER", "BUSINESS_OWNER"));

router.get("/courses", listCoursesHandler);
router.post("/courses", createCourseHandler);
router.get("/courses/:courseId", getCourseHandler);
router.patch("/courses/:courseId", updateCourseHandler);
router.delete("/courses/:courseId", deleteCourseHandler);
router.patch("/courses/:courseId/status", updateCourseStatusHandler);
router.get("/courses/:courseId/status-history", listCourseStatusHistoryHandler);
router.get("/courses/:courseId/modules", listCourseModulesHandler);
router.post("/courses/:courseId/modules", createCourseModuleHandler);
router.patch("/courses/:courseId/modules/:moduleId", updateCourseModuleHandler);
router.delete("/courses/:courseId/modules/:moduleId", deleteCourseModuleHandler);
router.post("/courses/:courseId/modules/reorder", reorderCourseModulesHandler);

router.get("/batches", listBatchesHandler);
router.post("/batches", createBatchHandler);
router.get("/batches/:batchId", getBatchHandler);
router.patch("/batches/:batchId", updateBatchHandler);
router.delete("/batches/:batchId", deleteBatchHandler);
router.patch("/batches/:batchId/status", updateBatchStatusHandler);
router.get("/batches/:batchId/status-history", listBatchStatusHistoryHandler);
router.get("/batches/:batchId/faculty-assignments", listBatchFacultyAssignmentsHandler);
router.post("/batches/:batchId/faculty-assignments", createBatchFacultyAssignmentHandler);
router.patch("/batches/:batchId/faculty-assignments/:assignmentId", updateBatchFacultyAssignmentHandler);
router.delete("/batches/:batchId/faculty-assignments/:assignmentId", deleteBatchFacultyAssignmentHandler);

export default router;
