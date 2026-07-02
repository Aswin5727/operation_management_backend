const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "operation-management-backend",
  });
});

router.use("/auth", authRoutes);

module.exports = router;
