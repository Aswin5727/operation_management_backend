import asyncHandler from "../../common/utils/asyncHandler.js";
import { completedStudentTemplate, importCompletedStudents, previewCompletedStudentImport } from "./completedStudentImport.service.js";

function sendExcelResponse(res, report) { res.setHeader("Content-Type", report.contentType); res.setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`); res.setHeader("Content-Length", report.buffer.length); return res.status(200).send(report.buffer); }
export const downloadCompletedStudentTemplateHandler = asyncHandler(async (_req, res) => sendExcelResponse(res, await completedStudentTemplate()));
export const previewCompletedStudentImportHandler = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await previewCompletedStudentImport({ buffer: req.file?.buffer, user: req.user }) }));
export const importCompletedStudentsHandler = asyncHandler(async (req, res) => res.status(200).json({ success: true, data: await importCompletedStudents({ rows: req.body?.rows, user: req.user, dryRun: req.body?.dryRun === true, allowMissingContact: req.body?.allowMissingContact === true }) }));
