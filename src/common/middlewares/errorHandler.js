const AppError = require("../errors/AppError");

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

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

module.exports = {
  errorHandler,
};
