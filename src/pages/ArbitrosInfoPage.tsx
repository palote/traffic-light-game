import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AREAS = [
  {
    emoji: "🔬", nombre: "Ciencias Exactas y Naturales", key: "exactas", primary: "#0ea5e9", bg: "#f0f9ff",
    materias: "Matemática, Física, Química, Biología, Estadística",
    queHace: "El árbitro de Exactas resuelve desacuerdos sobre procedimientos, resultados y conceptos en matemática y ciencias naturales. Cuando dos alumnos no se ponen de acuerdo si un cálculo está bien, si una definición es correcta o si un razonamiento lógico tiene sentido, el árbitro analiza ambas posiciones y da un veredicto fundamentado. No resuelve el ejercicio por el grupo — solo interviene ante un desacuerdo genuino que el grupo no puede resolver solo.",
  },
  {
    emoji: "🌍", nombre: "Ciencias Sociales y Humanidades", key: "sociales", primary: "#f97316", bg: "#fff7ed",
    materias: "Historia, Geografía, Filosofía, Economía, Derecho",
    queHace: "El árbitro de Sociales arbitra desacuerdos sobre interpretaciones históricas, conceptos económicos, análisis geográficos o debates filosóficos y legales. En materias donde muchas respuestas no son blanco o negro, el árbitro evalúa si los argumentos están bien fundamentados y si las posiciones son conceptualmente sólidas, sin imponer una única verdad sino guiando al grupo hacia mayor precisión.",
  },
  {
    emoji: "💬", nombre: "Comunicación y Lenguajes", key: "lenguajes", primary: "#8b5cf6", bg: "#faf5ff",
    materias: "Lengua, Inglés, Literatura, Comunicación",
    queHace: "El árbitro de Lenguajes resuelve desacuerdos sobre gramática, vocabulario, interpretación de textos y uso correcto del idioma. Si el grupo discute sobre la forma correcta de una construcción gramatical, el significado de una palabra en contexto o la interpretación de un párrafo literario, el árbitro analiza ambas posiciones con criterios lingüísticos y comunicativos claros.",
  },
  {
    emoji: "🎨", nombre: "Arte y Expresión", key: "arte", primary: "#f43f5e", bg: "#fff1f2",
    materias: "Plástica, Música, Teatro, Educación Física",
    queHace: "El árbitro de Arte arbitra desacuerdos sobre conceptos, técnicas y criterios estéticos en disciplinas artísticas y expresivas. Cuando el grupo no se pone de acuerdo sobre si una técnica es correcta, qué caracteriza un estilo, o cómo interpretar una obra, el árbitro aplica criterios propios de cada disciplina para guiar el debate hacia mayor profundidad conceptual.",
  },
];

const PASOS = [
  { n: "1", txt: "El docente inicia sesión con Google, configura el tema y la sesión se genera en segundos." },
  { n: "2", txt: "Los alumnos arman 2 equipos y entran al link desde el dispositivo de un integrante de cada equipo." },
  { n: "3", txt: "Un equipo le hace una pregunta oral al otro; el que responde lo hace en voz alta." },
  { n: "4", txt: "El equipo que preguntó califica la respuesta: completa (1 punto), incompleta (0.5) o incorrecta (0). El juego suma los puntos solo, automáticamente." },
  { n: "5", txt: "Si el equipo que respondió no está de acuerdo con la calificación, piden el veredicto del árbitro — su fallo define el puntaje de esa ronda." },
  { n: "6", txt: "Al terminar, cada equipo completa una metacognición dentro del juego. El protagonista es el grupo." },
];

