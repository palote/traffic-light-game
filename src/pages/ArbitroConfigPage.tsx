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
      "Matemática": { emoji: "📐", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una lista de ejercicios de la unidad, un problema para resolver en grupo..." },
      "Ciencias Naturales": { emoji: "🌿", niveles: ["Primaria"], placeholder: "Ej: un texto corto sobre el tema, imágenes para observar y describir..." },
      "Biología": { emoji: "🧬", niveles: ["Secundaria"], placeholder: "Ej: un esquema, una imagen para analizar, un fragmento de texto científico..." },
      "Física": { emoji: "⚡", niveles: ["Secundaria"], placeholder: "Ej: un problema de aplicación, una situación física para analizar en grupo..." },
      "Química": { emoji: "⚗️", niveles: ["Secundaria"], placeholder: "Ej: una reacción química, una tabla de elementos, un experimento para discutir..." },
      "Tecnología": { emoji: "⚙️", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un proceso tecnológico, un objeto técnico para analizar o diseñar..." },
      "Informática": { emoji: "💻", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un algoritmo, un fragmento de código, un problema computacional..." },
      "Estadística": { emoji: "📊", niveles: ["Secundaria"], placeholder: "Ej: una tabla de datos, un gráfico para interpretar, un conjunto de resultados..." },
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
      "Ciencias Sociales": { emoji: "🏛️", niveles: ["Primaria"], placeholder: "Ej: una imagen de mapa, una fuente histórica simple, una situación de la comunidad..." },
      "Historia": { emoji: "📜", niveles: ["Secundaria"], placeholder: "Ej: una fuente primaria, un fragmento de texto histórico, una línea de tiempo..." },
      "Geografía": { emoji: "🗺️", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un mapa, una infografía, datos de población o recursos naturales..." },
      "Formación Ética y Ciudadana": { emoji: "🤝", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una situación dilema, un caso para debatir, un artículo de la Constitución..." },
      "Filosofía": { emoji: "💭", niveles: ["Secundaria"], placeholder: "Ej: un fragmento filosófico, un argumento para analizar o refutar..." },
      "Psicología": { emoji: "🧠", niveles: ["Secundaria"], placeholder: "Ej: un caso o situación para analizar, un concepto para debatir en grupo..." },
      "Economía": { emoji: "📈", niveles: ["Secundaria"], placeholder: "Ej: un gráfico económico, una situación de mercado, datos para interpretar..." },
      "Derecho": { emoji: "⚖️", niveles: ["Secundaria"], placeholder: "Ej: un artículo legal, un caso jurídico simplificado para debatir..." },
      "Antropología": { emoji: "🏺", niveles: ["Secundaria"], placeholder: "Ej: una descripción cultural, un texto etnográfico breve para analizar..." },
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
      "Inglés": { emoji: "🇬🇧", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: a short text, a grammar exercise, vocabulary in context..." },
      "Portugués": { emoji: "🇧🇷", niveles: ["Secundaria"], placeholder: "Ex: um texto curto, exercício de gramática, vocabulário em contexto..." },
      "Francés": { emoji: "🇫🇷", niveles: ["Secundaria"], placeholder: "Ex: un texte court, un exercice de grammaire, du vocabulaire en contexte..." },
      "Comunicación": { emoji: "📡", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una noticia, una publicidad, un mensaje para analizar críticamente..." },
      "TIC y Medios": { emoji: "🖥️", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una captura de pantalla, un texto digital, una situación de uso tecnológico..." },
      "Literatura": { emoji: "📚", niveles: ["Secundaria"], placeholder: "Ej: un fragmento literario, una poesía, un cuento para analizar..." },
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
      "Música": { emoji: "🎵", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una partitura, conceptos musicales para debatir, estilos para comparar..." },
      "Teatro": { emoji: "🎭", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una escena para analizar, un personaje para caracterizar, texto dramático..." },
      "Educación Física": { emoji: "⚽", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una regla de juego en disputa, situación táctica, concepto de salud..." },
      "Danza": { emoji: "💃", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: una secuencia de movimientos, estilos para comparar, conceptos de expresión..." },
      "Artesanía y Diseño": { emoji: "✂️", niveles: ["Primaria", "Secundaria"], placeholder: "Ej: un proceso de producción, materiales y técnicas para analizar o comparar..." },
    },
  },
};

const AREA_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(AREAS).map(([name, data]) => [data.key, name])
);

const GRADOS: Record<NivelKey, string[]> = {
  Primaria: ["1°", "2°", "3°", "4°", "5°", "6°", "7°"],
  Secundaria: ["1°", "2°", "3°", "4°", "5°", "6°"],
};

// ─── Campo colapsable reutilizable (instrucciones / preguntas / informe) ───────

function CollapsibleField({
  label, open, onToggle, description, value, onChange, rows, placeholder, accentColor, extra,
}: {
  label: string; open: boolean; onToggle: () => void; description?: string;
  value: string; onChange: (v: string) => void; rows: number; placeholder?: string;
  accentColor: string; extra?: React.ReactNode;
}) {
  return (
    <div>
      <button onClick={onToggle} style={{
        width: "100%", padding: "11px 16px", borderRadius: 10, textAlign: "left" as const,
        border: `1px solid ${open ? accentColor : "#e2e8f0"}`,
        backgroundColor: open ? `${accentColor}08` : "#f8fafc",
        color: open ? accentColor : "#475569",
        fontWeight: 600, fontSize: 13, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{label}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{open ? "▲ ocultar" : "▼ ver / editar"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {description && (
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{description}</p>
          )}
          {extra}
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
            placeholder={placeholder}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ArbitroConfigPage() {
  const { user, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();
  const { mode, getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const preselectedArea = AREA_BY_KEY[searchParams.get("area") || ""] || "";

  const [area, setArea] = useState(preselectedArea);
  const [materia, setMateria] = useState("");
  const [nivel, setNivel] = useState<NivelKey>("Secundaria");
  const [anio, setAnio] = useState("3°");
  const [tema, setTema] = useState("");
  const [ejercicio, setEjercicio] = useState("");
  const [textoFuente, setTextoFuente] = useState("");
  const [cantidadPreguntas, setCantidadPreguntas] = useState(6);
  const [generandoPreguntas, setGenerandoPreguntas] = useState(false);
  const [ejercicioEsIA, setEjercicioEsIA] = useState(false); // true si el contenido actual vino de "Generar con IA" (para reemplazar en vez de duplicar)
  const [tipoPreguntas, setTipoPreguntas] = useState<"memoristica" | "mixta" | "capacidades">("mixta");
  const [errorGenerarPreguntas, setErrorGenerarPreguntas] = useState<string | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorSesion, setErrorSesion] = useState("");
  const [duracion, setDuracion] = useState<"clase" | "dia">("clase");
  const [tiempoPregunta, setTiempoPregunta] = useState(0); // 0 = sin límite
  const [showMaterial, setShowMaterial] = useState(false);

  // Contenido unificado para Classroom e impresión — se completa con valores por
  // defecto al crear la sesión (ver handleGenerar) y queda editable ahí mismo.
  const [instrucciones, setInstrucciones] = useState("");
  const [informe, setInforme] = useState("");
  const [showPostInstrucciones, setShowPostInstrucciones] = useState(false);
  const [showPostPreguntas, setShowPostPreguntas] = useState(false);
  const [showPostInforme, setShowPostInforme] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sesion, setSesion] = useState<{ id: string; link: string; expiresAt: string } | null>(null);
  const linkSesion = sesion ? `https://eljuegodelsemaforo.com/arbitro-juego/${sesion.id}` : "";
  const [copied, setCopied] = useState(false);

  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [mostrarAdvertenciaPreguntas, setMostrarAdvertenciaPreguntas] = useState(false);
  const [cursos, setCursos] = useState<ClassroomCourse[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [creandoTarea, setCreandoTarea] = useState(false);
  const [tareaCreada, setTareaCreada] = useState(false);
  const [errorClassroom, setErrorClassroom] = useState("");

  const areaConfig = area ? AREAS[area] : null;
  const headerGrad = areaConfig ? areaConfig.gradient : theme.primaryGradient;
  const accentColor = areaConfig ? areaConfig.primary : theme.primary;
  const isCoopetition = mode === "coopetition";

  // El árbitro es un producto aparte del Juego del Semáforo: al cerrar o volver
  // no debe mandar al dashboard del semáforo, sino quedarse dentro del árbitro.
  const volverAlArbitro = () => navigate(areaConfig ? `/arbitro/${areaConfig.key}` : "/arbitros-info");

  const materiasDisponibles = areaConfig
    ? Object.entries(areaConfig.materias).filter(([, m]) => m.niveles.includes(nivel))
    : [];

  const currentPlaceholder = areaConfig && materia && areaConfig.materias[materia]
    ? areaConfig.materias[materia].placeholder
    : "Pegá acá el texto o las consignas para los alumnos...";

  const handleAreaChange = (a: string) => { setArea(a); setMateria(""); setTema(""); setEjercicio(""); setEjercicioEsIA(false); };
  const handleNivelChange = (n: NivelKey) => { setNivel(n); setAnio(GRADOS[n][2]); setMateria(""); setTema(""); };

  const handleGenerarPreguntas = async () => {
    if (!materia || !tema.trim()) {
      setErrorGenerarPreguntas("Elegí la materia y escribí el tema antes de generar preguntas.");
      return;
    }
    setErrorGenerarPreguntas(null);
    setGenerandoPreguntas(true);
    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "generarConsignasArbitro");
      const res = await fn({ materia, nivel, anio, tema: tema.trim(), subtema: "", cantidad: cantidadPreguntas, tipoPreguntas }) as {
        data: { consignas: string };
      };
      const generadas = res.data.consignas.trim();
      setEjercicio(prev => (prev.trim() && !ejercicioEsIA ? `${prev.trim()}\n\n${generadas}` : generadas));
      setEjercicioEsIA(true);
      setShowMaterial(true);
    } catch (err: any) {
      setErrorGenerarPreguntas(`No se pudieron generar las preguntas: ${err.message}`);
    } finally {
      setGenerandoPreguntas(false);
    }
  };

  const TIPO_PREGUNTAS_OPCIONES: { key: "memoristica" | "mixta" | "capacidades"; label: string }[] = [
    { key: "memoristica", label: "🧠 Memorísticas" },
    { key: "mixta", label: "🔀 Mixtas" },
    { key: "capacidades", label: "🎯 De desarrollo de capacidades" },
  ];

  const renderSelectorTipoPreguntas = () => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
        {TIPO_PREGUNTAS_OPCIONES.map(op => (
          <button key={op.key} type="button" onClick={() => setTipoPreguntas(op.key)}
            style={{
              padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: tipoPreguntas === op.key ? `2px solid ${accentColor}` : "1px solid #cbd5e1",
              backgroundColor: tipoPreguntas === op.key ? `${accentColor}15` : "white",
              color: tipoPreguntas === op.key ? accentColor : "#475569",
            }}>
            {op.label}
          </button>
        ))}
      </div>
      {tipoPreguntas === "capacidades" && (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
          Buscan que el equipo compare, argumente o detecte un error en vez de solo recordar un dato — le dan más al árbitro para arbitrar.
        </p>
      )}
    </div>
  );

  const defaultInstrucciones = (t: string) => (
    `Hoy vamos a practicar: ${t}\n\n` +
    `📖 Antes de jugar: leé el texto base que te entregó el docente. Durante el juego no vas a tenerlo disponible en pantalla — el debate se basa en lo que comprendiste.\n\n` +
    `📋 Cómo funciona:\n` +
    `1. Formen 2 equipos.\n` +
    `2. Entren al link de esta sesión desde el dispositivo de un integrante de cada equipo — ahí se juega toda la ronda.\n` +
    `3. Un equipo le hace una pregunta oral al otro; el equipo que responde lo hace en voz alta.\n` +
    `4. El equipo que preguntó califica la respuesta: completa (1 punto), incompleta (0.5) o incorrecta (0). El juego suma los puntos solo, automáticamente.\n` +
    `5. Si el equipo que respondió no está de acuerdo con la calificación, pidan el veredicto del árbitro (IA) desde el juego — su fallo define el puntaje de esa ronda.\n` +
    `6. Al terminar, cada equipo completa la metacognición dentro del juego, que se manda al profesor.`
  );

  const defaultInforme = (t: string) => (
    `Al terminar el juego, cada equipo escribe:\n\n` +
    `1. ¿Qué aprendieron hoy sobre "${t}"?\n` +
    `2. ¿En qué momento dudaron más? ¿Cómo lo resolvieron?\n` +
    `3. Contá una disputa donde intervino el árbitro: ¿cuál era tu postura antes de esa decisión y cuál después? ¿Te ayudó a ver el tema desde otro punto de vista?\n` +
    `4. ¿Cómo le explicarían a otro compañero lo que aprendieron hoy?\n\n` +
    `Al terminar, presioná el botón "Enviar informe al docente" dentro del juego. El informe llega automáticamente al panel del docente — no hace falta hacer nada más.`
  );

  // Una sola fuente de contenido: lo que se edita acá es exactamente lo que se
  // manda a Classroom y lo que se imprime — nada de copias separadas.
  const buildContenidoCompleto = () => [
    `⚖️ Árbitro de Aprendizaje — ${materia} · ${tema}`,
    `${nivel} ${anio}`,
    instrucciones,
    ejercicio ? `📋 PREGUNTAS PARA EL JUEGO:\n${ejercicio}` : "",
    `✍️ INFORME FINAL:\n${informe}`,
    `🔗 Link del juego: ${linkSesion}`,
    `👩‍🏫 Docente: cuando los equipos terminen de jugar vas a poder ver sus respuestas y el informe pedagógico en https://eljuegodelsemaforo.com/arbitro-panel — entrá con la misma cuenta de Google con la que creaste esta tarea. Los alumnos no tienen acceso a esa vista.`,
  ].filter(Boolean).join("\n\n");

  const handleGenerar = async () => {
    if (!area) { setError("Elegí un área."); return; }
    if (!materia) { setError("Elegí una materia."); return; }
    if (!tema.trim()) { setError("Escribí el tema de la sesión."); return; }
    setError(null); setLoading(true);

    // Iniciar sesión con Google es obligatorio para crear una sesión: así el
    // link del árbitro y los informes siempre quedan asociados a un docente
    // (email + uid), sin importar si después la comparten por Classroom, mail
    // o un link directo.
    if (!user) {
      try {
        await loginWithGoogle();
      } catch (err: any) {
        setError("Necesitás iniciar sesión con Google para crear la sesión.");
        setLoading(false);
        return;
      }
    }

    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "crearSesionArbitro");
      const res = await fn({ area, materia, nivel, anio, tema: tema.trim(), subtema: "", ejercicio, duracion, tiempoPregunta, textoFuente }) as {
        data: { id: string; link: string; expiresAt: string };
      };
      setSesion(res.data);
      setInstrucciones(defaultInstrucciones(tema.trim()));
      setInforme(defaultInforme(tema.trim()));
    } catch (err: any) {
      setError(`Error al crear la sesión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!sesion) return;
    await navigator.clipboard.writeText(linkSesion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClassroom = async (skipCheck = false) => {
    if (!sesion) return;
    // Sin banco de preguntas el juego funciona, pero los equipos tienen que
    // inventarlas en el momento — conviene avisarlo antes de compartir.
    if (!skipCheck && !ejercicio.trim()) {
      setMostrarAdvertenciaPreguntas(true);
      return;
    }
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

  // Mismo criterio que en la landing: se usa el logout del AuthContext, que
  // además de desloguear cierra la sesión de métricas del docente.
  const handleCerrarSesion = async () => {
    setErrorSesion("");
    setCerrandoSesion(true);
    try {
      await logout();
    } catch {
      setErrorSesion("No se pudo cerrar la sesión.");
    }
    setCerrandoSesion(false);
  };

  const handleCrearTarea = async (cursoId: string, _cursoNombre: string) => {
    if (!sesion) return;
    setCreandoTarea(true);
    setErrorClassroom("");
    try {
      await createCourseWork(
        cursoId,
        `⚖️ Árbitro de Aprendizaje — ${materia}: ${tema}`,
        buildContenidoCompleto(),
        linkSesion,
        (() => {
          const expira = new Date(sesion.expiresAt);
          const ahora = new Date();
          // Si ya expiró o expira en menos de 10 minutos, usar mañana al mediodía
          if (expira.getTime() - ahora.getTime() < 10 * 60 * 1000) {
            const manana = new Date();
            manana.setDate(manana.getDate() + 1);
            manana.setHours(12, 0, 0, 0);
            return manana;
          }
          return expira;
        })(),
        // Sin adjunto del panel del docente: quedaba visible para los alumnos en
        // Classroom y algunos entraban ahí en vez de al juego. La referencia al
        // panel viaja como texto plano en la descripción (buildContenidoCompleto).
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
      <style>{`
        #arbitro-print-area { display: none; }
        @media print {
          body * { visibility: hidden; }
          #arbitro-print-area, #arbitro-print-area * { visibility: visible; }
          #arbitro-print-area { display: block; position: absolute; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <div style={pageStyle}>
        <div style={cardStyle}>

          {/* ── Header ── */}
          <div style={{ background: headerGrad, padding: "20px 28px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "white", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{areaConfig ? areaConfig.emoji : "⚖️"}</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Árbitro de Aprendizaje</h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>
                  {area || "Seleccioná un área para comenzar"}
                </p>
              </div>
            </div>
            <div style={{
              position: "absolute",
              top: 14,
              right: 72,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              zIndex: 10,
              maxWidth: "min(50vw, 240px)",
            }}>
              <a
                href="/arbitro-panel"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.85)",
                  textDecoration: "none",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}>
                📊 Mis sesiones
              </a>
              {user && (
                <div style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  maxWidth: "100%",
                }}>
                  <span
                    title={user.email ?? undefined}
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                    👤 {user.email}
                  </span>
                  <button
                    onClick={handleCerrarSesion}
                    disabled={cerrandoSesion}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      cursor: cerrandoSesion ? "default" : "pointer",
                      padding: "2px 6px",
                      borderRadius: 6,
                      fontWeight: 600,
                      textDecoration: "underline",
                      flexShrink: 0,
                    }}>
                    {cerrandoSesion ? "Saliendo…" : "Salir"}
                  </button>
                </div>
              )}
              {errorSesion && (
                <div style={{ fontSize: 11, color: "#fecaca", textAlign: "right" as const }}>{errorSesion}</div>
              )}
            </div>
            <button onClick={volverAlArbitro} style={closeBtnStyle}>✕</button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "72vh", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Cómo funciona — acordeón */}
            <ComoFuncionaAccordionES primary={accentColor} light={areaConfig ? areaConfig.light : "#f0f7ff"} border={areaConfig ? areaConfig.border : "#bfdbfe"} />

            {/* ── Área ── */}
            {preselectedArea ? (
              // Viene del dashboard → mostrar título fijo, sin selector
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 12,
                backgroundColor: areaConfig ? `${areaConfig.primary}12` : "#f0f7ff",
                border: `2px solid ${areaConfig ? areaConfig.primary : "#bfdbfe"}`,
              }}>
                <span style={{ fontSize: 28 }}>{areaConfig?.emoji}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 2 }}>
                    Árbitro de
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: areaConfig?.primary }}>
                    {area}
                  </div>
                </div>
              </div>
            ) : (
              // Sin pre-selección → mostrar selector completo
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
            )}

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
                    { id: "dia" as const, label: "📅 Día", desc: "Expira en 24 horas" },
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

            {/* ── Tiempo para formular la pregunta ── */}
            {tema.trim() && (
              <div>
                <label style={labelStyle}>Tiempo para formular cada pregunta</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {([
                    { val: 0, label: "Sin límite" },
                    { val: 60, label: "1 min" },
                    { val: 120, label: "2 min" },
                    { val: 180, label: "3 min" },
                  ]).map(t => (
                    <button key={t.val} onClick={() => setTiempoPregunta(t.val)}
                      style={{
                        padding: "10px 6px", borderRadius: 10,
                        border: `2px solid ${tiempoPregunta === t.val ? accentColor : "#e2e8f0"}`,
                        backgroundColor: tiempoPregunta === t.val ? `${accentColor}12` : "white",
                        color: tiempoPregunta === t.val ? accentColor : "#64748b",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                  Al vencer el tiempo el equipo puede enviar lo que tenga o pasar la pregunta. El árbitro no tiene límite de tiempo.
                </p>
              </div>
            )}

            {/* ── Texto base de la sesión ── */}
            {tema.trim() && (
              <div>
                <label style={labelStyle}>
                  📖 Texto base de la sesión
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b", marginLeft: 6 }}>
                    (recomendado)
                  </span>
                </label>
                <textarea
                  value={textoFuente}
                  onChange={e => setTextoFuente(e.target.value)}
                  rows={6}
                  placeholder={"Pegá acá el texto sobre el que van a trabajar los equipos. El árbitro va a arbitrar citando este texto.\n\nSi no cargás un texto, el árbitro va a trabajar con su conocimiento general del tema — funciona, pero es menos preciso."}
                  style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "inherit", lineHeight: 1.6 }}
                />
                {/* Aviso + contador de caracteres */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 6, gap: 12 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5, flex: 1 }}>
                    ⚠️ <strong>Antes de jugar:</strong> dedicá un tiempo a la lectura comprensiva — en grupo o de a dos. Durante el juego el texto <strong>no estará disponible en pantalla</strong>. Conviene tenerlo impreso.
                  </div>
                  {textoFuente.length > 0 && (
                    <div style={{
                      fontSize: 11, fontWeight: 700, textAlign: "right" as const, maxWidth: 160,
                      color: textoFuente.length > 8000 ? "#dc2626" : textoFuente.length > 6000 ? "#d97706" : "#94a3b8",
                    }}>
                      <div style={{ whiteSpace: "nowrap" as const }}>
                        {textoFuente.length.toLocaleString("es-AR")} / 8.000 car.
                      </div>
                      {textoFuente.length > 8000 && (
                        <div style={{ color: "#dc2626", fontWeight: 700, marginTop: 2, lineHeight: 1.4 }}>
                          ⚠️ El texto se va a cortar al enviarlo al árbitro
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Material adicional (colapsable) ── */}
            {tema.trim() && (
              <div id="banco-preguntas">
                <button onClick={() => setShowMaterial(!showMaterial)} style={{
                  width: "100%", padding: "11px 16px", borderRadius: 10, textAlign: "left" as const,
                  border: `1px solid ${showMaterial ? accentColor : "#e2e8f0"}`,
                  backgroundColor: showMaterial ? `${accentColor}08` : "#f8fafc",
                  color: showMaterial ? accentColor : "#475569",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>📋 Preguntas para el juego</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{showMaterial ? "▲ ocultar" : "▼ agregar"}</span>
                </button>
                {showMaterial && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                      Las preguntas aparecen en la pantalla del juego: el equipo que pregunta elige una de esta lista en cada turno. Las preguntas ya usadas quedan marcadas para no repetirse.
                    </p>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                      El texto fuente (cargado arriba) no aparece durante el juego — si el docente quiere mostrarlo, puede hacerlo desde el panel del docente.
                    </p>
                    {renderSelectorTipoPreguntas()}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" as const }}>
                      <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Generar con IA:</label>
                      <input type="number" min={3} max={30} value={cantidadPreguntas}
                        onChange={e => setCantidadPreguntas(Math.min(30, Math.max(3, parseInt(e.target.value) || 6)))}
                        style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
                      <span style={{ fontSize: 12, color: "#64748b" }}>preguntas</span>
                      <button onClick={handleGenerarPreguntas} disabled={generandoPreguntas || !materia || !tema.trim()}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "none",
                          backgroundColor: generandoPreguntas ? "#94a3b8" : accentColor,
                          color: "white", fontWeight: 600, fontSize: 12,
                          cursor: generandoPreguntas || !materia || !tema.trim() ? "default" : "pointer",
                        }}>
                        {generandoPreguntas ? "⏳ Generando…" : "✨ Generar con IA"}
                      </button>
                    </div>
                    {errorGenerarPreguntas && (
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#dc2626" }}>{errorGenerarPreguntas}</p>
                    )}
                    <textarea value={ejercicio} onChange={e => { setEjercicio(e.target.value); setEjercicioEsIA(false); }} rows={4}
                      placeholder={currentPlaceholder}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                  </div>
                )}
              </div>
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
                <div style={{ backgroundColor: "white", borderRadius: 10, border: "1px solid #bbf7d0", padding: "12px 14px", fontFamily: "monospace", fontSize: 13, color: "#166534", wordBreak: "break-all", marginBottom: 8 }}>
                  {linkSesion}
                </div>
                <div style={{ fontSize: 12, color: "#15803d", marginBottom: 12, lineHeight: 1.5 }}>
                  👥 Es un solo link para toda la clase: cada pareja de alumnos lo abre en su propio dispositivo y arma su equipo — no hace falta crear una sesión por pareja.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <button onClick={handleCopy} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "2px solid #86efac", backgroundColor: "white", color: "#166534", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {copied ? "✅ Copiado" : "📋 Copiar link"}
                  </button>
                  <button onClick={() => handleClassroom()} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "none", backgroundColor: "#1a73e8", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    📚 Compartir en Classroom
                  </button>
                </div>
                <a href="/arbitro-panel"
                  style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
                  📊 Ver historial de sesiones →
                </a>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  <CollapsibleField
                    label="📋 Instrucciones para los alumnos" open={showPostInstrucciones}
                    onToggle={() => setShowPostInstrucciones(v => !v)}
                    description="Esto es lo que se manda a Classroom y lo que se imprime — editalo si querés cambiar algo."
                    value={instrucciones} onChange={setInstrucciones} rows={7} accentColor={accentColor}
                  />
                  <CollapsibleField
                    label="📋 Preguntas para el juego" open={showPostPreguntas}
                    onToggle={() => setShowPostPreguntas(v => !v)}
                    description="Opcional. No aparece en la pantalla del juego — repartila antes por Classroom o en el PDF."
                    value={ejercicio} onChange={v => { setEjercicio(v); setEjercicioEsIA(false); }} rows={4} placeholder={currentPlaceholder} accentColor={accentColor}
                    extra={
                      <div>
                      {renderSelectorTipoPreguntas()}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" as const }}>
                        <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Generar con IA:</label>
                        <input type="number" min={3} max={30} value={cantidadPreguntas}
                          onChange={e => setCantidadPreguntas(Math.min(30, Math.max(3, parseInt(e.target.value) || 6)))}
                          style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>preguntas</span>
                        <button onClick={handleGenerarPreguntas} disabled={generandoPreguntas || !materia || !tema.trim()}
                          style={{
                            padding: "6px 12px", borderRadius: 8, border: "none",
                            backgroundColor: generandoPreguntas ? "#94a3b8" : accentColor,
                            color: "white", fontWeight: 600, fontSize: 12,
                            cursor: generandoPreguntas || !materia || !tema.trim() ? "default" : "pointer",
                          }}>
                          {generandoPreguntas ? "⏳ Generando…" : "✨ Generar con IA"}
                        </button>
                        {errorGenerarPreguntas && <span style={{ fontSize: 12, color: "#dc2626" }}>{errorGenerarPreguntas}</span>}
                      </div>
                      </div>
                    }
                  />
                  <CollapsibleField
                    label="✍️ Informe final (metacognición)" open={showPostInforme}
                    onToggle={() => setShowPostInforme(v => !v)}
                    description="Las preguntas que cada equipo responde al terminar el juego."
                    value={informe} onChange={setInforme} rows={7} accentColor={accentColor}
                  />
                </div>

                <button onClick={() => window.print()} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${accentColor}`, backgroundColor: `${accentColor}08`, color: accentColor, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  🖨️ Imprimir / Guardar PDF
                </button>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, marginBottom: 6, textAlign: "center" as const }}>
                  Imprime el contenido de arriba (instrucciones, preguntas e informe) — las instrucciones ya les llegan a los alumnos por Classroom, esto es solo si además querés una copia en papel.
                </div>

                <button onClick={() => setSesion(null)} style={{ background: "none", border: "none", color: "#15803d", textDecoration: "underline", fontSize: 12, marginTop: 8, cursor: "pointer" }}>
                  Crear otra sesión
                </button>

                {/* Versión oculta en pantalla, visible solo al imprimir (window.print) */}
                <div id="arbitro-print-area">
                  <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>{areaConfig ? areaConfig.emoji : "⚖️"} Árbitro de {materia}</h1>
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>{nivel} {anio} · {tema}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#374151", margin: "18px 0 6px" }}>📋 Instrucciones para los alumnos</div>
                  <div style={{ whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.7 }}>{instrucciones}</div>
                  {ejercicio && (<>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#374151", margin: "18px 0 6px" }}>📋 Preguntas para el juego</div>
                    <div style={{ whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.7 }}>{ejercicio}</div>
                  </>)}
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#374151", margin: "18px 0 6px" }}>✍️ Informe final</div>
                  <div style={{ whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.7 }}>{informe}</div>
                  <div style={{ marginTop: 24, fontSize: 12, color: "#64748b" }}>🔗 {linkSesion}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {!sesion && (
            <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0" }}>
              {!user && (
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, textAlign: "right" }}>
                  🔐 Te vamos a pedir iniciar sesión con Google al crear la sesión, para que el link, el informe y el email de los resultados queden asociados a vos.
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={volverAlArbitro} style={btnSecondary}>← Volver</button>
                <button onClick={handleGenerar} disabled={!canGenerate} style={{
                  padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none",
                  background: canGenerate ? headerGrad : "#94a3b8",
                  color: "white", cursor: canGenerate ? "pointer" : "not-allowed",
                  minWidth: 200, opacity: canGenerate ? 1 : 0.7,
                }}>
                  {loading ? "⏳ Creando…" : user ? "⚖️ Generar sesión de práctica" : "🔐 Iniciar sesión y generar sesión"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {mostrarAdvertenciaPreguntas && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}
          onClick={() => setMostrarAdvertenciaPreguntas(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 20, maxWidth: 440, width: "100%", padding: "28px 28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 10 }}>
              El juego no tiene preguntas cargadas
            </div>
            <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
              Sin preguntas, los equipos van a tener que formularlas ellos mismos durante el juego. Funciona, pero el árbitro arbitra mejor cuando las preguntas están basadas en el texto base.
              <br /><br />
              Para agregarlas, abrí la sección <strong>"📋 Preguntas para el juego"</strong> más arriba y generalas con IA o pegá las tuyas.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setMostrarAdvertenciaPreguntas(false);
                  // Se despliega el acordeón antes de scrollear: si está cerrado,
                  // el docente llegaría a un botón colapsado sin ver el campo.
                  setShowMaterial(true);
                  setTimeout(() => {
                    document.getElementById("banco-preguntas")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 60);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#475569" }}>
                ← Agregar preguntas
              </button>
              <button
                onClick={() => {
                  setMostrarAdvertenciaPreguntas(false);
                  handleClassroom(true);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", backgroundColor: "#1a73e8", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Compartir igual →
              </button>
            </div>
          </div>
        </div>
      )}

      {showClassroomModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}
          onClick={() => !creandoTarea && setShowClassroomModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)", padding: "18px 24px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>📚 Publicar en Google Classroom</div>
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
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#166534" }}>¡Tarea creada en Classroom!</p>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>Los alumnos ya pueden verla en su curso.</p>
                  <button onClick={() => setShowClassroomModal(false)}
                    style={{ marginTop: 20, padding: "10px 28px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "none", backgroundColor: "#1a73e8", color: "white", cursor: "pointer" }}>
                    Cerrar
                  </button>
                </div>
              ) : errorClassroom ? (
                <div>
                  <div style={{ padding: "12px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
                    ⚠️ {errorClassroom}
                  </div>
                  <button onClick={() => { setErrorClassroom(""); handleClassroom(true); }}
                    style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "2px solid #e2e8f0", backgroundColor: "white", cursor: "pointer" }}>
                    Reintentar
                  </button>
                </div>
              ) : cargandoCursos ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
                  ⏳ Cargando tus cursos...
                </div>
              ) : cursos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b", fontSize: 14 }}>
                  No se encontraron cursos activos en tu cuenta.
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: "#475569" }}>
                    Elegí el curso donde querés publicar la tarea:
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
                          {creandoTarea ? "⏳ Creando tarea..." : `📚 ${curso.name}`}
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

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const cardStyle: React.CSSProperties = { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 700, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" };
// ─── ComoFuncionaAccordionES ───────────────────────────────────────────────────

function ComoFuncionaAccordionES({ primary, light, border }: { primary: string; light: string; border: string }) {
  const [open, setOpen] = useState(false);
  const etapas = [
    {
      numero: "1",
      titulo: "Lectura previa",
      quien: "Todos los alumnos",
      descripcion: "Antes de jugar, leen el texto base que entregó el docente. Durante el juego el texto no está disponible en pantalla.",
    },
    {
      numero: "2",
      titulo: "El turno — pregunta y respuesta",
      quien: "Equipo A pregunta · Equipo B responde",
      descripcion: "El equipo que pregunta elige una pregunta de la lista y se la hace en voz alta al otro equipo. El otro equipo responde oralmente.",
    },
    {
      numero: "3",
      titulo: "Calificación",
      quien: "El equipo que preguntó califica",
      descripcion: "Decide si la respuesta fue completa (1 punto), incompleta (0,5 puntos) o incorrecta (0 puntos).",
    },
    {
      numero: "4",
      titulo: "¿Se acepta la calificación?",
      quien: "El equipo que respondió decide",
      descripcion: "Si acepta, se asigna el punto y sigue el juego. Si no acepta, ambos equipos argumentan por escrito y llaman al árbitro.",
    },
    {
      numero: "5",
      titulo: "El árbitro interviene",
      quien: "La IA lee los argumentos de ambos equipos",
      descripcion: "Da su veredicto sobre esa discrepancia puntual, citando el texto base. El equipo que preguntó decide el puntaje final.",
    },
    {
      numero: "6",
      titulo: "Metacognición",
      quien: "Ambos equipos",
      descripcion: "Al terminar, cada equipo completa un informe que llega automáticamente al panel del docente.",
    },
  ];
  return (
    <div style={{ backgroundColor: light, borderRadius: 12, border: `1px solid ${border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderRadius: 12 }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>¿Cómo funciona? <span style={{ fontWeight: 400, fontSize: 12, color: "#64748b" }}>— tocá para ver</span></span>
        <span style={{ fontSize: 16, color: primary, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${border}` }}>
          {etapas.map((et) => (
            <div key={et.numero} style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: `${primary}20`, color: primary, fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {et.numero}
              </div>
              <div style={{ paddingTop: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1e3a5f", lineHeight: 1.4 }}>{et.titulo}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: primary, lineHeight: 1.4, marginTop: 1 }}>{et.quien}</div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, marginTop: 3 }}>{et.descripcion}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 12px", backgroundColor: "#fef9c3", borderRadius: 8, border: "1px solid #fde047", fontSize: 12, color: "#713f12", lineHeight: 1.6 }}>
            📚 <strong>Cómo le llega el resultado al docente:</strong> al terminar, cada equipo presiona el botón para enviar el informe y las respuestas de metacognición llegan solas a tu panel, sin que tengan que mandarte nada. Por las dudas, el juego también les deja copiar o descargar ese texto.
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#475569" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", fontSize: 14, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", outline: "none", boxSizing: "border-box" as const };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", appearance: "auto" as any };
const btnSecondary: React.CSSProperties = { padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", cursor: "pointer" };
const closeBtnStyle: React.CSSProperties = { background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const sectionBadgeStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 };
const badgeNumStyle: React.CSSProperties = { background: "#e0e7ff", color: "#4f46e5", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 };