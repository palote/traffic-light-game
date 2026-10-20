import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useArbitroT, useI18n, useLocaleArbitro, useTituloPagina, fillArbitro, arbitroDic, LanguageSelector, IDIOMAS_ARBITRO } from "../i18n";
import { useFondoDocumento } from "../utils/useFondoDocumento";
import type { ModoMetacognicion } from "../utils/arbitroIntegrantes";
import type { ModoRespuesta } from "../utils/arbitroIntegrantes";
import { MAX_PREGUNTAS_META, MIN_PREGUNTAS_META, MAX_LARGO_PREGUNTA, esIgualALasPorDefecto, listaPreguntasMeta, preguntasPorDefecto } from "../utils/arbitroMetaPreguntas";
import { MAX_LARGO_CRITERIO, MAX_CRITERIOS, CRITERIOS_SUGERIDOS, criteriosDesdeSugeridos } from "../utils/arbitroCriterios";
import { resumenOpcionesSesion } from "../utils/arbitroResumenOpciones";
import { instruccionesPorDefecto, informePorDefecto, contenidoCompleto, tituloClassroom } from "../utils/arbitroDocumentos";
import { nombreVisible } from "../utils/arbitroNombres";
import { idiomaSesionPorDefecto, type IdiomaSesion } from "../utils/idiomaSesion";
import { useGameMode } from "../contexts/GameModeContext";
import { app } from "../firebase.config";
import { PALETA, AREA_COLORS } from "../utils/arbitroPalette";
import { ModalDialogo, fieldsetReset, legendReset, srOnly } from "../utils/arbitroA11y";
import { esIaNoDisponible, textoErrorArbitro } from "../utils/arbitroErrores";
import { getCourses, createCourseWork, type ClassroomCourse } from "../services/classroomService";
import ProyeccionCodigoArbitro from "../components/ProyeccionCodigoArbitro";

// ─── Types ─────────────────────────────────────────────────────────────────────

type NivelKey = "Primaria" | "Secundaria";

