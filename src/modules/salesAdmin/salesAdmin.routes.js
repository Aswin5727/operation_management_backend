import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { admissionsHandler, admissionLeadHandler, availableBatchesHandler, pendingAdmissionReminderHandler, startAdmissionHandler, convertAdmissionHandler, createSalesAdminHandler, dashboardHandler, deleteSalesAdminHandler, listSalesAdminsHandler, profileHandler, resetPasswordHandler, updateSalesAdminHandler, createBatchRequestHandler, listBatchRequestsHandler } from "./salesAdmin.controller.js";
const router = express.Router();
router.post("/", authenticate, authorize("SUPER_ADMIN"), createSalesAdminHandler);
router.get("/", authenticate, authorize("SUPER_ADMIN"), listSalesAdminsHandler);
router.post("/:id/reset-password", authenticate, authorize("SUPER_ADMIN"), resetPasswordHandler);
router.patch("/:id", authenticate, authorize("SUPER_ADMIN"), updateSalesAdminHandler);
router.delete("/:id", authenticate, authorize("SUPER_ADMIN"), deleteSalesAdminHandler);
router.get("/me", authenticate, authorize("SALES_ADMIN"), profileHandler);
router.get("/dashboard", authenticate, authorize("SALES_ADMIN"), dashboardHandler);
router.get("/admissions", authenticate, authorize("SALES_ADMIN"), admissionsHandler);
router.get("/admissions/pending-reminder", authenticate, authorize("SALES_ADMIN"), pendingAdmissionReminderHandler);
router.get("/admissions/batch-requests", authenticate, authorize("SALES_ADMIN"), listBatchRequestsHandler);
router.get("/admissions/leads/:leadId", authenticate, authorize("SALES_ADMIN"), admissionLeadHandler);
router.get("/admissions/leads/:leadId/available-batches", authenticate, authorize("SALES_ADMIN"), availableBatchesHandler);
router.post("/admissions/leads/:leadId/batch-requests", authenticate, authorize("SALES_ADMIN"), createBatchRequestHandler);
router.post("/admissions/leads/:leadId/start", authenticate, authorize("SALES_ADMIN"), startAdmissionHandler);
router.post("/admissions/leads/:leadId/convert", authenticate, authorize("SALES_ADMIN"), convertAdmissionHandler);
export default router;


