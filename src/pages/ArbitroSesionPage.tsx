import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useParams } from "react-router-dom";
import { app } from "../firebase.config";

interface SesionData {
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

export default function ArbitroSesionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sesion,      setSesion]      = useState<SesionData | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [sesionError, setSesionError] = useState<string | null>(null);

  const [conflicto,  setConflicto]   = useState("");
  const [posicionA,  setPosicionA]   = useState("");
  const [posicionB,  setPosicionB]   = useState("");
  const [veredicto,  setVeredicto]   = useState<Veredicto | null>(null);
  const [loadingV,   setLoadingV]    = useState(false);
  const [errorV,     setErrorV]      = useState<string | null>(null);
  const [instrVisible, setInstrVisible] = useState(true);

  // Cargar sesión
  useEffect(() => {
    if (!sessionId) return;
    const fn = httpsCallable(getFunctions(app), "getSesionArbitro");
    fn({ sessionId })
      .then((res: any) => {
        setSesion(res.data);
        setLoadingSesion(false);
      })
      .catch((err) => {
        setSesionError(err.message);
        setLoadingSesion(false);
      });
  }, [sessionId]);

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

  // ─── Loading ──────────────────────────────────────────────────────────────
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

  const veredictoColor = {
    A:                  { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    B:                  { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
    ambas_correctas:    { bg: "#fefce8", border: "#fde68a", text: "#92400e" },
    ambas_incorrectas:  { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  };
  const veredictoLabel = {
    A:                  "✅ Posición A es correcta",
    B:                  "✅ Posición B es correcta",
    ambas_correctas:    "⚖️ Ambas posiciones son parcialmente correctas",
    ambas_incorrectas:  "🔄 Ninguna posición es del todo correcta",
  };

  return (
    <div style={pageStyle}>
      <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header de sesión */}
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: "18px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚖️</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                  Árbitro de {sesion.materia}
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {sesion.nivel} {sesion.anio} · {sesion.tema}
                  {sesion.subtema ? ` — ${sesion.subtema}` : ""}
                </div>
              </div>
            </div>
            <button
              onClick={() => setInstrVisible(!instrVisible)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "white", color: "#475569", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {instrVisible ? "Ocultar instrucciones" : "Ver instrucciones"}
            </button>
          </div>
        </div>

        {/* Instrucciones */}
        {instrVisible && (
          <div style={{ backgroundColor: "#f0f7ff", borderRadius: 14, padding: "18px 22px", border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e40af", marginBottom: 10 }}>
              📋 Cómo funciona esta sesión
            </div>
            <div style={{ fontSize: 13, color: "#1e3a5f", lineHeight: 1.75 }}>
              <p style={{ margin: "0 0 8px" }}>
                Usá el material que te dio tu profe para trabajar con tus compañeros.
                Discutan, pregúntense y lleguen a acuerdos entre ustedes — <strong>ese intercambio es donde más van a aprender</strong>.
              </p>
              <div style={{ backgroundColor: "white", borderRadius: 10, padding: "12px 16px", marginBottom: 8, border: "1px solid #dbeafe" }}>
                <strong>Cómo jugar:</strong>
                <ol style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>Trabajen con el material de su profe</li>
                  <li>Háganse preguntas sobre el tema entre ustedes</li>
                  <li>Cuando alguien responde bien, anoten un punto para ese equipo</li>
                  <li>Si <strong>todo el equipo</strong> tiene un desacuerdo que no pueden resolver, recién ahí usen el árbitro</li>
                </ol>
              </div>
              <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a" }}>
                <strong>⚠️ Antes de consultar al árbitro:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>Tienen que haber intentado resolver el desacuerdo entre ustedes</li>
                  <li>Cada posición la escribe el alumno que la defiende, con sus propias palabras</li>
                  <li>El árbitro no resuelve ejercicios completos — solo arbitra desacuerdos</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Material del docente */}
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

        {/* Panel del árbitro */}
        {!veredicto ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "2px solid #e2e8f0" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
              ⚖️ Consultá al árbitro
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
              Solo cuando el grupo entero tenga un desacuerdo genuino sobre <strong>{sesion.tema}</strong>
            </div>

            {/* Conflicto */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                ¿Cuál es el desacuerdo o la pregunta en disputa?
              </label>
              <textarea value={conflicto} onChange={e => setConflicto(e.target.value)} rows={2}
                placeholder={sesion.materia === "Lengua"
                  ? 'Ej: "¿La palabra fútbol es aguda o grave?"'
                  : 'Ej: "¿El resultado de 2x + 3 = 7 es x = 2 o x = 5?"'}
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
            </div>

            {/* Dos posiciones */}
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

            {/* Error */}
            {errorV && (
              <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626", border: "1px solid #fecaca", marginBottom: 12 }}>
                {errorV}
              </div>
            )}

            {/* Loading */}
            {loadingV && (
              <div style={{ padding: "14px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>El árbitro está analizando las posiciones…</div>
              </div>
            )}

            <button onClick={handleVeredicto} disabled={loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim()}
              style={{ width: "100%", padding: "13px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none", background: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim() ? "#94a3b8" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", cursor: loadingV || !conflicto || !posicionA || !posicionB ? "not-allowed" : "pointer", opacity: loadingV || !conflicto || !posicionA || !posicionB ? 0.7 : 1 }}>
              {loadingV ? "⏳ Consultando…" : "⚖️ Pedir veredicto al árbitro"}
            </button>
          </div>
        ) : (
          /* Veredicto */
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: `2px solid ${veredictoColor[veredicto.resultado].border}` }}>

            {/* Resultado */}
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

            {/* Explicación */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Por qué
              </div>
              <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, backgroundColor: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
                {veredicto.explicacion}
              </div>
            </div>

            {/* Para seguir pensando */}
            <div style={{ backgroundColor: "#fefce8", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>💭 Para seguir pensando</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.65 }}>{veredicto.paraSeguirPensando}</div>
            </div>

            {/* Posiciones originales (recordatorio) */}
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

            <button onClick={handleNuevaConsulta}
              style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#475569", cursor: "pointer" }}>
              Nueva consulta al árbitro
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.6)", paddingBottom: 16 }}>
          Árbitro de {sesion.materia} · {sesion.tema} · Sesión válida hasta {new Date(sesion.expiresAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#475569" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", outline: "none", boxSizing: "border-box" as const };