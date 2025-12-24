// src/pages/AboutPage.tsx
// Página de información sobre el Juego del Semáforo 📖

import { useNavigate } from "react-router-dom";

// 🎨 Estilos
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "24px 32px",
    color: "white",
  },
  headerContent: {
    maxWidth: 900,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
  },
  content: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 24px",
  },
  heroSection: {
    textAlign: "center" as const,
    marginBottom: 48,
  },
  heroIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  heroTitle: {
    margin: "0 0 16px 0",
    fontSize: 36,
    fontWeight: 800,
    color: "#1e293b",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: 18,
    color: "#64748b",
    maxWidth: 600,
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.6,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    margin: "0 0 20px 0",
    fontSize: 22,
    fontWeight: 700,
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  paragraph: {
    margin: "0 0 16px 0",
    fontSize: 16,
    color: "#475569",
    lineHeight: 1.7,
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  featureCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 20,
    textAlign: "center" as const,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    margin: "0 0 8px 0",
    fontSize: 16,
    fontWeight: 600,
    color: "#1e293b",
  },
  featureDesc: {
    margin: 0,
    fontSize: 14,
    color: "#64748b",
  },
  stageCard: {
    display: "flex",
    gap: 20,
    padding: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  stageBadge: (color: string) => ({
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: color,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 800,
  }),
  stageContent: {
    flex: 1,
  },
  stageTitle: {
    margin: "0 0 8px 0",
    fontSize: 18,
    fontWeight: 700,
    color: "#1e293b",
  },
  stageDesc: {
    margin: 0,
    fontSize: 15,
    color: "#64748b",
    lineHeight: 1.6,
  },
  downloadSection: {
    backgroundColor: "#eff6ff",
    border: "2px solid #3b82f6",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
  },
  downloadTitle: {
    margin: "0 0 16px 0",
    fontSize: 18,
    fontWeight: 700,
    color: "#1e40af",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  downloadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  downloadCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "all 0.2s",
    border: "1px solid #e2e8f0",
  },
  downloadIcon: {
    fontSize: 28,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadName: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: "#1e293b",
  },
  downloadSize: {
    margin: "4px 0 0 0",
    fontSize: 12,
    color: "#64748b",
  },
  faqItem: {
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 0",
  },
  faqQuestion: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "#1e293b",
  },
  faqAnswer: {
    margin: "8px 0 0 0",
    fontSize: 15,
    color: "#64748b",
    lineHeight: 1.6,
  },
  ctaSection: {
    textAlign: "center" as const,
    marginTop: 40,
  },
  ctaBtn: {
    padding: "16px 40px",
    fontSize: 18,
    fontWeight: 700,
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(34, 197, 94, 0.4)",
    transition: "all 0.2s",
  },
};

// PDFs disponibles para descarga
const downloads = [
  {
    id: "guia-docente",
    name: "Guía para Docentes",
    size: "PDF · 2.4 MB",
    icon: "📘",
    url: "/downloads/guia-docente.pdf",
  },
  {
    id: "libro-era-integracion",
    name: "La Era de la Integración",
    size: "PDF · 5.1 MB",
    icon: "📕",
    url: "/downloads/era-integracion.pdf",
  },
  {
    id: "plantilla-csv",
    name: "Plantilla CSV de Preguntas",
    size: "CSV · 12 KB",
    icon: "📄",
    url: "/downloads/plantilla-preguntas.csv",
  },
];

// FAQs
const faqs = [
  {
    q: "¿Qué necesito para usar el Juego del Semáforo?",
    a: "Solo necesitás un dispositivo con navegador web para el docente (computadora, tablet) y dispositivos para los equipos (celulares o tablets). No requiere instalación.",
  },
  {
    q: "¿Cuántos estudiantes pueden participar?",
    a: "El juego soporta de 2 a 10 equipos, con 3 a 8 estudiantes por equipo. Ideal para grupos de 10 a 60 estudiantes.",
  },
  {
    q: "¿Puedo crear mis propias preguntas?",
    a: "¡Sí! Podés importar preguntas desde un archivo CSV o usar la biblioteca de preguntas prediseñadas.",
  },
  {
    q: "¿El juego guarda los resultados?",
    a: "Sí, los puntajes y el progreso se guardan automáticamente. Podés ver estadísticas al finalizar cada partida.",
  },
];

