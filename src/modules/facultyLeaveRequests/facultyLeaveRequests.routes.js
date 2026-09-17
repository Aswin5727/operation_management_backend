import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import asyncHandler from "../../common/utils/asyncHandler.js";
import { approveBranchFacultyLeave, cancelFacultyLeaveRequest, createFacultyLeaveRequest, getBranchFacultyLeaveRequest, listBranchFacultyLeaveRequests, listMyFacultyLeaveRequests, listMyFacultySchedule, listMyTemporaryBatchStudents, listMyTemporaryFacultyBatches, listReplacementFaculty, rejectBranchFacultyLeave, resolveBranchFacultyLeaveSession, updateFacultyLeaveRequest } from "./facultyLeaveRequests.service.js";

const router = express.Router();
router.use(authenticate);
router.get("/me", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await listMyFacultyLeaveRequests(req.user) })));
router.get("/me/schedule", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await listMyFacultySchedule(req.user) })));
router.get("/me/temporary-batches", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await listMyTemporaryFacultyBatches(req.user) })));
router.get("/me/temporary-batches/:sessionId/students", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await listMyTemporaryBatchStudents(req.user, req.params.sessionId) })));
router.post("/", authorize("FACULTY"), asyncHandler(async (req, res) => res.status(201).json({ data: await createFacultyLeaveRequest(req.user, req.body) })));
router.patch("/:id", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await updateFacultyLeaveRequest(req.user, req.params.id, req.body) })));
router.post("/:id/cancel", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await cancelFacultyLeaveRequest(req.user, req.params.id) })));
router.get("/branch", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await listBranchFacultyLeaveRequests(req.user, req.query) })));
router.get("/:id", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await getBranchFacultyLeaveRequest(req.user, req.params.id) })));
router.get("/:leaveId/sessions/:sessionId/eligible-faculty", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await listReplacementFaculty(req.user, req.params.leaveId, req.params.sessionId, req.query?.assignmentType, req.query) })));
router.post("/:leaveId/sessions/:sessionId/resolve", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await resolveBranchFacultyLeaveSession(req.user, req.params.leaveId, req.params.sessionId, req.body) })));
router.post("/:id/approve", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await approveBranchFacultyLeave(req.user, req.params.id) })));
router.post("/:id/reject", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await rejectBranchFacultyLeave(req.user, req.params.id, req.body?.reason) })));

export default router;
