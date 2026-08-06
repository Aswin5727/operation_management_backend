import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  generateAllFacultyAttendanceReport,
  generateBatchAttendanceReport,
  generateFacultyAttendanceReport,
  generateStudentAttendanceReport,
} from "./reports.service.js";

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
