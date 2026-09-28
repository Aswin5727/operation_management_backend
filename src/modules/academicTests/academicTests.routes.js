import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import * as controller from "./academicTests.controller.js";

const router = express.Router();
router.use(authenticate);
router.get("/", authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.FACULTY), controller.list);
router.get("/create-options", authorize(USER_ROLES.FACULTY), controller.createOptions);
router.post("/scheduled", authorize(USER_ROLES.FACULTY), controller.createScheduled);
router.get("/faculty/scheduled", authorize(USER_ROLES.FACULTY), controller.facultyScheduled);
router.get("/faculty/scheduled/:id/results", authorize(USER_ROLES.FACULTY), controller.facultyResults);
router.post("/faculty/scheduled/:id/retest", authorize(USER_ROLES.FACULTY), controller.scheduleRetest);
router.put("/faculty/scheduled/:id", authorize(USER_ROLES.FACULTY), controller.updateFacultyScheduled);
router.post("/faculty/scheduled/:id/cancel", authorize(USER_ROLES.FACULTY), controller.cancelFacultyScheduled);
router.get("/student/scheduled", authorize(USER_ROLES.STUDENT), controller.studentScheduled);
router.get("/student/scheduled/:id", authorize(USER_ROLES.STUDENT), controller.studentGet);
router.post("/student/scheduled/:id/start", authorize(USER_ROLES.STUDENT), controller.studentStart);
router.post("/student/scheduled/:id/submit", authorize(USER_ROLES.STUDENT), controller.studentSubmit);
router.get("/student/scheduled/:id/result", authorize(USER_ROLES.STUDENT), controller.studentResult);
router.get("/:id", authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.FACULTY), controller.getById);
router.post("/", authorize(USER_ROLES.BRANCH_ADMIN), controller.create);
router.put("/:id", authorize(USER_ROLES.BRANCH_ADMIN), controller.update);
router.delete("/:id", authorize(USER_ROLES.BRANCH_ADMIN), controller.remove);

export default router;
