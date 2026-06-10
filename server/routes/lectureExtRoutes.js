import express from "express";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";
import { addResource, deleteResource, getResources } from "../controllers/resource.js";
import { getTranscript, refreshTranscript } from "../controllers/transcript.js";
import { uploadLectureResource } from "../middlewares/upload.js";

const router = express.Router();

// ─── Resources ────────────────────────────────────────────────────────────────
// Admin upload: POST /api/v1/admin/lecture/:id/resource
router.post(
  "/admin/lecture/:id/resource",
  isAuth,
  isAdmin,
  (req, res, next) => {
    uploadLectureResource(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  addResource
);

// Admin delete: DELETE /api/v1/admin/lecture/:id/resource/:resourceId
router.delete("/admin/lecture/:id/resource/:resourceId", isAuth, isAdmin, deleteResource);

// Student get: GET /api/v1/lecture/:id/resources
router.get("/lecture/:id/resources", isAuth, getResources);

// ─── Transcript ───────────────────────────────────────────────────────────────
// Admin refresh: POST /api/v1/admin/lecture/:id/transcript/refresh
router.post("/admin/lecture/:id/transcript/refresh", isAuth, isAdmin, refreshTranscript);

// Student get: GET /api/v1/lecture/:id/transcript
router.get("/lecture/:id/transcript", isAuth, getTranscript);

export default router;
