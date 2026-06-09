import { Quiz }       from "../models/Quiz.js";
import { QuizResult } from "../models/QuizResult.js";
import { Lecture }    from "../models/Lecture.js";

// ─── Admin: Quiz CRUD ─────────────────────────────────────────────────────────

export const upsertQuiz = async (lectureId, { questions, passingScore, timeLimit, isActive }) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    const e = new Error("Lecture not found"); e.statusCode = 404; throw e;
  }

  const quiz = await Quiz.findOneAndUpdate(
    { lecture: lectureId },
    {
      lecture: lectureId,
      course:  lecture.course,
      ...(questions    !== undefined && { questions }),
      ...(passingScore !== undefined && { passingScore }),
      ...(timeLimit    !== undefined && { timeLimit }),
      ...(isActive     !== undefined && { isActive }),
    },
    { upsert: true, new: true, runValidators: true }
  );
  return quiz;
};

export const getQuizByLecture = async (lectureId) => {
  return Quiz.findOne({ lecture: lectureId });
};

/** Admin view — includes correct answers */
export const getQuizAdminView = async (lectureId) => {
  const quiz = await Quiz.findOne({ lecture: lectureId });
  if (!quiz) { const e = new Error("No quiz for this lecture"); e.statusCode = 404; throw e; }
  return quiz;
};

/** Student view — strips correctIndex and explanation */
export const getQuizStudentView = async (lectureId) => {
  const quiz = await Quiz.findOne({ lecture: lectureId, isActive: true });
  if (!quiz) { const e = new Error("No quiz for this lecture"); e.statusCode = 404; throw e; }

  return {
    _id:          quiz._id,
    passingScore: quiz.passingScore,
    timeLimit:    quiz.timeLimit,
    questions:    quiz.questions.map((q) => ({
      _id:      q._id,
      question: q.question,
      options:  q.options,
      // correctIndex & explanation intentionally omitted
    })),
  };
};

export const deleteQuiz = async (lectureId) => {
  await Quiz.findOneAndDelete({ lecture: lectureId });
};

// ─── Student: Attempt Quiz ────────────────────────────────────────────────────

export const submitQuizAttempt = async (userId, quizId, answers, timeTaken = 0) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz || !quiz.isActive) {
    const e = new Error("Quiz not found or inactive"); e.statusCode = 404; throw e;
  }

  if (answers.length !== quiz.questions.length) {
    const e = new Error(`Expected ${quiz.questions.length} answers, got ${answers.length}`);
    e.statusCode = 400; throw e;
  }

  // Grade
  let correct = 0;
  const graded = quiz.questions.map((q, i) => {
    const isCorrect = Number(answers[i]) === q.correctIndex;
    if (isCorrect) correct++;
    return {
      question:     q.question,
      options:      q.options,
      selected:     answers[i],
      correctIndex: q.correctIndex,
      explanation:  q.explanation,
      isCorrect,
    };
  });

  const score  = Math.round((correct / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  // Count previous attempts
  const prev = await QuizResult.countDocuments({ user: userId, quiz: quizId });

  const result = await QuizResult.create({
    quiz:          quizId,
    lecture:       quiz.lecture,
    course:        quiz.course,
    user:          userId,
    answers,
    score,
    passed,
    attemptNumber: prev + 1,
    timeTaken,
  });

  return { result, graded, score, passed, correct, total: quiz.questions.length };
};

export const getMyQuizResults = async (userId, quizId) => {
  return QuizResult.find({ user: userId, quiz: quizId }).sort({ createdAt: -1 });
};
