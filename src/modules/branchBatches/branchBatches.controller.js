import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createBranchBatch,
  deleteBranchBatch,
  getBranchBatch,
  listBranchBatches,
  updateBranchBatch,
} from "./branchBatches.service.js";

function sendSuccess(res, message, data, meta = undefined, statusCode = 200) {
  const payload = {
    status: "success",
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

export const listBranchBatchesHandler = asyncHandler(async (req, res) => {
  const result = await listBranchBatches(req.query, req.user);
  return sendSuccess(res, "Branch batches fetched successfully", result.data, result.meta);
});

export const getBranchBatchHandler = asyncHandler(async (req, res) => {
  const batch = await getBranchBatch(req.params.batchGroupId, req.user);
  return sendSuccess(res, "Branch batch fetched successfully", batch);
});

export const createBranchBatchHandler = asyncHandler(async (req, res) => {
  const batch = await createBranchBatch(req.body || {}, req.user);
  return sendSuccess(res, "Branch batch created successfully", batch, undefined, 201);
});

export const updateBranchBatchHandler = asyncHandler(async (req, res) => {
  const batch = await updateBranchBatch(req.params.batchGroupId, req.body || {}, req.user);
  return sendSuccess(res, "Branch batch updated successfully", batch);
});

export const deleteBranchBatchHandler = asyncHandler(async (req, res) => {
  const batch = await deleteBranchBatch(req.params.batchGroupId, req.user);
  return sendSuccess(res, "Branch batch deleted successfully", batch);
});

