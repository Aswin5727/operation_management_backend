import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createFacultyTodayWorkEntry,
  listFacultyTodayWorkEntries,
} from "./facultyTodayWork.service.js";

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

export const listFacultyTodayWorkEntriesHandler = asyncHandler(async (req, res) => {
  const entries = await listFacultyTodayWorkEntries(req.query || {}, req.user);
  return sendSuccess(res, "Faculty today work entries fetched successfully", entries);
});

export const createFacultyTodayWorkEntryHandler = asyncHandler(async (req, res) => {
  const entry = await createFacultyTodayWorkEntry(req.body || {}, req.user);
  return sendSuccess(res, "Faculty today work entry saved successfully", entry, undefined, 201);
});
