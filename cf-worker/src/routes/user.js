import { Hono } from "hono";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Progress } from "../models/Progress.js";
import { Lecture } from "../models/Lecture.js";
import { connectDb } from "../db.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = new Hono();

router.post("/user/register", async (c) => {
  try {
    await connectDb(c.env);
    const { email, name, password } = await c.req.json();

    if (await User.findOne({ email }))
      return c.json({ message: "User Already exists" }, 400);

    const hashPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(Math.random() * 1000000);

    const activationToken = jwt.sign(
      { user: { name, email, password: hashPassword }, otp },
      c.env.Activation_Secret,
      { expiresIn: "5m" }
    );

    console.log(`\n${"=".repeat(50)}\n📧 OTP VERIFICATION\n${"=".repeat(50)}\nEmail: ${email}\nOTP: ${otp}\n${"=".repeat(50)}\n`);

    return c.json({ message: "Otp send to your mail", activationToken });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/user/verify", async (c) => {
  try {
    await connectDb(c.env);
    const { otp, activationToken } = await c.req.json();

    const verify = jwt.verify(activationToken, c.env.Activation_Secret);
    if (!verify) return c.json({ message: "Otp Expired" }, 400);
    if (verify.otp !== otp) return c.json({ message: "Wrong Otp" }, 400);

    await User.create({
      name: verify.user.name,
      email: verify.user.email,
      password: verify.user.password,
    });

    return c.json({ message: "User Registered" });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/user/login", async (c) => {
  try {
    await connectDb(c.env);
    const { email, password } = await c.req.json();

    const user = await User.findOne({ email });
    if (!user) return c.json({ message: "No User with this email" }, 400);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return c.json({ message: "wrong Password" }, 400);

    const token = jwt.sign({ _id: user._id }, c.env.Jwt_Sec, { expiresIn: "15d" });

    return c.json({ message: `Welcome back ${user.name}`, token, user });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/user/me", isAuth, async (c) => {
  const user = await User.findById(c.get("user")._id);
  return c.json({ user });
});

router.get("/user/admin", isAuth, async (c) => {
  await connectDb(c.env);
  const admin = await User.findOne({ role: "admin" });
  if (!admin) return c.json({ message: "Admin user not found" }, 404);
  return c.json({ admin });
});

router.post("/user/forgot", async (c) => {
  try {
    await connectDb(c.env);
    const { email } = await c.req.json();

    const user = await User.findOne({ email });
    if (!user) return c.json({ message: "No User with this email" }, 404);

    const token = jwt.sign({ email }, c.env.Forgot_Secret);
    console.log(`\n${"=".repeat(50)}\n🔑 PASSWORD RESET\n${"=".repeat(50)}\nEmail: ${email}\nReset Link: ${c.env.frontendurl}/reset-password/${token}\n${"=".repeat(50)}\n`);

    user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
    await user.save();

    return c.json({ message: "Reset Password Link is send to you mail" });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/user/reset", async (c) => {
  try {
    await connectDb(c.env);
    const token = c.req.query("token");
    const decodedData = jwt.verify(token, c.env.Forgot_Secret);

    const user = await User.findOne({ email: decodedData.email });
    if (!user) return c.json({ message: "No user with this email" }, 404);
    if (!user.resetPasswordExpire || user.resetPasswordExpire < Date.now())
      return c.json({ message: "Token Expired" }, 400);

    const { password } = await c.req.json();
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordExpire = null;
    await user.save();

    return c.json({ message: "Password Reset" });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/user/progress", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const { course, lectureId } = c.req.query();
    const progress = await Progress.findOne({ user: c.get("user")._id, course });

    if (progress.completedLectures.includes(lectureId))
      return c.json({ message: "Progress recorded" });

    progress.completedLectures.push(lectureId);
    await progress.save();

    return c.json({ message: "new Progress added" }, 201);
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/user/progress", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const course = c.req.query("course");
    const progress = await Progress.find({ user: c.get("user")._id, course });

    if (!progress?.length) return c.json({ message: "null" }, 404);

    const allLectures = (await Lecture.find({ course })).length;
    const completedLectures = progress[0].completedLectures.length;
    const courseProgressPercentage = (completedLectures * 100) / allLectures;

    return c.json({ courseProgressPercentage, completedLectures, allLectures, progress });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

export default router;
