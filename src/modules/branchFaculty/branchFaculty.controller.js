import asyncHandler from "../../common/utils/asyncHandler.js";
import * as branchFacultyService from "./branchFaculty.service.js";

export const listBranchFacultyHandler = asyncHandler(async (req, res) => {
  const result = await branchFacultyService.listBranchFaculty(req.user, req.query);
  res.json({ status: "success", data: result.data, meta: result.meta });
});

export const checkBranchFacultyPhoneHandler = asyncHandler(async (req, res) => {
  const result = await branchFacultyService.checkBranchFacultyPhone(req.query.phone);
  res.json({ status: "success", data: result });
});

export const createBranchFacultyHandler = asyncHandler(async (req, res) => {
  const result = await branchFacultyService.createBranchFaculty(req.user, req.body);
  res.status(201).json({ status: "success", data: result });
});

export const updateBranchFacultyHandler = asyncHandler(async (req, res) => {
  const result = await branchFacultyService.updateBranchFaculty(req.user, req.params.id, req.body);
  res.json({ status: "success", data: result });
});

export const deleteBranchFacultyHandler = asyncHandler(async (req, res) => {
  await branchFacultyService.deleteBranchFaculty(req.user, req.params.id);
  res.json({ status: "success", message: "Branch faculty deleted successfully." });
});
