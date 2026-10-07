// src/pages/ArbitroLandingPage.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useArbitroT } from "../i18n";
import { PALETA, AREA_COLORS } from "../utils/arbitroPalette";

// ─── Config por área ───────────────────────────────────────────────────────────

const AREAS: Record<string, {
  key: string;
  nombre: string;
  emoji: string;
  gradient: string;
  primary: string;
  light: string;
  border: string;
  materias: string[];
  descripcion: string;
  ejemplo: string;
}> = {
  exactas: {
    key: "exactas",
    nombre: "Ciencias Exactas y Naturales",
    emoji: "🔬",
    ...AREA_COLORS.exactas,
    materias: ["Matemática", "Física", "Química", "Biología", "Estadística", "Informática"],
    descripcion: "Los alumnos debaten en grupos sobre el tema que vos elegís. La IA solo interviene cuando dos alumnos tienen posiciones distintas que no pueden resolver solos — no explica ni resuelve, solo arbitra el desacuerdo.",
    ejemplo: "Ecuaciones, fracciones, funciones, estadística, reacciones químicas, problemas de física…",
  },
  sociales: {
    key: "sociales",
    nombre: "Ciencias Sociales y Humanidades",
    emoji: "🌍",
    ...AREA_COLORS.sociales,
    materias: ["Historia", "Geografía", "Filosofía", "Economía", "Derecho", "Psicología"],
    descripcion: "Los alumnos debaten en grupos sobre fuentes, interpretaciones o conceptos. La IA no opina ni explica — solo arbitra cuando el grupo tiene un desacuerdo genuino que no puede resolver solo.",
    ejemplo: "Fuentes históricas, conceptos filosóficos, datos económicos, situaciones jurídicas…",
  },
  lenguajes: {
    key: "lenguajes",
    nombre: "Comunicación y Lenguajes",
    emoji: "💬",
    ...AREA_COLORS.lenguajes,
    materias: ["Lengua y Literatura", "Inglés", "Portugués", "Francés", "Comunicación"],
    descripcion: "Los alumnos trabajan en grupos sobre textos, consignas o producciones. La IA arbitra desacuerdos genuinos sobre interpretación, gramática o uso del lenguaje — sin reemplazar el debate entre pares.",
    ejemplo: "Análisis de textos, gramática en contexto, interpretación literaria, producción oral…",
  },
  arte: {
    key: "arte",
    nombre: "Arte y Expresión",
    emoji: "🎨",
    ...AREA_COLORS.arte,
    materias: ["Plástica", "Música", "Teatro", "Educación Física", "Danza"],
    descripcion: "Los alumnos debaten en grupos sobre obras, técnicas o conceptos expresivos. La IA arbitra desacuerdos puntuales — el protagonismo sigue siendo el intercambio entre alumnos.",
    ejemplo: "Análisis de obras, estilos musicales, reglas de juego, conceptos de expresión…",
  },
};

// ─── ComoFuncionaES ────────────────────────────────────────────────────────────

