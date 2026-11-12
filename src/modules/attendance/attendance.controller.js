import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  getCurrentFacultyAttendanceOverview,
  getCurrentStudentAttendanceOverview,
  markFacultyStudentAttendance,
  editBranchStudentAttendance,
  recordFacultyAttendanceLogin,
  recordFacultyAttendanceLogout,
} from "./attendance.service.js";
import {
  getStudentAttendanceOverview,
  getStudentAttendanceOverviewById,
} from "./studentAttendanceOverview.service.js";
import { getStudentCourse } from "./studentCourse.service.js";

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

export const getFacultyAttendanceOverviewHandler = asyncHandler(async (req, res) => {
  const overview = await getCurrentFacultyAttendanceOverview(req.user, req.query?.date, req.query?.facultyId, {
    courseId: req.query?.courseId,
    batchId: req.query?.batchId,
  });
  return sendSuccess(res, "Faculty attendance fetched successfully", overview);
});

export const markFacultyStudentAttendanceHandler = asyncHandler(async (req, res) => {
  const overview = await markFacultyStudentAttendance(req.user, req.body || {});
  return sendSuccess(res, "Attendance saved successfully", overview);
});

export const editBranchStudentAttendanceHandler = asyncHandler(async (req, res) => {
  const overview = await editBranchStudentAttendance(req.user, req.body || {});
  return sendSuccess(res, "Attendance edited successfully", overview);
});

export const recordFacultyAttendanceLoginHandler = asyncHandler(async (req, res) => {
  const overview = await recordFacultyAttendanceLogin(req.user, req.body || {});
  return sendSuccess(res, "Faculty attendance login saved successfully", overview);
});

export const recordFacultyAttendanceLogoutHandler = asyncHandler(async (req, res) => {
  const overview = await recordFacultyAttendanceLogout(req.user, req.body || {});
  return sendSuccess(res, "Faculty attendance logout saved successfully", overview);
});

export const getCurrentStudentAttendanceOverviewHandler = asyncHandler(async (req, res) => {
  const overview = await getCurrentStudentAttendanceOverview(req.user, req.query?.date);
  return sendSuccess(res, "Student attendance fetched successfully", overview);
});

export const getStudentAttendanceOverviewHandler = asyncHandler(async (req, res) => {
  const overview = await getStudentAttendanceOverview(req.user, { month: req.query?.month, courseId: req.query?.courseId });
  return sendSuccess(res, "Student attendance overview fetched successfully", overview);
});

export const getStudentAttendanceOverviewByIdHandler = asyncHandler(async (req, res) => {
  const overview = await getStudentAttendanceOverviewById(req.params.studentId, req.user, { month: req.query?.month });
  return sendSuccess(res, "Student attendance overview fetched successfully", overview);
});

export const getStudentCourseHandler = asyncHandler(async (req, res) => {
  const course = await getStudentCourse(req.user, req.query?.courseId);
  return sendSuccess(res, "Student course fetched successfully", course);
});
