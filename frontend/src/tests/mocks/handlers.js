/**
 * MSW request handlers — mock the API server for frontend tests.
 */
import { http, HttpResponse } from "msw";

const BASE = "/api/v1";

// ─── User / Auth ──────────────────────────────────────────────────────────────

export const handlers = [
  // GET /api/v1/user/me
  http.get(`${BASE}/user/me`, () =>
    HttpResponse.json({
      success: true,
      message: "Profile fetched",
      data: { user: { _id: "user1", name: "Test User", email: "test@test.com", role: "user" } },
    })
  ),

  // POST /api/v1/user/login
  http.post(`${BASE}/user/login`, async ({ request }) => {
    const body = await request.json();
    if (body.password === "wrong") {
      return HttpResponse.json({ success: false, message: "Incorrect password" }, { status: 400 });
    }
    return HttpResponse.json({
      success: true,
      message: "Welcome back Test User",
      data: {
        token: "mock-access-token",
        user:  { _id: "user1", name: "Test User", email: body.email, role: "user" },
      },
    });
  }),

  // POST /api/v1/user/register
  http.post(`${BASE}/user/register`, async ({ request }) => {
    const body = await request.json();
    if (body.email === "existing@test.com") {
      return HttpResponse.json(
        { success: false, message: "User already exists with this email" },
        { status: 409 }
      );
    }
    return HttpResponse.json({
      success: true,
      message: "OTP sent to your email",
      data: { activationToken: "mock-activation-token" },
    });
  }),

  // POST /api/v1/user/verify
  http.post(`${BASE}/user/verify`, async ({ request }) => {
    const body = await request.json();
    if (body.otp === 999999) {
      return HttpResponse.json({ success: false, message: "Incorrect OTP" }, { status: 400 });
    }
    return HttpResponse.json({ success: true, message: "User registered successfully", data: null });
  }),

  // POST /api/v1/user/logout
  http.post(`${BASE}/user/logout`, () =>
    HttpResponse.json({ success: true, message: "Logged out successfully", data: null })
  ),

  // POST /api/v1/user/forgot
  http.post(`${BASE}/user/forgot`, async ({ request }) => {
    const body = await request.json();
    if (body.email === "nobody@test.com") {
      return HttpResponse.json({ success: false, message: "No account found" }, { status: 404 });
    }
    return HttpResponse.json({ success: true, message: "Reset link sent", data: null });
  }),

  // GET /api/v1/course/all
  http.get(`${BASE}/course/all`, () =>
    HttpResponse.json({
      success: true,
      data: [
        { _id: "c1", title: "React Fundamentals", category: "Web Development", price: 999 },
        { _id: "c2", title: "Node.js Mastery",    category: "Backend",          price: 1299 },
      ],
      pagination: { total: 2, page: 1, limit: 12, pages: 1 },
    })
  ),

  // GET /api/v1/course/:id
  http.get(`${BASE}/course/:id`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: { course: { _id: params.id, title: "React Fundamentals", price: 999 } },
    })
  ),

  // GET /api/v1/mycourse
  http.get(`${BASE}/mycourse`, () =>
    HttpResponse.json({
      success: true,
      data: { courses: [{ _id: "c1", title: "React Fundamentals" }] },
    })
  ),
];
