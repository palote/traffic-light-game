// src/pages/AboutPage.tsx
// Página de información sobre el proyecto

import { useNavigate } from "react-router-dom";
import { useGameMode } from "../contexts/GameModeContext";
import { useI18n } from "../i18n";

export function AboutPage() {
  const navigate = useNavigate();
  const { theme } = useGameMode();
  const { t, language } = useI18n();

  const content = language === 'es' ? {
    title: "Acerca del Proyecto",
    subtitle: "El Juego del Semáforo / The Coopetition Game",
    intro: "Un juego educativo que combina competencia y colaboración para maximizar el aprendizaje.",
    methodTitle: "El Método Lúdico Integral",
    methodDesc: "Este juego está basado en el Método Lúdico Integral, desarrollado a partir de más de 30 años de experiencia docente. El método propone equilibrar la competencia entre equipos con la colaboración interna, creando una dinámica de 'coopetición' que mejora significativamente los resultados de aprendizaje.",
    howItWorks: "¿Cómo funciona?",
    stages: [
      { title: "Etapa 0: Preparación", desc: "Los equipos estudian el material antes del juego." },
      { title: "Etapa 1: Calificación Individual", desc: "Cada estudiante responde individualmente usando tarjetas de colores." },
      { title: "Etapa 2: Colaboración Grupal", desc: "Los equipos trabajan juntos para resolver preguntas más complejas." },
    ],
    benefitsTitle: "Beneficios",
    benefits: [
      "Aumenta la participación de todos los estudiantes",
      "Equilibra competencia saludable con colaboración",
      "Reduce la ansiedad de las evaluaciones tradicionales",
      "Promueve el aprendizaje entre pares",
      "Gamifica el proceso de aprendizaje",
    ],
    authorTitle: "Autor",
    authorDesc: "Desarrollado por Pablo Antón, docente con más de 33 años de experiencia en educación técnica y en ciencias de la computación.",
    bookTitle: "Libro: La Era de la Integración",
    bookDesc: "Este proyecto es parte de una investigación más amplia sobre cómo los principios de integración pueden aplicarse a la educación, las organizaciones y la sociedad. El libro está disponible en Amazon.",
    contact: "Contacto",
  } : {
    title: "About the Project",
    subtitle: "The Traffic Light Game / The Coopetition Game",
    intro: "An educational game that combines competition and collaboration to maximize learning.",
    methodTitle: "The Integral Ludic Method",
    methodDesc: "This game is based on the Integral Ludic Method, developed from over 30 years of teaching experience. The method proposes balancing inter-team competition with internal collaboration, creating a 'coopetition' dynamic that significantly improves learning outcomes.",
    howItWorks: "How does it work?",
    stages: [
      { title: "Stage 0: Preparation", desc: "Teams study the material before the game." },
      { title: "Stage 1: Individual Rating", desc: "Each student answers individually using colored cards." },
      { title: "Stage 2: Group Collaboration", desc: "Teams work together to solve more complex questions." },
    ],
    benefitsTitle: "Benefits",
    benefits: [
      "Increases participation from all students",
      "Balances healthy competition with collaboration",
      "Reduces anxiety from traditional assessments",
      "Promotes peer learning",
      "Gamifies the learning process",
    ],
    authorTitle: "Author",
    authorDesc: "Developed by Pablo Antón, an educator with over 33 years of experience in technical and computer science education.",
    bookTitle: "Book: The Age of Integration",
    bookDesc: "This project is part of a broader research on how integration principles can be applied to education, organizations, and society. The book is available on Amazon.",
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
          maxWidth: 800,
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
          <div style={{ width: 80 }} /> {/* Spacer */}
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 800,
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
            margin: "0 0 8px 0",
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
          }}>
            {content.intro}
          </p>
        </div>

        {/* Method */}
        <section style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 32,
          marginBottom: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}>
          <h3 style={{
            margin: "0 0 16px 0",
            fontSize: 20,
            fontWeight: 700,
            color: "#1e293b",
          }}>
            📚 {content.methodTitle}
          </h3>
          <p style={{
            margin: 0,
            fontSize: 15,
            color: "#475569",
            lineHeight: 1.7,
          }}>
            {content.methodDesc}
          </p>
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
            margin: "0 0 24px 0",
            fontSize: 20,
            fontWeight: 700,
            color: "#1e293b",
          }}>
            🎮 {content.howItWorks}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {content.stages.map((stage, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: theme.primaryGradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i}
                </div>
                <div>
                  <div style={{
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: 4,
                  }}>
                    {stage.title}
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "#64748b",
                  }}>
                    {stage.desc}
                  </div>
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
            margin: "0 0 16px 0",
            fontSize: 20,
            fontWeight: 700,
            color: "#1e293b",
          }}>
            ✨ {content.benefitsTitle}
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: 24,
            color: "#475569",
            lineHeight: 2,
          }}>
            {content.benefits.map((benefit, i) => (
              <li key={i}>{benefit}</li>
            ))}
          </ul>
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
            fontSize: 20,
            fontWeight: 700,
            color: "#1e293b",
          }}>
            👨‍🏫 {content.authorTitle}
          </h3>
          <p style={{
            margin: "0 0 24px 0",
            fontSize: 15,
            color: "#475569",
            lineHeight: 1.7,
          }}>
            {content.authorDesc}
          </p>
          
          <h4 style={{
            margin: "0 0 8px 0",
            fontSize: 16,
            fontWeight: 600,
            color: "#1e293b",
          }}>
            📖 {content.bookTitle}
          </h4>
          <p style={{
            margin: "0 0 16px 0",
            fontSize: 14,
            color: "#64748b",
          }}>
            {content.bookDesc}
          </p>
          
          <a
            href="https://www.amazon.com/dp/B0DQP9RJXF"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              background: theme.primaryGradient,
              color: "white",
              textDecoration: "none",
            }}
          >
            📚 View on Amazon
          </a>
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
            href="https://www.linkedin.com/in/pablo-anton-63875727/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.primary,
              fontWeight: 600,
            }}
          >
            LinkedIn Profile
          </a>
        </section>
      </main>
    </div>
  );
}