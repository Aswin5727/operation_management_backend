import express from "express";
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  meHandler,
} from "./auth.controller.js";
import { authenticate } from "../../common/middlewares/authenticate.js";
import { authLimiter } from "../../common/middlewares/rateLimiters.js";

const router = express.Router();

router.post("/login", authLimiter, loginHandler);
router.post("/refresh", authLimiter, refreshHandler);
router.post("/logout", authLimiter, logoutHandler);
router.post("/forgot-password", authLimiter, forgotPasswordHandler);
router.post("/reset-password", authLimiter, resetPasswordHandler);
router.get("/me", authenticate, meHandler);

export default router;
