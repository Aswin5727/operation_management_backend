import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  facultyAttendanceBatches,
  facultyAttendanceLogin,
  facultyAttendanceLogout,
  facultyAttendancePermission,
  getFacultyAttendanceStatus,
  getBranchFacultyAttendanceStatus,
  getBranchFacultyAttendanceHistory,
} from "./facultyAttendance.service.js";

function send(res, message, data) { return res.json({ status: "success", message, data }); }

export const getFacultyAttendanceStatusHandler = asyncHandler(async (req, res) => send(res, "Faculty attendance status fetched successfully", await getFacultyAttendanceStatus(req.user)));
export const getBranchFacultyAttendanceStatusHandler = asyncHandler(async (req, res) => send(res, "Branch faculty attendance status fetched successfully", await getBranchFacultyAttendanceStatus(req.user, req.params.facultyReference)));
export const getBranchFacultyAttendanceHistoryHandler = asyncHandler(async (req, res) => send(res, "Branch faculty attendance history fetched successfully", await getBranchFacultyAttendanceHistory(req.user, req.params.facultyReference, req.query || {})));
export const getFacultyAttendanceBatchesHandler = asyncHandler(async (req, res) => send(res, "Faculty attendance batches fetched successfully", await facultyAttendanceBatches(req.user)));
export const recordFacultyAttendanceApiLoginHandler = asyncHandler(async (req, res) => send(res, "Faculty attendance login saved successfully", await facultyAttendanceLogin(req.user)));
export const recordFacultyAttendanceApiLogoutHandler = asyncHandler(async (req, res) => send(res, "Faculty attendance logout saved successfully", await facultyAttendanceLogout(req.user, req.body || {})));
export const getFacultyAttendancePermissionHandler = asyncHandler(async (req, res) => send(res, "Faculty attendance interruption fetched successfully", await facultyAttendancePermission(req.user)));
