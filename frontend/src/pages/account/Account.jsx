import React from "react";
import { IoMdLogOut } from "react-icons/io";
import "./account.css";
import { UserData } from "../../context/UserContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Account = ({ user }) => {
  const { setIsAuth, setUser } = UserData();
  const navigate = useNavigate();

  const logoutHandler = () => {
    localStorage.clear();
    setUser([]);
    setIsAuth(false);
    toast.success("Logged Out Successfully! 👋");
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  // Admin nav links
  const adminLinks = [
    { icon: "📊", label: "Admin Dashboard",  to: "/admin/dashboard",  color: "#8a4baf" },
    { icon: "📚", label: "Manage Courses",   to: "/admin/course",     color: "#667eea" },
    { icon: "👥", label: "Manage Users",     to: "/admin/users",      color: "#10b981" },
    { icon: "💬", label: "Student Messages", to: "/chat",             color: "#f59e0b" },
    { icon: "🌐", label: "View Site",        to: "/",                 color: "#06b6d4" },
  ];

  // Student nav links
  const studentLinks = [
    { icon: "📚", label: "My Dashboard",    to: `/${user?._id}/dashboard`, color: "#8a4baf" },
    { icon: "🔍", label: "Browse Courses",  to: "/courses",                color: "#667eea" },
    { icon: "🎮", label: "Quiz Game",       to: "/game",                   color: "#10b981" },
    { icon: "💬", label: "Chat Support",    to: "/chat",                   color: "#f59e0b" },
  ];

  const navLinks = isAdmin ? adminLinks : studentLinks;

  return (
    <div className="account-page">
      {user && (
        <div className="profile">
          {/* Avatar */}
          <div className="profile-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>

          <h2>{user.name}</h2>
          <span className="profile-role">{user.role || "student"}</span>

          {/* Info rows */}
          <div className="profile-info">
            <div className="profile-info-row">
              <span className="profile-info-label">📧 Email</span>
              <span className="profile-info-value">{user.email}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">👤 Role</span>
              <span className="profile-info-value" style={{ textTransform: "capitalize" }}>{user.role || "student"}</span>
            </div>
            {!isAdmin && (
              <div className="profile-info-row">
                <span className="profile-info-label">📚 Enrolled</span>
                <span className="profile-info-value">
                  {user.subscription?.length || 0} course{user.subscription?.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* Navigation links */}
          <div className="profile-nav-section">
            <div className="profile-nav-label">
              {isAdmin ? "⚙️ Admin Panel" : "🧭 Quick Navigation"}
            </div>
            <div className="profile-nav-grid">
              {navLinks.map((link) => (
                <button
                  key={link.to}
                  className="profile-nav-btn"
                  style={{ "--nav-color": link.color }}
                  onClick={() => navigate(link.to)}
                >
                  <span className="pnb-icon">{link.icon}</span>
                  <span className="pnb-label">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button onClick={logoutHandler} className="profile-logout-btn">
            <IoMdLogOut style={{ fontSize: 18 }} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Account;
