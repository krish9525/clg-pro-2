import { describe, it, expect, vi } from "vitest";
import {
  validate,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../../../middlewares/validate.js";

// ─── Helper: run middleware and capture the response ─────────────────────────
function runValidate(schema, body) {
  const middleware = validate(schema);
  const req  = { body };
  const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  middleware(req, res, next);
  return { res, next };
}

// ─── registerSchema ───────────────────────────────────────────────────────────
describe("validate — registerSchema", () => {
  it("passes with valid data", () => {
    const { next, res } = runValidate(registerSchema, {
      name: "John Doe", email: "john@example.com", password: "Secret123",
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects empty name", () => {
    const { next, res } = runValidate(registerSchema, {
      name: "", email: "a@b.com", password: "Secret123",
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("rejects name shorter than 2 chars", () => {
    const { res } = runValidate(registerSchema, {
      name: "J", email: "a@b.com", password: "Secret123",
    });
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("rejects invalid email", () => {
    const { next, res } = runValidate(registerSchema, {
      name: "John", email: "not-an-email", password: "Secret123",
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it("rejects password shorter than 8 chars", () => {
    const { res } = runValidate(registerSchema, {
      name: "John", email: "j@b.com", password: "short",
    });
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("returns all errors at once (abortEarly: false)", () => {
    const { res } = runValidate(registerSchema, {
      name: "", email: "bad", password: "x",
    });
    const body = res.json.mock.calls[0][0];
    // message should contain multiple errors joined by "; "
    expect(body.message).toContain(";");
  });
});

// ─── loginSchema ─────────────────────────────────────────────────────────────
describe("validate — loginSchema", () => {
  it("passes valid credentials", () => {
    const { next } = runValidate(loginSchema, {
      email: "a@b.com", password: "anypassword",
    });
    expect(next).toHaveBeenCalled();
  });

  it("rejects missing password", () => {
    const { res } = runValidate(loginSchema, { email: "a@b.com" });
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("rejects invalid email format", () => {
    const { res } = runValidate(loginSchema, {
      email: "invalid", password: "abc123",
    });
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

// ─── verifyOtpSchema ──────────────────────────────────────────────────────────
describe("validate — verifyOtpSchema", () => {
  it("passes with valid OTP and token", () => {
    const { next } = runValidate(verifyOtpSchema, {
      otp: 123456, activationToken: "some.jwt.token",
    });
    expect(next).toHaveBeenCalled();
  });

  it("rejects non-numeric OTP", () => {
    const { res } = runValidate(verifyOtpSchema, {
      otp: "abcdef", activationToken: "token",
    });
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("rejects missing activationToken", () => {
    const { res } = runValidate(verifyOtpSchema, { otp: 111111 });
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

// ─── forgotPasswordSchema ─────────────────────────────────────────────────────
describe("validate — forgotPasswordSchema", () => {
  it("passes with valid email", () => {
    const { next } = runValidate(forgotPasswordSchema, { email: "a@b.com" });
    expect(next).toHaveBeenCalled();
  });

  it("rejects invalid email", () => {
    const { res } = runValidate(forgotPasswordSchema, { email: "notvalid" });
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────────
describe("validate — resetPasswordSchema", () => {
  it("passes with strong password", () => {
    const { next } = runValidate(resetPasswordSchema, { password: "NewPass123" });
    expect(next).toHaveBeenCalled();
  });

  it("rejects password under 8 chars", () => {
    const { res } = runValidate(resetPasswordSchema, { password: "short" });
    expect(res.status).toHaveBeenCalledWith(422);
  });
});
