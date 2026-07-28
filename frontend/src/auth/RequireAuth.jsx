import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="container" style={{ padding: "32px 20px" }}>Loading your session...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
