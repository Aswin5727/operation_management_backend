import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createBranchStudentHandler,
  deleteBranchStudentHandler,
  getBranchStudentHandler,
  listBranchStudentsHandler,
  updateBranchStudentHandler,
  createBranchStudentPaymentHandler,
} from "./branchStudents.controller.js";

const router = express.Router();

router.use(
  authenticate,
  authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER"),
);

router.get("/", listBranchStudentsHandler);
router.post("/", createBranchStudentHandler);
router.get("/:studentId", getBranchStudentHandler);
router.patch("/:studentId", updateBranchStudentHandler);
router.delete("/:studentId", deleteBranchStudentHandler);
router.post("/:studentId/payments", createBranchStudentPaymentHandler);

export default router;
