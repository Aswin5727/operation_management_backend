import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createBranchCourseHandler,
  deleteBranchCourseHandler,
  getBranchCourseHandler,
  listBranchCoursesHandler,
  updateBranchCourseHandler,
} from "./branchCourses.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize("BRANCH_ADMIN"));

router.get("/", listBranchCoursesHandler);
router.post("/", createBranchCourseHandler);
router.get("/:courseId", getBranchCourseHandler);
router.patch("/:courseId", updateBranchCourseHandler);
router.delete("/:courseId", deleteBranchCourseHandler);

export default router;
