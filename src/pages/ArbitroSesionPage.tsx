import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useArbitroT, useIdiomaSesion, useLocaleArbitro, useTituloPagina, fillArbitro } from "../i18n";
import { nombreVisible } from "../utils/arbitroNombres";
import { esIaNoDisponible, esRespuestaNoClara, esSesionExpirada, textoErrorArbitro } from "../utils/arbitroErrores";
import { useParams } from "react-router-dom";
import { app } from "../firebase.config";
import { PALETA } from "../utils/arbitroPalette";
import { coloresArea } from "../utils/arbitroAreas";
import { srOnly } from "../utils/arbitroA11y";
import "../utils/arbitroA11y.css";

interface SesionData {
  area?: string;
  materia: string;
  nivel: string;
  anio: string;
  tema: string;
  subtema?: string;
  ejercicio?: string;
  expiresAt: string;
  idioma?: string; // 'es' | 'en'; las sesiones viejas no lo traen (= 'es')
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

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ArbitroSesionPage() {
  const ta = useArbitroT();
  const locale = useLocaleArbitro(); // fechas y números según el idioma (es-AR / en-US)
  const veredictoLabel: Record<string, string> = {
    A:                 ta.sesVerdictA,
    B:                 ta.sesVerdictB,
    ambas_correctas:   ta.sesVerdictBothPartial,
    ambas_incorrectas: ta.sesVerdictNone,
  };
  useTituloPagina(`${ta.sesTitle} — ${ta.pageTitleSuffix}`);
  const { sessionId } = useParams<{ sessionId: string }>();

  const [sesion,        setSesion]        = useState<SesionData | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [sesionError,   setSesionError]   = useState<string | null>(null);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  // El idioma de la pantalla (interfaz y <html lang>) sale de la sesión, no del navegador.
  useIdiomaSesion(sesion?.idioma, !!sesion);
  // Materia y nivel en el idioma de la pantalla (lo guardado sigue siendo el nombre en español).
  const materiaV = nombreVisible(ta.materiaNames, sesion?.materia);
  const nivelV = nombreVisible(ta.levelNames, sesion?.nivel);
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
      .catch((err)     => { setSesionError(textoErrorArbitro(err, ta, err.message)); setSesionExpirada(esSesionExpirada(err)); setLoadingSesion(false); });
  }, [sessionId]);

  // ── Veredicto ────────────────────────────────────────────────────────────────
  const handleVeredicto = async () => {
    if (!conflicto.trim() || !posicionA.trim() || !posicionB.trim()) {
      setErrorV(ta.sesErrFillAll);
      return;
    }
    if (posicionA.trim() === posicionB.trim()) {
      setErrorV(ta.sesErrSamePositions);
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
      // El texto sale del código del error, no del mensaje del servidor.
      if (esIaNoDisponible(err)) setErrorV(ta.aiUnavailable);
      else if (esRespuestaNoClara(err)) setErrorV(ta.errorNoClearAnswer);
      else setErrorV(fillArbitro(ta.sesErrConsult, { detail: textoErrorArbitro(err, ta, err.message) }));
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
      setErrorIdentificacion(ta.sesErrName);
      return;
    }
    setIdentificado(true);
  };

  // ── Texto copiable del resumen ────────────────────────────────────────────────
  const buildResumenTexto = () => {
    if (!sesion) return "";
    const header = `${ta.sesSummaryTitle}\n${nombreEquipo ? fillArbitro(ta.sesSummaryTeam, { team: nombreEquipo }) : ""}${nombreAlumno}\n${fillArbitro(ta.sesSummarySubject, { materia: materiaV, tema: sesion.tema })}\n${"─".repeat(50)}\n`;
    const cuerpo = interacciones.map((ix, i) => [
      fillArbitro(ta.sesSummaryQuery, { n: i + 1 }),
      fillArbitro(ta.sesSummaryDisagreement, { text: ix.conflicto }),
      fillArbitro(ta.sesSummaryPosA, { text: ix.posicionA }),
      fillArbitro(ta.sesSummaryPosB, { text: ix.posicionB }),
      fillArbitro(ta.sesSummaryVerdict, { text: veredictoLabel[ix.veredicto.resultado] }),
      fillArbitro(ta.sesSummaryExplanation, { text: ix.veredicto.explicacion }),
    ].join("\n")).join("\n\n");
    const footer = `\n${"─".repeat(50)}\n${ta.sesSummaryFooter}`;
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
      <main style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <div role="status"><h1 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 600 }}>{ta.sesLoading}</h1></div>
      </main>
    );
  }

  if (sesionError || !sesion) {
    return (
      <main style={{ ...pageStyle, alignItems: "center", justifyContent: "center" }}>
        <div role="alert" style={{ backgroundColor: "white", borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center" }}>
          <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{ta.sesUnavailable}</h1>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            {sesionExpirada
              ? ta.sesExpired
              : ta.sesNotFound}
          </div>
        </div>
      </main>
    );
  }

  const colors = coloresArea(sesion.area);

  // ── Pantalla de identificación ───────────────────────────────────────────────
  if (!identificado) {
    return (
      <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflow: "hidden" }}>

          <div style={{ background: colors.gradient, padding: "24px 28px", color: "white" }}>
            <div aria-hidden="true" style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{ta.sesTitle}<span style={srOnly}>: {ta.sessionScreenIdentify}</span></h1>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>
              {materiaV} · {sesion.tema}
            </p>
          </div>

          <div style={{ padding: "28px" }}>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
              {ta.sesIdentifyIntro}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="sesion-nombre-alumno" style={labelStyle}>
                {ta.sesNameLabel} <span style={{ color: PALETA.rojo, fontWeight: 700 }}>({ta.required})</span>
              </label>
              <input
                id="sesion-nombre-alumno"
                type="text"
                required aria-required="true"
                aria-invalid={errorIdentificacion ? true : undefined}
                aria-describedby={errorIdentificacion ? "sesion-nombre-error" : undefined}
                value={nombreAlumno}
                onChange={e => { setNombreAlumno(e.target.value); setErrorIdentificacion(""); }}
                placeholder={ta.sesNamePlaceholder}
                onKeyDown={e => e.key === "Enter" && handleIdentificarse()}
                style={inputStyle}
              />
              {errorIdentificacion && (
                <p id="sesion-nombre-error" role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626" }}>{errorIdentificacion}</p>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="sesion-nombre-equipo" style={labelStyle}>
                {ta.sesTeamLabel} <span style={{ fontSize: 12, color: PALETA.gris, fontWeight: 400 }}>{ta.sesOptional}</span>
              </label>
              <input
                id="sesion-nombre-equipo"
                type="text"
                value={nombreEquipo}
                onChange={e => setNombreEquipo(e.target.value)}
                placeholder={ta.sesTeamPlaceholder}
                onKeyDown={e => e.key === "Enter" && handleIdentificarse()}
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleIdentificarse}
              style={{ width: "100%", padding: "13px", fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", background: colors.gradient, color: "white", cursor: "pointer" }}
            >
              {ta.sesEnter}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const veredictoColor = {
    A:                 { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    B:                 { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
    ambas_correctas:   { bg: "#fefce8", border: "#fde68a", text: "#92400e" },
    ambas_incorrectas: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  };

  return (
    <main style={{ ...pageStyle, background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)" }}>
      <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header ── */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          <div style={{ background: colors.gradient, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span aria-hidden="true" style={{ fontSize: 26 }}>⚖️</span>
              <div style={{ color: "white" }}>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{fillArbitro(ta.sesRefereeOf, { materia: materiaV })}<span style={srOnly}>: {ta.sessionScreenMain}</span></h1>
                <div style={{ fontSize: 12 }}>
                  {nivelV} {sesion.anio} · {sesion.tema}
                  {sesion.subtema ? ` — ${sesion.subtema}` : ""}
                </div>
              </div>
            </div>
            <button
              onClick={() => setInstrVisible(!instrVisible)} aria-expanded={instrVisible}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.8)", backgroundColor: "rgba(0,0,0,0.25)", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {instrVisible ? ta.sesHideInstr : ta.sesShowInstr}
            </button>
          </div>
        </div>

        {/* ── Instrucciones (colapsadas por defecto) ── */}
        {instrVisible && (
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: "18px 22px", border: `2px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: colors.primary }}>
              {ta.sesHowTitle}
            </h2>
            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.75 }}>
              <p style={{ margin: "0 0 10px" }}>
                {ta.sesHowIntro}{" "}
                <strong>{ta.sesHowIntroStrong}</strong>.
              </p>
              <div style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 10, border: "1px solid #e2e8f0" }}>
                <strong style={{ color: "#1e293b" }}>{ta.sesHowPlay}</strong>
                <ol style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9, color: "#374151" }}>
                  <li>{ta.sesStep1a} <strong>{ta.sesStep1b}</strong>{ta.sesStep1c}</li>
                  <li>{ta.sesStep2}</li>
                  <li>{ta.sesStep3}</li>
                  <li>{ta.sesStep4}</li>
                  <li>{ta.sesStep5}</li>
                  <li>{ta.sesStep6a} <strong>{ta.sesStep6b}</strong></li>
                </ol>
              </div>
              <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a" }}>
                <strong style={{ color: "#92400e" }}>{ta.sesBeforeTitle}</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9, color: "#78350f" }}>
                  <li>{ta.sesBefore1}</li>
                  <li>{ta.sesBefore2}</li>
                  <li>{ta.sesBefore3}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Material del docente ── */}
        {sesion.ejercicio && (
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: "18px 22px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              {ta.sesMaterial}
            </h2>
            <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {sesion.ejercicio}
            </div>
          </div>
        )}

        {/* ── Panel del árbitro ── */}
        <div role="status" style={srOnly}>{veredicto ? veredictoLabel[veredicto.resultado] : ""}</div>
        {!veredicto ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "2px solid #e2e8f0" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
              {ta.sesConsultTitle}
            </h2>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
              {ta.sesConsultHint} <strong style={{ color: "#475569" }}>{sesion.tema}</strong>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="sesion-conflicto" style={labelStyle}>{ta.sesConflictLabel}</label>
              <textarea id="sesion-conflicto" value={conflicto} onChange={e => setConflicto(e.target.value)} rows={2}
                placeholder={ta.sesConflictPlaceholder}
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
            </div>

            <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label htmlFor="sesion-posicion-a" style={{ ...labelStyle, color: "#1e40af" }}>
                  {ta.sesPosALabel} <span style={{ fontWeight: 400, color: "#64748b" }}>{ta.sesPosAHint}</span>
                </label>
                <textarea id="sesion-posicion-a" value={posicionA} onChange={e => setPosicionA(e.target.value)} rows={3}
                  placeholder={ta.sesPosPlaceholder}
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit", borderColor: posicionA ? "#93c5fd" : "#e2e8f0" }} />
              </div>
              <div>
                <label htmlFor="sesion-posicion-b" style={{ ...labelStyle, color: PALETA.verde }}>
                  {ta.sesPosBLabel} <span style={{ fontWeight: 400, color: "#64748b" }}>{ta.sesPosBHint}</span>
                </label>
                <textarea id="sesion-posicion-b" value={posicionB} onChange={e => setPosicionB(e.target.value)} rows={3}
                  placeholder={ta.sesPosPlaceholder}
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit", borderColor: posicionB ? "#86efac" : "#e2e8f0" }} />
              </div>
            </div>

            {errorV && (
              <div role="alert" style={{ padding: "10px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#b91c1c", border: "1px solid #fecaca", marginBottom: 12 }}>
                {errorV}
              </div>
            )}
            {/* La región viva está siempre en pantalla; lo que cambia es su contenido */}
            <div role="status" aria-live="polite">
              {loadingV && (
                <div style={{ padding: "14px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span aria-hidden="true" style={{ fontSize: 20 }}>⏳</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{ta.sesAnalyzing}</div>
                </div>
              )}
            </div>

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
              {loadingV ? ta.sesConsulting : ta.sesAskVerdict}
            </button>
          </div>
        ) : (
          /* ── Veredicto ── */
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: `2px solid ${veredictoColor[veredicto.resultado].border}` }}>

            <div style={{ backgroundColor: veredictoColor[veredicto.resultado].bg, borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: `1px solid ${veredictoColor[veredicto.resultado].border}` }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: veredictoColor[veredicto.resultado].text }}>
                {veredictoLabel[veredicto.resultado]}
              </h2>
              {veredicto.veredicto && (
                <div style={{ fontSize: 13, color: veredictoColor[veredicto.resultado].text, marginTop: 4 }}>
                  {veredicto.veredicto}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{ta.sesWhy}</h3>
              <div style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.75, backgroundColor: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                {veredicto.explicacion}
              </div>
            </div>

            <div style={{ backgroundColor: "#fefce8", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>{ta.sesKeepThinking}</h3>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.65 }}>{veredicto.paraSeguirPensando}</div>
            </div>

            <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ backgroundColor: "#eff6ff", borderRadius: 10, padding: "10px 14px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>{ta.sesPosAUpper}</div>
                <div style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.5 }}>{posicionA}</div>
              </div>
              <div style={{ backgroundColor: "#f0fdf4", borderRadius: 10, padding: "10px 14px", border: "1px solid #86efac" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4 }}>{ta.sesPosBUpper}</div>
                <div style={{ fontSize: 12, color: "#14532d", lineHeight: 1.5 }}>{posicionB}</div>
              </div>
            </div>

            <button onClick={handleNuevaConsulta} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, cursor: "pointer" }}>
              {ta.sesNewQuery}
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
              {fillArbitro(ta.sesViewMine, { n: interacciones.length })}
            </button>
          </div>
        )}

        {mostrarResumen && interacciones.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              {ta.sesMineTitle}
            </h2>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
              {nombreEquipo ? `${nombreEquipo} — ` : ""}{nombreAlumno}
            </p>
            <div style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: "10px 14px", border: "1px solid #fde68a", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                <strong>{ta.sesClassroomStrong}</strong> {ta.sesClassroomText}
              </p>
            </div>

            {interacciones.map((ix, i) => (
              <div key={i} style={{ marginBottom: 16, backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {fillArbitro(ta.sesQueryN, { n: i + 1 })}
                </h3>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{ta.sesDisagreementLabel}</span>
                  <span style={{ fontSize: 13, color: "#1e293b" }}>{ix.conflicto}</span>
                </div>
                <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ backgroundColor: "#eff6ff", borderRadius: 8, padding: "8px 10px", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 3 }}>{ta.sesPosAUpper}</div>
                    <div style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.4 }}>{ix.posicionA}</div>
                  </div>
                  <div style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: "8px 10px", border: "1px solid #86efac" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 3 }}>{ta.sesPosBUpper}</div>
                    <div style={{ fontSize: 12, color: "#14532d", lineHeight: 1.4 }}>{ix.posicionB}</div>
                  </div>
                </div>
                <div style={{ backgroundColor: veredictoColor[ix.veredicto.resultado].bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${veredictoColor[ix.veredicto.resultado].border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: veredictoColor[ix.veredicto.resultado].text }}>
                    {veredictoLabel[ix.veredicto.resultado]}
                  </div>
                  <div style={{ fontSize: 12, color: veredictoColor[ix.veredicto.resultado].text, marginTop: 4, lineHeight: 1.4 }}>
                    {ix.veredicto.explicacion}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleCopiarResumen}
              style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: copiado ? PALETA.verde : colors.gradient, color: "white", cursor: "pointer", transition: "background 0.2s" }}
            >
              {copiado ? ta.sesCopied : ta.sesCopy}
            </button>
            <div role="status" style={srOnly}>{copiado ? ta.sesCopiedAnnounce : ""}</div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", fontSize: 12, color: "white", backgroundColor: "rgba(30,41,59,0.85)", borderRadius: 10, padding: "6px 12px", marginBottom: 16 }}>
          {fillArbitro(ta.sesFooter, {
            materia: materiaV,
            tema: sesion.tema,
            hora: new Date(sesion.expiresAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
          })}
        </div>

      </div>
    </main>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#374151" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b", boxSizing: "border-box" as const };
