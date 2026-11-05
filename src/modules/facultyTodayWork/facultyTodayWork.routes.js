import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  createFacultyTodayWorkEntryHandler,
  listFacultyTodayWorkEntriesHandler,
} from "./facultyTodayWork.controller.js";

const router = express.Router();

router.use(
  authenticate,
  authorize("FACULTY", "BRANCH_ADMIN", "OPERATION_MANAGER", "BUSINESS_OWNER", "SUPER_ADMIN"),
);

router.get("/", listFacultyTodayWorkEntriesHandler);
router.post("/", createFacultyTodayWorkEntryHandler);

export default router;
