import asyncHandler from "../../common/utils/asyncHandler.js";
import { completedStudentFailedRowsReport } from "./completedStudentImport.service.js";

export const downloadCompletedStudentFailedRowsHandler = asyncHandler(async (req, res) => {
  const report = await completedStudentFailedRowsReport({ rows: req.body?.rows });
  res.setHeader("Content-Type", report.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`);
  res.setHeader("Content-Length", report.buffer.length);
  return res.status(200).send(report.buffer);
});
