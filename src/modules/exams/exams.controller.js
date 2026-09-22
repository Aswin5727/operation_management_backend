import asyncHandler from "../../common/utils/asyncHandler.js";
import * as service from "./exams.service.js";

export const facultyCourses = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.listFacultyCourses(req.user) }));
export const facultyBatches = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.listFacultyBatches(req.user, req.params.courseId) }));
export const facultyModules = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.listFacultyModules(req.user, req.params.courseId) }));
export const listFacultyTests = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.listFacultyTests(req.user) }));
export const createTest = asyncHandler(async (req, res) => res.status(201).json({ status: "success", data: await service.createTest(req.user, req.body) }));
export const updateTest = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.updateTest(req.user, req.params.testId, req.body) }));
export const getFacultyTest = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.getFacultyTest(req.user, req.params.testId) }));
export const downloadPdf = asyncHandler(async (req, res) => { const pdf = await service.buildQuestionPaperPdf(req.user, req.params.testId); res.type("application/pdf").set("Content-Disposition", `attachment; filename="question-paper-${req.params.testId}.pdf"`).send(pdf); });
export const listSubmissions = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.listSubmissions(req.user, req.params.testId, req.params.scheduleId) }));
export const getSubmission = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.getSubmission(req.user, req.params.testId, req.params.scheduleId, req.params.attemptId) }));
export const listStudentTests = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.listStudentTests(req.user) }));
export const getStudentTest = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.getStudentTest(req.user, req.params.scheduleId) }));
export const startTest = asyncHandler(async (req, res) => res.status(201).json({ status: "success", data: await service.startTest(req.user, req.params.scheduleId) }));
export const submitTest = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.submitTest(req.user, req.params.scheduleId, req.body) }));
export const getStudentResult = asyncHandler(async (req, res) => res.json({ status: "success", data: await service.getStudentResult(req.user, req.params.scheduleId) }));
