import AppError from "../errors/AppError.js";
import config from "../../config/env.js";

function errorHandler(err, _req, res, _next) {
  console.error("GLOBAL ERROR CAUGHT:", err);
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";
  const errorCode = String(err?.code || "").toUpperCase();
  const errorMessage = String(err?.message || "");
  const databaseCauseCode = String(err?.cause?.code || err?.cause?.originalCode || "").toUpperCase();
  const databaseCauseMessage = String(err?.cause?.message || err?.cause?.originalMessage || "");

  if (
    databaseCauseCode === "53000" ||
    errorMessage.includes("exceeded the quota") ||
    databaseCauseMessage.includes("exceeded the quota")
  ) {
    return res.status(503).json({
      status: "error",
      code: "DATABASE_QUOTA_EXCEEDED",
      message: "Database quota exceeded. Please upgrade or reset the Neon project quota, then try again.",
    });
  }

  if (
    errorCode === "EACCES" ||
    errorMessage.includes("afterConnectMultiple") ||
    errorMessage.includes("connection string") ||
    errorMessage.includes("connect to the database")
  ) {
    return res.status(503).json({
      status: "error",
      message: "Database connection failed. Please verify the Neon connection string and network access.",
    });
  }

  if (
    errorMessage.includes("Argument `") ||
    errorMessage.includes("Unknown argument `") ||
    errorMessage.includes("Invalid `prisma.") ||
    errorMessage.includes("Expected property name") ||
    errorMessage.includes("does not exist on the current model")
  ) {
    const isProduction = String(config.nodeEnv || "").toLowerCase() === "production";
    return res.status(400).json({
      status: "error",
      message: isProduction
        ? "Invalid request data. Please review the form and try again."
        : errorMessage,
    });
  }

  if (err instanceof AppError) {
    return res.status(statusCode).json({
      status,
      message: err.message,
    });
  }

  return res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal server error",
  });
}

export { errorHandler };