interface MateriaData {
  emoji: string;
  niveles: NivelKey[];
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

// Los nombres de área y de materia son claves estables (se guardan y se mandan tal cual);
// lo que se muestra sale de ta.areaNames / ta.materiaNames.
// i18n-clave
const AREAS: Record<string, AreaConfig> = {
  "Ciencias Exactas y Naturales": {
    emoji: "🔬",
    key: "exactas",
    ...AREA_COLORS.exactas,
    materias: {
      "Matemática": { emoji: "📐", niveles: ["Primaria", "Secundaria"] },
      "Ciencias Naturales": { emoji: "🌿", niveles: ["Primaria"] },
      "Biología": { emoji: "🧬", niveles: ["Secundaria"] },
      "Física": { emoji: "⚡", niveles: ["Secundaria"] },
      "Química": { emoji: "⚗️", niveles: ["Secundaria"] },
      "Tecnología": { emoji: "⚙️", niveles: ["Primaria", "Secundaria"] },
      "Informática": { emoji: "💻", niveles: ["Primaria", "Secundaria"] },
      "Estadística": { emoji: "📊", niveles: ["Secundaria"] },
    },
  },

  "Ciencias Sociales y Humanidades": {
    emoji: "🌍",
    key: "sociales",
    ...AREA_COLORS.sociales,
    materias: {
      "Ciencias Sociales": { emoji: "🏛️", niveles: ["Primaria"] },
      "Historia": { emoji: "📜", niveles: ["Secundaria"] },
      "Geografía": { emoji: "🗺️", niveles: ["Primaria", "Secundaria"] },
      "Formación Ética y Ciudadana": { emoji: "🤝", niveles: ["Primaria", "Secundaria"] },
      "Filosofía": { emoji: "💭", niveles: ["Secundaria"] },
      "Psicología": { emoji: "🧠", niveles: ["Secundaria"] },
      "Economía": { emoji: "📈", niveles: ["Secundaria"] },
      "Derecho": { emoji: "⚖️", niveles: ["Secundaria"] },
      "Antropología": { emoji: "🏺", niveles: ["Secundaria"] },
    },
  },

  "Comunicación y Lenguajes": {
    emoji: "💬",
    key: "lenguajes",
    ...AREA_COLORS.lenguajes,
    materias: {
      "Lengua y Literatura": { emoji: "📖", niveles: ["Primaria", "Secundaria"] },
      "Inglés": { emoji: "🇬🇧", niveles: ["Primaria", "Secundaria"] },
      "Portugués": { emoji: "🇧🇷", niveles: ["Secundaria"] },
      "Francés": { emoji: "🇫🇷", niveles: ["Secundaria"] },
      "Comunicación": { emoji: "📡", niveles: ["Primaria", "Secundaria"] },
      "TIC y Medios": { emoji: "🖥️", niveles: ["Primaria", "Secundaria"] },
      "Literatura": { emoji: "📚", niveles: ["Secundaria"] },
    },
  },

  "Arte y Expresión": {
    emoji: "🎨",
    key: "arte",
    ...AREA_COLORS.arte,
    materias: {
      "Plástica / Artes Visuales": { emoji: "🎨", niveles: ["Primaria", "Secundaria"] },
      "Música": { emoji: "🎵", niveles: ["Primaria", "Secundaria"] },
      "Teatro": { emoji: "🎭", niveles: ["Primaria", "Secundaria"] },
      "Educación Física": { emoji: "⚽", niveles: ["Primaria", "Secundaria"] },
      "Danza": { emoji: "💃", niveles: ["Primaria", "Secundaria"] },
      "Artesanía y Diseño": { emoji: "✂️", niveles: ["Primaria", "Secundaria"] },
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
  const ta = useArbitroT();
  return (
    <div>
      <button onClick={onToggle} aria-expanded={open} style={{
        width: "100%", padding: "11px 16px", borderRadius: 10, textAlign: "left" as const,
        border: `1px solid ${open ? accentColor : "#e2e8f0"}`,
        backgroundColor: open ? `${accentColor}08` : "#f8fafc",
        color: open ? accentColor : "#475569",
        fontWeight: 600, fontSize: 13, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{label}</span>
        <span style={{ fontSize: 12 }}>{open ? ta.cfgHide : ta.cfgShowEdit}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {description && (
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{description}</p>
          )}
          {extra}
          <textarea aria-label={label} value={value} onChange={e => onChange(e.target.value)} rows={rows}
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
  const ta = useArbitroT();
  const locale = useLocaleArbitro(); // fechas y números según el idioma (es-AR / en-US)
  const { mode } = useGameMode();
  useTituloPagina(`${ta.cfgFormTitleDoc} — ${ta.pageTitleSuffix}`);

  const preselectedArea = AREA_BY_KEY[searchParams.get("area") || ""] || "";

  const [area, setArea] = useState(preselectedArea);
  const [areaAbierto, setAreaAbierto] = useState(false); // las 4 opciones: colapsadas si ya hay área; sin área se muestran siempre (ver abajo)
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
  // Docente sin sesión que toca "Generar con IA": le pedimos iniciar sesión en vez de llamar a la función.
  const [faltaLoginPreguntas, setFaltaLoginPreguntas] = useState(false);
  const [loginPreguntasError, setLoginPreguntasError] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorSesion, setErrorSesion] = useState("");
  const [duracion, setDuracion] = useState<"clase" | "dia">("clase");
  const [modoMetacognicion, setModoMetacognicion] = useState<ModoMetacognicion>("grupal"); // «Informe de metacognición»: grupal por defecto
  const [modoRespuesta, setModoRespuesta] = useState<ModoRespuesta>("oral"); // «Modo de respuesta»: oral por defecto
  const [verTextoDuranteJuego, setVerTextoDuranteJuego] = useState(false); // «Texto durante el juego»: sin el texto por defecto
  // Preguntas de metacognición: null = las 4 por defecto del idioma de la sesión (sin tocar); array = lo que está editando el docente.
  const [preguntasMeta, setPreguntasMeta] = useState<string[] | null>(null);
  const [preguntasMetaAbierto, setPreguntasMetaAbierto] = useState(false); // acordeón cerrado por defecto
  // Criterios de calificación (opcionales, B.1): hasta 3 campos de texto libre, ninguno obligatorio.
  // Sin tocar = los 3 vacíos = sin criterios (funciona exactamente igual que antes de esta función).
  const [criteriosSugeridosMarcados, setCriteriosSugeridosMarcados] = useState<boolean[]>(() => CRITERIOS_SUGERIDOS.map(() => false));
  const [criterioPropio, setCriterioPropio] = useState("");
  const [criteriosAbierto, setCriteriosAbierto] = useState(false); // acordeón cerrado por defecto
  // El sugerido "solo escrita" (claridad de lo escrito) no tiene sentido en modo oral: se desmarca solo al cambiar.
  useEffect(() => {
    if (modoRespuesta === "escrita") return;
    setCriteriosSugeridosMarcados(prev => prev.map((marcado, i) => (marcado && CRITERIOS_SUGERIDOS[i].soloEscrita) ? false : marcado));
  }, [modoRespuesta]);
  const [permitirPreguntasPropias, setPermitirPreguntasPropias] = useState(true); // «Permitir preguntas propias»: activada por defecto
  // «Idioma de la sesión»: por defecto, el idioma actual de la interfaz (inglés o, si no, español).
  const { language: idiomaInterfaz } = useI18n();
  useFondoDocumento(FONDO_CONFIG);
  const [idiomaSesion, setIdiomaSesion] = useState<IdiomaSesion>(() => idiomaSesionPorDefecto(idiomaInterfaz));
  const [tiempoPregunta, setTiempoPregunta] = useState(0); // 0 = sin límite
  const [showMaterial, setShowMaterial] = useState(true);

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
  // El enlace se queda en el dominio desde el que se creó la sesión (eljuegodelsemaforo.com, thetrafficlightgame.com o localhost).
  // Se arma acá con el origin y no se usa el campo `link` que devuelve crearSesionArbitro (trae un dominio fijo).
  const linkSesion = sesion ? `${window.location.origin}/arbitro-juego/${sesion.id}` : "";
  const [copied, setCopied] = useState(false);

  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [mostrarAdvertenciaPreguntas, setMostrarAdvertenciaPreguntas] = useState(false);
  const [textoAdvertenciaClassroom, setTextoAdvertenciaClassroom] = useState("");
  const [compartidoViaClassroom, setCompartidoViaClassroom] = useState(false);
  const [mostrarAdvertenciaPDF, setMostrarAdvertenciaPDF] = useState(false);
  const [mostrarAdvertenciaGenerar, setMostrarAdvertenciaGenerar] = useState(false);
  const [textoAdvertenciaGenerar, setTextoAdvertenciaGenerar] = useState("");
  const [mostrarAdvertenciaTextoBase, setMostrarAdvertenciaTextoBase] = useState(false);
  const [cursos, setCursos] = useState<ClassroomCourse[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(false);
  const [creandoTarea, setCreandoTarea] = useState(false);
  const [tareaCreada, setTareaCreada] = useState(false);
  const [errorClassroom, setErrorClassroom] = useState("");
  const [mostrarProyeccion, setMostrarProyeccion] = useState(false);
  const [opcionesAbierto, setOpcionesAbierto] = useState(false); // paso 7 "Opciones de la sesión": plegado por defecto (Etapa D)
  const [masDetalleOral, setMasDetalleOral] = useState(false); // tarjeta Oral: "Más detalle" (Etapa D)
  const [masDetalleEscrita, setMasDetalleEscrita] = useState(false); // tarjeta Escrito: "Más detalle" (Etapa D)
  const [intentoCrear, setIntentoCrear] = useState(false); // true tras el primer clic en "Crear sesión" (para el "(obligatorio)" en rojo)

  const areaConfig = area ? AREAS[area] : null;
  // Sin área elegida: verde accesible de la paleta (antes tomaba el verde del tema del juego, #22c55e).
  const headerGrad = areaConfig ? areaConfig.gradient : `linear-gradient(135deg, ${PALETA.verde} 0%, #166534 100%)`;
  const accentColor = areaConfig ? areaConfig.primary : PALETA.verde;
  const isCoopetition = mode === "coopetition";

  // Numerito de paso, mismo estilo circular que ya usa "¿Cómo funciona?" — para
  // que el docente vea de un vistazo el orden completo del formulario (1 a 7).
  const PasoLabel = ({ n, children, htmlFor, id, legend }: { n: number; children: React.ReactNode; htmlFor?: string; id?: string; legend?: boolean }) => {
    const contenido = (
      <>
        <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: `${accentColor}20`, color: accentColor, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {n}
        </span>
        {children}
      </>
    );
    const estilo = { ...labelStyle, display: "flex", alignItems: "center", gap: 8 } as const;
    // Con campo propio es un <label for>; si el paso es un grupo de botones, es un
    // título referenciado por aria-labelledby (un <label> sin campo no sirve).
    // En un <fieldset> el título es la <legend> del grupo (el estilo va en un span interno).
    if (legend) return <legend id={id} style={legendReset}><span style={estilo}>{contenido}</span></legend>;
    return htmlFor
      ? <label id={id} htmlFor={htmlFor} style={estilo}>{contenido}</label>
      : <div id={id} style={estilo}>{contenido}</div>;
  };

  // El árbitro es un producto aparte del Juego del Semáforo: al cerrar o volver
  // no debe mandar al dashboard del semáforo, sino quedarse dentro del árbitro.
  const volverAlArbitro = () => navigate(areaConfig ? `/arbitro/${areaConfig.key}` : "/arbitros-info");

  const materiasDisponibles = areaConfig
    ? Object.entries(areaConfig.materias).filter(([, m]) => m.niveles.includes(nivel))
    : [];

  const handleAreaChange = (a: string) => { setArea(a); setMateria(""); setTema(""); setEjercicio(""); setEjercicioEsIA(false); };
  const handleNivelChange = (n: NivelKey) => { setNivel(n); setAnio(GRADOS[n][2]); setMateria(""); setTema(""); };

  const iniciarSesionParaPreguntas = async () => {
    setLoginPreguntasError(false);
    try {
      await loginWithGoogle();
      setFaltaLoginPreguntas(false);
    } catch {
      setLoginPreguntasError(true);
    }
  };

  const handleGenerarPreguntas = async (skipCheck = false) => {
    // Generar preguntas gasta IA: la función exige sesión iniciada. Se avisa antes de llamar.
    if (!user) {
      setErrorGenerarPreguntas(null);
      setFaltaLoginPreguntas(true);
      return;
    }
    setFaltaLoginPreguntas(false);
    if (!materia || !tema.trim()) {
      setErrorGenerarPreguntas(ta.cfgErrPickSubject);
      return;
    }
    // El generador funciona sin texto base, pero pierde precisión (genera con
    // conocimiento general en vez de citar lo que el equipo va a leer) — avisamos
    // antes de la primera vez, sin bloquear.
    if (!skipCheck && !textoFuente.trim()) {
      setMostrarAdvertenciaTextoBase(true);
      return;
    }
    setErrorGenerarPreguntas(null);
    setGenerandoPreguntas(true);
    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "generarConsignasArbitro");
      const res = await fn({ materia, nivel, anio, tema: tema.trim(), subtema: "", cantidad: cantidadPreguntas, tipoPreguntas, textoFuente, idioma: idiomaSesion }) as {
        data: { consignas: string };
      };
      const generadas = res.data.consignas.trim();
      setEjercicio(prev => (prev.trim() && !ejercicioEsIA ? `${prev.trim()}\n\n${generadas}` : generadas));
      setEjercicioEsIA(true);
      setShowMaterial(true);
    } catch (err: any) {
      if (err?.code === "functions/unauthenticated") {
        setFaltaLoginPreguntas(true); // la sesión venció entre medio
      } else if (esIaNoDisponible(err)) {
        setErrorGenerarPreguntas(ta.aiUnavailable);
      } else {
        setErrorGenerarPreguntas(fillArbitro(ta.cfgErrGenQuestions, { detail: textoErrorArbitro(err, ta, err.message) }));
      }
    } finally {
      setGenerandoPreguntas(false);
    }
  };

  const TIPO_PREGUNTAS_OPCIONES: { key: "memoristica" | "mixta" | "capacidades"; label: string }[] = [
    { key: "memoristica", label: ta.cfgTypeMemory },
    { key: "mixta", label: ta.cfgTypeMixed },
    { key: "capacidades", label: ta.cfgTypeSkills },
  ];

  const renderAvisoLoginPreguntas = () => faltaLoginPreguntas ? (
    <div role="alert" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const, margin: "0 0 8px", fontSize: 12, color: PALETA.texto }}>
      <span>🔐 {ta.loginToGenerateQuestions}</span>
      <button type="button" onClick={iniciarSesionParaPreguntas}
        style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${PALETA.grisOscuro}`, backgroundColor: "white", color: PALETA.grisOscuro, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
        {ta.loginWithGoogle}
      </button>
      {loginPreguntasError && <span style={{ color: "#dc2626" }}>{ta.loginToGenerateQuestionsFailed}</span>}
    </div>
  ) : null;

  const renderSelectorTipoPreguntas = () => (
    <fieldset style={{ ...fieldsetReset, marginBottom: 8 }}>
      <legend style={srOnly}>{ta.questionTypeLegend}</legend>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
        {TIPO_PREGUNTAS_OPCIONES.map(op => (
          <button key={op.key} type="button" onClick={() => setTipoPreguntas(op.key)} aria-pressed={tipoPreguntas === op.key}
            style={{
              padding: "4px 10px", minHeight: 32, borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: tipoPreguntas === op.key ? `2px solid ${accentColor}` : "1px solid #cbd5e1",
              backgroundColor: tipoPreguntas === op.key ? `${accentColor}15` : "white",
              color: tipoPreguntas === op.key ? accentColor : "#475569",
            }}>
            {op.label}
          </button>
        ))}
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
        {tipoPreguntas === "capacidades" ? ta.cfgTypeSkillsHint : tipoPreguntas === "mixta" ? ta.cfgTypeMixedHint : ta.cfgTypeMemoryHint}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{modoRespuesta === "oral" ? ta.cfgTypeSuggestionOral : ta.cfgTypeSuggestionEscrita}</p>
      {ejercicioEsIA && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4, fontStyle: "italic" as const }}>{ta.cfgTypeReviewEdit}</p>
      )}
    </fieldset>
  );

  // Los documentos exportados (instrucciones, informe, Classroom, impresión) siguen el idioma de la SESIÓN, no el de la pantalla.
  const [idiomaCreada, setIdiomaCreada] = useState<IdiomaSesion>("es");
  const tx = arbitroDic(idiomaCreada);

  // Una sola fuente de contenido: lo que se edita acá es exactamente lo que se
  // manda a Classroom y lo que se imprime — nada de copias separadas.
  const buildContenidoCompleto = () => contenidoCompleto(tx, { materia, tema, nivel, anio, instrucciones, ejercicio, informe, link: linkSesion });

  // Criterio compartido entre las advertencias de "Generar sesión" y "Compartir
  // por Classroom": las dos avisan por lo mismo (falta texto base y/o preguntas),
  // así que arman el mensaje con la misma función en vez de tener cada una su
  // propio texto fijo.
  const getFaltantes = (): ("texto" | "preguntas")[] => {
    const faltan: ("texto" | "preguntas")[] = [];
    if (!textoFuente.trim()) faltan.push("texto");
    if (!ejercicio.trim()) faltan.push("preguntas");
    return faltan;
  };

  const mensajeFaltantes = (faltan: ("texto" | "preguntas")[]): string => {
    if (faltan.length === 2) return ta.cfgMissingBoth;
    if (faltan[0] === "texto") return ta.cfgMissingText;
    return ta.cfgMissingQuestions;
  };

  // Lista de preguntas de metacognición que se muestra en el editor (las por defecto del idioma de la sesión mientras no se toquen).
  const listaPreguntasEditor = preguntasMeta ?? preguntasPorDefecto(arbitroDic(idiomaSesion), "jg");
  // Lo que se guarda en la sesión: solo si el docente las cambió; igual a las por defecto (o vacío) = [] (se usan las del diccionario).
  const preguntasParaGuardar = (): string[] => {
    const lista = listaPreguntasMeta(preguntasMeta);
    return lista.length > 0 && !esIgualALasPorDefecto(arbitroDic(idiomaSesion), lista) ? lista : [];
  };

  // Lo que se guarda en la sesión: los criterios no vacíos, tal cual los escribió el docente. [] = sin criterios.
  const criteriosParaGuardar = (): string[] => criteriosDesdeSugeridos(criteriosSugeridosMarcados, criterioPropio, idiomaSesion, modoRespuesta);

  const handleGenerar = async (skipCheck = false) => {
    // El botón ya no se deshabilita nativamente cuando falta un campo (Etapa D: así "(obligatorio)"
    // se puede poner en rojo recién después de un primer intento) — evitamos el doble envío acá.
    if (loading) return;
    setIntentoCrear(true);
    if (!area) { setError(ta.cfgErrArea); return; }
    if (!materia) { setError(ta.cfgErrMateria); return; }
    if (!tema.trim()) { setError(ta.cfgErrTema); return; }
    // El juego corre sin banco de preguntas ni texto base, pero los equipos
    // tienen que inventar las preguntas en el momento y el árbitro pierde precisión.
    const faltanGenerar = getFaltantes();
    if (!skipCheck && faltanGenerar.length > 0) {
      setTextoAdvertenciaGenerar(mensajeFaltantes(faltanGenerar));
      setMostrarAdvertenciaGenerar(true);
      return;
    }
    setError(null); setLoading(true);

    // Iniciar sesión con Google es obligatorio para crear una sesión: así el
    // link del árbitro y los informes siempre quedan asociados a un docente
    // (email + uid), sin importar si después la comparten por Classroom, mail
    // o un link directo.
    if (!user) {
      try {
        await loginWithGoogle();
      } catch (err: any) {
        setError(ta.cfgErrLogin);
        setLoading(false);
        return;
      }
    }

    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "crearSesionArbitro");
      const res = await fn({ area: areaConfig?.key ?? area, materia, nivel, anio, tema: tema.trim(), subtema: "", ejercicio, duracion, tiempoPregunta, textoFuente, permitirPreguntasPropias, idioma: idiomaSesion, modoMetacognicion, preguntasMetacognicion: preguntasParaGuardar(), modoRespuesta, verTextoDuranteJuego: !!textoFuente.trim() && verTextoDuranteJuego, criteriosCalificacion: criteriosParaGuardar() }) as {
        data: { id: string; link: string; expiresAt: string };
      };
      setSesion(res.data);
      setIdiomaCreada(idiomaSesion);
      setInstrucciones(instruccionesPorDefecto(arbitroDic(idiomaSesion), tema.trim(), modoMetacognicion, modoRespuesta, !!textoFuente.trim() && verTextoDuranteJuego, criteriosParaGuardar()));
      setInforme(informePorDefecto(arbitroDic(idiomaSesion), tema.trim()));
    } catch (err: any) {
      setError(fillArbitro(ta.cfgErrCreate, { detail: textoErrorArbitro(err, ta, err.message) }));
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

  // El botón de imprimir dispara window.print() sobre #arbitro-print-area.
  // abrirPDF es la acción pelada; handleImprimir es la que chequea antes.
  const abrirPDF = () => window.print();

  const handleImprimir = () => {
    if (!compartidoViaClassroom) {
      setMostrarAdvertenciaPDF(true);
      return;
    }
    abrirPDF();
  };

  const handleClassroom = async (skipCheck = false) => {
    if (!sesion) return;
    // Mismo criterio que handleGenerar: sin texto base ni preguntas el juego
    // funciona, pero conviene avisarlo antes de compartir.
    const faltanClassroom = getFaltantes();
    if (!skipCheck && faltanClassroom.length > 0) {
      setTextoAdvertenciaClassroom(mensajeFaltantes(faltanClassroom));
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
      setErrorSesion(ta.cfgErrLogout);
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
        tituloClassroom(tx, materia, tema),
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
      setCompartidoViaClassroom(true);
    } catch (e: any) {
      setErrorClassroom(e.message);
    }
    setCreandoTarea(false);
  };

  const canGenerate = !!area && !!materia && !!tema.trim() && !loading;

  // Punto A.6: a diferencia de getFaltantes() (texto/preguntas, un aviso no bloqueante después de hacer clic),
  // esto dice por qué el botón está DESHABILITADO — hoy quedaba gris sin ninguna explicación.
  const camposFaltantesParaGenerar = (): string[] => {
    const faltan: string[] = [];
    if (!area) faltan.push(ta.cfgMissingAreaLabel);
    if (!materia) faltan.push(ta.cfgMissingMateriaLabel);
    if (!tema.trim()) faltan.push(ta.cfgMissingTemaLabel);
    return faltan;
  };

  // Paso 7 ("Opciones de la sesión"): plegado por defecto, con un resumen de cómo quedan las opciones
  // actuales — para que no haga falta desplegarlo si no se las quiere tocar. La función en sí vive en
  // arbitroResumenOpciones.ts (testable sin renderizar la pantalla); acá solo se le pasa el estado actual.
  const resumenOpcionesActual = (): string => resumenOpcionesSesion(ta, {
    duracion, tiempoPregunta, permitirPreguntasPropias, modoMetacognicion,
    preguntasMetaEditadas: preguntasParaGuardar().length > 0,
    nCriterios: criteriosParaGuardar().length,
  });

  return (
    <>
      <style>{`
        #arbitro-print-area { display: none; }
        @media (max-width: 560px) {
          .arb-hdr { flex-wrap: wrap; row-gap: 10px; padding-left: 16px !important; padding-right: 16px !important; }
          .arb-hdr-title { flex: 1 1 0; min-width: 0; }
          .arb-hdr-ctl { position: static !important; order: 3; flex-basis: 100%; max-width: none !important; align-items: flex-start !important; }
        }
        @media print {
          body * { visibility: hidden; }
          #arbitro-print-area, #arbitro-print-area * { visibility: visible; }
          #arbitro-print-area { display: block; position: absolute; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <main style={pageStyle}>
        <div style={cardStyle}>

          {/* ── Header ── */}
          <div className="arb-hdr" style={{ background: headerGrad, padding: "20px 28px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "white", position: "relative" }}>
            <div className="arb-hdr-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{areaConfig ? areaConfig.emoji : "⚖️"}</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{ta.sesTitle}</h1>
              </div>
            </div>
            <div className="arb-hdr-ctl" style={{
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
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LanguageSelector compact tone="onColor" idiomas={IDIOMAS_ARBITRO} etiqueta={ta.cfgUiLang} />
              <a
                href="/arbitro-panel"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffffff",
                  textDecoration: "none",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.7)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}>
                {ta.cfgMySessions}
              </a>
              </div>
              {user && (
                <div style={{
                  fontSize: 12,
                  color: "#ffffff",
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
                      color: "#ffffff",
                      fontSize: 12,
                      cursor: cerrandoSesion ? "default" : "pointer",
                      padding: "4px 8px",
                      minHeight: 24,
                      borderRadius: 6,
                      fontWeight: 600,
                      textDecoration: "underline",
                      flexShrink: 0,
                    }}>
                    {cerrandoSesion ? ta.cfgLoggingOut : ta.cfgLogout}
                  </button>
                </div>
              )}
              {errorSesion && (
                <div style={{ fontSize: 12, color: "#fecaca", textAlign: "right" as const }}>{errorSesion}</div>
              )}
            </div>
            <button onClick={volverAlArbitro} aria-label={ta.closeConfig} title={ta.closeConfig} style={closeBtnStyle}><span aria-hidden="true">✕</span></button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "72vh", display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>

            {/* Encabezado de la sección del formulario (para lectores de pantalla) y avisos de estado */}
            <h2 style={srOnly}>{ta.configFormTitle}</h2>
            <div role="status" style={srOnly}>{sesion ? ta.sessionCreatedAnnounce : generandoPreguntas ? ta.generatingQuestions : ""}</div>

            {/* Cómo funciona — acordeón */}
            <ComoFuncionaAccordionES primary={PALETA.grisOscuro} light="#f8fafc" border="#e2e8f0" conTextoDuranteJuego={!!textoFuente.trim() && verTextoDuranteJuego} />

            {/* ── Área: línea compacta (área actual + «Cambiar»); las 4 opciones se despliegan al cambiar o si no hay área elegida ── */}
            <div>
              {area && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "8px 12px", borderRadius: 12,
                  backgroundColor: "#f8fafc",
                  border: "2px solid #e2e8f0",
                }}>
                  <span aria-hidden="true" style={{ fontSize: 22 }}>{areaConfig?.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: PALETA.grisOscuro }}>
                    {ta.cfgAreaShort}: <strong style={{ color: "#1e293b", fontWeight: 800 }}>{nombreVisible(ta.areaNames, area)}</strong>
                  </span>
                  <button type="button" aria-expanded={areaAbierto} aria-controls="config-area-opciones" aria-label={ta.cfgAreaChangeLabel}
                    onClick={() => setAreaAbierto(v => !v)}
                    style={{ minHeight: 44, padding: "0 14px", borderRadius: 10, border: "2px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {ta.cfgAreaChange}
                  </button>
                </div>
              )}
              <fieldset id="config-area-opciones" hidden={!!area && !areaAbierto} style={{ ...fieldsetReset, marginTop: area ? 10 : 0 }}>
                <legend style={{ ...legendReset, ...labelStyle }}>{ta.cfgAreaLegend}</legend>
                <div className="arb-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {Object.entries(AREAS).map(([nombre, cfg]) => (
                    <button key={nombre} type="button" onClick={() => { handleAreaChange(nombre); setAreaAbierto(false); }} aria-pressed={area === nombre} style={{
                      padding: "16px 12px", borderRadius: 14, cursor: "pointer", textAlign: "center" as const,
                      border: `2px solid ${area === nombre ? cfg.primary : "#e2e8f0"}`,
                      backgroundColor: area === nombre ? `${cfg.primary}15` : "white",
                      transition: "all 0.15s",
                    }}>
                      <div style={{ fontSize: 26, marginBottom: 5 }}>{cfg.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: area === nombre ? cfg.primary : "#475569", lineHeight: 1.3 }}>
                        {nombreVisible(ta.areaNames, nombre)}
                      </div>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* ── Idioma del juego: antes de las preguntas, porque el generador con IA usa el idioma de la sesión ── */}
              <fieldset style={{ ...fieldsetReset, display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: 10, rowGap: 6 }}>
                <legend style={{ ...legendReset, display: "inline-flex" as const, width: "auto", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{ta.cfgSessionLang}</legend>
                <div style={{ display: "flex", gap: 6 }}>
                  {([
                    { id: "es" as const, label: ta.cfgLangEs },
                    { id: "en" as const, label: ta.cfgLangEn },
                  ]).map(i => (
                    <button key={i.id} type="button" lang={i.id} onClick={() => setIdiomaSesion(i.id)} aria-pressed={idiomaSesion === i.id}
                      style={{
                        padding: "6px 14px", borderRadius: 8, minHeight: 32,
                        border: `2px solid ${idiomaSesion === i.id ? accentColor : "#e2e8f0"}`,
                        backgroundColor: idiomaSesion === i.id ? `${accentColor}12` : "white",
                        color: idiomaSesion === i.id ? accentColor : "#64748b",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                      }}>
                      {i.label}
                    </button>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: PALETA.gris, lineHeight: 1.5, flexBasis: "100%" as const }}>{ta.cfgSessionLangHint}</p>
              </fieldset>

            {/* ── Nivel + Año ── */}
            <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <fieldset style={fieldsetReset}>
                <PasoLabel n={1} legend>{ta.cfgLevel}</PasoLabel>
                <div style={{ display: "flex", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {(["Primaria", "Secundaria"] as NivelKey[]).map(n => (
                    <button key={n} className="arb-foco" onClick={() => handleNivelChange(n)} aria-pressed={nivel === n} style={{
                      flex: 1, padding: "10px", fontSize: 13, fontWeight: 600,
                      border: "none", cursor: "pointer",
                      backgroundColor: nivel === n ? accentColor : "white",
                      color: nivel === n ? "white" : "#475569",
                      transition: "all 0.2s",
                    }}>{nombreVisible(ta.levelNames, n)}</button>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="config-anio" style={labelStyle}>{ta.cfgGradeYear}</label>
                <select id="config-anio" value={anio} onChange={e => setAnio(e.target.value)} style={selectStyle}>
                  {GRADOS[nivel].map(g => <option key={g} value={g}>{ta.gradeLabel(g)}</option>)}
                </select>
              </div>
            </div>

            {/* ── Materia ── */}
            {area && (
              <fieldset style={fieldsetReset}>
                <PasoLabel n={2} legend>{ta.cfgSubject}</PasoLabel>
                {materiasDisponibles.length === 0 ? (
                  <div style={{ fontSize: 13, color: PALETA.gris, padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    {fillArbitro(ta.cfgNoSubjects, { level: nombreVisible(ta.levelNames, nivel) })}
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                    {materiasDisponibles.map(([nombre, data]) => (
                      <button key={nombre} onClick={() => setMateria(nombre)} aria-pressed={materia === nombre} style={{
                        padding: "11px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center" as const,
                        border: `2px solid ${materia === nombre ? accentColor : "#e2e8f0"}`,
                        backgroundColor: materia === nombre ? `${accentColor}15` : "white",
                      }}>
                        <div style={{ fontSize: 17, marginBottom: 3 }}>{data.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: materia === nombre ? accentColor : "#1e293b", lineHeight: 1.3 }}>
                          {nombreVisible(ta.materiaNames, nombre)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            )}

            {/* ── Tema (texto libre) ── */}
            {materia && (
              <div>
                <PasoLabel n={3} htmlFor="config-tema">
                  {ta.cfgTopic} <span style={{ color: (intentoCrear && !tema.trim()) ? PALETA.rojo : PALETA.gris, fontWeight: 700 }}>({ta.required})</span>
                </PasoLabel>
                <input
                  id="config-tema"
                  type="text" value={tema} onChange={e => setTema(e.target.value)}
                  required aria-required="true" aria-describedby={tema.trim() ? undefined : "config-tema-ayuda"}
                  placeholder={ta.cfgTopicPlaceholder}
                  style={{ ...inputStyle, borderColor: tema.trim() ? "#e2e8f0" : "#fca5a5", fontSize: 15 }}
                />
                {!tema.trim() && (
                  <p id="config-tema-ayuda" style={{ margin: "6px 0 0", fontSize: 12, color: PALETA.rojo, fontWeight: 600 }}>
                    {ta.themeRequiredHint}
                  </p>
                )}
              </div>
            )}

            {/* ── Texto base de la sesión ── */}
            {tema.trim() && (
              <div id="texto-base-sesion">
                <PasoLabel n={4} htmlFor="config-texto-base">
                  {ta.cfgBaseText}{" "}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b", marginLeft: 6 }}>
                    {ta.cfgRecommended}
                  </span>
                </PasoLabel>
                <textarea
                  id="config-texto-base"
                  value={textoFuente}
                  onChange={e => setTextoFuente(e.target.value)}
                  rows={6}
                  placeholder={ta.cfgBaseTextPlaceholder}
                  style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "inherit", lineHeight: 1.6 }}
                />
                {/* El placeholder desaparece apenas se escribe, así que la explicación de por qué conviene
                    cargar un texto base va acá, visible siempre, y no dentro del placeholder. */}
                <p style={{ margin: "6px 0 0", fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>{ta.cfgBaseTextHelp}</p>
                {/* Aviso + contador de caracteres */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 6, gap: 12 }}>
                  <div style={{ fontSize: 12, color: PALETA.gris, lineHeight: 1.5, flex: 1 }}>
                    📖 <strong>{ta.cfgBeforePlayStrong}</strong> {ta.cfgBeforePlayA} <strong>{ta.cfgBeforePlayStrong2}</strong>{ta.cfgBeforePlayB}
                  </div>
                  {textoFuente.length > 0 && (
                    <div style={{
                      fontSize: 12, fontWeight: 700, textAlign: "right" as const, maxWidth: 160,
                      color: textoFuente.length > 8000 ? "#dc2626" : textoFuente.length > 6000 ? PALETA.ambar : PALETA.gris,
                    }}>
                      <div style={{ whiteSpace: "nowrap" as const }}>
                        {ta.cfgCharCount(textoFuente.length.toLocaleString(locale))}
                      </div>
                      {textoFuente.length > 6000 && textoFuente.length <= 8000 && (
                        <div style={{ marginTop: 2, lineHeight: 1.4 }}>
                          ⚠️ {ta.charsNearLimit}
                        </div>
                      )}
                      {textoFuente.length > 8000 && (
                        <div style={{ color: "#dc2626", fontWeight: 700, marginTop: 2, lineHeight: 1.4 }}>
                          ⚠️ {ta.cfgCutWarning}
                        </div>
                      )}
                    </div>
                  )}
                  {/* El aviso se anuncia una sola vez al cruzar el umbral, no en cada tecla */}
                  <div role="status" style={srOnly}>
                    {textoFuente.length > 8000 ? ta.charsOverLimit : textoFuente.length > 6000 ? ta.charsNearLimit : ""}
                  </div>
                </div>
                {/* «Texto durante el juego» (solo si hay texto base cargado): sin el texto (por defecto, se guarda
                    como false si no hay texto base) o con el texto impreso a mano durante la ronda. */}
                {textoFuente.trim() && (
                  <fieldset style={{ ...fieldsetReset, marginTop: 14 }}>
                    <legend style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", padding: 0, marginBottom: 6 }}>{ta.cfgTextLiveTitle}</legend>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                      {([
                        { id: false as const, label: ta.cfgTextLiveWithout },
                        { id: true as const, label: ta.cfgTextLiveWith },
                      ]).map(o => (
                        <button key={String(o.id)} type="button" onClick={() => setVerTextoDuranteJuego(o.id)} aria-pressed={verTextoDuranteJuego === o.id}
                          style={{
                            padding: "10px 6px", borderRadius: 10, minHeight: 44,
                            border: `2px solid ${verTextoDuranteJuego === o.id ? accentColor : "#e2e8f0"}`,
                            backgroundColor: verTextoDuranteJuego === o.id ? `${accentColor}12` : "white",
                            color: verTextoDuranteJuego === o.id ? accentColor : "#64748b",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                          }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>{ta.cfgTextLiveWithoutDesc}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>{ta.cfgTextLiveWithDesc}</p>
                  </fieldset>
                )}
              </div>
            )}

            {/* ── 5. Modo de respuesta: tarjetas con título + una línea + detalle expandible (Etapa D) ── */}
            {tema.trim() && (
              <fieldset style={fieldsetReset}>
                <PasoLabel n={5} legend>{ta.cfgAnswerMode}</PasoLabel>
                <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  {([
                    { id: "oral" as const, titulo: ta.cfgAnswerOralTitle, resumen: ta.cfgAnswerOralSummary, hint: ta.cfgAnswerOralHint, abierto: masDetalleOral, setAbierto: setMasDetalleOral },
                    { id: "escrita" as const, titulo: ta.cfgAnswerWrittenTitle, resumen: ta.cfgAnswerWrittenSummary, hint: ta.cfgAnswerWrittenHint, abierto: masDetalleEscrita, setAbierto: setMasDetalleEscrita },
                  ]).map(m => (
                    <div key={m.id} style={{
                      padding: "12px 14px", borderRadius: 10,
                      border: `2px solid ${modoRespuesta === m.id ? accentColor : "#e2e8f0"}`,
                      backgroundColor: modoRespuesta === m.id ? `${accentColor}12` : "white",
                    }}>
                      <button type="button" onClick={() => setModoRespuesta(m.id)} aria-pressed={modoRespuesta === m.id}
                        style={{
                          width: "100%", textAlign: "left" as const, background: "none", border: "none", padding: 0, margin: 0,
                          cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
                        }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: modoRespuesta === m.id ? accentColor : "#1e293b" }}>
                          {m.titulo}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 400, color: PALETA.gris, lineHeight: 1.5 }}>{m.resumen}</span>
                      </button>
                      <button type="button" aria-expanded={m.abierto} aria-controls={`config-modo-detalle-${m.id}`}
                        onClick={() => m.setAbierto(v => !v)}
                        style={{ marginTop: 6, background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 600, color: accentColor, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <span aria-hidden="true">ⓘ</span> {ta.cfgAnswerMoreDetail} <span aria-hidden="true">{m.abierto ? "▲" : "▼"}</span>
                      </button>
                      {m.abierto && (
                        <p id={`config-modo-detalle-${m.id}`} style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 400, color: PALETA.gris, lineHeight: 1.5 }}>{m.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
                {modoRespuesta === "escrita" && tiempoPregunta === 60 && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: PALETA.ambar, lineHeight: 1.5 }}>
                    ⚠️ {ta.cfgAnswerWrittenShortTimeWarning}
                  </p>
                )}
              </fieldset>
            )}

            {/* ── 6. Preguntas para el juego: mismo formato que los demás pasos; sigue siendo plegable ── */}
            {tema.trim() && (
              <div id="banco-preguntas">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <PasoLabel n={6}>{ta.cfgGameQuestions}</PasoLabel>
                  <button type="button" onClick={() => setShowMaterial(!showMaterial)} aria-expanded={showMaterial} aria-controls="banco-preguntas-panel"
                    style={{ background: "none", border: "none", padding: "4px 8px", fontSize: 12, fontWeight: 600, color: accentColor, cursor: "pointer" }}>
                    {showMaterial ? ta.cfgHide : ta.cfgAdd}
                  </button>
                </div>
                {showMaterial && (
                  <div id="banco-preguntas-panel" style={{ marginTop: 8 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                      {ta.cfgQuestionsHint1}
                    </p>
                    {textoFuente.trim() && (
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                        {verTextoDuranteJuego ? ta.cfgQuestionsHint2ConTexto : ta.cfgQuestionsHint2}
                      </p>
                    )}
                    {renderSelectorTipoPreguntas()}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" as const }}>
                      <input id="config-cantidad-preguntas-a" aria-label={ta.questionsCountName} type="number" min={3} max={30} value={cantidadPreguntas}
                        onChange={e => setCantidadPreguntas(Math.min(30, Math.max(3, parseInt(e.target.value) || 6)))}
                        style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
                      <span style={{ fontSize: 12, color: "#64748b" }}>{ta.cfgQuestionsUnit}</span>
                      <button onClick={() => handleGenerarPreguntas()} disabled={generandoPreguntas || !materia || !tema.trim()}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "none",
                          backgroundColor: generandoPreguntas ? PALETA.gris : accentColor,
                          color: "white", fontWeight: 600, fontSize: 12,
                          cursor: generandoPreguntas || !materia || !tema.trim() ? "default" : "pointer",
                        }}>
                        {generandoPreguntas ? ta.cfgGenerating : ta.cfgGenerateBtn}
                      </button>
                    </div>
                    {renderAvisoLoginPreguntas()}
                    {errorGenerarPreguntas && (
                      <p role="alert" style={{ margin: "0 0 8px", fontSize: 12, color: "#dc2626" }}>{errorGenerarPreguntas}</p>
                    )}
                    <textarea aria-label={ta.questionsFieldName} value={ejercicio} onChange={e => { setEjercicio(e.target.value); setEjercicioEsIA(false); }} rows={4}
                      placeholder={ta.cfgQuestionsPlaceholder}
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                  </div>
                )}
              </div>
            )}

            {/* ── 7. Opciones de la sesión: plegado por defecto, con resumen de los valores actuales (Etapa D) ── */}
            {tema.trim() && (
              <fieldset style={fieldsetReset}>
                <PasoLabel n={7} legend>{ta.cfgSessionOptions}</PasoLabel>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 8, flexWrap: "wrap" as const }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>{ta.cfgOptsLeaveAsIs}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.5, fontWeight: 600 }}>{resumenOpcionesActual()}</p>
                  </div>
                  <button type="button" aria-expanded={opcionesAbierto} aria-controls="config-opciones-panel"
                    onClick={() => setOpcionesAbierto(v => !v)}
                    style={{ minHeight: 36, padding: "0 14px", borderRadius: 10, border: "2px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    {opcionesAbierto ? ta.cfgOptsHide : ta.cfgOptsChange}
                  </button>
                </div>
                {opcionesAbierto && (
                <div id="config-opciones-panel" style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>

            {/* ── Duración ── */}
            {tema.trim() && (
              <fieldset style={fieldsetReset}>
                <legend style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", padding: 0, marginBottom: 8 }}>{ta.cfgDuration}</legend>
                <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { id: "clase" as const, label: ta.cfgDurClass, desc: ta.cfgDurClassDesc },
                    { id: "dia" as const, label: ta.cfgDurDay, desc: ta.cfgDurDayDesc },
                  ]).map(d => (
                    <button key={d.id} onClick={() => setDuracion(d.id)} aria-pressed={duracion === d.id} style={{
                      padding: "12px 16px", borderRadius: 12, textAlign: "left" as const,
                      border: `2px solid ${duracion === d.id ? accentColor : "#e2e8f0"}`,
                      backgroundColor: duracion === d.id ? `${accentColor}12` : "white",
                      cursor: "pointer",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: duracion === d.id ? accentColor : "#1e293b" }}>{d.label}</div>
                      <div style={{ fontSize: 12, color: PALETA.grisOscuro, marginTop: 2 }}>{d.desc}</div>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* ── Tiempo para formular la pregunta ── */}
            {tema.trim() && (
              <fieldset style={fieldsetReset}>
                <legend style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", padding: 0, marginBottom: 8 }}>{ta.cfgRoundTime}</legend>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {([
                    { val: 0, label: ta.cfgNoLimit },
                    { val: 60, label: fillArbitro(ta.cfgMinutes, { n: 1 }) },
                    { val: 120, label: fillArbitro(ta.cfgMinutes, { n: 2 }) },
                    { val: 180, label: fillArbitro(ta.cfgMinutes, { n: 3 }) },
                  ]).map(t => (
                    <button key={t.val} onClick={() => setTiempoPregunta(t.val)} aria-pressed={tiempoPregunta === t.val}
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
                <p style={{ margin: "6px 0 0", fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>
                  {ta.cfgRoundTimeHint}
                </p>
              </fieldset>
            )}

            {/* ── Preguntas propias ── */}
            {tema.trim() && (
              <div>
                <label htmlFor="config-preguntas-propias" style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", minHeight: 44 }}>
                  <input
                    id="config-preguntas-propias"
                    type="checkbox"
                    checked={permitirPreguntasPropias}
                    onChange={e => setPermitirPreguntasPropias(e.target.checked)}
                    style={{ width: 24, height: 24, marginTop: 2, accentColor, flexShrink: 0 }}
                  />
                  <span>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{ta.allowOwnQuestions}</span>
                    <span style={{ display: "block", fontSize: 12, color: PALETA.gris, lineHeight: 1.5, marginTop: 2 }}>{ta.allowOwnQuestionsHint}</span>
                  </span>
                </label>
              </div>
            )}

            {/* ── Informe de metacognición: grupal (por defecto) o individual ── */}
            {tema.trim() && (
              <fieldset style={fieldsetReset}>
                <legend style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", padding: 0, marginBottom: 8 }}>{ta.cfgMetaMode}</legend>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {([
                    { id: "grupal" as const, label: ta.cfgMetaGroup },
                    { id: "individual" as const, label: ta.cfgMetaIndividual },
                  ]).map(m => (
                    <button key={m.id} type="button" onClick={() => setModoMetacognicion(m.id)} aria-pressed={modoMetacognicion === m.id}
                      style={{
                        padding: "10px 6px", borderRadius: 10, minHeight: 44,
                        border: `2px solid ${modoMetacognicion === m.id ? accentColor : "#e2e8f0"}`,
                        backgroundColor: modoMetacognicion === m.id ? `${accentColor}12` : "white",
                        color: modoMetacognicion === m.id ? accentColor : "#64748b",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>
                  {modoMetacognicion === "individual" ? ta.cfgMetaIndividualHint : ta.cfgMetaGroupHint}
                </p>
                {modoMetacognicion === "individual" && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: PALETA.ambar, lineHeight: 1.5 }}>⚠️ {ta.cfgMetaIndividualWarning}</p>
                )}
                {/* Preguntas de metacognición (avanzado): acordeón cerrado por defecto, dentro del informe */}
              <div style={{ border: "2px solid #e2e8f0", borderRadius: 12, overflow: "hidden", flexShrink: 0, marginTop: 12 }}>
                <h3 style={{ margin: 0 }}>
                  <button type="button" id="config-metaq-boton" aria-expanded={preguntasMetaAbierto} aria-controls="config-metaq-panel"
                    onClick={() => setPreguntasMetaAbierto(v => !v)}
                    style={{ width: "100%", minHeight: 44, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "none", backgroundColor: "#f8fafc", color: "#1e293b", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                    <span>{ta.cfgMetaQTitle}</span>
                    <span aria-hidden="true">{preguntasMetaAbierto ? "▲" : "▼"}</span>
                  </button>
                </h3>
                <div id="config-metaq-panel" role="region" aria-labelledby="config-metaq-boton" hidden={!preguntasMetaAbierto} style={{ padding: preguntasMetaAbierto ? 14 : 0 }}>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>{ta.cfgMetaQHint}</p>
                  {listaPreguntasEditor.map((texto, k) => {
                    const idP = `config-metaq-${k + 1}`;
                    return (
                      <div key={k} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <label htmlFor={idP} style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700, color: "#374151" }}>{fillArbitro(ta.cfgMetaQN, { n: k + 1 })}</label>
                          <textarea id={idP} value={texto} rows={2} maxLength={MAX_LARGO_PREGUNTA}
                            onChange={e => setPreguntasMeta(listaPreguntasEditor.map((v, j) => j === k ? e.target.value : v))}
                            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", fontFamily: "inherit", resize: "vertical" }} />
                        </div>
                        {listaPreguntasEditor.length > MIN_PREGUNTAS_META && (
                          <button type="button" aria-label={fillArbitro(ta.cfgMetaQRemoveLabel, { n: k + 1 })}
                            onClick={() => { setPreguntasMeta(listaPreguntasEditor.filter((_, j) => j !== k)); setTimeout(() => document.getElementById("config-metaq-boton")?.focus(), 0); }}
                            style={{ minHeight: 44, padding: "0 12px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#1e293b", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                            {ta.cfgMetaQRemove}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" disabled={listaPreguntasEditor.length >= MAX_PREGUNTAS_META}
                      onClick={() => { setPreguntasMeta([...listaPreguntasEditor, ""]); setTimeout(() => document.getElementById(`config-metaq-${listaPreguntasEditor.length + 1}`)?.focus(), 0); }}
                      style={{ minHeight: 44, padding: "0 14px", borderRadius: 10, border: `2px dashed ${PALETA.gris}`, backgroundColor: "white", color: "#1e293b", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: listaPreguntasEditor.length >= MAX_PREGUNTAS_META ? 0.5 : 1 }}>
                      {ta.cfgMetaQAdd}
                    </button>
                    <button type="button" onClick={() => setPreguntasMeta(null)}
                      style={{ minHeight: 44, padding: "0 14px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#1e293b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      {ta.cfgMetaQReset}
                    </button>
                  </div>
                </div>
              </div>
              </fieldset>
            )}

            {/* ── Criterios de calificación (opcionales, B.1): calcado del acordeón de preguntas de metacognición ── */}
            {tema.trim() && (
              <div style={{ border: "2px solid #e2e8f0", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                <h3 style={{ margin: 0 }}>
                  <button type="button" id="config-criterios-boton" aria-expanded={criteriosAbierto} aria-controls="config-criterios-panel"
                    onClick={() => setCriteriosAbierto(v => !v)}
                    style={{ width: "100%", minHeight: 44, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "none", backgroundColor: "#f8fafc", color: "#1e293b", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                    <span>{ta.cfgCriteriosTitle}</span>
                    <span aria-hidden="true">{criteriosAbierto ? "▲" : "▼"}</span>
                  </button>
                </h3>
                <div id="config-criterios-panel" role="region" aria-labelledby="config-criterios-boton" hidden={!criteriosAbierto} style={{ padding: criteriosAbierto ? 14 : 0 }}>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: PALETA.gris, lineHeight: 1.5 }}>{ta.cfgCriteriosHint}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {CRITERIOS_SUGERIDOS.map((c, i) => {
                      if (c.soloEscrita && modoRespuesta !== "escrita") return null;
                      const marcado = criteriosSugeridosMarcados[i];
                      const totalMarcados = criteriosSugeridosMarcados.filter(Boolean).length + (criterioPropio.trim() ? 1 : 0);
                      const bloqueado = !marcado && totalMarcados >= MAX_CRITERIOS;
                      const texto = idiomaInterfaz === "en" ? c.en : c.es;
                      const idC = `config-criterio-sugerido-${i}`;
                      return (
                        <label key={i} htmlFor={idC} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: bloqueado ? "#94a3b8" : "#374151", cursor: bloqueado ? "default" : "pointer" }}>
                          <input type="checkbox" id={idC} checked={marcado} disabled={bloqueado}
                            onChange={e => setCriteriosSugeridosMarcados(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                            style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0 }} />
                          <span>{texto}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label htmlFor="config-criterio-propio" style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700, color: "#374151" }}>{ta.cfgCriterioPropio}</label>
                    <textarea id="config-criterio-propio" value={criterioPropio} rows={2} maxLength={MAX_LARGO_CRITERIO}
                      disabled={!criterioPropio.trim() && criteriosSugeridosMarcados.filter(Boolean).length >= MAX_CRITERIOS}
                      onChange={e => setCriterioPropio(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", fontFamily: "inherit", resize: "vertical" }} />
                  </div>
                </div>
              </div>
            )}

                </div>
                )}
              </fieldset>
            )}

            {/* Error */}
            {error && (
              <div role="alert" style={{ padding: "12px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#b91c1c", border: "1px solid #fecaca" }}>
                {error}
              </div>
            )}

            {loading && (
              <div role="status" style={{ padding: "14px 18px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden="true" style={{ fontSize: 24 }}>⏳</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>{ta.cfgCreatingSession}</div>
              </div>
            )}

            {/* ── Sesión creada ── */}
            {sesion && (
              <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #86efac", borderRadius: 16, padding: 20 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#166534" }}>{ta.cfgSessionCreated}</h2>
                <div style={{ fontSize: 12, color: "#15803d", marginBottom: 14 }}>
                  {fillArbitro(ta.cfgExpires, { date: new Date(sesion.expiresAt).toLocaleString(locale) })}
                </div>
                <div style={{ backgroundColor: "white", borderRadius: 10, border: "1px solid #bbf7d0", padding: "12px 14px", fontFamily: "monospace", fontSize: 13, color: "#166534", wordBreak: "break-all", marginBottom: 8 }}>
                  {linkSesion}
                </div>
                <div style={{ fontSize: 12, color: "#15803d", marginBottom: 12, lineHeight: 1.5 }}>
                  {ta.cfgOneLink}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <button onClick={handleCopy} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "2px solid #86efac", backgroundColor: "white", color: "#166534", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {copied ? ta.cfgCopied : ta.cfgCopyLink}
                  </button>
                  <button onClick={() => handleClassroom()} style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "none", backgroundColor: "#1967d2", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {ta.cfgShareClassroom}
                  </button>
                </div>
                <button onClick={() => setMostrarProyeccion(true)}
                  style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: `2px solid ${accentColor}`, backgroundColor: "white", color: accentColor, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>
                  📽️ {ta.proyButton}
                </button>
                <a href="/arbitro-panel"
                  style={{ display: "block", textAlign: "center", marginTop: 10, padding: "8px 0", minHeight: 24, fontSize: 13, color: PALETA.grisOscuro, textDecoration: "none", fontWeight: 600 }}>
                  {ta.cfgSeeHistory}
                </a>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  <CollapsibleField
                    label={ta.cfgPostInstr} open={showPostInstrucciones}
                    onToggle={() => setShowPostInstrucciones(v => !v)}
                    description={ta.cfgPostInstrDesc}
                    value={instrucciones} onChange={setInstrucciones} rows={7} accentColor={accentColor}
                  />
                  <CollapsibleField
                    label={ta.cfgGameQuestions} open={showPostPreguntas}
                    onToggle={() => setShowPostPreguntas(v => !v)}
                    description={ta.cfgPostQuestionsDesc}
                    value={ejercicio} onChange={v => { setEjercicio(v); setEjercicioEsIA(false); }} rows={4} placeholder={ta.cfgQuestionsPlaceholder} accentColor={accentColor}
                    extra={
                      <div>
                      {renderSelectorTipoPreguntas()}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" as const }}>
                        <input id="config-cantidad-preguntas-b" aria-label={ta.questionsCountName} type="number" min={3} max={30} value={cantidadPreguntas}
                          onChange={e => setCantidadPreguntas(Math.min(30, Math.max(3, parseInt(e.target.value) || 6)))}
                          style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>{ta.cfgQuestionsUnit}</span>
                        <button onClick={() => handleGenerarPreguntas()} disabled={generandoPreguntas || !materia || !tema.trim()}
                          style={{
                            padding: "6px 12px", borderRadius: 8, border: "none",
                            backgroundColor: generandoPreguntas ? PALETA.gris : accentColor,
                            color: "white", fontWeight: 600, fontSize: 12,
                            cursor: generandoPreguntas || !materia || !tema.trim() ? "default" : "pointer",
                          }}>
                          {generandoPreguntas ? ta.cfgGenerating : ta.cfgGenerateBtn}
                        </button>
                        {errorGenerarPreguntas && <span role="alert" style={{ fontSize: 12, color: "#dc2626" }}>{errorGenerarPreguntas}</span>}
                      </div>
                      {renderAvisoLoginPreguntas()}
                      </div>
                    }
                  />
                  <CollapsibleField
                    label={ta.cfgPostReport} open={showPostInforme}
                    onToggle={() => setShowPostInforme(v => !v)}
                    description={ta.cfgPostReportDesc}
                    value={informe} onChange={setInforme} rows={7} accentColor={accentColor}
                  />
                </div>

                <button onClick={handleImprimir} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${accentColor}`, backgroundColor: `${accentColor}08`, color: accentColor, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  {ta.cfgPrint}
                </button>
                <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 6, marginBottom: 6, textAlign: "center" as const }}>
                  {ta.cfgPrintHint}
                </div>

                <button onClick={() => setSesion(null)} style={{ background: "none", border: "none", color: "#15803d", textDecoration: "underline", fontSize: 12, marginTop: 8, cursor: "pointer" }}>
                  {ta.cfgCreateAnother}
                </button>

                {/* Versión oculta en pantalla, visible solo al imprimir (window.print) */}
                <div id="arbitro-print-area">
                  <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>{areaConfig ? areaConfig.emoji : "⚖️"} {fillArbitro(tx.docPrintTitle, { materia: nombreVisible(tx.materiaNames, materia) })}</h1>
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>{nombreVisible(tx.levelNames, nivel)} {anio} · {tema}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#374151", margin: "18px 0 6px" }}>{tx.docPrintInstr}</div>
                  <div style={{ whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.7 }}>{instrucciones}</div>
                  {ejercicio && (<>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#374151", margin: "18px 0 6px" }}>{tx.docPrintQuestions}</div>
                    <div style={{ whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.7 }}>{ejercicio}</div>
                  </>)}
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#374151", margin: "18px 0 6px" }}>{tx.docPrintReport}</div>
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
                  {ta.cfgLoginNotice}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={volverAlArbitro} style={btnSecondary}>{ta.jgBack}</button>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <button onClick={() => handleGenerar()} aria-disabled={!canGenerate} style={{
                    padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none",
                    background: canGenerate ? headerGrad : PALETA.gris,
                    color: "white", cursor: canGenerate ? "pointer" : "not-allowed",
                    minWidth: 200, opacity: canGenerate ? 1 : 0.7,
                  }}>
                    {loading ? ta.cfgCreating : user ? ta.cfgGenerateSession : ta.cfgLoginAndGenerate}
                  </button>
                  {!canGenerate && !loading && camposFaltantesParaGenerar().length > 0 && (
                    <p style={{ margin: 0, fontSize: 12, color: PALETA.rojo, fontWeight: 600 }}>
                      {ta.cfgMissingToGenerate(camposFaltantesParaGenerar().join(", "))}
                    </p>
                  )}
                </div>
              </div>
              {/* A.8: recordatorio de que el puntaje del juego es formativo, no una calificación */}
              <p style={{ margin: "10px 0 0", fontSize: 12, color: PALETA.gris, lineHeight: 1.5, textAlign: "right" as const }}>
                {ta.cfgFormativeNote}
              </p>
            </div>
          )}
        </div>
      </main>

      {mostrarAdvertenciaGenerar && (
        <ModalDialogo onCerrar={() => setMostrarAdvertenciaGenerar(false)} idTitulo="dlg-generar-titulo" idDescripcion="dlg-generar-desc" panelStyle={{ padding: "28px 28px 24px" }}>
            <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <h2 id="dlg-generar-titulo" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              {textoAdvertenciaGenerar}
            </h2>
            <div id="dlg-generar-desc" style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
              {ta.cfgWarnGenerateDesc}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setMostrarAdvertenciaGenerar(false);
                  setShowMaterial(true);
                  setTimeout(() => {
                    document.getElementById("banco-preguntas")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 60);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#475569" }}>
                {ta.cfgAddQuestions}
              </button>
              <button
                onClick={() => {
                  setMostrarAdvertenciaGenerar(false);
                  handleGenerar(true);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", backgroundColor: accentColor, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {ta.cfgGenerateAnyway}
              </button>
            </div>
          </ModalDialogo>
      )}

      {mostrarAdvertenciaTextoBase && (
        <ModalDialogo onCerrar={() => setMostrarAdvertenciaTextoBase(false)} idTitulo="dlg-textobase-titulo" idDescripcion="dlg-textobase-desc" panelStyle={{ padding: "28px 28px 24px" }}>
            <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
            <h2 id="dlg-textobase-titulo" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              {ta.cfgNoBaseTitle}
            </h2>
            <div id="dlg-textobase-desc" style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
              {ta.cfgNoBaseDesc}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setMostrarAdvertenciaTextoBase(false);
                  setTimeout(() => {
                    document.getElementById("texto-base-sesion")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 60);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#475569" }}>
                {ta.cfgLoadBaseText}
              </button>
              <button
                onClick={() => {
                  setMostrarAdvertenciaTextoBase(false);
                  handleGenerarPreguntas(true);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", backgroundColor: accentColor, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {ta.cfgGenerateQuestionsAnyway}
              </button>
            </div>
          </ModalDialogo>
      )}

      {mostrarAdvertenciaPDF && (
        <ModalDialogo onCerrar={() => setMostrarAdvertenciaPDF(false)} idTitulo="dlg-pdf-titulo" idDescripcion="dlg-pdf-desc" panelStyle={{ padding: "28px 28px 24px" }}>
            <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <h2 id="dlg-pdf-titulo" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              {ta.cfgNotSharedTitle}
            </h2>
            <div id="dlg-pdf-desc" style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
              {ta.cfgNotSharedDesc1}
              <br /><br />
              {ta.cfgNotSharedDesc2a} <strong>Google Classroom</strong> {ta.cfgNotSharedDesc2b}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setMostrarAdvertenciaPDF(false);
                  handleClassroom();
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", backgroundColor: "#1967d2", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {ta.cfgShareByClassroom}
              </button>
              <button
                onClick={() => {
                  setMostrarAdvertenciaPDF(false);
                  // Directo a la impresión, sin volver a pasar por el chequeo.
                  // El modal tarda en desmontarse, así que se espera un tick:
                  // window.print() congela la página y el overlay saldría impreso.
                  setTimeout(abrirPDF, 80);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#475569" }}>
                {ta.cfgDownloadAnyway}
              </button>
            </div>
          </ModalDialogo>
      )}

      {mostrarAdvertenciaPreguntas && (
        <ModalDialogo onCerrar={() => setMostrarAdvertenciaPreguntas(false)} idTitulo="dlg-preguntas-titulo" idDescripcion="dlg-preguntas-desc" panelStyle={{ padding: "28px 28px 24px" }}>
            <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h2 id="dlg-preguntas-titulo" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              {textoAdvertenciaClassroom}
            </h2>
            <div id="dlg-preguntas-desc" style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
              {ta.cfgWarnShareDesc}
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
                {ta.cfgAddQuestions}
              </button>
              <button
                onClick={() => {
                  setMostrarAdvertenciaPreguntas(false);
                  handleClassroom(true);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", backgroundColor: "#1967d2", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {ta.cfgShareAnyway}
              </button>
            </div>
          </ModalDialogo>
      )}

      {showClassroomModal && (
        <ModalDialogo onCerrar={() => !creandoTarea && setShowClassroomModal(false)} idTitulo="dlg-classroom-titulo" velo={0.6} panelStyle={{ maxWidth: 480, overflow: "hidden" }}>

            <div style={{ background: "linear-gradient(135deg, #1967d2 0%, #0d47a1 100%)", padding: "18px 24px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 id="dlg-classroom-titulo" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{ta.cfgPublishClassroom}</h2>
                <div style={{ fontSize: 12, marginTop: 2 }}>{nombreVisible(ta.materiaNames, materia)} · {tema}</div>
              </div>
              {!creandoTarea && (
                <button onClick={() => setShowClassroomModal(false)}
                  aria-label={ta.closeDialog} title={ta.closeDialog}
                  style={{ background: "rgba(0,0,0,0.25)", border: "none", color: "white", width: 44, height: 44, borderRadius: "50%", fontSize: 16, cursor: "pointer" }}><span aria-hidden="true">✕</span></button>
              )}
            </div>

            <div style={{ padding: 24 }}>
              {tareaCreada ? (
                <div role="status" style={{ textAlign: "center", padding: "16px 0" }}>
                  <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#166534" }}>{ta.cfgTaskCreated}</p>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>{ta.cfgTaskCreatedDesc}</p>
                  <button onClick={() => setShowClassroomModal(false)}
                    style={{ marginTop: 20, padding: "10px 28px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "none", backgroundColor: "#1967d2", color: "white", cursor: "pointer" }}>
                    {ta.cfgClose}
                  </button>
                </div>
              ) : errorClassroom ? (
                <div>
                  <div role="alert" style={{ padding: "12px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: "#b91c1c", marginBottom: 16 }}>
                    ⚠️ {errorClassroom}
                  </div>
                  <button onClick={() => { setErrorClassroom(""); handleClassroom(true); }}
                    style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "2px solid #e2e8f0", backgroundColor: "white", cursor: "pointer" }}>
                    {ta.cfgRetryPlain}
                  </button>
                </div>
              ) : cargandoCursos ? (
                <div role="status" style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
                  {ta.cfgLoadingCourses}
                </div>
              ) : cursos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b", fontSize: 14 }}>
                  {ta.cfgNoCourses}
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: "#475569" }}>
                    {ta.cfgPickCourse}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                    {cursos.map(curso => (
                      <button
                        key={curso.id}
                        onClick={() => handleCrearTarea(curso.id, curso.name)}
                        disabled={creandoTarea}
                        style={{ padding: "14px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", backgroundColor: "white", textAlign: "left" as const, cursor: creandoTarea ? "not-allowed" : "pointer", transition: "all 0.15s" }}
                        onMouseOver={e => { if (!creandoTarea) { e.currentTarget.style.borderColor = "#1967d2"; e.currentTarget.style.backgroundColor = "#f0f7ff"; }}}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.backgroundColor = "white"; }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                          {creandoTarea ? ta.cfgCreatingTask : `📚 ${curso.name}`}
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
        </ModalDialogo>
      )}

      {mostrarProyeccion && sesion && (
        <ProyeccionCodigoArbitro
          codigo={sesion.id}
          idioma={idiomaCreada}
          colorPrimario={accentColor}
          onCerrar={() => setMostrarProyeccion(false)}
        />
      )}
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const FONDO_CONFIG = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"; // se pinta en <html>/<body> con useFondoDocumento
const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "transparent", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const cardStyle: React.CSSProperties = { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 700, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" };
// ─── ComoFuncionaAccordionES ───────────────────────────────────────────────────

function ComoFuncionaAccordionES({ primary, light, border, conTextoDuranteJuego }: { primary: string; light: string; border: string; conTextoDuranteJuego?: boolean }) {
  const ta = useArbitroT();
  const [open, setOpen] = useState(false);
  const etapas = [
    { numero: "1", titulo: ta.cfgHow1T, quien: ta.cfgHow1W, descripcion: conTextoDuranteJuego ? ta.cfgHow1DConTexto : ta.cfgHow1D },
    { numero: "2", titulo: ta.cfgHow2T, quien: ta.cfgHow2W, descripcion: ta.cfgHow2D },
    { numero: "3", titulo: ta.cfgHow3T, quien: ta.cfgHow3W, descripcion: ta.cfgHow3D },
    { numero: "4", titulo: ta.cfgHow4T, quien: ta.cfgHow4W, descripcion: ta.cfgHow4D },
    { numero: "5", titulo: ta.cfgHow5T, quien: ta.rulesStep5Who, descripcion: ta.rulesStep5Desc },
    { numero: "6", titulo: ta.cfgHow6T, quien: ta.cfgHow6W, descripcion: ta.cfgHow6D },
  ];
  return (
    <div style={{ backgroundColor: light, borderRadius: 12, border: `1px solid ${border}` }}>
      <button
        onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderRadius: 12 }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a5f" }}>{ta.cfgHowTitle} <span style={{ fontWeight: 400, fontSize: 12, color: PALETA.grisOscuro }}>{ta.cfgTapToSee}</span></span>
        <span style={{ fontSize: 16, color: primary, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${border}` }}>
          {etapas.map((et) => (
            <div key={et.numero} style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: `${primary}20`, color: primary, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {et.numero}
              </div>
              <div style={{ paddingTop: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "#1e3a5f", lineHeight: 1.4 }}>{et.titulo}</h3>
                <div style={{ fontSize: 12, fontWeight: 600, color: primary, lineHeight: 1.4, marginTop: 1 }}>{et.quien}</div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, marginTop: 3 }}>{et.descripcion}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 12px", backgroundColor: "#fef9c3", borderRadius: 8, border: "1px solid #fde047", fontSize: 12, color: "#713f12", lineHeight: 1.6 }}>
            📚 <strong>{ta.cfgHowNoteStrong}</strong> {ta.cfgHowNote}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#475569" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", fontSize: 14, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", boxSizing: "border-box" as const };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", appearance: "auto" as any };
const btnSecondary: React.CSSProperties = { padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", cursor: "pointer" };
const closeBtnStyle: React.CSSProperties = { background: "rgba(0,0,0,0.25)", border: "none", color: "white", width: 44, height: 44, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const sectionBadgeStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 };
const badgeNumStyle: React.CSSProperties = { background: "#e0e7ff", color: "#4f46e5", borderRadius: 6, padding: "2px 7px", fontSize: 12, fontWeight: 700 };