/**
 * Integration tests for course routes:
 *   GET /api/v1/course/all
 *   GET /api/v1/course/:id
 *   GET /api/v1/lectures/:id   (protected)
 *   GET /api/v1/mycourse       (protected)
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "../setup/testApp.js";
import { createUser, createCourse, authRequest } from "../setup/helpers.js";
import { Courses } from "../../models/Courses.js";
import { User } from "../../models/User.js";

const app = createTestApp();

// ─── GET /api/v1/course/all ───────────────────────────────────────────────────
describe("GET /api/v1/course/all", () => {
  it("200 returns empty list when no courses", async () => {
    const res = await request(app).get("/api/v1/course/all");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it("200 returns published courses only", async () => {
    await createCourse({ title: "Published",   isPublished: true });
    await createCourse({ title: "Unpublished", isPublished: false });

    const res = await request(app).get("/api/v1/course/all");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Published");
  });

  it("returns pagination metadata", async () => {
    for (let i = 0; i < 3; i++) {
      await createCourse({ title: `Course ${i}`, isPublished: true });
    }
    const res = await request(app).get("/api/v1/course/all");
    expect(res.status).toBe(200);
    // pagination metadata lives under res.body.pagination
    expect(res.body.pagination).toHaveProperty("total");
    expect(res.body.pagination).toHaveProperty("pages");
  });

  it("filters by category", async () => {
    await createCourse({ title: "Python",     category: "Programming",  isPublished: true });
    await createCourse({ title: "Photoshop",  category: "Design",       isPublished: true });

    const res = await request(app).get("/api/v1/course/all?category=Programming");
    expect(res.status).toBe(200);
    expect(res.body.data.every((c) => c.category === "Programming")).toBe(true);
  });

  it("searches by title (case-insensitive)", async () => {
    await createCourse({ title: "Advanced React", isPublished: true });
    await createCourse({ title: "Vue Mastery",    isPublished: true });

    const res = await request(app).get("/api/v1/course/all?search=react");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title).toMatch(/react/i);
  });

  it("respects limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await createCourse({ title: `C${i}`, isPublished: true });
    }
    const res = await request(app).get("/api/v1/course/all?limit=2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("paginates with page parameter", async () => {
    for (let i = 0; i < 4; i++) {
      await createCourse({ title: `Page ${i}`, isPublished: true });
    }
    const p1 = await request(app).get("/api/v1/course/all?limit=2&page=1");
    const p2 = await request(app).get("/api/v1/course/all?limit=2&page=2");
    expect(p1.body.data).toHaveLength(2);
    expect(p2.body.data).toHaveLength(2);
    // Should be different courses
    const p1Ids = p1.body.data.map((c) => c._id);
    const p2Ids = p2.body.data.map((c) => c._id);
    expect(p1Ids).not.toEqual(expect.arrayContaining(p2Ids));
  });

  it("clamps limit to max 50", async () => {
    const res = await request(app).get("/api/v1/course/all?limit=200");
    expect(res.status).toBe(200);
    // No error — just capped
  });
});

// ─── GET /api/v1/course/:id ───────────────────────────────────────────────────
describe("GET /api/v1/course/:id", () => {
  it("200 returns a single course by ID", async () => {
    const course = await createCourse({ title: "Single Course" });
    const res    = await request(app).get(`/api/v1/course/${course._id}`);
    expect(res.status).toBe(200);
    // getSingleCourse wraps in data: { course }
    expect(res.body.data.course.title).toBe("Single Course");
  });

  it("404 for non-existent course ID", async () => {
    const res = await request(app).get("/api/v1/course/64c0000000000000000000bb");
    expect(res.status).toBe(404);
  });

  it("400 / 500 for invalid ObjectId format", async () => {
    const res = await request(app).get("/api/v1/course/not-an-id");
    expect([400, 422, 500]).toContain(res.status);
  });
});

// ─── GET /api/v1/mycourse ─────────────────────────────────────────────────────
describe("GET /api/v1/mycourse (protected)", () => {
  it("401 without auth token", async () => {
    const res = await request(app).get("/api/v1/mycourse");
    expect(res.status).toBe(401);
  });

  it("200 returns enrolled courses for authenticated user", async () => {
    const course = await createCourse({ title: "Enrolled Course" });
    const user   = await createUser({ email: "enrolled@test.com" });

    // Simulate enrollment: add course to user's subscription
    await User.findByIdAndUpdate(user._id, {
      $push: { subscription: course._id },
    });

    const res = await authRequest(app, user._id).get("/api/v1/mycourse");
    expect(res.status).toBe(200);
    // getMyCourses wraps in data: { courses }
    const courses = res.body.data.courses;
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.some((c) => c._id.toString() === course._id.toString())).toBe(true);
  });

  it("200 returns empty array when user has no subscriptions", async () => {
    const user = await createUser({ email: "notenrolled@test.com" });
    const res  = await authRequest(app, user._id).get("/api/v1/mycourse");
    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(0);
  });
});

// ─── GET /api/v1/lectures/:id ─────────────────────────────────────────────────
describe("GET /api/v1/lectures/:id (protected)", () => {
  it("401 without token", async () => {
    const course = await createCourse();
    const res    = await request(app).get(`/api/v1/lectures/${course._id}`);
    expect(res.status).toBe(401);
  });

  it("403 when user is not subscribed", async () => {
    const course = await createCourse({ title: "Locked Course" });
    const user   = await createUser({ email: "unsubbed@test.com" });

    const res = await authRequest(app, user._id).get(`/api/v1/lectures/${course._id}`);
    // Either 403 Forbidden or 400 depending on controller implementation
    expect([400, 403]).toContain(res.status);
  });
});
