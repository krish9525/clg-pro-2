import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Progress } from "../models/Progress.js";
import { Enrollment } from "../models/Enrollment.js";
import { uniqueSlug } from "../utils/slugify.js";
import fs from "fs";

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const getDashboardStats = async () => {
  const [totalCourses, totalLectures, totalUsers, totalEnrollments] =
    await Promise.all([
      Courses.countDocuments(),
      Lecture.countDocuments(),
      User.countDocuments(),
      Enrollment.countDocuments({ isActive: true }),
    ]);

  return { totalCourses, totalLectures, totalUsers, totalEnrollments };
};

// ─── Course Management ────────────────────────────────────────────────────────

const getYouTubeId = (url) => {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

/** Admin: list ALL courses (published + draft) */
export const listAllCourses = async () =>
  Courses.find({}).sort({ createdAt: -1 });

export const createCourse = async ({ title, description, category, createdBy, duration, price, level }, imagePath) => {
  const slug = await uniqueSlug(title, async (s) => !!(await Courses.findOne({ slug: s })));

  return Courses.create({
    title,
    slug,
    description,
    category,
    createdBy,
    image: imagePath,
    duration,
    price,
    level: level || "beginner",
    isPublished: false, // courses start as draft
  });
};

export const publishCourse = async (courseId) => {
  const course = await Courses.findByIdAndUpdate(
    courseId,
    { isPublished: true },
    { new: true }
  );
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }
  return course;
};

export const addLectureToCourse = async (courseId, { title, description, youtubeUrl }) => {
  const course = await Courses.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  const videoId = getYouTubeId(youtubeUrl);
  if (!videoId) {
    const err = new Error("Invalid YouTube URL. Please provide a valid YouTube link.");
    err.statusCode = 400;
    throw err;
  }

  // Assign order = count of existing lectures + 1
  const existingCount = await Lecture.countDocuments({ course: courseId });

  return Lecture.create({
    title,
    description,
    video: videoId,
    course: courseId,
    order: existingCount + 1,
  });
};

export const removeLecture = async (lectureId) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const err = new Error("Lecture not found");
    err.statusCode = 404;
    throw err;
  }
  await lecture.deleteOne();
};

export const removeCourse = async (courseId) => {
  const course = await Courses.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  // Delete thumbnail if it's a local file
  if (course.image && fs.existsSync(course.image)) {
    fs.rm(course.image, () => {});
  }

  await Lecture.deleteMany({ course: courseId });
  await Progress.deleteMany({ course: courseId });
  await Enrollment.updateMany({ course: courseId }, { isActive: false });
  await User.updateMany({}, { $pull: { subscription: courseId } });
  await course.deleteOne();
};

// ─── User Management ──────────────────────────────────────────────────────────

export const listUsers = async (excludeId) =>
  User.find({ _id: { $ne: excludeId } })
    .select("-password")
    .populate({ path: "subscription", select: "title duration category" });

export const toggleUserRole = async (requesterId, targetId, requesterRole, requesterMainrole) => {
  if (requesterRole !== "admin" && requesterMainrole !== "superadmin") {
    const err = new Error("You do not have permission to update roles");
    err.statusCode = 403;
    throw err;
  }

  if (requesterId.toString() === targetId.toString()) {
    const err = new Error("You cannot change your own role");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(targetId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (user.mainrole === "superadmin") {
    const err = new Error("Cannot change role of superadmin");
    err.statusCode = 403;
    throw err;
  }

  user.role = user.role === "user" ? "admin" : "user";
  await user.save();
  return user;
};

export const revokeCourseAccess = async (requesterId, userId, courseId, requesterRole, requesterMainrole) => {
  if (requesterRole !== "admin" && requesterMainrole !== "superadmin") {
    const err = new Error("You do not have permission to revoke access");
    err.statusCode = 403;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Deactivate in Enrollment model
  await Enrollment.findOneAndUpdate(
    { user: userId, course: courseId },
    { isActive: false }
  );

  // Remove from legacy subscription array
  user.subscription = user.subscription.filter(
    (s) => s.toString() !== courseId.toString()
  );
  await user.save();

  // Remove progress
  await Progress.deleteMany({ user: userId, course: courseId });

  // Decrement enrollment counter
  await Courses.findByIdAndUpdate(courseId, { $inc: { enrollCount: -1 } });
};
