import courseImportRoutes from "../modules/branchCourses/courseImport.routes.js";
import express from "express";

import attendanceRoutes from "../modules/attendance/attendance.routes.js";
import facultyAttendanceRoutes from "../modules/attendance/facultyAttendance.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import branchesRoutes from "../modules/branches/branches.routes.js";
import branchCoursesRoutes from "../modules/branchCourses/branchCourses.routes.js";
import branchBatchesRoutes from "../modules/branchBatches/branchBatches.routes.js";
import branchBatchRequestsRoutes from "../modules/branchBatchRequests/branchBatchRequests.routes.js";
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

import instituteLeaveRoutes from "../modules/instituteLeave/instituteLeave.routes.js";
import facultyLeaveRequestsRoutes from "../modules/facultyLeaveRequests/facultyLeaveRequests.routes.js";
import branchHolidaysRoutes from "../modules/branchHolidays/branchHolidays.routes.js";
import facultyWeekOffRequestsRoutes from "../modules/facultyWeekOffRequests/facultyWeekOffRequests.routes.js";
import examsRoutes from "../modules/exams/exams.routes.js";
import academicTestsRoutes from "../modules/academicTests/academicTests.routes.js";
import academicPreparationRoutes from "../modules/academicPreparation/academicPreparation.routes.js";
import facultySkillsRoutes from "../modules/facultySkills/facultySkills.routes.js";
import studentDiscontinuationRoutes from "../modules/studentDiscontinuation/studentDiscontinuation.routes.js";
import salesAdminRoutes from "../modules/salesAdmin/salesAdmin.routes.js";
import leadsRoutes from "../modules/leads/leads.routes.js";
import salesCrmReportRoutes from "../modules/salesCrm/salesCrmReport.routes.js";
import salesCrmReportSubmissionRoutes from "../modules/salesCrm/salesCrmReportSubmission.routes.js";
const router = express.Router();
router.use("/branch-holidays", branchHolidaysRoutes);
router.use("/institute-leaves", instituteLeaveRoutes);
router.use("/faculty-leave-requests", facultyLeaveRequestsRoutes);
router.use("/faculty-week-off-requests", facultyWeekOffRequestsRoutes);

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "operation-management-backend",
  });
});

router.use("/auth", authRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/faculty/attendance", facultyAttendanceRoutes);
router.use("/branches", branchesRoutes);
router.use("/branch-courses/import", courseImportRoutes);
router.use("/branch-courses", branchCoursesRoutes);
router.use("/branch-batches", branchBatchesRoutes);
router.use("/branch-batch-requests", branchBatchRequestsRoutes);
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
router.use("/exams", examsRoutes);
router.use("/academic-tests", academicTestsRoutes);
router.use("/academic-test-preparation", academicPreparationRoutes);
router.use("/faculty-skills", facultySkillsRoutes);
router.use("/student-discontinuation", studentDiscontinuationRoutes);
router.use("/sales-admins", salesAdminRoutes);
router.use("/sales-crm-report-submissions", salesCrmReportSubmissionRoutes);
router.use("/leads", leadsRoutes);
router.use("/sales-crm/reports", salesCrmReportRoutes);

export default router;


