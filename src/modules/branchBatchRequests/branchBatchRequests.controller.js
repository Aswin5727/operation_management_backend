import asyncHandler from "../../common/utils/asyncHandler.js";
import { listBranchBatchRequests, updateBranchBatchRequest } from "../salesAdmin/batchRequests.service.js";

export const listBranchBatchRequestsHandler = asyncHandler(async (req, res) => {
  const result = await listBranchBatchRequests(req.user, req.query || {});
  return res.status(200).json({ status: "success", ...result });
});

export const updateBranchBatchRequestHandler = asyncHandler(async (req, res) => {
  const data = await updateBranchBatchRequest(req.user, req.params.requestId, req.body || {});
  return res.status(200).json({ status: "success", message: "Batch request updated", data });
});
