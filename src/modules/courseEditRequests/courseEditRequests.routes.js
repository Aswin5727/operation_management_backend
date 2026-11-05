import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  acceptCourseEditRequestHandler,
  createCourseEditRequestHandler,
  getCourseEditRequestHandler,
  listCourseEditRequestsHandler,
  rejectCourseEditRequestHandler,
  saveCourseEditRequestModulesHandler,
} from "./courseEditRequests.controller.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN", "FACULTY"),
  listCourseEditRequestsHandler,
);
router.post(
  "/",
  authorize("FACULTY"),
  createCourseEditRequestHandler,
);
router.get(
  "/:requestId",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN", "FACULTY"),
  getCourseEditRequestHandler,
);
router.patch(
  "/:requestId/accept",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  acceptCourseEditRequestHandler,
);
router.patch(
  "/:requestId/reject",
  authorize("SUPER_ADMIN", "BRANCH_ADMIN"),
  rejectCourseEditRequestHandler,
);
router.patch(
  "/:requestId/modules",
  authorize("FACULTY"),
  saveCourseEditRequestModulesHandler,
);

export default router;
