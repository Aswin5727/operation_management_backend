const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const config = require("./src/config/env");
const apiRoutes = require("./src/routes");
const { notFound } = require("./src/common/middlewares/notFound");
const { errorHandler } = require("./src/common/middlewares/errorHandler");

const app = express();

const corsOptions = {
  origin: config.corsOrigin ? config.corsOrigin.split(",").map((item) => item.trim()) : true,
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

module.exports = app;
