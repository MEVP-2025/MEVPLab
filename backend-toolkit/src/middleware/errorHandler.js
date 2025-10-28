// src/middleware/errorHandler.js
import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.message}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    stack: err.stack,
  });

  // Default error response
  let error = {
    message: "Internal Server Error",
    status: 500,
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    error = {
      message: "Validation Error",
      details: err.details || err.message,
      status: 400,
    };
  } else if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      error = {
        message: "File too large",
        status: 413,
      };
    } else if (err.code === "LIMIT_FILE_COUNT") {
      error = {
        message: "Too many files",
        status: 413,
      };
    } else {
      error = {
        message: "File upload error",
        details: err.message,
        status: 400,
      };
    }
  } else if (err.code === "ENOENT") {
    error = {
      message: "File not found",
      status: 404,
    };
  }

  // Send error response
  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
