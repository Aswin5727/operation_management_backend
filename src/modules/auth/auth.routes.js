const express = require("express");
const {
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  meHandler,
} = require("./auth.controller");
const { authenticate } = require("../../common/middlewares/authenticate");
const { authLimiter } = require("../../common/middlewares/rateLimiters");

const router = express.Router();

router.post("/login", authLimiter, loginHandler);
router.post("/refresh", authLimiter, refreshHandler);
router.post("/logout", authLimiter, logoutHandler);
router.post("/forgot-password", authLimiter, forgotPasswordHandler);
router.post("/reset-password", authLimiter, resetPasswordHandler);
router.get("/me", authenticate, meHandler);

module.exports = router;
