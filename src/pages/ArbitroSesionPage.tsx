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

// ─── Area colors (must match ArbitroConfigPage) ────────────────────────────────

const AREA_COLORS: Record<string, { gradient: string; light: string; border: string; primary: string }> = {
  "Ciencias Exactas y Naturales":     { gradient: "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)", light: "#f0f9ff", border: "#bae6fd", primary: "#0ea5e9" },
  "Ciencias Sociales y Humanidades":  { gradient: "linear-gradient(135deg, #f97316 0%, #b45309 100%)", light: "#fff7ed", border: "#fed7aa", primary: "#f97316" },
  "Comunicación y Lenguajes":         { gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", light: "#faf5ff", border: "#e9d5ff", primary: "#8b5cf6" },
  "Arte y Expresión":                 { gradient: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)", light: "#fff1f2", border: "#fecdd3", primary: "#f43f5e" },
};

const DEFAULT_COLORS = { gradient: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", light: "#f0f7ff", border: "#bfdbfe", primary: "#3730a3" };

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ArbitroSesionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [sesion,        setSesion]        = useState<SesionData | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [sesionError,   setSesionError]   = useState<string | null>(null);
  const [instrVisible,  setInstrVisible]  = useState(true);

  const [conflicto, setConflicto] = useState("");
  const [posicionA, setPosicionA] = useState("");
  const [posicionB, setPosicionB] = useState("");
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [loadingV,  setLoadingV]  = useState(false);
  const [errorV,    setErrorV]    = useState<string | null>(null);

  // ── Cargar sesión ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const fn = httpsCallable(getFunctions(app), "getSesionArbitro");
    fn({ sessionId })
      .then((res: any) => { setSesion(res.data); setLoadingSesion(false); })
      .catch((err) => { setSesionError(err.message); setLoadingSesion(false); });
  }, [sessionId]);

  // ── Veredicto ──────────────────────────────────────────────────────────────
  const handleVeredicto = async () => {
    if (!conflicto.trim() || !posicionA.trim() || !posicionB.trim()) {
      setErrorV("Completá los tres campos: el conflicto y las dos posiciones.");
      return;
    }
    if (posicionA.trim() === posicionB.trim()) {
      setErrorV("Las dos posiciones tienen que ser distintas. Si el grupo está de acuerdo, ¡no necesitan árbitro!");
      return;
    }
    setErrorV(null); setLoadingV(true); setVeredicto(null);
    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "requestVeredicto");
      const res = await fn({ sessionId, conflicto, posicionA, posicionB }) as { data: Veredicto };
      setVeredicto(res.data);
    } catch (err: any) {
      setErrorV(`Error al consultar al árbitro: ${err.message}`);
    } finally {
      setLoadingV(false);
    }
  };

  const handleNuevaConsulta = () => {
    setConflicto(""); setPosicionA(""); setPosicionB("");
    setVeredicto(null); setErrorV(null);
  };

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loadingSesion) {
    return (
      <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "white", fontSize: 18, fontWeight: 600 }}>⏳ Cargando sesión…</div>
      </div>
    );
  }

  if (sesionError || !sesion) {
    return (
      <div style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Sesión no disponible</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            {sesionError?.includes("expirada")
              ? "Esta sesión ya expiró. Pedile a tu profe que genere una nueva."
              : "Esta sesión no existe. Verificá el link con tu profe."}
          </div>
        </div>
      </div>
    );
  }

  const colors = (sesion.area && AREA_COLORS[sesion.area]) ? AREA_COLORS[sesion.area] : DEFAULT_COLORS;

  const veredictoColor = {
    A:                 { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    B:                 { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
    ambas_correctas:   { bg: "#fefce8", border: "#fde68a", text: "#92400e" },
    ambas_incorrectas: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  };
  const veredictoLabel = {
    A:                 "✅ Posición A es correcta",
    B:                 "✅ Posición B es correcta",
    ambas_correctas:   "⚖️ Ambas posiciones son parcialmente correctas",
    ambas_incorrectas: "🔄 Ninguna posición es del todo correcta",
  };

  return (
    <div style={{ ...pageStyle, background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)" }}>
      <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header de sesión ── */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          <div style={{ background: colors.gradient, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>⚖️</span>
              <div style={{ color: "white" }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Árbitro de {sesion.materia}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {sesion.nivel} {sesion.anio} · {sesion.tema}
                  {sesion.subtema ? ` — ${sesion.subtema}` : ""}
                </div>
              </div>
            </div>
            <button
              onClick={() => setInstrVisible(!instrVisible)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {instrVisible ? "Ocultar instrucciones" : "Ver instrucciones"}
            </button>
          </div>
        </div>

        {/* ── Instrucciones ── */}
        {instrVisible && (
          <div style={{ backgroundColor: colors.light, borderRadius: 14, padding: "18px 22px", border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: colors.primary, marginBottom: 10 }}>
              📋 Cómo funciona esta sesión
            </div>
            <div style={{ fontSize: 13, color: "#1e3a5f", lineHeight: 1.75 }}>
              <p style={{ margin: "0 0 8px" }}>
                Usá el material que te dio tu profe para trabajar con tus compañeros.
                Discutan, pregúntense y lleguen a acuerdos entre ustedes —{" "}
                <strong>ese intercambio es donde más van a aprender</strong>.
              </p>
              <div style={{ backgroundColor: "white", borderRadius: 10, padding: "12px 16px", marginBottom: 8, border: `1px solid ${colors.border}` }}>
                <strong>Cómo jugar:</strong>
                <ol style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>Formen grupos de <strong>3 a 6 personas</strong>. Pueden armar 2 o 3 equipos, o competir individualmente.</li>
                  <li>Háganse preguntas sobre el tema entre ustedes.</li>
                  <li>Cuando alguien responde correctamente, ese equipo o persona anota 1 punto.</li>
                  <li>Vayan tomando registro de las disputas y cómo las resolvieron, para luego informárselo al profe.</li>
                  <li>Si el grupo entero tiene un desacuerdo genuino que no puede resolver, recién ahí usen el árbitro.</li>
                  <li>Al terminar la clase, el equipo o la persona con más puntos <strong>¡gana!</strong></li>
                </ol>
              </div>
              <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a" }}>
                <strong>⚠️ Antes de consultar al árbitro:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>Tienen que haber intentado resolver el desacuerdo entre ustedes.</li>
                  <li>Cada posición la escribe el alumno que la defiende, con sus propias palabras.</li>
                  <li>El árbitro no resuelve ejercicios completos — solo arbitra desacuerdos genuinos.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Material del docente ── */}
        {sesion.ejercicio && (
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: "18px 22px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📄 Material de trabajo
            </div>
            <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {sesion.ejercicio}
            </div>
          </div>
        )}

        {/* ── Panel del árbitro ── */}
        {!veredicto ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "2px solid #e2e8f0" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
              ⚖️ Consultá al árbitro
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
              Solo cuando el grupo entero tenga un desacuerdo genuino sobre <strong>{sesion.tema}</strong>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>¿Cuál es el desacuerdo o la pregunta en disputa?</label>
              <textarea value={conflicto} onChange={e => setConflicto(e.target.value)} rows={2}
                placeholder='Ej: "¿Cuál es la respuesta correcta y por qué?"'
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ ...labelStyle, color: "#1e40af" }}>
                  Posición A — <span style={{ fontWeight: 400 }}>escribila vos</span>
                </label>
                <textarea value={posicionA} onChange={e => setPosicionA(e.target.value)} rows={3}
                  placeholder="Escribí tu respuesta o explicación..."
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit", borderColor: posicionA ? "#93c5fd" : "#e2e8f0" }} />
              </div>
              <div>
                <label style={{ ...labelStyle, color: "#16a34a" }}>
                  Posición B — <span style={{ fontWeight: 400 }}>la escribe tu compañero/a</span>
                </label>
                <textarea value={posicionB} onChange={e => setPosicionB(e.target.value)} rows={3}
                  placeholder="Escribí tu respuesta o explicación..."
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
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>El árbitro está analizando las posiciones…</div>
              </div>
            )}

            <button
              onClick={handleVeredicto}
              disabled={loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim()}
              style={{
                width: "100%", padding: "13px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none",
                background: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim()
                  ? "#94a3b8"
                  : colors.gradient,
                color: "white",
                cursor: loadingV || !conflicto || !posicionA || !posicionB ? "not-allowed" : "pointer",
                opacity: loadingV || !conflicto || !posicionA || !posicionB ? 0.7 : 1,
              }}>
              {loadingV ? "⏳ Consultando…" : "⚖️ Pedir veredicto al árbitro"}
            </button>
          </div>
        ) : (
          /* ── Veredicto ── */
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
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Por qué</div>
              <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, backgroundColor: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
                {veredicto.explicacion}
              </div>
            </div>

            <div style={{ backgroundColor: "#fefce8", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>💭 Para seguir pensando</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.65 }}>{veredicto.paraSeguirPensando}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ backgroundColor: "#eff6ff", borderRadius: 10, padding: "10px 14px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>POSICIÓN A</div>
                <div style={{ fontSize: 12, color: "#1e3a5f" }}>{posicionA}</div>
              </div>
              <div style={{ backgroundColor: "#f0fdf4", borderRadius: 10, padding: "10px 14px", border: "1px solid #86efac" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 4 }}>POSICIÓN B</div>
                <div style={{ fontSize: 12, color: "#14532d" }}>{posicionB}</div>
              </div>
            </div>

            <button onClick={handleNuevaConsulta} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#475569", cursor: "pointer" }}>
              Nueva consulta al árbitro
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.6)", paddingBottom: 16 }}>
          Árbitro de {sesion.materia} · {sesion.tema} · Sesión válida hasta{" "}
          {new Date(sesion.expiresAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#475569" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", outline: "none", boxSizing: "border-box" as const };