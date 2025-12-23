// src/components/Stage2/ClassroomViewFinal.tsx
// Stage 2 ClassroomView con MÚSICA + MEJORAS VISUALES 🎵🎨

import { useEffect, useMemo, useState, useRef } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase.config";
import { Stage2ProgressPanel } from "./Stage2ProgressPanel";
import {
  getRoundRanking,
  getRoundSummary,
} from "../../services/stage2ResultsHelpers";
import type { Game, Team, Question } from "../../types/game";
import {
  startStage2Round,
  designateRepresentatives,
  setStage2Phase,
  setRespondingResponseGiven,
  teacherStartRespondingHelp,
  teacherPauseRespondingHelp,
  teacherEndRespondingHelp,
  startRatingPhase,
  getRatingProgress,
  finalizeRatings,
  teacherStartRatingTimer,
  teacherPauseRatingTimer,
  teacherStopRatingTimer,
  startJustificationPhase,
  advanceJustification,
  getCurrentJustifyingTeamId,
  validateRating,
  validateResponse,
  isValidationComplete,
  calculateAndAwardPoints,
} from "../../services/stage2Repository";

import { useSound } from "../../hooks/useSound";
import { 
  startCountdownMusic, 
  stopCountdownMusic,
  pauseCountdownMusic,
  resumeCountdownMusic,
  isCountdownMusicEnabled,
  toggleCountdownMusic,
  isCountdownMusicPlaying
} from "../../hooks/useCountdownMusic";

interface ClassroomViewProps {
  gameId: string;
}

