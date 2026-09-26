import express from "express";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import { USER_ROLES } from "../../common/constants/roles.js";
import * as controller from "./academicTests.controller.js";

const router = express.Router();
router.use(authenticate);
router.get("/", authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.FACULTY), controller.list);
router.get("/:id", authorize(USER_ROLES.BRANCH_ADMIN, USER_ROLES.FACULTY), controller.getById);
router.post("/", authorize(USER_ROLES.BRANCH_ADMIN), controller.create);
router.put("/:id", authorize(USER_ROLES.BRANCH_ADMIN), controller.update);
router.delete("/:id", authorize(USER_ROLES.BRANCH_ADMIN), controller.remove);

export default router;
