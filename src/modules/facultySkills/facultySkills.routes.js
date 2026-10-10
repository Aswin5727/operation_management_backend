import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import * as controller from "./facultySkills.controller.js";
const router = express.Router(); router.use(authenticate);
router.patch("/:id/cancel", authorize("BRANCH_ADMIN"), controller.cancel);
router.get("/options", authorize("BRANCH_ADMIN"), controller.options); router.get("/", authorize("BRANCH_ADMIN", "FACULTY"), controller.list); router.post("/", authorize("BRANCH_ADMIN"), controller.create); router.patch("/:id", authorize("BRANCH_ADMIN"), controller.update); router.get("/:id", authorize("BRANCH_ADMIN", "FACULTY"), controller.detail); router.patch("/:id/topics/:topicId", authorize("FACULTY"), controller.saveTopic); router.get("/:id/export", authorize("BRANCH_ADMIN"), controller.exportReport);
export default router;
