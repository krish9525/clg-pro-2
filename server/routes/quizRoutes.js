import express from "express";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";
import {
  upsertQuiz,
  getQuizAdmin,
  deleteQuiz,
  getQuizStudent,
  submitAttempt,
  myResults,
} from "../controllers/quiz.js";

const router = express.Router();

// ─── Admin — /api/v1/admin/lecture/:id/quiz ───────────────────────────────────
router.post("/admin/lecture/:id/quiz",   isAuth, isAdmin, upsertQuiz);
router.get("/admin/lecture/:id/quiz",    isAuth, isAdmin, getQuizAdmin);
router.delete("/admin/lecture/:id/quiz", isAuth, isAdmin, deleteQuiz);

// ─── Student — /api/v1/lecture/:id/quiz ──────────────────────────────────────
router.get("/lecture/:id/quiz", isAuth, getQuizStudent);

// ─── Student — /api/v1/quiz/:id/attempt  &  /api/v1/quiz/:id/results ─────────
router.post("/quiz/:id/attempt", isAuth, submitAttempt);
router.get("/quiz/:id/results",  isAuth, myResults);

export default router;
