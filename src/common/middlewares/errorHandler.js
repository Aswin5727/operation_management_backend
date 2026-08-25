import AppError from "../errors/AppError.js";

function errorHandler(err, _req, res, _next) {
  console.error("GLOBAL ERROR CAUGHT:", err);
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

  if (
    errorMessage.includes("Argument `") ||
    errorMessage.includes("Unknown argument `") ||
    errorMessage.includes("Invalid `prisma.") ||
    errorMessage.includes("Expected property name") ||
    errorMessage.includes("does not exist on the current model")
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid request data. Please review the form and try again.",
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
