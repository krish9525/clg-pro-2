import { Navigate, useLocation } from "react-router-dom";
import { UserData } from "../context/UserContext";
import Loading from "./loading/Loading";

/**
 * ProtectedRoute — replaces the inline `isAuth ? <X> : <Login />` pattern.
 *
 * Usage:
 *   <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
 *   <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuth, user, loading } = UserData();
  const location = useLocation();

  if (loading) return <Loading />;

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly) {
    const isAdmin = user?.role === "admin" || user?.mainrole === "superadmin";
    if (!isAdmin) return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
