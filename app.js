import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import config, { splitCsvValues } from "./src/config/env.js";
import apiRoutes from "./src/routes/index.js";
import { notFound } from "./src/common/middlewares/notFound.js";
import { errorHandler } from "./src/common/middlewares/errorHandler.js";

const app = express();

const allowedOrigins = splitCsvValues(config.corsOrigins);

const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
  exposedHeaders: ["Content-Disposition", "Content-Length"],
};

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "35mb" }));
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
