import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import asyncHandler from "../../common/utils/asyncHandler.js";
import { createFacultyLeaveRequest, listBranchFacultyLeaveRequests, listMyFacultyLeaveRequests } from "./facultyLeaveRequests.service.js";

const router = express.Router();
router.use(authenticate);
router.get("/me", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await listMyFacultyLeaveRequests(req.user) })));
router.post("/", authorize("FACULTY"), asyncHandler(async (req, res) => res.status(201).json({ data: await createFacultyLeaveRequest(req.user, req.body) })));
router.get("/branch", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await listBranchFacultyLeaveRequests(req.user, req.query) })));

export default router;
