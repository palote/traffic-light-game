// src/components/Stage2/TeamDeviceView.tsx
// CON MEJORAS VISUALES + SONIDOS 🎨🔊
// ✅ NUEVO: Pantalla de autoevaluación con QR

import { useEffect, useMemo, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase.config";
import type { Game, Team, Question, RatingColor } from "../../types/game";
import {
  setRespondingHelpRequested,
  setRespondingResponseGiven,
  submitRating,
  setRaterJustification,
  getCurrentJustifyingTeamId,
} from "../../services/stage2Repository";
import { useSound } from "../../hooks/useSound";
import { useI18n } from "../../i18n";

interface TeamDeviceViewProps {
  gameId: string;
  teamId: string;
}

// 🎨 Colores por fase
const PHASE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  hint: { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9" },
  designated: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
  question_revealed: { bg: "#eef2ff", border: "#6366f1", text: "#4338ca" },
  responding: { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
  responding_with_help: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
  rating: { bg: "#f0fdf4", border: "#22c55e", text: "#15803d" },
  rating_reveal: { bg: "#ecfeff", border: "#06b6d4", text: "#0e7490" },
  justification: { bg: "#fffbeb", border: "#f59e0b", text: "#b45309" },
  validation_response: { bg: "#fdf2f8", border: "#ec4899", text: "#be185d" },
  validation_ratings: { bg: "#faf5ff", border: "#a855f7", text: "#7e22ce" },
  results: { bg: "#fefce8", border: "#eab308", text: "#a16207" },
};

// 🎨 Estilos (sin cambios, mantengo los originales)
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px 24px",
    color: "white",
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  teamName: {
    fontSize: 28,
    fontWeight: 800,
    margin: "8px 0 4px 0",
  },
  statRow: {
    display: "flex",
    gap: 16,
    marginTop: 8,
    fontSize: 14,
    opacity: 0.95,
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  roleBadge: (isResponding: boolean) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 700,
    marginTop: 12,
    backgroundColor: isResponding ? "rgba(249, 115, 22, 0.9)" : "rgba(34, 197, 94, 0.9)",
  }),
  content: {
    padding: 20,
  },
  phaseCard: (phase: string) => {
    const colors = PHASE_COLORS[phase] || { bg: "#f8fafc", border: "#94a3b8", text: "#475569" };
    return {
      backgroundColor: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    };
  },
  phaseBadge: (phase: string) => {
    const colors = PHASE_COLORS[phase] || { bg: "#f8fafc", border: "#94a3b8", text: "#475569" };
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 16px",
      backgroundColor: colors.border,
      color: "white",
      borderRadius: 24,
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 16,
    };
  },
  questionBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1e293b",
    lineHeight: 1.5,
    margin: 0,
  },
  hintText: {
    fontSize: 22,
    fontWeight: 700,
    color: "#7c3aed",
    lineHeight: 1.4,
    margin: 0,
    textAlign: "center" as const,
  },
  infoBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    textAlign: "center" as const,
  },
  ratingBtn: (color: string, selected: boolean) => ({
    width: "100%",
    padding: 20,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 700,
    backgroundColor: color,
    color: "white",
    border: selected ? "4px solid #1e293b" : "none",
    borderRadius: 16,
    cursor: "pointer",
    boxShadow: `0 4px 16px ${color}50`,
    transform: selected ? "scale(1.02)" : "scale(1)",
    transition: "all 0.2s",
  }),
  primaryBtn: (color: string) => ({
    width: "100%",
    padding: 18,
    fontSize: 18,
    fontWeight: 700,
    backgroundColor: color,
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: `0 4px 16px ${color}40`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  }),
  secondaryBtn: (color: string) => ({
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 600,
    backgroundColor: color,
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    flex: 1,
  }),
  successCard: {
    backgroundColor: "#22c55e",
    color: "white",
    borderRadius: 16,
    padding: 24,
    textAlign: "center" as const,
  },
  waitingCard: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 24,
    textAlign: "center" as const,
  },
  timerDisplay: (urgent: boolean) => ({
    fontSize: 48,
    fontWeight: 800,
    color: urgent ? "#dc2626" : "#1e293b",
    textAlign: "center" as const,
  }),
  resultsCard: {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    color: "white",
    borderRadius: 16,
    padding: 24,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  pointsDisplay: {
    fontSize: 64,
    fontWeight: 800,
    margin: "8px 0",
  },
  turnIndicator: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    borderRadius: 12,
    padding: 16,
    textAlign: "center" as const,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: 700,
    animation: "pulse 1.5s infinite",
  },
};

