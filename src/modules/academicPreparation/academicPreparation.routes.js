import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import * as controller from "./academicPreparation.controller.js";

const router = express.Router();
router.use(authenticate, authorize(USER_ROLES.FACULTY));
router.get("/", controller.list);
router.get("/items/:academicTestItemId", controller.get);
router.post("/question-papers", controller.createPaper);
router.put("/question-papers/:id", controller.updatePaper);
router.delete("/question-papers/:id", controller.removePaper);
router.post("/projects", controller.createProject);
router.put("/projects/:id", controller.updateProject);
router.delete("/projects/:id", controller.removeProject);
router.get("/question-papers/:id/pdf", controller.pdf);
export default router;
