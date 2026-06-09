/**
 * Integration tests for auth routes:
 *   POST /api/v1/user/register
 *   POST /api/v1/user/verify
 *   POST /api/v1/user/login
 *   POST /api/v1/user/logout
 *   POST /api/v1/user/refresh-token
 *   POST /api/v1/user/forgot
 *   GET  /api/v1/user/me
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createTestApp } from "../setup/testApp.js";
import { createUser, makeAccessToken, makeRefreshToken, makeActivationToken } from "../setup/helpers.js";
import { User } from "../../models/User.js";
import * as emailService from "../../services/emailService.js";

// Silence all emails
vi.spyOn(emailService, "sendOtpEmail").mockResolvedValue();
vi.spyOn(emailService, "sendPasswordResetEmail").mockResolvedValue();

const app = createTestApp();

// ─── POST /api/v1/user/register ───────────────────────────────────────────────
describe("POST /api/v1/user/register", () => {
  it("422 when body is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/user/register")
      .send({ name: "A", email: "bad", password: "x" });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("200 returns activation token for valid data", async () => {
    const res = await request(app)
      .post("/api/v1/user/register")
      .send({ name: "Alice", email: "alice@test.com", password: "Password1" });
    expect(res.status).toBe(200);
    expect(res.body.data.activationToken).toBeDefined();
    expect(emailService.sendOtpEmail).toHaveBeenCalled();
  });

  it("409 when email already registered", async () => {
    await createUser({ email: "dup@test.com" });
    const res = await request(app)
      .post("/api/v1/user/register")
      .send({ name: "Dup", email: "dup@test.com", password: "Password1" });
    expect(res.status).toBe(409);
  });
});

// ─── POST /api/v1/user/verify ─────────────────────────────────────────────────
describe("POST /api/v1/user/verify", () => {
  it("201 creates user with correct OTP", async () => {
    const otp   = 654321;
    const token = makeActivationToken(
      { name: "Bob", email: "bob@test.com", password: await bcrypt.hash("pass", 10) },
      otp
    );

    const res = await request(app)
      .post("/api/v1/user/verify")
      .send({ otp, activationToken: token });

    expect(res.status).toBe(200); // verifyUser uses ok() not created()
    expect(res.body.success).toBe(true);

    const dbUser = await User.findOne({ email: "bob@test.com" });
    expect(dbUser).not.toBeNull();
  });

  it("400 rejects wrong OTP", async () => {
    const token = makeActivationToken(
      { name: "C", email: "c@test.com", password: "h" },
      111111
    );
    const res = await request(app)
      .post("/api/v1/user/verify")
      .send({ otp: 999999, activationToken: token });
    expect(res.status).toBe(400);
  });

  it("422 when otp is not a number", async () => {
    const res = await request(app)
      .post("/api/v1/user/verify")
      .send({ otp: "BADOTP", activationToken: "anytoken" });
    expect(res.status).toBe(422);
  });
});

// ─── POST /api/v1/user/login ──────────────────────────────────────────────────
describe("POST /api/v1/user/login", () => {
  beforeEach(async () => {
    await createUser({ email: "login@test.com", password: await bcrypt.hash("Password1", 10) });
  });

  it("200 with valid credentials, sets cookies", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "login@test.com", password: "Password1" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();

    // Cookies should be set
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith("token="));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain("HttpOnly");
  });

  it("400 for wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "login@test.com", password: "WrongPass" });
    expect(res.status).toBe(400);
  });

  it("400 for unknown email", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "nobody@test.com", password: "Password1" });
    expect(res.status).toBe(400);
  });

  it("422 for missing password field", async () => {
    const res = await request(app)
      .post("/api/v1/user/login")
      .send({ email: "login@test.com" });
    expect(res.status).toBe(422);
  });
});

// ─── POST /api/v1/user/logout ─────────────────────────────────────────────────
describe("POST /api/v1/user/logout", () => {
  it("200 and clears token cookies", async () => {
    const res = await request(app).post("/api/v1/user/logout");
    expect(res.status).toBe(200);

    // Cookies cleared means Max-Age=0 or Expires in the past
    const cookies = res.headers["set-cookie"] || [];
    const tokenCleared = cookies.some(
      (c) => c.startsWith("token=") && (c.includes("Max-Age=0") || c.includes("Expires="))
    );
    expect(tokenCleared).toBe(true);
  });
});

// ─── POST /api/v1/user/refresh-token ─────────────────────────────────────────
describe("POST /api/v1/user/refresh-token", () => {
  it("200 returns new access token from cookie", async () => {
    const user    = await createUser({ email: "refresh@test.com" });
    const rt      = makeRefreshToken(user._id);

    const res = await request(app)
      .post("/api/v1/user/refresh-token")
      .set("Cookie", `refreshToken=${rt}`);

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();

    // Verify new token is a valid JWT
    const payload = jwt.verify(res.body.data.token, process.env.Jwt_Sec);
    expect(payload._id.toString()).toBe(user._id.toString());
  });

  it("200 accepts refresh token from request body", async () => {
    const user = await createUser({ email: "bodyrefresh@test.com" });
    const rt   = makeRefreshToken(user._id);

    const res = await request(app)
      .post("/api/v1/user/refresh-token")
      .send({ refreshToken: rt });

    expect(res.status).toBe(200);
  });

  it("401 when no refresh token provided", async () => {
    const res = await request(app).post("/api/v1/user/refresh-token");
    expect(res.status).toBe(401);
  });

  it("401 for an expired refresh token", async () => {
    const expiredRt = jwt.sign({ _id: "abc" }, process.env.Refresh_Secret, { expiresIn: "0s" });
    const res = await request(app)
      .post("/api/v1/user/refresh-token")
      .send({ refreshToken: expiredRt });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/v1/user/forgot ─────────────────────────────────────────────────
describe("POST /api/v1/user/forgot", () => {
  it("200 for an existing email", async () => {
    await createUser({ email: "forgot@test.com" });
    const res = await request(app)
      .post("/api/v1/user/forgot")
      .send({ email: "forgot@test.com" });
    expect(res.status).toBe(200);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it("404 for unknown email", async () => {
    const res = await request(app)
      .post("/api/v1/user/forgot")
      .send({ email: "nobody@test.com" });
    expect(res.status).toBe(404);
  });

  it("422 for invalid email format", async () => {
    const res = await request(app)
      .post("/api/v1/user/forgot")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/user/me ──────────────────────────────────────────────────────
describe("GET /api/v1/user/me", () => {
  it("200 returns current user's profile", async () => {
    const user  = await createUser({ email: "me@test.com" });
    const token = makeAccessToken(user._id);

    const res = await request(app)
      .get("/api/v1/user/me")
      .set("token", token);

    expect(res.status).toBe(200);
    // myProfile wraps in data: { user }
    expect(res.body.data.user.email).toBe("me@test.com");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("401 without token", async () => {
    const res = await request(app).get("/api/v1/user/me");
    expect(res.status).toBe(401);
  });

  it("401 with expired token", async () => {
    const expiredToken = jwt.sign({ _id: "abc" }, process.env.Jwt_Sec, { expiresIn: "0s" });
    const res = await request(app)
      .get("/api/v1/user/me")
      .set("token", expiredToken);
    expect(res.status).toBe(401);
  });
});
