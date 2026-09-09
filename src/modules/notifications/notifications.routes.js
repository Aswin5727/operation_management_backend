import express from "express";

import { authenticate } from "../../common/middlewares/authenticate.js";
import { authorize } from "../../common/middlewares/authorize.js";
import {
  listNotificationsHandler,
  markNotificationsAsReadHandler,
} from "./notifications.controller.js";

const router = express.Router();

router.use(
  authenticate,
  authorize(
    "SUPER_ADMIN",
    "BRANCH_ADMIN",
    "FACULTY",
    "STUDENT",
  ),
);
router.get("/", listNotificationsHandler);
router.patch("/mark-read", markNotificationsAsReadHandler);

export default router;
