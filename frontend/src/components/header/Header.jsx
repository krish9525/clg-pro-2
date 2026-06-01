import React, { useState, useEffect } from "react";
import "./header.css";
import { Link, useNavigate } from "react-router-dom";
import { UserData } from "../../context/UserContext";

const Header = ({ isAuth }) => {
  const { user } = UserData();
  const isAdmin = user?.role === "admin" || user?.mainrole === "superadmin";
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={darkMode ? "dark" : ""}>
      <div className="logo" onClick={() => { navigate("/"); closeMenu(); }}>
        <span className="logo-icon">🎓</span>
        <span className="logo-text">EduLearn</span>
      </div>

      {/* Desktop Nav */}
      <nav className="link desktop-nav">
        <Link to="/" onClick={closeMenu}>Home</Link>
        <Link to="/courses" onClick={closeMenu}>Courses</Link>
        <Link to="/about" onClick={closeMenu}>About</Link>
        {isAuth && <Link to="/chat" onClick={closeMenu}>💬 Chat</Link>}
        {isAdmin && <Link to="/admin/dashboard" onClick={closeMenu}>⚙️ Admin</Link>}
        {isAuth && <Link to="/game" onClick={closeMenu}>🎮 Quiz Game</Link>}
        {isAuth ? (
          <Link to="/account" onClick={closeMenu} className="nav-account-btn">Account</Link>
        ) : (
          <Link to="/login" onClick={closeMenu} className="nav-login-btn">Login</Link>
        )}
      </nav>

      <div className="header-actions">
        {/* Dark Mode Toggle */}
        <button
          className="theme-toggle"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Toggle dark mode"
          title={darkMode ? "Light Mode" : "Dark Mode"}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        {/* Hamburger for mobile */}
        <button
          className={`hamburger ${menuOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      <div className={`mobile-overlay ${menuOpen ? "active" : ""}`} onClick={closeMenu} />

      {/* Mobile Nav */}
      <nav className={`mobile-nav ${menuOpen ? "open" : ""}`}>
        <div className="mobile-nav-header">
          <span className="logo-text">🎓 EduLearn</span>
          <button className="mobile-close" onClick={closeMenu}>✕</button>
        </div>
        <Link to="/" onClick={closeMenu}>🏠 Home</Link>
        <Link to="/courses" onClick={closeMenu}>📚 Courses</Link>
        <Link to="/about" onClick={closeMenu}>ℹ️ About</Link>
        {isAuth && <Link to="/chat" onClick={closeMenu}>💬 Chat</Link>}
        {isAdmin && <Link to="/admin/dashboard" onClick={closeMenu}>⚙️ Admin</Link>}
        {isAuth && <Link to="/game" onClick={closeMenu}>🎮 Quiz Game</Link>}
        {isAuth ? (
          <Link to="/account" onClick={closeMenu}>👤 Account</Link>
        ) : (
          <Link to="/login" onClick={closeMenu} className="mobile-login-btn">🔑 Login</Link>
        )}
        <div className="mobile-theme-row">
          <span>Dark Mode</span>
          <button className="theme-toggle-mobile" onClick={() => setDarkMode((p) => !p)}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
