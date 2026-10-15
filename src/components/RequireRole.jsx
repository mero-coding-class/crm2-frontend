import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "./common/Loader.jsx";

// Route guard: redirects to /login if unauthenticated,
// redirects to /dashboard if the user's role is not allowed.
const RequireRole = ({ roles, children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
};

export default RequireRole;
