import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { isAuth, isAdmin } from "../../../middlewares/isAuth.js";
import { User } from "../../../models/User.js";

// ─── Mock helpers ─────────────────────────────────────────────────────────────
function makeReq(overrides = {}) {
  return {
    cookies: {},
    headers: {},
    ...overrides,
  };
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json:   vi.fn(),
  };
}

// ─── isAuth ───────────────────────────────────────────────────────────────────
describe("isAuth middleware", () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests with no token", async () => {
    const req = makeReq();
    const res = makeRes();
    await isAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token from cookie", async () => {
    const user = await User.create({
      name: "Cookie User", email: "cookie@test.com",
      password: "hashed_password",
    });
    const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, { expiresIn: "15m" });

    const req = makeReq({ cookies: { token } });
    const res = makeRes();
    await isAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe("cookie@test.com");
  });

  it("accepts a valid Bearer token in Authorization header", async () => {
    const user = await User.create({
      name: "Bearer User", email: "bearer@test.com",
      password: "hashed_password",
    });
    const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, { expiresIn: "15m" });

    const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res = makeRes();
    await isAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.email).toBe("bearer@test.com");
  });

  it("accepts the legacy token header", async () => {
    const user = await User.create({
      name: "Legacy User", email: "legacy@test.com",
      password: "hashed_password",
    });
    const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, { expiresIn: "15m" });

    const req = makeReq({ headers: { token } });
    const res = makeRes();
    await isAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    const token = jwt.sign({ _id: "someId" }, process.env.Jwt_Sec, { expiresIn: "0s" });

    const req = makeReq({ headers: { token } });
    const res = makeRes();
    await isAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toMatch(/expired/i);
  });

  it("rejects a tampered token", async () => {
    const token = "this.is.garbage";
    const req   = makeReq({ headers: { token } });
    const res   = makeRes();
    await isAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when user no longer exists in DB", async () => {
    // Token for a non-existent ObjectId
    const fakeId = "64c0000000000000000000aa";
    const token  = jwt.sign({ _id: fakeId }, process.env.Jwt_Sec, { expiresIn: "15m" });

    const req = makeReq({ headers: { token } });
    const res = makeRes();
    await isAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not expose password on req.user", async () => {
    const user = await User.create({
      name: "Safe User", email: "safe@test.com",
      password: "hashed_password",
    });
    const token = jwt.sign({ _id: user._id }, process.env.Jwt_Sec, { expiresIn: "15m" });
    const req   = makeReq({ cookies: { token } });
    const res   = makeRes();
    await isAuth(req, res, next);

    expect(req.user.password).toBeUndefined();
  });
});

// ─── isAdmin ──────────────────────────────────────────────────────────────────
describe("isAdmin middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows admin users", () => {
    const next = vi.fn();
    const req  = { user: { role: "admin" } };
    const res  = makeRes();
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows superadmin (mainrole)", () => {
    const next = vi.fn();
    const req  = { user: { role: "user", mainrole: "superadmin" } };
    const res  = makeRes();
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("blocks regular users (role=user)", () => {
    const next = vi.fn();
    const req  = { user: { role: "user" } };
    const res  = makeRes();
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
