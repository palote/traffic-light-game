import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./ProtectedRoute.css";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, authRequired } = useAuth();
  const location = useLocation();

  // ✅ En dev sin auth: nunca bloquea
  if (!authRequired) return <>{children}</>;

  if (loading) {
    return (
      <div className="protected-loading">
        <div className="spinner" />
        <div>Cargando sesión...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
