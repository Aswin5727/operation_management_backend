import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import completedStudentImportRoutes from "./completedStudentImport.routes.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  getAllFacultyAttendanceReportHandler,
  getBatchAttendanceReportHandler,
  getFacultyAttendanceReportHandler,
  getStudentAttendanceReportHandler,
  getBranchBatchAttendanceReportHandler,
  getBranchStudentAttendanceReportHandler,
  getBranchMonthlyReportHandler
} from "./reports.controller.js";

const router = express.Router();
router.use(authenticate);
router.use("/completed-student-import", completedStudentImportRoutes);
router.get("/branch-student-attendance", authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"), getBranchStudentAttendanceReportHandler);
router.get("/branch-batch-attendance", authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"), getBranchBatchAttendanceReportHandler);
router.get("/branch-monthly-students", authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"), getBranchMonthlyReportHandler);
router.get("/student-attendance", authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR"), getStudentAttendanceReportHandler);
router.get("/batch-attendance", authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR", "FACULTY"), getBatchAttendanceReportHandler);
router.get("/faculty-attendance", authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR"), getFacultyAttendanceReportHandler);
router.get("/all-faculty-attendance", authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR"), getAllFacultyAttendanceReportHandler);
export default router;
