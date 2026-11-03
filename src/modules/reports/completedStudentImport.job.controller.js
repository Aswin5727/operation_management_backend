import asyncHandler from "../../common/utils/asyncHandler.js";
import { cancelCompletedStudentImportJob } from "./completedStudentImport.cancel.js";
import {
  createCompletedStudentImportJob,
  downloadCompletedStudentImportFailedRows,
  getCompletedStudentImportJob,
  listCompletedStudentImportJobs,
  retryCompletedStudentImportJob,
} from "./completedStudentImport.job.js";

export const createCompletedStudentImportJobHandler = asyncHandler(async (req, res) => {
  const result = await createCompletedStudentImportJob({
    rows: req.body?.rows,
    user: req.user,
    allowMissingContact: req.body?.allowMissingContact === true,
    fileName: req.body?.fileName || null,
    skippedRows: req.body?.skippedRows || 0,
  });
  if (result.validationRequired) return res.status(422).json({ success: false, message: result.message, data: result });
  return res.status(202).json({ success: true, data: result });
});

export const listCompletedStudentImportJobsHandler = asyncHandler(async (req, res) => {
  const data = await listCompletedStudentImportJobs({ user: req.user });
  return res.status(200).json({ success: true, data });
});

export const getCompletedStudentImportJobHandler = asyncHandler(async (req, res) => {
  const data = await getCompletedStudentImportJob({ jobId: req.params.jobId, user: req.user });
  return res.status(200).json({ success: true, data });
});

export const cancelCompletedStudentImportJobHandler = asyncHandler(async (req, res) => {
  const data = await cancelCompletedStudentImportJob({ jobId: req.params.jobId, user: req.user });
  return res.status(200).json({ success: true, data });
});

export const retryCompletedStudentImportJobHandler = asyncHandler(async (req, res) => {
  const data = await retryCompletedStudentImportJob({ jobId: req.params.jobId, user: req.user });
  return res.status(202).json({ success: true, data });
});

export const downloadCompletedStudentImportFailedRowsHandler = asyncHandler(async (req, res) => {
  const report = await downloadCompletedStudentImportFailedRows({ jobId: req.params.jobId, user: req.user });
  res.setHeader("Content-Type", report.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`);
  res.setHeader("Content-Length", report.buffer.length);
  return res.status(200).send(report.buffer);
});