export function AboutPage() {
  const navigate = useNavigate();

  const handleDownload = (url: string) => {
    // En producción, estos serían links reales a Firebase Storage
    alert(`Descarga: ${url}\n\n(Los archivos estarán disponibles próximamente)`);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button
            style={styles.backBtn}
            onClick={() => navigate("/")}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
          >
            ← Volver
          </button>
          <h1 style={styles.headerTitle}>Acerca del Juego</h1>
        </div>
      </header>

      {/* Content */}
      <main style={styles.content}>
        {/* Hero */}
        <div style={styles.heroSection}>
          <div style={styles.heroIcon}>🚦</div>
          <h1 style={styles.heroTitle}>El Juego del Semáforo</h1>
          <p style={styles.heroSubtitle}>
            Una metodología lúdica que combina competencia entre equipos con colaboración 
            interna, transformando el aprendizaje en una experiencia activa y significativa.
          </p>
        </div>

        {/* ¿Qué es? */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span>🎯</span> ¿Qué es el Método Lúdico Integral?
          </h2>
          <p style={styles.paragraph}>
            El <strong>Método Lúdico Integral</strong> es una propuesta pedagógica desarrollada por 
            Pablo Pa que busca equilibrar la competencia y la colaboración en el aula. 
            A diferencia de juegos puramente competitivos como Kahoot, este método promueve 
            que los estudiantes trabajen juntos dentro de sus equipos mientras compiten 
            sanamente con otros grupos.
          </p>
          <p style={styles.paragraph}>
            El nombre "Semáforo" viene del sistema de calificación: los equipos evalúan 
            las respuestas de sus compañeros usando colores 🟢 verde (correcto), 
            🟡 amarillo (parcial) y 🔴 rojo (incorrecto), fomentando el pensamiento 
            crítico y la responsabilidad compartida.
          </p>

          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🤝</div>
              <h4 style={styles.featureTitle}>Colaboración</h4>
              <p style={styles.featureDesc}>Trabajo en equipo para resolver desafíos</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🏆</div>
              <h4 style={styles.featureTitle}>Competencia sana</h4>
              <p style={styles.featureDesc}>Motivación a través del juego</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🧠</div>
              <h4 style={styles.featureTitle}>Pensamiento crítico</h4>
              <p style={styles.featureDesc}>Evaluar y justificar respuestas</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📱</div>
              <h4 style={styles.featureTitle}>Digital y accesible</h4>
              <p style={styles.featureDesc}>Funciona en cualquier dispositivo</p>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span>⚙️</span> ¿Cómo funciona?
          </h2>
          
          <div style={styles.stageCard}>
            <div style={styles.stageBadge("#3b82f6")}>1</div>
            <div style={styles.stageContent}>
              <h4 style={styles.stageTitle}>Etapa 1: Respuestas Rápidas</h4>
              <p style={styles.stageDesc}>
                Se muestra una pregunta a todos los equipos. Cada equipo discute internamente 
                y envía su respuesta. Luego, todos califican las respuestas de los demás 
                equipos usando los colores del semáforo.
              </p>
            </div>
          </div>

          <div style={styles.stageCard}>
            <div style={styles.stageBadge("#8b5cf6")}>2</div>
            <div style={styles.stageContent}>
              <h4 style={styles.stageTitle}>Etapa 2: Respuestas con Representante</h4>
              <p style={styles.stageDesc}>
                Un representante de cada equipo responde oralmente al frente. Los demás 
                equipos califican la respuesta. Quienes den amarillo o rojo deben 
                justificar su calificación, promoviendo el debate constructivo.
              </p>
            </div>
          </div>

          <div style={styles.stageCard}>
            <div style={styles.stageBadge("#22c55e")}>✓</div>
            <div style={styles.stageContent}>
              <h4 style={styles.stageTitle}>Validación y Puntos</h4>
              <p style={styles.stageDesc}>
                El docente valida las respuestas y calificaciones. Los puntos se asignan 
                tanto por responder bien como por calificar correctamente, incentivando 
                la atención y el pensamiento crítico.
              </p>
            </div>
          </div>
        </section>

        {/* Descargas */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span>📥</span> Materiales y Recursos
          </h2>
          <p style={styles.paragraph}>
            Descargá guías, plantillas y materiales para implementar el Juego del Semáforo 
            en tu aula.
          </p>

          <div style={styles.downloadSection}>
            <h3 style={styles.downloadTitle}>
              <span>📚</span> Descargas disponibles
            </h3>
            <div style={styles.downloadGrid}>
              {downloads.map((item) => (
                <div
                  key={item.id}
                  style={styles.downloadCard}
                  onClick={() => handleDownload(item.url)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <span style={styles.downloadIcon}>{item.icon}</span>
                  <div style={styles.downloadInfo}>
                    <p style={styles.downloadName}>{item.name}</p>
                    <p style={styles.downloadSize}>{item.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span>❓</span> Preguntas Frecuentes
          </h2>
          
          {faqs.map((faq, i) => (
            <div key={i} style={{
              ...styles.faqItem,
              borderBottom: i === faqs.length - 1 ? "none" : "1px solid #e2e8f0",
            }}>
              <p style={styles.faqQuestion}>{faq.q}</p>
              <p style={styles.faqAnswer}>{faq.a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <div style={styles.ctaSection}>
          <button
            style={styles.ctaBtn}
            onClick={() => navigate("/setup")}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(34, 197, 94, 0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(34, 197, 94, 0.4)";
            }}
          >
            🎮 Crear mi primer juego
          </button>
        </div>
      </main>
    </div>
  );
}