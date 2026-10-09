import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PALETA } from "../utils/arbitroPalette";
import { useArbitroT, useTituloPagina, LanguageSelector, IDIOMAS_ARBITRO } from "../i18n";
import { nombreVisible } from "../utils/arbitroNombres";

// Los nombres de área son claves estables; el texto visible sale del diccionario (ta.areaNames, ta.infWhat_*).
// i18n-clave
const AREAS = [
  {
    emoji: "🔬", nombre: "Ciencias Exactas y Naturales", key: "exactas", primary: "#0ea5e9", text: "#0369a1", bg: "#f0f9ff",
  },
  {
    emoji: "🌍", nombre: "Ciencias Sociales y Humanidades", key: "sociales", primary: PALETA.naranja, text: PALETA.naranjaOscuro, bg: "#fff7ed",
  },
  {
    emoji: "💬", nombre: "Comunicación y Lenguajes", key: "lenguajes", primary: "#8b5cf6", text: "#6d28d9", bg: "#faf5ff",
  },
  {
    emoji: "🎨", nombre: "Arte y Expresión", key: "arte", primary: "#f43f5e", text: "#be123c", bg: "#fff1f2",
  },
];

export default function ArbitrosInfoPage() {
  const ta = useArbitroT();
  useTituloPagina(`${ta.infTitle} — ${ta.pageTitleSuffix}`);
  const PASOS = [
    { n: "1", txt: ta.infStep1 },
    { n: "2", txt: ta.infStep2 },
    { n: "3", txt: ta.infStep3 },
    { n: "4", txt: ta.infStep4 },
    { n: "5", txt: ta.rulesStep5Info },
    { n: "6", txt: ta.infStep6 },
  ];
  const navigate = useNavigate();
  const [showPasos, setShowPasos] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showSemaforo, setShowSemaforo] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0369a1 0%, #0f766e 100%)", padding: "48px 24px 56px", textAlign: "center", color: "white", position: "relative" }}>
        <div style={{ position: "absolute", top: 14, right: 16, zIndex: 10 }}>
          <LanguageSelector compact tone="onColor" idiomas={IDIOMAS_ARBITRO} />
        </div>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⚖️</div>
        <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900 }}>{ta.infTitle}</h1>
        <p style={{ margin: "0 auto", fontSize: 16, opacity: 0.92, maxWidth: 560, lineHeight: 1.6 }}>
          {ta.infIntro}
        </p>
        <button onClick={() => navigate("/arbitro-config")} style={{ marginTop: 28, padding: "14px 36px", fontSize: 16, fontWeight: 800, borderRadius: 14, border: "none", backgroundColor: "white", color: "#0369a1", cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}>
          {ta.landConfigure}
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        {/* T1: Ver pasos de la dinámica — expandable */}
        <div style={{ backgroundColor: "white", borderRadius: 16, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <button
            onClick={() => setShowPasos(p => !p)}
            style={{ width: "100%", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{ta.infSteps}</span>
            <span style={{ fontSize: 18, color: "#64748b", transition: "transform 0.2s", transform: showPasos ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </button>
          {showPasos && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                {PASOS.map(s => (
                  <div key={s.n} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "#e0f2fe", color: "#0369a1", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
                    <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.55, paddingTop: 3 }}>{s.txt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* T5: Áreas con expandable "¿Qué hace este árbitro?" */}
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>{ta.infPerArea}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {AREAS.map(area => (
            <div key={area.key} style={{ backgroundColor: area.bg, border: `1.5px solid ${expandedCard === area.key ? area.primary : area.primary + "30"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Card row — click navigates */}
              <div
                onClick={() => navigate(`/arbitro-config?area=${area.key}`)}
                style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
                onMouseOver={e => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${area.primary}, ${area.primary}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{area.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{nombreVisible(ta.areaNames, area.nombre)}</div>
                  <div style={{ fontSize: 12, color: PALETA.grisOscuro, marginTop: 2 }}>{(ta as any)[`infMaterias_${area.key}`]}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: area.text }}>{ta.infConfigure}</div>
              </div>
              {/* Expandable toggle */}
              <button
                onClick={() => setExpandedCard(expandedCard === area.key ? null : area.key)}
                style={{ width: "100%", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: `${area.primary}10`, border: "none", borderTop: `1px solid ${area.primary}20`, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: area.text }}>{ta.infWhat}</span>
                <span style={{ fontSize: 14, color: area.text, transition: "transform 0.2s", transform: expandedCard === area.key ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              </button>
              {expandedCard === area.key && (
                <div style={{ padding: "14px 20px 18px", borderTop: `1px solid ${area.primary}15` }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{(ta as any)[`infWhat_${area.key}`]}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* T6: ¿Qué es el Juego del Semáforo? — expandable */}
        <div style={{ backgroundColor: "white", borderRadius: 16, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <button
            onClick={() => setShowSemaforo(s => !s)}
            style={{ width: "100%", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{ta.infSemaforo}</span>
            <span style={{ fontSize: 18, color: "#64748b", transition: "transform 0.2s", transform: showSemaforo ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </button>
          {showSemaforo && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 12px" }}>
                  {ta.infSem1a} <strong>{ta.infSemName}</strong>{ta.infSem1b}
                </p>
                <p style={{ margin: "0 0 12px" }}>
                  {ta.infSem2}
                </p>
                <p style={{ margin: 0 }}>
                  <button
                    onClick={() => navigate("/about")}
                    style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, textDecoration: "underline" }}
                  >
                    {ta.infMore}
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: PALETA.gris, marginBottom: 8 }}>{ta.infFreeNoReg}</div>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>{ta.infBack}</button>
        </div>
      </div>
    </div>
  );
}
