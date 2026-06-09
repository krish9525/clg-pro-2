import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { Progress } from "../models/Progress.js";
import { Enrollment } from "../models/Enrollment.js";
import { User } from "../models/User.js";
import { uniqueSlug } from "../utils/slugify.js";

// ─── Courses ──────────────────────────────────────────────────────────────────

/**
 * Paginated public course listing with optional category/search filters.
 * Returns { courses, total, page, pages }
 */
export const listCourses = async (filters = {}) => {
  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(50, parseInt(filters.limit) || 12);
  const skip  = (page - 1) * limit;

  const query = { isPublished: true };
  if (filters.category) query.category = filters.category;
  if (filters.level)    query.level    = filters.level;
  if (filters.search) {
    query.$or = [
      { title:       { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [courses, total] = await Promise.all([
    Courses.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-ratings"),
    Courses.countDocuments(query),
  ]);

  return { courses, total, page, pages: Math.ceil(total / limit) };
};

/**
 * Admin: all courses (paginated).
 */
export const listAllCourses = async (filters = {}) => {
  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(100, parseInt(filters.limit) || 20);
  const skip  = (page - 1) * limit;

  const [courses, total] = await Promise.all([
    Courses.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Courses.countDocuments(),
  ]);

  return { courses, total, page, pages: Math.ceil(total / limit) };
};

export const getCourseById = async (id) => {
  const course = await Courses.findById(id);
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }
  return course;
};

// ─── Access check ─────────────────────────────────────────────────────────────

export const userHasAccess = async (userId, courseId) => {
  // Check Enrollment model first (new), fall back to User.subscription (legacy)
  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
    isActive: true,
  });
  if (enrollment) return true;

  const user = await User.findById(userId).select("subscription role");
  if (user?.role === "admin") return true;
  return user?.subscription?.some((s) => s.toString() === courseId.toString()) ?? false;
};

// ─── Lectures ─────────────────────────────────────────────────────────────────

export const getLecturesByCourse = async (courseId, userId) => {
  const access = await userHasAccess(userId, courseId);
  const user = await User.findById(userId).select("role");

  if (user?.role !== "admin" && !access) {
    const err = new Error("You are not enrolled in this course");
    err.statusCode = 403;
    throw err;
  }
  return Lecture.find({ course: courseId }).sort({ order: 1, createdAt: 1 });
};

export const getLectureById = async (lectureId, userId) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const err = new Error("Lecture not found");
    err.statusCode = 404;
    throw err;
  }

  const user = await User.findById(userId).select("role");
  if (user?.role === "admin") return lecture;

  const access = await userHasAccess(userId, lecture.course);
  if (!access) {
    const err = new Error("You are not enrolled in this course");
    err.statusCode = 403;
    throw err;
  }
  return lecture;
};

// ─── Enrolled courses ─────────────────────────────────────────────────────────

export const getEnrolledCourses = async (userId) => {
  // Prefer Enrollment model; fall back to User.subscription
  const enrollments = await Enrollment.find({
    user: userId,
    isActive: true,
  }).select("course");

  if (enrollments.length > 0) {
    const ids = enrollments.map((e) => e.course);
    return Courses.find({ _id: { $in: ids } });
  }

  // Legacy fallback
  const user = await User.findById(userId).select("subscription");
  if (!user) return [];
  return Courses.find({ _id: { $in: user.subscription } });
};

// ─── Progress ─────────────────────────────────────────────────────────────────

export const recordProgress = async (userId, courseId, lectureId) => {
  const progress = await Progress.findOne({ user: userId, course: courseId });
  if (!progress) {
    const err = new Error("Progress record not found — are you enrolled?");
    err.statusCode = 404;
    throw err;
  }

  if (progress.completedLectures.some((l) => l.toString() === lectureId)) {
    return { alreadyRecorded: true, certificateEarned: progress.certificateEarned };
  }

  progress.completedLectures.push(lectureId);
  await progress.save();

  // Check if all lectures done → auto-award certificate
  const { checkAndAwardCertificate } = await import("./certificateService.js");
  const updated = await checkAndAwardCertificate(userId, courseId);

  return {
    alreadyRecorded:  false,
    certificateEarned: updated?.certificateEarned ?? false,
    certificateId:     updated?.certificateId ?? null,
  };
};

export const getCourseProgress = async (userId, courseId) => {
  const progress = await Progress.findOne({ user: userId, course: courseId });
  if (!progress) {
    const err = new Error("Progress not found");
    err.statusCode = 404;
    throw err;
  }

  const allLectures = await Lecture.countDocuments({ course: courseId });
  const completedLectures = progress.completedLectures.length;
  const courseProgressPercentage =
    allLectures > 0 ? +((completedLectures / allLectures) * 100).toFixed(1) : 0;

  return { courseProgressPercentage, completedLectures, allLectures, progress };
};
