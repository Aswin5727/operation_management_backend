import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "operation-management-backend",
  });
});

router.use("/auth", authRoutes);

export default router;
