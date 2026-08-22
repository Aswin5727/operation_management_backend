import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import {
  createBranchCourseHandler,
  deleteBranchCourseHandler,
  getBranchCourseHandler,
  listBranchCoursesHandler,
  updateBranchCourseHandler,
  assignFacultyToBranchCourseHandler,
} from "./branchCourses.controller.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.FACULTY),
  listBranchCoursesHandler,
);
router.get(
  "/:courseId",
  authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.FACULTY),
  getBranchCourseHandler,
);

router.use(authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.SUPER_ADMIN));

router.post("/", createBranchCourseHandler);
router.patch("/:courseId", updateBranchCourseHandler);
router.patch("/:courseId/assign-faculty", assignFacultyToBranchCourseHandler);
router.delete("/:courseId", deleteBranchCourseHandler);

export default router;
