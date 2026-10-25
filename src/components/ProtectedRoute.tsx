// src/components/ProtectedRoute.tsx
// Protege rutas que requieren autenticación

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { rutaSiguienteValida } from "../utils/nextRoute";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, authRequired } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

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

  // Si no hay usuario, redirigir a login y volver después a la ruta que se quería ver
  if (!user) {
    const next = rutaSiguienteValida(location.pathname + location.search + location.hash);
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  // Usuario autenticado, mostrar contenido
  return <>{children}</>;
}