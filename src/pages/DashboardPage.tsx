// src/pages/DashboardPage.tsx
// Dashboard principal del docente con selector de modo de juego
// ✅ NUEVO: Sección de "Mis juegos activos"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, remove, get } from "firebase/database";
import { database } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode, type GameMode } from "../contexts/GameModeContext";
import { useI18n, LanguageSelector } from "../i18n";

// ============================================
// TIPOS
// ============================================

interface ActiveGame {
  id: string;
  name: string;
  subject: string;
  roomCode: string;
  status: string;
  currentStage: number;
  teamsCount: number;
  questionsCount: number;
  createdAt: number;
  gameMode: string;
}

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
// COMPONENTE: Card de Juego Activo
// ============================================

interface GameCardProps {
  game: ActiveGame;
  onContinue: (game: ActiveGame) => void;
  onDelete: (game: ActiveGame) => void;
  language: string;
}

function GameCard({ game, onContinue, onDelete, language }: GameCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Determinar estado y color
  const getStatusInfo = () => {
    const stage = game.currentStage;
    const status = game.status;
    
    if (status === 'finished' || status === 'ended') {
      return { 
        label: language === 'es' ? 'Finalizado' : 'Finished', 
        color: '#64748b', 
        bg: '#f1f5f9',
        icon: '✅'
      };
    }
    
    if (stage === 0 || status === 'stage0') {
      if (status === 'proposal-collecting') {
        return { 
          label: language === 'es' ? 'Recibiendo propuestas' : 'Collecting proposals', 
          color: '#8b5cf6', 
          bg: '#ede9fe',
          icon: '📝'
        };
      }
      if (status === 'proposal-curating') {
        return { 
          label: language === 'es' ? 'Curando propuestas' : 'Curating proposals', 
          color: '#7c3aed', 
          bg: '#ede9fe',
          icon: '✂️'
        };
      }
      return { 
        label: language === 'es' ? 'Etapa 0 - Propuestas' : 'Stage 0 - Proposals', 
        color: '#8b5cf6', 
        bg: '#ede9fe',
        icon: '📝'
      };
    }
    
    if (stage === 1 || status === 'stage1') {
      return { 
        label: language === 'es' ? 'Etapa 1 - En juego' : 'Stage 1 - Playing', 
        color: '#22c55e', 
        bg: '#dcfce7',
        icon: '🎮'
      };
    }
    
    if (status === 'transition') {
      return { 
        label: language === 'es' ? 'Transición a Etapa 2' : 'Transition to Stage 2', 
        color: '#f59e0b', 
        bg: '#fef3c7',
        icon: '⏳'
      };
    }
    
    if (stage === 2 || status === 'stage2') {
      return { 
        label: language === 'es' ? 'Etapa 2 - En juego' : 'Stage 2 - Playing', 
        color: '#3b82f6', 
        bg: '#dbeafe',
        icon: '🏆'
      };
    }
    
    return { 
      label: language === 'es' ? 'Preparando' : 'Preparing', 
      color: '#64748b', 
      bg: '#f1f5f9',
      icon: '⚙️'
    };
  };
  
  const statusInfo = getStatusInfo();
  const isFinished = game.status === 'finished' || game.status === 'ended';
  
  // Formatear fecha
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return language === 'es' 
        ? `hace ${diffMins} min` 
        : `${diffMins} min ago`;
    }
    if (diffHours < 24) {
      return language === 'es' 
        ? `hace ${diffHours} h` 
        : `${diffHours} h ago`;
    }
    if (diffDays < 7) {
      return language === 'es' 
        ? `hace ${diffDays} días` 
        : `${diffDays} days ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 12,
      }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ 
            margin: '0 0 4px 0', 
            fontSize: 16, 
            fontWeight: 700, 
            color: '#1e293b',
          }}>
            {game.name || (language === 'es' ? 'Juego sin nombre' : 'Unnamed game')}
          </h4>
          {game.subject && (
            <p style={{ 
              margin: 0, 
              fontSize: 13, 
              color: '#64748b',
            }}>
              {game.subject}
            </p>
          )}
        </div>
        
        {/* Status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 8,
          backgroundColor: statusInfo.bg,
          color: statusInfo.color,
          fontSize: 12,
          fontWeight: 600,
        }}>
          <span>{statusInfo.icon}</span>
          <span>{statusInfo.label}</span>
        </div>
      </div>
      
      {/* Info row */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 16,
        fontSize: 13,
        color: '#64748b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>🔑</span>
          <span style={{ 
            fontFamily: 'monospace', 
            fontWeight: 600,
            color: '#1e293b',
          }}>
            {game.roomCode}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>👥</span>
          <span>{game.teamsCount} {language === 'es' ? 'equipos' : 'teams'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>❓</span>
          <span>{game.questionsCount} {language === 'es' ? 'preguntas' : 'questions'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <span>🕐</span>
          <span>{formatDate(game.createdAt)}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!isFinished && (
          <button
            onClick={() => onContinue(game)}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>▶️</span>
            {language === 'es' ? 'Continuar' : 'Continue'}
          </button>
        )}
        
        {showDeleteConfirm ? (
          <>
            <button
              onClick={() => {
                onDelete(game);
                setShowDeleteConfirm(false);
              }}
              style={{
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#ef4444',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {language === 'es' ? 'Confirmar' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>🗑️</span>
            {language === 'es' ? 'Eliminar' : 'Delete'}
          </button>
        )}
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
  const { t, language } = useI18n();
  
  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // ✅ NUEVO: Estado para juegos activos
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // ✅ NUEVO: Cargar juegos del usuario
  useEffect(() => {
    if (!user?.uid) {
      setLoadingGames(false);
      return;
    }

    const gamesRef = ref(database, 'games');
    
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveGames([]);
        setLoadingGames(false);
        return;
      }
      
      const games: ActiveGame[] = [];
      const data = snapshot.val();
      
      Object.entries(data).forEach(([id, gameData]: [string, any]) => {
        // Solo mostrar juegos creados por este usuario
        if (gameData.createdBy?.uid !== user.uid) return;
        
        // Contar equipos y preguntas
        const teamsCount = gameData.teams ? Object.keys(gameData.teams).length : 0;
        const questionsCount = gameData.questions ? Object.keys(gameData.questions).length : 0;
        
        games.push({
          id,
          name: gameData.config?.className || gameData.config?.gameName || '',
          subject: gameData.config?.subject || '',
          roomCode: gameData.roomCode || '------',
          status: gameData.status?.status || gameData.status?.currentPhase || 'unknown',
          currentStage: gameData.status?.currentStage || 0,
          teamsCount,
          questionsCount,
          createdAt: gameData.config?.createdAt || gameData.createdAt || Date.now(),
          gameMode: gameData.config?.gameMode || 'traffic-light',
        });
      });
      
      // Ordenar por fecha (más recientes primero)
      games.sort((a, b) => b.createdAt - a.createdAt);
      
      setActiveGames(games);
      setLoadingGames(false);
    });

    return () => off(gamesRef);
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // ✅ NUEVO: Continuar juego
  const handleContinueGame = (game: ActiveGame) => {
    const stage = game.currentStage;
    const status = game.status;
    
    // Stage 2
    if (stage === 2 || status === 'stage2') {
      navigate(`/stage2/classroom/${game.id}`);
      return;
    }
    
    // Stage 1 o transición
    if (stage === 1 || status === 'stage1' || status === 'transition') {
      navigate(`/classroom/${game.id}`);
      return;
    }
    
    // Stage 0 (propuestas)
    if (stage === 0 || status?.startsWith('proposal') || status === 'stage0') {
      // Para Stage 0, vamos al classroom que maneja las propuestas
      navigate(`/classroom/${game.id}`);
      return;
    }
    
    // Default: ir al classroom
    navigate(`/classroom/${game.id}`);
  };

  // ✅ NUEVO: Eliminar juego
  const handleDeleteGame = async (game: ActiveGame) => {
    try {
      // Eliminar el juego
      await remove(ref(database, `games/${game.id}`));
      
      // Eliminar el código de sala si existe
      if (game.roomCode && game.roomCode !== '------') {
        await remove(ref(database, `roomCodes/${game.roomCode}`));
      }
      
      console.log(`✅ Game ${game.id} deleted`);
    } catch (error) {
      console.error('Error deleting game:', error);
      alert(language === 'es' ? 'Error al eliminar el juego' : 'Error deleting game');
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

  // Separar juegos activos y finalizados
  const ongoingGames = activeGames.filter(g => g.status !== 'finished' && g.status !== 'ended');
  const finishedGames = activeGames.filter(g => g.status === 'finished' || g.status === 'ended');

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

        {/* ✅ NUEVO: Sección de Juegos Activos */}
        <div style={{ marginBottom: 48 }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: 20,
            fontWeight: 700,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            🎮 {language === 'es' ? 'Mis juegos' : 'My games'}
            {ongoingGames.length > 0 && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: 13,
                fontWeight: 600,
              }}>
                {ongoingGames.length} {language === 'es' ? 'activos' : 'active'}
              </span>
            )}
          </h3>
          
          {loadingGames ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: '#64748b',
            }}>
              ⏳ {language === 'es' ? 'Cargando juegos...' : 'Loading games...'}
            </div>
          ) : activeGames.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              backgroundColor: 'white',
              borderRadius: 16,
              border: '2px dashed #e2e8f0',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
              <p style={{ margin: 0, color: '#64748b', fontSize: 15 }}>
                {language === 'es' 
                  ? 'No tenés juegos creados. ¡Creá uno nuevo para empezar!'
                  : 'No games created yet. Create one to get started!'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Juegos activos */}
              {ongoingGames.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ongoingGames.map(game => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onContinue={handleContinueGame}
                      onDelete={handleDeleteGame}
                      language={language}
                    />
                  ))}
                </div>
              )}
              
              {/* Juegos finalizados (colapsable) */}
              {finishedGames.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#64748b',
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{ fontSize: 12 }}>▶</span>
                    {language === 'es' 
                      ? `${finishedGames.length} juegos finalizados`
                      : `${finishedGames.length} finished games`}
                  </summary>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 12,
                    marginTop: 12,
                    paddingLeft: 8,
                  }}>
                    {finishedGames.map(game => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onContinue={handleContinueGame}
                        onDelete={handleDeleteGame}
                        language={language}
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
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