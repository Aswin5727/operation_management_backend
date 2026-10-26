import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createBranch,
  deleteBranch,
  getCurrentBranchProfile,
  listBranchSalesAdmins,
  listBranches,
  resendBranchInvitation,
  updateBranch,
} from "./branches.service.js";

const listBranchesHandler = asyncHandler(async (req, res) => {
  const result = await listBranches(req.query || {});
  res.status(200).json(result);
});

const createBranchHandler = asyncHandler(async (req, res) => {
  const result = await createBranch(req.body || {}, req.auth || {});
  res.status(201).json({
    message: "Branch created successfully",
    data: result,
  });
});

const updateBranchHandler = asyncHandler(async (req, res) => {
  const result = await updateBranch(req.params.branchId, req.body || {}, req.auth || {});
  res.status(200).json({
    message: "Branch updated successfully",
    data: result,
  });
});

const deleteBranchHandler = asyncHandler(async (req, res) => {
  const result = await deleteBranch(req.params.branchId);
  res.status(200).json({
    message: "Branch deleted successfully",
    data: result,
  });
});

const resendBranchInvitationHandler = asyncHandler(async (req, res) => {
  const result = await resendBranchInvitation(req.params.branchId, req.auth || {});
  res.status(200).json(result);
});

const getCurrentBranchProfileHandler = asyncHandler(async (req, res) => {
  const result = await getCurrentBranchProfile(req.auth || {});
  res.status(200).json({
    data: result,
  });
});

const listBranchSalesAdminsHandler = asyncHandler(async (req, res) => {
  const result = await listBranchSalesAdmins(req.user || req.auth || {});
  res.status(200).json({ data: result });
});

export {
  createBranchHandler,
  deleteBranchHandler,
  getCurrentBranchProfileHandler,
  listBranchSalesAdminsHandler,
  listBranchesHandler,
  resendBranchInvitationHandler,
  updateBranchHandler,
};
