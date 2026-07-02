import AppError from "../errors/AppError.js";

function notFound(_req, _res, next) {
  next(new AppError("Route not found", 404));
}

export { notFound };
