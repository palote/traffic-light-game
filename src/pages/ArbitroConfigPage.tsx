import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { useGameMode } from "../contexts/GameModeContext";
import { app } from "../firebase.config";

// ─── Temas por materia y nivel ────────────────────────────────────────────────

const TEMAS: Record<string, Record<string, string[]>> = {
  Lengua: {
    Primaria: [
      "Separación en sílabas",
      "Sílaba tónica y átona",
      "Acentuación (aguda, grave, esdrújula)",
      "Uso de tilde",
      "Mayúsculas y minúsculas",
      "Signos de puntuación",
      "Sustantivos (propios y comunes)",
      "Adjetivos calificativos",
      "Verbos (presente, pasado, futuro)",
      "Sinónimos y antónimos",
      "Familias de palabras",
      "Comprensión lectora",
      "Tipos de texto (narrativo, descriptivo, instructivo)",
      "Conectores temporales",
      "Sujeto y predicado",
    ],
    Secundaria: [
      "Análisis sintáctico simple (sujeto y predicado)",
      "Análisis sintáctico exhaustivo (OD, OI, circunstanciales)",
      "Oraciones compuestas (coordinadas y subordinadas)",
      "Voz activa y pasiva",
      "Modos verbales (indicativo, subjuntivo, imperativo)",
      "Figuras retóricas (metáfora, comparación, hipérbole)",
      "Tipos de narrador",
      "Géneros discursivos",
      "Texto argumentativo",
      "Cohesión y coherencia textual",
      "Registro formal e informal",
      "Conectores y marcadores discursivos",
      "Comprensión lectora compleja",
      "Etimología y familias léxicas",
      "Variedades del español",
    ],
  },
  Matemática: {
    Primaria: [
      "Sumas y restas",
      "Tablas de multiplicar",
      "División exacta e inexacta",
      "Fracciones",
      "Números decimales",
      "Porcentajes básicos",
      "Geometría: figuras planas",
      "Perímetro y área",
      "Medidas y conversiones",
      "Números romanos",
      "Múltiplos y divisores",
      "Sistema de numeración posicional",
      "Resolución de problemas",
      "Estimación y redondeo",
    ],
    Secundaria: [
      "Ecuaciones de 1° grado",
      "Ecuaciones de 2° grado",
      "Sistemas de ecuaciones",
      "Funciones lineales",
      "Funciones cuadráticas",
      "Funciones exponenciales y logarítmicas",
      "Trigonometría",
      "Números reales e irracionales",
      "Polinomios y operaciones",
      "Factorización",
      "Estadística descriptiva",
      "Probabilidad",
      "Geometría analítica",
      "Progresiones aritméticas y geométricas",
    ],
  },
};

