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

const masterRoles = ["OPERATION_MANAGER", "BUSINESS_OWNER"];
const courseRoles = [...masterRoles, "BRANCH_ADMIN"];

router.use(authenticate);

router.get("/courses", authorize(...courseRoles), listCoursesHandler);
router.post("/courses", authorize(...courseRoles), createCourseHandler);
router.get("/courses/:courseId", authorize(...courseRoles), getCourseHandler);
router.patch("/courses/:courseId", authorize(...courseRoles), updateCourseHandler);
router.delete("/courses/:courseId", authorize(...courseRoles), deleteCourseHandler);
router.patch("/courses/:courseId/status", authorize(...courseRoles), updateCourseStatusHandler);
router.get("/courses/:courseId/status-history", authorize(...courseRoles), listCourseStatusHistoryHandler);
router.get("/courses/:courseId/modules", authorize(...courseRoles), listCourseModulesHandler);
router.post("/courses/:courseId/modules", authorize(...courseRoles), createCourseModuleHandler);
router.patch("/courses/:courseId/modules/:moduleId", authorize(...courseRoles), updateCourseModuleHandler);
router.delete("/courses/:courseId/modules/:moduleId", authorize(...courseRoles), deleteCourseModuleHandler);
router.post("/courses/:courseId/modules/reorder", authorize(...courseRoles), reorderCourseModulesHandler);

router.get("/batches", authorize(...masterRoles), listBatchesHandler);
router.post("/batches", authorize(...masterRoles), createBatchHandler);
router.get("/batches/:batchId", authorize(...masterRoles), getBatchHandler);
router.patch("/batches/:batchId", authorize(...masterRoles), updateBatchHandler);
router.delete("/batches/:batchId", authorize(...masterRoles), deleteBatchHandler);
router.patch("/batches/:batchId/status", authorize(...masterRoles), updateBatchStatusHandler);
router.get("/batches/:batchId/status-history", authorize(...masterRoles), listBatchStatusHistoryHandler);
router.get("/batches/:batchId/faculty-assignments", authorize(...masterRoles), listBatchFacultyAssignmentsHandler);
router.post("/batches/:batchId/faculty-assignments", authorize(...masterRoles), createBatchFacultyAssignmentHandler);
router.patch("/batches/:batchId/faculty-assignments/:assignmentId", authorize(...masterRoles), updateBatchFacultyAssignmentHandler);
router.delete("/batches/:batchId/faculty-assignments/:assignmentId", authorize(...masterRoles), deleteBatchFacultyAssignmentHandler);

export default router;
