// src/pages/HomePage.tsx
// Página principal ("/"): pública, entrada a las tres propuestas (Árbitros, Semáforo, Herramientas).
// Etapa F.

import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { getThemeByMode } from "../contexts/GameModeContext";
import { SiteHeader } from "../components/SiteHeader";

interface EntryCardProps {
  icon: string;
  label: string;
  title: string;
  description: string;
  cta: string;
  accent: string;
  onClick: () => void;
}

function EntryCard({ icon, label, title, description, cta, accent, onClick }: EntryCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: "white",
        borderRadius: 20,
        padding: 28,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.14)"; }}
      onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
    >
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
        {label}
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#1e40af", lineHeight: 1.5, flex: 1 }}>{description}</p>
      <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>{cta}</span>
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  // Encabezado fijo (colores de primaria), igual que antes: esta página no sigue ningún modo de juego.
  const headerTheme = getThemeByMode("traffic-light", language);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${headerTheme.cardHoverBg} 0%, #f8fafc 50%, #f1f5f9 100%)`, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <SiteHeader theme={headerTheme} />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          <EntryCard
            icon="⚖️"
            label={t.dashboard.arbLabel}
            title={t.dashboard.arbitrosTitle}
            description={t.dashboard.arbDesc}
            cta={t.dashboard.enterCta}
            accent="#0369a1"
            onClick={() => navigate("/arbitros")}
          />
          <EntryCard
            icon="🚦"
            label={t.dashboard.semaforoLabel}
            title={headerTheme.name}
            description={t.dashboard.semaforoDesc}
            cta={t.dashboard.enterCta}
            accent={headerTheme.primary}
            onClick={() => navigate("/semaforo")}
          />
          <EntryCard
            icon="🛠️"
            label={t.dashboard.toolsLabel}
            title={t.dashboard.toolsName}
            description={t.dashboard.toolsDesc}
            cta={t.dashboard.enterCta}
            accent="#b45309"
            onClick={() => navigate("/herramientas")}
          />
        </div>
      </main>

      <footer style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
        <button onClick={() => navigate("/about")} style={{ background: "none", border: "none", color: "#1e40af", cursor: "pointer", fontSize: 14, textDecoration: "underline" }}>
          {t.dashboard.aboutThisProject}
        </button>
      </footer>
    </div>
  );
}
