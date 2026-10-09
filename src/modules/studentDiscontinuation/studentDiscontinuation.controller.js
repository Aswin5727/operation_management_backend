import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createDiscontinuationRequest,
  getDiscontinuationRequest,
  listDiscontinuationRequests,
  reviewDiscontinuationByBranch,
  reviewMotivationFollowUpByBranch,
  reviewDiscontinuationBySuperAdmin,
} from "./studentDiscontinuation.service.js";

function sendSuccess(res, message, data, statusCode = 200) {
  return res.status(statusCode).json({ status: "success", message, data });
}

export const createDiscontinuationRequestHandler = asyncHandler(async (req, res) => {
  const result = await createDiscontinuationRequest(req.user, req.body || {});
  return sendSuccess(res, "Discontinuation request submitted successfully", result, 201);
});

export const getDiscontinuationFinancePreviewHandler = asyncHandler(async (req, res) => {
  const result = await getDiscontinuationFinancePreview(req.user);
  return sendSuccess(res, "Discontinuation finance preview fetched successfully", result);
});

export const listDiscontinuationRequestsHandler = asyncHandler(async (req, res) => {
  const result = await listDiscontinuationRequests(req.user, req.query || {});
  return sendSuccess(res, "Discontinuation requests fetched successfully", result);
});

export const getDiscontinuationRequestHandler = asyncHandler(async (req, res) => {
  const result = await getDiscontinuationRequest(req.params.requestId, req.user);
  return sendSuccess(res, "Discontinuation request fetched successfully", result);
});

export const reviewDiscontinuationByBranchHandler = asyncHandler(async (req, res) => {
  const result = await reviewDiscontinuationByBranch(req.params.requestId, req.user, req.body || {});
  return sendSuccess(res, "Branch review saved successfully", result);
});

export const reviewMotivationFollowUpByBranchHandler = asyncHandler(async (req, res) => {
  const result = await reviewMotivationFollowUpByBranch(req.params.studentId, req.user, req.body || {});
  return sendSuccess(res, "Motivation follow-up outcome saved successfully", result);
});

export const reviewDiscontinuationBySuperAdminHandler = asyncHandler(async (req, res) => {
  const result = await reviewDiscontinuationBySuperAdmin(req.params.requestId, req.user, req.body || {});
  return sendSuccess(res, "Discontinuation decision saved successfully", result);
});
