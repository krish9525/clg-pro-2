import { describe, it, expect, vi, beforeEach } from "vitest";
import { errorHandler } from "../../../middlewares/errorHandler.js";

// ─── Helper ───────────────────────────────────────────────────────────────────
function run(err, nodeEnv = "test") {
  const savedEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  const req  = { method: "GET", path: "/test" };
  const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();

  errorHandler(err, req, res, next);

  process.env.NODE_ENV = savedEnv;
  return { res, next };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("errorHandler middleware", () => {
  it("handles Mongoose ValidationError with 422", () => {
    const err = {
      name: "ValidationError",
      errors: {
        email:    { message: "Email is invalid" },
        password: { message: "Password too short" },
      },
    };
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toContain("Email is invalid");
    expect(body.message).toContain("Password too short");
  });

  it("handles Mongoose duplicate-key error (code 11000) with 409", () => {
    const err = { code: 11000, keyValue: { email: "a@b.com" } };
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toMatch(/email/i);
  });

  it("handles JsonWebTokenError with 401", () => {
    const err = { name: "JsonWebTokenError", message: "jwt malformed" };
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toBe("Invalid token");
  });

  it("handles TokenExpiredError with 401", () => {
    const err = { name: "TokenExpiredError", message: "jwt expired" };
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].message).toMatch(/expired/i);
  });

  it("handles Multer LIMIT_FILE_SIZE with 413", () => {
    const err = { code: "LIMIT_FILE_SIZE" };
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json.mock.calls[0][0].message).toMatch(/too large/i);
  });

  it("returns the error's statusCode when set", () => {
    const err = { statusCode: 404, message: "Resource not found" };
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].message).toBe("Resource not found");
  });

  it("defaults to 500 for unknown errors", () => {
    const err = { message: "Something broke" };
    const { res } = run(err);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("hides error details in production for 500 errors", () => {
    const err = { message: "DB connection string exposed!" };
    const { res } = run(err, "production");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).toBe("An unexpected error occurred");
  });

  it("shows real message in development for 500 errors", () => {
    const err = { message: "Real dev error message" };
    const { res } = run(err, "development");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).toBe("Real dev error message");
  });

  it("never calls next()", () => {
    const err  = { statusCode: 400, message: "Bad request" };
    const { next } = run(err);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns success: false for all error types", () => {
    const cases = [
      { name: "ValidationError", errors: { x: { message: "fail" } } },
      { code: 11000, keyValue: {} },
      { name: "JsonWebTokenError" },
      { statusCode: 404, message: "Not found" },
    ];
    for (const err of cases) {
      const { res } = run(err);
      expect(res.json.mock.calls[0][0].success).toBe(false);
      vi.clearAllMocks();
    }
  });
});
