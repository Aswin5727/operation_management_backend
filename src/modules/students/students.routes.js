import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createStudentHandler,
  deleteStudentHandler,
  getCurrentStudentProfileHandler,
  getStudentHandler,
  listStudentsHandler,
  updateStudentHandler,
} from "./students.controller.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentStudentProfileHandler);

router.use(authenticate, authorize("OPERATION_MANAGER", "BUSINESS_OWNER"));

router.get("/", listStudentsHandler);
router.post("/", createStudentHandler);
router.get("/:studentId", getStudentHandler);
router.patch("/:studentId", updateStudentHandler);
router.delete("/:studentId", deleteStudentHandler);

export default router;
