import { Link } from "react-router-dom";
import "./notfound.css";

const NotFound = () => (
  <div className="notfound-page">
    <div className="notfound-content">
      <div className="notfound-code">404</div>
      <div className="notfound-icon">🔍</div>
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div className="notfound-actions">
        <Link to="/" className="common-btn">🏠 Go Home</Link>
        <Link to="/courses" className="common-btn notfound-secondary-btn">📚 Browse Courses</Link>
      </div>
    </div>
  </div>
);

export default NotFound;
