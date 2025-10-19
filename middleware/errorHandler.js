const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Resource not found with the given id",
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: messages,
    });
  }

  // Multer file upload error
  if (err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "File upload error",
      error: err.message,
    });
  }

  // JWT authentication errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: err.message,
    });
  }

  // Default to 500 server error
  res.status(500).json({
    success: false,
    message: "Server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
};

export default errorHandler;
