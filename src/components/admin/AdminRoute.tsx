// src/components/admin/AdminRoute.tsx
// Protege rutas que solo pueden ver admins

import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, authRequired, isAdmin, adminLoading } = useAuth();
  const { t } = useI18n();

  // 1. Si auth está desactivado, no hay acceso admin
  if (!authRequired) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>⚠️ {t.admin.accessDenied}</h2>
        <p>{t.admin.authDisabled}</p>
        <p>{t.admin.enableAuth}</p>
      </div>
    );
  }

  // 2. Cargando auth
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <p>{t.admin.verifyingSession}</p>
      </div>
    );
  }

  // 3. No logueado → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 4. Cargando flag de admin
  if (adminLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>🔐</div>
        <p>{t.admin.verifyingPermissions}</p>
      </div>
    );
  }

  // 5. No es admin → setup
  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>🚫 {t.admin.restrictedAccess}</h2>
        <p>{t.admin.adminsOnly}</p>
        <p style={{ fontSize: 12, color: "#999", marginTop: 16 }}>
          UID: {user.uid}
        </p>
        <button
          onClick={() => window.location.href = "/"}
          style={{
            marginTop: 20,
            padding: "12px 24px",
            fontSize: 16,
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          ← {t.admin.backToSetup}
        </button>
      </div>
    );
  }

  // 6. Es admin → mostrar contenido
  return <>{children}</>;
}