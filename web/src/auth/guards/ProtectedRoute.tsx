import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../app/providers/AuthProvider";

export default function ProtectedRoute() {
  const { isAuthed } = useContext(AuthContext);
  if (!isAuthed) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