// 🎨 Estilos mejorados
const styles = {
  container: {
    padding: 24,
    maxWidth: 1200,
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: 16,
    padding: "24px 32px",
    marginBottom: 24,
    color: "white",
    boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
  },
  headerTitle: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.5px",
  },
  headerSubtitle: {
    margin: "8px 0 0 0",
    fontSize: 16,
    opacity: 0.9,
  },
  audioControls: {
    display: "flex",
    gap: 8,
    marginTop: 16,
  },
  audioBtn: (active: boolean, color: string) => ({
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: active ? color : "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.2s",
  }),
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  cardTitle: {
    margin: "0 0 16px 0",
    fontSize: 22,
    fontWeight: 700,
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  phaseCard: (color: string) => ({
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    boxShadow: `0 4px 20px ${color}30`,
    border: `2px solid ${color}`,
  }),
  phaseBadge: (color: string) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    backgroundColor: color,
    color: "white",
    borderRadius: 24,
    fontSize: 14,
    fontWeight: 700,
  }),
  questionBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 600,
    color: "#1e293b",
    lineHeight: 1.5,
    margin: 0,
  },
  hintText: {
    fontSize: 24,
    fontWeight: 700,
    color: "#7c3aed",
    lineHeight: 1.4,
    margin: 0,
  },
  primaryBtn: (color: string) => ({
    padding: "16px 32px",
    fontSize: 18,
    fontWeight: 700,
    backgroundColor: color,
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: `0 4px 16px ${color}40`,
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  }),
  secondaryBtn: {
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: "#64748b",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  ratingCard: (color: string, validated?: boolean) => ({
    padding: 20,
    borderRadius: 12,
    border: `2px solid ${color}`,
    backgroundColor: validated === true ? `${color}15` : validated === false ? "#fee2e2" : "white",
    marginBottom: 12,
    transition: "all 0.3s",
  }),
  colorDot: (color: string) => ({
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    boxShadow: `0 4px 12px ${color}50`,
  }),
  winnerCard: {
    background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    borderRadius: 16,
    padding: 32,
    textAlign: "center" as const,
    color: "white",
    boxShadow: "0 8px 32px rgba(245, 158, 11, 0.4)",
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: (percent: number, color: string) => ({
    height: "100%",
    width: `${percent}%`,
    backgroundColor: color,
    transition: "width 0.5s ease",
  }),
};

// Colores por fase
const PHASE_COLORS: Record<string, string> = {
  hint: "#8b5cf6",
  designated: "#3b82f6",
  question_revealed: "#6366f1",
  responding: "#f97316",
  rating: "#22c55e",
  rating_reveal: "#06b6d4",
  justification: "#f59e0b",
  validation_response: "#ec4899",
  validation_ratings: "#a855f7",
  results: "#eab308",
};

export function ClassroomView({ gameId }: ClassroomViewProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ratingProgress, setRatingProgress] = useState<{ rated: number; total: number } | null>(null);
  const [currentJustifyingTeamId, setCurrentJustifyingTeamId] = useState<string | null>(null);
  const [showProgressPanel, setShowProgressPanel] = useState(true);
  
  // 🎵 Estados de audio
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(isCountdownMusicEnabled());
  
  const prevPhaseRef = useRef<string | null>(null);
  const musicStartedForPhaseRef = useRef<string | null>(null);
  
  const { play } = useSound();

  // Suscripción al juego
  useEffect(() => {
    const gameRef = ref(database, `games/${gameId}`);
    const unsub = onValue(gameRef, (snap) => {
      setGame(snap.val() ?? null);
    });
    return () => unsub();
  }, [gameId]);

  const round = useMemo(() => {
    if (!game?.stage2) return null;
    return game.stage2.rounds?.[game.stage2.currentRound] ?? null;
  }, [game]);

  const teamsSorted = useMemo(() => {
    if (!game?.teams) return [];
    const teams = Object.values(game.teams as any) as Team[];
    return [...teams].sort((a, b) => (a.totalScore ?? 0) - (b.totalScore ?? 0));
  }, [game]);

  const currentQuestion = useMemo(() => {
    if (!game || !round) return null;
    const raw: any = (game as any).questions;
    const questionsArray: Question[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? Object.values(raw)
        : [];
    const found = questionsArray.find((q: any) => q?.id === round.questionId);
    if (!found && raw && typeof raw === "object") {
      const byKey = raw[round.questionId];
      return byKey ? ({ id: round.questionId, ...byKey } as any) : null;
    }
    return found ?? null;
  }, [game, round]);

  const safePhase = round?.phase ?? null;
  const responding = round?.respondingTeam ?? null;
  const phaseColor = PHASE_COLORS[safePhase ?? "hint"] ?? "#64748b";

  // 🎵 Música automática por fase
  useEffect(() => {
    if (!musicEnabled || !safePhase) return;
    
    // Solo iniciar música en fases específicas
    const musicPhases = ["hint", "rating"];
    
    if (safePhase !== prevPhaseRef.current) {
      // Cambió la fase
      
      // Parar música de fase anterior
      if (isCountdownMusicPlaying()) {
        stopCountdownMusic();
      }
      
      // Iniciar música si corresponde
      if (musicPhases.includes(safePhase) && musicStartedForPhaseRef.current !== safePhase) {
        const duration = safePhase === "hint" ? 60 : 120;
        let remaining = duration;
        
        startCountdownMusic(duration, () => remaining);
        musicStartedForPhaseRef.current = safePhase;
        
        // Auto-decrementar (simulado, el real viene del timer)
        const interval = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0 || !musicPhases.includes(safePhase)) {
            clearInterval(interval);
          }
        }, 1000);
      }
      
      // 🔊 Sonidos por cambio de fase
      if (safePhase === "results") {
        play("roundComplete");
      } else if (safePhase === "rating_reveal") {
        play("reveal");
      } else if (safePhase === "rating") {
        play("transition");
      }
    }
    
    prevPhaseRef.current = safePhase;
  }, [safePhase, musicEnabled, play]);

  // Limpiar música al desmontar
  useEffect(() => {
    return () => {
      stopCountdownMusic();
    };
  }, []);

  // Progreso de calificaciones
  useEffect(() => {
    if (safePhase !== "rating") {
      setRatingProgress(null);
      return;
    }
    const fetchProgress = async () => {
      try {
        const progress = await getRatingProgress(gameId);
        setRatingProgress(progress);
      } catch (e) {
        console.error("Error fetching rating progress:", e);
      }
    };
    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, [gameId, safePhase]);

  // Justificación actual
  useEffect(() => {
    if (safePhase !== "justification") {
      setCurrentJustifyingTeamId(null);
      return;
    }
    const fetchCurrentJustifying = async () => {
      try {
        const teamId = await getCurrentJustifyingTeamId(gameId);
        setCurrentJustifyingTeamId(teamId);
      } catch (e) {
        console.error("Error fetching current justifying team:", e);
      }
    };
    fetchCurrentJustifying();
  }, [gameId, safePhase, round?.currentJustificationIndex]);

  // Timer tick
  useEffect(() => {
    if (!round) return;
    if (safePhase !== "responding" && safePhase !== "rating") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [safePhase, round]);

  // Timer de ayuda
  const respondingHelpRemaining = useMemo(() => {
    if (!round || safePhase !== "responding") return null;
    const rt: any = round.respondingTeam;
    if (!rt?.helpStartedAt) return rt?.helpRemainingSec ?? null;
    const elapsed = Math.floor((now - rt.helpStartedAt) / 1000);
    return Math.max(0, (rt.helpRemainingSec ?? rt.helpDuration ?? 60) - elapsed);
  }, [round, safePhase, now]);

  // Timer de rating
  const ratingTimeRemaining = useMemo(() => {
    if (!round || safePhase !== "rating" || !round.ratingTimerActive || !round.ratingStartedAt) return null;
    const duration = (game as any)?.stage2Config?.ratingDuration ?? 120;
    const elapsed = Math.floor((now - round.ratingStartedAt) / 1000);
    return Math.max(0, duration - elapsed);
  }, [round, safePhase, now, game]);

  // 🎵 Handlers con música
  const handleStartHelp = async () => {
    play("click");
    await teacherStartRespondingHelp(gameId);
    
    if (musicEnabled) {
      const duration = (responding as any)?.helpDuration ?? 60;
      startCountdownMusic(duration, () => respondingHelpRemaining ?? 0);
    }
  };

  const handlePauseHelp = async () => {
    play("click");
    await teacherPauseRespondingHelp(gameId);
    pauseCountdownMusic();
  };

  const handleEndHelp = async () => {
    play("click");
    await teacherEndRespondingHelp(gameId);
    stopCountdownMusic();
  };

  const handleStartRatingTimer = async () => {
    play("click");
    await teacherStartRatingTimer(gameId);
    
    if (musicEnabled) {
      const duration = (game as any)?.stage2Config?.ratingDuration ?? 120;
      startCountdownMusic(duration, () => ratingTimeRemaining ?? 0);
    }
  };

  const handleToggleMusic = () => {
    const newState = toggleCountdownMusic();
    setMusicEnabled(newState);
    if (!newState) {
      stopCountdownMusic();
    }
  };

  // Returns tempranos
  if (!game) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 20, color: "#64748b" }}>Cargando juego...</div>
        </div>
      </div>
    );
  }

  if (!game.stage2) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🎯 ETAPA 2</h1>
          <p style={styles.headerSubtitle}>Stage 2 todavía no fue iniciado</p>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>
          <button 
            style={styles.primaryBtn("#22c55e")}
            onClick={() => startStage2Round(gameId)}
          >
            ▶️ INICIAR STAGE 2
          </button>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🎯 ETAPA 2</h1>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p>No se encontró la ronda actual.</p>
          <button onClick={() => startStage2Round(gameId)}>🔁 RECREAR RONDA</button>
        </div>
      </div>
    );
  }

  const roundRanking = getRoundRanking(round, teamsSorted);
  const roundSummary = getRoundSummary(round);
  const respondingHelpRunning = !!(responding as any)?.helpStartedAt;

  return (
    <div style={styles.container}>
      {/* 🎨 HEADER MEJORADO */}
      <div style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={styles.headerTitle}>🎯 ETAPA 2 - Vista del Aula</h1>
            <p style={styles.headerSubtitle}>
              Ronda {game.stage2.currentRound + 1} • Fase: {safePhase}
            </p>
          </div>
          
          {/* 🎵 Controles de audio */}
          <div style={styles.audioControls}>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={styles.audioBtn(soundEnabled, "#22c55e")}
            >
              {soundEnabled ? "🔊" : "🔇"} Efectos
            </button>
            <button
              onClick={handleToggleMusic}
              style={styles.audioBtn(musicEnabled, "#a855f7")}
            >
              🎵 Música {musicEnabled ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => setShowProgressPanel(!showProgressPanel)}
              style={styles.audioBtn(showProgressPanel, "#3b82f6")}
            >
              📊 Panel
            </button>
          </div>
        </div>
      </div>

      {/* Panel de progreso */}
      {showProgressPanel && <Stage2ProgressPanel game={game} round={round} />}

      {/* ========== FASE: HINT ========== */}
      {safePhase === "hint" && (
        <div style={styles.phaseCard(phaseColor)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={styles.cardTitle}>
              <span style={styles.phaseBadge(phaseColor)}>💡 PISTA</span>
            </h2>
          </div>
          
          <div style={{
            ...styles.questionBox,
            background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
            border: "2px solid #c4b5fd",
          }}>
            <p style={styles.hintText}>{currentQuestion?.hint ?? "⚠️ Pista no encontrada"}</p>
          </div>
          
          <div style={{
            padding: 16,
            backgroundColor: "#eff6ff",
            borderRadius: 12,
            marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 15, color: "#1e40af" }}>
              📚 Los alumnos pueden repasar el tema basándose en la pista.
              <br />
              Presioná <strong>"Designar Representantes"</strong> cuando estén listos.
            </p>
          </div>
          
          <button 
            style={styles.primaryBtn("#3b82f6")}
            onClick={() => {
              play("transition");
              stopCountdownMusic();
              designateRepresentatives(gameId);
            }}
          >
            🎲 DESIGNAR REPRESENTANTES
          </button>
        </div>
      )}

      {/* ========== FASE: DESIGNATED ========== */}
      {safePhase === "designated" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>👥 REPRESENTANTES DESIGNADOS</span>
          </h2>
          
          <div style={{ padding: 20, backgroundColor: "#f8fafc", borderRadius: 12, marginBottom: 20 }}>
            <p style={{ fontSize: 18, margin: 0, color: "#475569" }}>
              Los representantes deben pasar al frente. La pregunta se revelará cuando lo indiques.
            </p>
          </div>
          
          <button 
            style={styles.primaryBtn("#6366f1")}
            onClick={async () => {
              play("reveal");
              await setStage2Phase(gameId, "question_revealed");
              setTimeout(() => setStage2Phase(gameId, "responding"), 2000);
            }}
          >
            👁️ REVELAR PREGUNTA
          </button>
        </div>
      )}

      {/* ========== FASE: QUESTION REVEALED ========== */}
      {safePhase === "question_revealed" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>📝 PREGUNTA</span>
          </h2>
          <div style={styles.questionBox}>
            <p style={styles.questionText}>{currentQuestion?.text ?? "⚠️ Pregunta no encontrada"}</p>
          </div>
          <p style={{ color: "#64748b", fontStyle: "italic" }}>⏳ Avanzando a fase de respuesta...</p>
        </div>
      )}

      {/* ========== FASE: RESPONDING ========== */}
      {safePhase === "responding" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>🎤 RESPONDIENDO</span>
          </h2>
          
          <div style={styles.questionBox}>
            <p style={styles.questionText}>{currentQuestion?.text ?? "—"}</p>
          </div>

          {/* Panel de ayuda */}
          {responding && (
            <div style={{
              padding: 20,
              backgroundColor: "#fff7ed",
              border: "2px solid #fb923c",
              borderRadius: 12,
              marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                🤝 Control de Ayuda
              </div>
              
              {respondingHelpRemaining !== null && (
                <div style={{ 
                  fontSize: 32, 
                  fontWeight: 800, 
                  marginBottom: 16,
                  color: respondingHelpRemaining <= 10 ? "#dc2626" : "#1e293b",
                }}>
                  ⏱️ {respondingHelpRemaining}s
                </div>
              )}
              
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={handleStartHelp}
                  style={styles.primaryBtn("#22c55e")}
                >
                  ▶️ INICIAR
                </button>
                <button
                  onClick={handlePauseHelp}
                  disabled={!respondingHelpRunning}
                  style={{ ...styles.secondaryBtn, backgroundColor: "#f59e0b" }}
                >
                  ⏸️ PAUSAR
                </button>
                <button
                  onClick={handleEndHelp}
                  style={{ ...styles.secondaryBtn, backgroundColor: "#ef4444" }}
                >
                  ⏹️ TERMINAR
                </button>
              </div>
            </div>
          )}
          
          <button 
            style={styles.primaryBtn("#22c55e")}
            onClick={async () => {
              play("correct");
              stopCountdownMusic();
              await setRespondingResponseGiven(gameId, true);
              await startRatingPhase(gameId);
            }}
          >
            ✅ RESPUESTA COMPLETA → CALIFICACIÓN
          </button>
        </div>
      )}

      {/* ========== FASE: RATING ========== */}
      {safePhase === "rating" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>🎨 CALIFICACIÓN EN CURSO</span>
          </h2>
          
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                📊 Progreso: {ratingProgress?.rated ?? 0} de {ratingProgress?.total ?? 0}
              </span>
              {ratingTimeRemaining !== null && (
                <span style={{ 
                  fontSize: 24, 
                  fontWeight: 800,
                  color: ratingTimeRemaining <= 10 ? "#dc2626" : "#1e293b",
                }}>
                  ⏱️ {ratingTimeRemaining}s
                </span>
              )}
            </div>
            <div style={styles.progressBar}>
              <div style={styles.progressFill(
                ratingProgress ? (ratingProgress.rated / ratingProgress.total) * 100 : 0,
                "#22c55e"
              )} />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            {!round.ratingTimerActive ? (
              <button onClick={handleStartRatingTimer} style={styles.primaryBtn("#3b82f6")}>
                ⏱️ ACTIVAR TIMER
              </button>
            ) : (
              <>
                <button 
                  onClick={() => { teacherPauseRatingTimer(gameId); pauseCountdownMusic(); }}
                  style={styles.secondaryBtn}
                >
                  ⏸️ PAUSAR
                </button>
                <button 
                  onClick={() => { teacherStopRatingTimer(gameId); stopCountdownMusic(); }}
                  style={{ ...styles.secondaryBtn, backgroundColor: "#ef4444" }}
                >
                  ⏹️ DETENER
                </button>
              </>
            )}
            
            <button
              onClick={() => {
                play("reveal");
                stopCountdownMusic();
                finalizeRatings(gameId);
              }}
              style={styles.primaryBtn("#22c55e")}
            >
              ✅ FINALIZAR Y REVELAR
            </button>
          </div>
        </div>
      )}

      {/* ========== FASE: RATING REVEAL ========== */}
      {safePhase === "rating_reveal" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>📊 CALIFICACIONES REVELADAS</span>
          </h2>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", 
            gap: 16,
            marginBottom: 24,
          }}>
            {Object.entries(round.ratingTeams || {}).map(([teamId, rater]: [string, any]) => {
              const colorMap: Record<string, string> = {
                green: "#22c55e",
                yellow: "#eab308",
                red: "#ef4444",
              };
              const emojiMap: Record<string, string> = {
                green: "🟩",
                yellow: "🟨",
                red: "🟥",
              };
              
              return (
                <div
                  key={teamId}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    backgroundColor: `${colorMap[rater.rating] ?? "#94a3b8"}15`,
                    border: `2px solid ${colorMap[rater.rating] ?? "#94a3b8"}`,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{rater.teamName}</div>
                  <div style={{ fontSize: 48 }}>{emojiMap[rater.rating] ?? "⬜"}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{rater.playerName}</div>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => {
              play("transition");
              startJustificationPhase(gameId);
            }}
            style={styles.primaryBtn("#3b82f6")}
          >
            ➡️ IR A JUSTIFICACIONES
          </button>
        </div>
      )}

      {/* ========== FASE: JUSTIFICATION ========== */}
      {safePhase === "justification" && currentJustifyingTeamId && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>📝 JUSTIFICACIONES</span>
          </h2>
          
          {(() => {
            const currentRater = round.ratingTeams?.[currentJustifyingTeamId];
            const order = (round as any).justificationOrder || [];
            const currentIndex = (round as any).currentJustificationIndex ?? 0;
            
            if (!currentRater) return <div>⚠️ Error</div>;
            
            return (
              <div>
                <div style={{
                  padding: 24,
                  backgroundColor: "#fef3c7",
                  borderRadius: 12,
                  marginBottom: 20,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 14, color: "#92400e", marginBottom: 8 }}>
                    Turno {currentIndex + 1} de {order.length}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>
                    {currentRater.teamName}
                  </div>
                  <div style={{ fontSize: 16, color: "#78716c" }}>
                    {currentRater.playerName}
                  </div>
                  <div style={{ fontSize: 32, marginTop: 12 }}>
                    {currentRater.rating === "yellow" ? "🟨" : "🟥"}
                  </div>
                </div>
                
                {currentRater.justification && (
                  <div style={{
                    padding: 16,
                    backgroundColor: "#f8fafc",
                    borderRadius: 8,
                    marginBottom: 20,
                    fontStyle: "italic",
                  }}>
                    "{currentRater.justification}"
                  </div>
                )}
                
                <button
                  onClick={() => {
                    play("click");
                    advanceJustification(gameId);
                  }}
                  style={styles.primaryBtn("#f59e0b")}
                >
                  {currentIndex < order.length - 1 ? "➡️ SIGUIENTE" : "✅ TERMINAR JUSTIFICACIONES"}
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========== FASE: VALIDATION RESPONSE ========== */}
      {safePhase === "validation_response" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>⚖️ VALIDAR RESPUESTA</span>
          </h2>
          
          <div style={{
            padding: 24,
            backgroundColor: "#fef3c7",
            borderRadius: 12,
            marginBottom: 24,
            textAlign: "center",
          }}>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px 0" }}>
              ¿La respuesta fue correcta?
            </p>
            <p style={{ fontSize: 14, color: "#78716c", margin: 0 }}>
              Equipo: {teamsSorted.find((t) => t.id === responding?.teamId)?.name} • 
              Ayuda: {responding?.helpStartedAt ? "Sí (9 pts)" : "No (12 pts)"}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button
              onClick={() => {
                play("correct");
                validateResponse(gameId, true);
              }}
              style={{ ...styles.primaryBtn("#22c55e"), flex: 1, maxWidth: 200, justifyContent: "center" }}
            >
              ✅ CORRECTA
            </button>
            <button
              onClick={() => {
                play("incorrect");
                validateResponse(gameId, false);
              }}
              style={{ ...styles.primaryBtn("#ef4444"), flex: 1, maxWidth: 200, justifyContent: "center" }}
            >
              ❌ INCORRECTA
            </button>
          </div>
        </div>
      )}

      {/* ========== FASE: VALIDATION RATINGS ========== */}
      {safePhase === "validation_ratings" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>⚖️ VALIDAR CALIFICACIONES</span>
          </h2>
          
          {/* Warning si hay rojo */}
          {Object.values(round.ratingTeams || {}).some((rt: any) => rt.rating === "red") && (
            <div style={{
              padding: 16,
              backgroundColor: "#fef3c7",
              border: "2px solid #f59e0b",
              borderRadius: 12,
              marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, color: "#b45309" }}>
                ⚠️ Hay calificación(es) ROJA(s)
              </div>
              <div style={{ fontSize: 14, color: "#92400e", marginTop: 8 }}>
                Rojo aceptado = 12 pts por detectar error
              </div>
            </div>
          )}
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(round.ratingTeams || {})
              .sort(([, a], [, b]) => {
                const order: Record<string, number> = { red: 0, yellow: 1, green: 2 };
                return (order[(a as any).rating] ?? 3) - (order[(b as any).rating] ?? 3);
              })
              .map(([teamId, rater]: [string, any]) => {
                const colorMap: Record<string, string> = { green: "#22c55e", yellow: "#eab308", red: "#ef4444" };
                const color = colorMap[rater.rating] ?? "#94a3b8";
                const isValidated = rater.validated !== null && rater.validated !== undefined;
                const pts = rater.rating === "red" ? "12" : rater.rating === "yellow" ? "10" : "5";
                
                return (
                  <div key={teamId} style={styles.ratingCard(color, rater.validated)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{rater.teamName}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{rater.playerName}</div>
                        {rater.justification && (
                          <div style={{ fontSize: 13, fontStyle: "italic", marginTop: 8, color: "#475569" }}>
                            "{rater.justification}"
                          </div>
                        )}
                      </div>
                      <div style={styles.colorDot(color)}>
                        {rater.rating === "green" ? "🟩" : rater.rating === "yellow" ? "🟨" : "🟥"}
                      </div>
                    </div>
                    
                    {!isValidated ? (
                      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                        <button
                          onClick={() => { play("correct"); validateRating(gameId, teamId, true); }}
                          style={{ ...styles.primaryBtn("#22c55e"), flex: 1, padding: "12px", fontSize: 14, justifyContent: "center" }}
                        >
                          ✅ Aceptar ({pts} pts)
                        </button>
                        <button
                          onClick={() => { play("incorrect"); validateRating(gameId, teamId, false); }}
                          style={{ ...styles.primaryBtn("#ef4444"), flex: 1, padding: "12px", fontSize: 14, justifyContent: "center" }}
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        marginTop: 16,
                        padding: 12,
                        backgroundColor: rater.validated ? "#dcfce7" : "#fee2e2",
                        borderRadius: 8,
                        textAlign: "center",
                        fontWeight: 600,
                      }}>
                        {rater.validated ? `✅ Aceptado (${pts} pts)` : "❌ Rechazado"}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          
          {isValidationComplete(round) && (
            <button
              onClick={() => {
                play("points");
                calculateAndAwardPoints(gameId);
              }}
              style={{ ...styles.primaryBtn("#a855f7"), width: "100%", marginTop: 20, justifyContent: "center" }}
            >
              💰 CONFIRMAR PUNTOS Y VER RESULTADOS
            </button>
          )}
        </div>
      )}

      {/* ========== FASE: RESULTS ========== */}
      {safePhase === "results" && (
        <div style={styles.phaseCard(phaseColor)}>
          {/* Ganador */}
          {(() => {
            const maxPoints = Math.max(...roundRanking.map(r => r.roundPoints), 0);
            const winners = roundRanking.filter(r => r.roundPoints === maxPoints);
            
            return (
              <div style={styles.winnerCard}>
                <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: 20, opacity: 0.9 }}>
                  {winners.length > 1 ? "GANADORES" : "GANADOR"} DE LA RONDA
                </div>
                {winners.map(w => (
                  <div key={w.teamId} style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
                    {w.teamName} 👑
                  </div>
                ))}
              </div>
            );
          })()}
          
          {/* Puntos de la ronda */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📊 Puntos de la Ronda</h3>
            {roundRanking.map((r) => (
              <div
                key={r.teamId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 16,
                  backgroundColor: "#f8fafc",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 600 }}>{r.teamName}</span>
                <span style={{ 
                  fontWeight: 800, 
                  fontSize: 20,
                  color: r.roundPoints > 0 ? "#22c55e" : "#94a3b8" 
                }}>
                  +{r.roundPoints}
                </span>
              </div>
            ))}
          </div>
          
          {/* Siguiente ronda */}
          <button
            onClick={async () => {
              play("transition");
              const nextQIndex = (game.stage2?.currentQuestionIndex ?? 0) + 1;
              const nextRound = (game.stage2?.currentRound ?? 0) + 1;
              
              await update(ref(database), {
                [`games/${gameId}/stage2/currentQuestionIndex`]: nextQIndex,
                [`games/${gameId}/stage2/currentRound`]: nextRound,
                [`games/${gameId}/updatedAt`]: Date.now(),
              });
              
              await startStage2Round(gameId);
            }}
            style={{ ...styles.primaryBtn("#3b82f6"), width: "100%", justifyContent: "center" }}
          >
            ➡️ SIGUIENTE RONDA
          </button>
        </div>
      )}

      {/* Representantes info */}
      {responding && !["results", "hint"].includes(safePhase ?? "") && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>👥 Representantes</h3>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>🎤 Responde:</strong> {responding.playerName} ({teamsSorted.find((t) => t.id === responding.teamId)?.name})
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            <strong>🎨 Califican:</strong> {Object.values(round.ratingTeams || {}).map((rt: any) => rt.teamName).join(", ")}
          </p>
        </div>
      )}

      {/* Botón de emergencia */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button 
          onClick={() => setStage2Phase(gameId, "hint")}
          style={{ ...styles.secondaryBtn, fontSize: 12 }}
        >
          🧪 Volver a Hint (debug)
        </button>
      </div>
    </div>
  );
}