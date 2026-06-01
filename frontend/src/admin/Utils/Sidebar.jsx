import React, { useState } from "react";
import "./common.css";
import { Link, useLocation } from "react-router-dom";
import { AiFillHome } from "react-icons/ai";
import { FaBook, FaUserAlt, FaChartBar, FaComments } from "react-icons/fa";
import { IoMdLogOut, IoMdMenu, IoMdClose } from "react-icons/io";
import { UserData } from "../../context/UserContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const navItems = [
  { to: "/admin/dashboard", icon: <FaChartBar />, label: "Dashboard" },
  { to: "/admin/course",    icon: <FaBook />,     label: "Courses" },
  { to: "/admin/users",     icon: <FaUserAlt />,  label: "Users" },
  { to: "/chat",            icon: <FaComments />, label: "Messages" },
];

const Sidebar = () => {
  const { user, setIsAuth, setUser } = UserData();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const logoutHandler = () => {
    localStorage.clear();
    setUser([]);
    setIsAuth(false);
    toast.success("Logged out!");
    navigate("/login");
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <span className="brand-icon">🎓</span>
            <span className="brand-name">EduLearn</span>
          </div>
        )}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed((p) => !p)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <IoMdMenu /> : <IoMdClose />}
        </button>
      </div>

      {/* Admin info */}
      {!collapsed && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">⚙️ Administrator</span>
          </div>
        </div>
      )}

      {/* Nav label */}
      {!collapsed && <div className="nav-section-label">NAVIGATION</div>}

      {/* Nav links */}
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            if (item.to === "/admin/users" && user?.role !== "admin" && user?.mainrole !== "superadmin") return null;
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`nav-link ${isActive ? "active" : ""}`}
                  title={collapsed ? item.label : ""}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                  {isActive && !collapsed && <span className="active-dot" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom links */}
      <div className="sidebar-bottom">
        {!collapsed && <div className="nav-section-label">ACCOUNT</div>}
        <Link to="/" className="nav-link" title={collapsed ? "Main Site" : ""}>
          <span className="nav-icon"><AiFillHome /></span>
          {!collapsed && <span className="nav-label">Main Site</span>}
        </Link>
        <button
          className="nav-link logout-link"
          onClick={logoutHandler}
          title={collapsed ? "Logout" : ""}
        >
          <span className="nav-icon"><IoMdLogOut /></span>
          {!collapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
