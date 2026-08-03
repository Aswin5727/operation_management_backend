import asyncHandler from "../../common/utils/asyncHandler.js";
import { getRevenueInsights, getRevenueSummary } from "./dashboard.service.js";

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

export const getRevenueInsightsHandler = asyncHandler(async (_req, res) => {
  const insights = await getRevenueInsights();
  return sendSuccess(res, "Revenue insights fetched successfully", insights);
});
