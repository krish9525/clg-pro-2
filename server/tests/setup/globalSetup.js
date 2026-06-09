/**
 * Vitest global setup — runs once before any test file.
 * Spins up an in-memory MongoDB instance and sets all env vars needed for tests.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;

// ─── Set test environment variables ──────────────────────────────────────────
process.env.NODE_ENV        = "test";
process.env.Jwt_Sec         = "test_jwt_secret_at_least_32_chars_long__padding";
process.env.Refresh_Secret  = "test_refresh_secret_at_least_32_chars__padding";
process.env.Activation_Secret = "test_activation_secret_32chars__pad";
process.env.Forgot_Secret   = "test_forgot_secret_32chars_padding_";
process.env.Razorpay_Key    = "rzp_test_dummy_key";
process.env.Razorpay_Secret = "dummy_secret";
process.env.frontendurl     = "http://localhost:5174";
process.env.MAIL_HOST       = ""; // force dev-mode console logging in tests

// ─── Start in-memory MongoDB before all tests ────────────────────────────────
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.DB = mongod.getUri();
  await mongoose.connect(process.env.DB);
});

// ─── Clean all collections between each test ─────────────────────────────────
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ─── Stop MongoDB and disconnect after all tests ──────────────────────────────
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
