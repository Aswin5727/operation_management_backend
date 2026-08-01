import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  getAllFacultyAttendanceReportHandler,
  getBatchAttendanceReportHandler,
  getFacultyAttendanceReportHandler,
  getStudentAttendanceReportHandler,
} from "./reports.controller.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/student-attendance",
  authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR"),
  getStudentAttendanceReportHandler,
);
router.get(
  "/batch-attendance",
  authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR", "FACULTY"),
  getBatchAttendanceReportHandler,
);
router.get(
  "/faculty-attendance",
  authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR"),
  getFacultyAttendanceReportHandler,
);
router.get(
  "/all-faculty-attendance",
  authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR"),
  getAllFacultyAttendanceReportHandler,
);

export default router;
