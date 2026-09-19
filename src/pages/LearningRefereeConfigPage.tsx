import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { useGameMode } from "../contexts/GameModeContext";
import { app } from "../firebase.config";
import { getCourses, createCourseWork, type ClassroomCourse } from "../services/classroomService";

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

// ─── Areas & Subjects ──────────────────────────────────────────────────────────

const AREAS: Record<string, AreaConfig> = {
  "Exact and Natural Sciences": {
    emoji: "🔬",
    key: "exactas",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)",
    primary: "#0ea5e9",
    light: "#f0f9ff",
    border: "#bae6fd",
    materias: {
      "Mathematics":    { emoji: "📐", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a list of exercises from the unit, a problem to solve in groups..." },
      "Natural Science": { emoji: "🌿", niveles: ["Primaria"],              placeholder: "E.g.: a short text on the topic, images to observe and describe..." },
      "Biology":        { emoji: "🧬", niveles: ["Secundaria"],             placeholder: "E.g.: a diagram, an image to analyze, a fragment of scientific text..." },
      "Physics":        { emoji: "⚡", niveles: ["Secundaria"],             placeholder: "E.g.: an applied problem, a physical situation to analyze in groups..." },
      "Chemistry":      { emoji: "⚗️", niveles: ["Secundaria"],             placeholder: "E.g.: a chemical reaction, an element table, an experiment to discuss..." },
      "Technology":     { emoji: "⚙️", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a technological process, a technical object to analyze or design..." },
      "Computer Science": { emoji: "💻", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: an algorithm, a code snippet, a computational problem..." },
      "Statistics":     { emoji: "📊", niveles: ["Secundaria"],             placeholder: "E.g.: a data table, a graph to interpret, a set of results..." },
    },
  },

  "Social Sciences and Humanities": {
    emoji: "🌍",
    key: "sociales",
    gradient: "linear-gradient(135deg, #f97316 0%, #b45309 100%)",
    primary: "#f97316",
    light: "#fff7ed",
    border: "#fed7aa",
    materias: {
      "Social Studies":  { emoji: "🏛️", niveles: ["Primaria"],              placeholder: "E.g.: a map image, a simple historical source, a community situation..." },
      "History":         { emoji: "📜", niveles: ["Secundaria"],             placeholder: "E.g.: a primary source, a historical text fragment, a timeline..." },
      "Geography":       { emoji: "🗺️", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a map, an infographic, population or natural resource data..." },
      "Civics & Ethics": { emoji: "🤝", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a dilemma situation, a case to debate, a constitutional article..." },
      "Philosophy":      { emoji: "💭", niveles: ["Secundaria"],             placeholder: "E.g.: a philosophical fragment, an argument to analyze or refute..." },
      "Psychology":      { emoji: "🧠", niveles: ["Secundaria"],             placeholder: "E.g.: a case or situation to analyze, a concept to debate in groups..." },
      "Economics":       { emoji: "📈", niveles: ["Secundaria"],             placeholder: "E.g.: an economic chart, a market situation, data to interpret..." },
      "Law":             { emoji: "⚖️", niveles: ["Secundaria"],             placeholder: "E.g.: a legal article, a simplified legal case to debate..." },
      "Anthropology":    { emoji: "🏺", niveles: ["Secundaria"],             placeholder: "E.g.: a cultural description, a brief ethnographic text to analyze..." },
    },
  },

  "Communication and Languages": {
    emoji: "💬",
    key: "lenguajes",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    primary: "#8b5cf6",
    light: "#faf5ff",
    border: "#e9d5ff",
    materias: {
      "Language & Literature": { emoji: "📖", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a text to analyze, sentences to discuss, a literary fragment..." },
      "English":               { emoji: "🇬🇧", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a short text, a grammar exercise, vocabulary in context..." },
      "Portuguese":            { emoji: "🇧🇷", niveles: ["Secundaria"],             placeholder: "Ex: um texto curto, exercício de gramática, vocabulário em contexto..." },
      "French":                { emoji: "🇫🇷", niveles: ["Secundaria"],             placeholder: "Ex: un texte court, un exercice de grammaire, du vocabulaire en contexte..." },
      "Communication":         { emoji: "📡", niveles: ["Primaria", "Secundaria"],  placeholder: "E.g.: a news piece, an ad, a message to critically analyze..." },
      "Media & ICT":           { emoji: "🖥️", niveles: ["Primaria", "Secundaria"],  placeholder: "E.g.: a screenshot, a digital text, a technology-use situation..." },
      "Literature":            { emoji: "📚", niveles: ["Secundaria"],              placeholder: "E.g.: a literary fragment, a poem, a short story to analyze..." },
    },
  },

  "Art and Expression": {
    emoji: "🎨",
    key: "arte",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)",
    primary: "#f43f5e",
    light: "#fff1f2",
    border: "#fecdd3",
    materias: {
      "Visual Arts":      { emoji: "🎨", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: an image to analyze, visual elements to identify, a work of art..." },
      "Music":            { emoji: "🎵", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a score, musical concepts to debate, styles to compare..." },
      "Theater":          { emoji: "🎭", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a scene to analyze, a character to describe, dramatic text..." },
      "Physical Education": { emoji: "⚽", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a disputed game rule, a tactical situation, a health concept..." },
      "Dance":            { emoji: "💃", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a movement sequence, styles to compare, expression concepts..." },
      "Crafts & Design":  { emoji: "✂️", niveles: ["Primaria", "Secundaria"], placeholder: "E.g.: a production process, materials and techniques to analyze or compare..." },
    },
  },
};

const AREA_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(AREAS).map(([name, data]) => [data.key, name])
);

const GRADOS: Record<NivelKey, string[]> = {
  Primaria:   ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"],
  Secundaria: ["1st", "2nd", "3rd", "4th", "5th", "6th"],
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
    `Today we will practice: ${tema}\n\n` +
    `📋 How the session works:\n` +
    `1. Form groups of 3 to 6 people. You can make 2 or 3 teams, or compete individually.\n` +
    `2. Ask each other questions about the topic.\n` +
    `3. When someone answers correctly, that team or person scores 1 point.\n` +
    `4. Keep track of disputes and how you resolved them, to report back to your teacher.\n` +
    `5. If the group has a genuine disagreement they can't resolve alone, use the Referee in the app.\n` +
    `6. The Referee does NOT solve complete exercises — it only arbitrates genuine disagreements.\n` +
    `7. At the end of class, the team or person with the most points wins!`
  );
  const [material, setMaterial] = useState(ejercicio || "");
  const [informe, setInforme] = useState(
    `At the end of the session, each student writes:\n\n` +
    `1. What did you learn today about "${tema}"?\n` +
    `2. What was the hardest moment of the session? How did you resolve it?\n` +
    `3. What question do you still have unanswered?\n` +
    `4. What could you teach a classmate from what you learned today?\n\n` +
    `Then send it to your teacher.`
  );

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Learning Referee — ${materia} — ${tema}</title>
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
<h1>${areaConfig.emoji} Learning Referee — ${materia}</h1>
<div class="sub">${nivel} ${anio} · ${esc(tema)}</div>
<div class="sec"><div class="sec-title">📋 Instructions for students</div><div class="content">${esc(instrucciones)}</div></div>
<hr>
${material ? `<div class="sec"><div class="sec-title">📝 Working material</div><div class="content">${esc(material)}</div></div><hr>` : ""}
<div class="sec"><div class="sec-title">✍️ Final report instructions</div><div class="content">${esc(informe)}</div></div>
<div class="footer">thetrafficlightgame.com · Learning Referee</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 680, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ background: areaConfig.gradient, padding: "18px 24px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>📄 Printable document</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{materia} · {nivel} {anio} · {tema}</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "70vh", overflowY: "auto" }}>
          <div>
            <div style={sectionBadgeStyle}><span style={badgeNumStyle}>1</span> 📋 Instructions for students <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>— editable</span></div>
            <textarea value={instrucciones} onChange={e => setInstrucciones(e.target.value)} rows={9} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }} />
          </div>
          <div>
            <div style={sectionBadgeStyle}><span style={badgeNumStyle}>2</span> 📝 Working material <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>— optional, editable</span></div>
            <textarea value={material} onChange={e => setMaterial(e.target.value)} rows={5}
              placeholder="Paste here the text, exercises or prompts you want students to work on..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }} />
          </div>
          <div>
            <div style={sectionBadgeStyle}><span style={badgeNumStyle}>3</span> ✍️ Final report instructions <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 12 }}>— editable</span></div>
            <textarea value={informe} onChange={e => setInforme(e.target.value)} rows={7} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }} />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onClose} style={btnSecondary}>Close</button>
          <button onClick={handlePrint} style={{ padding: "11px 22px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: areaConfig.gradient, color: "white", cursor: "pointer" }}>
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LearningRefereeConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const { mode, getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const preselectedArea = AREA_BY_KEY[searchParams.get("area") || ""] || "";

  const [area, setArea] = useState(preselectedArea);
  const [materia, setMateria] = useState("");
  const [nivel, setNivel] = useState<NivelKey>("Secundaria");
  const [anio, setAnio] = useState("3rd");
  const [tema, setTema] = useState("");
  const [ejercicio, setEjercicio] = useState("");
  const [duracion, setDuracion] = useState<"clase" | "dia">("clase");
  const [showMaterial, setShowMaterial] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sesion, setSesion] = useState<{ id: string; link: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [cursos, setCursos] = useState<ClassroomCourse[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [creandoTarea, setCreandoTarea] = useState(false);
  const [tareaCreada, setTareaCreada] = useState(false);
  const [errorClassroom, setErrorClassroom] = useState("");

  // suppress unused warning
  void user;

  const areaConfig = area ? AREAS[area] : null;
  const headerGrad = areaConfig ? areaConfig.gradient : theme.primaryGradient;
  const accentColor = areaConfig ? areaConfig.primary : theme.primary;
  const isCoopetition = mode === "coopetition";

  const materiasDisponibles = areaConfig
    ? Object.entries(areaConfig.materias).filter(([, m]) => m.niveles.includes(nivel))
    : [];

  const currentPlaceholder = areaConfig && materia && areaConfig.materias[materia]
    ? areaConfig.materias[materia].placeholder
    : "Paste here the text or prompts for your students...";

  const handleAreaChange = (a: string) => { setArea(a); setMateria(""); setTema(""); setEjercicio(""); };
  const handleNivelChange = (n: NivelKey) => { setNivel(n); setAnio(GRADOS[n][2]); setMateria(""); setTema(""); };

  const handleGenerar = async () => {
    if (!area) { setError("Please select an area."); return; }
    if (!materia) { setError("Please select a subject."); return; }
    if (!tema.trim()) { setError("Please enter the session topic."); return; }
    setError(null); setLoading(true);
    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "crearSesionArbitro");
      const res = await fn({ area, materia, nivel, anio, tema: tema.trim(), subtema: "", ejercicio, duracion }) as {
        data: { id: string; link: string; expiresAt: string };
      };
      setSesion(res.data);
    } catch (err: any) {
      setError(`Error creating session: ${err.message}`);
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

  const handleClassroom = async () => {
    if (!sesion) return;
    setShowClassroomModal(true);
    setTareaCreada(false);
    setErrorClassroom("");
    setCargandoCursos(true);
    try {
      const lista = await getCourses();
      setCursos(lista);
    } catch (e: any) {
      setErrorClassroom(e.message);
    }
    setCargandoCursos(false);
  };

  const handleCrearTarea = async (cursoId: string, _cursoNombre: string) => {
    if (!sesion) return;
    setCreandoTarea(true);
    setErrorClassroom("");
    try {
      const instrucciones = [
        `⚖️ Learning Referee — ${materia} · ${tema}`,
        `${nivel} ${anio}`,
        "",
        "📋 HOW THE SESSION WORKS:",
        "1. Form groups of 3 to 6 people. You can make 2 or 3 teams, or compete individually.",
        "2. Ask each other questions about the topic.",
        "3. When someone answers correctly, that team or person scores 1 point.",
        "4. If the group has a genuine disagreement they can't resolve alone, use the Referee at the link below.",
        "5. The Referee does NOT solve complete exercises — it only arbitrates genuine disagreements.",
        "6. At the end of class, the team or person with the most points wins!",
        "",
        ejercicio ? `📝 WORKING MATERIAL:\n${ejercicio}\n` : "",
        "⚠️ IMPORTANT — YOUR INTERACTIONS WITH THE REFEREE ARE PART OF YOUR ASSESSMENT:",
        "Keep track of each disagreement you submitted, the group's positions, and the verdict you received.",
        "When the session ends, click 'Turn in' in Classroom and answer the following questions",
        "using your referee interactions as input:",
        "",
        "✍️ FINAL REPORT — answer these questions in your Classroom submission:",
        `1. What did you learn today about "${tema}"?`,
        "2. What was the hardest moment of the session? How did you resolve it?",
        "3. What question do you still have unanswered?",
        "4. What could you teach a classmate from what you learned today?",
        "",
        `🔗 Referee session link: ${sesion.link}`,
      ].filter(Boolean).join("\n");

      await createCourseWork(
        cursoId,
        `⚖️ Learning Referee — ${materia}: ${tema}`,
        instrucciones,
        sesion.link,
      );
      setTareaCreada(true);
    } catch (e: any) {
      setErrorClassroom(e.message);
    }
    setCreandoTarea(false);
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
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Learning Referee</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>
                  {area || "Configure a practice session for your class"}
                </p>
              </div>
            </div>
            <button onClick={() => navigate("/")} style={closeBtnStyle}>✕</button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "72vh", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* How it works — accordion */}
            <HowItWorksAccordionEN primary={accentColor} light={areaConfig ? areaConfig.light : "#f0f7ff"} border={areaConfig ? areaConfig.border : "#bfdbfe"} />

            {/* ── Area ── */}
            {preselectedArea ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 12,
                backgroundColor: areaConfig ? `${areaConfig.primary}12` : "#f0f7ff",
                border: `2px solid ${areaConfig ? areaConfig.primary : "#bfdbfe"}`,
              }}>
                <span style={{ fontSize: 28 }}>{areaConfig?.emoji}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 2 }}>
                    Learning Referee —
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: areaConfig?.primary }}>
                    {area}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Area of knowledge</label>
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
            )}

            {/* ── Level + Year ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Level</label>
                <div style={{ display: "flex", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {([["Primaria", "Primary"], ["Secundaria", "Secondary"]] as [NivelKey, string][]).map(([n, label]) => (
                    <button key={n} onClick={() => handleNivelChange(n)} style={{
                      flex: 1, padding: "10px", fontSize: 13, fontWeight: 600,
                      border: "none", cursor: "pointer",
                      backgroundColor: nivel === n ? accentColor : "white",
                      color: nivel === n ? "white" : "#475569",
                      transition: "all 0.2s",
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Year / Grade</label>
                <select value={anio} onChange={e => setAnio(e.target.value)} style={selectStyle}>
                  {GRADOS[nivel].map(g => <option key={g} value={g}>{g} grade</option>)}
                </select>
              </div>
            </div>

            {/* ── Subject ── */}
            {area && (
              <div>
                <label style={labelStyle}>Subject</label>
                {materiasDisponibles.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#94a3b8", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    No subjects available for this level in this area.
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

            {/* ── Topic ── */}
            {materia && (
              <div>
                <label style={labelStyle}>
                  Session topic <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text" value={tema} onChange={e => setTema(e.target.value)}
                  placeholder="Enter the topic students will work on today..."
                  style={{ ...inputStyle, borderColor: tema.trim() ? "#e2e8f0" : "#fca5a5", fontSize: 15 }}
                />
              </div>
            )}

            {/* ── Duration ── */}
            {tema.trim() && (
              <div>
                <label style={labelStyle}>Session duration</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { id: "clase" as const, label: "⏱️ Class period", desc: "Expires in 3 hours" },
                    { id: "dia"  as const, label: "📅 Full day",    desc: "Expires in 24 hours" },
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

            {/* ── Additional material (collapsible) ── */}
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
                  <span>📎 Additional material for students</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{showMaterial ? "▲ hide" : "▼ add"}</span>
                </button>
                {showMaterial && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                      Optional. Students will see it on their screen. If you prefer to hand it out on paper, leave it empty.
                    </p>
                    <textarea value={ejercicio} onChange={e => setEjercicio(e.target.value)} rows={4}
                      placeholder={currentPlaceholder}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                  </div>
                )}
              </div>
            )}

            {/* ── Printable document ── */}
            {tema.trim() && (
              <button onClick={() => setShowPrint(true)} style={{
                padding: "12px 16px", borderRadius: 12, width: "100%",
                border: `2px dashed ${accentColor}`,
                backgroundColor: `${accentColor}08`,
                color: accentColor, fontWeight: 700, fontSize: 13,
                cursor: "pointer", textAlign: "center" as const,
              }}>
                📄 Prepare printable document for the class
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
                <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Creating session…</div>
              </div>
            )}

            {/* ── Session created ── */}
            {sesion && (
              <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #86efac", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#166534", marginBottom: 4 }}>✅ Session created</div>
                <div style={{ fontSize: 12, color: "#15803d", marginBottom: 14 }}>
                  Expires: {new Date(sesion.expiresAt).toLocaleString("en-US")}
                </div>
                <div style={{ backgroundColor: "white", borderRadius: 10, border: "1px solid #bbf7d0", padding: "12px 14px", fontFamily: "monospace", fontSize: 13, color: "#166534", wordBreak: "break-all", marginBottom: 12 }}>
                  {sesion.link}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <button onClick={handleCopy} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "2px solid #86efac", backgroundColor: "white", color: "#166534", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {copied ? "✅ Copied!" : "📋 Copy link"}
                  </button>
                  <button onClick={handleClassroom} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "none", backgroundColor: "#1a73e8", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    📚 Share on Classroom
                  </button>
                </div>
                <button onClick={() => setShowPrint(true)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${accentColor}`, backgroundColor: `${accentColor}08`, color: accentColor, fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 6 }}>
                  📄 Printable document
                </button>

                <div style={{ marginTop: 14, padding: "14px 18px", backgroundColor: `${accentColor}18`, borderRadius: 12, border: `2px solid ${accentColor}40`, textAlign: "center" as const, boxShadow: `0 2px 8px ${accentColor}20` }}>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
                    Want to activate comprehension for <strong>the whole class</strong>?
                  </div>
                  <button onClick={() => navigate("/")} style={{ background: "none", border: `2px solid ${accentColor}`, borderRadius: 8, color: accentColor, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "7px 16px", backgroundColor: "white" }}>
                    {theme.icon} See {isCoopetition ? "The Coopetition Game" : "The Traffic Light Game"} →
                  </button>
                </div>

                <button onClick={() => setSesion(null)} style={{ background: "none", border: "none", color: "#15803d", textDecoration: "underline", fontSize: 12, marginTop: 8, cursor: "pointer" }}>
                  Create another session
                </button>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {!sesion && (
            <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => navigate("/")} style={btnSecondary}>← Back</button>
              <button onClick={handleGenerar} disabled={!canGenerate} style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none",
                background: canGenerate ? headerGrad : "#94a3b8",
                color: "white", cursor: canGenerate ? "pointer" : "not-allowed",
                minWidth: 200, opacity: canGenerate ? 1 : 0.7,
              }}>
                {loading ? "⏳ Creating…" : "⚖️ Generate practice session"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showClassroomModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}
          onClick={() => !creandoTarea && setShowClassroomModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)", padding: "18px 24px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>📚 Post on Google Classroom</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{materia} · {tema}</div>
              </div>
              {!creandoTarea && (
                <button onClick={() => setShowClassroomModal(false)}
                  style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", fontSize: 16, cursor: "pointer" }}>✕</button>
              )}
            </div>

            <div style={{ padding: 24 }}>
              {tareaCreada ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#166534" }}>Assignment created in Classroom!</p>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>Students can now see it in their course.</p>
                  <button onClick={() => setShowClassroomModal(false)}
                    style={{ marginTop: 20, padding: "10px 28px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "none", backgroundColor: "#1a73e8", color: "white", cursor: "pointer" }}>
                    Close
                  </button>
                </div>
              ) : errorClassroom ? (
                <div>
                  <div style={{ padding: "12px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
                    ⚠️ {errorClassroom}
                  </div>
                  <button onClick={() => { setErrorClassroom(""); handleClassroom(); }}
                    style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "2px solid #e2e8f0", backgroundColor: "white", cursor: "pointer" }}>
                    Retry
                  </button>
                </div>
              ) : cargandoCursos ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
                  ⏳ Loading your courses...
                </div>
              ) : cursos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b", fontSize: 14 }}>
                  No active courses found in your account.
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: "#475569" }}>
                    Choose the course where you want to post the assignment:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                    {cursos.map(curso => (
                      <button
                        key={curso.id}
                        onClick={() => handleCrearTarea(curso.id, curso.name)}
                        disabled={creandoTarea}
                        style={{ padding: "14px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", backgroundColor: "white", textAlign: "left" as const, cursor: creandoTarea ? "not-allowed" : "pointer", transition: "all 0.15s" }}
                        onMouseOver={e => { if (!creandoTarea) { e.currentTarget.style.borderColor = "#1a73e8"; e.currentTarget.style.backgroundColor = "#f0f7ff"; }}}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.backgroundColor = "white"; }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                          {creandoTarea ? "⏳ Creating assignment..." : `📚 ${curso.name}`}
                        </div>
                        {curso.section && (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{curso.section}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── HowItWorksAccordionEN ─────────────────────────────────────────────────────

function HowItWorksAccordionEN({ primary, light, border }: { primary: string; light: string; border: string }) {
  const [open, setOpen] = useState(false);
  const steps = [
    "The teacher configures the topic and the session is generated in seconds.",
    "Students receive a link and join in groups of 3 to 6.",
    "They debate, ask each other questions, and score points by answering correctly.",
    "If they have a genuine disagreement they can't resolve, they call the referee.",
    "The AI gives the verdict — and they go back to debating. The group is the protagonist.",
    "At the end, each student receives a summary of their interactions to copy into Classroom.",
  ];
  return (
    <div style={{ backgroundColor: light, borderRadius: 12, border: `1px solid ${border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderRadius: 12 }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>How does it work? <span style={{ fontWeight: 400, fontSize: 12, color: "#64748b" }}>— tap to see</span></span>
        <span style={{ fontSize: 16, color: primary, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${border}` }}>
          {steps.map((txt, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: `${primary}20`, color: primary, fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 12, color: "#1e3a5f", lineHeight: 1.55, paddingTop: 2 }}>{txt}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 12px", backgroundColor: "#fef9c3", borderRadius: 8, border: "1px solid #fde047", fontSize: 12, color: "#713f12", lineHeight: 1.6 }}>
            📚 <strong>Google Classroom report:</strong> the teacher posts an assignment with metacognition questions. Students respond using the summary of their referee interactions — the report goes directly to the teacher through Classroom.
          </div>
        </div>
      )}
    </div>
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
