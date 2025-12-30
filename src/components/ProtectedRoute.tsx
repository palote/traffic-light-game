// src/components/ProtectedRoute.tsx
// Protege rutas que requieren autenticación

import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, authRequired } = useAuth();
  const { t } = useI18n();

  // Si auth no es requerido, mostrar directamente
  if (!authRequired) {
    return <>{children}</>;
  }

  // Mientras carga, mostrar spinner
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ fontSize: 16 }}>{t.protectedRoute.verifyingSession}</p>
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Usuario autenticado, mostrar contenido
  return <>{children}</>;
}