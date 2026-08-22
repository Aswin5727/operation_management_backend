import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  acceptCourseEditRequest,
  createCourseEditRequest,
  getCourseEditRequest,
  listCourseEditRequests,
  rejectCourseEditRequest,
  saveCourseEditRequestModules,
} from "./courseEditRequests.service.js";

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

export const createCourseEditRequestHandler = asyncHandler(async (req, res) => {
  const result = await createCourseEditRequest(req.user, req.body || {});
  return sendSuccess(res, "Edit request created successfully", result, undefined, 201);
});

export const listCourseEditRequestsHandler = asyncHandler(async (req, res) => {
  const result = await listCourseEditRequests(req.query || {}, req.user || {});
  return sendSuccess(res, "Edit requests fetched successfully", result.data, result.meta);
});

export const getCourseEditRequestHandler = asyncHandler(async (req, res) => {
  const result = await getCourseEditRequest(req.params.requestId, req.user || {});
  return sendSuccess(res, "Edit request fetched successfully", result);
});

export const acceptCourseEditRequestHandler = asyncHandler(async (req, res) => {
  const result = await acceptCourseEditRequest(req.params.requestId, req.body || {}, req.user || {});
  return sendSuccess(res, "Edit request accepted successfully", result);
});

export const rejectCourseEditRequestHandler = asyncHandler(async (req, res) => {
  const result = await rejectCourseEditRequest(req.params.requestId, req.body || {}, req.user || {});
  return sendSuccess(res, "Edit request rejected successfully", result);
});

export const saveCourseEditRequestModulesHandler = asyncHandler(async (req, res) => {
  const result = await saveCourseEditRequestModules(req.params.requestId, req.body || {}, req.user || {});
  return sendSuccess(res, "Course modules saved successfully", result);
});
