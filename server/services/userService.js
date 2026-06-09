import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sendOtpEmail, sendPasswordResetEmail } from "./emailService.js";

const SALT_ROUNDS = 10;

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Begin registration: hash password, generate OTP, send email, return activation token.
 */
export const beginRegistration = async (name, email, password) => {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("User already exists with this email");
    err.statusCode = 409;
    throw err;
  }

  const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

  const activationToken = jwt.sign(
    { user: { name, email, password: hashPassword }, otp },
    process.env.Activation_Secret,
    { expiresIn: "5m" }
  );

  await sendOtpEmail(email, name, otp);
  return activationToken;
};

/**
 * Complete registration: verify OTP from token, create user.
 */
export const completeRegistration = async (otp, activationToken) => {
  let payload;
  try {
    payload = jwt.verify(activationToken, process.env.Activation_Secret);
  } catch {
    const err = new Error("OTP has expired. Please register again.");
    err.statusCode = 400;
    throw err;
  }

  if (Number(payload.otp) !== Number(otp)) {
    const err = new Error("Incorrect OTP");
    err.statusCode = 400;
    throw err;
  }

  const { name, email, password } = payload.user;
  const user = await User.create({ name, email, password });
  return user;
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    const err = new Error("No account found with this email");
    err.statusCode = 400;
    throw err;
  }

  const matched = await bcrypt.compare(password, user.password);
  if (!matched) {
    const err = new Error("Incorrect password");
    err.statusCode = 400;
    throw err;
  }

  // Short-lived access token (15 min) + long-lived refresh token (7 days)
  const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ _id: user._id }, process.env.Refresh_Secret, {
    expiresIn: "7d",
  });

  const userObj = user.toObject();
  delete userObj.password;
  return { token, refreshToken, user: userObj };
};

/**
 * Verify a refresh token and issue a new access token.
 */
export const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.Refresh_Secret);
    const newAccessToken = jwt.sign({ _id: decoded._id }, process.env.Jwt_Sec, {
      expiresIn: "15m",
    });
    return newAccessToken;
  } catch {
    const err = new Error("Refresh token expired or invalid. Please log in again.");
    err.statusCode = 401;
    throw err;
  }
};

// ─── Password Reset ───────────────────────────────────────────────────────────

export const initiatePasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("No account found with this email");
    err.statusCode = 404;
    throw err;
  }

  const token = jwt.sign({ email }, process.env.Forgot_Secret, {
    expiresIn: "15m",
  });

  await sendPasswordResetEmail(email, token);
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  await user.save();
};

export const executePasswordReset = async (token, newPassword) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.Forgot_Secret);
  } catch {
    const err = new Error("Reset link has expired. Please request a new one.");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: decoded.email });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (!user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
    const err = new Error("Reset token has expired");
    err.statusCode = 400;
    throw err;
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetPasswordExpire = null;
  await user.save();
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getUserById = async (id) => User.findById(id).select("-password");

export const getAdminUser = async () => {
  const admin = await User.findOne({ role: "admin" }).select("-password");
  if (!admin) {
    const err = new Error("No admin user found");
    err.statusCode = 404;
    throw err;
  }
  return admin;
};
