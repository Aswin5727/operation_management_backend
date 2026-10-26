import asyncHandler from "../../common/utils/asyncHandler.js";
import { addFollowUp, addLeadRecording, addLeadRecordings, checkLeadDuplicates, createLead, deleteLead, deleteLeadRecording, getLead, getLeadOptions, getLeadRecording, listLeadActivities, listLeads, updateLead } from "./leads.service.js";
import { generateLeadExcelReport } from "./leadReport.service.js";

const response = (res, message, data, status = 200, meta = undefined) => res.status(status).json({ status: "success", message, data, ...(meta ? { meta } : {}) });
export const listLeadsHandler = asyncHandler(async (req, res) => { const result = await listLeads(req.query, req.auth); return response(res, "Leads fetched successfully", result.data, 200, result.meta); });
export const checkLeadDuplicatesHandler = asyncHandler(async (req, res) => response(res, 'Lead duplicate check completed', await checkLeadDuplicates(req.query, req.auth)));
export const createLeadHandler = asyncHandler(async (req, res) => response(res, "Lead created successfully", await createLead(req.body || {}, req.auth), 201));
export const getLeadHandler = asyncHandler(async (req, res) => response(res, "Lead fetched successfully", await getLead(req.params.id, req.auth)));
export const updateLeadHandler = asyncHandler(async (req, res) => response(res, "Lead updated successfully", await updateLead(req.params.id, req.body || {}, req.auth)));
export const deleteLeadHandler = asyncHandler(async (req, res) => response(res, "Lead deleted successfully", await deleteLead(req.params.id, req.auth)));
export const addFollowUpHandler = asyncHandler(async (req, res) => response(res, "Follow-up added successfully", await addFollowUp(req.params.id, req.body || {}, req.auth), 201));
export const listLeadActivitiesHandler = asyncHandler(async (req, res) => response(res, "Lead activities fetched successfully", await listLeadActivities(req.params.id, req.auth)));
export const leadOptionsHandler = asyncHandler(async (req, res) => response(res, "Lead options fetched successfully", await getLeadOptions(req.auth)));
export const addLeadRecordingHandler = asyncHandler(async (req, res) => response(res, "Call recording uploaded successfully", await addLeadRecording(req.params.id, req.file, req.auth), 201));
export const addLeadRecordingsHandler = asyncHandler(async (req, res) => response(res, "Call recordings uploaded successfully", await addLeadRecordings(req.params.id, req.files, req.auth, req.body?.followUpId || null), 201));
export const getLeadRecordingHandler = asyncHandler(async (req, res) => { const file = await getLeadRecording(req.params.id, req.params.recordingId, req.auth); res.setHeader("Content-Type", file.mimeType); res.setHeader("Content-Disposition", `inline; filename="${String(file.fileName).replace(/[^a-zA-Z0-9._-]/g, "_")}"`); res.send(file.buffer); });
export const deleteLeadRecordingHandler = asyncHandler(async (req, res) => response(res, "Call recording deleted successfully", await deleteLeadRecording(req.params.id, req.params.recordingId, req.auth)));
export const exportLeadReportHandler = asyncHandler(async (req, res) => {
  const report = await generateLeadExcelReport(req.query, req.auth);
  res.setHeader("Content-Type", report.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`);
  res.setHeader("Content-Length", report.buffer.length);
  return res.status(200).send(report.buffer);
});
