import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createFacultyRecord,
  deleteFacultyRecord,
  getFacultyRecord,
  listFacultyRecords,
  updateFacultyRecord,
} from "./facultyManagement.service.js";

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

export const listFacultyRecordsHandler = asyncHandler(async (req, res) => {
  const result = await listFacultyRecords(req.query);
  return sendSuccess(res, "Faculty records fetched successfully", result.data, result.meta);
});

export const getFacultyRecordHandler = asyncHandler(async (req, res) => {
  const record = await getFacultyRecord(req.params.facultyId);
  return sendSuccess(res, "Faculty record fetched successfully", record);
});

export const createFacultyRecordHandler = asyncHandler(async (req, res) => {
  const record = await createFacultyRecord(req.body || {}, req.user);
  return sendSuccess(res, "Faculty record created successfully", record, undefined, 201);
});

export const updateFacultyRecordHandler = asyncHandler(async (req, res) => {
  const record = await updateFacultyRecord(req.params.facultyId, req.body || {}, req.user);
  return sendSuccess(res, "Faculty record updated successfully", record);
});

export const deleteFacultyRecordHandler = asyncHandler(async (req, res) => {
  const record = await deleteFacultyRecord(req.params.facultyId, req.user);
  return sendSuccess(res, "Faculty record deleted successfully", record);
});
