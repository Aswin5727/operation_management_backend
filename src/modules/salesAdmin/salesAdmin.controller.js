import asyncHandler from "../../common/utils/asyncHandler.js";
import { createSalesAdmin, deleteSalesAdmin, getDashboard, getSalesAdminProfile, updateOwnSalesAdminProfile, listSalesAdmins, resetSalesAdminPassword, updateSalesAdmin, listSalesAdminAdmissions, getSalesAdminAdmissionLead, getSalesAdminAvailableBatches, getSalesAdminStudentFeeDetails, getPendingHotAdmissionReminder, startSalesAdminAdmission, convertSalesAdminLead } from "./salesAdmin.service.js";
import { createSalesAdminBatchRequest, listSalesAdminBatchRequests, resendSalesAdminBatchRequest } from "./batchRequests.service.js";
const createSalesAdminHandler = asyncHandler(async (req, res) => res.status(201).json({ message: "Sales Admin created and invitation sent", data: await createSalesAdmin(req.body || {}, req.auth || {}) }));
const listSalesAdminsHandler = asyncHandler(async (req, res) => res.status(200).json(await listSalesAdmins(Boolean(req.query?.includeCombinedBranchAdmins), req.query?.startDate, req.query?.endDate)));
const resetPasswordHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Password reset email sent", data: await resetSalesAdminPassword(req.params.id, req.auth || {}) }));
const updateSalesAdminHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Sales Admin updated", data: await updateSalesAdmin(req.params.id, req.body || {}, req.auth || {}) }));
const deleteSalesAdminHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Sales Admin deleted", data: await deleteSalesAdmin(req.params.id) }));
const profileHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getSalesAdminProfile(req.auth.userId) }));
const updateProfileHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Profile updated", data: await updateOwnSalesAdminProfile(req.auth.userId, req.body || {}) }));
const dashboardHandler = asyncHandler(async (req, res) => res.status(200).json(await getDashboard(req.auth.userId, req.query || {}, req.auth || {})));
const admissionsHandler = asyncHandler(async (req, res) => res.status(200).json(await listSalesAdminAdmissions(req.auth, req.query || {})));
const studentFeeDetailsHandler = asyncHandler(async (req, res) => res.status(200).json({ data: { feeDetails: await getSalesAdminStudentFeeDetails(req.auth, req.params.studentId) } }));
const pendingAdmissionReminderHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getPendingHotAdmissionReminder(req.auth) }));
const admissionLeadHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getSalesAdminAdmissionLead(req.auth, req.params.leadId) }));
const availableBatchesHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getSalesAdminAvailableBatches(req.auth, req.params.leadId) }));
const startAdmissionHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await startSalesAdminAdmission(req.auth, req.params.leadId) }));
const convertAdmissionHandler = asyncHandler(async (req, res) => res.status(201).json({ data: await convertSalesAdminLead(req.auth, req.params.leadId, req.body || {}) }));
const createBatchRequestHandler = asyncHandler(async (req, res) => res.status(201).json({ message: "Batch request sent to the branch", data: await createSalesAdminBatchRequest(req.auth, req.params.leadId) }));
const listBatchRequestsHandler = asyncHandler(async (req, res) => res.status(200).json(await listSalesAdminBatchRequests(req.auth)));
const resendBatchRequestHandler = asyncHandler(async (req, res) => res.status(200).json({ message: "Batch request notification resent to the branch", data: await resendSalesAdminBatchRequest(req.auth, req.params.requestId) }));
export { createSalesAdminHandler, listSalesAdminsHandler, resetPasswordHandler, updateSalesAdminHandler, deleteSalesAdminHandler, profileHandler, updateProfileHandler, dashboardHandler, admissionsHandler, studentFeeDetailsHandler, pendingAdmissionReminderHandler, admissionLeadHandler, availableBatchesHandler, startAdmissionHandler, convertAdmissionHandler, createBatchRequestHandler, listBatchRequestsHandler, resendBatchRequestHandler };


