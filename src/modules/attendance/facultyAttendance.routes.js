import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  getFacultyAttendanceStatusHandler,
  getBranchFacultyAttendanceStatusHandler,
  getFacultyAttendanceBatchesHandler,
  recordFacultyAttendanceApiLoginHandler,
  recordFacultyAttendanceApiLogoutHandler,
  getFacultyAttendancePermissionHandler,
} from "./facultyAttendance.controller.js";

const router = express.Router();
const facultyRoles = ["FACULTY", "BUSINESS_OWNER", "OPERATION_MANAGER"];

router.get("/status", authenticate, authorize(...facultyRoles), getFacultyAttendanceStatusHandler);
router.get("/admin-status/:facultyReference", authenticate, authorize("BRANCH_ADMIN"), getBranchFacultyAttendanceStatusHandler);
router.get("/batches", authenticate, authorize(...facultyRoles), getFacultyAttendanceBatchesHandler);
router.post("/login", authenticate, authorize(...facultyRoles), recordFacultyAttendanceApiLoginHandler);
router.post("/logout", authenticate, authorize(...facultyRoles), recordFacultyAttendanceApiLogoutHandler);
router.get("/permission", authenticate, authorize(...facultyRoles), getFacultyAttendancePermissionHandler);

export default router;
