import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Utils/Layout";
import axios from "axios";
import { server } from "../../main";
import "./dashboard.css";

// Animated number counter
const AnimatedCount = ({ value }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const end = parseInt(value);
    const duration = 1200;
    const stepTime = Math.max(20, Math.floor(duration / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count}</span>;
};

// Mini bar chart (pure CSS)
const MiniBarChart = ({ data, color }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="mini-chart">
      {data.map((v, i) => (
        <div key={i} className="chart-bar-wrap">
          <div
            className="chart-bar"
            style={{
              height: `${(v / max) * 100}%`,
              background: color,
              opacity: 0.4 + (i / data.length) * 0.6,
            }}
          />
        </div>
      ))}
    </div>
  );
};

const statConfig = [
  {
    key: "totalCoures",
    label: "Total Courses",
    icon: "📚",
    color: "#8a4baf",
    gradient: "linear-gradient(135deg,#8a4baf,#6b3a9e)",
    bg: "rgba(138,75,175,0.08)",
    trend: [3, 5, 4, 6, 8, 7, 9],
    desc: "Published courses",
  },
  {
    key: "totalLectures",
    label: "Total Lectures",
    icon: "🎬",
    color: "#667eea",
    gradient: "linear-gradient(135deg,#667eea,#4f5bd5)",
    bg: "rgba(102,126,234,0.08)",
    trend: [10, 14, 12, 18, 20, 22, 25],
    desc: "Video lectures",
  },
  {
    key: "totalUsers",
    label: "Total Users",
    icon: "👥",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
    bg: "rgba(16,185,129,0.08)",
    trend: [20, 35, 28, 45, 52, 48, 60],
    desc: "Registered students",
  },
];

const quickActions = [
  { label: "Add Course",   icon: "➕", to: "/admin/course", color: "#8a4baf" },
  { label: "Manage Users", icon: "👤", to: "/admin/users",  color: "#667eea" },
  { label: "Student Chat", icon: "💬", to: "/chat",         color: "#f59e0b" },
  { label: "View Site",    icon: "🌐", to: "/",             color: "#10b981" },
];

const tips = [
  "💡 Upload YouTube Unlisted videos for lecture content — free & fast!",
  "🔒 Keep lecture videos Unlisted on YouTube so only your platform serves them.",
  "📊 Check Users tab regularly to promote new instructors.",
  "🎯 Use clear course titles to help students find them easily.",
  "⭐ Courses with good thumbnails get more enrollments.",
];

const AdminDashbord = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tipIndex] = useState(() => Math.floor(Math.random() * tips.length));

  useEffect(() => {
    if (user && user.role !== "admin" && user.mainrole !== "superadmin") {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    axios
      .get(`${server}/api/stats`, {
        headers: { token: localStorage.getItem("token") },
      })
      .then(({ data }) => {
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="admin-dashboard">
        {/* ===== TOP BAR ===== */}
        <div className="dash-topbar">
          <div>
            <h1 className="dash-title">Admin Dashboard</h1>
            <p className="dash-subtitle">
              Welcome back, <strong>{user.name}</strong>! Here's your platform overview.
            </p>
          </div>
          <div className="dash-date">
            📅 {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* ===== STAT CARDS ===== */}
        <div className="stat-cards">
          {statConfig.map((s) => (
            <div className="stat-card" key={s.key} style={{ "--card-color": s.color }}>
              <div className="stat-card-top">
                <div className="stat-icon-wrap" style={{ background: s.bg }}>
                  <span className="stat-icon">{s.icon}</span>
                </div>
                <MiniBarChart data={s.trend} color={s.color} />
              </div>
              <div className="stat-value" style={{ color: s.color }}>
                {loading ? "—" : <AnimatedCount value={stats[s.key] || 0} />}
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-desc">{s.desc}</div>
              <div className="stat-card-bar" style={{ background: s.gradient }} />
            </div>
          ))}
        </div>

        {/* ===== GRID: Quick Actions + Tip ===== */}
        <div className="dash-mid-grid">
          {/* Quick Actions */}
          <div className="dash-card">
            <h2 className="card-heading">⚡ Quick Actions</h2>
            <div className="quick-actions">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  className="quick-action-btn"
                  style={{ "--qa-color": a.color }}
                  onClick={() => navigate(a.to)}
                >
                  <span className="qa-icon">{a.icon}</span>
                  <span className="qa-label">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Stats summary */}
          <div className="dash-card">
            <h2 className="card-heading">📊 Platform Health</h2>
            <div className="health-rows">
              <div className="health-row">
                <span>📚 Courses</span>
                <div className="health-bar-wrap">
                  <div className="health-bar" style={{ width: `${Math.min((stats.totalCoures || 0) * 4, 100)}%`, background: "#8a4baf" }} />
                </div>
                <strong>{stats.totalCoures || 0}</strong>
              </div>
              <div className="health-row">
                <span>🎬 Lectures</span>
                <div className="health-bar-wrap">
                  <div className="health-bar" style={{ width: `${Math.min((stats.totalLectures || 0) * 2, 100)}%`, background: "#667eea" }} />
                </div>
                <strong>{stats.totalLectures || 0}</strong>
              </div>
              <div className="health-row">
                <span>👥 Users</span>
                <div className="health-bar-wrap">
                  <div className="health-bar" style={{ width: `${Math.min((stats.totalUsers || 0) * 1.5, 100)}%`, background: "#10b981" }} />
                </div>
                <strong>{stats.totalUsers || 0}</strong>
              </div>
              <div className="health-row">
                <span>📈 Avg Lectures/Course</span>
                <div className="health-bar-wrap">
                  <div className="health-bar" style={{ width: `${Math.min(((stats.totalLectures || 0) / Math.max(stats.totalCoures || 1, 1)) * 10, 100)}%`, background: "#f59e0b" }} />
                </div>
                <strong>
                  {stats.totalCoures
                    ? (stats.totalLectures / stats.totalCoures).toFixed(1)
                    : "0"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ===== TIP OF THE DAY ===== */}
        <div className="tip-banner">
          <span className="tip-icon">🌟</span>
          <div>
            <div className="tip-title">Pro Tip</div>
            <div className="tip-text">{tips[tipIndex]}</div>
          </div>
        </div>

        {/* ===== GETTING STARTED CHECKLIST ===== */}
        <div className="dash-card checklist-card">
          <h2 className="card-heading">✅ Getting Started Checklist</h2>
          <div className="checklist">
            {[
              { done: (stats.totalCoures || 0) > 0,     label: "Create your first course" },
              { done: (stats.totalLectures || 0) > 0,   label: "Add lectures (YouTube links)" },
              { done: (stats.totalUsers || 0) > 1,      label: "Get your first student" },
              { done: (stats.totalCoures || 0) >= 3,    label: "Have 3+ courses published" },
              { done: (stats.totalUsers || 0) >= 10,    label: "Reach 10 registered users" },
            ].map((item, i) => (
              <div key={i} className={`check-item ${item.done ? "done" : ""}`}>
                <span className="check-icon">{item.done ? "✅" : "⬜"}</span>
                <span className="check-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashbord;
