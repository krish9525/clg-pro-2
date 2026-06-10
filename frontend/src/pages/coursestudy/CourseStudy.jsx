import React, { useEffect, useState } from "react";
import "./coursestudy.css";
import { useNavigate, useParams } from "react-router-dom";
import { CourseData } from "../../context/CourseContext";
import { server } from "../../main";
import axios from "axios";
import Loading from "../../components/loading/Loading";
import CertificateButton from "../../components/certificate/CertificateButton";

const getCategory = (title = "") => {
  const t = title.toLowerCase();
  if (t.includes("react") || t.includes("vue") || t.includes("angular")) return { label: "Frontend", color: "#3b82f6" };
  if (t.includes("node") || t.includes("express") || t.includes("backend")) return { label: "Backend", color: "#10b981" };
  if (t.includes("python") || t.includes("ml") || t.includes("ai") || t.includes("data")) return { label: "AI/ML", color: "#f59e0b" };
  if (t.includes("flutter") || t.includes("mobile") || t.includes("android")) return { label: "Mobile", color: "#8b5cf6" };
  if (t.includes("design") || t.includes("ui") || t.includes("ux")) return { label: "Design", color: "#ec4899" };
  return { label: "Development", color: "#8a4baf" };
};

const CourseStudy = ({ user }) => {
  const params = useParams();
  const { fetchCourse, course } = CourseData();
  const navigate = useNavigate();
  const [lectureCount, setLectureCount] = useState(null);
  const [progress, setProgress]         = useState(null);
  const [loading, setLoading]           = useState(true);

  // ─── ALL hooks before any conditional return ─────────────────────────────
  useEffect(() => {
    if (user && user.role !== "admin" && !user.subscription?.includes(params.id)) {
      navigate("/");
    }
  }, [user, navigate, params.id]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await fetchCourse(params.id);
      try {
        const { data } = await axios.get(`${server}/api/lectures/${params.id}`, {
          headers: { token: localStorage.getItem("token") },
        });
        setLectureCount(data.lectures?.length || 0);
      } catch { setLectureCount(0); }
      try {
        const { data } = await axios.get(
          `${server}/api/user/progress?course=${params.id}`,
          { headers: { token: localStorage.getItem("token") } }
        );
        setProgress(data);
      } catch { setProgress(null); }
      setLoading(false);
    };
    load();
  }, [params.id, user]);

  // ─── Early returns (after all hooks) ─────────────────────────────────────
  if (!user) return null;
  if (loading) return <Loading />;
  if (!course) return null;

  const cat          = getCategory(course.title);
  const completedPct = progress ? Math.round(progress.courseProgressPercentage) : 0;
  const isAdmin      = user.role === "admin";

  // Safe image URL (no double slash)
  const imgSrc = course.image?.startsWith("http")
    ? course.image
    : `${server}${course.image}`;

  return (
    <div className="course-study-page">
      {/* ===== HERO BANNER ===== */}
      <div className="cs-hero">
        <div className="cs-hero-overlay" />
        <img src={imgSrc} alt={course.title} className="cs-hero-bg" />
        <div className="cs-hero-content">
          <span className="cs-category-badge" style={{ background: cat.color }}>
            {cat.label}
          </span>
          <h1>{course.title}</h1>
          <p className="cs-hero-desc">{course.description}</p>
          <div className="cs-meta-row">
            <span className="cs-meta-item">👨‍🏫 {course.createdBy}</span>
            <span className="cs-meta-item">⏱ {course.duration} weeks</span>
            {lectureCount !== null && (
              <span className="cs-meta-item">🎬 {lectureCount} lectures</span>
            )}
            <span className="cs-meta-item">💰 ₹{course.price}</span>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="cs-body">
        {/* LEFT COLUMN */}
        <div className="cs-left">
          {/* Progress card (non-admin) */}
          {!isAdmin && progress && (
            <div className="cs-card progress-card">
              <h3>📊 Your Progress</h3>
              <div className="cs-progress-track">
                <div
                  className="cs-progress-fill"
                  style={{ width: `${completedPct}%` }}
                />
              </div>
              <div className="cs-progress-stats">
                <span>✅ {progress.completedLectures} completed</span>
                <span className="cs-pct">{completedPct}%</span>
                <span>📚 {progress.allLectures} total</span>
              </div>
              {completedPct === 100 && (
                <div className="cs-completed-badge">
                  🏆 Course Completed! Well done!
                </div>
              )}
            </div>
          )}

          {/* Certificate (non-admin, only when enrolled) */}
          {!isAdmin && (
            <div className="cs-card">
              <h3>🎓 Certificate</h3>
              <p style={{ fontSize: "0.9rem", marginBottom: "12px", opacity: 0.8 }}>
                Complete all lectures to earn your certificate of completion.
              </p>
              <CertificateButton courseId={params.id} progress={completedPct} />
            </div>
          )}

          {/* About course */}
          <div className="cs-card">
            <h3>📋 About This Course</h3>
            <p className="cs-description">{course.description}</p>
            <div className="cs-stats-grid">
              <div className="cs-stat">
                <span className="cs-stat-icon">⏱</span>
                <span className="cs-stat-val">{course.duration} weeks</span>
                <span className="cs-stat-label">Duration</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-icon">🎬</span>
                <span className="cs-stat-val">{lectureCount ?? "—"}</span>
                <span className="cs-stat-label">Lectures</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-icon">📱</span>
                <span className="cs-stat-val">Lifetime</span>
                <span className="cs-stat-label">Access</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-icon">🏆</span>
                <span className="cs-stat-val">Certificate</span>
                <span className="cs-stat-label">On completion</span>
              </div>
            </div>
          </div>

          {/* What you'll learn */}
          <div className="cs-card">
            <h3>✅ What You'll Learn</h3>
            <div className="cs-learn-grid">
              {[
                "Fundamental concepts from scratch",
                "Real-world project experience",
                "Best practices & clean code",
                "Industry-standard tools",
                "Problem solving techniques",
                "Build your portfolio",
              ].map((item, i) => (
                <div key={i} className="cs-learn-item">
                  <span className="cs-check">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — CTA card */}
        <div className="cs-right">
          <div className="cs-cta-card">
            <div className="cs-cta-img-wrap">
              <img src={imgSrc} alt={course.title} className="cs-cta-img" />
            </div>

            <div className="cs-cta-body">
              <div className="cs-cta-price">₹{course.price}</div>

              {!isAdmin && progress && (
                <div className="cs-mini-progress">
                  <div className="cs-mini-bar">
                    <div style={{ width: `${completedPct}%` }} />
                  </div>
                  <span>{completedPct}% complete</span>
                </div>
              )}

              <button
                className="cs-start-btn"
                onClick={() => navigate(`/lectures/${course._id}`)}
              >
                {isAdmin ? "📂 Manage Lectures" :
                  completedPct > 0 ? "▶ Continue Learning" : "🚀 Start Learning"}
              </button>

              <div className="cs-cta-features">
                <div className="cs-feat">📱 Access on all devices</div>
                <div className="cs-feat">♾️ Lifetime access</div>
                <div className="cs-feat">🎬 {lectureCount ?? 0} video lectures</div>
                <div className="cs-feat">📜 Completion certificate</div>
                <div className="cs-feat">📝 Lecture quizzes</div>
                <div className="cs-feat">📄 Study materials</div>
              </div>

              <button
                className="cs-back-btn"
                onClick={() => navigate("/courses")}
              >
                ← Back to Courses
              </button>
            </div>
          </div>

          {/* Instructor card */}
          <div className="cs-card cs-instructor-card">
            <h3>👨‍🏫 Instructor</h3>
            <div className="cs-instructor">
              <div className="cs-inst-avatar">
                {course.createdBy?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="cs-inst-name">{course.createdBy}</div>
                <div className="cs-inst-role">Course Instructor</div>
                <div className="cs-inst-stars">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStudy;
