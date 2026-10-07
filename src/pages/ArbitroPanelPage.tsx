import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { PALETA } from "../utils/arbitroPalette";
import { coloresArea } from "../utils/arbitroAreas";

const ADMIN_UID = "P2lU12xoCxMkZ0AdZdMoGGksJ5o1";

interface SesionResumen {
  id: string;
  materia: string;
  nivel: string;
  anio: string;
  tema: string;
  area?: string;
  creadoEn: string;
  expiresAt: string;
  tieneInforme: boolean;
  partidasCount?: number;
  textoFuente?: string;
}

// Coincide EXACTAMENTE con el JSON que devuelve generarInformeSesion en
// functions/src/index.ts: fortalezas y areasDeOportunidad son párrafos (string),
// no listas, y el campo de recomendaciones se llama "recomendacionesDocente".
interface InformeMetacognicion {
  id: string;
  modo?: string;
  // Modo competitivo
  grupoNombre?: string;
  equipos?: Array<{
    nombre: string;
    color: string;
    integrantes: string;
    puntos: number;
    respuestas: {
      q1: string; q2: string; q3: string; q4: string;
    };
  }>;
  // Modo normal
  nombreAlumno?: string;
  nombreEquipo?: string;
  respuestas?: {
    aprendizaje: string;
    dificultad: string;
    preguntaPendiente: string;
    ensenanza: string;
  };
  creadoEn: string;
  // Detalle ronda por ronda de esta partida — lo guarda guardarInformeArbitro
  // a partir de lo jugado en ArbitroJuegoPage.tsx (modo competitivo).
  registros?: Array<{
    ronda: number;
    equipoPregunta: string;
    equipoResponde: string;
    pregunta: string;
    respuesta: string;
    calificacion: "completa" | "incompleta" | "no" | "pasada";
    puntos: number;
    fueAlArbitro: boolean;
    veredictoArbitro?: string;
  }>;
}

interface InformeSesion {
  resumenEjecutivo: string;
  conceptosDebatidos: string[];
  fortalezas: string;
  areasDeOportunidad: string;
  patronesObservados: string;
  recomendacionesDocente: string[];
  preguntasParaRetomar: string[];
  nivelDebate: "superficial" | "adecuado" | "profundo";
  // Metadatos para saber si conviene regenerar el informe (más parejas
  // pueden terminar de jugar después de la primera vez que se generó).
  totalConsultas?: number;
  totalConsultasActual?: number;
  // Rondas que los equipos pasaron sin responder: quedan fuera del análisis
  // pedagógico pero se listan aparte porque señalan dificultad.
  rondasPasadas?: Array<{ pregunta: string; equipoPregunta: string; tiempoSegundos?: number | null }>;
}

// Los colores por área viven en utils/arbitroPalette.ts (clave corta); las sesiones
// viejas guardaron el nombre completo y coloresArea() también lo acepta.

const NIVEL_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  superficial: { label: "Superficial", color: "#92400e", bg: "#fef3c7" },
  adecuado:    { label: "Adecuado",    color: "#166534", bg: "#dcfce7" },
  profundo:    { label: "Profundo",    color: "#1e40af", bg: "#dbeafe" },
};

