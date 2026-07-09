import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import masterSetupRoutes from "../modules/masterSetup/masterSetup.routes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "operation-management-backend",
  });
});

router.use("/auth", authRoutes);
router.use("/master-setup", masterSetupRoutes);

export default router;
