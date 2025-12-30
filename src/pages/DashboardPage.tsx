// src/pages/DashboardPage.tsx
// Dashboard principal del docente con selector de modo de juego

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode, type GameMode } from "../contexts/GameModeContext";
import { useI18n, LanguageSelector } from "../i18n";

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
  const { t } = useI18n();
  
  if (!isOpen) return null;

  const modes = [
    {
      id: 'traffic-light' as GameMode,
      icon: '🚦',
      title: t.gameModes.trafficLight.title,
      subtitle: t.gameModes.trafficLight.subtitle,
      description: t.gameModes.trafficLight.description,
      ageRange: t.gameModes.trafficLight.ageRange,
      color: '#22c55e',
      bg: '#f0fdf4',
    },
    {
      id: 'coopetition' as GameMode,
      icon: '🎯',
      title: t.gameModes.coopetition.title,
      subtitle: t.gameModes.coopetition.subtitle,
      description: t.gameModes.coopetition.description,
      ageRange: t.gameModes.coopetition.ageRange,
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
          fontSize: 24,
          fontWeight: 800,
          color: '#1e293b',
          textAlign: 'center',
        }}>
          {t.dashboard.selectGameMode}
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: 14,
          color: '#64748b',
          textAlign: 'center',
        }}>
          {t.dashboard.selectGameModeSubtitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                onSelect(mode.id);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: 20,
                borderRadius: 16,
                border: currentMode === mode.id 
                  ? `3px solid ${mode.color}` 
                  : '3px solid transparent',
                backgroundColor: mode.bg,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${mode.color}30`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                boxShadow: `0 4px 12px ${mode.color}20`,
                flexShrink: 0,
              }}>
                {mode.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: 4,
                }}>
                  {mode.title}
                </div>
                <div style={{
                  fontSize: 13,
                  color: mode.color,
                  fontWeight: 600,
                  marginBottom: 6,
                }}>
                  {mode.subtitle}
                </div>
                <div style={{
                  fontSize: 13,
                  color: '#64748b',
                  lineHeight: 1.4,
                }}>
                  {mode.description}
                </div>
              </div>
              <div style={{
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: mode.color,
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {mode.ageRange}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 24,
            width: '100%',
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 12,
            border: '2px solid #e2e8f0',
            backgroundColor: 'white',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL: Dashboard
// ============================================

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { mode, setMode, theme } = useGameMode();
  const { t } = useI18n();
  
  const [showModeSelector, setShowModeSelector] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const cards = [
    {
      icon: '🎮',
      title: t.dashboard.createGame,
      description: mode === 'coopetition' 
        ? 'Create a new coopetition session'
        : 'Crear una nueva sesión de juego',
      action: () => navigate('/setup'),
      color: theme.primary,
      gradient: theme.primaryGradient,
    },
    {
      icon: '📚',
      title: t.dashboard.library,
      description: mode === 'coopetition'
        ? 'Browse and select question banks'
        : 'Explorá y seleccioná bancos de preguntas',
      action: () => navigate('/library'),
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${theme.cardHoverBg} 0%, #f8fafc 50%, #f1f5f9 100%)`,
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: theme.primaryGradient,
        padding: '20px 32px',
        color: 'white',
        boxShadow: `0 4px 20px ${theme.primary}40`,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          {/* Logo + Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{theme.icon}</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                  {mode === 'coopetition' ? 'Coopetition Game' : 'Traffic Light Game'}
                </h1>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
                  {theme.tagline}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowModeSelector(true)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: '2px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ⚙️ {t.common.edit}
            </button>
          </div>

          {/* User + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LanguageSelector compact />
            
            <span style={{ fontSize: 14, opacity: 0.9 }}>
              {user?.email}
            </span>
            
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/metrics')}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '2px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ⚙️ Admin
              </button>
            )}
            
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {t.auth.logout}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        {/* Welcome */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: 32,
            fontWeight: 800,
            color: '#1e293b',
          }}>
            {t.dashboard.welcome}, {user?.displayName?.split(' ')[0] || 'Docente'}! 👋
          </h2>
          <p style={{
            margin: 0,
            fontSize: 18,
            color: '#64748b',
          }}>
            {t.dashboard.title}
          </p>
        </div>

        {/* Action Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginBottom: 48,
        }}>
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={card.action}
              style={{
                padding: 32,
                borderRadius: 20,
                border: 'none',
                backgroundColor: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 20px 40px ${card.color}30`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
              }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: card.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                boxShadow: `0 8px 24px ${card.color}40`,
              }}>
                {card.icon}
              </div>
              <div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1e293b',
                }}>
                  {card.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#64748b',
                  lineHeight: 1.5,
                }}>
                  {card.description}
                </p>
              </div>
              <div style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: card.color,
                fontWeight: 600,
                fontSize: 14,
              }}>
                {t.common.continue} →
              </div>
            </button>
          ))}
        </div>

        {/* Current Mode Badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            borderRadius: 16,
            backgroundColor: theme.cardHoverBg,
            border: `2px solid ${theme.primary}40`,
          }}>
            <span style={{ fontSize: 24 }}>{theme.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                {mode === 'coopetition' ? 'Current mode' : 'Modo actual'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.primary }}>
                {mode === 'coopetition' ? 'Coopetition Game' : 'Traffic Light Game'}
              </div>
            </div>
            <button
              onClick={() => setShowModeSelector(true)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: `2px solid ${theme.primary}`,
                backgroundColor: 'white',
                color: theme.primary,
                cursor: 'pointer',
              }}
            >
              {t.common.edit}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 14,
      }}>
        <button
          onClick={() => navigate('/about')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 14,
            textDecoration: 'underline',
          }}
        >
          {mode === 'coopetition' ? 'About this project' : 'Acerca de este proyecto'}
        </button>
      </footer>

      {/* Mode Selector Modal */}
      <ModeSelectorModal
        isOpen={showModeSelector}
        onClose={() => setShowModeSelector(false)}
        onSelect={setMode}
        currentMode={mode}
      />
    </div>
  );
}