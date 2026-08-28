import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createBranchStudent,
  deleteBranchStudent,
  getBranchStudent,
  getBranchStudentLedger,
  listBranchStudents,
  listBranchLedger,
  updateBranchStudent,
  createBranchStudentPayment,
} from "./branchStudents.service.js";

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

export const listBranchStudentsHandler = asyncHandler(async (req, res) => {
  const result = await listBranchStudents(req.query, req.user);
  return sendSuccess(res, "Branch students fetched successfully", result.data, result.meta);
});

export const createBranchStudentHandler = asyncHandler(async (req, res) => {
  const student = await createBranchStudent(req.body || {}, req.user);
  return sendSuccess(res, "Branch student created successfully", student, undefined, 201);
});

export const listBranchLedgerHandler = asyncHandler(async (req, res) => {
  const result = await listBranchLedger(req.query || {}, req.user);
  return sendSuccess(res, "Branch ledger fetched successfully", result.entries, result.summary);
});

export const getBranchStudentHandler = asyncHandler(async (req, res) => {
  const student = await getBranchStudent(req.params.studentId, req.user);
  return sendSuccess(res, "Branch student fetched successfully", student);
});

export const getBranchStudentLedgerHandler = asyncHandler(async (req, res) => {
  const result = await getBranchStudentLedger(req.params.studentId, req.user);
  return sendSuccess(res, "Branch student ledger fetched successfully", result.entries, result.summary);
});

export const updateBranchStudentHandler = asyncHandler(async (req, res) => {
  const student = await updateBranchStudent(req.params.studentId, req.body || {}, req.user);
  return sendSuccess(res, "Branch student updated successfully", student);
});

export const deleteBranchStudentHandler = asyncHandler(async (req, res) => {
  const student = await deleteBranchStudent(req.params.studentId, req.user);
  return sendSuccess(res, "Branch student deleted successfully", student);
});

export const createBranchStudentPaymentHandler = asyncHandler(async (req, res) => {
  const payment = await createBranchStudentPayment(req.params.studentId, req.body || {}, req.user);
  return sendSuccess(res, "Payment recorded successfully", payment, undefined, 201);
});
