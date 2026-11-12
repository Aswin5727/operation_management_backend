import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { authorizeSalesAccess } from "../../common/middlewares/authorizeSalesAccess.js";
import { admissionsHandler, studentFeeDetailsHandler, admissionLeadHandler, availableBatchesHandler, pendingAdmissionReminderHandler, startAdmissionHandler, convertAdmissionHandler, createSalesAdminHandler, dashboardHandler, deleteSalesAdminHandler, listSalesAdminsHandler, profileHandler, updateProfileHandler, resetPasswordHandler, updateSalesAdminHandler, updateSalesAdminStatusHandler, createBatchRequestHandler, listBatchRequestsHandler, resendBatchRequestHandler } from "./salesAdmin.controller.js";
const router = express.Router();
router.post("/", authenticate, authorize("SUPER_ADMIN"), createSalesAdminHandler);
router.get("/", authenticate, authorize("SUPER_ADMIN"), listSalesAdminsHandler);
router.post("/:id/reset-password", authenticate, authorize("SUPER_ADMIN"), resetPasswordHandler);
router.patch("/:id/status", authenticate, authorize("SUPER_ADMIN"), updateSalesAdminStatusHandler);
router.patch("/:id", authenticate, authorize("SUPER_ADMIN"), updateSalesAdminHandler);
router.delete("/:id", authenticate, authorize("SUPER_ADMIN"), deleteSalesAdminHandler);
router.get("/me", authenticate, authorize("SALES_ADMIN"), profileHandler);
router.put("/me", authenticate, authorize("SALES_ADMIN"), updateProfileHandler);
router.get("/dashboard", authenticate, authorize("SALES_ADMIN", "BRANCH_ADMIN", "SUPER_ADMIN"), authorizeSalesAccess, dashboardHandler);
const salesAdmissionAccess = [authenticate, authorize("SALES_ADMIN", "BRANCH_ADMIN", "SUPER_ADMIN"), authorizeSalesAccess];
router.get("/admissions", ...salesAdmissionAccess, admissionsHandler);
router.get("/admissions/students/:studentId/fee-details", ...salesAdmissionAccess, studentFeeDetailsHandler);
router.get("/admissions/pending-reminder", ...salesAdmissionAccess, pendingAdmissionReminderHandler);
router.get("/admissions/batch-requests", ...salesAdmissionAccess, listBatchRequestsHandler);
router.get("/admissions/leads/:leadId", ...salesAdmissionAccess, admissionLeadHandler);
router.get("/admissions/leads/:leadId/available-batches", ...salesAdmissionAccess, availableBatchesHandler);
router.post("/admissions/leads/:leadId/batch-requests", ...salesAdmissionAccess, createBatchRequestHandler);
router.post("/admissions/batch-requests/:requestId/resend", ...salesAdmissionAccess, resendBatchRequestHandler);
router.post("/admissions/leads/:leadId/start", ...salesAdmissionAccess, startAdmissionHandler);
router.post("/admissions/leads/:leadId/convert", ...salesAdmissionAccess, convertAdmissionHandler);
export default router;


