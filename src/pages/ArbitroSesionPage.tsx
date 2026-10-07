import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useParams } from "react-router-dom";
import { app } from "../firebase.config";
import { PALETA } from "../utils/arbitroPalette";
import { coloresArea } from "../utils/arbitroAreas";

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

// Los colores por área viven en utils/arbitroPalette.ts (indexados por clave corta);
// coloresArea() también acepta el nombre completo de las sesiones viejas.

const veredictoLabel: Record<string, string> = {
  A:                 "✅ Posición A es correcta",
  B:                 "✅ Posición B es correcta",
  ambas_correctas:   "⚖️ Ambas posiciones son parcialmente correctas",
  ambas_incorrectas: "🔄 Ninguna posición es del todo correcta",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ArbitroSesionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [sesion,        setSesion]        = useState<SesionData | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [sesionError,   setSesionError]   = useState<string | null>(null);
  const [instrVisible,  setInstrVisible]  = useState(false); // colapsado por defecto

  // Identificación
  const [identificado,        setIdentificado]        = useState(false);
  const [nombreAlumno,        setNombreAlumno]        = useState("");
  const [nombreEquipo,        setNombreEquipo]        = useState("");
  const [errorIdentificacion, setErrorIdentificacion] = useState("");

  // Árbitro
  const [conflicto, setConflicto] = useState("");
  const [posicionA, setPosicionA] = useState("");
  const [posicionB, setPosicionB] = useState("");
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [loadingV,  setLoadingV]  = useState(false);
  const [errorV,    setErrorV]    = useState<string | null>(null);

  // Historial de interacciones
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);

  // Cierre / resumen
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [copiado,        setCopiado]        = useState(false);

  // ── Cargar sesión ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const fn = httpsCallable(getFunctions(app), "getSesionArbitro");
    fn({ sessionId })
      .then((res: any) => { setSesion(res.data); setLoadingSesion(false); })
      .catch((err)     => { setSesionError(err.message); setLoadingSesion(false); });
  }, [sessionId]);

  // ── Veredicto ────────────────────────────────────────────────────────────────
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
      // Guardar en historial
      setInteracciones(prev => [...prev, { conflicto, posicionA, posicionB, veredicto: res.data }]);
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

  const handleIdentificarse = () => {
    if (!nombreAlumno.trim()) {
      setErrorIdentificacion("Por favor escribí tu nombre o el del grupo.");
      return;
    }
    setIdentificado(true);
  };

  // ── Texto copiable del resumen ────────────────────────────────────────────────
  const buildResumenTexto = () => {
    if (!sesion) return "";
    const header = `INTERACCIONES CON EL ÁRBITRO\n${nombreEquipo ? `Equipo: ${nombreEquipo} — ` : ""}${nombreAlumno}\nMateria: ${sesion.materia} · Tema: ${sesion.tema}\n${"─".repeat(50)}\n`;
    const cuerpo = interacciones.map((ix, i) => [
      `Consulta ${i + 1}:`,
      `Desacuerdo: ${ix.conflicto}`,
      `Posición A: ${ix.posicionA}`,
      `Posición B: ${ix.posicionB}`,
      `Veredicto del árbitro: ${veredictoLabel[ix.veredicto.resultado]}`,
      `Explicación: ${ix.veredicto.explicacion}`,
    ].join("\n")).join("\n\n");
    const footer = `\n${"─".repeat(50)}\nUsá estas interacciones para responder las preguntas del informe en Classroom.`;
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

  const colors = coloresArea(sesion.area);

  // ── Pantalla de identificación ───────────────────────────────────────────────
  if (!identificado) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflow: "hidden" }}>

          <div style={{ background: colors.gradient, padding: "24px 28px", color: "white" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Árbitro de Aprendizaje</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>
              {sesion.materia} · {sesion.tema}
            </p>
          </div>

          <div style={{ padding: "28px" }}>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
              Antes de empezar, escribí tu nombre para que el docente pueda ver quién participó.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="sesion-nombre-alumno" style={labelStyle}>
                Tu nombre o nombres del grupo <span style={{ color: PALETA.rojo }}>*</span>
              </label>
              <input
                id="sesion-nombre-alumno"
                type="text"
                value={nombreAlumno}
                onChange={e => { setNombreAlumno(e.target.value); setErrorIdentificacion(""); }}
                placeholder="Ej: Juan García, o Juan y María"
                onKeyDown={e => e.key === "Enter" && handleIdentificarse()}
                style={inputStyle}
              />
              {errorIdentificacion && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626" }}>{errorIdentificacion}</p>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="sesion-nombre-equipo" style={labelStyle}>
                Nombre del equipo <span style={{ fontSize: 12, color: PALETA.gris, fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                id="sesion-nombre-equipo"
                type="text"
                value={nombreEquipo}
                onChange={e => setNombreEquipo(e.target.value)}
                placeholder="Ej: Equipo 1, Los Bioquímicos..."
                onKeyDown={e => e.key === "Enter" && handleIdentificarse()}
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleIdentificarse}
              style={{ width: "100%", padding: "13px", fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", background: colors.gradient, color: "white", cursor: "pointer" }}
            >
              ⚖️ Entrar al Árbitro →
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
                <div style={{ fontSize: 16, fontWeight: 800 }}>Árbitro de {sesion.materia}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {sesion.nivel} {sesion.anio} · {sesion.tema}
                  {sesion.subtema ? ` — ${sesion.subtema}` : ""}
                </div>
              </div>
            </div>
            <button
              onClick={() => setInstrVisible(!instrVisible)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.5)", backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {instrVisible ? "▲ Ocultar instrucciones" : "📋 Ver cómo funciona →"}
            </button>
          </div>
        </div>

        {/* ── Instrucciones (colapsadas por defecto) ── */}
        {instrVisible && (
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: "18px 22px", border: `2px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: colors.primary, marginBottom: 12 }}>
              📋 Cómo funciona esta sesión
            </div>
            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.75 }}>
              <p style={{ margin: "0 0 10px" }}>
                Usá el material que te dio tu profe para trabajar con tus compañeros.
                Discutan, pregúntense y lleguen a acuerdos entre ustedes —{" "}
                <strong>ese intercambio es donde más van a aprender</strong>.
              </p>
              <div style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 10, border: "1px solid #e2e8f0" }}>
                <strong style={{ color: "#1e293b" }}>Cómo jugar:</strong>
                <ol style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9, color: "#374151" }}>
                  <li>Formen grupos de <strong>3 a 6 personas</strong>. Pueden armar 2 o 3 equipos, o competir individualmente.</li>
                  <li>Háganse preguntas sobre el tema entre ustedes.</li>
                  <li>Cuando alguien responde correctamente, ese equipo o persona anota 1 punto.</li>
                  <li>Vayan tomando registro de las disputas y cómo las resolvieron.</li>
                  <li>Si el grupo entero tiene un desacuerdo genuino que no puede resolver, recién ahí usen el árbitro.</li>
                  <li>Al terminar la clase, el equipo o la persona con más puntos <strong>¡gana!</strong></li>
                </ol>
              </div>
              <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a" }}>
                <strong style={{ color: "#92400e" }}>⚠️ Antes de consultar al árbitro:</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9, color: "#78350f" }}>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>
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
              Solo cuando el grupo entero tenga un desacuerdo genuino sobre <strong style={{ color: "#475569" }}>{sesion.tema}</strong>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="sesion-conflicto" style={labelStyle}>¿Cuál es el desacuerdo o la pregunta en disputa?</label>
              <textarea id="sesion-conflicto" value={conflicto} onChange={e => setConflicto(e.target.value)} rows={2}
                placeholder='Ej: "¿Cuál es la respuesta correcta y por qué?"'
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label htmlFor="sesion-posicion-a" style={{ ...labelStyle, color: "#1e40af" }}>
                  Posición A — <span style={{ fontWeight: 400, color: "#64748b" }}>escribila vos</span>
                </label>
                <textarea id="sesion-posicion-a" value={posicionA} onChange={e => setPosicionA(e.target.value)} rows={3}
                  placeholder="Escribí tu respuesta o explicación..."
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit", borderColor: posicionA ? "#93c5fd" : "#e2e8f0" }} />
              </div>
              <div>
                <label htmlFor="sesion-posicion-b" style={{ ...labelStyle, color: PALETA.verde }}>
                  Posición B — <span style={{ fontWeight: 400, color: "#64748b" }}>la escribe tu compañero/a</span>
                </label>
                <textarea id="sesion-posicion-b" value={posicionB} onChange={e => setPosicionB(e.target.value)} rows={3}
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
                background: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim() ? PALETA.gris : colors.gradient,
                color: "white",
                cursor: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim() ? "not-allowed" : "pointer",
                opacity: loadingV || !conflicto.trim() || !posicionA.trim() || !posicionB.trim() ? 0.7 : 1,
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
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Por qué</div>
              <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, backgroundColor: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                {veredicto.explicacion}
              </div>
            </div>

            <div style={{ backgroundColor: "#fefce8", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>💭 Para seguir pensando</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.65 }}>{veredicto.paraSeguirPensando}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ backgroundColor: "#eff6ff", borderRadius: 10, padding: "10px 14px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>POSICIÓN A</div>
                <div style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.5 }}>{posicionA}</div>
              </div>
              <div style={{ backgroundColor: "#f0fdf4", borderRadius: 10, padding: "10px 14px", border: "1px solid #86efac" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4 }}>POSICIÓN B</div>
                <div style={{ fontSize: 12, color: "#14532d", lineHeight: 1.5 }}>{posicionB}</div>
              </div>
            </div>

            <button onClick={handleNuevaConsulta} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, cursor: "pointer" }}>
              Nueva consulta al árbitro
            </button>
          </div>
        )}

        {/* ── Resumen de interacciones ── */}
        {!mostrarResumen && interacciones.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "16px 24px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
            <button
              onClick={() => setMostrarResumen(true)}
              style={{ padding: "10px 24px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, cursor: "pointer" }}
            >
              📋 Ver mis interacciones para el informe ({interacciones.length})
            </button>
          </div>
        )}

        {mostrarResumen && interacciones.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              📋 Tus interacciones con el árbitro
            </h3>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
              {nombreEquipo ? `${nombreEquipo} — ` : ""}{nombreAlumno}
            </p>
            <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "10px 14px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                <strong>📝 Para tu informe en Classroom:</strong> estas son las interacciones que tuviste con el árbitro.
                Copiálas y usalas como insumo para responder las preguntas del informe que te dejó tu docente en la tarea de Classroom.
              </p>
            </div>

            {interacciones.map((ix, i) => (
              <div key={i} style={{ marginBottom: 16, backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Consulta {i + 1}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Desacuerdo: </span>
                  <span style={{ fontSize: 13, color: "#1e293b" }}>{ix.conflicto}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ backgroundColor: "#eff6ff", borderRadius: 8, padding: "8px 10px", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 3 }}>POSICIÓN A</div>
                    <div style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.4 }}>{ix.posicionA}</div>
                  </div>
                  <div style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: "8px 10px", border: "1px solid #86efac" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 3 }}>POSICIÓN B</div>
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
              style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: copiado ? PALETA.verde : colors.gradient, color: "white", cursor: "pointer", transition: "background 0.2s" }}
            >
              {copiado ? "✅ ¡Copiado! Pegalo en tu entrega de Classroom" : "📋 Copiar resumen para Classroom"}
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", fontSize: 12, color: "white", backgroundColor: "rgba(30,41,59,0.85)", borderRadius: 10, padding: "6px 12px", marginBottom: 16 }}>
          Árbitro de {sesion.materia} · {sesion.tema} · Sesión válida hasta{" "}
          {new Date(sesion.expiresAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </div>

      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#374151" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b", boxSizing: "border-box" as const };
