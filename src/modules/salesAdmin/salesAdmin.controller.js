import asyncHandler from "../../common/utils/asyncHandler.js";
import { createSalesAdmin, deleteSalesAdmin, getDashboard, getSalesAdminProfile, listSalesAdmins, resetSalesAdminPassword, updateSalesAdmin, listSalesAdminAdmissions, getSalesAdminAdmissionLead, getSalesAdminAvailableBatches, getSalesAdminStudentFeeDetails, getPendingHotAdmissionReminder, startSalesAdminAdmission, convertSalesAdminLead } from "./salesAdmin.service.js";
import { createSalesAdminBatchRequest, listSalesAdminBatchRequests } from "./batchRequests.service.js";
const createSalesAdminHandler = asyncHandler(async (req, res) => res.status(201).json({ message: "Sales Admin created and invitation sent", data: await createSalesAdmin(req.body || {}, req.auth || {}) }));
const listSalesAdminsHandler = asyncHandler(async (_req, res) => res.status(200).json(await listSalesAdmins()));
const resetPasswordHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Password reset email sent", data: await resetSalesAdminPassword(req.params.id, req.auth || {}) }));
const updateSalesAdminHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Sales Admin updated", data: await updateSalesAdmin(req.params.id, req.body || {}, req.auth || {}) }));
const deleteSalesAdminHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Sales Admin deleted", data: await deleteSalesAdmin(req.params.id) }));
const profileHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getSalesAdminProfile(req.auth.userId) }));
const dashboardHandler = asyncHandler(async (req, res) => res.status(200).json(await getDashboard(req.auth.userId, req.query || {})));
const admissionsHandler = asyncHandler(async (req, res) => res.status(200).json(await listSalesAdminAdmissions(req.auth.userId, req.query || {})));
const studentFeeDetailsHandler = asyncHandler(async (req, res) => res.status(200).json({ data: { feeDetails: await getSalesAdminStudentFeeDetails(req.auth.userId, req.params.studentId) } }));
const pendingAdmissionReminderHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getPendingHotAdmissionReminder(req.auth.userId) }));
const admissionLeadHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getSalesAdminAdmissionLead(req.auth.userId, req.params.leadId) }));
const availableBatchesHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getSalesAdminAvailableBatches(req.auth.userId, req.params.leadId) }));
const startAdmissionHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await startSalesAdminAdmission(req.auth.userId, req.params.leadId) }));
const convertAdmissionHandler = asyncHandler(async (req, res) => res.status(201).json({ data: await convertSalesAdminLead(req.auth, req.params.leadId, req.body || {}) }));
const createBatchRequestHandler = asyncHandler(async (req, res) => res.status(201).json({ message: "Batch request sent to the branch", data: await createSalesAdminBatchRequest(req.auth.userId, req.params.leadId) }));
const listBatchRequestsHandler = asyncHandler(async (req, res) => res.status(200).json(await listSalesAdminBatchRequests(req.auth.userId)));
export { createSalesAdminHandler, listSalesAdminsHandler, resetPasswordHandler, updateSalesAdminHandler, deleteSalesAdminHandler, profileHandler, dashboardHandler, admissionsHandler, studentFeeDetailsHandler, pendingAdmissionReminderHandler, admissionLeadHandler, availableBatchesHandler, startAdmissionHandler, convertAdmissionHandler, createBatchRequestHandler, listBatchRequestsHandler };


