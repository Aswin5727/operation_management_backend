const AppError = require("../errors/AppError");

function notFound(_req, _res, next) {
  next(new AppError("Route not found", 404));
}

module.exports = {
  notFound,
};
