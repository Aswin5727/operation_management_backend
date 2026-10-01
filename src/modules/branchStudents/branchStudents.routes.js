import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createBranchStudentHandler,
  deleteBranchStudentHandler,
  getBranchStudentHandler,
  getCurrentBranchStudentProfileHandler,
  getCurrentBranchStudentCalendarHandler,
  getBranchStudentCalendarByIdHandler,
  getBranchStudentLedgerHandler,
  listBranchLedgerHandler,
  listBranchStudentsHandler,
  updateBranchStudentHandler,
  createBranchStudentPaymentHandler,
  previewBranchStudentFeePlanHandler,
} from "./branchStudents.controller.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER", "STUDENT", "FACULTY"),
  listBranchStudentsHandler,
);

router.get(
  "/me",
  authenticate,
  authorize("STUDENT"),
  getCurrentBranchStudentProfileHandler,
);
router.get(
  "/me/calendar",
  authenticate,
  authorize("STUDENT"),
  getCurrentBranchStudentCalendarHandler,
);

router.use(
  authenticate,
  authorize("BRANCH_ADMIN", "SUPER_ADMIN", "BUSINESS_OWNER", "OPERATION_MANAGER", "STUDENT"),
);

router.get("/:studentId/calendar", authorize("SUPER_ADMIN"), getBranchStudentCalendarByIdHandler);
router.get("/ledger", listBranchLedgerHandler);
router.post("/fee-plan-preview", previewBranchStudentFeePlanHandler);
router.post("/", createBranchStudentHandler);
router.get("/:studentId/ledger", getBranchStudentLedgerHandler);
router.get("/:studentId", getBranchStudentHandler);
router.patch("/:studentId", updateBranchStudentHandler);
router.delete("/:studentId", deleteBranchStudentHandler);
router.post("/:studentId/payments", createBranchStudentPaymentHandler);

export default router;
