import { Hono } from "hono";
import Razorpay from "razorpay";
import crypto from "crypto";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";
import { connectDb } from "../db.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = new Hono();

router.get("/course/all", async (c) => {
  try {
    await connectDb(c.env);
    const courses = await Courses.find();
    return c.json({ courses });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/course/:id", async (c) => {
  try {
    await connectDb(c.env);
    const course = await Courses.findById(c.req.param("id"));
    return c.json({ course });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/lectures/:id", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const lectures = await Lecture.find({ course: c.req.param("id") });
    const user = await User.findById(c.get("user")._id);

    if (user.role === "admin") return c.json({ lectures });
    if (!user.subscription.includes(c.req.param("id")))
      return c.json({ message: "You have not subscribed to this course" }, 400);

    return c.json({ lectures });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/lecture/:id", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const lecture = await Lecture.findById(c.req.param("id"));
    const user = await User.findById(c.get("user")._id);

    if (user.role === "admin") return c.json({ lecture });
    if (!user.subscription.includes(lecture.course))
      return c.json({ message: "You have not subscribed to this course" }, 400);

    return c.json({ lecture });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/mycourse", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const courses = await Courses.find({ _id: { $in: c.get("user").subscription } });
    return c.json({ courses });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/course/checkout/:id", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const user = await User.findById(c.get("user")._id);
    const course = await Courses.findById(c.req.param("id"));

    if (user.subscription.includes(course._id))
      return c.json({ message: "You already have this course" }, 400);

    const instance = new Razorpay({
      key_id: c.env.Razorpay_Key,
      key_secret: c.env.Razorpay_Secret,
    });

    const order = await instance.orders.create({
      amount: Number(course.price * 100),
      currency: "INR",
    });

    return c.json({ order, course }, 201);
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/verification/:id", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await c.req.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", c.env.Razorpay_Secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return c.json({ message: "Payment Failed" }, 400);

    await Payment.create({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    const user = await User.findById(c.get("user")._id);
    const course = await Courses.findById(c.req.param("id"));
    user.subscription.push(course._id);

    await Progress.create({
      course: course._id,
      completedLectures: [],
      user: c.get("user")._id,
    });

    await user.save();
    return c.json({ message: "Course Purchased Successfully" });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

export default router;
