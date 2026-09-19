import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useParams } from "react-router-dom";
import { app } from "../firebase.config";

interface SesionData {
  area?: string;
  materia: string;
  nivel: string;
  anio: string;
  tema: string;
  subtema?: string;
  ejercicio?: string;
  expiresAt: string;
}

interface Veredicto {
  resultado: "A" | "B" | "ambas_correctas" | "ambas_incorrectas";
  veredicto: string;
  explicacion: string;
  paraSeguirPensando: string;
}

interface Interaccion {
  conflicto: string;
  posicionA: string;
  posicionB: string;
  veredicto: Veredicto;
}

// ─── Area colors ───────────────────────────────────────────────────────────────

const AREA_COLORS: Record<string, { gradient: string; light: string; border: string; primary: string }> = {
  "Exact and Natural Sciences":      { gradient: "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)", light: "#f0f9ff", border: "#bae6fd", primary: "#0ea5e9" },
  "Social Sciences and Humanities":  { gradient: "linear-gradient(135deg, #f97316 0%, #b45309 100%)", light: "#fff7ed", border: "#fed7aa", primary: "#f97316" },
  "Communication and Languages":     { gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", light: "#faf5ff", border: "#e9d5ff", primary: "#8b5cf6" },
  "Art and Expression":              { gradient: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)", light: "#fff1f2", border: "#fecdd3", primary: "#f43f5e" },
  // Spanish area names from backend
  "Ciencias Exactas y Naturales":    { gradient: "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)", light: "#f0f9ff", border: "#bae6fd", primary: "#0ea5e9" },
  "Ciencias Sociales y Humanidades": { gradient: "linear-gradient(135deg, #f97316 0%, #b45309 100%)", light: "#fff7ed", border: "#fed7aa", primary: "#f97316" },
  "Comunicación y Lenguajes":        { gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", light: "#faf5ff", border: "#e9d5ff", primary: "#8b5cf6" },
  "Arte y Expresión":                { gradient: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)", light: "#fff1f2", border: "#fecdd3", primary: "#f43f5e" },
};

const DEFAULT_COLORS = { gradient: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", light: "#f0f7ff", border: "#bfdbfe", primary: "#3730a3" };

const veredictoLabel: Record<string, string> = {
  A:                 "✅ Position A is correct",
  B:                 "✅ Position B is correct",
  ambas_correctas:   "⚖️ Both positions are partially correct",
  ambas_incorrectas: "🔄 Neither position is entirely correct",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LearningRefereeSesionPage() {
  const { area: sessionId } = useParams<{ area: string }>();

  const [sesion,        setSesion]        = useState<SesionData | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [sesionError,   setSesionError]   = useState<string | null>(null);
  const [instrVisible,  setInstrVisible]  = useState(false); // collapsed by default

  // Identification
  const [identificado,        setIdentificado]        = useState(false);
  const [nombreAlumno,        setNombreAlumno]        = useState("");
  const [nombreEquipo,        setNombreEquipo]        = useState("");
  const [errorIdentificacion, setErrorIdentificacion] = useState("");

  // Referee
  const [conflicto, setConflicto] = useState("");
  const [posicionA, setPosicionA] = useState("");
  const [posicionB, setPosicionB] = useState("");
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [loadingV,  setLoadingV]  = useState(false);
  const [errorV,    setErrorV]    = useState<string | null>(null);

  // Interaction history
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);

  // Summary
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [copiado,        setCopiado]        = useState(false);

  // ── Load session ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const fn = httpsCallable(getFunctions(app), "getSesionArbitro");
    fn({ sessionId })
      .then((res: any) => { setSesion(res.data); setLoadingSesion(false); })
      .catch((err)     => { setSesionError(err.message); setLoadingSesion(false); });
  }, [sessionId]);

  // ── Verdict ──────────────────────────────────────────────────────────────────
  const handleVeredicto = async () => {
    if (!conflicto.trim() || !posicionA.trim() || !posicionB.trim()) {
      setErrorV("Please fill in all three fields: the dispute and both positions.");
      return;
    }
    if (posicionA.trim() === posicionB.trim()) {
      setErrorV("The two positions must be different. If the group agrees, you don't need a referee!");
      return;
    }
    setErrorV(null); setLoadingV(true); setVeredicto(null);
    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "requestVeredicto");
      const res = await fn({ sessionId, conflicto, posicionA, posicionB }) as { data: Veredicto };
      setVeredicto(res.data);
      setInteracciones(prev => [...prev, { conflicto, posicionA, posicionB, veredicto: res.data }]);
    } catch (err: any) {
      setErrorV(`Error consulting the referee: ${err.message}`);
    } finally {
      setLoadingV(false);
    }
  };

  const handleNuevaConsulta = () => {
    setConflicto(""); setPosicionA(""); setPosicionB("");
    setVeredicto(null); setErrorV(null);
  };

  const handleIdentificarse = () => {
    if (!nombreAlumno.trim()) {
      setErrorIdentificacion("Please enter your name or your group's name.");
      return;
    }
    setIdentificado(true);
  };

  // ── Copyable summary ─────────────────────────────────────────────────────────
  const buildResumenTexto = () => {
    if (!sesion) return "";
    const header = `REFEREE INTERACTIONS\n${nombreEquipo ? `Team: ${nombreEquipo} — ` : ""}${nombreAlumno}\nSubject: ${sesion.materia} · Topic: ${sesion.tema}\n${"─".repeat(50)}\n`;
    const cuerpo = interacciones.map((ix, i) => [
      `Dispute ${i + 1}:`,
      `Disagreement: ${ix.conflicto}`,
      `Position A: ${ix.posicionA}`,
      `Position B: ${ix.posicionB}`,
      `Referee verdict: ${veredictoLabel[ix.veredicto.resultado]}`,
      `Explanation: ${ix.veredicto.explicacion}`,
    ].join("\n")).join("\n\n");
    const footer = `\n${"─".repeat(50)}\nUse these interactions to answer the report questions in Classroom.`;
    return header + cuerpo + footer;
  };

  const handleCopiarResumen = async () => {
    await navigator.clipboard.writeText(buildResumenTexto());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (loadingSesion) {
    return (
      <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "white", fontSize: 18, fontWeight: 600 }}>⏳ Loading session…</div>
      </div>
    );
  }

  if (sesionError || !sesion) {
    return (
      <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Session not available</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            {sesionError?.includes("expirada")
              ? "This session has expired. Ask your teacher to generate a new one."
              : "This session does not exist. Check the link with your teacher."}
          </div>
        </div>
      </div>
    );
  }

  const colors = (sesion.area && AREA_COLORS[sesion.area]) ? AREA_COLORS[sesion.area] : DEFAULT_COLORS;

  // ── Identification screen ────────────────────────────────────────────────────
  if (!identificado) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflow: "hidden" }}>

          <div style={{ background: colors.gradient, padding: "24px 28px", color: "white" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Learning Referee</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>
              {sesion.materia} · {sesion.tema}
            </p>
          </div>

          <div style={{ padding: "28px" }}>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
              Before you start, enter your name so your teacher can see who participated.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Your name or group names <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={nombreAlumno}
                onChange={e => { setNombreAlumno(e.target.value); setErrorIdentificacion(""); }}
                placeholder="E.g.: John Smith, or John and Mary"
                onKeyDown={e => e.key === "Enter" && handleIdentificarse()}
                style={inputStyle}
              />
              {errorIdentificacion && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626" }}>{errorIdentificacion}</p>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                Team name <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={nombreEquipo}
                onChange={e => setNombreEquipo(e.target.value)}
                placeholder="E.g.: Team 1, The Scientists..."
                onKeyDown={e => e.key === "Enter" && handleIdentificarse()}
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleIdentificarse}
              style={{ width: "100%", padding: "13px", fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", background: colors.gradient, color: "white", cursor: "pointer" }}
            >
              ⚖️ Enter the Referee →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const veredictoColor = {
    A:                 { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    B:                 { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
    ambas_correctas:   { bg: "#fefce8", border: "#fde68a", text: "#92400e" },
    ambas_incorrectas: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  };

  return (
    <div style={{ ...pageStyle, background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)" }}>
      <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header ── */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          <div style={{ background: colors.gradient, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>⚖️</span>
              <div style={{ color: "white" }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Learning Referee — {sesion.materia}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {sesion.nivel} {sesion.anio} · {sesion.tema}
                  {sesion.subtema ? ` — ${sesion.subtema}` : ""}
                </div>
              </div>
            </div>
            <button
              onClick={() => setInstrVisible(!instrVisible)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {instrVisible ? "▲ Hide instructions" : "📋 How does this work? →"}
            </button>
          </div>
        </div>

        {/* ── Instructions (collapsed by default) ── */}
        {instrVisible && (
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: "18px 22px", border: `2px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: colors.primary, marginBottom: 12 }}>
              📋 How this session works
            </div>
            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.75 }}>
              <p style={{ margin: "0 0 10px" }}>
                Use the material your teacher gave you to work with your classmates.
                Discuss, ask questions, and reach agreements among yourselves —{" "}
                <strong>that exchange is where most learning happens</strong>.
              </p>
              <div style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 10, border: "1px solid #e2e8f0" }}>
                <strong style={{ color: "#1e293b" }}>How to play:</strong>
                <ol style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9, color: "#374151" }}>
                  <li>Form groups of <strong>3 to 6 people</strong>. You can make 2 or 3 teams, or compete individually.</li>
                  <li>Ask each other questions about the topic.</li>
                  <li>When someone answers correctly, that team or person scores 1 point.</li>
                  <li>Keep track of disputes and how you resolved them.</li>
                  <li>If the whole group has a genuine disagreement they cannot resolve, only then use the referee.</li>
                  <li>At the end of class, the team or person with the most points <strong>wins!</strong></li>
                </ol>
              </div>
              <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a" }}>
                <strong style={{ color: "#92400e" }}>⚠️ Before consulting the referee:</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9, color: "#78350f" }}>
                  <li>You must have already tried to resolve the disagreement among yourselves.</li>
                  <li>Each position is written by the student who defends it, in their own words.</li>
                  <li>The referee does not solve complete exercises — it only arbitrates genuine disputes.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Teacher's material ── */}
        {sesion.ejercicio && (
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: "18px 22px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>
              📄 Working material
            </div>
            <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {sesion.ejercicio}
            </div>
          </div>
        )}

        {/* ── Referee panel ── */}
        {!veredicto ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "2px solid #e2e8f0" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
              ⚖️ Submit a dispute
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
              Only when the whole group has a genuine disagreement about <strong style={{ color: "#475569" }}>{sesion.tema}</strong>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>What is the dispute or question being contested?</label>
              <textarea value={conflicto} onChange={e => setConflicto(e.target.value)} rows={2}
                placeholder='E.g.: "What is the correct answer and why?"'
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ ...labelStyle, color: "#1e40af" }}>
                  Position A — <span style={{ fontWeight: 400, color: "#64748b" }}>you write it</span>
                </label>
                <textarea value={posicionA} onChange={e => setPosicionA(e.target.value)} rows={3}
                  placeholder="Write your answer or explanation..."
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit", borderColor: posicionA ? "#93c5fd" : "#e2e8f0" }} />
              </div>
              <div>
                <label style={{ ...labelStyle, color: "#16a34a" }}>
                  Position B — <span style={{ fontWeight: 400, color: "#64748b" }}>your classmate writes it</span>
                </label>
                <textarea value={posicionB} onChange={e => setPosicionB(e.target.value)} rows={3}
                  placeholder="Write your answer or explanation..."
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit", borderColor: posicionB ? "#86efac" : "#e2e8f0" }} />
              </div>
            </div>

            {errorV && (
              <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626", border: "1px solid #fecaca", marginBottom: 12 }}>
                {errorV}
              </div>
            )}
            {loadingV && (
              <div style={{ padding: "14px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>The referee is analyzing the positions…</div>
              </div>
            )}

            <button
              onClick={handleVeredicto}
              disabled={loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim()}
              style={{
                width: "100%", padding: "13px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none",
                background: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim() ? "#94a3b8" : colors.gradient,
                color: "white",
                cursor: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim() ? "not-allowed" : "pointer",
                opacity: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim() ? 0.7 : 1,
              }}>
              {loadingV ? "⏳ Consulting…" : "⚖️ Request referee verdict"}
            </button>
          </div>
        ) : (
          /* ── Verdict ── */
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: `2px solid ${veredictoColor[veredicto.resultado].border}` }}>

            <div style={{ backgroundColor: veredictoColor[veredicto.resultado].bg, borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: `1px solid ${veredictoColor[veredicto.resultado].border}` }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: veredictoColor[veredicto.resultado].text }}>
                {veredictoLabel[veredicto.resultado]}
              </div>
              {veredicto.veredicto && (
                <div style={{ fontSize: 13, color: veredictoColor[veredicto.resultado].text, marginTop: 4, opacity: 0.85 }}>
                  {veredicto.veredicto}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Why</div>
              <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, backgroundColor: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                {veredicto.explicacion}
              </div>
            </div>

            <div style={{ backgroundColor: "#fefce8", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>💭 Keep thinking about this</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.65 }}>{veredicto.paraSeguirPensando}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ backgroundColor: "#eff6ff", borderRadius: 10, padding: "10px 14px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>POSITION A</div>
                <div style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.5 }}>{posicionA}</div>
              </div>
              <div style={{ backgroundColor: "#f0fdf4", borderRadius: 10, padding: "10px 14px", border: "1px solid #86efac" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 4 }}>POSITION B</div>
                <div style={{ fontSize: 12, color: "#14532d", lineHeight: 1.5 }}>{posicionB}</div>
              </div>
            </div>

            <button onClick={handleNuevaConsulta} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, cursor: "pointer" }}>
              New dispute
            </button>
          </div>
        )}

        {/* ── Interaction summary ── */}
        {!mostrarResumen && interacciones.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "16px 24px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
            <button
              onClick={() => setMostrarResumen(true)}
              style={{ padding: "10px 24px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, cursor: "pointer" }}
            >
              📋 View my interactions for the report ({interacciones.length})
            </button>
          </div>
        )}

        {mostrarResumen && interacciones.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              📋 Your referee interactions
            </h3>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
              {nombreEquipo ? `${nombreEquipo} — ` : ""}{nombreAlumno}
            </p>
            <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "10px 14px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                <strong>📝 For your Classroom report:</strong> these are the interactions you had with the referee.
                Copy them and use them as input to answer the report questions your teacher left in the Classroom assignment.
              </p>
            </div>

            {interacciones.map((ix, i) => (
              <div key={i} style={{ marginBottom: 16, backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Dispute {i + 1}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Disagreement: </span>
                  <span style={{ fontSize: 13, color: "#1e293b" }}>{ix.conflicto}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ backgroundColor: "#eff6ff", borderRadius: 8, padding: "8px 10px", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", marginBottom: 3 }}>POSITION A</div>
                    <div style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.4 }}>{ix.posicionA}</div>
                  </div>
                  <div style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: "8px 10px", border: "1px solid #86efac" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 3 }}>POSITION B</div>
                    <div style={{ fontSize: 12, color: "#14532d", lineHeight: 1.4 }}>{ix.posicionB}</div>
                  </div>
                </div>
                <div style={{ backgroundColor: veredictoColor[ix.veredicto.resultado].bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${veredictoColor[ix.veredicto.resultado].border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: veredictoColor[ix.veredicto.resultado].text }}>
                    {veredictoLabel[ix.veredicto.resultado]}
                  </div>
                  <div style={{ fontSize: 12, color: veredictoColor[ix.veredicto.resultado].text, marginTop: 4, opacity: 0.85, lineHeight: 1.4 }}>
                    {ix.veredicto.explicacion}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleCopiarResumen}
              style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: copiado ? "#16a34a" : colors.gradient, color: "white", cursor: "pointer", transition: "background 0.2s" }}
            >
              {copiado ? "✅ Copied! Paste it into your Classroom submission" : "📋 Copy summary for Classroom"}
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.55)", paddingBottom: 16 }}>
          Learning Referee — {sesion.materia} · {sesion.tema} · Session valid until{" "}
          {new Date(sesion.expiresAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>

      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#374151" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b", outline: "none", boxSizing: "border-box" as const };
