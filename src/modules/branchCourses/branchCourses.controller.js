import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  assignFacultyToBranchCourse,
  createBranchCourse,
  deleteBranchCourse,
  getBranchCourse,
  listBranchCourses,
  updateBranchCourse,
} from "./branchCourses.service.js";

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

export const listBranchCoursesHandler = asyncHandler(async (req, res) => {
  const result = await listBranchCourses(req.query, req.user);
  return sendSuccess(res, "Branch courses fetched successfully", result.data, result.meta);
});

export const createBranchCourseHandler = asyncHandler(async (req, res) => {
  const course = await createBranchCourse(req.body || {}, req.user);
  return sendSuccess(res, "Branch course created successfully", course, undefined, 201);
});

export const getBranchCourseHandler = asyncHandler(async (req, res) => {
  const course = await getBranchCourse(req.params.courseId, req.user);
  return sendSuccess(res, "Branch course fetched successfully", course);
});

export const updateBranchCourseHandler = asyncHandler(async (req, res) => {
  const course = await updateBranchCourse(req.params.courseId, req.body || {}, req.user);
  return sendSuccess(res, "Branch course updated successfully", course);
});

export const deleteBranchCourseHandler = asyncHandler(async (req, res) => {
  const course = await deleteBranchCourse(req.params.courseId, req.user);
  return sendSuccess(res, "Branch course deleted successfully", course);
});

export const assignFacultyToBranchCourseHandler = asyncHandler(
  async (req, res) => {
    const facultyIds = Array.isArray(req.body?.facultyIds)
      ? req.body.facultyIds
      : [];

    const course = await assignFacultyToBranchCourse(
      req.params.courseId,
      facultyIds,
      req.user,
    );

    return sendSuccess(
      res,
      "Faculty assigned to course successfully",
      course,
    );
  },
);