export default function ArbitrosInfoPage() {
  const navigate = useNavigate();
  const [showPasos, setShowPasos] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showSemaforo, setShowSemaforo] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)", padding: "48px 24px 56px", textAlign: "center", color: "white" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⚖️</div>
        <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900 }}>Árbitros de Aprendizaje</h1>
        <p style={{ margin: "0 auto", fontSize: 16, opacity: 0.92, maxWidth: 560, lineHeight: 1.6 }}>
          Dinámicas grupales donde la IA actúa como árbitro — no explica ni resuelve, solo interviene cuando el grupo tiene un desacuerdo genuino que no puede resolver solo.
        </p>
        <button onClick={() => navigate("/arbitro-config")} style={{ marginTop: 28, padding: "14px 36px", fontSize: 16, fontWeight: 800, borderRadius: 14, border: "none", backgroundColor: "white", color: "#0ea5e9", cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}>
          ⚖️ Configurar una sesión →
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        {/* T1: Ver pasos de la dinámica — expandable */}
        <div style={{ backgroundColor: "white", borderRadius: 16, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <button
            onClick={() => setShowPasos(p => !p)}
            style={{ width: "100%", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>🪜 Ver pasos de la dinámica</span>
            <span style={{ fontSize: 18, color: "#64748b", transition: "transform 0.2s", transform: showPasos ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </button>
          {showPasos && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                {PASOS.map(s => (
                  <div key={s.n} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "#e0f2fe", color: "#0ea5e9", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
                    <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.55, paddingTop: 3 }}>{s.txt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* T5: Áreas con expandable "¿Qué hace este árbitro?" */}
        <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>Un árbitro por área</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {AREAS.map(area => (
            <div key={area.key} style={{ backgroundColor: area.bg, border: `1.5px solid ${expandedCard === area.key ? area.primary : area.primary + "30"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Card row — click navigates */}
              <div
                onClick={() => navigate(`/arbitro-config?area=${area.key}`)}
                style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
                onMouseOver={e => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${area.primary}, ${area.primary}aa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{area.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{area.nombre}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{area.materias}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: area.primary }}>Configurar →</div>
              </div>
              {/* Expandable toggle */}
              <button
                onClick={() => setExpandedCard(expandedCard === area.key ? null : area.key)}
                style={{ width: "100%", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: `${area.primary}10`, border: "none", borderTop: `1px solid ${area.primary}20`, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: area.primary }}>¿Qué hace este árbitro?</span>
                <span style={{ fontSize: 14, color: area.primary, transition: "transform 0.2s", transform: expandedCard === area.key ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              </button>
              {expandedCard === area.key && (
                <div style={{ padding: "14px 20px 18px", borderTop: `1px solid ${area.primary}15` }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{area.queHace}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* T6: ¿Qué es el Juego del Semáforo? — expandable */}
        <div style={{ backgroundColor: "white", borderRadius: 16, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <button
            onClick={() => setShowSemaforo(s => !s)}
            style={{ width: "100%", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>🚦 ¿Qué es el Juego del Semáforo?</span>
            <span style={{ fontSize: 18, color: "#64748b", transition: "transform 0.2s", transform: showSemaforo ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </button>
          {showSemaforo && (
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 12px" }}>
                  Los Árbitros de Aprendizaje forman parte del <strong>Juego del Semáforo</strong>, un dispositivo pedagógico que integra evaluación formativa, aprendizaje entre pares y dinámicas de coopetición (colaboración + competencia).
                </p>
                <p style={{ margin: "0 0 12px" }}>
                  El juego organiza el aprendizaje en tres etapas: preparación previa al juego, comprensión individual dentro del equipo, y competencia entre equipos. Los árbitros de IA intervienen en la segunda y tercera etapa cuando el grupo enfrenta un desacuerdo genuino que no puede resolver por sí solo.
                </p>
                <p style={{ margin: 0 }}>
                  <button
                    onClick={() => navigate("/about")}
                    style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, textDecoration: "underline" }}
                  >
                    Ver más sobre el proyecto →
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Gratuito · Sin registro · Un dispositivo por grupo</div>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>← Volver al inicio</button>
        </div>
      </div>
    </div>
  );
}
