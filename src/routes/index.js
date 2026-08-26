import express from "express";

import attendanceRoutes from "../modules/attendance/attendance.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import branchesRoutes from "../modules/branches/branches.routes.js";
import branchCoursesRoutes from "../modules/branchCourses/branchCourses.routes.js";
import branchInstallmentTemplatesRoutes from "../modules/branchInstallmentTemplates/branchInstallmentTemplates.routes.js";
import branchFacultyRoutes from "../modules/branchFaculty/branchFaculty.routes.js";
import branchStudentsRoutes from "../modules/branchStudents/branchStudents.routes.js";
import courseEditRequestsRoutes from "../modules/courseEditRequests/courseEditRequests.routes.js";
import facultyManagementRoutes from "../modules/facultyManagement/facultyManagement.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";
import facultyTodayWorkRoutes from "../modules/facultyTodayWork/facultyTodayWork.routes.js";
import notificationsRoutes from "../modules/notifications/notifications.routes.js";
import masterSetupRoutes from "../modules/masterSetup/masterSetup.routes.js";
import reportsRoutes from "../modules/reports/reports.routes.js";
import studentRoutes from "../modules/students/students.routes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "operation-management-backend",
  });
});

router.use("/auth", authRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/branches", branchesRoutes);
router.use("/branch-courses", branchCoursesRoutes);
router.use("/branch-installment-templates", branchInstallmentTemplatesRoutes);
router.use("/branch-faculty", branchFacultyRoutes);
router.use("/branch-students", branchStudentsRoutes);
router.use("/course-edit-requests", courseEditRequestsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/faculty-management", facultyManagementRoutes);
router.use("/faculty-today-work", facultyTodayWorkRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/master-setup", masterSetupRoutes);
router.use("/reports", reportsRoutes);
router.use("/students", studentRoutes);

export default router;
