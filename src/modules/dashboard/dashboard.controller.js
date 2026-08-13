import asyncHandler from "../../common/utils/asyncHandler.js";
import { getFacultyMyBatchesSummary, getRevenueSummary } from "./dashboard.service.js";

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
