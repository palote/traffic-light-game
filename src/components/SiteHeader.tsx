// src/components/SiteHeader.tsx
// Encabezado compartido por "/", "/semaforo" y "/herramientas" (Etapa F).
// Con sesión: email, Admin (si corresponde) y "Cerrar sesión". Sin sesión: "Iniciar sesión".
// Si se pasa `backTo`, agrega un link "← Inicio" a la izquierda del ícono.

import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n, LanguageSelector } from "../i18n";
import type { GameModeTheme } from "../contexts/GameModeContext";

export function SiteHeader({ theme, backTo }: { theme: GameModeTheme; backTo?: string }) {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { t } = useI18n();

  const handleLogout = async () => {
    try { await logout(); navigate("/login"); } catch (e) { console.error(e); }
  };

  return (
    <header style={{ background: theme.primaryGradient, padding: "20px 32px", color: "white", boxShadow: `0 4px 20px ${theme.primary}40` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {backTo && (
            <button onClick={() => navigate(backTo)}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: 0.85, padding: "4px 2px" }}>
              {t.dashboard.backHome}
            </button>
          )}
          <span style={{ fontSize: 28 }}>{theme.icon}</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{theme.name}</h1>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{t.dashboard.tagline}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LanguageSelector compact />
          {user ? (
            <>
              <span style={{ fontSize: 13, opacity: 0.85 }}>{user.email}</span>
              {isAdmin && (
                <button onClick={() => navigate("/admin/metrics")}
                  style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "2px solid rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.1)", color: "white", cursor: "pointer" }}>
                  ⚙️ {t.common.admin}
                </button>
              )}
              <button onClick={handleLogout}
                style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.2)", color: "white", cursor: "pointer" }}>
                {t.auth.logout}
              </button>
            </>
          ) : (
            <button onClick={() => navigate("/login")}
              style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.2)", color: "white", cursor: "pointer" }}>
              {t.auth.login}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
