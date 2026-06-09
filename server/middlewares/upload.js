import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// ─── Determine storage backend ────────────────────────────────────────────────
const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("[Upload] Using Cloudinary storage");
} else {
  console.log("[Upload] Cloudinary not configured — using local disk storage");
}

// ─── Storage engines ──────────────────────────────────────────────────────────

const cloudinaryStorage = useCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder: "elearning/courses",
        public_id: `course-${uuid()}`,
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 800, height: 450, crop: "limit", quality: "auto" }],
      }),
    })
  : null;

const localUploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, localUploadsDir);
  },
  filename(req, file, cb) {
    const ext = file.originalname.split(".").pop();
    cb(null, `${uuid()}.${ext}`);
  },
});

// ─── File filter ──────────────────────────────────────────────────────────────

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"), false);
  }
  cb(null, true);
};

// ─── Multer instances ─────────────────────────────────────────────────────────

/** Course thumbnail upload — 5 MB limit */
export const uploadCourseImage = multer({
  storage: useCloudinary ? cloudinaryStorage : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single("file");

// ─── Cloudinary chat image storage ────────────────────────────────────────────

const chatCloudinaryStorage = useCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder: "elearning/chat",
        public_id: `chat-${uuid()}`,
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      }),
    })
  : null;

const chatDiskStorage = multer.diskStorage({
  destination(req, file, cb) { cb(null, localUploadsDir); },
  filename(req, file, cb) {
    const ext = file.originalname.split(".").pop();
    cb(null, `chat-${uuid()}.${ext}`);
  },
});

/** Chat image upload — 5 MB limit */
export const uploadChatImage = multer({
  storage: useCloudinary ? chatCloudinaryStorage : chatDiskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single("image");

/**
 * Get the public URL of an uploaded file.
 * Works for both Cloudinary (returns secure_url) and disk storage (returns /uploads/filename).
 */
export const getFileUrl = (file) => {
  if (!file) return null;
  // Cloudinary response has .path set to the secure_url by multer-storage-cloudinary
  if (useCloudinary && file.path && file.path.startsWith("http")) {
    return file.path;
  }
  // Local disk: build relative URL
  return `/uploads/${file.filename}`;
};

// ─── Document upload (PDF, DOC, DOCX, PPT, PPTX) ─────────────────────────────

const ALLOWED_DOC_MIMES = [
  "application/pdf",
  "application/msword",                                                        // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  // .docx
  "application/vnd.ms-powerpoint",                                             // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",// .pptx
  "text/plain",                                                                // .txt
  "application/zip",
];

const docFilter = (req, file, cb) => {
  if (!ALLOWED_DOC_MIMES.includes(file.mimetype)) {
    return cb(new Error("Only PDF, DOC, DOCX, PPT, PPTX, TXT, or ZIP files are allowed"), false);
  }
  cb(null, true);
};

const docCloudinaryStorage = useCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder:      "elearning/resources",
        public_id:   `resource-${uuid()}`,
        resource_type: "raw",  // required for non-image files on Cloudinary
      }),
    })
  : null;

const docDiskStorage = multer.diskStorage({
  destination(req, file, cb) { cb(null, localUploadsDir); },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `resource-${uuid()}${ext}`);
  },
});

/** Lecture resource upload — 20 MB limit */
export const uploadLectureResource = multer({
  storage: useCloudinary ? docCloudinaryStorage : docDiskStorage,
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: docFilter,
}).single("file");

/** Derive file extension from mimetype */
export const getMimeExt = (mimetype = "") => {
  const map = {
    "application/pdf":   "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "application/zip": "zip",
  };
  return map[mimetype] || "file";
};
