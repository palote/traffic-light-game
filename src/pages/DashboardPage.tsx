// src/pages/DashboardPage.tsx
// Dashboard principal del docente con selector de modo de juego

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode, type GameMode } from "../contexts/GameModeContext";

// ============================================
// COMPONENTE: Selector de Modo (Modal)
// ============================================

interface ModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: GameMode) => void;
  currentMode: GameMode;
}

function ModeSelectorModal({ isOpen, onClose, onSelect, currentMode }: ModeSelectorModalProps) {
  if (!isOpen) return null;

  const modes = [
    {
      id: 'traffic-light' as GameMode,
      icon: '🚦',
      title: 'Traffic Light Game',
      subtitle: 'El Juego del Semáforo',
      description: 'Ideal for elementary and middle school students. Colorful and friendly interface.',
      ageRange: 'Under 13',
      color: '#22c55e',
      bg: '#f0fdf4',
    },
    {
      id: 'coopetition' as GameMode,
      icon: '🎯',
      title: 'The Coopetition Game',
      subtitle: 'Where competition meets collaboration',
      description: 'For teenagers and adults. More professional and sober design.',
      ageRange: '13+ years',
      color: '#6366f1',
      bg: '#eef2ff',
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 20,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        maxWidth: 600,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: 28,
          fontWeight: 800,
          color: '#1e293b',
          textAlign: 'center',
        }}>
          Choose Your Game Mode
        </h2>
        <p style={{
          margin: '0 0 32px 0',
          fontSize: 16,
          color: '#64748b',
          textAlign: 'center',
        }}>
          Transforming the classroom at any age
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}>
          {modes.map((mode) => (
            <div
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              style={{
                padding: 24,
                borderRadius: 16,
                border: `3px solid ${currentMode === mode.id ? mode.color : '#e2e8f0'}`,
                backgroundColor: currentMode === mode.id ? mode.bg : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = mode.color;
                e.currentTarget.style.backgroundColor = mode.bg;
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = currentMode === mode.id ? mode.color : '#e2e8f0';
                e.currentTarget.style.backgroundColor = currentMode === mode.id ? mode.bg : 'white';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {currentMode === mode.id && (
                <div style={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: mode.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}>
                  ✓
                </div>
              )}
              
              <div style={{ fontSize: 48, marginBottom: 12, textAlign: 'center' }}>
                {mode.icon}
              </div>
              
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: 18,
                fontWeight: 700,
                color: '#1e293b',
                textAlign: 'center',
              }}>
                {mode.title}
              </h3>
              
              <p style={{
                margin: '0 0 12px 0',
                fontSize: 13,
                color: mode.color,
                fontWeight: 600,
                textAlign: 'center',
              }}>
                {mode.subtitle}
              </p>
              
              <p style={{
                margin: '0 0 12px 0',
                fontSize: 13,
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 1.5,
              }}>
                {mode.description}
              </p>
              
              <div style={{
                padding: '6px 12px',
                backgroundColor: mode.color + '20',
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: mode.color,
              }}>
                {mode.ageRange}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 24,
            width: '100%',
            padding: '14px 24px',
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 12,
            border: 'none',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { mode, setMode, theme } = useGameMode();
  
  const [showModeSelector, setShowModeSelector] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const handleModeSelect = (newMode: GameMode) => {
    setMode(newMode);
    setShowModeSelector(false);
  };

  // Estilos dinámicos según el tema
  const styles = {
    page: {
      minHeight: "100vh",
      background: mode === 'traffic-light' 
        ? "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)"
        : "linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    header: {
      background: theme.primaryGradient,
      padding: "24px 32px",
      color: "white",
      boxShadow: `0 4px 20px ${theme.primary}40`,
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
    tagline: {
      margin: 0,
      fontSize: 12,
      opacity: 0.9,
      fontWeight: 500,
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
    modeSelector: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      padding: "8px 16px",
      backgroundColor: "white",
      borderRadius: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      cursor: "pointer",
      border: `2px solid ${theme.primary}`,
      transition: "all 0.2s",
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

  const cardColors = {
    create: { border: theme.primary, bg: theme.cardHoverBg },
    library: { border: "#8b5cf6", bg: "#f5f3ff" },
    about: { border: "#3b82f6", bg: "#eff6ff" },
  };

  const cards = [
    {
      id: "create",
      icon: mode === 'traffic-light' ? "🎮" : "🚀",
      title: mode === 'traffic-light' ? "Crear Juego Nuevo" : "Create New Game",
      description: mode === 'traffic-light' 
        ? "Configurá un nuevo juego con tus preguntas, equipos y estudiantes."
        : "Set up a new game with your questions, teams and students.",
      path: "/setup",
      colors: cardColors.create,
    },
    {
      id: "library",
      icon: "📚",
      title: mode === 'traffic-light' ? "Biblioteca de Preguntas" : "Question Library",
      description: mode === 'traffic-light'
        ? "Explorá y usá bancos de preguntas organizados por grado y materia."
        : "Browse and use question banks organized by grade and subject.",
      path: "/library",
      colors: cardColors.library,
    },
    {
      id: "about",
      icon: "❓",
      title: mode === 'traffic-light' ? "Acerca del Juego" : "About the Game",
      description: mode === 'traffic-light'
        ? "Conocé qué es el Juego del Semáforo y descargá materiales informativos."
        : "Learn about The Coopetition Game and download informative materials.",
      path: "/about",
      colors: cardColors.about,
    },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>{theme.icon}</span>
            <div>
              <h1 style={styles.logoText}>{theme.name}</h1>
              <p style={styles.tagline}>{theme.tagline}</p>
            </div>
          </div>
          
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>{user?.email}</span>
            <button
              style={styles.logoutBtn}
              onClick={handleLogout}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
            >
              {mode === 'traffic-light' ? 'Cerrar sesión' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={styles.content}>
        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>{theme.welcomeTitle}</h2>
          <p style={styles.welcomeSubtitle}>{theme.welcomeSubtitle}</p>
          
          {/* Mode Selector Button */}
          <div
            style={styles.modeSelector}
            onClick={() => setShowModeSelector(true)}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = theme.cardHoverBg;
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span style={{ fontSize: 20 }}>{theme.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.primary }}>
              {mode === 'traffic-light' ? '≤13 años' : '+13 years'}
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>▼</span>
          </div>
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
              📊 {mode === 'traffic-light' ? 'Panel de Administrador' : 'Admin Panel'}
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>
          {mode === 'traffic-light' 
            ? 'Juego del Semáforo · Método Lúdico Integral'
            : 'The Coopetition Game · Integral Ludic Method'
          }
        </p>
      </footer>

      {/* Mode Selector Modal */}
      <ModeSelectorModal
        isOpen={showModeSelector}
        onClose={() => setShowModeSelector(false)}
        onSelect={handleModeSelect}
        currentMode={mode}
      />
    </div>
  );
}