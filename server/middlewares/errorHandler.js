/**
 * Centralized Express error-handling middleware.
 * Must be registered LAST in the middleware chain (4 params).
 *
 * Usage in index.js:
 *   import { errorHandler } from './middlewares/errorHandler.js';
 *   app.use(errorHandler);
 */
export const errorHandler = (err, req, res, next) => {
  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: messages.join("; ") });
  }

  // Mongoose duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired, please log in again" });
  }

  // Multer file-size / type errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: "File too large" });
  }

  // Default: 500 Internal Server Error
  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "An unexpected error occurred"
      : err.message || "An unexpected error occurred";

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err);

  return res.status(statusCode).json({ success: false, message });
};
