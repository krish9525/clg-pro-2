import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { getQuiz, submitQuiz, getMyQuizResults } from "../../api/courseApi.js";
import "./quiz.css";

const QuizPlayer = ({ lectureId, onClose }) => {
  const [quiz, setQuiz]         = useState(null);
  const [answers, setAnswers]   = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [pastBest, setPastBest] = useState(null);
  const startTime = useRef(Date.now());
  const timerRef  = useRef(null);

  useEffect(() => {
    load();
    return () => clearInterval(timerRef.current);
  }, [lectureId]);

  const load = async () => {
    try {
      const [quizRes, resultsRes] = await Promise.allSettled([
        getQuiz(lectureId),
        getMyQuizResults(null), // will be set after quiz loads
      ]);

      if (quizRes.status === "fulfilled") {
        const q = quizRes.value.data.data.quiz;
        setQuiz(q);
        setAnswers(new Array(q.questions.length).fill(null));

        // Start timer if quiz has a time limit
        if (q.timeLimit > 0) {
          setTimeLeft(q.timeLimit * 60);
        }
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  // Fetch past results separately after quiz ID is available
  useEffect(() => {
    if (!quiz) return;
    getMyQuizResults(quiz._id)
      .then(r => {
        const results = r.data.data.results;
        if (results?.length) {
          const best = results.reduce((a, b) => a.score > b.score ? a : b);
          setPastBest(best);
        }
      })
      .catch(() => {});
  }, [quiz]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, submitted]);

  const select = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => { const a = [...prev]; a[qIdx] = optIdx; return a; });
  };

  const handleSubmit = async () => {
    if (answers.some(a => a === null)) {
      toast.error("Please answer all questions before submitting");
      return;
    }
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const elapsed  = Math.floor((Date.now() - startTime.current) / 1000);
      const { data } = await submitQuiz(quiz._id, answers, elapsed);
      setResult(data.data);
      setSubmitted(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) return <div className="quiz-loading">Loading quiz…</div>;
  if (!quiz)   return null;

  // ─── Results screen ─────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-modal">
          <div className={`quiz-result-header ${result.passed ? "passed" : "failed"}`}>
            <span className="result-icon">{result.passed ? "🎉" : "😔"}</span>
            <h2>{result.passed ? "You Passed!" : "Not Quite — Try Again!"}</h2>
            <div className="result-score">{result.score}%</div>
            <p>{result.correct} / {result.total} correct · Passing score: {quiz.passingScore}%</p>
          </div>

          <div className="quiz-answers-review">
            <h3>Review</h3>
            {result.graded.map((g, i) => (
              <div key={i} className={`review-item ${g.isCorrect ? "correct" : "wrong"}`}>
                <p className="review-q"><strong>Q{i + 1}:</strong> {g.question}</p>
                <div className="review-options">
                  {g.options.map((opt, j) => (
                    <div
                      key={j}
                      className={`review-opt ${
                        j === g.correctIndex ? "correct-opt" :
                        j === g.selected && !g.isCorrect ? "wrong-opt" : ""
                      }`}
                    >
                      {j === g.correctIndex && "✓ "}
                      {j === g.selected && j !== g.correctIndex && "✗ "}
                      {opt}
                    </div>
                  ))}
                </div>
                {g.explanation && (
                  <p className="review-exp">💡 {g.explanation}</p>
                )}
              </div>
            ))}
          </div>

          <div className="quiz-actions">
            {!result.passed && (
              <button className="quiz-retry-btn" onClick={() => {
                setSubmitted(false); setResult(null);
                setAnswers(new Array(quiz.questions.length).fill(null));
                startTime.current = Date.now();
                if (quiz.timeLimit > 0) setTimeLeft(quiz.timeLimit * 60);
              }}>
                🔄 Retry Quiz
              </button>
            )}
            <button className="quiz-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Quiz screen ─────────────────────────────────────────────────────────────
  const answered = answers.filter(a => a !== null).length;

  return (
    <div className="quiz-overlay">
      <div className="quiz-modal">
        <div className="quiz-header">
          <h2>📝 Lecture Quiz</h2>
          <div className="quiz-meta">
            <span>{quiz.questions.length} Questions · Pass: {quiz.passingScore}%</span>
            {timeLeft !== null && (
              <span className={`quiz-timer ${timeLeft < 60 ? "danger" : ""}`}>
                ⏱ {formatTime(timeLeft)}
              </span>
            )}
          </div>
          {pastBest && (
            <p className="quiz-past-best">
              Your best score: <strong>{pastBest.score}%</strong>
              {pastBest.passed ? " ✅" : " — try to beat it!"}
            </p>
          )}
        </div>

        <div className="quiz-progress-bar">
          <div style={{ width: `${(answered / quiz.questions.length) * 100}%` }} />
        </div>

        <div className="quiz-questions">
          {quiz.questions.map((q, i) => (
            <div key={q._id} className="quiz-question">
              <p className="q-text">
                <span className="q-num">Q{i + 1}.</span> {q.question}
              </p>
              <div className="q-options">
                {q.options.map((opt, j) => (
                  <button
                    key={j}
                    className={`q-opt ${answers[i] === j ? "selected" : ""}`}
                    onClick={() => select(i, j)}
                  >
                    <span className="opt-letter">{String.fromCharCode(65 + j)}</span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="quiz-footer">
          <span className="answered-count">{answered}/{quiz.questions.length} answered</span>
          <div className="quiz-footer-btns">
            <button className="quiz-cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className="quiz-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || answers.some(a => a === null)}
            >
              {submitting ? "Submitting…" : "Submit Quiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPlayer;
