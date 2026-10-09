import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useArbitroT, useFormatoPuntos, fillArbitro, useLocaleArbitro, useTituloPagina, LanguageSelector } from "../i18n";
import { etiquetaCalificacion } from "../utils/arbitroEtiquetas";
import { nombreVisible } from "../utils/arbitroNombres";
import { esIaNoDisponible, textoErrorArbitro } from "../utils/arbitroErrores";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { PALETA } from "../utils/arbitroPalette";
import { coloresArea } from "../utils/arbitroAreas";
import { DialogoEnPagina, fieldsetReset, legendReset, srOnly } from "../utils/arbitroA11y";

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
  docenteUid?: string;
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
  partidaId?: string; // une el informe con las rondas registradas (registrarRonda)
  // Detalle ronda por ronda de esta partida — lo guarda guardarInformeArbitro
  // a partir de lo jugado en ArbitroJuegoPage.tsx (modo competitivo).
  registros?: Array<{
    ronda: number;
    equipoPregunta: string;
    equipoResponde: string;
    pregunta: string;
    respuesta: string;
    calificacion: "completa" | "incompleta" | "no" | "pasada" | "fuera_de_tema";
    puntos: number;
    fueAlArbitro: boolean;
    veredictoArbitro?: string;
  }>;
}

// Ronda registrada por registrarRonda (sesiones_arbitro/{id}/rondas). Solo nombres de equipos.
interface RepartoRonda { puntosPregunta: number; puntosResponde: number; tieneRazon: string | null; grado: string | null }
interface RondaDoc {
  id: string;
  partidaId: string;
  ronda: number;
  equipoPregunta: string;
  equipoResponde: string;
  pregunta: string;
  calificacion: "completa" | "incompleta" | "no" | "pasada" | "fuera_de_tema";
  estado: string;
  fueAlArbitro: boolean;
  reparto: RepartoRonda;
  disputa: null | {
    planteo: string; posicionPregunta: string; posicionResponde: string; resultado: string;
    veredicto: string; explicacion: string; paraSeguirPensando: string; repartoOriginal: RepartoRonda;
  };
  correccion: null | { repartoOriginal: RepartoRonda; repartoNuevo: RepartoRonda; fecha: string; docenteUid: string };
}
interface TotalPartida { partidaId: string; rondasCorregidas: number; equipos: Array<{ nombre: string; puntosAlumnos: number; puntosFinales: number }> }
interface RondasData {
  rondas: RondaDoc[];
  totales: TotalPartida[];
  resumen: { rondasConVeredicto: number; rondasCorregidas: number };
  puedeCorregir: boolean;
}

// Los 6 repartos posibles (misma tabla que el servidor): [puntos de quien preguntó, puntos de quien respondió].
const OPCIONES_REPARTO: Array<{ key: string; puntos: [number, number] }> = [
  { key: "pregunta|total", puntos: [1, 0] },
  { key: "pregunta|parcial", puntos: [0.75, 0.25] },
  { key: "ambos|parcial", puntos: [0.5, 0.5] },
  { key: "responde|parcial", puntos: [0.25, 0.75] },
  { key: "responde|total", puntos: [0, 1] },
  { key: "ninguno|parcial", puntos: [0, 0] },
];

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
  // Cuándo se generó el informe con Gemini (ISO): se compara con la fecha de las correcciones del docente.
  generadoEn?: string;
  // Rondas que los equipos pasaron sin responder: quedan fuera del análisis
  // pedagógico pero se listan aparte porque señalan dificultad.
  rondasPasadas?: Array<{ pregunta: string; equipoPregunta: string; tiempoSegundos?: number | null }>;
  // Rondas que el docente corrigió y totales recalculados (se calculan en cada lectura).
  correcciones?: { rondasConVeredicto: number; rondasCorregidas: number; totales: TotalPartida[] };
}

// Los colores por área viven en utils/arbitroPalette.ts (clave corta); las sesiones
// viejas guardaron el nombre completo y coloresArea() también lo acepta.

// Colores del nivel de debate (el texto sale del diccionario, ver nivelEtiqueta).
const NIVEL_BADGE: Record<string, { color: string; bg: string }> = {
  superficial: { color: "#92400e", bg: "#fef3c7" },
  adecuado:    { color: "#166534", bg: "#dcfce7" },
  profundo:    { color: "#1e40af", bg: "#dbeafe" },
};