function ComoFuncionaES({ primary }: { primary: string }) {
  const ta = useArbitroT();
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
      quien: ta.rulesStep5Who,
      descripcion: ta.rulesStep5Desc,
    },
    {
      numero: "6",
      titulo: "Metacognición",
      quien: "Ambos equipos",
      descripcion: "Al terminar, cada equipo completa un informe que llega automáticamente al panel del docente.",
    },
  ];
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderRadius: 16 }}
      >
        <span style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>¿Cómo funciona?</span>
        <span style={{ fontSize: 20, color: primary, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 24px 20px", borderTop: "1px solid #e2e8f0" }}>
          {etapas.map((et) => (
            <div key={et.numero} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: `${primary}18`, color: primary, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {et.numero}
              </div>
              <div style={{ paddingTop: 2, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", lineHeight: 1.4 }}>{et.titulo}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: primary, lineHeight: 1.4, marginTop: 2 }}>{et.quien}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, marginTop: 4 }}>{et.descripcion}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: "12px 14px", backgroundColor: "#f0fdf4", borderRadius: 10, border: "1px solid #86efac", fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
            ✅ Al terminar, cada equipo presiona "Enviar informe" dentro del juego. El docente lo ve automáticamente en su panel.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function ArbitroLandingPage() {
  const { area } = useParams<{ area: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const [iniciandoSesion, setIniciandoSesion] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState("");

  // Acceso para docentes que ya usaron el árbitro antes: si no tienen sesión
  // iniciada, dispara el login con Google; si ya la tienen, va directo al
  // panel con sus sesiones anteriores.
  const handleAccesoDocente = async () => {
    if (user) { navigate("/arbitro-panel"); return; }
    setErrorAcceso("");
    setIniciandoSesion(true);
    try {
      await loginWithGoogle();
      navigate("/arbitro-panel");
    } catch {
      setErrorAcceso("No se pudo iniciar sesión. Probá de nuevo.");
    }
    setIniciandoSesion(false);
  };

  // Cierre de sesión. Usa el logout del AuthContext (y no signOut de Firebase
  // directo) porque además de desloguear cierra la sesión de métricas del
  // docente — con signOut pelado esa sesión quedaría abierta para siempre.
  const handleCerrarSesion = async () => {
    setErrorAcceso("");
    setCerrandoSesion(true);
    try {
      await logout();
    } catch {
      setErrorAcceso("No se pudo cerrar la sesión. Probá de nuevo.");
    }
    setCerrandoSesion(false);
  };

  // ── Rehidratación de UTMs desde código de campaña corto (?c=v1|v2|v3) ──────
  useEffect(() => {
    const campaignCode = searchParams.get('c');

    if (campaignCode && /^v[123]$/.test(campaignCode)) {
      const currentArea = area || 'exactas';

      const campaignData: Record<string, { lista: string; area_mapping: Record<string, string> }> = {
        v1: {
          lista: 'historia_geografia',
          area_mapping: { exactas: 'v1_exactas', sociales: 'v1_sociales', lenguajes: 'v1_lenguajes', arte: 'v1_arte' },
        },
        v2: {
          lista: 'biologia_matematica',
          area_mapping: { exactas: 'v2_exactas', sociales: 'v2_sociales', lenguajes: 'v2_lenguajes', arte: 'v2_arte' },
        },
        v3: {
          lista: 'idiomas',
          area_mapping: { exactas: 'v3_exactas', sociales: 'v3_sociales', lenguajes: 'v3_lenguajes', arte: 'v3_arte' },
        },
      };

      const data = campaignData[campaignCode];
      if (data) {
        const utmContent = data.area_mapping[currentArea] || `${campaignCode}_${currentArea}`;
        const fullUtms =
          `utm_source=email` +
          `&utm_medium=outreach` +
          `&utm_campaign=arbitro_2026` +
          `&utm_content=${utmContent}` +
          `&utm_term=auto` +
          `&lista=${data.lista}`;

        window.history.replaceState({}, '', `${window.location.pathname}?${fullUtms}`);

        console.log('[Campaign Tracking] UTMs rehidratados:', {
          version: campaignCode,
          area: currentArea,
          lista: data.lista,
          utm_content: utmContent,
        });
      }
    }
  }, [searchParams, area]);
  // ─────────────────────────────────────────────────────────────────────────────

  const cfg = area ? AREAS[area] : null;

  // Área no reconocida → redirigir a config general
  if (!cfg) {
    navigate("/arbitro-config");
    return null;
  }


  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Hero ── */}
      <div style={{
        background: cfg.gradient,
        padding: "48px 24px 56px",
        textAlign: "center",
        color: "white",
        position: "relative",
      }}>
        {/* Acceso para docentes que ya usaron el árbitro.
            Con sesión iniciada: acceso al panel + cuenta vinculada + salir.
            Sin sesión: botón que dispara el login con Google. */}
        {!authLoading && (
          <div style={{
            position: "absolute",
            top: 14,
            right: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            zIndex: 10,
            maxWidth: "min(60vw, 260px)",
          }}>
            {user ? (
              <>
                <Link
                  to="/arbitro-panel"
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
                </Link>
                <div style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  maxWidth: "100%",
                }}>
                  <span
                    title={user.email ?? undefined}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}>
                    👤 {user.email}
                  </span>
                  <button
                    onClick={handleCerrarSesion}
                    disabled={cerrandoSesion}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 12,
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
              </>
            ) : (
              <button
                onClick={handleAccesoDocente}
                disabled={iniciandoSesion}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 20,
                  padding: "6px 14px",
                  cursor: iniciandoSesion ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}>
                {iniciandoSesion ? "⏳ Ingresando…" : "🔑 Ya lo usé antes"}
              </button>
            )}
            {errorAcceso && (
              <div style={{ fontSize: 12, color: "#fecaca", textAlign: "right", maxWidth: 180 }}>{errorAcceso}</div>
            )}
          </div>
        )}

        <div style={{ fontSize: 56, marginBottom: 12 }}>{cfg.emoji}</div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", opacity: 0.85, textTransform: "uppercase", marginBottom: 8 }}>
          Árbitro de Aprendizaje
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900, lineHeight: 1.2 }}>
          {cfg.nombre}
        </h1>
        <p style={{ margin: "0 auto", fontSize: 16, opacity: 0.92, maxWidth: 560, lineHeight: 1.6 }}>
          {cfg.descripcion}
        </p>

        <button
          onClick={() => navigate(`/arbitro-config?area=${cfg.key}`)}
          style={{
            marginTop: 28,
            padding: "14px 36px",
            fontSize: 16,
            fontWeight: 800,
            borderRadius: 14,
            border: "none",
            backgroundColor: "white",
            color: cfg.primary,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            transition: "transform 0.2s",
          }}
          onMouseOver={e => (e.currentTarget.style.transform = "scale(1.04)")}
          onMouseOut={e => (e.currentTarget.style.transform = "none")}
        >
          ⚖️ Configurar una sesión →
        </button>

        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
          Gratuito · Solo necesitás un dispositivo por grupo
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>


        {/* Cómo funciona — acordeón */}
        <ComoFuncionaES primary={cfg.primary} />

        {/* Materias */}
        <div style={{
          backgroundColor: cfg.light,
          border: `1px solid ${cfg.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 28,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.primary, marginBottom: 10 }}>
            Materias disponibles en esta área
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {cfg.materias.map(m => (
              <span key={m} style={{
                padding: "5px 12px", borderRadius: 20,
                backgroundColor: "white",
                border: `1px solid ${cfg.border}`,
                fontSize: 13, color: "#374151", fontWeight: 500,
              }}>
                {m}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: PALETA.grisOscuro, lineHeight: 1.5 }}>
            <strong>Ejemplos de temas:</strong> {cfg.ejemplo}
          </div>
        </div>

        {/* CTA final */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <button
            onClick={() => navigate(`/arbitro-config?area=${cfg.key}`)}
            style={{
              padding: "16px 48px",
              fontSize: 16,
              fontWeight: 800,
              borderRadius: 14,
              border: "none",
              background: cfg.gradient,
              color: "white",
              cursor: "pointer",
              boxShadow: `0 6px 20px ${cfg.primary}35`,
              transition: "transform 0.2s",
            }}
            onMouseOver={e => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseOut={e => (e.currentTarget.style.transform = "none")}
          >
            ⚖️ Configurar mi sesión →
          </button>
          <div style={{ marginTop: 10, fontSize: 13, color: PALETA.gris }}>
            Gratuito · Solo necesitás un dispositivo por grupo
          </div>
        </div>
      </div>
    </div>
  );
}