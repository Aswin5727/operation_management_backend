import asyncHandler from "../../common/utils/asyncHandler.js";
import AppError from "../../common/errors/AppError.js";
import {
  createBatch,
  createBatchFacultyAssignment,
  createCourse,
  createCourseModule,
  deleteBatch,
  deleteBatchFacultyAssignment,
  deleteCourse,
  deleteCourseModule,
  getBatch,
  getCourse,
  listBatchFacultyAssignments,
  listBatchStatusHistory,
  listBatches,
  listCourseModules,
  listCourseStatusHistory,
  listCourses,
  reorderCourseModules,
  updateBatch,
  updateBatchFacultyAssignment,
  updateBatchStatus,
  updateCourse,
  updateCourseStatus,
  updateCourseModule,
} from "./masterSetup.service.js";

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

function parseBodyArray(value, fieldName) {
  if (!Array.isArray(value) || !value.length) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  return value;
}

export const listCoursesHandler = asyncHandler(async (req, res) => {
  const result = await listCourses(req.query);
  return sendSuccess(res, "Courses fetched successfully", result.data, result.meta);
});

export const createCourseHandler = asyncHandler(async (req, res) => {
  const course = await createCourse(req.body || {}, req.user);
  return sendSuccess(res, "Course created successfully", course, undefined, 201);
});

export const getCourseHandler = asyncHandler(async (req, res) => {
  const course = await getCourse(req.params.courseId);
  return sendSuccess(res, "Course fetched successfully", course);
});

export const updateCourseHandler = asyncHandler(async (req, res) => {
  const course = await updateCourse(req.params.courseId, req.body || {}, req.user);
  return sendSuccess(res, "Course updated successfully", course);
});

export const deleteCourseHandler = asyncHandler(async (req, res) => {
  const course = await deleteCourse(req.params.courseId, req.user);
  return sendSuccess(res, "Course deleted successfully", course);
});

export const updateCourseStatusHandler = asyncHandler(async (req, res) => {
  const course = await updateCourseStatus(req.params.courseId, req.body?.status, req.user, req.body?.reason || null);
  return sendSuccess(res, "Course status updated successfully", course);
});

export const listCourseStatusHistoryHandler = asyncHandler(async (req, res) => {
  const result = await listCourseStatusHistory(req.params.courseId);
  return sendSuccess(res, "Course status history fetched successfully", result.data);
});

export const listCourseModulesHandler = asyncHandler(async (req, res) => {
  const result = await listCourseModules(req.params.courseId, req.query);
  return sendSuccess(res, "Course modules fetched successfully", result.data, result.meta);
});

export const createCourseModuleHandler = asyncHandler(async (req, res) => {
  const module = await createCourseModule(req.params.courseId, req.body || {}, req.user);
  return sendSuccess(res, "Module created successfully", module, undefined, 201);
});

export const updateCourseModuleHandler = asyncHandler(async (req, res) => {
  const module = await updateCourseModule(req.params.courseId, req.params.moduleId, req.body || {}, req.user);
  return sendSuccess(res, "Module updated successfully", module);
});

export const deleteCourseModuleHandler = asyncHandler(async (req, res) => {
  const module = await deleteCourseModule(req.params.courseId, req.params.moduleId, req.user);
  return sendSuccess(res, "Module marked as inactive", module);
});

export const reorderCourseModulesHandler = asyncHandler(async (req, res) => {
  const orderedModuleIds = parseBodyArray(req.body?.orderedModuleIds, "orderedModuleIds");
  const result = await reorderCourseModules(req.params.courseId, orderedModuleIds, req.user);
  return sendSuccess(res, "Modules reordered successfully", result.data);
});

export const listBatchesHandler = asyncHandler(async (req, res) => {
  const result = await listBatches(req.query);
  return sendSuccess(res, "Batches fetched successfully", result.data, result.meta);
});

export const createBatchHandler = asyncHandler(async (req, res) => {
  const batch = await createBatch(req.body || {}, req.user);
  return sendSuccess(res, "Batch created successfully", batch, undefined, 201);
});

export const getBatchHandler = asyncHandler(async (req, res) => {
  const batch = await getBatch(req.params.batchId);
  return sendSuccess(res, "Batch fetched successfully", batch);
});

export const updateBatchHandler = asyncHandler(async (req, res) => {
  const batch = await updateBatch(req.params.batchId, req.body || {}, req.user);
  return sendSuccess(res, "Batch updated successfully", batch);
});

export const deleteBatchHandler = asyncHandler(async (req, res) => {
  const batch = await deleteBatch(req.params.batchId, req.user);
  return sendSuccess(res, "Batch marked as inactive", batch);
});

export const updateBatchStatusHandler = asyncHandler(async (req, res) => {
  const batch = await updateBatchStatus(req.params.batchId, req.body?.status, req.user, req.body?.reason || null);
  return sendSuccess(res, "Batch status updated successfully", batch);
});

export const listBatchStatusHistoryHandler = asyncHandler(async (req, res) => {
  const result = await listBatchStatusHistory(req.params.batchId);
  return sendSuccess(res, "Batch status history fetched successfully", result.data);
});

export const listBatchFacultyAssignmentsHandler = asyncHandler(async (req, res) => {
  const result = await listBatchFacultyAssignments(req.params.batchId, req.query);
  return sendSuccess(res, "Faculty assignments fetched successfully", result.data, result.meta);
});

export const createBatchFacultyAssignmentHandler = asyncHandler(async (req, res) => {
  const assignment = await createBatchFacultyAssignment(req.params.batchId, req.body || {}, req.user);
  return sendSuccess(res, "Faculty assigned successfully", assignment, undefined, 201);
});

export const updateBatchFacultyAssignmentHandler = asyncHandler(async (req, res) => {
  const assignment = await updateBatchFacultyAssignment(
    req.params.batchId,
    req.params.assignmentId,
    req.body || {},
    req.user,
  );
  return sendSuccess(res, "Faculty assignment updated successfully", assignment);
});

export const deleteBatchFacultyAssignmentHandler = asyncHandler(async (req, res) => {
  const assignment = await deleteBatchFacultyAssignment(req.params.batchId, req.params.assignmentId, req.user);
  return sendSuccess(res, "Faculty assignment marked as inactive", assignment);
});
