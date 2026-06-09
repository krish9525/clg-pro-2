import TryCatch      from "../middlewares/TryCatch.js";
import { ok, created, fail } from "../utils/response.js";
import * as quizService from "../services/quizService.js";

// ─── Admin ─────────────────────────────────────────────────────────────────────

/** POST /api/v1/admin/lecture/:id/quiz — create or update */
export const upsertQuiz = TryCatch(async (req, res) => {
  const quiz = await quizService.upsertQuiz(req.params.id, req.body);
  ok(res, { quiz }, "Quiz saved successfully");
});

/** GET /api/v1/admin/lecture/:id/quiz — admin view (includes answers) */
export const getQuizAdmin = TryCatch(async (req, res) => {
  const quiz = await quizService.getQuizAdminView(req.params.id);
  ok(res, { quiz });
});

/** DELETE /api/v1/admin/lecture/:id/quiz */
export const deleteQuiz = TryCatch(async (req, res) => {
  await quizService.deleteQuiz(req.params.id);
  ok(res, null, "Quiz deleted");
});

// ─── Student ───────────────────────────────────────────────────────────────────

/** GET /api/v1/lecture/:id/quiz — student view (no answers) */
export const getQuizStudent = TryCatch(async (req, res) => {
  const quiz = await quizService.getQuizStudentView(req.params.id);
  ok(res, { quiz });
});

/** POST /api/v1/quiz/:id/attempt — submit answers */
export const submitAttempt = TryCatch(async (req, res) => {
  const { answers, timeTaken } = req.body;
  if (!Array.isArray(answers)) {
    return fail(res, 400, "answers must be an array");
  }
  const result = await quizService.submitQuizAttempt(
    req.user._id,
    req.params.id,
    answers,
    timeTaken
  );
  ok(res, result, result.passed ? "🎉 Congratulations, you passed!" : "Quiz completed — try again!");
});

/** GET /api/v1/quiz/:id/results — my past attempts */
export const myResults = TryCatch(async (req, res) => {
  const results = await quizService.getMyQuizResults(req.user._id, req.params.id);
  ok(res, { results });
});