const GRADOS: Record<string, string[]> = {
  Primaria: ["1°", "2°", "3°", "4°", "5°", "6°", "7°"],
  Secundaria: ["1°", "2°", "3°", "4°", "5°", "6°"],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArbitroConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [materia,  setMateria]  = useState<"Lengua" | "Matemática">("Lengua");
  const [nivel,    setNivel]    = useState<"Primaria" | "Secundaria">("Secundaria");
  const [anio,     setAnio]     = useState("3°");
  const [tema,     setTema]     = useState("");
  const [subtema,  setSubtema]  = useState("");
  const [ejercicio,setEjercicio]= useState("");
  const [duracion, setDuracion] = useState<"clase" | "dia">("clase");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [sesion,   setSesion]   = useState<{ id: string; link: string; expiresAt: string } | null>(null);
  const [copied,   setCopied]   = useState(false);

  const temas = TEMAS[materia][nivel];
  const grados = GRADOS[nivel];

  const handleMateriaChange = (m: "Lengua" | "Matemática") => {
    setMateria(m); setTema(""); setSubtema("");
  };
  const handleNivelChange = (n: "Primaria" | "Secundaria") => {
    setNivel(n); setAnio(GRADOS[n][2]); setTema(""); setSubtema("");
  };

  const handleGenerar = async () => {
    if (!tema) { setError("Elegí un tema antes de continuar."); return; }
    setError(null); setLoading(true);
    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "crearSesionArbitro");
      const res = await fn({ materia, nivel, anio, tema, subtema, ejercicio, duracion }) as {
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
      (ejercicio ? `Material de trabajo:\n${ejercicio}\n\n` : "") +
      `Link de la sesión: ${sesion.link}`
    );
    window.open(`https://classroom.google.com/share?url=${sesion.link}&title=${text}`, "_blank");
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 700 }}>

        {/* Header */}
        <div style={{ background: theme.primaryGradient, padding: "20px 28px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>⚖️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Árbitro — Configuración</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>
                Configurá la sesión de práctica para tus alumnos
              </p>
            </div>
          </div>
          <button onClick={() => navigate("/")} style={closeBtnStyle}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "72vh", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Explicación para el docente */}
          <div style={{ padding: "16px 20px", backgroundColor: "#f0f7ff", borderRadius: 12, border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
              ¿Para qué sirve esta herramienta?
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#1e3a5f", lineHeight: 1.7 }}>
              Está diseñada para que tus alumnos aprendan <strong>practicando juntos</strong>, no consultando a una IA.
              Vos configurás el tema. Ellos trabajan en grupos pequeños: se hacen preguntas, se responden, debaten.
              Cada respuesta correcta es un punto que ellos mismos registran.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#1e3a5f", lineHeight: 1.7 }}>
              La IA solo interviene cuando el grupo llega a un <strong>desacuerdo genuino</strong> que no puede
              resolver solo. En ese momento actúa como árbitro: escucha las dos posiciones, elige la correcta y
              explica por qué.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: "#1e40af" }}>
              El objetivo no es que los alumnos interactúen con la IA. El objetivo es que interactúen entre ellos.
            </p>
          </div>

          {/* Materia */}
          <div>
            <label style={labelStyle}>Materia</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["Lengua", "Matemática"] as const).map(m => (
                <button key={m} onClick={() => handleMateriaChange(m)}
                  style={{ padding: "14px", borderRadius: 12, border: `2px solid ${materia === m ? theme.primary : "#e2e8f0"}`, backgroundColor: materia === m ? `${theme.primary}12` : "white", cursor: "pointer", fontWeight: 700, fontSize: 15, color: materia === m ? theme.primary : "#1e293b" }}>
                  {m === "Lengua" ? "📖 Lengua" : "📐 Matemática"}
                </button>
              ))}
            </div>
          </div>

          {/* Nivel + Año */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Nivel</label>
              <div style={{ display: "flex", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {(["Primaria", "Secundaria"] as const).map(n => (
                  <button key={n} onClick={() => handleNivelChange(n)}
                    style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: nivel === n ? theme.primary : "white", color: nivel === n ? "white" : "#475569", transition: "all 0.2s" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Año / Grado</label>
              <select value={anio} onChange={e => setAnio(e.target.value)} style={selectStyle}>
                {grados.map(g => <option key={g} value={g}>{g} año</option>)}
              </select>
            </div>
          </div>

          {/* Tema */}
          <div>
            <label style={labelStyle}>Tema a practicar <span style={{ color: "#ef4444" }}>*</span></label>
            <select value={tema} onChange={e => setTema(e.target.value)} style={{ ...selectStyle, borderColor: !tema ? "#fca5a5" : "#e2e8f0" }}>
              <option value="">— Elegí un tema —</option>
              {temas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Subtema opcional */}
          <div>
            <label style={labelStyle}>
              Especificación del tema <span style={{ fontWeight: 400, color: "#94a3b8" }}>(opcional)</span>
            </label>
            <input type="text" value={subtema} onChange={e => setSubtema(e.target.value)}
              placeholder={materia === "Lengua" ? 'Ej: "solo palabras con ge/gi"' : 'Ej: "ecuaciones con fracciones"'}
              style={inputStyle} />
          </div>

          {/* Ejercicio / material */}
          <div>
            <label style={labelStyle}>
              Material de trabajo para los alumnos <span style={{ fontWeight: 400, color: "#94a3b8" }}>(opcional)</span>
            </label>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              Podés pegar un texto, una lista de ejercicios o consignas. Los alumnos lo verán en su pantalla.
              Si preferís dárselo en papel o pizarrón, dejá este campo vacío.
            </p>
            <textarea value={ejercicio} onChange={e => setEjercicio(e.target.value)} rows={4}
              placeholder="Ej: Leé el siguiente texto y debatí con tu equipo sobre..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>

          {/* Duración */}
          <div>
            <label style={labelStyle}>Duración de la sesión</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                { id: "clase" as const, label: "⏱️ Clase", desc: "Expira en 3 horas" },
                { id: "dia"   as const, label: "📅 Día",   desc: "Expira en 24 horas" },
              ]).map(d => (
                <button key={d.id} onClick={() => setDuracion(d.id)}
                  style={{ padding: "12px 16px", borderRadius: 12, border: `2px solid ${duracion === d.id ? theme.primary : "#e2e8f0"}`, backgroundColor: duracion === d.id ? `${theme.primary}12` : "white", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: duracion === d.id ? theme.primary : "#1e293b" }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "12px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ padding: "14px 18px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Creando sesión…</div>
            </div>
          )}

          {/* Sesión creada */}
          {sesion && (
            <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #86efac", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#166534", marginBottom: 4 }}>✅ Sesión creada</div>
              <div style={{ fontSize: 12, color: "#15803d", marginBottom: 16 }}>
                Expira: {new Date(sesion.expiresAt).toLocaleString("es-AR")}
              </div>

              {/* Link */}
              <div style={{ backgroundColor: "white", borderRadius: 10, border: "1px solid #bbf7d0", padding: "12px 14px", fontFamily: "monospace", fontSize: 13, color: "#166534", wordBreak: "break-all", marginBottom: 12 }}>
                {sesion.link}
              </div>

              {/* Botones */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={handleCopy}
                  style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "2px solid #86efac", backgroundColor: "white", color: "#166534", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {copied ? "✅ Copiado" : "📋 Copiar link"}
                </button>
                <button onClick={handleClassroom}
                  style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "none", backgroundColor: "#1a73e8", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  📚 Compartir en Classroom
                </button>
              </div>

              <button onClick={() => setSesion(null)}
                style={{ background: "none", border: "none", color: "#15803d", textDecoration: "underline", fontSize: 12, marginTop: 12, cursor: "pointer" }}>
                Crear otra sesión
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!sesion && (
          <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => navigate("/")} style={btnSecondary}>← Volver</button>
            <button onClick={handleGenerar} disabled={!tema || loading}
              style={{ padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: !tema || loading ? "#94a3b8" : theme.primaryGradient, color: "white", cursor: !tema || loading ? "not-allowed" : "pointer", minWidth: 200, opacity: !tema || loading ? 0.7 : 1 }}>
              {loading ? "⏳ Creando…" : "⚖️ Generar sesión de práctica"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const cardStyle: React.CSSProperties = { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 700, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#475569" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", fontSize: 14, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", outline: "none", boxSizing: "border-box" as const };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", appearance: "auto" as any };
const btnSecondary: React.CSSProperties = { padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", cursor: "pointer" };
const closeBtnStyle: React.CSSProperties = { background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };