import asyncHandler from "../../common/utils/asyncHandler.js";
import { getFacultyDashboardOverview, getFacultyMyBatchesSummary, getRevenueSummary, getSuperAdminOverview } from "./dashboard.service.js";

function sendSuccess(res, message, data, statusCode = 200) {
  return res.status(statusCode).json({
    status: "success",
    message,
    data,
  });
}

export const getRevenueSummaryHandler = asyncHandler(async (_req, res) => {
  const summary = await getRevenueSummary();
  return sendSuccess(res, "Revenue summary fetched successfully", summary);
});

export const getFacultyMyBatchesSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getFacultyMyBatchesSummary(req.user);
  return sendSuccess(res, "Faculty batches summary fetched successfully", summary);
});

export const getFacultyDashboardOverviewHandler = asyncHandler(async (req, res) => {
  const overview = await getFacultyDashboardOverview(req.user);
  return sendSuccess(res, "Faculty dashboard overview fetched successfully", overview);
});

export const getSuperAdminOverviewHandler = asyncHandler(async (req, res) => {
  const overview = await getSuperAdminOverview(req.query?.branchId || null, {
    period: req.query?.period,
    startDate: req.query?.startDate,
    endDate: req.query?.endDate,
  });
  return sendSuccess(res, "Super Admin dashboard overview fetched successfully", overview);
});
