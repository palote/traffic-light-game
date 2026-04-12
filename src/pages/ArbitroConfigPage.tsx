import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { useGameMode } from "../contexts/GameModeContext";
import { app } from "../firebase.config";

// ─── Types ─────────────────────────────────────────────────────────────────────

type NivelKey = "Primaria" | "Secundaria";

interface MateriaData {
  emoji: string;
  niveles: NivelKey[];
  placeholder: string;
}

interface AreaConfig {
  emoji: string;
  key: string;
  gradient: string;
  primary: string;
  light: string;
  border: string;
  materias: Record<string, MateriaData>;
}

// ─── Areas & Materias ──────────────────────────────────────────────────────────

const AREAS: Record<string, AreaConfig> = {
  "Ciencias Exactas y Naturales": {
    emoji: "🔬",
    key: "exactas",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)",
    primary: "#0ea5e9",
    light: "#f0f9ff",
    border: "#bae6fd",
    materias: {
      "Matemática":         { emoji: "📐", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una lista de ejercicios de la unidad, un problema para resolver en grupo..." },
      "Ciencias Naturales": { emoji: "🌿", niveles: ["Primaria"],               placeholder: "Ej: un texto corto sobre el tema, imágenes para observar y describir..." },
      "Biología":           { emoji: "🧬", niveles: ["Secundaria"],              placeholder: "Ej: un esquema, una imagen para analizar, un fragmento de texto científico..." },
      "Física":             { emoji: "⚡", niveles: ["Secundaria"],              placeholder: "Ej: un problema de aplicación, una situación física para analizar en grupo..." },
      "Química":            { emoji: "⚗️", niveles: ["Secundaria"],              placeholder: "Ej: una reacción química, una tabla de elementos, un experimento para discutir..." },
      "Tecnología":         { emoji: "⚙️", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un proceso tecnológico, un objeto técnico para analizar o diseñar..." },
      "Informática":        { emoji: "💻", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un algoritmo, un fragmento de código, un problema computacional..." },
      "Estadística":        { emoji: "📊", niveles: ["Secundaria"],              placeholder: "Ej: una tabla de datos, un gráfico para interpretar, un conjunto de resultados..." },
    },
  },

  "Ciencias Sociales y Humanidades": {
    emoji: "🌍",
    key: "sociales",
    gradient: "linear-gradient(135deg, #f97316 0%, #b45309 100%)",
    primary: "#f97316",
    light: "#fff7ed",
    border: "#fed7aa",
    materias: {
      "Ciencias Sociales":           { emoji: "🏛️", niveles: ["Primaria"],               placeholder: "Ej: una imagen de mapa, una fuente histórica simple, una situación de la comunidad..." },
      "Historia":                    { emoji: "📜", niveles: ["Secundaria"],               placeholder: "Ej: una fuente primaria, un fragmento de texto histórico, una línea de tiempo..." },
      "Geografía":                   { emoji: "🗺️", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un mapa, una infografía, datos de población o recursos naturales..." },
      "Formación Ética y Ciudadana": { emoji: "🤝", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una situación dilema, un caso para debatir, un artículo de la Constitución..." },
      "Filosofía":                   { emoji: "💭", niveles: ["Secundaria"],               placeholder: "Ej: un fragmento filosófico, un argumento para analizar o refutar..." },
      "Psicología":                  { emoji: "🧠", niveles: ["Secundaria"],               placeholder: "Ej: un caso o situación para analizar, un concepto para debatir en grupo..." },
      "Economía":                    { emoji: "📈", niveles: ["Secundaria"],               placeholder: "Ej: un gráfico económico, una situación de mercado, datos para interpretar..." },
      "Derecho":                     { emoji: "⚖️", niveles: ["Secundaria"],               placeholder: "Ej: un artículo legal, un caso jurídico simplificado para debatir..." },
      "Antropología":                { emoji: "🏺", niveles: ["Secundaria"],               placeholder: "Ej: una descripción cultural, un texto etnográfico breve para analizar..." },
    },
  },

  "Comunicación y Lenguajes": {
    emoji: "💬",
    key: "lenguajes",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    primary: "#8b5cf6",
    light: "#faf5ff",
    border: "#e9d5ff",
    materias: {
      "Lengua y Literatura": { emoji: "📖", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un texto para analizar, oraciones para discutir, fragmento literario..." },
      "Inglés":              { emoji: "🇬🇧", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: a short text, a grammar exercise, vocabulary in context..." },
      "Portugués":           { emoji: "🇧🇷", niveles: ["Secundaria"],              placeholder: "Ex: um texto curto, exercício de gramática, vocabulário em contexto..." },
      "Francés":             { emoji: "🇫🇷", niveles: ["Secundaria"],              placeholder: "Ex: un texte court, un exercice de grammaire, du vocabulaire en contexte..." },
      "Comunicación":        { emoji: "📡", niveles: ["Primaria", "Secundaria"],  placeholder: "Ej: una noticia, una publicidad, un mensaje para analizar críticamente..." },
      "TIC y Medios":        { emoji: "🖥️", niveles: ["Primaria", "Secundaria"],  placeholder: "Ej: una captura de pantalla, un texto digital, una situación de uso tecnológico..." },
      "Literatura":          { emoji: "📚", niveles: ["Secundaria"],              placeholder: "Ej: un fragmento literario, una poesía, un cuento para analizar..." },
    },
  },

  "Arte y Expresión": {
    emoji: "🎨",
    key: "arte",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)",
    primary: "#f43f5e",
    light: "#fff1f2",
    border: "#fecdd3",
    materias: {
      "Plástica / Artes Visuales": { emoji: "🎨", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una imagen para analizar, elementos visuales a identificar, una obra de arte..." },
      "Música":                    { emoji: "🎵", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una partitura, conceptos musicales para debatir, estilos para comparar..." },
      "Teatro":                    { emoji: "🎭", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una escena para analizar, un personaje para caracterizar, texto dramático..." },
      "Educación Física":          { emoji: "⚽", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una regla de juego en disputa, situación táctica, concepto de salud..." },
      "Danza":                     { emoji: "💃", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una secuencia de movimientos, estilos para comparar, conceptos de expresión..." },
      "Artesanía y Diseño":        { emoji: "✂️", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un proceso de producción, materiales y técnicas para analizar o comparar..." },
    },
  },
};

const AREA_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(AREAS).map(([name, data]) => [data.key, name])
);

const GRADOS: Record<NivelKey, string[]> = {
  Primaria:   ["1°", "2°", "3°", "4°", "5°", "6°", "7°"],
  Secundaria: ["1°", "2°", "3°", "4°", "5°", "6°"],
};

// ─── Print Modal ───────────────────────────────────────────────────────────────

interface PrintModalProps {
  materia: string;
  nivel: NivelKey;
  anio: string;
  tema: string;
  ejercicio: string;
  areaConfig: AreaConfig;
  onClose: () => void;
}

function PrintDocumentModal({ materia, nivel, anio, tema, ejercicio, areaConfig, onClose }: PrintModalProps) {
  const [instrucciones, setInstrucciones] = useState(
    `Hoy vamos a practicar: ${tema}\n\n` +
    `📋 Cómo funciona la sesión:\n` +
    `1. Formen grupos de 3 a 6 personas. Pueden armar 2 o 3 equipos, o competir individualmente.\n` +
    `2. Háganse preguntas sobre el tema entre ustedes.\n` +
    `3. Cuando alguien responde correctamente, ese equipo o persona anota 1 punto.\n` +
    `4. Vayan tomando registro de las disputas y cómo las resolvieron, para luego informárselo al profe.\n` +
    `5. Si el grupo tiene un desacuerdo genuino que no puede resolver solo, usen el Árbitro en la app.\n` +
    `6. El árbitro NO resuelve ejercicios completos: solo arbitra desacuerdos genuinos.\n` +
    `7. Al terminar la clase, el equipo o la persona con más puntos ¡gana!`
  );
  const [material, setMaterial] = useState(ejercicio || "");
  const [informe, setInforme] = useState(
    `Al terminar la sesión, cada uno escribe:\n\n` +
    `1. ¿Qué aprendiste hoy sobre "${tema}"?\n` +
    `2. ¿Cuál fue el momento más difícil de la sesión? ¿Cómo lo resolvieron?\n` +
    `3. ¿Qué pregunta te quedó sin responder todavía?\n` +
    `4. ¿En qué le podrías enseñar a otro compañero lo que aprendiste hoy?\n\n` +
    `Luego envialo a tu profesor.`
  );

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Árbitro de ${materia} — ${tema}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px;color:#1e293b}
  h1{font-size:22px;color:#1e293b;margin:0 0 4px}
  .sub{font-size:14px;color:#475569;margin-bottom:32px}
  .sec{margin-bottom:28px}
  .sec-title{font-size:13px;font-weight:700;color:#374151;padding:6px 12px;background:#f1f5f9;border-left:4px solid #6366f1;border-radius:0 6px 6px 0;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
  .content{font-size:13px;line-height:1.85;white-space:pre-wrap;color:#1e293b}
  hr{border:none;border-top:1px dashed #cbd5e1;margin:28px 0}
  .footer{margin-top:40px;font-size:11px;color:#94a3b8;text-align:center}
  @media print{body{padding:16px}}
</style></head><body>
<h1>${areaConfig.emoji} Árbitro de ${materia}</h1>
<div class="sub">${nivel} ${anio} · ${esc(tema)}</div>
<div class="sec"><div class="sec-title">📋 Instrucciones para los alumnos</div><div class="content">${esc(instrucciones)}</div></div>
<hr>
${material ? `<div class="sec"><div class="sec-title">📝 Material de trabajo</div><div class="content">${esc(material)}</div></div><hr>` : ""}
<div class="sec"><div class="sec-title">✍️ Instrucciones para el informe final</div><div class="content">${esc(informe)}</div></div>
<div class="footer">eljuegodelsemaforo.com · Árbitro de Aprendizaje</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 680, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ background: areaConfig.gradient, padding: "18px 24px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>📄 Documento imprimible</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{materia} · {nivel} {anio} · {tema}</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "70vh", overflowY: "auto" }}>
          <div>
            <div style={sectionBadgeStyle}><span style={badgeNumStyle}>1</span> 📋 Instrucciones para los alumnos <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>— editables</span></div>
            <textarea value={instrucciones} onChange={e => setInstrucciones(e.target.value)} rows={9} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }} />
          </div>
          <div>
            <div style={sectionBadgeStyle}><span style={badgeNumStyle}>2</span> 📝 Material de trabajo <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>— opcional, editable</span></div>
            <textarea value={material} onChange={e => setMaterial(e.target.value)} rows={5}
              placeholder="Pegá acá el texto, los ejercicios o las consignas que querés que trabajen los alumnos..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }} />
          </div>
          <div>
            <div style={sectionBadgeStyle}><span style={badgeNumStyle}>3</span> ✍️ Instrucciones para el informe final <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>— editables</span></div>
            <textarea value={informe} onChange={e => setInforme(e.target.value)} rows={7} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }} />
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <button onClick={onClose} style={btnSecondary}>Cerrar</button>
          <button onClick={handlePrint} style={{ padding: "11px 22px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: areaConfig.gradient, color: "white", cursor: "pointer" }}>
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ArbitroConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const preselectedArea = AREA_BY_KEY[searchParams.get("area") || ""] || "";

  const [area,         setArea]         = useState(preselectedArea);
  const [materia,      setMateria]      = useState("");
  const [nivel,        setNivel]        = useState<NivelKey>("Secundaria");
  const [anio,         setAnio]         = useState("3°");
  const [tema,         setTema]         = useState("");
  const [ejercicio,    setEjercicio]    = useState("");
  const [duracion,     setDuracion]     = useState<"clase" | "dia">("clase");
  const [showMaterial, setShowMaterial] = useState(false);
  const [showPrint,    setShowPrint]    = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [sesion,  setSesion]  = useState<{ id: string; link: string; expiresAt: string } | null>(null);
  const [copied,  setCopied]  = useState(false);

  const areaConfig    = area ? AREAS[area] : null;
  const headerGrad    = areaConfig ? areaConfig.gradient : theme.primaryGradient;
  const accentColor   = areaConfig ? areaConfig.primary  : theme.primary;

  const materiasDisponibles = areaConfig
    ? Object.entries(areaConfig.materias).filter(([, m]) => m.niveles.includes(nivel))
    : [];

  const currentPlaceholder = areaConfig && materia && areaConfig.materias[materia]
    ? areaConfig.materias[materia].placeholder
    : "Pegá acá el texto o las consignas para los alumnos...";

  const handleAreaChange = (a: string) => { setArea(a); setMateria(""); setTema(""); setEjercicio(""); };
  const handleNivelChange = (n: NivelKey) => { setNivel(n); setAnio(GRADOS[n][2]); setMateria(""); setTema(""); };

  const handleGenerar = async () => {
    if (!area)        { setError("Elegí un área."); return; }
    if (!materia)     { setError("Elegí una materia."); return; }
    if (!tema.trim()) { setError("Escribí el tema de la sesión."); return; }
    setError(null); setLoading(true);
    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "crearSesionArbitro");
      const res = await fn({ area, materia, nivel, anio, tema: tema.trim(), subtema: "", ejercicio, duracion }) as {
        data: { id: string; link: string; expiresAt: string };
      };
      setSesion(res.data);
    } catch (err: any) {
      setError(`Error al crear la sesión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!sesion) return;
    await navigator.clipboard.writeText(sesion.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClassroom = () => {
    if (!sesion) return;
    const text = encodeURIComponent(
      `Árbitro de ${materia} — ${tema}\n\n` +
      (ejercicio ? `Material:\n${ejercicio}\n\n` : "") +
      `Link de la sesión: ${sesion.link}`
    );
    window.open(`https://classroom.google.com/share?url=${sesion.link}&title=${text}`, "_blank");
  };

  const canGenerate = !!area && !!materia && !!tema.trim() && !loading;

  return (
    <>
      {showPrint && tema && areaConfig && (
        <PrintDocumentModal
          materia={materia} nivel={nivel} anio={anio}
          tema={tema} ejercicio={ejercicio}
          areaConfig={areaConfig} onClose={() => setShowPrint(false)}
        />
      )}

      <div style={pageStyle}>
        <div style={cardStyle}>

          {/* ── Header ── */}
          <div style={{ background: headerGrad, padding: "20px 28px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{areaConfig ? areaConfig.emoji : "⚖️"}</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Árbitro de Aprendizaje</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>
                  {area || "Seleccioná un área para comenzar"}
                </p>
              </div>
            </div>
            <button onClick={() => navigate("/")} style={closeBtnStyle}>✕</button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "72vh", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Descripción breve */}
            <div style={{ padding: "12px 16px", backgroundColor: areaConfig ? areaConfig.light : "#f0f7ff", borderRadius: 12, border: `1px solid ${areaConfig ? areaConfig.border : "#bfdbfe"}` }}>
              <p style={{ margin: 0, fontSize: 12, color: "#1e3a5f", lineHeight: 1.65 }}>
                Los alumnos trabajan en grupos: debaten, se hacen preguntas y acumulan puntos.
                La IA solo interviene cuando hay un <strong>desacuerdo genuino</strong> que el grupo no puede resolver solo.{" "}
                <strong>El objetivo es que interactúen entre ellos, no con la IA.</strong>
              </p>
            </div>

            {/* ── Área ── */}
            <div>
              <label style={labelStyle}>Área del conocimiento</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(AREAS).map(([nombre, cfg]) => (
                  <button key={nombre} onClick={() => handleAreaChange(nombre)} style={{
                    padding: "16px 12px", borderRadius: 14, cursor: "pointer", textAlign: "center" as const,
                    border: `2px solid ${area === nombre ? cfg.primary : "#e2e8f0"}`,
                    backgroundColor: area === nombre ? `${cfg.primary}15` : "white",
                    transition: "all 0.15s",
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 5 }}>{cfg.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: area === nombre ? cfg.primary : "#475569", lineHeight: 1.3 }}>
                      {nombre}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Nivel + Año ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nivel</label>
                <div style={{ display: "flex", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {(["Primaria", "Secundaria"] as NivelKey[]).map(n => (
                    <button key={n} onClick={() => handleNivelChange(n)} style={{
                      flex: 1, padding: "10px", fontSize: 13, fontWeight: 600,
                      border: "none", cursor: "pointer",
                      backgroundColor: nivel === n ? accentColor : "white",
                      color: nivel === n ? "white" : "#475569",
                      transition: "all 0.2s",
                    }}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Año / Grado</label>
                <select value={anio} onChange={e => setAnio(e.target.value)} style={selectStyle}>
                  {GRADOS[nivel].map(g => <option key={g} value={g}>{g} año</option>)}
                </select>
              </div>
            </div>

            {/* ── Materia ── */}
            {area && (
              <div>
                <label style={labelStyle}>Materia</label>
                {materiasDisponibles.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#94a3b8", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    No hay materias para {nivel} en esta área.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                    {materiasDisponibles.map(([nombre, data]) => (
                      <button key={nombre} onClick={() => setMateria(nombre)} style={{
                        padding: "11px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center" as const,
                        border: `2px solid ${materia === nombre ? accentColor : "#e2e8f0"}`,
                        backgroundColor: materia === nombre ? `${accentColor}15` : "white",
                      }}>
                        <div style={{ fontSize: 17, marginBottom: 3 }}>{data.emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: materia === nombre ? accentColor : "#1e293b", lineHeight: 1.3 }}>
                          {nombre}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tema (texto libre) ── */}
            {materia && (
              <div>
                <label style={labelStyle}>
                  Tema de la sesión <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text" value={tema} onChange={e => setTema(e.target.value)}
                  placeholder="Escribí el tema que van a trabajar hoy..."
                  style={{ ...inputStyle, borderColor: tema.trim() ? "#e2e8f0" : "#fca5a5", fontSize: 15 }}
                />
              </div>
            )}

            {/* ── Duración ── */}
            {tema.trim() && (
              <div>
                <label style={labelStyle}>Duración de la sesión</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { id: "clase" as const, label: "⏱️ Clase", desc: "Expira en 3 horas" },
                    { id: "dia"   as const, label: "📅 Día",   desc: "Expira en 24 horas" },
                  ]).map(d => (
                    <button key={d.id} onClick={() => setDuracion(d.id)} style={{
                      padding: "12px 16px", borderRadius: 12, textAlign: "left" as const,
                      border: `2px solid ${duracion === d.id ? accentColor : "#e2e8f0"}`,
                      backgroundColor: duracion === d.id ? `${accentColor}12` : "white",
                      cursor: "pointer",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: duracion === d.id ? accentColor : "#1e293b" }}>{d.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Material adicional (colapsable) ── */}
            {tema.trim() && (
              <div>
                <button onClick={() => setShowMaterial(!showMaterial)} style={{
                  width: "100%", padding: "11px 16px", borderRadius: 10, textAlign: "left" as const,
                  border: `1px solid ${showMaterial ? accentColor : "#e2e8f0"}`,
                  backgroundColor: showMaterial ? `${accentColor}08` : "#f8fafc",
                  color: showMaterial ? accentColor : "#475569",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>📎 Material adicional para los alumnos</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{showMaterial ? "▲ ocultar" : "▼ agregar"}</span>
                </button>
                {showMaterial && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                      Opcional. Los alumnos lo verán en su pantalla. Si preferís darlo en papel, dejalo vacío.
                    </p>
                    <textarea value={ejercicio} onChange={e => setEjercicio(e.target.value)} rows={4}
                      placeholder={currentPlaceholder}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                  </div>
                )}
              </div>
            )}

            {/* ── Documento imprimible ── */}
            {tema.trim() && (
              <button onClick={() => setShowPrint(true)} style={{
                padding: "12px 16px", borderRadius: 12, width: "100%",
                border: `2px dashed ${accentColor}`,
                backgroundColor: `${accentColor}08`,
                color: accentColor, fontWeight: 700, fontSize: 13,
                cursor: "pointer", textAlign: "center" as const,
              }}>
                📄 Preparar documento imprimible para la clase
              </button>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: "12px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626", border: "1px solid #fecaca" }}>
                {error}
              </div>
            )}

            {loading && (
              <div style={{ padding: "14px 18px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>⏳</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Creando sesión…</div>
              </div>
            )}

            {/* ── Sesión creada ── */}
            {sesion && (
              <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #86efac", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#166534", marginBottom: 4 }}>✅ Sesión creada</div>
                <div style={{ fontSize: 12, color: "#15803d", marginBottom: 14 }}>
                  Expira: {new Date(sesion.expiresAt).toLocaleString("es-AR")}
                </div>
                <div style={{ backgroundColor: "white", borderRadius: 10, border: "1px solid #bbf7d0", padding: "12px 14px", fontFamily: "monospace", fontSize: 13, color: "#166534", wordBreak: "break-all", marginBottom: 12 }}>
                  {sesion.link}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <button onClick={handleCopy} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "2px solid #86efac", backgroundColor: "white", color: "#166534", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {copied ? "✅ Copiado" : "📋 Copiar link"}
                  </button>
                  <button onClick={handleClassroom} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "none", backgroundColor: "#1a73e8", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    📚 Compartir en Classroom
                  </button>
                </div>
                <button onClick={() => setShowPrint(true)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${accentColor}`, backgroundColor: `${accentColor}08`, color: accentColor, fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 6 }}>
                  📄 Documento imprimible
                </button>

                {/* Link a la dinámica completa */}
                <div style={{
                  marginTop: 14, padding: "12px 16px",
                  backgroundColor: `${accentColor}08`,
                  borderRadius: 10,
                  border: `1px solid ${accentColor}30`,
                  textAlign: "center" as const
                }}>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                    ¿Querés completar la dinámica con el juego para toda la clase?
                  </div>
                  <button
                    onClick={() => window.location.href = "/"}
                    style={{
                      background: "none", border: "none",
                      color: accentColor, fontWeight: 700,
                      fontSize: 13, cursor: "pointer",
                      textDecoration: "underline", padding: 0
                    }}>
                    {theme.icon} Ver El Juego del Semáforo →
                  </button>
                </div>

                <button onClick={() => setSesion(null)} style={{ background: "none", border: "none", color: "#15803d", textDecoration: "underline", fontSize: 12, marginTop: 8, cursor: "pointer" }}>
                  Crear otra sesión
                </button>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {!sesion && (
            <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => navigate("/")} style={btnSecondary}>← Volver</button>
              <button onClick={handleGenerar} disabled={!canGenerate} style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none",
                background: canGenerate ? headerGrad : "#94a3b8",
                color: "white", cursor: canGenerate ? "pointer" : "not-allowed",
                minWidth: 200, opacity: canGenerate ? 1 : 0.7,
              }}>
                {loading ? "⏳ Creando…" : "⚖️ Generar sesión de práctica"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const cardStyle: React.CSSProperties = { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 700, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#475569" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", fontSize: 14, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", outline: "none", boxSizing: "border-box" as const };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", appearance: "auto" as any };
const btnSecondary: React.CSSProperties = { padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", cursor: "pointer" };
const closeBtnStyle: React.CSSProperties = { background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const sectionBadgeStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 };
const badgeNumStyle: React.CSSProperties = { background: "#e0e7ff", color: "#4f46e5", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 };