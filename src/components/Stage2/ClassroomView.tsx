// src/components/Stage2/ClassroomViewFinal.tsx
// Stage 2 ClassroomView con MÚSICA + MEJORAS VISUALES 🎵🎨 + INTERNACIONALIZACIÓN COMPLETA 🌐

import { useEffect, useMemo, useState, useRef } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase.config";
import { Stage2ProgressPanel } from "./Stage2ProgressPanel";
import {
  getRoundRanking,
  getRoundSummary,
} from "../../services/stage2ResultsHelpers";
import { FinalPodium } from "./FinalPodium";
import { useAuth } from "../../hooks/useAuth";
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
import { ReconnectBadge } from "../ReconnectBadge";
import { useI18n } from "../../i18n";

interface ClassroomViewProps {
  gameId: string;
}

// 🎨 Estilos mejorados (sin cambios)
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

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(isCountdownMusicEnabled());
  const { logout, authRequired, user } = useAuth();
  const prevPhaseRef = useRef<string | null>(null);
  const musicStartedForPhaseRef = useRef<string | null>(null);

  const { play } = useSound();
  const { language } = useI18n();

  // ✅ Textos traducidos
  const texts = {
    // Generales
    loading: language === 'es' ? "Cargando juego..." : language === 'pt' ? "Carregando jogo..." : "Loading game...",
    stage2NotStarted: language === 'es' ? "Stage 2 todavía no fue iniciado" : language === 'pt' ? "Stage 2 ainda não foi iniciado" : "Stage 2 has not been started yet",
    startStage2: language === 'es' ? "▶️ INICIAR STAGE 2" : language === 'pt' ? "▶️ INICIAR STAGE 2" : "▶️ START STAGE 2",
    roundNotFound: language === 'es' ? "No se encontró la ronda actual." : language === 'pt' ? "Rodada atual não encontrada." : "Current round not found.",
    recreateRound: language === 'es' ? "🔁 RECREAR RONDA" : language === 'pt' ? "🔁 RECRIAR RODADA" : "🔁 RECREATE ROUND",
    headerTitle: language === 'es' ? "🎯 ETAPA 2 - Vista del Aula" : language === 'pt' ? "🎯 ETAPA 2 - Visão da Sala de Aula" : "🎯 STAGE 2 - Classroom View",
    headerSubtitle: (current: number, total: number, phase: string) =>
      language === 'es' ? `Ronda ${current} de ${total} • Fase: ${phase}`
        : language === 'pt' ? `Rodada ${current} de ${total} • Fase: ${phase}`
        : `Round ${current} of ${total} • Phase: ${phase}`,

    // Controles de audio
    soundEffects: language === 'es' ? "Efectos" : language === 'pt' ? "Efeitos" : "Effects",
    musicOn: language === 'es' ? "Música ON" : language === 'pt' ? "Música ON" : "Music ON",
    musicOff: language === 'es' ? "Música OFF" : language === 'pt' ? "Música OFF" : "Music OFF",
    panel: language === 'es' ? "Panel" : language === 'pt' ? "Painel" : "Panel",
    logout: language === 'es' ? "Cerrar sesión" : language === 'pt' ? "Sair" : "Logout",

    // Fase HINT
    hintBadge: language === 'es' ? "💡 PISTA" : language === 'pt' ? "💡 DICA" : "💡 HINT",
    hintInstruction: language === 'es' ? 
      "📚 Los alumnos pueden repasar el tema basándose en la pista.\nPresioná <strong>\"Designar Representantes\"</strong> cuando estén listos."
      : language === 'pt' ?
      "📚 Os alunos podem revisar o tema com base na dica.\nPressione <strong>\"Designar Representantes\"</strong> quando estiverem prontos."
      : "📚 Students can review the topic based on the hint.\nPress <strong>\"Designate Representatives\"</strong> when ready.",
    designateBtn: language === 'es' ? "🎲 DESIGNAR REPRESENTANTES" : language === 'pt' ? "🎲 DESIGNAR REPRESENTANTES" : "🎲 DESIGNATE REPRESENTATIVES",

    // Fase DESIGNATED
    designatedBadge: language === 'es' ? "👥 REPRESENTANTES DESIGNADOS" : language === 'pt' ? "👥 REPRESENTANTES DESIGNADOS" : "👥 REPRESENTATIVES DESIGNATED",
    designatedInstruction: language === 'es' ?
      "Los representantes deben pasar al frente. La pregunta se revelará cuando lo indiques."
      : language === 'pt' ?
      "Os representantes devem ir à frente. A pergunta será revelada quando você indicar."
      : "Representatives must come forward. The question will be revealed when you indicate.",
    revealBtn: language === 'es' ? "👁️ REVELAR PREGUNTA" : language === 'pt' ? "👁️ REVELAR PERGUNTA" : "👁️ REVEAL QUESTION",

    // Fase QUESTION REVEALED (no necesita botón, se autoavanza)

    // Fase RESPONDING
    respondingBadge: language === 'es' ? "🎤 RESPONDIENDO" : language === 'pt' ? "🎤 RESPONDENDO" : "🎤 RESPONDING",
    helpControlTitle: language === 'es' ? "🤝 Control de Ayuda" : language === 'pt' ? "🤝 Controle de Ajuda" : "🤝 Help Control",
    startHelpBtn: language === 'es' ? "▶️ INICIAR" : language === 'pt' ? "▶️ INICIAR" : "▶️ START",
    pauseHelpBtn: language === 'es' ? "⏸️ PAUSAR" : language === 'pt' ? "⏸️ PAUSAR" : "⏸️ PAUSE",
    endHelpBtn: language === 'es' ? "⏹️ TERMINAR" : language === 'pt' ? "⏹️ TERMINAR" : "⏹️ END",
    responseCompleteBtn: language === 'es' ? "✅ RESPUESTA COMPLETA → CALIFICACIÓN" : language === 'pt' ? "✅ RESPOSTA COMPLETA → AVALIAÇÃO" : "✅ ANSWER COMPLETE → RATING",

    // Fase RATING
    ratingBadge: language === 'es' ? "🎨 CALIFICACIÓN EN CURSO" : language === 'pt' ? "🎨 AVALIAÇÃO EM CURSO" : "🎨 RATING IN PROGRESS",
    progressLabel: (rated: number, total: number) =>
      language === 'es' ? `📊 Progreso: ${rated} de ${total}`
        : language === 'pt' ? `📊 Progresso: ${rated} de ${total}`
        : `📊 Progress: ${rated} of ${total}`,
    activateTimerBtn: language === 'es' ? "⏱️ ACTIVAR TIMER" : language === 'pt' ? "⏱️ ATIVAR TIMER" : "⏱️ ACTIVATE TIMER",
    pauseTimerBtn: language === 'es' ? "⏸️ PAUSAR" : language === 'pt' ? "⏸️ PAUSAR" : "⏸️ PAUSE",
    stopTimerBtn: language === 'es' ? "⏹️ DETENER" : language === 'pt' ? "⏹️ PARAR" : "⏹️ STOP",
    finalizeRevealBtn: language === 'es' ? "✅ FINALIZAR Y REVELAR" : language === 'pt' ? "✅ FINALIZAR E REVELAR" : "✅ FINALIZE AND REVEAL",

    // Fase RATING REVEAL
    ratingRevealBadge: language === 'es' ? "📊 CALIFICACIONES REVELADAS" : language === 'pt' ? "📊 AVALIAÇÕES REVELADAS" : "📊 RATINGS REVEALED",
    goToJustificationsBtn: language === 'es' ? "➡️ IR A JUSTIFICACIONES" : language === 'pt' ? "➡️ IR PARA JUSTIFICATIVAS" : "➡️ GO TO JUSTIFICATIONS",

    // Fase JUSTIFICATION
    justificationBadge: language === 'es' ? "📝 JUSTIFICACIONES" : language === 'pt' ? "📝 JUSTIFICATIVAS" : "📝 JUSTIFICATIONS",
    turnInfo: (current: number, total: number) =>
      language === 'es' ? `Turno ${current} de ${total}`
        : language === 'pt' ? `Vez ${current} de ${total}`
        : `Turn ${current} of ${total}`,
    nextBtn: language === 'es' ? "➡️ SIGUIENTE" : language === 'pt' ? "➡️ PRÓXIMO" : "➡️ NEXT",
    finishJustificationsBtn: language === 'es' ? "✅ TERMINAR JUSTIFICACIONES" : language === 'pt' ? "✅ FINALIZAR JUSTIFICATIVAS" : "✅ FINISH JUSTIFICATIONS",

    // Fase VALIDATION RESPONSE
    validationResponseBadge: language === 'es' ? "⚖️ VALIDAR RESPUESTA" : language === 'pt' ? "⚖️ VALIDAR RESPOSTA" : "⚖️ VALIDATE ANSWER",
    correctQuestion: language === 'es' ? "¿La respuesta fue correcta?" : language === 'pt' ? "A resposta estava correta?" : "Was the answer correct?",
    responseInfo: (teamName: string, help: boolean) =>
      language === 'es' ? `Equipo: ${teamName} • Ayuda: ${help ? "Sí (9 pts)" : "No (12 pts)"}`
        : language === 'pt' ? `Equipe: ${teamName} • Ajuda: ${help ? "Sim (9 pts)" : "Não (12 pts)"}`
        : `Team: ${teamName} • Help: ${help ? "Yes (9 pts)" : "No (12 pts)"}`,
    correctBtn: language === 'es' ? "✅ CORRECTA" : language === 'pt' ? "✅ CORRETA" : "✅ CORRECT",
    incorrectBtn: language === 'es' ? "❌ INCORRECTA" : language === 'pt' ? "❌ INCORRETA" : "❌ INCORRECT",

    // Fase VALIDATION RATINGS
    validationRatingsBadge: language === 'es' ? "⚖️ VALIDAR CALIFICACIONES" : language === 'pt' ? "⚖️ VALIDAR AVALIAÇÕES" : "⚖️ VALIDATE RATINGS",
    redWarning: language === 'es' ? "⚠️ Hay calificación(es) ROJA(s)" : language === 'pt' ? "⚠️ Há avaliação(ões) VERMELHA(S)" : "⚠️ There is RED rating(s)",
    redNote: language === 'es' ? "Rojo aceptado = 12 pts por detectar error" : language === 'pt' ? "Vermelho aceito = 12 pts por detectar erro" : "Red accepted = 12 pts for detecting error",
    ratingLabels: {
      green: language === 'es' ? "Verde" : language === 'pt' ? "Verde" : "Green",
      yellow: language === 'es' ? "Amarillo" : language === 'pt' ? "Amarelo" : "Yellow",
      red: language === 'es' ? "Rojo" : language === 'pt' ? "Vermelho" : "Red",
      unrated: language === 'es' ? "Sin calificar" : language === 'pt' ? "Sem avaliar" : "Unrated",
    },
    notRatedMsg: language === 'es' ? "No calificó → 0 pts" : language === 'pt' ? "Não avaliou → 0 pts" : "Did not rate → 0 pts",
    acceptBtn: (pts: string) => language === 'es' ? `✅ Aceptar (${pts} pts)` : language === 'pt' ? `✅ Aceitar (${pts} pts)` : `✅ Accept (${pts} pts)`,
    rejectBtn: language === 'es' ? "❌ Rechazar" : language === 'pt' ? "❌ Rejeitar" : "❌ Reject",
    acceptedMsg: (pts: string) => language === 'es' ? `✅ Aceptado (${pts} pts)` : language === 'pt' ? `✅ Aceito (${pts} pts)` : `✅ Accepted (${pts} pts)`,
    rejectedMsg: language === 'es' ? "❌ Rechazado" : language === 'pt' ? "❌ Rejeitado" : "❌ Rejected",
    confirmPointsBtn: language === 'es' ? "💰 CONFIRMAR PUNTOS Y VER RESULTADOS" : language === 'pt' ? "💰 CONFIRMAR PONTOS E VER RESULTADOS" : "💰 CONFIRM POINTS AND SEE RESULTS",

    // Fase RESULTS
    winnersTitle: (winnersCount: number) =>
      language === 'es' ? (winnersCount > 1 ? "GANADORES" : "GANADOR")
        : language === 'pt' ? (winnersCount > 1 ? "GANHADORES" : "GANHADOR")
        : (winnersCount > 1 ? "WINNERS" : "WINNER"),
    roundPointsTitle: language === 'es' ? "📊 Puntos de la Ronda" : language === 'pt' ? "📊 Pontos da Rodada" : "📊 Round Points",
    nextRoundBtn: (next: number, total: number) =>
      language === 'es' ? `➡️ SIGUIENTE RONDA (${next} de ${total})`
        : language === 'pt' ? `➡️ PRÓXIMA RODADA (${next} de ${total})`
        : `➡️ NEXT ROUND (${next} of ${total})`,
    finishGameBtn: language === 'es' ? "🏆 FINALIZAR JUEGO" : language === 'pt' ? "🏆 FINALIZAR JOGO" : "🏆 FINISH GAME",

    // Representantes info
    representativesTitle: language === 'es' ? "👥 Representantes" : language === 'pt' ? "👥 Representantes" : "👥 Representatives",
    responderLabel: language === 'es' ? "🎤 Responde:" : language === 'pt' ? "🎤 Responde:" : "🎤 Responder:",
    ratersLabel: language === 'es' ? "🎨 Califican:" : language === 'pt' ? "🎨 Avaliam:" : "🎨 Rate:",

    // Botón de debug
    backToHintDebug: language === 'es' ? "🧪 Volver a Hint (debug)" : language === 'pt' ? "🧪 Voltar para Hint (debug)" : "🧪 Back to Hint (debug)",
  };

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

    const musicPhases = ["hint", "rating"];

    if (safePhase !== prevPhaseRef.current) {
      if (isCountdownMusicPlaying()) {
        stopCountdownMusic();
      }

      if (musicPhases.includes(safePhase) && musicStartedForPhaseRef.current !== safePhase) {
        const duration = safePhase === "hint" ? 60 : 120;
        let remaining = duration;

        startCountdownMusic(duration, () => remaining);
        musicStartedForPhaseRef.current = safePhase;

        const interval = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0 || !musicPhases.includes(safePhase)) {
            clearInterval(interval);
          }
        }, 1000);
      }

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
    if (safePhase !== "rating" || !game?.stage2) {
      setRatingProgress(null);
      return;
    }

    const roundIndex = game.stage2.currentRound ?? 0;
    const ratingTeamsRef = ref(database, `games/${gameId}/stage2/rounds/${roundIndex}/ratingTeams`);

    const unsub = onValue(ratingTeamsRef, (snapshot) => {
      const ratingTeams = snapshot.val() || {};
      const total = Object.keys(ratingTeams).length;
      const rated = Object.values(ratingTeams).filter((r: any) => !!r?.rating).length;
      setRatingProgress({ rated, total });
    });

    return () => unsub();
  }, [gameId, safePhase, game?.stage2?.currentRound]);

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

  if (!game) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 20, color: "#64748b" }}>{texts.loading}</div>
        </div>
      </div>
    );
  }

  if (!game.stage2) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🎯 ETAPA 2</h1>
          <p style={styles.headerSubtitle}>{texts.stage2NotStarted}</p>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>
          <button
            style={styles.primaryBtn("#22c55e")}
            onClick={() => startStage2Round(gameId)}
          >
            {texts.startStage2}
          </button>
        </div>
      </div>
    );
  }

  if ((game.status?.status as string) === "game_complete" || (game.stage2 as any)?.phase === "game_complete") {
    const teams = Object.values(game.teams || {}) as Team[];
    return <FinalPodium teams={teams} gameId={gameId} />;
  }

  if (!round) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>🎯 ETAPA 2</h1>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p>{texts.roundNotFound}</p>
          <button onClick={() => startStage2Round(gameId)}>{texts.recreateRound}</button>
        </div>
      </div>
    );
  }

  const roundRanking = getRoundRanking(round, teamsSorted);
  const roundSummary = getRoundSummary(round);
  const respondingHelpRunning = !!(responding as any)?.helpStartedAt;

  const allQuestions = Object.values(game.questions || {}) as any[];
  const stage2Questions = allQuestions.filter(q => q.suggestedStage === 2);
  const currentRoundNum = game.stage2?.currentRound ?? 0;
  const hasMoreRounds = (currentRoundNum + 1) < stage2Questions.length;

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={styles.headerTitle}>{texts.headerTitle}</h1>
            <p style={styles.headerSubtitle}>
              {texts.headerSubtitle(currentRoundNum + 1, stage2Questions.length, safePhase ?? "")}
            </p>
          </div>

          <div style={styles.audioControls}>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={styles.audioBtn(soundEnabled, "#22c55e")}
            >
              {soundEnabled ? "🔊" : "🔇"} {texts.soundEffects}
            </button>
            <button
              onClick={handleToggleMusic}
              style={styles.audioBtn(musicEnabled, "#a855f7")}
            >
              🎵 {musicEnabled ? texts.musicOn : texts.musicOff}
            </button>
            <button
              onClick={() => setShowProgressPanel(!showProgressPanel)}
              style={styles.audioBtn(showProgressPanel, "#3b82f6")}
            >
              📊 {texts.panel}
            </button>
            {authRequired && user && (
              <button
                onClick={async () => {
                  try {
                    await logout();
                  } catch (e) {
                    console.error("❌ Logout failed:", e);
                    alert("No se pudo cerrar sesión.");
                  }
                }}
                style={styles.audioBtn(false, "#ef4444")}
                title={texts.logout}
              >
                🚪 {texts.logout}
              </button>
            )}
          </div>
        </div>
      </div>

      {showProgressPanel && <Stage2ProgressPanel game={game} round={round} />}

      {/* ========== FASE: HINT ========== */}
      {safePhase === "hint" && (
        <div style={styles.phaseCard(phaseColor)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={styles.cardTitle}>
              <span style={styles.phaseBadge(phaseColor)}>{texts.hintBadge}</span>
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
            <p style={{ margin: 0, fontSize: 15, color: "#1e40af" }} dangerouslySetInnerHTML={{ __html: texts.hintInstruction }} />
          </div>

          <button
            style={styles.primaryBtn("#3b82f6")}
            onClick={() => {
              play("transition");
              stopCountdownMusic();
              designateRepresentatives(gameId);
            }}
          >
            {texts.designateBtn}
          </button>
        </div>
      )}

      {/* ========== FASE: DESIGNATED ========== */}
      {safePhase === "designated" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>{texts.designatedBadge}</span>
          </h2>

          <div style={{ padding: 20, backgroundColor: "#f8fafc", borderRadius: 12, marginBottom: 20 }}>
            <p style={{ fontSize: 18, margin: 0, color: "#475569" }}>
              {texts.designatedInstruction}
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
            {texts.revealBtn}
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
            <span style={styles.phaseBadge(phaseColor)}>{texts.respondingBadge}</span>
          </h2>

          <div style={styles.questionBox}>
            <p style={styles.questionText}>{currentQuestion?.text ?? "—"}</p>
          </div>

          {responding && (
            <div style={{
              padding: 20,
              backgroundColor: "#fff7ed",
              border: "2px solid #fb923c",
              borderRadius: 12,
              marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                {texts.helpControlTitle}
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
                  {texts.startHelpBtn}
                </button>
                <button
                  onClick={handlePauseHelp}
                  disabled={!respondingHelpRunning}
                  style={{ ...styles.secondaryBtn, backgroundColor: "#f59e0b" }}
                >
                  {texts.pauseHelpBtn}
                </button>
                <button
                  onClick={handleEndHelp}
                  style={{ ...styles.secondaryBtn, backgroundColor: "#ef4444" }}
                >
                  {texts.endHelpBtn}
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
            {texts.responseCompleteBtn}
          </button>
        </div>
      )}

      {/* ========== FASE: RATING ========== */}
      {safePhase === "rating" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>{texts.ratingBadge}</span>
          </h2>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {texts.progressLabel(ratingProgress?.rated ?? 0, ratingProgress?.total ?? 0)}
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
                {texts.activateTimerBtn}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { teacherPauseRatingTimer(gameId); pauseCountdownMusic(); }}
                  style={styles.secondaryBtn}
                >
                  {texts.pauseTimerBtn}
                </button>
                <button
                  onClick={() => { teacherStopRatingTimer(gameId); stopCountdownMusic(); }}
                  style={{ ...styles.secondaryBtn, backgroundColor: "#ef4444" }}
                >
                  {texts.stopTimerBtn}
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
              {texts.finalizeRevealBtn}
            </button>
          </div>
        </div>
      )}

      {/* ========== FASE: RATING REVEAL ========== */}
      {safePhase === "rating_reveal" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>{texts.ratingRevealBadge}</span>
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
            {texts.goToJustificationsBtn}
          </button>
        </div>
      )}

      {/* ========== FASE: JUSTIFICATION ========== */}
      {safePhase === "justification" && currentJustifyingTeamId && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>{texts.justificationBadge}</span>
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
                    {texts.turnInfo(currentIndex + 1, order.length)}
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
                  {currentIndex < order.length - 1 ? texts.nextBtn : texts.finishJustificationsBtn}
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
            <span style={styles.phaseBadge(phaseColor)}>{texts.validationResponseBadge}</span>
          </h2>

          <div style={{
            padding: 24,
            backgroundColor: "#fef3c7",
            borderRadius: 12,
            marginBottom: 24,
            textAlign: "center",
          }}>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px 0" }}>
              {texts.correctQuestion}
            </p>
            <p style={{ fontSize: 14, color: "#78716c", margin: 0 }}>
              {texts.responseInfo(
                teamsSorted.find((t) => t.id === responding?.teamId)?.name ?? "",
                !!responding?.helpStartedAt
              )}
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
              {texts.correctBtn}
            </button>
            <button
              onClick={() => {
                play("incorrect");
                validateResponse(gameId, false);
              }}
              style={{ ...styles.primaryBtn("#ef4444"), flex: 1, maxWidth: 200, justifyContent: "center" }}
            >
              {texts.incorrectBtn}
            </button>
          </div>
        </div>
      )}

      {/* ========== FASE: VALIDATION RATINGS ========== */}
      {safePhase === "validation_ratings" && (
        <div style={styles.phaseCard(phaseColor)}>
          <h2 style={styles.cardTitle}>
            <span style={styles.phaseBadge(phaseColor)}>{texts.validationRatingsBadge}</span>
          </h2>

          {Object.values(round.ratingTeams || {}).some((rt: any) => rt.rating === "red") && (
            <div style={{
              padding: 16,
              backgroundColor: "#fef3c7",
              border: "2px solid #f59e0b",
              borderRadius: 12,
              marginBottom: 20,
            }}>
              <div style={{ fontWeight: 700, color: "#b45309" }}>
                {texts.redWarning}
              </div>
              <div style={{ fontSize: 14, color: "#92400e", marginTop: 8 }}>
                {texts.redNote}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(round.ratingTeams || {})
              .sort(([, a], [, b]) => {
                const order: Record<string, number> = { red: 0, yellow: 1, green: 2 };
                const aRating = (a as any).rating;
                const bRating = (b as any).rating;
                if (!aRating) return 1;
                if (!bRating) return -1;
                return (order[aRating] ?? 3) - (order[bRating] ?? 3);
              })
              .map(([teamId, rater]: [string, any]) => {
                const rating = rater.rating;
                const hasRated = !!rating;

                const colorMap: Record<string, string> = {
                  green: "#22c55e",
                  yellow: "#eab308",
                  red: "#ef4444"
                };
                const color = hasRated ? (colorMap[rating] ?? "#94a3b8") : "#e2e8f0";

                const isValidated = rater.validated !== null && rater.validated !== undefined;

                const pts = rating === "red" ? "12" : rating === "yellow" ? "10" : rating === "green" ? "5" : "0";

                const ratingEmoji = rating === "green" ? "🟩" :
                  rating === "yellow" ? "🟨" :
                    rating === "red" ? "🟥" : "⬜";

                const ratingText = rating === "green" ? texts.ratingLabels.green :
                  rating === "yellow" ? texts.ratingLabels.yellow :
                    rating === "red" ? texts.ratingLabels.red : texts.ratingLabels.unrated;

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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>{ratingText}</span>
                        <div style={styles.colorDot(color)}>
                          {ratingEmoji}
                        </div>
                      </div>
                    </div>

                    {!hasRated ? (
                      <div style={{
                        marginTop: 16,
                        padding: 12,
                        backgroundColor: "#f1f5f9",
                        borderRadius: 8,
                        textAlign: "center",
                        color: "#64748b",
                        fontWeight: 600,
                      }}>
                        ⬜ {texts.notRatedMsg}
                      </div>
                    ) : !isValidated ? (
                      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                        <button
                          onClick={() => { play("correct"); validateRating(gameId, teamId, true); }}
                          style={{ ...styles.primaryBtn("#22c55e"), flex: 1, padding: "12px", fontSize: 14, justifyContent: "center" }}
                        >
                          {texts.acceptBtn(pts)}
                        </button>
                        <button
                          onClick={() => { play("incorrect"); validateRating(gameId, teamId, false); }}
                          style={{ ...styles.primaryBtn("#ef4444"), flex: 1, padding: "12px", fontSize: 14, justifyContent: "center" }}
                        >
                          {texts.rejectBtn}
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
                        {rater.validated ? texts.acceptedMsg(pts) : texts.rejectedMsg}
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
              {texts.confirmPointsBtn}
            </button>
          )}
        </div>
      )}

      {/* ========== FASE: RESULTS ========== */}
      {safePhase === "results" && (
        <div style={styles.phaseCard(phaseColor)}>
          {(() => {
            const maxPoints = Math.max(...roundRanking.map(r => r.roundPoints), 0);
            const winners = roundRanking.filter(r => r.roundPoints === maxPoints);

            return (
              <div style={styles.winnerCard}>
                <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: 20, opacity: 0.9 }}>
                  {texts.winnersTitle(winners.length)}
                </div>
                {winners.map(w => (
                  <div key={w.teamId} style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
                    {w.teamName} 👑
                  </div>
                ))}
              </div>
            );
          })()}

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>{texts.roundPointsTitle}</h3>
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

          {hasMoreRounds ? (
            <button
              onClick={async () => {
                play("transition");
                const nextRound = currentRoundNum + 1;

                await update(ref(database), {
                  [`games/${gameId}/stage2/currentRound`]: nextRound,
                  [`games/${gameId}/updatedAt`]: Date.now(),
                });

                await startStage2Round(gameId);
              }}
              style={{ ...styles.primaryBtn("#3b82f6"), width: "100%", justifyContent: "center" }}
            >
              {texts.nextRoundBtn(currentRoundNum + 2, stage2Questions.length)}
            </button>
          ) : (
            <button
              onClick={async () => {
                play("roundComplete");
                await update(ref(database), {
                  [`games/${gameId}/status/status`]: "game_complete",
                  [`games/${gameId}/stage2/completed`]: true,
                  [`games/${gameId}/stage2/completedAt`]: Date.now(),
                  [`games/${gameId}/updatedAt`]: Date.now(),
                });
              }}
              style={{ ...styles.primaryBtn("#22c55e"), width: "100%", justifyContent: "center" }}
            >
              {texts.finishGameBtn}
            </button>
          )}
        </div>
      )}

      {/* Representantes info */}
      {responding && !["results", "hint"].includes(safePhase ?? "") && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>{texts.representativesTitle}</h3>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>{texts.responderLabel}</strong> {responding.playerName} ({teamsSorted.find((t) => t.id === responding.teamId)?.name})
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            <strong>{texts.ratersLabel}</strong> {Object.values(round.ratingTeams || {}).map((rt: any) => rt.teamName).join(", ")}
          </p>
        </div>
      )}

      {/* Botón de emergencia */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button
          onClick={() => setStage2Phase(gameId, "hint")}
          style={{ ...styles.secondaryBtn, fontSize: 12 }}
        >
          {texts.backToHintDebug}
        </button>
      </div>

      <ReconnectBadge gameId={gameId} roomCode={game?.roomCode} />
    </div>
  );
}