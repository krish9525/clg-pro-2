import { Lecture } from "../models/Lecture.js";
import { getMimeExt } from "../middlewares/upload.js";

// ─── Add resource to a lecture ────────────────────────────────────────────────

export const addResource = async (lectureId, file, customName) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const e = new Error("Lecture not found"); e.statusCode = 404; throw e;
  }

  const fileType = getMimeExt(file.mimetype);
  const name     = customName?.trim() || file.originalname;

  // URL: Cloudinary secure_url or local disk path
  const url =
    file.path?.startsWith("http")
      ? file.path
      : `/uploads/${file.filename}`;

  lecture.resources.push({
    name,
    url,
    fileType,
    size: file.size || 0,
  });

  await lecture.save();
  return lecture.resources[lecture.resources.length - 1]; // return just the new resource
};

// ─── Remove resource from a lecture ──────────────────────────────────────────

export const removeResource = async (lectureId, resourceId) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const e = new Error("Lecture not found"); e.statusCode = 404; throw e;
  }

  const before = lecture.resources.length;
  lecture.resources = lecture.resources.filter(
    (r) => r._id.toString() !== resourceId
  );

  if (lecture.resources.length === before) {
    const e = new Error("Resource not found"); e.statusCode = 404; throw e;
  }

  await lecture.save();
};

// ─── Get all resources for a lecture ─────────────────────────────────────────

export const getResources = async (lectureId) => {
  const lecture = await Lecture.findById(lectureId).select("resources title");
  if (!lecture) {
    const e = new Error("Lecture not found"); e.statusCode = 404; throw e;
  }
  return lecture.resources;
};
