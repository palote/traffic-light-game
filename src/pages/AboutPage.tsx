// src/pages/AboutPage.tsx
// Página de información sobre el proyecto - Actualizada

import { useNavigate } from "react-router-dom";
import { useGameMode } from "../contexts/GameModeContext";
import { useI18n } from "../i18n";

export function AboutPage() {
  const navigate = useNavigate();
  const { theme } = useGameMode();
  const { t, language } = useI18n();

  const content = language === 'es' ? {
    // ESPAÑOL
    title: "Acerca del Proyecto",
    subtitle: "El Juego del Semáforo / The Coopetition Game",
    intro: "Un juego educativo que integra colaboración y competencia para fortalecer la comprensión, la motivación y el rendimiento colectivo.",
    
    pedagogyTitle: "Enfoque pedagógico",
    pedagogyDesc: "El Juego del Semáforo se inscribe en un enfoque educativo integral que articula evaluación formativa, aprendizaje entre pares y dinámicas lúdicas estructuradas.\n\nSu premisa central es que el aprendizaje mejora cuando se equilibran deliberadamente la colaboración interna y la competencia externa, generando condiciones de coopetición que incrementan la motivación sin perder profundidad cognitiva.\n\nEl juego no reemplaza la enseñanza ni el estudio previo, sino que funciona como un dispositivo pedagógico que organiza la comprensión, la autoevaluación y la interacción grupal de manera visible y significativa.",
    
    howItWorks: "¿Cómo funciona el juego?",
    stages: [
      { 
        title: "Stage 0 – Preparación (antes del juego)", 
        desc: "Antes de jugar, los estudiantes trabajan con los contenidos propuestos por el docente mediante clases, lecturas, actividades u otros materiales didácticos.\n\nDesde una perspectiva pedagógica, el proceso mental de anticipar que esos contenidos serán utilizados luego en un juego competitivo entre equipos cumple un rol clave.\n\nEsta expectativa aumenta la motivación, pero también mejora la comprensión, ya que los estudiantes tienden a organizar mejor las ideas, identificar qué entienden realmente y detectar vacíos conceptuales antes de jugar." 
      },
      { 
        title: "Stage 1 – Comprensión individual con colaboración interna", 
        desc: "Los estudiantes responden consignas de manera individual, pero siempre como parte de un equipo estable.\n\nLas respuestas se evalúan mediante un sistema de colores tipo semáforo (verde, amarillo, rojo), que permite visualizar el nivel de comprensión sin una lógica punitiva.\n\nEn esta etapa no hay competencia entre equipos. Cada equipo utiliza el juego para saber si está realmente preparado para competir. Cuando aparecen dificultades, el propio dispositivo habilita instancias para ajustar la comprensión, ayudarse entre pares y prepararse mejor.\n\nDe este modo, el Stage 1 funciona como un espacio diagnóstico y formativo, donde la colaboración interna es una condición central del aprendizaje." 
      },
      { 
        title: "Stage 2 – Competencia entre equipos basada en la colaboración", 
        desc: "Los equipos compiten entre sí resolviendo desafíos de mayor complejidad cognitiva.\n\nEsta etapa se apoya en el trabajo realizado durante el Stage 1 y pone en juego:\n• Argumentación y justificación\n• Toma de decisiones colectivas\n• Representación del equipo\n• Evaluación entre pares\n\nEl principio que organiza esta etapa es claro: solo los equipos que colaboran eficazmente en su interior pueden competir con éxito hacia afuera." 
      },
    ],
    
    benefitsTitle: "Principales beneficios educativos",
    benefits: [
      "Incrementa la participación activa de todos los estudiantes",
      "Reduce la ansiedad asociada a las evaluaciones tradicionales",
      "Hace visible la comprensión real, no solo el resultado final",
      "Favorece el aprendizaje entre pares",
      "Integra motivación, evaluación y contenido en un mismo dispositivo",
      "Permite al docente observar procesos de aprendizaje, no solo respuestas",
    ],
    
    authorTitle: "Autor",
    authorDesc: "Pablo Parente, docente y asesor pedagógico con más de 30 años de experiencia en educación secundaria y técnica.\n\nEl Juego del Semáforo surge de un trabajo sostenido en aulas reales, proyectos institucionales y dispositivos de acompañamiento de trayectorias educativas, integrando pedagogía, evaluación y dinámicas grupales.",
    
    bookTitle: "Libro: La Era de la Integración",
    bookDesc: "El Juego del Semáforo forma parte de una investigación más amplia que explora cómo los principios de integración —entre competencia y colaboración, individuo y grupo— pueden aplicarse a la educación, las organizaciones y la sociedad.",
    bookLinkEs: "Edición en español",
    bookLinkEn: "Edición en inglés",
    
    contact: "Contacto",
  } : {
    // ENGLISH
    title: "About the Project",
    subtitle: "Traffic Light Game / The Coopetition Game",
    intro: "An educational game that integrates collaboration and competition to strengthen understanding, motivation, and collective performance.",
    
    pedagogyTitle: "Pedagogical Approach",
    pedagogyDesc: "The Traffic Light Game is grounded in an integral educational approach that combines formative assessment, peer learning, and structured game-based dynamics.\n\nIts core premise is that learning improves when internal collaboration and external competition are deliberately balanced, creating conditions of coopetition that enhance motivation while preserving cognitive depth.\n\nRather than replacing teaching or prior study, the game functions as a pedagogical device that organizes understanding, self-assessment, and group interaction in a visible and meaningful way.",
    
    howItWorks: "How does the game work?",
    stages: [
      { 
        title: "Stage 0 – Preparation (before the game)", 
        desc: "Before playing, students engage with the content proposed by the teacher through lessons, readings, activities, or other instructional materials.\n\nFrom an educational perspective, the mental process of anticipating that knowledge will later be used in a competitive team-based game plays a key role.\n\nDesigning and working with content under this expectation increases motivation, but also deepens comprehension, because students are encouraged to organize ideas, identify what they truly understand, and detect gaps before the game begins." 
      },
      { 
        title: "Stage 1 – Individual understanding with internal collaboration", 
        desc: "Students respond individually to questions, but always as part of a stable team.\n\nTheir responses are evaluated using a traffic light color system (green, yellow, red), which allows teams to visualize their level of understanding without punitive exposure.\n\nAt this stage, there is no competition between teams. Each team uses the game to assess whether it is truly prepared to compete. If weaknesses appear, the game itself enables teams to adjust, clarify concepts, help one another, and prepare more effectively.\n\nIn this way, Stage 1 functions as a diagnostic and formative space, where collaboration is not optional but essential." 
      },
      { 
        title: "Stage 2 – Team-based competition built on collaboration", 
        desc: "Teams compete against one another by solving more cognitively demanding challenges.\n\nThis competitive stage is grounded in the work done during Stage 1 and emphasizes:\n• Argumentation and justification\n• Collective decision-making\n• Team representation\n• Peer evaluation\n\nThe underlying principle is clear: only teams that collaborate effectively internally can compete successfully externally." 
      },
    ],
    
    benefitsTitle: "Key educational benefits",
    benefits: [
      "Increases active participation of all students",
      "Reduces anxiety associated with traditional assessment",
      "Makes real understanding visible, not just final answers",
      "Promotes peer-to-peer learning",
      "Integrates motivation, assessment, and content in a single device",
      "Allows teachers to observe learning processes, not only outcomes",
    ],
    
    authorTitle: "Author",
    authorDesc: "Pablo Parente, educator and pedagogical advisor with over 30 years of experience in secondary and technical education.\n\nThe Traffic Light Game emerges from sustained work in real classrooms, institutional projects, and student support initiatives, integrating pedagogy, assessment, and group dynamics.",
    
    bookTitle: "Book: The Age of Integration",
    bookDesc: "The Traffic Light Game is part of a broader research and development project that explores integrative principles applied to education, organizations, and society, with a focus on balancing competition and collaboration in complex systems.",
    bookLinkEs: "Spanish edition",
    bookLinkEn: "English edition",
    
    contact: "Contact",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: theme.primaryGradient,
        padding: "24px 32px",
        color: "white",
        boxShadow: `0 4px 20px ${theme.primary}40`,
      }}>
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ← {t.common.back}
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {content.title}
          </h1>
          <div style={{ width: 80 }} />
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "48px 24px",
      }}>
        {/* Intro */}
        <div style={{
          textAlign: "center",
          marginBottom: 48,
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚦🎯</div>
          <h2 style={{
            margin: "0 0 12px 0",
            fontSize: 28,
            fontWeight: 800,
            color: "#1e293b",
          }}>
            {content.subtitle}
          </h2>
          <p style={{
            margin: 0,
            fontSize: 18,
            color: "#64748b",
            maxWidth: 700,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}>
            {content.intro}
          </p>
        </div>

        {/* Pedagogical Approach */}
        <section style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}>
          <h3 style={{
            margin: "0 0 20px 0",
            fontSize: 22,
            fontWeight: 700,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span>📚</span> {content.pedagogyTitle}
          </h3>
          <div style={{
            fontSize: 15,
            color: "#475569",
            lineHeight: 1.8,
            whiteSpace: "pre-line",
          }}>
            {content.pedagogyDesc}
          </div>
        </section>

        {/* How it works */}
        <section style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}>
          <h3 style={{
            margin: "0 0 28px 0",
            fontSize: 22,
            fontWeight: 700,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span>🎮</span> {content.howItWorks}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {content.stages.map((stage, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: i === 0 ? "#f0fdf4" : i === 1 ? "#eff6ff" : "#faf5ff",
                  borderRadius: 16,
                  padding: 24,
                  border: `2px solid ${i === 0 ? "#86efac" : i === 1 ? "#93c5fd" : "#c4b5fd"}`,
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: i === 0 
                      ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                      : i === 1 
                        ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                        : "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 800,
                    fontSize: 18,
                    flexShrink: 0,
                  }}>
                    {i}
                  </div>
                  <h4 style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#1e293b",
                  }}>
                    {stage.title}
                  </h4>
                </div>
                <div style={{
                  fontSize: 14,
                  color: "#475569",
                  lineHeight: 1.8,
                  whiteSpace: "pre-line",
                  paddingLeft: 56,
                }}>
                  {stage.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}>
          <h3 style={{
            margin: "0 0 20px 0",
            fontSize: 22,
            fontWeight: 700,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span>✨</span> {content.benefitsTitle}
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {content.benefits.map((benefit, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                }}
              >
                <span style={{ color: "#22c55e", fontSize: 18, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>{benefit}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Author */}
        <section style={{
          backgroundColor: theme.cardHoverBg,
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          border: `2px solid ${theme.primary}40`,
        }}>
          <h3 style={{
            margin: "0 0 16px 0",
            fontSize: 22,
            fontWeight: 700,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span>👨‍🏫</span> {content.authorTitle}
          </h3>
          <p style={{
            margin: "0 0 32px 0",
            fontSize: 15,
            color: "#475569",
            lineHeight: 1.8,
            whiteSpace: "pre-line",
          }}>
            {content.authorDesc}
          </p>
          
          {/* Book section */}
          <div style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e2e8f0",
          }}>
            <h4 style={{
              margin: "0 0 12px 0",
              fontSize: 18,
              fontWeight: 700,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span>📖</span> {content.bookTitle}
            </h4>
            <p style={{
              margin: "0 0 20px 0",
              fontSize: 14,
              color: "#64748b",
              lineHeight: 1.7,
            }}>
              {content.bookDesc}
            </p>
            
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="https://www.amazon.com/dp/B0G44YRX4S"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "white",
                  textDecoration: "none",
                }}
              >
                📕 {content.bookLinkEs}
              </a>
              <a
                href="https://www.amazon.com/dp/B0G452MVY9"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "white",
                  textDecoration: "none",
                }}
              >
                📘 {content.bookLinkEn}
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section style={{
          textAlign: "center",
          padding: 32,
        }}>
          <h3 style={{
            margin: "0 0 16px 0",
            fontSize: 18,
            fontWeight: 700,
            color: "#1e293b",
          }}>
            📧 {content.contact}
          </h3>
          <a
            href="https://www.linkedin.com/in/pablo-parente-63875727/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              backgroundColor: "#0077b5",
              color: "white",
              textDecoration: "none",
            }}
          >
            💼 LinkedIn Profile
          </a>
        </section>
      </main>
    </div>
  );
}