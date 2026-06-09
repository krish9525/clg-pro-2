import { createTransport } from "nodemailer";

/**
 * Email service — centralises all outbound email.
 * In development (NODE_ENV !== 'production'): logs to console.
 * In production: uses SMTP configured via env vars.
 */

const createMailTransport = () => {
  if (!process.env.MAIL_HOST) return null;
  return createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

/**
 * Send OTP verification email.
 */
export const sendOtpEmail = async (email, name, otp) => {
  if (process.env.NODE_ENV !== "production" || !process.env.MAIL_HOST) {
    console.log("\n" + "=".repeat(50));
    console.log("📧  OTP VERIFICATION (dev mode)");
    console.log("=".repeat(50));
    console.log(`To:  ${email}`);
    console.log(`OTP: ${otp}`);
    console.log("=".repeat(50) + "\n");
    return;
  }

  const transporter = createMailTransport();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || "no-reply@elearning.com",
    to: email,
    subject: "E-Learning — Email Verification",
    html: `
      <h2>Hello ${name},</h2>
      <p>Your OTP for email verification is:</p>
      <h1 style="letter-spacing:6px;color:#4f46e5">${otp}</h1>
      <p>This OTP expires in <strong>5 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
};

/**
 * Send password-reset email.
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.frontendurl}/reset-password/${resetToken}`;

  if (process.env.NODE_ENV !== "production" || !process.env.MAIL_HOST) {
    console.log("\n" + "=".repeat(50));
    console.log("🔑  PASSWORD RESET (dev mode)");
    console.log("=".repeat(50));
    console.log(`To:         ${email}`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log("=".repeat(50) + "\n");
    return;
  }

  const transporter = createMailTransport();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || "no-reply@elearning.com",
    to: email,
    subject: "E-Learning — Password Reset",
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
      <a href="${resetUrl}" style="padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none">
        Reset Password
      </a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
};
