import AppError from "../errors/AppError.js";

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";
  const errorCode = String(err?.code || "").toUpperCase();
  const errorMessage = String(err?.message || "");

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
