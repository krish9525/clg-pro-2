/**
 * Shared test helpers — seed data, token factories, request builders.
 */
import request from "supertest";
import bcrypt  from "bcrypt";
import jwt     from "jsonwebtoken";
import { User } from "../../models/User.js";
import { Courses } from "../../models/Courses.js";

// ─── Seed helpers ─────────────────────────────────────────────────────────────

export async function createUser(overrides = {}) {
  const defaults = {
    name:     "Test User",
    email:    "test@example.com",
    password: await bcrypt.hash("Password123", 10),
    role:     "user",
  };
  return User.create({ ...defaults, ...overrides });
}

export async function createAdmin(overrides = {}) {
  return createUser({ name: "Admin User", email: "admin@example.com", role: "admin", ...overrides });
}

export async function createCourse(overrides = {}) {
  return Courses.create({
    title:       "Test Course",
    description: "A test course description",
    image:       "https://res.cloudinary.com/test/image.jpg",
    price:       999,
    duration:    10,
    category:    "Web Development",
    createdBy:   "Test Admin",
    isPublished: true,
    ...overrides,
  });
}

// ─── Token factories ──────────────────────────────────────────────────────────

export function makeAccessToken(userId) {
  return jwt.sign({ _id: userId }, process.env.Jwt_Sec, { expiresIn: "15m" });
}

export function makeRefreshToken(userId) {
  return jwt.sign({ _id: userId }, process.env.Refresh_Secret, { expiresIn: "7d" });
}

export function makeActivationToken(userData, otp) {
  return jwt.sign({ user: userData, otp }, process.env.Activation_Secret, { expiresIn: "5m" });
}

// ─── Authenticated request helper ─────────────────────────────────────────────

export function authRequest(app, userId) {
  const token = makeAccessToken(userId);
  return {
    get:    (url)  => request(app).get(url).set("token", token),
    post:   (url)  => request(app).post(url).set("token", token),
    put:    (url)  => request(app).put(url).set("token", token),
    delete: (url)  => request(app).delete(url).set("token", token),
  };
}