export default function ArbitroPanelPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const functions = getFunctions(app, "us-central1");

  const [sesiones, setSesiones] = useState<SesionResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionResumen | null>(null);
  const [informe, setInforme] = useState<InformeSesion | null>(null);
  const [loadingInforme, setLoadingInforme] = useState(false);
  const [errorInforme, setErrorInforme] = useState("");
  const [metacogniciones, setMetacogniciones] = useState<InformeMetacognicion[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [todasSesiones, setTodasSesiones] = useState<SesionResumen[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return; // esperar a que Firebase Auth termine de restaurar la sesión
    if (!user) { navigate("/login"); return; }

    const fn = httpsCallable(functions, "listarSesionesDocente");
    // El servidor usa el uid de la sesión autenticada; no se envía uid desde acá.
    fn({ limit: 50 })
      .then((res: any) => { setSesiones(res.data.sesiones || []); setLoading(false); })
      .catch((e: any) => { setError(e.message); setLoading(false); });
  }, [authLoading, user]);

  const verInforme = async (sesion: SesionResumen, forceRegenerar = false) => {
    setSesionSeleccionada(sesion);
    setInforme(null);
    setErrorInforme("");
    setLoadingInforme(true);

    // Cargar metacogniciones en paralelo
    setLoadingMeta(true);
    const fnMeta = httpsCallable(functions, "getInformesMetacognicion");
    fnMeta({ sessionId: sesion.id })
      .then((res: any) => { setMetacogniciones(res.data.informes || []); })
      .catch(() => { setMetacogniciones([]); })
      .finally(() => setLoadingMeta(false));

    try {
      const fn = httpsCallable(functions, "generarInformeSesion");
      const res = await fn({ sessionId: sesion.id, forceRegenerar }) as any;
      setInforme(res.data);
    } catch (e: any) {
      setErrorInforme(e.message);
    }
    setLoadingInforme(false);
  };

  // Abre el texto base en pantalla completa directamente desde la lista,
  // sin pasar por generarInformeSesion — así funciona antes de que los
  // alumnos jueguen, cuando todavía no hay consultas registradas.
  const mostrarTextoDesdeLista = (sesion: SesionResumen) => {
    setSesionSeleccionada(sesion);
    setMostrarTexto(true);
  };

  const cargarTodasSesiones = async () => {
    setLoadingAdmin(true);
    try {
      const fn = httpsCallable(functions, "listarTodasSesionesAdmin");
      const res = await fn({}) as any;
      setTodasSesiones(res.data.sesiones || []);
      setModoAdmin(true);
    } catch (e: any) {
      setError(e.message);
    }
    setLoadingAdmin(false);
  };

  const colors = sesionSeleccionada
    ? coloresArea(sesionSeleccionada.area)
    : coloresArea(null);

  // ── Vista detalle de sesión ─────────────────────────────────────────────
  if (sesionSeleccionada) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <style>{`
          #panel-print-title { display: none; }
          @media print {
            [data-noprint] { display: none !important; }
            #panel-print-title { display: block !important; margin-bottom: 16px; }
            body { background: white; }
          }
        `}</style>
        {/* Header */}
        <div data-noprint style={{ background: colors.gradient, padding: "20px 24px", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <button onClick={() => { setSesionSeleccionada(null); setInforme(null); setMetacogniciones([]); }}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              ← Volver al panel
            </button>
            {informe && (
              <button onClick={() => window.print()}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                🖨️ Descargar informe (PDF)
              </button>
            )}
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900 }}>⚖️ {sesionSeleccionada.materia}</h1>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>{sesionSeleccionada.tema}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.75 }}>
            {sesionSeleccionada.nivel} · {sesionSeleccionada.anio} ·{" "}
            {new Date(sesionSeleccionada.creadoEn).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div id="panel-print-title">
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: "#1e293b" }}>⚖️ {sesionSeleccionada.materia}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#1e293b" }}>{sesionSeleccionada.tema}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
            {sesionSeleccionada.nivel} · {sesionSeleccionada.anio} ·{" "}
            {new Date(sesionSeleccionada.creadoEn).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
          {/* Proyectar el texto base para que la clase lo lea antes de jugar */}
          {sesionSeleccionada.textoFuente && (
            <div data-noprint style={{ marginBottom: 16 }}>
              <button
                onClick={() => setMostrarTexto(true)}
                style={{ padding: "10px 20px", borderRadius: 10, border: `2px solid ${colors.primary}`, backgroundColor: `${colors.primary}12`, color: colors.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                📖 Mostrar texto a los alumnos
              </button>
              <span style={{ fontSize: 12, color: PALETA.gris, marginLeft: 10 }}>
                Abre en pantalla completa para proyectar
              </span>
            </div>
          )}

          {loadingInforme && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚖️</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>Generando informe pedagógico…</p>
              <p style={{ fontSize: 13, color: "#64748b" }}>Estamos analizando las disputas de la sesión</p>
            </div>
          )}

          {errorInforme && (
            <div style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 20, border: "1px solid #fecaca" }}>
              <p style={{ margin: 0, color: "#dc2626", fontWeight: 600 }}>⚠️ {errorInforme}</p>
              <button onClick={() => verInforme(sesionSeleccionada)}
                style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                Reintentar
              </button>
            </div>
          )}

          {informe && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Aviso de partidas nuevas desde que se generó este informe */}
              {informe.totalConsultasActual !== undefined &&
                informe.totalConsultas !== undefined &&
                informe.totalConsultasActual > informe.totalConsultas && (
                <div style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: "12px 16px", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                    ⏳ Hay consultas al árbitro nuevas desde que se generó este informe — puede que falten grupos.
                  </div>
                  <button
                    onClick={() => sesionSeleccionada && verInforme(sesionSeleccionada, true)}
                    disabled={loadingInforme}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: PALETA.ambar, color: "white", fontWeight: 700, fontSize: 12, cursor: loadingInforme ? "default" : "pointer", whiteSpace: "nowrap" }}>
                    🔄 Actualizar informe
                  </button>
                </div>
              )}

              {/* Nivel de debate */}
              {informe.nivelDebate && (() => {
                const nb = NIVEL_BADGE[informe.nivelDebate] || NIVEL_BADGE.adecuado;
                return (
                  <div style={{ backgroundColor: nb.bg, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28 }}>
                      {informe.nivelDebate === "profundo" ? "🏆" : informe.nivelDebate === "adecuado" ? "✅" : "📊"}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: nb.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>Nivel de debate</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: nb.color }}>{nb.label}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Resumen ejecutivo */}
              <Card title="📋 Resumen ejecutivo">
                <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.7 }}>{informe.resumenEjecutivo}</p>
              </Card>

              {/* Conceptos debatidos */}
              {informe.conceptosDebatidos?.length > 0 && (
                <Card title="💡 Conceptos debatidos">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {informe.conceptosDebatidos.map((c, i) => (
                      <span key={i} style={{ backgroundColor: colors.light, color: colors.primary, border: `1px solid ${colors.primary}30`, borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Fortalezas y áreas de oportunidad */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {informe.fortalezas && (
                  <Card title="💪 Fortalezas">
                    <p style={{ margin: 0, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>{informe.fortalezas}</p>
                  </Card>
                )}
                {informe.areasDeOportunidad && (
                  <Card title="🎯 Áreas de oportunidad">
                    <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>{informe.areasDeOportunidad}</p>
                  </Card>
                )}
              </div>

              {/* Patrones observados */}
              {informe.patronesObservados && (
                <Card title="🔍 Patrones observados">
                  <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.7 }}>{informe.patronesObservados}</p>
                </Card>
              )}

              {/* Recomendaciones */}
              {informe.recomendacionesDocente?.length > 0 && (
                <Card title="📌 Recomendaciones para el docente">
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {informe.recomendacionesDocente.map((r, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#1e293b", marginBottom: 8, lineHeight: 1.6 }}>{r}</li>
                    ))}
                  </ol>
                </Card>
              )}

              {/* Preguntas para retomar */}
              {informe.preguntasParaRetomar?.length > 0 && (
                <Card title="❓ Preguntas para retomar en clase">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {informe.preguntasParaRetomar.map((p, i) => (
                      <div key={i} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0", fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                        {i + 1}. {p}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Preguntas pasadas — fuera del análisis, pero visibles */}
              {informe.rondasPasadas && informe.rondasPasadas.length > 0 && (
                <Card title="⏭️ Preguntas pasadas">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {informe.rondasPasadas.map((r, i) => (
                      <div key={i} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, color: PALETA.gris, marginBottom: 4 }}>
                          Pasada por {r.equipoPregunta || "un equipo"}
                          {typeof r.tiempoSegundos === "number"
                            ? ` · ${Math.floor(r.tiempoSegundos / 60)}:${String(r.tiempoSegundos % 60).padStart(2, "0")} min`
                            : ""}
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{r.pregunta || "(sin texto)"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 10, fontStyle: "italic" }}>
                    Estas preguntas no se incluyeron en el análisis pedagógico.
                  </div>
                </Card>
              )}

            </div>
          )}

          {/* Reflexiones de los equipos — agrupadas por partida, porque una
              sola sesión puede tener 6-7 parejas jugando en simultáneo desde
              el mismo link */}
          {(loadingMeta || metacogniciones.length > 0) && (
            <Card title={`✍️ Reflexiones de los equipos${metacogniciones.length > 0 ? ` (${metacogniciones.length} partida${metacogniciones.length === 1 ? "" : "s"})` : ""}`}>
              {loadingMeta ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Cargando reflexiones…</p>
              ) : metacogniciones.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Todavía no hay informes de metacognición enviados.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {metacogniciones.map((meta, idx) => {
                    // Modo competitivo
                    if (meta.modo === "competitivo" && meta.equipos) {
                      return (
                        <div key={meta.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>
                              Partida {idx + 1}
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              {meta.equipos.map(eq => `${eq.nombre} (${eq.puntos})`).join(" vs ")}
                            </span>
                          </div>
                          {meta.equipos.map((eq, i) => (
                            <div key={i} style={{ marginBottom: i < meta.equipos!.length - 1 ? 16 : 0, backgroundColor: "white", borderRadius: 10, padding: 12, border: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: eq.color }} />
                                <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{eq.nombre}</span>
                                <span style={{ fontSize: 12, color: PALETA.gris }}>{eq.integrantes}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginLeft: "auto" }}>{eq.puntos} pts</span>
                              </div>
                              {[
                                { label: "¿Qué aprendieron?", val: eq.respuestas?.q1 },
                                { label: "¿Momento más difícil?", val: eq.respuestas?.q2 },
                                { label: "¿Acuerdo con el árbitro?", val: eq.respuestas?.q3 },
                                { label: "¿Qué le enseñarían a otro?", val: eq.respuestas?.q4 },
                              ].filter(r => r.val?.trim()).map((r, j) => (
                                <div key={j} style={{ marginBottom: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>{r.label}</div>
                                  <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, backgroundColor: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>{r.val}</div>
                                </div>
                              ))}
                            </div>
                          ))}

                          {/* Detalle ronda por ronda: si fue al árbitro y en qué pregunta */}
                          {meta.registros && meta.registros.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>
                                Detalle de rondas ({meta.registros.length})
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {meta.registros.map((r, k) => {
                                  const calBadge = r.calificacion === "completa"
                                    ? { icon: "✅", label: "Completa", color: "#166534", bg: "#dcfce7" }
                                    : r.calificacion === "incompleta"
                                    ? { icon: "⚡", label: "Incompleta", color: "#92400e", bg: "#fef3c7" }
                                    : r.calificacion === "pasada"
                                    ? { icon: "⏭️", label: "Pasada", color: "#475569", bg: "#f1f5f9" }
                                    : { icon: "❌", label: "No", color: "#991b1b", bg: "#fee2e2" };
                                  return (
                                    <div key={k} style={{ backgroundColor: "white", borderRadius: 8, padding: "8px 12px", border: "1px solid #f1f5f9" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                                          Ronda {r.ronda}: {r.equipoPregunta} → {r.equipoResponde}
                                        </span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: calBadge.color, backgroundColor: calBadge.bg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>
                                          {calBadge.icon} {calBadge.label} ({r.puntos} pts)
                                        </span>
                                      </div>
                                      {r.fueAlArbitro ? (
                                        <div style={{ marginTop: 6, fontSize: 12, color: "#7c3aed", backgroundColor: "#f5f3ff", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                                          <strong>⚖️ Fue al árbitro</strong>
                                          {r.pregunta && <div style={{ marginTop: 2 }}>Pregunta: {r.pregunta}</div>}
                                          {r.veredictoArbitro && <div style={{ marginTop: 2 }}>Veredicto: {r.veredictoArbitro}</div>}
                                        </div>
                                      ) : (
                                        r.pregunta && (
                                          <div style={{ marginTop: 4, fontSize: 12, color: PALETA.gris }}>{r.pregunta}</div>
                                        )
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Modo normal
                    const r = meta.respuestas as any;
                    const pregsNormal = [
                      { label: "¿Qué aprendió?", val: r?.aprendizaje },
                      { label: "¿Momento más difícil?", val: r?.dificultad },
                      { label: "¿Acuerdo con el árbitro?", val: r?.preguntaPendiente },
                      { label: "¿Qué le enseñaría a otro?", val: r?.ensenanza },
                    ].filter(p => p.val?.trim());

                    return (
                      <div key={meta.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>
                            {meta.nombreEquipo ? `${meta.nombreEquipo} — ` : ""}{meta.nombreAlumno}
                          </span>
                        </div>
                        {pregsNormal.map((p, j) => (
                          <div key={j} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>{p.label}</div>
                            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, backgroundColor: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>{p.val}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Vista proyectable del texto base */}
        {mostrarTexto && sesionSeleccionada.textoFuente && (
          <div data-noprint style={{
            position: "fixed", inset: 0, backgroundColor: "white",
            zIndex: 9999, overflow: "auto", padding: "48px 10%",
            fontFamily: "'Georgia', serif",
          }}>
            <button
              onClick={() => setMostrarTexto(false)}
              style={{
                position: "fixed", top: 20, right: 24,
                padding: "10px 20px", borderRadius: 10,
                border: "2px solid #e2e8f0", backgroundColor: "white",
                fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#64748b",
              }}>
              ✕ Cerrar
            </button>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PALETA.gris, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                {sesionSeleccionada.materia} · {sesionSeleccionada.tema}
              </div>
              <div style={{ fontSize: 20, lineHeight: 1.9, color: "#1e293b", whiteSpace: "pre-wrap" }}>
                {sesionSeleccionada.textoFuente}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vista lista de sesiones ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#3730a3)", padding: "24px", color: "white" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>⚖️ Panel del docente</h1>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Tus sesiones de árbitro de aprendizaje</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
        {/* Vista admin — solo visible para Pablo */}
        {user?.uid === ADMIN_UID && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={modoAdmin ? () => setModoAdmin(false) : cargarTodasSesiones}
              disabled={loadingAdmin}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: `2px solid ${modoAdmin ? "#dc2626" : "#7c3aed"}`,
                backgroundColor: modoAdmin ? "#fef2f2" : "#f5f3ff",
                color: modoAdmin ? "#dc2626" : "#7c3aed",
                fontWeight: 700,
                fontSize: 13,
                cursor: loadingAdmin ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}>
              {loadingAdmin ? "⏳ Cargando..." : modoAdmin ? "👤 Ver solo mis sesiones" : "🔐 Ver todas las sesiones (Admin)"}
            </button>
            {modoAdmin && (
              <div style={{ fontSize: 12, color: "#7c3aed", textAlign: "center", marginTop: 4 }}>
                Mostrando sesiones de todos los docentes
              </div>
            )}
          </div>
        )}

        {(loading || authLoading) && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
            ⏳ Cargando sesiones…
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 20, border: "1px solid #fecaca" }}>
            <p style={{ margin: 0, color: "#dc2626", fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        {!loading && !authLoading && !error && (modoAdmin ? todasSesiones : sesiones).length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Todavía no tenés sesiones registradas.</p>
            <p style={{ fontSize: 13 }}>Configurá un árbitro y compartilo con tus alumnos.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(modoAdmin ? todasSesiones : sesiones).map(sesion => {
            const c = coloresArea(sesion.area);
            const fecha = new Date(sesion.creadoEn).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
            return (
              <div key={sesion.id}
                style={{ backgroundColor: "white", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  <div style={{ width: 6, background: c.gradient, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{sesion.materia}</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{sesion.tema}</div>
                        <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 4 }}>
                          {sesion.nivel} · {sesion.anio} · {fecha}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        {!!sesion.partidasCount && (
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            backgroundColor: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", whiteSpace: "nowrap",
                          }}>
                            🎮 {sesion.partidasCount} partida{sesion.partidasCount === 1 ? "" : "s"}
                          </span>
                        )}
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          backgroundColor: sesion.tieneInforme ? "#dcfce7" : "#f1f5f9",
                          color: sesion.tieneInforme ? "#166534" : PALETA.grisOscuro,
                          border: `1px solid ${sesion.tieneInforme ? "#86efac" : "#e2e8f0"}`,
                          whiteSpace: "nowrap",
                        }}>
                          {sesion.tieneInforme ? "✅ Con informe" : "Sin informe aún"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      {sesion.textoFuente && (
                        <button onClick={() => mostrarTextoDesdeLista(sesion)}
                          style={{ padding: "8px 16px", borderRadius: 8, border: `2px solid ${c.primary}`, backgroundColor: `${c.primary}12`, color: c.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          📖 Lectura grupal antes de jugar
                        </button>
                      )}
                      <button onClick={() => verInforme(sesion)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: c.gradient, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        {sesion.tieneInforme ? "Ver informe" : "Generar informe"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{title}</div>
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}
