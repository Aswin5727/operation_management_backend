import asyncHandler from "../../common/utils/asyncHandler.js";
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  updateStudent,
} from "./students.service.js";

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

export const listStudentsHandler = asyncHandler(async (req, res) => {
  const result = await listStudents(req.query);
  return sendSuccess(res, "Students fetched successfully", result.data, result.meta);
});

export const createStudentHandler = asyncHandler(async (req, res) => {
  const student = await createStudent(req.body || {}, req.user);
  return sendSuccess(res, "Student created successfully", student, undefined, 201);
});

export const getStudentHandler = asyncHandler(async (req, res) => {
  const student = await getStudent(req.params.studentId);
  return sendSuccess(res, "Student fetched successfully", student);
});

export const updateStudentHandler = asyncHandler(async (req, res) => {
  const student = await updateStudent(req.params.studentId, req.body || {}, req.user);
  return sendSuccess(res, "Student updated successfully", student);
});

export const deleteStudentHandler = asyncHandler(async (req, res) => {
  const student = await deleteStudent(req.params.studentId, req.user);
  return sendSuccess(res, "Student deleted successfully", student);
});
