import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  generateAllFacultyAttendanceReport,
  generateBatchAttendanceReport,
  generateFacultyAttendanceReport,
  generateStudentAttendanceReport,
} from "./reports.service.js";
import {
  generateBranchBatchAttendanceReport,
  generateBranchStudentAttendanceReport,
} from "./branchAttendanceReports.service.js";
import { generateBranchMonthlyReport } from "./branchMonthlyReportPresentation.service.js";
import { findBranchReportOptions, listReportBranches, resolveBranchId } from "./branchAttendanceReports.repository.js";

function sendExcelResponse(res, report) {
  res.setHeader("Content-Type", report.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`);
  res.setHeader("Content-Length", report.buffer.length);

  return res.status(200).send(report.buffer);
}

export const getStudentAttendanceReportHandler = asyncHandler(async (req, res) => {
  const report = await generateStudentAttendanceReport(req.query);
  return sendExcelResponse(res, report);
});

export const getBatchAttendanceReportHandler = asyncHandler(async (req, res) => {
  const report = await generateBatchAttendanceReport(req.query, req.user);
  return sendExcelResponse(res, report);
});

export const getFacultyAttendanceReportHandler = asyncHandler(async (req, res) => {
  const report = await generateFacultyAttendanceReport(req.query);
  return sendExcelResponse(res, report);
});

export const getAllFacultyAttendanceReportHandler = asyncHandler(async (req, res) => {
  const report = await generateAllFacultyAttendanceReport(req.query);
  return sendExcelResponse(res, report);
});

export const getBranchStudentAttendanceReportHandler = asyncHandler(async (req, res) => {
  const report = await generateBranchStudentAttendanceReport(req.query, req.user);
  return sendExcelResponse(res, report);
});

export const getBranchBatchAttendanceReportHandler = asyncHandler(async (req, res) => {
  const report = await generateBranchBatchAttendanceReport(req.query, req.user);
  return sendExcelResponse(res, report);
});

export const getBranchMonthlyReportHandler = asyncHandler(async (req, res) => { const report = await generateBranchMonthlyReport(req.query, req.user); return sendExcelResponse(res, report); });



export const getReportBranchesHandler = asyncHandler(async (req, res) => {
  const branches = await listReportBranches(req.auth || req.user);
  return res.status(200).json({ data: branches });
});

export const getBranchReportOptionsHandler = asyncHandler(async (req, res) => {
  const branchId = await resolveBranchId(req.user, req.query?.branchId);
  const options = await findBranchReportOptions({ branchId });
  return res.status(200).json({ data: { branchId, ...options } });
});