import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import asyncHandler from "../../common/utils/asyncHandler.js";
import { approveWeekOffRequest, createWeekOffRequest, getWeekOffRequest, listBranchWeekOffRequests, listMyWeekOffRequests, rejectWeekOffRequest } from "./facultyWeekOffRequests.service.js";
const router = express.Router();
router.use(authenticate);
router.post("/", authorize("FACULTY"), asyncHandler(async (req, res) => res.status(201).json({ data: await createWeekOffRequest(req.user, req.body) })));
router.get("/me", authorize("FACULTY"), asyncHandler(async (req, res) => res.json({ data: await listMyWeekOffRequests(req.user) })));
router.get("/branch", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await listBranchWeekOffRequests(req.user) })));
router.get("/:id", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await getWeekOffRequest(req.user, req.params.id) })));
router.patch("/:id/approve", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await approveWeekOffRequest(req.user, req.params.id) })));
router.patch("/:id/reject", authorize("BRANCH_ADMIN", "SUPER_ADMIN"), asyncHandler(async (req, res) => res.json({ data: await rejectWeekOffRequest(req.user, req.params.id, req.body?.rejectionReason) })));
export default router;

