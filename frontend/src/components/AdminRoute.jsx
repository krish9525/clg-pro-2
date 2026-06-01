import { Navigate } from "react-router-dom";
import { UserData } from "../context/UserContext";
import Loading from "./loading/Loading";

const AdminRoute = ({ children }) => {
  const { user, isAuth, loading } = UserData();

  if (loading) return <Loading />;

  if (!isAuth) return <Navigate to="/login" replace />;

  if (user?.role !== "admin" && user?.mainrole !== "superadmin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
