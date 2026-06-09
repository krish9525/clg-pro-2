/**
 * Admin component — create / edit quiz for a lecture.
 * Used inside the Lecture.jsx admin sidebar.
 */
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { saveQuiz, getQuizAdmin, deleteQuiz } from "../../api/adminApi.js";
import "./quizBuilder.css";

const emptyQuestion = () => ({
  question:     "",
  options:      ["", "", "", ""],
  correctIndex: 0,
  explanation:  "",
});

const QuizBuilder = ({ lectureId, onClose }) => {
  const [questions,    setQuestions]    = useState([emptyQuestion()]);
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit,    setTimeLimit]    = useState(0);
  const [isActive,     setIsActive]     = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [hasQuiz,      setHasQuiz]      = useState(false);

  useEffect(() => { loadExisting(); }, [lectureId]);

  const loadExisting = async () => {
    try {
      const { data } = await getQuizAdmin(lectureId);
      const q = data.data.quiz;
      setQuestions(q.questions.length ? q.questions : [emptyQuestion()]);
      setPassingScore(q.passingScore);
      setTimeLimit(q.timeLimit);
      setIsActive(q.isActive);
      setHasQuiz(true);
    } catch {
      setHasQuiz(false);
    } finally {
      setLoading(false);
    }
  };

  // ─── Question helpers ──────────────────────────────────────────────────────
  const updateQ = (i, field, val) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

  const updateOption = (qIdx, optIdx, val) =>
    setQuestions(qs => qs.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? val : o) } : q
    ));

  const addQuestion = () => setQuestions(qs => [...qs, emptyQuestion()]);
  const removeQ     = (i) => setQuestions(qs => qs.filter((_, idx) => idx !== i));

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) { toast.error(`Q${i+1}: Question text required`); return; }
      if (q.options.some(o => !o.trim())) { toast.error(`Q${i+1}: All 4 options required`); return; }
    }
    setSaving(true);
    try {
      await saveQuiz(lectureId, { questions, passingScore, timeLimit, isActive });
      toast.success("Quiz saved! 🎉");
      setHasQuiz(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this quiz? This cannot be undone.")) return;
    try {
      await deleteQuiz(lectureId);
      toast.success("Quiz deleted");
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete quiz");
    }
  };

  if (loading) return <div className="qb-loading">Loading quiz…</div>;

  return (
    <div className="qb-wrap">
      <div className="qb-topbar">
        <h3>📝 {hasQuiz ? "Edit" : "Create"} Quiz</h3>
        <div className="qb-topbar-actions">
          {hasQuiz && (
            <button className="qb-delete-btn" onClick={handleDelete}>🗑 Delete</button>
          )}
          <button className="qb-close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Settings */}
      <div className="qb-settings">
        <label>
          Passing Score (%)
          <input
            type="number" min={0} max={100}
            value={passingScore}
            onChange={e => setPassingScore(Number(e.target.value))}
          />
        </label>
        <label>
          Time Limit (min, 0 = unlimited)
          <input
            type="number" min={0}
            value={timeLimit}
            onChange={e => setTimeLimit(Number(e.target.value))}
          />
        </label>
        <label className="qb-toggle">
          Active
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
        </label>
      </div>

      {/* Questions */}
      <div className="qb-questions">
        {questions.map((q, i) => (
          <div key={i} className="qb-question">
            <div className="qb-q-header">
              <span className="qb-q-num">Q{i + 1}</span>
              {questions.length > 1 && (
                <button className="qb-remove-q" onClick={() => removeQ(i)}>✕ Remove</button>
              )}
            </div>

            <input
              className="qb-input"
              placeholder="Question text…"
              value={q.question}
              onChange={e => updateQ(i, "question", e.target.value)}
            />

            <div className="qb-options">
              {q.options.map((opt, j) => (
                <div key={j} className="qb-option-row">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.correctIndex === j}
                    onChange={() => updateQ(i, "correctIndex", j)}
                    title="Mark as correct answer"
                  />
                  <input
                    className="qb-input"
                    placeholder={`Option ${String.fromCharCode(65+j)}`}
                    value={opt}
                    onChange={e => updateOption(i, j, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="qb-hint">☝️ Select the radio button next to the correct answer</p>

            <input
              className="qb-input qb-exp"
              placeholder="Explanation (shown after attempt — optional)"
              value={q.explanation}
              onChange={e => updateQ(i, "explanation", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="qb-actions">
        <button className="qb-add-q-btn" onClick={addQuestion}>+ Add Question</button>
        <button className="qb-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "💾 Save Quiz"}
        </button>
      </div>
    </div>
  );
};

export default QuizBuilder;
