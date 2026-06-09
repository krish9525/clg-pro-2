import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../../../models/User.js";
import * as emailService from "../../../services/emailService.js";
import {
  beginRegistration,
  completeRegistration,
  authenticateUser,
  refreshAccessToken,
  initiatePasswordReset,
  executePasswordReset,
} from "../../../services/userService.js";

// Silence actual emails in all tests
vi.spyOn(emailService, "sendOtpEmail").mockResolvedValue();
vi.spyOn(emailService, "sendPasswordResetEmail").mockResolvedValue();

// ─── beginRegistration ────────────────────────────────────────────────────────
describe("beginRegistration", () => {
  it("returns an activation token for a new email", async () => {
    const token = await beginRegistration("Alice", "alice@test.com", "Password1");
    expect(typeof token).toBe("string");

    const payload = jwt.verify(token, process.env.Activation_Secret);
    expect(payload.user.email).toBe("alice@test.com");
    expect(payload.user.name).toBe("Alice");
    expect(typeof payload.otp).toBe("number");
    expect(payload.otp).toBeGreaterThanOrEqual(100000);
    expect(payload.otp).toBeLessThanOrEqual(999999);
  });

  it("stores a hashed password in the activation token (not plain text)", async () => {
    const token   = await beginRegistration("Bob", "bob@test.com", "MyPlainPass1");
    const payload = jwt.verify(token, process.env.Activation_Secret);
    expect(payload.user.password).not.toBe("MyPlainPass1");
    const ok = await bcrypt.compare("MyPlainPass1", payload.user.password);
    expect(ok).toBe(true);
  });

  it("sends an OTP email", async () => {
    await beginRegistration("Eve", "eve@test.com", "Password1");
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
      "eve@test.com", "Eve", expect.any(Number)
    );
  });

  it("throws 409 if email already exists", async () => {
    await User.create({
      name: "Existing", email: "exists@test.com",
      password: await bcrypt.hash("pass", 10),
    });
    await expect(beginRegistration("Dup", "exists@test.com", "Password1"))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

// ─── completeRegistration ─────────────────────────────────────────────────────
describe("completeRegistration", () => {
  it("creates a user when OTP matches", async () => {
    const otp   = 123456;
    const token = jwt.sign(
      { user: { name: "New", email: "new@test.com", password: "hashed" }, otp },
      process.env.Activation_Secret,
      { expiresIn: "5m" }
    );

    const user = await completeRegistration(123456, token);
    expect(user.email).toBe("new@test.com");
    expect(user.name).toBe("New");
  });

  it("throws 400 on wrong OTP", async () => {
    const otp   = 111111;
    const token = jwt.sign(
      { user: { name: "X", email: "x@test.com", password: "h" }, otp },
      process.env.Activation_Secret,
      { expiresIn: "5m" }
    );
    await expect(completeRegistration(999999, token))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 on expired activation token", async () => {
    const token = jwt.sign(
      { user: { name: "Y", email: "y@test.com", password: "h" }, otp: 111111 },
      process.env.Activation_Secret,
      { expiresIn: "0s" }
    );
    await expect(completeRegistration(111111, token))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── authenticateUser ─────────────────────────────────────────────────────────
describe("authenticateUser", () => {
  beforeEach(async () => {
    await User.create({
      name: "Login User", email: "login@test.com",
      password: await bcrypt.hash("Correct1", 10),
    });
  });

  it("returns access + refresh tokens for correct credentials", async () => {
    const result = await authenticateUser("login@test.com", "Correct1");
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe("login@test.com");
    expect(result.user.password).toBeUndefined();
  });

  it("access token expires in ~15 minutes", async () => {
    const { token } = await authenticateUser("login@test.com", "Correct1");
    const payload   = jwt.decode(token);
    const diff      = payload.exp - payload.iat;
    expect(diff).toBe(15 * 60);
  });

  it("refresh token expires in ~7 days", async () => {
    const { refreshToken } = await authenticateUser("login@test.com", "Correct1");
    const payload          = jwt.decode(refreshToken);
    const diff             = payload.exp - payload.iat;
    expect(diff).toBe(7 * 24 * 60 * 60);
  });

  it("throws 400 for unknown email", async () => {
    await expect(authenticateUser("ghost@test.com", "anything"))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 for wrong password", async () => {
    await expect(authenticateUser("login@test.com", "WrongPass"))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── refreshAccessToken ───────────────────────────────────────────────────────
describe("refreshAccessToken", () => {
  it("returns a new access token from a valid refresh token", () => {
    const userId      = "64c0000000000000000000ff";
    const refreshTok  = jwt.sign({ _id: userId }, process.env.Refresh_Secret, { expiresIn: "7d" });
    const newAccess   = refreshAccessToken(refreshTok);

    const payload = jwt.verify(newAccess, process.env.Jwt_Sec);
    expect(payload._id).toBe(userId);
  });

  it("throws 401 for an expired refresh token", () => {
    const expired = jwt.sign({ _id: "abc" }, process.env.Refresh_Secret, { expiresIn: "0s" });
    expect(() => refreshAccessToken(expired))
      .toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it("throws 401 for a garbage refresh token", () => {
    expect(() => refreshAccessToken("not.a.token"))
      .toThrow(expect.objectContaining({ statusCode: 401 }));
  });
});

// ─── initiatePasswordReset ────────────────────────────────────────────────────
describe("initiatePasswordReset", () => {
  it("sets resetPasswordExpire on the user", async () => {
    await User.create({
      name: "Reset User", email: "reset@test.com",
      password: await bcrypt.hash("pass", 10),
    });

    await initiatePasswordReset("reset@test.com");

    const user = await User.findOne({ email: "reset@test.com" });
    // resetPasswordExpire is a Date in MongoDB — compare as timestamp
    expect(user.resetPasswordExpire.getTime()).toBeGreaterThan(Date.now());
  });

  it("sends a reset email", async () => {
    await User.create({
      name: "Email User", email: "emailreset@test.com",
      password: await bcrypt.hash("pass", 10),
    });
    await initiatePasswordReset("emailreset@test.com");
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      "emailreset@test.com", expect.any(String)
    );
  });

  it("throws 404 for unknown email", async () => {
    await expect(initiatePasswordReset("nobody@test.com"))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── executePasswordReset ─────────────────────────────────────────────────────
describe("executePasswordReset", () => {
  it("updates the password with a valid token", async () => {
    const email = "pwreset@test.com";
    await User.create({
      name: "PW User", email,
      password: await bcrypt.hash("OldPass1", 10),
      resetPasswordExpire: Date.now() + 15 * 60 * 1000,
    });

    const token = jwt.sign({ email }, process.env.Forgot_Secret, { expiresIn: "15m" });
    await executePasswordReset(token, "NewPass123");

    const user  = await User.findOne({ email }).select("+password");
    const match = await bcrypt.compare("NewPass123", user.password);
    expect(match).toBe(true);
    expect(user.resetPasswordExpire).toBeNull();
  });

  it("throws 400 for expired reset token", async () => {
    const token = jwt.sign({ email: "x@x.com" }, process.env.Forgot_Secret, { expiresIn: "0s" });
    await expect(executePasswordReset(token, "NewPass123"))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when resetPasswordExpire is past", async () => {
    const email = "expired@test.com";
    await User.create({
      name: "Expired", email,
      password: "hash",
      resetPasswordExpire: Date.now() - 1000, // already expired
    });
    const token = jwt.sign({ email }, process.env.Forgot_Secret, { expiresIn: "15m" });
    await expect(executePasswordReset(token, "NewPass123"))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});
