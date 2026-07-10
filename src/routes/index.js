import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";
import masterSetupRoutes from "../modules/masterSetup/masterSetup.routes.js";
import studentRoutes from "../modules/students/students.routes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "operation-management-backend",
  });
});

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/master-setup", masterSetupRoutes);
router.use("/students", studentRoutes);

export default router;
