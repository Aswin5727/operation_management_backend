import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createFacultyRecordHandler,
  deleteFacultyRecordHandler,
  getCurrentFacultyProfileHandler,
  getFacultyRecordHandler,
  listFacultyRecordsHandler,
  updateFacultyRecordHandler,
} from "./facultyManagement.controller.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentFacultyProfileHandler);

router.use(authenticate, authorize("OPERATION_MANAGER", "BUSINESS_OWNER"));

router.get("/", listFacultyRecordsHandler);
router.post("/", createFacultyRecordHandler);
router.get("/:facultyId", getFacultyRecordHandler);
router.patch("/:facultyId", updateFacultyRecordHandler);
router.delete("/:facultyId", deleteFacultyRecordHandler);

export default router;
