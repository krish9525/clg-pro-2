import crypto from "crypto";
import { instance } from "../utils/razorpay.js";
import { Courses } from "../models/Courses.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";
import { Enrollment } from "../models/Enrollment.js";

// ─── Checkout ─────────────────────────────────────────────────────────────────

export const createOrder = async (userId, courseId) => {
  const user = await User.findById(userId).select("subscription");
  const course = await Courses.findById(courseId);

  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  // Prevent duplicate purchase
  const alreadyEnrolled = await Enrollment.findOne({
    user: userId,
    course: courseId,
    isActive: true,
  });
  const legacyEnrolled = user?.subscription?.some(
    (s) => s.toString() === courseId.toString()
  );

  if (alreadyEnrolled || legacyEnrolled) {
    const err = new Error("You are already enrolled in this course");
    err.statusCode = 400;
    throw err;
  }

  const order = await instance.orders.create({
    amount: Number(course.price * 100), // in paise
    currency: "INR",
  });

  return { order, course };
};

// ─── Payment Verification ─────────────────────────────────────────────────────

export const verifyAndEnroll = async (userId, courseId, paymentData) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    paymentData;

  // HMAC signature verification
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.Razorpay_Secret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    const err = new Error("Payment verification failed — invalid signature");
    err.statusCode = 400;
    throw err;
  }

  // Get course for amount info
  const course = await Courses.findById(courseId).select("price title");

  // Record payment with full context
  const payment = await Payment.create({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    user: userId,
    course: courseId,
    amount: course?.price,
    currency: "INR",
    status: "success",
  });

  // Create Enrollment record (new canonical model)
  await Enrollment.create({
    user: userId,
    course: courseId,
    payment: payment._id,
    isActive: true,
  });

  // Legacy: also push to User.subscription for backward compat
  await User.findByIdAndUpdate(userId, {
    $addToSet: { subscription: courseId },
  });

  // Initialize progress tracking (upsert — safe if already exists)
  await Progress.findOneAndUpdate(
    { user: userId, course: courseId },
    { $setOnInsert: { completedLectures: [] } },
    { upsert: true, new: true }
  );

  // Increment denormalized enrollment counter on the course
  await Courses.findByIdAndUpdate(courseId, { $inc: { enrollCount: 1 } });
};
