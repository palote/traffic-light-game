// src/pages/DashboardPage.tsx
// Dashboard principal del docente con selector de modo de juego
// ✅ NUEVO: Sección de "Mis juegos activos"
// ✅ NUEVO: Tarjeta de estadísticas del docente
// ✅ NUEVO: Botones para juegos finalizados y conteo de autoevaluaciones
// ✅ MODIFICACIÓN: Agregado botón "Ir al Podio" para juegos finalizados sin autoevaluaciones

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, remove, get } from "firebase/database";
import { database } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode, type GameMode } from "../contexts/GameModeContext";
import { useI18n, LanguageSelector } from "../i18n";
import { DashboardBanners } from "../components/DashboardBanners";

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

interface TeacherStats {
  totalSessions: number;
  totalDurationSec: number;
  monthSessions: number;
  monthDurationSec: number;
  gamesCreated: number;
  gamesCompleted: number;
}

// ============================================
// COMPONENTE: Tarjeta de Estadísticas
// ============================================

function TeacherStatsCard({ stats, loading }: { stats: TeacherStats | null; loading: boolean }) {
  const { language } = useI18n();

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const texts = {
    es: {
      title: "Tu actividad",
      thisMonth: "Este mes",
      total: "Total",
      time: "Tiempo",
      sessions: "Sesiones",
      games: "Juegos",
      created: "creados",
      completed: "completados",
    },
    en: {
      title: "Your activity",
      thisMonth: "This month",
      total: "Total",
      time: "Time",
      sessions: "Sessions",
      games: "Games",
      created: "created",
      completed: "completed",
    },
    pt: {
      title: "Sua atividade",
      thisMonth: "Este mês",
      total: "Total",
      time: "Tempo",
      sessions: "Sessões",
      games: "Jogos",
      created: "criados",
      completed: "completados",
    },
  };

  const t = texts[language] || texts.es;

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          backgroundColor: "white",
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: 24,
          textAlign: "center",
          color: "#64748b",
        }}
      >
        ⏳ Cargando estadísticas...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div
      style={{
        padding: 24,
        backgroundColor: "white",
        borderRadius: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e2e8f0",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 24 }}>📊</span>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{t.title}</h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 16,
        }}
      >
        {/* Tiempo este mes */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#eff6ff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>⏱️ {t.time}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>
            {formatDuration(stats.monthDurationSec)}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{t.thisMonth}</div>
        </div>

        {/* Sesiones este mes */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#f0fdf4",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>🔐 {t.sessions}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{stats.monthSessions}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{t.thisMonth}</div>
        </div>

        {/* Juegos creados */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#fef3c7",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>🎮 {t.games}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{stats.gamesCreated}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{t.created}</div>
        </div>

        {/* Juegos completados */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#ede9fe",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>✅ {t.games}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#8b5cf6" }}>{stats.gamesCompleted}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{t.completed}</div>
        </div>
      </div>

      {/* Totales pequeños */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "center",
          gap: 24,
          fontSize: 12,
          color: "#64748b",
        }}
      >
        <span>
          {t.total}: {formatDuration(stats.totalDurationSec)} · {stats.totalSessions} {t.sessions.toLowerCase()}
        </span>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Sección de Evaluaciones Recientes
// ============================================

function EvaluationsSection({
  gamesWithEvaluations,
  t,
}: {
  gamesWithEvaluations: Array<{
    gameId: string;
    gameName: string;
    subject?: string;
    evalCount: number;
  }>;
  t: any;
}) {
  const navigate = useNavigate();

  if (gamesWithEvaluations.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "2px solid #8b5cf6",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
          📊 {t.dashboard.evaluationsTitle || "Evaluaciones para revisar"}
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {gamesWithEvaluations.slice(0, 5).map((game) => (
          <div
            key={game.gameId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: "#f8fafc",
              borderRadius: 10,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() => navigate(`/resultados/${game.gameId}?tab=autoevaluaciones`)}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
              e.currentTarget.style.transform = "translateX(4px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>{game.gameName}</div>
              {game.subject && (
                <div style={{ fontSize: 12, color: "#64748b" }}>{game.subject}</div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                📝 {game.evalCount}
              </div>
              <span style={{ color: "#94a3b8" }}>→</span>
            </div>
          </div>
        ))}
      </div>

      {gamesWithEvaluations.length > 5 && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            +{gamesWithEvaluations.length - 5} {t.dashboard.moreGames || "juegos más"}
          </span>
        </div>
      )}
    </div>
  );
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
      id: "traffic-light" as GameMode,
      icon: "🚦",
      title: t.gameModes.trafficLight.title,
      subtitle: t.gameModes.trafficLight.subtitle,
      description: t.gameModes.trafficLight.description,
      ageRange: t.gameModes.trafficLight.ageRange,
      color: "#22c55e",
      bg: "#f0fdf4",
    },
    {
      id: "coopetition" as GameMode,
      icon: "🎯",
      title: t.gameModes.coopetition.title,
      subtitle: t.gameModes.coopetition.subtitle,
      description: t.gameModes.coopetition.description,
      ageRange: t.gameModes.coopetition.ageRange,
      color: "#6366f1",
      bg: "#eef2ff",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: 32,
          maxWidth: 600,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: 24,
            fontWeight: 800,
            color: "#1e293b",
            textAlign: "center",
          }}
        >
          {t.dashboard.selectGameMode}
        </h2>
        <p
          style={{
            margin: "0 0 24px 0",
            fontSize: 14,
            color: "#64748b",
            textAlign: "center",
          }}
        >
          {t.dashboard.selectGameModeSubtitle}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                onSelect(mode.id);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: 20,
                borderRadius: 16,
                border: currentMode === mode.id ? `3px solid ${mode.color}` : "3px solid transparent",
                backgroundColor: mode.bg,
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${mode.color}30`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  boxShadow: `0 4px 12px ${mode.color}20`,
                  flexShrink: 0,
                }}
              >
                {mode.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#1e293b",
                    marginBottom: 4,
                  }}
                >
                  {mode.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: mode.color,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  {mode.subtitle}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    lineHeight: 1.4,
                  }}
                >
                  {mode.description}
                </div>
              </div>
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  backgroundColor: mode.color,
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {mode.ageRange}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 24,
            width: "100%",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 12,
            border: "2px solid #e2e8f0",
            backgroundColor: "white",
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Card de Juego Activo (ACTUALIZADO)
// ============================================

interface GameCardProps {
  game: ActiveGame;
  onContinue: (game: ActiveGame) => void;
  onDelete: (game: ActiveGame) => void;
  selfEvalCount?: number;  // ✅ AGREGAR ESTA LÍNEA
}

function GameCard({ game, onContinue, onDelete, selfEvalCount = 0 }: GameCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusInfo = () => {
    const stage = game.currentStage;
    const status = game.status;

    if (status === "finished" || status === "ended" || status === "game_complete") {
      return {
        label: t.dashboard.status.finished,
        color: "#64748b",
        bg: "#f1f5f9",
        icon: "✅",
      };
    }

    if (stage === 0 || status === "stage0") {
      if (status === "proposal-collecting") {
        return {
          label: t.dashboard.status.collectingProposals,
          color: "#8b5cf6",
          bg: "#ede9fe",
          icon: "📝",
        };
      }
      if (status === "proposal-curating") {
        return {
          label: t.dashboard.status.curatingProposals,
          color: "#7c3aed",
          bg: "#ede9fe",
          icon: "✂️",
        };
      }
      return {
        label: t.dashboard.status.stage0Proposals,
        color: "#8b5cf6",
        bg: "#ede9fe",
        icon: "📝",
      };
    }

    if (stage === 1 || status === "stage1") {
      return {
        label: t.dashboard.status.stage1Playing,
        color: "#22c55e",
        bg: "#dcfce7",
        icon: "🎮",
      };
    }

    if (status === "transition") {
      return {
        label: t.dashboard.status.transitionStage2,
        color: "#f59e0b",
        bg: "#fef3c7",
        icon: "⏳",
      };
    }

    if (stage === 2 || status === "stage2") {
      return {
        label: t.dashboard.status.stage2Playing,
        color: "#3b82f6",
        bg: "#dbeafe",
        icon: "🏆",
      };
    }

    return {
      label: t.dashboard.status.preparing,
      color: "#64748b",
      bg: "#f1f5f9",
      icon: "⚙️",
    };
  };

  const statusInfo = getStatusInfo();
  const isFinished = game.status === "finished" || game.status === "ended" || game.status === "game_complete";

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return t.dashboard.time.minutesAgo(diffMins);
    if (diffHours < 24) return t.dashboard.time.hoursAgo(diffHours);
    if (diffDays < 7) return t.dashboard.time.daysAgo(diffDays);

    return date.toLocaleDateString();
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e2e8f0",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h4
            style={{
              margin: "0 0 4px 0",
              fontSize: 16,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            {game.name || t.dashboard.unnamedGame}
          </h4>

          {game.subject && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              {game.subject}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 8,
            backgroundColor: statusInfo.bg,
            color: statusInfo.color,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span>{statusInfo.icon}</span>
          <span>{statusInfo.label}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          fontSize: 13,
          color: "#64748b",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>🔑</span>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            {game.roomCode}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>👥</span>
          <span>
            {game.teamsCount} {t.common.teams}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>❓</span>
          <span>
            {game.questionsCount} {t.common.questions}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <span>🕐</span>
          <span>{formatDate(game.createdAt)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Juegos activos: Continuar */}
        {!isFinished && (
          <button
            onClick={() => onContinue(game)}
            style={{
              flex: 1,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minWidth: 100,
            }}
          >
            <span>▶️</span>
            {t.common.continueVerb}
          </button>
        )}

        {/* Juegos finalizados: Ver resultados */}
        {isFinished && (
          <>
            <button
              onClick={() => navigate(`/resultados/${game.id}`)}
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minWidth: 100,
              }}
            >
              <span>📊</span>
              {t.dashboard.viewResults}
            </button>

            {selfEvalCount > 0 && (
              <button
                onClick={() => navigate(`/resultados/${game.id}?tab=autoevaluaciones`)}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "2px solid #8b5cf6",
                  backgroundColor: "#f5f3ff",
                  color: "#7c3aed",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>📝</span>
                {selfEvalCount}
              </button>
            )}

            {/* ✅ MODIFICACIÓN: Botón Ir al Podio (si no hay autoevaluaciones) */}
            {selfEvalCount === 0 && (
              <button
                onClick={() => navigate(`/stage2/classroom/${game.id}`)}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "2px solid #f59e0b",
                  backgroundColor: "#fffbeb",
                  color: "#d97706",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>🏆</span>
                {t.dashboard.goToPodium || "Ir al Podio"}
              </button>
            )}
          </>
        )}

        {/* Botón eliminar */}
        {showDeleteConfirm ? (
          <>
            <button
              onClick={() => {
                onDelete(game);
                setShowDeleteConfirm(false);
              }}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                backgroundColor: "#ef4444",
                color: "white",
                cursor: "pointer",
              }}
            >
              {t.common.confirm}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                backgroundColor: "white",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              {t.common.cancel}
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              color: "#ef4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span>🗑️</span>
            {!isFinished && t.common.delete}
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
  const { mode, setMode, getLocalizedTheme } = useGameMode(); // ✅ MODIFICADO
  const { t, language } = useI18n(); // ✅ AGREGADO language
  const theme = getLocalizedTheme(language); // ✅ NUEVO: obtener tema localizado

  const [showModeSelector, setShowModeSelector] = useState(false);

  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // ✅ NUEVO: Estado para estadísticas del docente
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ✅ NUEVO: Estado para conteo de autoevaluaciones por juego
  const [selfEvalCounts, setSelfEvalCounts] = useState<Record<string, number>>({});

  // ✅ NUEVO: Paso 1 - Agregar estado para juegos con evaluaciones
  const [gamesWithEvaluations, setGamesWithEvaluations] = useState<Array<{
    gameId: string;
    gameName: string;
    subject?: string;
    evalCount: number;
    completedAt?: number;
  }>>([]);

  // Cargar juegos activos
  useEffect(() => {
    if (!user?.uid) {
      setLoadingGames(false);
      return;
    }

    const gamesRef = ref(database, "games");

    onValue(gamesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveGames([]);
        setLoadingGames(false);
        return;
      }

      const games: ActiveGame[] = [];
      const data = snapshot.val();

      Object.entries(data).forEach(([id, gameData]: [string, any]) => {
        if (gameData.createdBy?.uid !== user.uid) return;

        const teamsCount = gameData.teams ? Object.keys(gameData.teams).length : 0;
        const questionsCount = gameData.questions ? Object.keys(gameData.questions).length : 0;

        games.push({
          id,
          name: gameData.config?.className || gameData.config?.gameName || "",
          subject: gameData.config?.subject || "",
          roomCode: gameData.roomCode || "------",
          status: gameData.status?.status || gameData.status?.currentPhase || "unknown",
          currentStage: gameData.status?.currentStage || 0,
          teamsCount,
          questionsCount,
          createdAt: gameData.config?.createdAt || gameData.createdAt || Date.now(),
          gameMode: gameData.config?.gameMode || "traffic-light",
        });
      });

      games.sort((a, b) => b.createdAt - a.createdAt);

      setActiveGames(games);
      setLoadingGames(false);
    });

    return () => off(gamesRef);
  }, [user?.uid]);

  // ✅ NUEVO: Cargar estadísticas del docente
  useEffect(() => {
    async function loadStats() {
      if (!user?.uid) {
        setLoadingStats(false);
        return;
      }

      try {
        // Cargar métricas del docente
        const metricsSnap = await get(ref(database, `metrics/teachers/${user.uid}`));
        const gamesSnap = await get(ref(database, "games"));

        const metricsData = metricsSnap.val();
        const gamesData = gamesSnap.val() || {};

        // Calcular estadísticas de sesiones
        const sessions = metricsData?.sessions ? Object.values(metricsData.sessions) : [];
        const now = Date.now();
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

        let totalDurationSec = 0;
        let monthDurationSec = 0;
        let monthSessions = 0;

        for (const session of sessions as any[]) {
          const duration = session.durationSec || 
            (session.loginAt && session.logoutAt 
              ? Math.floor((session.logoutAt - session.loginAt) / 1000) 
              : 0);
          
          totalDurationSec += duration;

          if (session.loginAt >= startOfMonth) {
            monthSessions++;
            monthDurationSec += duration;
          }
        }

        // Calcular juegos creados y completados
        let gamesCreated = 0;
        let gamesCompleted = 0;

        for (const [_, gameData] of Object.entries(gamesData) as [string, any][]) {
          if (gameData.createdBy?.uid === user.uid) {
            gamesCreated++;
            if (gameData.status?.status === "game_complete" || 
                gameData.status?.status === "finished" || 
                gameData.status?.status === "ended") {
              gamesCompleted++;
            }
          }
        }

        setTeacherStats({
          totalSessions: sessions.length,
          totalDurationSec,
          monthSessions,
          monthDurationSec,
          gamesCreated,
          gamesCompleted,
        });
      } catch (error) {
        console.error("Error loading teacher stats:", error);
      }

      setLoadingStats(false);
    }

    loadStats();
  }, [user?.uid]);

  // ✅ NUEVO: Paso 2 - Modificar el efecto que carga autoevaluaciones
  useEffect(() => {
    async function loadSelfEvalCounts() {
      const finishedGames = activeGames.filter(
        (g) => g.status === "finished" || g.status === "ended" || g.status === "game_complete"
      );

      if (finishedGames.length === 0) {
        setSelfEvalCounts({});
        setGamesWithEvaluations([]);
        return;
      }

      const counts: Record<string, number> = {};
      const gamesWithEvals: Array<{
        gameId: string;
        gameName: string;
        subject?: string;
        evalCount: number;
        completedAt?: number;
      }> = [];

      for (const game of finishedGames) {
        try {
          const snap = await get(ref(database, `selfEvaluations/${game.id}`));
          const count = snap.exists() ? Object.keys(snap.val()).length : 0;
          counts[game.id] = count;

          // Agregar a la lista si tiene evaluaciones
          if (count > 0) {
            gamesWithEvals.push({
              gameId: game.id,
              gameName: game.name || "Sin nombre",
              subject: game.subject,
              evalCount: count,
              completedAt: game.createdAt,
            });
          }
        } catch {
          counts[game.id] = 0;
        }
      }

      // Ordenar por cantidad de evaluaciones (más primero)
      gamesWithEvals.sort((a, b) => b.evalCount - a.evalCount);

      setSelfEvalCounts(counts);
      setGamesWithEvaluations(gamesWithEvals);
    }

    if (!loadingGames && activeGames.length > 0) {
      loadSelfEvalCounts();
    }
  }, [activeGames, loadingGames]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleContinueGame = (game: ActiveGame) => {
    const stage = game.currentStage;
    const status = game.status;

    if (stage === 2 || status === "stage2") {
      navigate(`/stage2/classroom/${game.id}`);
      return;
    }

    if (stage === 1 || status === "stage1" || status === "transition") {
      navigate(`/classroom/${game.id}`);
      return;
    }

    if (stage === 0 || status?.startsWith("proposal") || status === "stage0") {
      navigate(`/classroom/${game.id}`);
      return;
    }

    navigate(`/classroom/${game.id}`);
  };

  const handleDeleteGame = async (game: ActiveGame) => {
    try {
      await remove(ref(database, `games/${game.id}`));

      if (game.roomCode && game.roomCode !== "------") {
        await remove(ref(database, `roomCodes/${game.roomCode}`));
      }

      console.log(`✅ Game ${game.id} deleted`);
    } catch (error) {
      console.error("Error deleting game:", error);
      alert(t.errors.deletingGame);
    }
  };

  const cards = [
    {
      icon: "🎮",
      title: t.dashboard.createGame,
      description: t.dashboard.createGameDesc,
      action: () => navigate("/setup"),
      color: theme.primary,
      gradient: theme.primaryGradient,
    },
    {
      icon: "📚",
      title: t.dashboard.library,
      description: t.dashboard.libraryDesc,
      action: () => navigate("/library"),
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    },
  ];

  const ongoingGames = activeGames.filter(
    (g) => g.status !== "finished" && g.status !== "ended" && g.status !== "game_complete"
  );
  const finishedGames = activeGames.filter(
    (g) => g.status === "finished" || g.status === "ended" || g.status === "game_complete"
  );

  // ✅ MODIFICADO: usar theme.name en lugar de t.gameModes
  const appTitle = theme.name;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${theme.cardHoverBg} 0%, #f8fafc 50%, #f1f5f9 100%)`,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          background: theme.primaryGradient,
          padding: "20px 32px",
          color: "white",
          boxShadow: `0 4px 20px ${theme.primary}40`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>{theme.icon}</span>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{theme.name}</h1> {/* ✅ MODIFICADO */}
                <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>{theme.tagline}</p> {/* ✅ MODIFICADO */}
              </div>
            </div>

            <button
              onClick={() => setShowModeSelector(true)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: "2px solid rgba(255,255,255,0.3)",
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ⚙️ {t.common.edit}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageSelector compact />

            <span style={{ fontSize: 14, opacity: 0.9 }}>{user?.email}</span>

            {isAdmin && (
              <button
                onClick={() => navigate("/admin/metrics")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "2px solid rgba(255,255,255,0.3)",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                ⚙️ Admin
              </button>
            )}

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
              }}
            >
              {t.auth.logout}
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px",
        }}
      >
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: 32,
              fontWeight: 800,
              color: "#1e293b",
            }}
          >
            {t.dashboard.welcome} {user?.displayName?.split(" ")[0] || t.dashboard.teacherFallbackName}! 👋
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 18,
              color: "#64748b",
            }}
          >
            {t.dashboard.title}
          </p>
        </div>

        {/* ✅ BANNERS DE REFERIDOS Y WEBINAR */}
        <DashboardBanners />

        {/* ✅ NUEVO: Paso 4 - Renderizar la sección en el Dashboard */}
        {/* Sección de Evaluaciones */}
        <EvaluationsSection gamesWithEvaluations={gamesWithEvaluations} t={t} />

        {/* ✅ NUEVO: TARJETA DE ESTADÍSTICAS */}
        <TeacherStatsCard stats={teacherStats} loading={loadingStats} />

        {/* Aquí comienzan las tarjetas de acción principales */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            marginBottom: 48,
          }}
        >
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={card.action}
              style={{
                padding: 32,
                borderRadius: 20,
                border: "none",
                backgroundColor: "white",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                cursor: "pointer",
                transition: "all 0.3s",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow = `0 20px 40px ${card.color}30`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: card.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  boxShadow: `0 8px 24px ${card.color}40`,
                }}
              >
                {card.icon}
              </div>
              <div>
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "#64748b",
                    lineHeight: 1.5,
                  }}
                >
                  {card.description}
                </p>
              </div>
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: card.color,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {t.common.continue} →
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 48 }}>
          <h3
            style={{
              margin: "0 0 20px 0",
              fontSize: 20,
              fontWeight: 700,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🎮 {t.dashboard.myGames}
            {ongoingGames.length > 0 && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 12,
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {ongoingGames.length} {t.dashboard.active}
              </span>
            )}
          </h3>

          {loadingGames ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              ⏳ {t.dashboard.loadingGames}
            </div>
          ) : activeGames.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                backgroundColor: "white",
                borderRadius: 16,
                border: "2px dashed #e2e8f0",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
              <p style={{ margin: 0, color: "#64748b", fontSize: 15 }}>{t.dashboard.noGamesCreated}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ongoingGames.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {ongoingGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onContinue={handleContinueGame}
                      onDelete={handleDeleteGame}
                    />
                  ))}
                </div>
              )}

              {finishedGames.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      padding: "12px 16px",
                      backgroundColor: "#f1f5f9",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#64748b",
                      listStyle: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>▶</span>
                    {finishedGames.length} {t.dashboard.finishedGames}
                  </summary>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginTop: 12,
                      paddingLeft: 8,
                    }}
                  >
                    {finishedGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onContinue={handleContinueGame}
                        onDelete={handleDeleteGame}
                        selfEvalCount={selfEvalCounts[game.id] || 0}
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 24px",
              borderRadius: 16,
              backgroundColor: theme.cardHoverBg,
              border: `2px solid ${theme.primary}40`,
            }}
          >
            <span style={{ fontSize: 24 }}>{theme.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{t.dashboard.currentMode}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.primary }}>{appTitle}</div>
            </div>
            <button
              onClick={() => setShowModeSelector(true)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: `2px solid ${theme.primary}`,
                backgroundColor: "white",
                color: theme.primary,
                cursor: "pointer",
              }}
            >
              {t.common.edit}
            </button>
          </div>
        </div>
      </main>

      <footer
        style={{
          padding: "24px",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        <button
          onClick={() => navigate("/about")}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: 14,
            textDecoration: "underline",
          }}
        >
          {t.dashboard.aboutThisProject}
        </button>
      </footer>

      <ModeSelectorModal
        isOpen={showModeSelector}
        onClose={() => setShowModeSelector(false)}
        onSelect={setMode}
        currentMode={mode}
      />
    </div>
  );
}