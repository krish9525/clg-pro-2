import rateLimit from "express-rate-limit";

/**
 * Auth limiter — login / register / forgot-password
 * 10 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many attempts from this IP, please try again after 15 minutes.",
  },
  skipSuccessfulRequests: false,
});

/**
 * OTP verify limiter — prevent brute-forcing OTPs
 * 5 attempts per 10 minutes per IP
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP attempts, please request a new OTP and try again.",
  },
});

/**
 * General API limiter — broad protection against abuse
 * 300 requests per minute per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please slow down.",
  },
});
