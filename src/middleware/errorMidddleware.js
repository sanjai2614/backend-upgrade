const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Duplicate MongoDB unique index error
  if (err.code === 11000) {
    statusCode = 409;
    message = "Email is already registered";
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  }

  // Invalid MongoDB document ID
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  if (statusCode >= 500) {
    message = "Internal server error";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;