export function TeamDeviceView({ gameId, teamId }: TeamDeviceViewProps) {
  const { language } = useI18n();
  const [game, setGame] = useState<Game | null>(null);
  const [localJustification, setLocalJustification] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [hasRated, setHasRated] = useState(false);
  const [isMyTurnToJustify, setIsMyTurnToJustify] = useState(false);

  const tickIntervalRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

  const { play } = useSound();

  // ✅ NUEVO: Textos para autoevaluación
  const selfEvalTexts = {
    es: {
      title: "📝 Autoevaluación",
      subtitle: "Reflexioná sobre tu aprendizaje",
      scanQR: "Escaneá el código QR con tu celular",
      orVisit: "O visitá este link:",
      instructions: "Cada integrante del equipo debe completar su propia autoevaluación",
    },
    en: {
      title: "📝 Self-Evaluation",
      subtitle: "Reflect on your learning",
      scanQR: "Scan the QR code with your phone",
      orVisit: "Or visit this link:",
      instructions: "Each team member should complete their own self-evaluation",
    },
    pt: {
      title: "📝 Autoavaliação",
      subtitle: "Reflita sobre seu aprendizado",
      scanQR: "Escaneie o código QR com seu celular",
      orVisit: "Ou visite este link:",
      instructions: "Cada integrante da equipe deve completar sua própria autoavaliação",
    },
  };

  const selfEvalT = selfEvalTexts[language] || selfEvalTexts.es;

  useEffect(() => {
    const gameRef = ref(database, `games/${gameId}`);
    const unsub = onValue(gameRef, (snap) => {
      setGame(snap.val() ?? null);
    });
    return () => unsub();
  }, [gameId]);

  const team = useMemo(() => {
    const raw: any = (game as any)?.teams;
    if (!raw) return null;
    if (raw[teamId]) return raw[teamId] as Team;

    const teamsArray: Team[] = Array.isArray(raw)
      ? (raw as any)
      : typeof raw === "object"
        ? (Object.values(raw) as any)
        : [];

    return (teamsArray.find((t: any) => t?.id === teamId) as any) ?? null;
  }, [game, teamId]);

  const round = useMemo(() => {
    if (!game?.stage2) return null;
    return game.stage2.rounds?.[game.stage2.currentRound] ?? null;
  }, [game]);

  const phase = round?.phase ?? null;
  const responding = round?.respondingTeam ?? null;
  const myRating: any = round?.ratingTeams?.[teamId] ?? null;
  const isRespondingTeam = responding?.teamId === teamId;
  const isRaterTeam = !!round?.ratingTeams?.[teamId];
  const myRaterData = isRaterTeam ? round?.ratingTeams?.[teamId] ?? null : null;

  // ✅ NUEVO: Detectar si autoevaluación está activa
  const selfEvaluationActive = (game as any)?.selfEvaluationActive === true;

  // ✅ NUEVO: Generar URL de autoevaluación
  const selfEvalUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/autoevaluacion/${gameId}/${teamId}`;
  }, [gameId, teamId]);

  // ✅ NUEVO: Generar QR como data URL (usando API externa)
  const qrCodeUrl = useMemo(() => {
    if (!selfEvalUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selfEvalUrl)}`;
  }, [selfEvalUrl]);

  const currentQuestion = useMemo(() => {
    if (!game || !round) return null;
    const raw: any = (game as any).questions;
    const questionsArray: Question[] = Array.isArray(raw)
      ? (raw as any)
      : raw && typeof raw === "object"
        ? (Object.values(raw) as any)
        : [];

    const found = questionsArray.find((q: any) => q?.id === round.questionId);

    if (!found && raw && typeof raw === "object") {
      const byKey = raw[round.questionId];
      return byKey ? ({ id: round.questionId, ...byKey } as any) : null;
    }
    return (found as any) ?? null;
  }, [game, round]);

  // Sincroniza justificación desde RTDB
  useEffect(() => {
    if (myRaterData?.justification != null) {
      setLocalJustification(myRaterData.justification);
    }
  }, [myRaterData?.justification]);

  // Sincroniza estado de calificación desde RTDB
  useEffect(() => {
    if (myRaterData?.rating != null) {
      setHasRated(true);
    } else {
      setHasRated(false);
    }
  }, [myRaterData?.rating]);

  // Detectar turno de justificar
  useEffect(() => {
    if (phase !== "justification") {
      setIsMyTurnToJustify(false);
      return;
    }

    const checkTurn = async () => {
      try {
        const currentTeamId = await getCurrentJustifyingTeamId(gameId);
        const isMyTurn = currentTeamId === teamId;

        if (isMyTurn && !isMyTurnToJustify) {
          play("transition");
        }

        setIsMyTurnToJustify(isMyTurn);
      } catch (e) {
        console.error("Error checking justification turn:", e);
        setIsMyTurnToJustify(false);
      }
    };

    checkTurn();
  }, [gameId, teamId, phase, round?.currentJustificationIndex, play, isMyTurnToJustify]);

  // Sonido al cambiar de fase
  useEffect(() => {
    if (phase && prevPhaseRef.current && phase !== prevPhaseRef.current) {
      if (phase === "rating") {
        play("transition");
      } else if (phase === "rating_reveal") {
        play("reveal");
      } else if (phase === "results") {
        play("roundComplete");
      } else if (phase === "responding" && isRespondingTeam) {
        play("transition");
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, play, isRespondingTeam]);

  // Timer de ayuda
  const needsRespondingCountdown = useMemo(() => {
    return phase === "responding_with_help" && isRespondingTeam && !!responding?.helpStartedAt;
  }, [phase, isRespondingTeam, responding?.helpStartedAt]);

  useEffect(() => {
    if (tickIntervalRef.current) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    if (!needsRespondingCountdown) return;

    tickIntervalRef.current = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      if (tickIntervalRef.current) {
        window.clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [needsRespondingCountdown]);

  const respondingHelpRemaining = useMemo(() => {
    if (phase !== "responding_with_help") return null;
    if (!isRespondingTeam) return null;
    if (!responding?.helpStartedAt) return null;

    const elapsedMs = now - responding.helpStartedAt;
    const totalMs = (responding.helpDuration ?? 60) * 1000;
    const left = Math.max(0, totalMs - elapsedMs);
    return Math.ceil(left / 1000);
  }, [phase, isRespondingTeam, responding?.helpStartedAt, responding?.helpDuration, now]);

  // Timer warning
  useEffect(() => {
    if (respondingHelpRemaining !== null && respondingHelpRemaining <= 10 && respondingHelpRemaining > 0) {
      play("timerWarning");
    }
  }, [respondingHelpRemaining, play]);

  // Handlers con sonido
  const handleSubmitRating = async (color: RatingColor) => {
    try {
      play("rating");
      await submitRating(gameId, teamId, color);
      setHasRated(true);
      play("correct");
    } catch (e) {
      console.error(e);
      play("incorrect");
      alert("Error enviando calificación.");
    }
  };

  const handleRequestHelp = async () => {
    try {
      play("help");
      await setRespondingHelpRequested(gameId, true);
    } catch (e) {
      console.error(e);
      play("incorrect");
      alert("Error pidiendo ayuda.");
    }
  };

  const handleResponseGiven = async () => {
    try {
      play("click");
      await setRespondingResponseGiven(gameId, true);
      play("correct");
    } catch (e) {
      console.error(e);
      play("incorrect");
      alert("Error marcando respuesta dada.");
    }
  };

  const handleSaveJustification = async () => {
    try {
      play("click");
      await setRaterJustification(gameId, teamId, localJustification);
      play("correct");
      alert("✅ Justificación guardada");
    } catch (e) {
      console.error(e);
      play("incorrect");
      alert("Error guardando justificación.");
    }
  };

  // ✅ NUEVO: Si la autoevaluación está activa, mostrar pantalla de QR
  if (selfEvaluationActive) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 32,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>{selfEvalT.title}</h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>{selfEvalT.subtitle}</p>
          </div>

          {/* Nombre del equipo */}
          <div
            style={{
              backgroundColor: "#f1f5f9",
              borderRadius: 12,
              padding: 12,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b" }}>Equipo</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{team?.name || teamId}</div>
          </div>

          {/* QR Code */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              border: "2px solid #e2e8f0",
            }}
          >
            <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#64748b" }}>{selfEvalT.scanQR}</p>
            <img
              src={qrCodeUrl}
              alt="QR Code"
              style={{
                width: 180,
                height: 180,
                borderRadius: 8,
              }}
            />
          </div>

          {/* Link alternativo */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#64748b" }}>{selfEvalT.orVisit}</p>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 8,
                padding: 10,
                border: "1px solid #e2e8f0",
                wordBreak: "break-all",
                fontSize: 12,
                color: "#3b82f6",
                fontFamily: "monospace",
              }}
            >
              {selfEvalUrl}
            </div>
          </div>

          {/* Instrucciones */}
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{selfEvalT.instructions}</p>
        </div>

        {/* Puntaje final del equipo */}
        <div
          style={{
            marginTop: 24,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.9)" }}>Puntaje final</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "white" }}>{team?.totalScore ?? 0} pts</div>
        </div>
      </div>
    );
  }

  // Returns tempranos (sin cambios)
  if (!game) {
    return (
      <div style={{ ...styles.container, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: "#64748b" }}>Cargando...</div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ ...styles.container, padding: 24 }}>
        <div style={{ ...styles.phaseCard("hint"), textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 18 }}>
            No se encontró el equipo <strong>{teamId}</strong>
          </div>
        </div>
      </div>
    );
  }

  if (!game.stage2 || !round) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>ETAPA 2</div>
          <div style={styles.teamName}>{team.name}</div>
        </div>
        <div style={styles.content}>
          <div style={styles.waitingCard}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Esperando al docente...</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>Stage 2 todavía no fue iniciado</div>
          </div>
        </div>
      </div>
    );
  }

  const phaseLabels: Record<string, string> = {
    hint: "💡 PISTA",
    designated: "👥 REPRESENTANTES",
    question_revealed: "📝 PREGUNTA",
    responding: "🎤 RESPONDIENDO",
    responding_with_help: "🤝 AYUDA",
    rating: "🎨 CALIFICACIÓN",
    rating_reveal: "📊 RESULTADOS",
    justification: "📝 JUSTIFICACIÓN",
    validation_response: "⚖️ VALIDACIÓN",
    validation_ratings: "⚖️ VALIDACIÓN",
    results: "🏁 RESULTADOS",
  };

  return (
    <div style={styles.container}>
      {/* 🎨 HEADER MEJORADO */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>ETAPA 2 • Ronda {game.stage2.currentRound + 1}</div>
        <div style={styles.teamName}>{team.name}</div>

        <div style={styles.statRow}>
          <div style={styles.statItem}>
            <span>🏆</span>
            <span>
              <strong>{team.totalScore ?? 0}</strong> pts
            </span>
          </div>
          <div style={styles.statItem}>
            <span>📍</span>
            <span>{phaseLabels[phase ?? ""] || phase}</span>
          </div>
        </div>

        <div style={styles.roleBadge(isRespondingTeam)}>
          {isRespondingTeam ? "🎤 TU EQUIPO RESPONDE" : isRaterTeam ? "✍️ TU EQUIPO CALIFICA" : "👀 OBSERVANDO"}
        </div>
      </div>

      <div style={styles.content}>
        {/* ========== HINT ========== */}
        {phase === "hint" && (
          <div style={styles.phaseCard("hint")}>
            <div style={styles.phaseBadge("hint")}>💡 PISTA</div>

            <div style={{ ...styles.questionBox, backgroundColor: "#f5f3ff" }}>
              <p style={styles.hintText}>{currentQuestion?.hint ?? "—"}</p>
            </div>

            <div style={styles.infoBox}>
              <p style={{ margin: 0, fontSize: 15, color: "#64748b" }}>💬 Discutan en equipo la estrategia</p>
              <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#94a3b8" }}>
                ⏳ Esperando que el docente designe representantes
              </p>
            </div>
          </div>
        )}

        {/* ========== DESIGNATED ========== */}
        {phase === "designated" && (
          <div style={styles.phaseCard("designated")}>
            <div style={styles.phaseBadge("designated")}>👥 REPRESENTANTES</div>

            {isRespondingTeam && responding && (
              <div style={{ ...styles.successCard, backgroundColor: "#f97316" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎤</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Tu representante:</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{responding.playerName}</div>
                <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>Pasá al frente debajo de tu equipo</div>
              </div>
            )}

            {isRaterTeam && myRaterData && (
              <div style={{ ...styles.successCard, backgroundColor: "#22c55e" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>✍️</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Tu representante:</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{myRaterData.playerName}</div>
                <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>Pasá al frente para calificar</div>
              </div>
            )}

            {!isRespondingTeam && !isRaterTeam && (
              <div style={styles.waitingCard}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>👀</div>
                <div style={{ fontSize: 16 }}>Tu equipo observa esta ronda</div>
              </div>
            )}
          </div>
        )}

        {/* ========== QUESTION REVEALED ========== */}
        {phase === "question_revealed" && (
          <div style={styles.phaseCard("question_revealed")}>
            <div style={styles.phaseBadge("question_revealed")}>📝 PREGUNTA REVELADA</div>

            <div style={styles.questionBox}>
              <div style={styles.questionLabel}>Pregunta</div>
              <p style={styles.questionText}>{currentQuestion?.text ?? "—"}</p>
            </div>

            <div style={styles.waitingCard}>
              <p style={{ margin: 0, fontSize: 15 }}>
                {isRespondingTeam
                  ? "⏳ Esperando que el docente inicie la fase de respuesta"
                  : "👂 Escuchá atentamente la respuesta"}
              </p>
            </div>
          </div>
        )}

        {/* ========== RESPONDING ========== */}
        {phase === "responding" && (
          <div style={styles.phaseCard("responding")}>
            <div style={styles.phaseBadge("responding")}>🎤 RESPONDIENDO</div>

            <div style={styles.questionBox}>
              <div style={styles.questionLabel}>Pregunta</div>
              <p style={styles.questionText}>{currentQuestion?.text ?? "—"}</p>
            </div>

            {isRespondingTeam ? (
              <>
                <div
                  style={{
                    backgroundColor: "#fff7ed",
                    border: "2px solid #f97316",
                    borderRadius: 12,
                    padding: 20,
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#c2410c" }}>🎤 ¡ES TU TURNO!</div>
                  <div style={{ fontSize: 15, color: "#78716c", marginTop: 8 }}>Respondé oralmente al frente</div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={handleRequestHelp} style={styles.secondaryBtn("#f59e0b")}>
                    🆘 PEDIR AYUDA
                  </button>
                  <button onClick={handleResponseGiven} style={styles.secondaryBtn("#22c55e")}>
                    ✅ YA RESPONDÍ
                  </button>
                </div>
              </>
            ) : (
              <div style={styles.waitingCard}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👂</div>
                <div style={{ fontSize: 16 }}>Escuchando respuesta...</div>
              </div>
            )}
          </div>
        )}

        {/* ========== RESPONDING WITH HELP ========== */}
        {phase === "responding_with_help" && (
          <div style={styles.phaseCard("responding_with_help")}>
            <div style={styles.phaseBadge("responding_with_help")}>🤝 AYUDA ACTIVADA</div>

            {isRespondingTeam ? (
              <>
                <div
                  style={{
                    backgroundColor: "#fef3c7",
                    borderRadius: 16,
                    padding: 24,
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 14, color: "#92400e", marginBottom: 8 }}>Tiempo restante</div>
                  <div style={styles.timerDisplay((respondingHelpRemaining ?? 0) <= 10)}>
                    {respondingHelpRemaining ?? "—"}s
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <p style={{ margin: 0, fontSize: 15 }}>💬 Discutí con tu equipo y preparate para responder</p>
                </div>
              </>
            ) : (
              <div style={styles.waitingCard}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 16 }}>El equipo que responde pidió ayuda...</div>
              </div>
            )}
          </div>
        )}

        {/* ========== RATING ========== */}
        {phase === "rating" && (
          <div style={styles.phaseCard("rating")}>
            <div style={styles.phaseBadge("rating")}>🎨 CALIFICÁ LA RESPUESTA</div>

            {isRaterTeam ? (
              !hasRated ? (
                <>
                  <div style={styles.questionBox}>
                    <div style={styles.questionLabel}>Pregunta</div>
                    <p style={{ ...styles.questionText, fontSize: 16 }}>{currentQuestion?.text ?? "—"}</p>
                  </div>

                  <div style={{ marginBottom: 8, fontSize: 14, color: "#64748b", textAlign: "center" }}>
                    ¿Cómo fue la respuesta?
                  </div>

                  <button onClick={() => handleSubmitRating("green")} style={styles.ratingBtn("#22c55e", false)}>
                    <div>🟩 VERDE</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>Correcta y completa</div>
                  </button>

                  <button onClick={() => handleSubmitRating("yellow")} style={styles.ratingBtn("#eab308", false)}>
                    <div>🟨 AMARILLO</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>Correcta pero incompleta</div>
                  </button>

                  <button onClick={() => handleSubmitRating("red")} style={styles.ratingBtn("#ef4444", false)}>
                    <div>🟥 ROJO</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>Incorrecta</div>
                  </button>
                </>
              ) : (
                <div style={styles.successCard}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>¡Calificación enviada!</div>
                  <div style={{ fontSize: 14, marginTop: 12, opacity: 0.9 }}>
                    Esperá a que el docente finalice la fase
                  </div>
                </div>
              )
            ) : (
              <div style={styles.waitingCard}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👀</div>
                <div style={{ fontSize: 16 }}>
                  {isRespondingTeam
                    ? "Tu equipo respondió, esperá las calificaciones"
                    : "Observando fase de calificación"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== RATING REVEAL ========== */}
        {phase === "rating_reveal" && (
          <div style={styles.phaseCard("rating_reveal")}>
            <div style={styles.phaseBadge("rating_reveal")}>📊 CALIFICACIONES REVELADAS</div>

            {isRaterTeam && myRaterData ? (
              <div
                style={{
                  backgroundColor:
                    myRaterData.rating === "green" ? "#22c55e" : myRaterData.rating === "yellow" ? "#eab308" : "#ef4444",
                  color: "white",
                  borderRadius: 16,
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 14, opacity: 0.9 }}>Tu calificación</div>
                <div style={{ fontSize: 72, margin: "16px 0" }}>
                  {myRaterData.rating === "green" ? "🟩" : myRaterData.rating === "yellow" ? "🟨" : "🟥"}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {myRaterData.rating === "green" ? "VERDE" : myRaterData.rating === "yellow" ? "AMARILLO" : "ROJO"}
                </div>
              </div>
            ) : (
              <div style={styles.waitingCard}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <div>Mirá la pantalla principal</div>
              </div>
            )}
          </div>
        )}

        {/* ========== JUSTIFICATION ========== */}
        {phase === "justification" && (
          <div style={styles.phaseCard("justification")}>
            <div style={styles.phaseBadge("justification")}>📝 JUSTIFICACIÓN</div>

            {isRaterTeam && myRaterData && (myRaterData.rating === "yellow" || myRaterData.rating === "red") ? (
              <>
                {isMyTurnToJustify && <div style={styles.turnIndicator}>🎤 ¡ES TU TURNO DE JUSTIFICAR!</div>}

                <div
                  style={{
                    backgroundColor: myRaterData.rating === "yellow" ? "#fef3c7" : "#fee2e2",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 14, color: "#64748b" }}>Calificaste</div>
                  <div style={{ fontSize: 32, margin: "8px 0" }}>{myRaterData.rating === "yellow" ? "🟨" : "🟥"}</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>
                    {myRaterData.rating === "yellow"
                      ? "Explicá qué le falta o qué puede mejorarse"
                      : "Explicá cuál es el error"}
                  </div>
                </div>

                <textarea
                  value={localJustification}
                  onChange={(e) => setLocalJustification(e.target.value)}
                  placeholder="Escribí tu justificación (opcional)"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: 14,
                    fontSize: 16,
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    marginBottom: 12,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />

                <button onClick={handleSaveJustification} style={styles.primaryBtn("#3b82f6")}>
                  💾 GUARDAR JUSTIFICACIÓN
                </button>

                <div
                  style={{
                    ...styles.waitingCard,
                    marginTop: 16,
                    backgroundColor: isMyTurnToJustify ? "#dbeafe" : "#f1f5f9",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 14 }}>
                    {isMyTurnToJustify
                      ? "💬 Justificá oralmente al frente AHORA"
                      : "⏳ Esperá tu turno para justificar"}
                  </p>
                </div>
              </>
            ) : isRaterTeam && myRaterData?.rating === "green" ? (
              <div style={styles.successCard}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🟩</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Calificaste VERDE</div>
                <div style={{ fontSize: 14, marginTop: 8, opacity: 0.9 }}>No necesitás justificar</div>
              </div>
            ) : (
              <div style={styles.waitingCard}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👀</div>
                <div>Observando justificaciones</div>
              </div>
            )}
          </div>
        )}

        {/* ========== VALIDATION ========== */}
        {(phase === "validation_response" || phase === "validation_ratings" || phase === "validation") && (
          <div style={styles.phaseCard(phase)}>
            <div style={styles.phaseBadge(phase)}>⚖️ VALIDACIÓN EN CURSO</div>

            <div style={styles.waitingCard}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {phase === "validation_response"
                  ? "El profesor valida la respuesta"
                  : "El profesor valida las calificaciones"}
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>Esperá los resultados...</div>
            </div>

            {myRating && phase === "validation_ratings" && (
              <div
                style={{
                  ...styles.questionBox,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 14, color: "#64748b" }}>Tu calificación</div>
                <div style={{ fontSize: 48, margin: "8px 0" }}>
                  {myRating.rating === "green" ? "🟩" : myRating.rating === "yellow" ? "🟨" : "🟥"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== RESULTS ========== */}
        {phase === "results" && (
          <div style={styles.phaseCard("results")}>
            <div style={styles.phaseBadge("results")}>🏁 RESULTADOS</div>

            <div style={styles.resultsCard}>
              <div style={{ fontSize: 16, opacity: 0.9 }}>Tu equipo ganó</div>
              <div style={styles.pointsDisplay}>+{round.pointsAwarded?.[teamId] ?? 0}</div>
              <div style={{ fontSize: 18 }}>puntos</div>
            </div>

            <div
              style={{
                ...styles.questionBox,
                textAlign: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 14, color: "#64748b" }}>Puntaje total del equipo</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#1e293b", marginTop: 8 }}>
                {team.totalScore ?? 0} pts
              </div>
            </div>

            <div
              style={{
                ...styles.infoBox,
                backgroundColor: "#fef3c7",
                border: "1px solid #fcd34d",
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: "#92400e" }}>
                📊 Mirá la pantalla principal para ver el ranking completo
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CSS para animación */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}