import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createBranchInstallmentTemplate,
  deleteBranchInstallmentTemplate,
  getBranchInstallmentTemplate,
  listBranchInstallmentTemplates,
  updateBranchInstallmentTemplate,
} from "./branchInstallmentTemplates.service.js";

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

export const listBranchInstallmentTemplatesHandler = asyncHandler(async (req, res) => {
  const result = await listBranchInstallmentTemplates(req.query, req.user);
  return sendSuccess(res, "Branch installment templates fetched successfully", result.data, result.meta);
});

export const createBranchInstallmentTemplateHandler = asyncHandler(async (req, res) => {
  const template = await createBranchInstallmentTemplate(req.body || {}, req.user);
  return sendSuccess(res, "Branch installment template created successfully", template, undefined, 201);
});

export const getBranchInstallmentTemplateHandler = asyncHandler(async (req, res) => {
  const template = await getBranchInstallmentTemplate(req.params.templateId, req.user);
  return sendSuccess(res, "Branch installment template fetched successfully", template);
});

export const updateBranchInstallmentTemplateHandler = asyncHandler(async (req, res) => {
  const template = await updateBranchInstallmentTemplate(req.params.templateId, req.body || {}, req.user);
  return sendSuccess(res, "Branch installment template updated successfully", template);
});

export const deleteBranchInstallmentTemplateHandler = asyncHandler(async (req, res) => {
  const template = await deleteBranchInstallmentTemplate(req.params.templateId, req.user);
  return sendSuccess(res, "Branch installment template deleted successfully", template);
});