export default function ArbitroPanelPage() {
  const ta = useArbitroT();
  const locale = useLocaleArbitro(); // fechas y números según el idioma (es-AR / en-US)
  const fmt = useFormatoPuntos();
  useTituloPagina(`${ta.panPageTitle} — ${ta.pageTitleSuffix}`);
  const nivelEtiqueta = (k: string) => (k === "superficial" ? ta.panLevelShallow : k === "profundo" ? ta.panLevelDeep : ta.panLevelAdequate);
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
  const [rondasData, setRondasData] = useState<RondasData | null>(null);
  const [loadingRondas, setLoadingRondas] = useState(false);
  const [errorRondas, setErrorRondas] = useState("");
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [errorCorreccion, setErrorCorreccion] = useState<{ id: string; msg: string } | null>(null);
  const [avisoCorreccion, setAvisoCorreccion] = useState(""); // «Corrección guardada», para la región viva

  useEffect(() => {
    if (authLoading) return; // esperar a que Firebase Auth termine de restaurar la sesión
    if (!user) { navigate("/login"); return; }

    const fn = httpsCallable(functions, "listarSesionesDocente");
    // El servidor usa el uid de la sesión autenticada; no se envía uid desde acá.
    fn({ limit: 50 })
      .then((res: any) => { setSesiones(res.data.sesiones || []); setLoading(false); })
      .catch((e: any) => { setError(textoErrorArbitro(e, ta, e.message)); setLoading(false); });
  }, [authLoading, user]);

  const cargarRondas = (sessionId: string) => {
    setRondasData(null);
    setErrorRondas("");
    setLoadingRondas(true);
    const fn = httpsCallable(functions, "listarRondasSesion");
    fn({ sessionId })
      .then((res: any) => { setRondasData(res.data as RondasData); })
      .catch((e: any) => { setErrorRondas(textoErrorArbitro(e, ta, ta.roundsError)); })
      .finally(() => setLoadingRondas(false));
  };

  // Corrección del docente: cambia el reparto de una ronda con veredicto. La verifica el servidor
  // (solo el docente dueño de la sesión). No cambia el marcador que ya vieron los alumnos.
  const corregirRonda = async (r: RondaDoc) => {
    const elegida = seleccion[r.id];
    if (!elegida || !sesionSeleccionada) return;
    const [tieneRazon, grado] = elegida.split("|");
    setCorrigiendo(r.id);
    setErrorCorreccion(null);
    setAvisoCorreccion("");
    try {
      const fn = httpsCallable(functions, "corregirRonda");
      await fn({ sessionId: sesionSeleccionada.id, rondaId: r.id, tieneRazon, grado });
      const lista = httpsCallable(functions, "listarRondasSesion");
      const res = await lista({ sessionId: sesionSeleccionada.id }) as any;
      setRondasData(res.data as RondasData);
      setSeleccion(prev => { const n = { ...prev }; delete n[r.id]; return n; });
      setAvisoCorreccion(ta.correctSaved);
    } catch (e: any) {
      setErrorCorreccion({ id: r.id, msg: String(e?.code || "").endsWith("permission-denied") ? ta.correctOnlyOwner : ta.correctError });
    }
    setCorrigiendo(null);
  };

  const verInforme = async (sesion: SesionResumen, forceRegenerar = false) => {
    setSesionSeleccionada(sesion);
    setInforme(null);
    setErrorInforme("");
    setLoadingInforme(true);

    // Rondas registradas (con veredicto y reparto) en paralelo
    cargarRondas(sesion.id);

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
      // Gemini caído: texto propio según el código. El resto (login, permisos, sin consultas) como hoy.
      setErrorInforme(esIaNoDisponible(e) ? ta.aiUnavailable : textoErrorArbitro(e, ta, e.message));
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
      setError(textoErrorArbitro(e, ta, e.message));
    }
    setLoadingAdmin(false);
  };

  // ── Rondas: textos auxiliares ───────────────────────────────────────────
  const repartoTxt = (r: RondaDoc, rep: { puntosPregunta: number; puntosResponde: number }) =>
    `${r.equipoPregunta} ${fmt(rep.puntosPregunta)} · ${r.equipoResponde} ${fmt(rep.puntosResponde)}`;
  const textoOpcion = (key: string, r: RondaDoc) => {
    const quien = key.startsWith("pregunta") ? r.equipoPregunta : r.equipoResponde;
    const base = key.endsWith("|total") ? fillArbitro(ta.optTotal, { team: quien })
      : key === "ambos|parcial" ? ta.optBoth
      : key === "ninguno|parcial" ? ta.optNone
      : fillArbitro(ta.optPartial, { team: quien });
    const o = OPCIONES_REPARTO.find(x => x.key === key)!;
    return `${base} — ${r.equipoPregunta} ${fmt(o.puntos[0])} · ${r.equipoResponde} ${fmt(o.puntos[1])}`;
  };
  // La etiqueta sale del diccionario a partir de la clave estable de la calificación.
  const badgeCalificacion = (c: RondaDoc["calificacion"]) =>
    c === "completa" ? { icon: "✅", label: etiquetaCalificacion(c, ta), color: "#166534", bg: "#dcfce7" }
    : c === "incompleta" ? { icon: "⚡", label: etiquetaCalificacion(c, ta), color: "#92400e", bg: "#fef3c7" }
    : c === "pasada" ? { icon: "⏭️", label: etiquetaCalificacion(c, ta), color: "#475569", bg: "#f1f5f9" }
    : c === "fuera_de_tema" ? { icon: "🚫", label: etiquetaCalificacion(c, ta), color: "#9a3412", bg: "#ffedd5" }
    : { icon: "❌", label: etiquetaCalificacion(c, ta), color: "#991b1b", bg: "#fee2e2" };
  // Correcciones y totales: lo último que trajo el panel (rondasData) o, si no cargó, lo que trae el informe.
  const correcciones = rondasData
    ? { rondasConVeredicto: rondasData.resumen.rondasConVeredicto, rondasCorregidas: rondasData.resumen.rondasCorregidas, totales: rondasData.totales }
    : informe?.correcciones;
  // ¿Hay rondas corregidas con fecha posterior al informe de Gemini? (el texto narrativo no se reescribe con las correcciones)
  const informeAntesDeCorrecciones = !!informe?.generadoEn && !!rondasData?.rondas.some(r => r.correccion?.fecha && new Date(r.correccion.fecha).getTime() > new Date(informe.generadoEn!).getTime());
  const totalDePartida = (partidaId?: string) => (partidaId ? correcciones?.totales.find(t => t.partidaId === partidaId) : undefined);

  const colors = sesionSeleccionada
    ? coloresArea(sesionSeleccionada.area)
    : coloresArea(null);
  const materiaDe = (m: string) => nombreVisible(ta.materiaNames, m);
  const nivelDe = (n: string) => nombreVisible(ta.levelNames, n);

  // ── Vista detalle de sesión ─────────────────────────────────────────────
  if (sesionSeleccionada) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
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
          <div className="pan-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <button onClick={() => { setSesionSeleccionada(null); setInforme(null); setMetacogniciones([]); setRondasData(null); setErrorRondas(""); setSeleccion({}); }}
              style={{ background: "rgba(0,0,0,0.25)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {ta.panBackToList}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LanguageSelector compact tone="onColor" />
              {informe && (
                <button onClick={() => window.print()}
                  style={{ background: "rgba(0,0,0,0.25)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  {ta.panDownloadPdf}
                </button>
              )}
            </div>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900 }}>⚖️ {materiaDe(sesionSeleccionada.materia)}</h1>
          <p style={{ margin: 0, fontSize: 13 }}>{sesionSeleccionada.tema}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>
            {nivelDe(sesionSeleccionada.nivel)} · {sesionSeleccionada.anio} ·{" "}
            {new Date(sesionSeleccionada.creadoEn).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div id="panel-print-title">
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: "#1e293b" }}>⚖️ {materiaDe(sesionSeleccionada.materia)}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#1e293b" }}>{sesionSeleccionada.tema}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
            {nivelDe(sesionSeleccionada.nivel)} · {sesionSeleccionada.anio} ·{" "}
            {new Date(sesionSeleccionada.creadoEn).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
          {/* Proyectar el texto base para que la clase lo lea antes de jugar */}
          {sesionSeleccionada.textoFuente && (
            <div data-noprint style={{ marginBottom: 16 }}>
              <button
                onClick={() => setMostrarTexto(true)}
                style={{ padding: "10px 20px", borderRadius: 10, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {ta.panShowText}
              </button>
              <span style={{ fontSize: 12, color: PALETA.gris, marginLeft: 10 }}>
                {ta.panShowTextHint}
              </span>
            </div>
          )}

          <div role="status" aria-live="polite">
            {loadingInforme && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div aria-hidden="true" style={{ fontSize: 36, marginBottom: 12 }}>⚖️</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>{ta.panGenerating}</p>
                <p style={{ fontSize: 13, color: "#64748b" }}>{ta.panAnalyzing}</p>
              </div>
            )}
          </div>

          {errorInforme && (
            <div role="alert" style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 20, border: "1px solid #fecaca" }}>
              <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600 }}>⚠️ {errorInforme}</p>
              <button onClick={() => verInforme(sesionSeleccionada)}
                style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                {ta.cfgRetryPlain}
              </button>
            </div>
          )}

          {informe && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Aviso: hay correcciones del docente posteriores al informe generado con Gemini */}
              {informeAntesDeCorrecciones && (
                <div role="status" data-testid="aviso-informe-antes-correcciones" style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: "12px 16px", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                    ✏️ {ta.reportBeforeCorrections}
                  </div>
                  <button
                    onClick={() => sesionSeleccionada && verInforme(sesionSeleccionada, true)}
                    disabled={loadingInforme}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: PALETA.ambar, color: "white", fontWeight: 700, fontSize: 12, cursor: loadingInforme ? "default" : "pointer", whiteSpace: "nowrap" }}>
                    {ta.panUpdateReport}
                  </button>
                </div>
              )}

              {/* Aviso de partidas nuevas desde que se generó este informe */}
              {informe.totalConsultasActual !== undefined &&
                informe.totalConsultas !== undefined &&
                informe.totalConsultasActual > informe.totalConsultas && (
                <div style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: "12px 16px", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                    {ta.panNewQueries}
                  </div>
                  <button
                    onClick={() => sesionSeleccionada && verInforme(sesionSeleccionada, true)}
                    disabled={loadingInforme}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: PALETA.ambar, color: "white", fontWeight: 700, fontSize: 12, cursor: loadingInforme ? "default" : "pointer", whiteSpace: "nowrap" }}>
                    {ta.panUpdateReport}
                  </button>
                </div>
              )}

              {/* Nivel de debate */}
              {informe.nivelDebate && (() => {
                const nb = NIVEL_BADGE[informe.nivelDebate] || NIVEL_BADGE.adecuado;
                const nbLabel = nivelEtiqueta(informe.nivelDebate);
                return (
                  <div style={{ backgroundColor: nb.bg, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28 }}>
                      {informe.nivelDebate === "profundo" ? "🏆" : informe.nivelDebate === "adecuado" ? "✅" : "📊"}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: nb.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{ta.panDebateLevel}</h2>
                      <div style={{ fontSize: 18, fontWeight: 900, color: nb.color }}>{nbLabel}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Resumen ejecutivo */}
              <Card title={ta.panExecSummary}>
                <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.7 }}>{informe.resumenEjecutivo}</p>
              </Card>

              {/* Conceptos debatidos */}
              {informe.conceptosDebatidos?.length > 0 && (
                <Card title={ta.panConcepts}>
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
              <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {informe.fortalezas && (
                  <Card title={ta.panStrengths}>
                    <p style={{ margin: 0, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>{informe.fortalezas}</p>
                  </Card>
                )}
                {informe.areasDeOportunidad && (
                  <Card title={ta.panOpportunities}>
                    <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>{informe.areasDeOportunidad}</p>
                  </Card>
                )}
              </div>

              {/* Patrones observados */}
              {informe.patronesObservados && (
                <Card title={ta.panPatterns}>
                  <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.7 }}>{informe.patronesObservados}</p>
                </Card>
              )}

              {/* Recomendaciones */}
              {informe.recomendacionesDocente?.length > 0 && (
                <Card title={ta.panRecommendations}>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {informe.recomendacionesDocente.map((r, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#1e293b", marginBottom: 8, lineHeight: 1.6 }}>{r}</li>
                    ))}
                  </ol>
                </Card>
              )}

              {/* Preguntas para retomar */}
              {informe.preguntasParaRetomar?.length > 0 && (
                <Card title={ta.panRetake}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {informe.preguntasParaRetomar.map((p, i) => (
                      <div key={i} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0", fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                        {i + 1}. {p}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Rondas corregidas por el docente + totales recalculados */}
              {correcciones && correcciones.totales.length > 0 && (
                <Card title={`🛠️ ${ta.reportCorrectionsTitle}`}>
                  <p style={{ margin: "0 0 10px", fontSize: 14, color: "#1e293b", lineHeight: 1.6 }} data-testid="informe-rondas-corregidas">
                    <strong>{fillArbitro(ta.reportCorrectedRounds, { n: correcciones.rondasCorregidas, total: correcciones.rondasConVeredicto })}</strong>
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {correcciones.totales.map((tp, i) => (
                      <div key={tp.partidaId} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0", fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                        <strong>{fillArbitro(ta.gameN, { n: i + 1 })}</strong>
                        {tp.equipos.map(e => (
                          <div key={e.nombre}>
                            {e.nombre}: {e.puntosFinales !== e.puntosAlumnos
                              ? <>{fmt(e.puntosAlumnos)} → <strong>{fmt(e.puntosFinales)}</strong> {ta.pointsAbbrev}</>
                              : <>{fmt(e.puntosFinales)} {ta.pointsAbbrev}</>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 10, fontStyle: "italic" }}>{ta.correctionNote}</div>
                </Card>
              )}

              {/* Preguntas pasadas — fuera del análisis, pero visibles */}
              {informe.rondasPasadas && informe.rondasPasadas.length > 0 && (
                <Card title={ta.panPassed}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {informe.rondasPasadas.map((r, i) => (
                      <div key={i} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, color: PALETA.gris, marginBottom: 4 }}>
                          {fillArbitro(ta.panPassedBy, { team: r.equipoPregunta || ta.panAnotherTeam })}
                          {typeof r.tiempoSegundos === "number"
                            ? fillArbitro(ta.panPassedTime, { time: `${Math.floor(r.tiempoSegundos / 60)}:${String(r.tiempoSegundos % 60).padStart(2, "0")}` })
                            : ""}
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{r.pregunta || ta.panNoText}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 10, fontStyle: "italic" }}>
                    {ta.panPassedNote}
                  </div>
                </Card>
              )}

            </div>
          )}

          {/* Rondas de la sesión: datos de cada ronda + corrección del docente */}
          {(loadingRondas || errorRondas || (rondasData && rondasData.rondas.length > 0)) && (
            <div style={{ marginBottom: 16 }}>
              <Card title={`🧾 ${ta.roundsTitle}`}>
                <div role="status" aria-live="polite">
                  {loadingRondas && <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{ta.roundsLoading}</p>}
                  {avisoCorreccion && <p style={srOnly}>{avisoCorreccion}</p>}
                </div>
                {errorRondas && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>⚠️ {errorRondas}</p>}
                {rondasData && (() => {
                  const partidas: string[] = [];
                  rondasData.rondas.forEach(r => { if (!partidas.includes(r.partidaId)) partidas.push(r.partidaId); });
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {!rondasData.puedeCorregir && (
                        <div style={{ fontSize: 12, color: PALETA.gris }}>{ta.correctOnlyOwner}</div>
                      )}
                      {partidas.map((pid, pi) => {
                        const tot = rondasData.totales.find(t => t.partidaId === pid);
                        return (
                          <div key={pid} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>{fillArbitro(ta.gameN, { n: pi + 1 })}</h3>
                              {tot && (
                                <span style={{ fontSize: 12, color: "#475569" }} data-testid="partida-totales">
                                  {tot.equipos.map(e => e.puntosFinales !== e.puntosAlumnos
                                    ? `${e.nombre} ${fmt(e.puntosAlumnos)} → ${fmt(e.puntosFinales)}`
                                    : `${e.nombre} ${fmt(e.puntosFinales)}`).join(" · ")}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {rondasData.rondas.filter(r => r.partidaId === pid).map(r => {
                                const b = badgeCalificacion(r.calificacion);
                                const actual = r.disputa ? `${r.reparto.tieneRazon}|${r.reparto.grado}` : "";
                                const elegida = seleccion[r.id] ?? "";
                                return (
                                  <div key={r.id} data-testid={`ronda-${r.ronda}`} style={{ backgroundColor: "white", borderRadius: 10, padding: "10px 12px", border: `1px solid ${r.correccion ? "#fcd34d" : "#f1f5f9"}` }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{fillArbitro(ta.roundLabel, { n: r.ronda })}: {r.equipoPregunta} → {r.equipoResponde}</span>
                                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: b.color, backgroundColor: b.bg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>{b.icon} {b.label}</span>
                                        {r.correccion && (
                                          <span data-testid="badge-corregido" style={{ fontSize: 12, fontWeight: 700, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>🛠️ {ta.correctedByTeacher}</span>
                                        )}
                                      </span>
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>{r.pregunta}</div>
                                    <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
                                      <strong>{ta.splitLabel}:</strong> {repartoTxt(r, r.reparto)}
                                    </div>
                                    {r.correccion && (
                                      <div style={{ marginTop: 4, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                                        {fillArbitro(ta.correctedDetail, {
                                          original: repartoTxt(r, r.correccion.repartoOriginal),
                                          nuevo: repartoTxt(r, r.correccion.repartoNuevo),
                                          fecha: new Date(r.correccion.fecha).toLocaleDateString(locale),
                                        })}
                                      </div>
                                    )}
                                    {r.disputa && (
                                      <div style={{ marginTop: 6, fontSize: 12, color: "#7c3aed", backgroundColor: "#f5f3ff", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                                        <strong>⚖️ {ta.verdictLabel}:</strong> {r.disputa.veredicto}
                                        {r.disputa.explicacion && <div style={{ marginTop: 2 }}>{r.disputa.explicacion}</div>}
                                        <details style={{ marginTop: 4 }}>
                                          <summary style={{ cursor: "pointer", fontWeight: 700 }}>{ta.positionsLabel}</summary>
                                          <div style={{ marginTop: 4 }}>{r.disputa.posicionPregunta}</div>
                                          <div style={{ marginTop: 2 }}>{r.disputa.posicionResponde}</div>
                                        </details>
                                      </div>
                                    )}
                                    {r.disputa && rondasData.puedeCorregir && (
                                      <div data-noprint style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                                        <fieldset style={{ ...fieldsetReset, flex: "1 1 260px" }}>
                                          <legend style={{ ...legendReset, fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 3 }}>{ta.correctSplit}</legend>
                                          <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                            {OPCIONES_REPARTO.map(o => {
                                              const marcada = (elegida || actual) === o.key;
                                              return (
                                                <button key={o.key} type="button" aria-pressed={marcada} disabled={corrigiendo === r.id}
                                                  onClick={() => setSeleccion(prev => ({ ...prev, [r.id]: o.key === actual ? "" : o.key }))}
                                                  style={{ minHeight: 44, padding: "8px 10px", fontSize: 13, textAlign: "left", lineHeight: 1.3, borderRadius: 8, cursor: "pointer", border: `2px solid ${marcada ? "#3730a3" : "#cbd5e1"}`, backgroundColor: marcada ? "#eef2ff" : "white", color: marcada ? "#312e81" : "#1e293b", fontWeight: marcada ? 700 : 500 }}>
                                                  {marcada && <span aria-hidden="true">✓ </span>}{textoOpcion(o.key, r)}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </fieldset>
                                        <button onClick={() => corregirRonda(r)} disabled={!elegida || corrigiendo === r.id}
                                          style={{ minHeight: 44, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: !elegida || corrigiendo === r.id ? "#94a3b8" : "#3730a3", color: "white", fontWeight: 700, fontSize: 13, cursor: !elegida || corrigiendo === r.id ? "default" : "pointer" }}>
                                          {corrigiendo === r.id ? ta.correctSaving : ta.correctSave}
                                        </button>
                                      </div>
                                    )}
                                    {errorCorreccion?.id === r.id && (
                                      <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>⚠️ {errorCorreccion.msg}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: 12, color: PALETA.gris, fontStyle: "italic" }}>{ta.correctionNote}</div>
                    </div>
                  );
                })()}
              </Card>
            </div>
          )}

          {/* Reflexiones de los equipos — agrupadas por partida, porque una
              sola sesión puede tener 6-7 parejas jugando en simultáneo desde
              el mismo link */}
          {(loadingMeta || metacogniciones.length > 0) && (
            <Card title={`✍️ ${ta.panReflectionsTitle(metacogniciones.length)}`}>
              {loadingMeta ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{ta.panLoadingReflections}</p>
              ) : metacogniciones.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{ta.panNoReflections}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {metacogniciones.map((meta, idx) => {
                    // Modo competitivo
                    if (meta.modo === "competitivo" && meta.equipos) {
                      return (
                        <div key={meta.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>
                              {fillArbitro(ta.gameN, { n: idx + 1 })}
                            </h3>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              {meta.equipos.map(eq => `${eq.nombre} (${fmt(eq.puntos)})`).join(" vs ")}
                            </span>
                            {(() => {
                              const tp = totalDePartida(meta.partidaId);
                              if (!tp || !tp.equipos.some(e => e.puntosFinales !== e.puntosAlumnos)) return null;
                              return (
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 20, padding: "2px 8px" }}>
                                  🛠️ {ta.totalCorrected}: {tp.equipos.map(e => `${e.nombre} ${fmt(e.puntosFinales)}`).join(" · ")}
                                </span>
                              );
                            })()}
                          </div>
                          {meta.equipos.map((eq, i) => (
                            <div key={i} style={{ marginBottom: i < meta.equipos!.length - 1 ? 16 : 0, backgroundColor: "white", borderRadius: 10, padding: 12, border: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <div aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: eq.color }} />
                                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{eq.nombre}</h4>
                                <span style={{ fontSize: 12, color: PALETA.gris }}>{eq.integrantes}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginLeft: "auto" }}>{fmt(eq.puntos)} {ta.pointsAbbrev}</span>
                              </div>
                              {[
                                { label: ta.panQ1, val: eq.respuestas?.q1 },
                                { label: ta.panQ2, val: eq.respuestas?.q2 },
                                { label: ta.panQ3, val: eq.respuestas?.q3 },
                                { label: ta.panQ4, val: eq.respuestas?.q4 },
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
                              <h4 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                {ta.panRoundDetail(meta.registros.length)}
                              </h4>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {meta.registros.map((r, k) => {
                                  const calBadge = badgeCalificacion(r.calificacion);
                                  return (
                                    <div key={k} style={{ backgroundColor: "white", borderRadius: 8, padding: "8px 12px", border: "1px solid #f1f5f9" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                                          {fillArbitro(ta.roundLabel, { n: r.ronda })}: {r.equipoPregunta} → {r.equipoResponde}
                                        </span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: calBadge.color, backgroundColor: calBadge.bg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>
                                          {calBadge.icon} {calBadge.label} ({fmt(r.puntos)} {ta.pointsAbbrev})
                                        </span>
                                      </div>
                                      {r.fueAlArbitro ? (
                                        <div style={{ marginTop: 6, fontSize: 12, color: "#7c3aed", backgroundColor: "#f5f3ff", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                                          <strong>{ta.panWentToReferee}</strong>
                                          {r.pregunta && <div style={{ marginTop: 2 }}>{fillArbitro(ta.panQuestionColon, { text: r.pregunta })}</div>}
                                          {r.veredictoArbitro && <div style={{ marginTop: 2 }}>{fillArbitro(ta.panVerdictColon, { text: r.veredictoArbitro })}</div>}
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
                      { label: ta.panQ1s, val: r?.aprendizaje },
                      { label: ta.panQ2, val: r?.dificultad },
                      { label: ta.panQ3, val: r?.preguntaPendiente },
                      { label: ta.panQ4s, val: r?.ensenanza },
                    ].filter(p => p.val?.trim());

                    return (
                      <div key={meta.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>
                            #{idx + 1}
                          </h3>
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
          <DialogoEnPagina onCerrar={() => setMostrarTexto(false)} idTitulo="panel-texto-titulo" extra={{ "data-noprint": true }}
            style={{
              position: "fixed", inset: 0, backgroundColor: "white",
              zIndex: 9999, overflow: "auto", padding: "48px 10%",
              fontFamily: "'Georgia', serif",
            }}>
            <button
              type="button"
              data-autofocus
              onClick={() => setMostrarTexto(false)}
              style={{
                position: "fixed", top: 20, right: 24,
                padding: "10px 20px", borderRadius: 10,
                border: "2px solid #e2e8f0", backgroundColor: "white",
                fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#64748b",
              }}>
              {ta.panCloseX}
            </button>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <h2 id="panel-texto-titulo" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: PALETA.gris, textTransform: "uppercase", letterSpacing: "1px" }}>
                {materiaDe(sesionSeleccionada.materia)} · {sesionSeleccionada.tema}
              </h2>
              <div style={{ fontSize: 20, lineHeight: 1.9, color: "#1e293b", whiteSpace: "pre-wrap" }}>
                {sesionSeleccionada.textoFuente}
              </div>
            </div>
          </DialogoEnPagina>
        )}
      </main>
    );
  }

  // ── Vista lista de sesiones ─────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#3730a3)", padding: "24px", color: "white", position: "relative" }}>
        <style>{`@media (max-width: 560px) { .pan-sel { position: static !important; margin-bottom: 10px; } .pan-h1 { padding-right: 0 !important; } }`}</style>
        <div className="pan-sel" style={{ position: "absolute", top: 14, right: 16, zIndex: 10 }}>
          <LanguageSelector compact tone="onColor" />
        </div>
        <h1 className="pan-h1" style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, paddingRight: 90 }}>{ta.panTitle}</h1>
        <p style={{ margin: 0, fontSize: 13 }}>{ta.panSubtitle}</p>
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
              {loadingAdmin ? ta.panAdminLoading : modoAdmin ? ta.panAdminBack : ta.panAdminAll}
            </button>
            {modoAdmin && (
              <div style={{ fontSize: 12, color: "#7c3aed", textAlign: "center", marginTop: 4 }}>
                {ta.panAdminShowing}
              </div>
            )}
          </div>
        )}

        <div role="status" aria-live="polite">
          {(loading || authLoading) && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
              {ta.panLoadingSessions}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 20, border: "1px solid #fecaca" }}>
            <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        {!loading && !authLoading && !error && (modoAdmin ? todasSesiones : sesiones).length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 15, fontWeight: 600 }}>{ta.panNoSessions}</p>
            <p style={{ fontSize: 13 }}>{ta.panNoSessionsHint}</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(modoAdmin ? todasSesiones : sesiones).map(sesion => {
            const c = coloresArea(sesion.area);
            const fecha = new Date(sesion.creadoEn).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
            return (
              <div key={sesion.id}
                style={{ backgroundColor: "white", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  <div style={{ width: 6, background: c.gradient, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{materiaDe(sesion.materia)}</h2>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{sesion.tema}</div>
                        <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 4 }}>
                          {nivelDe(sesion.nivel)} · {sesion.anio} · {fecha}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        {!!sesion.partidasCount && (
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            backgroundColor: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", whiteSpace: "nowrap",
                          }}>
                            {ta.panGamesCount(sesion.partidasCount)}
                          </span>
                        )}
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          backgroundColor: sesion.tieneInforme ? "#dcfce7" : "#f1f5f9",
                          color: sesion.tieneInforme ? "#166534" : PALETA.grisOscuro,
                          border: `1px solid ${sesion.tieneInforme ? "#86efac" : "#e2e8f0"}`,
                          whiteSpace: "nowrap",
                        }}>
                          {sesion.tieneInforme ? ta.panWithReport : ta.panNoReport}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      {sesion.textoFuente && (
                        <button onClick={() => mostrarTextoDesdeLista(sesion)}
                          style={{ padding: "8px 16px", borderRadius: 8, border: `2px solid ${c.primary}`, backgroundColor: "white", color: c.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          {ta.panGroupReading}
                        </button>
                      )}
                      <button onClick={() => verInforme(sesion)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: c.gradient, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        {sesion.tieneInforme ? ta.panViewReport : ta.panGenerateReport}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// El título de cada tarjeta es un encabezado: h2 por defecto (los h3 de adentro, como «Partida 1», cuelgan de él).
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{title}</h2>
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </section>
  );
}
