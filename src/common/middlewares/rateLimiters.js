const rateLimit = require("express-rate-limit");
const config = require("../../config/env");

const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests, please try again later.",
  },
});

module.exports = {
  authLimiter,
};
