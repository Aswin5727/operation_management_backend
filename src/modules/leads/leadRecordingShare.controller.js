import asyncHandler from "../../common/utils/asyncHandler.js";
import { createLeadRecordingShare, getSharedRecordingFile, listLeadRecordingShares } from "./leadRecordingShare.service.js";

const response = (res, message, data, status = 200) => res.status(status).json({ status: "success", message, data });

export const createShareHandler = asyncHandler(async (req, res) => {
  const result = await createLeadRecordingShare(req.body || {}, req.auth);
  return response(res, result.duplicate ? "This call recording submission was already sent" : "Call recordings submitted successfully", result, result.duplicate ? 200 : 201);
});
export const listSharesHandler = asyncHandler(async (req, res) => response(res, "Shared call recordings loaded", await listLeadRecordingShares({ actor: req.auth, leadId: req.query.leadId, branchId: req.query.branchId }), 200));
export const listSalesAdminSharesHandler = asyncHandler(async (req, res) => response(res, "Shared call recordings loaded", await listLeadRecordingShares({ actor: req.auth, salesAdminId: req.params.salesAdminId, leadId: req.query.leadId, branchId: req.query.branchId }), 200));
export const sharedRecordingFileHandler = asyncHandler(async (req, res) => { const file = await getSharedRecordingFile(req.params.shareId, req.params.recordingId, req.auth); res.setHeader("Content-Type", file.mimeType); res.setHeader("Content-Disposition", `inline; filename="${String(file.fileName).replace(/[^a-zA-Z0-9._-]/g, "_")}"`); res.send(file.buffer); });
