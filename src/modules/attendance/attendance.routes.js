import express from "express";
import asyncHandler from "../../common/utils/asyncHandler.js";
import { getBranchAttendanceOverview } from "./branchAttendance.service.js";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  getCurrentStudentAttendanceOverviewHandler,
  getStudentAttendanceOverviewHandler,
  getStudentAttendanceOverviewByIdHandler,
  getStudentCourseHandler,
  getFacultyAttendanceOverviewHandler,
  markFacultyStudentAttendanceHandler,
  recordFacultyAttendanceLoginHandler,
  recordFacultyAttendanceLogoutHandler,
} from "./attendance.controller.js";

const router = express.Router();

router.get("/branch/overview", authenticate, authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"), asyncHandler(async (req, res) => {
  const data = await getBranchAttendanceOverview(req.user, req.query);
  res.json({ status: "success", data });
}));

router.get(
  "/faculty/overview",
  authenticate,
  authorize("FACULTY", "BUSINESS_OWNER", "OPERATION_MANAGER"),
  getFacultyAttendanceOverviewHandler,
);
router.post(
  "/faculty/session/login",
  authenticate,
  authorize("FACULTY", "BUSINESS_OWNER", "OPERATION_MANAGER"),
  recordFacultyAttendanceLoginHandler,
);
router.post(
  "/faculty/session/logout",
  authenticate,
  authorize("FACULTY", "BUSINESS_OWNER", "OPERATION_MANAGER"),
  recordFacultyAttendanceLogoutHandler,
);
router.post(
  "/faculty/mark",
  authenticate,
  authorize("FACULTY", "BUSINESS_OWNER", "OPERATION_MANAGER"),
  markFacultyStudentAttendanceHandler,
);
router.get("/student/me", authenticate, authorize("STUDENT"), getCurrentStudentAttendanceOverviewHandler);
router.get("/student/me/overview", authenticate, authorize("STUDENT"), getStudentAttendanceOverviewHandler);
router.get("/student/:studentId/overview", authenticate, authorize("BRANCH_ADMIN", "SUPER_ADMIN"), getStudentAttendanceOverviewByIdHandler);
router.get("/student/me/course", authenticate, authorize("STUDENT"), getStudentCourseHandler);

export default router;
