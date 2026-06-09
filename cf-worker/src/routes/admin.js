import { Hono } from "hono";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { Progress } from "../models/Progress.js";
import { User } from "../models/User.js";
import { connectDb } from "../db.js";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";
import { uploadToCloudinary } from "../cloudinary.js";

const router = new Hono();

const getYouTubeId = (url) => {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

router.post("/course/new", isAuth, isAdmin, async (c) => {
  try {
    await connectDb(c.env);
    const formData = await c.req.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const category = formData.get("category");
    const createdBy = formData.get("createdBy");
    const duration = formData.get("duration");
    const price = formData.get("price");
    const imageFile = formData.get("file");

    if (!imageFile) return c.json({ message: "Image is required" }, 400);

    const imageUrl = await uploadToCloudinary(
      imageFile,
      imageFile.name,
      c.env,
      "elearning/courses"
    );

    await Courses.create({
      title, description, category, createdBy,
      duration: Number(duration),
      price: Number(price),
      image: imageUrl,
    });

    return c.json({ message: "Course Created Successfully" }, 201);
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/course/:id", isAuth, isAdmin, async (c) => {
  try {
    await connectDb(c.env);
    const course = await Courses.findById(c.req.param("id"));
    if (!course) return c.json({ message: "No Course with this id" }, 404);

    const { title, description, youtubeUrl } = await c.req.json();
    const videoId = getYouTubeId(youtubeUrl);
    if (!videoId) return c.json({ message: "Invalid YouTube URL." }, 400);

    const lecture = await Lecture.create({
      title, description, video: videoId, course: course._id,
    });

    return c.json({ message: "Lecture Added", lecture }, 201);
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.delete("/course/:id", isAuth, isAdmin, async (c) => {
  try {
    await connectDb(c.env);
    const course = await Courses.findById(c.req.param("id"));
    await Lecture.deleteMany({ course: c.req.param("id") });
    await course.deleteOne();
    await User.updateMany({}, { $pull: { subscription: c.req.param("id") } });
    return c.json({ message: "Course Deleted" });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.delete("/lecture/:id", isAuth, isAdmin, async (c) => {
  try {
    await connectDb(c.env);
    const lecture = await Lecture.findById(c.req.param("id"));
    if (!lecture) return c.json({ message: "Lecture not found" }, 404);
    await lecture.deleteOne();
    return c.json({ message: "Lecture Deleted" });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/stats", isAuth, isAdmin, async (c) => {
  try {
    await connectDb(c.env);
    const totalCoures = await Courses.countDocuments();
    const totalLectures = await Lecture.countDocuments();
    const totalUsers = await User.countDocuments();
    return c.json({ stats: { totalCoures, totalLectures, totalUsers } });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/users", isAuth, isAdmin, async (c) => {
  try {
    await connectDb(c.env);
    const users = await User.find({ _id: { $ne: c.get("user")._id } })
      .select("-password")
      .populate({ path: "subscription", select: "title duration category" });
    return c.json({ users });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.put("/user/:id", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const reqUser = c.get("user");
    if (reqUser.role !== "admin" && reqUser.mainrole !== "superadmin")
      return c.json({ message: "You do not have permission to update roles" }, 403);

    const user = await User.findById(c.req.param("id"));
    if (!user) return c.json({ message: "User not found" }, 404);
    if (user.mainrole === "superadmin")
      return c.json({ message: "Cannot change role of superadmin" }, 403);
    if (reqUser._id.toString() === user._id.toString())
      return c.json({ message: "You cannot change your own role" }, 400);

    user.role = user.role === "user" ? "admin" : "user";
    await user.save();
    return c.json({ message: `Role updated to ${user.role}` });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.delete("/user/:userId/course/:courseId", isAuth, isAdmin, async (c) => {
  try {
    await connectDb(c.env);
    const user = await User.findById(c.req.param("userId"));
    if (!user) return c.json({ message: "User not found" }, 404);

    const courseId = c.req.param("courseId");
    if (!user.subscription.includes(courseId))
      return c.json({ message: "User is not enrolled in this course" }, 400);

    user.subscription = user.subscription.filter((s) => s.toString() !== courseId);
    await user.save();
    await Progress.deleteMany({ user: user._id, course: courseId });

    return c.json({ message: "Course access revoked successfully" });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

export default router;
