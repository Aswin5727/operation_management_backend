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

router.use(authenticate, authorize("BUSINESS_OWNER", "OPERATION_MANAGER", "HR"));

router.get("/student-attendance", getStudentAttendanceReportHandler);
router.get("/batch-attendance", getBatchAttendanceReportHandler);
router.get("/faculty-attendance", getFacultyAttendanceReportHandler);
router.get("/all-faculty-attendance", getAllFacultyAttendanceReportHandler);

export default router;
