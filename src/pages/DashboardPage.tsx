// src/pages/DashboardPage.tsx
// Dashboard principal del docente 🎯

import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
    boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
  },
  headerContent: {
    maxWidth: 1000,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: 16,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    fontSize: 36,
  },
  logoText: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.9,
  },
  logoutBtn: {
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  content: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "40px 24px",
  },
  welcome: {
    textAlign: "center" as const,
    marginBottom: 48,
  },
  welcomeTitle: {
    margin: "0 0 8px 0",
    fontSize: 32,
    fontWeight: 800,
    color: "#1e293b",
  },
  welcomeSubtitle: {
    margin: 0,
    fontSize: 18,
    color: "#64748b",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "center" as const,
  },
  cardIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  cardTitle: {
    margin: "0 0 12px 0",
    fontSize: 22,
    fontWeight: 700,
    color: "#1e293b",
  },
  cardDescription: {
    margin: 0,
    fontSize: 15,
    color: "#64748b",
    lineHeight: 1.6,
  },
  cardColors: {
    library: { border: "#8b5cf6", bg: "#f5f3ff" },
    create: { border: "#22c55e", bg: "#f0fdf4" },
    about: { border: "#3b82f6", bg: "#eff6ff" },
  },
  footer: {
    textAlign: "center" as const,
    padding: "24px",
    color: "#94a3b8",
    fontSize: 14,
  },
  adminLink: {
    display: "inline-block",
    marginTop: 32,
    padding: "10px 20px",
    fontSize: 13,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    textDecoration: "none",
    transition: "all 0.2s",
  },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const cards = [
    {
      id: "create",
      icon: "🎮",
      title: "Crear Juego Nuevo",
      description: "Configurá un nuevo juego con tus preguntas, equipos y estudiantes.",
      path: "/setup",
      colors: styles.cardColors.create,
    },
    {
      id: "library",
      icon: "📚",
      title: "Biblioteca de Preguntas",
      description: "Explorá y usá bancos de preguntas organizados por grado y materia.",
      path: "/library",
      colors: styles.cardColors.library,
      // ✅ REMOVIDO: comingSoon: true
    },
    {
      id: "about",
      icon: "❓",
      title: "Acerca del Juego",
      description: "Conocé qué es el Juego del Semáforo y descargá materiales informativos.",
      path: "/about",
      colors: styles.cardColors.about,
    },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🚦</span>
            <h1 style={styles.logoText}>Traffic Light Game</h1>
          </div>
          
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>{user?.email}</span>
            <button
              style={styles.logoutBtn}
              onClick={handleLogout}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={styles.content}>
        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>
            ¡Bienvenido/a! 👋
          </h2>
          <p style={styles.welcomeSubtitle}>
            ¿Qué querés hacer hoy?
          </p>
        </div>

        <div style={styles.cardsGrid}>
          {cards.map((card) => (
            <div
              key={card.id}
              style={{
                ...styles.card,
                borderColor: card.colors.border,
              }}
              onClick={() => navigate(card.path)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 12px 32px ${card.colors.border}30`;
                e.currentTarget.style.backgroundColor = card.colors.bg;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                e.currentTarget.style.backgroundColor = "white";
              }}
            >
              <div style={styles.cardIcon}>{card.icon}</div>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardDescription}>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Admin link */}
        {isAdmin && (
          <div style={{ textAlign: "center" }}>
            <a
              href="/admin/metrics"
              style={styles.adminLink}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#e2e8f0";
                e.currentTarget.style.color = "#475569";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#f1f5f9";
                e.currentTarget.style.color = "#64748b";
              }}
            >
              📊 Panel de Administrador
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>Juego del Semáforo · Método Lúdico Integral</p>
      </footer>
    </div>
  );
}