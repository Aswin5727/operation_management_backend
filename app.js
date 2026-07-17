import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import config from "./src/config/env.js";
import apiRoutes from "./src/routes/index.js";
import { notFound } from "./src/common/middlewares/notFound.js";
import { errorHandler } from "./src/common/middlewares/errorHandler.js";

const app = express();

const corsOptions = {
  origin:
    config.nodeEnv === "production" && config.corsOrigin
      ? config.corsOrigin.split(",").map((item) => item.trim())
      : true,
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    message: "Operation Management Platform backend is running",
    status: "ok",
  });
});

app.use("/api/v1", apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
