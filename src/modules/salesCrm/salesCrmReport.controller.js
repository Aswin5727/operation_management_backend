import asyncHandler from "../../common/utils/asyncHandler.js";
import { getMonthlySalesCrmReport } from "./salesCrmReport.service.js";

export const monthlySalesCrmReportHandler = asyncHandler(async (req, res) => {
  res.status(200).json({ status: "success", message: "Sales CRM monthly report fetched successfully", data: await getMonthlySalesCrmReport(req.query || {}, req.auth) });
});
