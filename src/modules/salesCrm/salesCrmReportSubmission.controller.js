import asyncHandler from "../../common/utils/asyncHandler.js";
import { getSalesCrmReport, listSalesCrmReports, submitSalesCrmReport } from "./salesCrmReportSubmission.service.js";

const submitHandler = asyncHandler(async (req, res) => res.status(201).json({ data: await submitSalesCrmReport(req.body || {}, req.auth || req.user || {}) }));
const listHandler = asyncHandler(async (req, res) => res.status(200).json(await listSalesCrmReports(req.params.salesAdminId, req.query || {})));
const viewHandler = asyncHandler(async (req, res) => res.status(200).json({ data: await getSalesCrmReport(req.params.reportId, "view") }));
const downloadHandler = asyncHandler(async (req, res) => { const report = await getSalesCrmReport(req.params.reportId, "download"); res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", `attachment; filename="${report.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`); res.send(report.fileData); });

export { submitHandler, listHandler, viewHandler, downloadHandler };
