// src/components/Stage2/ClassroomViewImproved.tsx
// Versión corregida: "Ronda X de Y" calculado dinámicamente
// ✅ Actualizado con:
//   - Tarea 5: Leyenda de colores (🟩🟨🟥⬜)
//   - Tarea 6: Estado "Pendiente" por equipo
//   - Validación global con validateAllRatings (según Claude)

import { useEffect, useMemo, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase.config";
import { auth } from "../../firebase.config";
import { markGameAccess } from "../../services/metricsService";
import { Stage2ProgressPanel } from "./Stage2ProgressPanel";
import {
  getRoundRanking,
  getRoundWinner,
  getRoundSummary,
} from "../../services/stage2ResultsHelpers";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
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
  validateAllRatings, // ✅ Importado
} from "../../services/stage2Repository";
import {
  startCountdownMusic,
  stopCountdownMusic,
  pauseCountdownMusic,
} from "../../hooks/useCountdownMusic";
import { ReconnectBadge } from "../ReconnectBadge"; // ✅ AGREGADO

interface ClassroomViewProps {
  gameId: string;
}

export function ClassroomViewImproved({ gameId }: ClassroomViewProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ratingProgress, setRatingProgress] = useState<{ rated: number; total: number } | null>(null);
  const [currentJustifyingTeamId, setCurrentJustifyingTeamId] = useState<string | null>(null);
  const [showProgressPanel, setShowProgressPanel] = useState(true);
  const { logout, authRequired } = useAuth();
  const { language } = useI18n();
  const [helpConfirmed, setHelpConfirmed] = useState<boolean | null>(null);

  // --- INICIO: ColorLegend (Tarea 5) ---
  const ColorLegend = () => {
    const legendTexts = {
      green: language === 'es' ? 'Correcto' : language === 'pt' ? 'Correto' : 'Correct',
      yellow: language === 'es' ? 'Parcial' : language === 'pt' ? 'Parcial' : 'Partial',
      red: language === 'es' ? 'Incorrecto' : language === 'pt' ? 'Incorreto' : 'Incorrect',
      noRating: language === 'es' ? 'Sin calificar' : language === 'pt' ? 'Sem avaliar' : 'Not rated',
    };

    return (
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '10px 16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '10px',
        fontSize: '14px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        border: '1px solid #bae6fd'
      }}>
        <span>🟩 {legendTexts.green}</span>
        <span>🟨 {legendTexts.yellow}</span>
        <span>🟥 {legendTexts.red}</span>
        <span>⬜ {legendTexts.noRating}</span>
      </div>
    );
  };
  // --- FIN: ColorLegend ---

  // Textos ya existentes (mantenidos)
  const colorTexts = useMemo(() => ({
    green: language === 'es' ? 'Verde (correcto)' :
      language === 'pt' ? 'Verde (correto)' :
        'Green (correct)',
    yellow: language === 'es' ? 'Amarillo (parcial)' :
      language === 'pt' ? 'Amarelo (parcial)' :
        'Yellow (partial)',
    red: language === 'es' ? 'Rojo (incorrecto)' :
      language === 'pt' ? 'Vermelho (incorreto)' :
        'Red (incorrect)',
  }), [language]);

  // --- NUEVO: Texto de estado de calificación (Tarea 6) ---
  const ratingStatusText = useMemo(() => ({
    rated: language === 'es' ? 'Calificó' : language === 'pt' ? 'Avaliou' : 'Rated',
    pending: language === 'es' ? '⏳ Pendiente' : language === 'pt' ? '⏳ Pendente' : '⏳ Pending',
  }), [language]);

  // ✅ PASO 1: Calcular total de rondas dinámicamente
  const stage2Questions = useMemo(() => {
    if (!game?.questions) return [];
    const questions = Object.values(game.questions);
    return questions.filter((q: any) => q.suggestedStage === 2);
  }, [game?.questions]);

  const totalStage2Rounds = stage2Questions.length;
  const currentRoundNumber = (game?.stage2?.currentRound ?? 0) + 1;

  // 1) Suscripción al juego
  useEffect(() => {
    const gameRef = ref(database, `games/${gameId}`);
    const unsub = onValue(gameRef, (snap) => {
      setGame(snap.val() ?? null);
    });
    return () => unsub();
  }, [gameId]);

  // ✅ MÉTRICA: último acceso del docente
  useEffect(() => {
    const u = auth.currentUser;
    if (!u?.uid) return;
    markGameAccess(u.uid, gameId).catch((e) => {
      console.warn("⚠️ metrics markGameAccess failed:", e);
    });
  }, [gameId]);

  // 2) Round actual
  const round = useMemo(() => {
    if (!game?.stage2) return null;
    return game.stage2.rounds?.[game.stage2.currentRound] ?? null;
  }, [game]);

  // 3) Equipos ordenados
  const teamsSorted = useMemo(() => {
    if (!game?.teams) return [];
    const teams = Object.values(game.teams as any) as Team[];
    return [...teams].sort((a, b) => (a.totalScore ?? 0) - (b.totalScore ?? 0));
  }, [game]);

  // 4) Pregunta actual
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

  // ✅ ACTUALIZADO: Suscripción en tiempo real a ratingTeams
  useEffect(() => {
    if (safePhase !== "rating" || !round) {
      setRatingProgress(null);
      return;
    }

    const roundIndex = game.stage2?.currentRound ?? 0;
    const ratingTeamsRef = ref(database, `games/${gameId}/stage2/rounds/${roundIndex}/ratingTeams`);

    const unsub = onValue(ratingTeamsRef, (snapshot) => {
      const ratingTeams = snapshot.val() || {};
      const total = Object.keys(ratingTeams).length;
      const rated = Object.values(ratingTeams).filter((r: any) => !!r?.rating).length;
      setRatingProgress({ rated, total });
    });

    return () => unsub();
  }, [gameId, safePhase, game.stage2?.currentRound, round]);

  // Cargar equipo que justifica actualmente
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

  // Tick visual para timer de responding
  useEffect(() => {
    if (!round) return;
    if (safePhase !== "responding") return;
    const startedAt = (round.respondingTeam as any)?.helpStartedAt ?? null;
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [safePhase, (round as any)?.respondingTeam?.helpStartedAt]);

  // Segundos restantes para responding help
  const respondingHelpRemaining = useMemo(() => {
    if (!round) return null;
    if (safePhase !== "responding") return null;
    const rt: any = round.respondingTeam;
    if (!rt) return null;
    const duration = rt.helpDuration ?? 60;
    const baseRemaining = rt.helpRemainingSec ?? duration;
    if (!rt.helpStartedAt) return baseRemaining;
    const elapsed = Math.floor((now - rt.helpStartedAt) / 1000);
    return Math.max(0, baseRemaining - elapsed);
  }, [round, safePhase, now]);

  // Tick visual para timer de rating
  useEffect(() => {
    if (!round) return;
    if (safePhase !== "rating") return;
    if (!round.ratingTimerActive) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [safePhase, round?.ratingTimerActive]);

  // Segundos restantes para rating timer
  const ratingTimeRemaining = useMemo(() => {
    if (!round) return null;
    if (safePhase !== "rating") return null;
    if (!round.ratingTimerActive || !round.ratingStartedAt) return null;
    const config = (game as any)?.stage2Config ?? (game as any)?.config?.timers;
    const duration = config?.ratingDuration ?? 120;
    const elapsed = Math.floor((now - round.ratingStartedAt) / 1000);
    return Math.max(0, duration - elapsed);
  }, [round, safePhase, now, game]);

  // ✅ Inicializar override de ayuda
  useEffect(() => {
    if (responding && helpConfirmed === null) {
      setHelpConfirmed(!!responding.helpUsed);
    }
  }, [responding, helpConfirmed]);

  // Returns tempranos
  if (!game) {
    return <div style={{ padding: 40 }}>⏳ Cargando juego…</div>;
  }

  if (!game.stage2) {
    return (
      <div style={{ padding: 40 }}>
        <h1>🎯 ETAPA 2</h1>
        <p>Stage 2 todavía no fue iniciado.</p>
        <button
          onClick={() => startStage2Round(gameId)}
          style={{
            padding: "12px 24px",
            fontSize: 16,
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ▶️ INICIAR STAGE 2
        </button>
      </div>
    );
  }

  if (!round) {
    return (
      <div style={{ padding: 40 }}>
        <h1>🎯 ETAPA 2</h1>
        <p>No se encontró la ronda actual.</p>
        <button onClick={() => startStage2Round(gameId)}>🔁 RECREAR RONDA</button>
      </div>
    );
  }

  const roundRanking = getRoundRanking(round, teamsSorted);
  const roundSummary = getRoundSummary(round);

  const respondingHelpRequested = !!(responding as any)?.helpRequested;
  const respondingHelpRunning = !!(responding as any)?.helpStartedAt;
  const respondingHelpHasState =
    respondingHelpRequested ||
    respondingHelpRunning ||
    ((responding as any)?.helpRemainingSec != null);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* ✅ Mostrar leyenda en fases relevantes */}
      {(safePhase === 'rating' || safePhase === 'rating_reveal' || safePhase === 'validation_ratings') && <ColorLegend />}

      {/* Header - ✅ CORREGIDO CON RONDAS DINÁMICAS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>
            🎯 ETAPA 2
          </h1>

          <div style={{
            backgroundColor: "#e3f2fd",
            padding: "8px 20px",
            borderRadius: 24,
            fontSize: 18,
            fontWeight: 700,
            color: "#1976d2",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            Ronda {currentRoundNumber} de {totalStage2Rounds || '?'}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setShowProgressPanel(!showProgressPanel)}
            style={{
              padding: "8px 16px",
              backgroundColor: showProgressPanel ? "#1976d2" : "#e0e0e0",
              color: showProgressPanel ? "white" : "#333",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {showProgressPanel ? "📊 Ocultar Progreso" : "📊 Mostrar Progreso"}
          </button>

          {authRequired && (
            <button
              onClick={logout}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 800,
              }}
              title="Cerrar sesión del docente"
            >
              🚪 Salir
            </button>
          )}
        </div>
      </div>

      {/* 🆕 PANEL DE PROGRESO DE EQUIPOS */}
      {showProgressPanel && (
        <Stage2ProgressPanel game={game} round={round} />
      )}

      {/* PANEL PRIORITARIO: AYUDA DOCENTE */}
      {safePhase === "responding" && responding && respondingHelpHasState && (
        <div
          style={{
            padding: 20,
            border: "2px solid #fbbf24",
            borderRadius: 12,
            backgroundColor: "#fffbeb",
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", color: "#d97706" }}>
            🆘 Ayuda Docente Solicitada
          </h3>
          <p>
            El equipo <strong>{responding.teamName}</strong> solicitó ayuda.
          </p>
          {respondingHelpRunning ? (
            <p>
              ⏳ Tiempo restante: <strong>{respondingHelpRemaining} seg</strong>
            </p>
          ) : (
            <p>Esperando tu acción.</p>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            {!respondingHelpRunning && (
              <button
                onClick={() => teacherStartRespondingHelp(gameId)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                ▶️ Iniciar Ayuda
              </button>
            )}
            {respondingHelpRunning && (
              <>
                <button
                  onClick={() => teacherPauseRespondingHelp(gameId)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#f97316",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ⏸ Pausar
                </button>
                <button
                  onClick={() => teacherEndRespondingHelp(gameId)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ✅ Finalizar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* HINT / PREGUNTA */}
      <div
        style={{
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 8,
          marginBottom: 20,
          backgroundColor: "white",
        }}
      >
        {safePhase === "hint" ? (
          <>
            <h3 style={{ margin: "0 0 12px 0" }}>💡 Pista</h3>
            <p style={{ fontSize: 20, marginBottom: 16 }}>
              {currentQuestion?.hint ?? "⚠️ Pista no encontrada"}
            </p>
            <div
              style={{
                padding: 12,
                backgroundColor: "#e3f2fd",
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              📚 Los alumnos pueden repasar el tema basándose en la pista.
              <br />
              Presioná <strong>"Designar Representantes"</strong> cuando estén listos.
            </div>
          </>
        ) : safePhase === "designated" ? (
          <>
            <h3 style={{ margin: "0 0 12px 0" }}>👥 Representantes Designados</h3>
            <p style={{ fontSize: 16, opacity: 0.8 }}>
              Los representantes deben pasar al frente. La pregunta se revelará cuando lo
              indiques.
            </p>
          </>
        ) : (
          <>
            <h3 style={{ margin: "0 0 12px 0" }}>📝 Pregunta</h3>
            <p style={{ fontSize: 20 }}>
              {currentQuestion?.text ?? "⚠️ Pregunta no encontrada"}
            </p>
          </>
        )}
      </div>

      {/* PANEL: CALIFICACIÓN SIMULTÁNEA */}
      {safePhase === "rating" && (
        <div
          style={{
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 20,
            backgroundColor: "white",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>⭐ Calificación Simultánea</h3>
          {ratingProgress && (
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              Equipos que calificaron: <strong>{ratingProgress.rated} de {ratingProgress.total}</strong>
            </p>
          )}

          {/* ✅ NUEVO: Estado de calificación por equipo (Tarea 6) */}
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#1e293b' }}>
              {language === 'es' ? 'Estado de calificación por equipo' :
                language === 'pt' ? 'Estado de avaliação por equipe' :
                  'Team rating status'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teamsSorted.map(team => {
                const ratingEntry = round.ratingTeams?.[team.id];
                const hasRated = !!ratingEntry?.rating;
                const rating = ratingEntry?.rating;

                return (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                    <strong>{team.name}:</strong>
                    {hasRated ? (
                      <>
                        {rating === 'green' ? '🟩' : rating === 'yellow' ? '🟨' : '🟥'}
                        <span style={{ color: '#4b5563', fontSize: 14 }}>{ratingStatusText.rated}</span>
                      </>
                    ) : (
                      <>
                        <span>⬜</span>
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 14 }}>{ratingStatusText.pending}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => startRatingPhase(gameId)}
              disabled={round.phase !== "rating"}
              style={{
                padding: "10px 16px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                opacity: round.phase !== "rating" ? 0.5 : 1,
              }}
            >
              ▶️ Iniciar Calificación
            </button>
            {round.ratingTimerActive && (
              <>
                <button
                  onClick={() => teacherPauseRatingTimer(gameId)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#f97316",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ⏸ Pausar Temporizador
                </button>
                <button
                  onClick={() => teacherStopRatingTimer(gameId)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ✅ Finalizar Calificación
                </button>
              </>
            )}
            {!round.ratingTimerActive && round.ratingStartedAt && (
              <button
                onClick={() => finalizeRatings(gameId)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                ✅ Revelar Calificaciones
              </button>
            )}
          </div>
        </div>
      )}

      {/* PANEL: REVELACIÓN DE CALIFICACIONES */}
      {safePhase === "rating_reveal" && (
        <div
          style={{
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 20,
            backgroundColor: "white",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>👁️‍🗨️ Calificaciones Reveladas</h3>
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#1e293b' }}>
              {language === 'es' ? 'Calificaciones por equipo' :
                language === 'pt' ? 'Avaliações por equipe' :
                  'Team ratings'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teamsSorted.map(team => {
                const ratingEntry = round.ratingTeams?.[team.id];
                const rating = ratingEntry?.rating;
                const hasRated = !!rating;

                return (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                    <strong>{team.name}:</strong>
                    {hasRated ? (
                      <>
                        {rating === 'green' ? '🟩' : rating === 'yellow' ? '🟨' : '🟥'}
                        <span style={{ color: '#4b5563', fontSize: 14 }}>{ratingStatusText.rated}</span>
                      </>
                    ) : (
                      <>
                        <span>⬜</span>
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 14 }}>{ratingStatusText.pending}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => startJustificationPhase(gameId)}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              backgroundColor: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ➡️ Iniciar Justificación
          </button>
        </div>
      )}

      {/* PANEL: VALIDACIÓN DE RESPUESTA CON OVERRIDE DE AYUDA */}
      {safePhase === "validation_response" && (
        <div
          style={{
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 20,
            backgroundColor: "white",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>✅ Validación de Respuesta</h3>
          <p>¿La respuesta del equipo es correcta?</p>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              onClick={() => validateResponse(gameId, true)}
              style={{
                padding: "10px 16px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ✅ Correcta
            </button>
            <button
              onClick={() => validateResponse(gameId, false)}
              style={{
                padding: "10px 16px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ❌ Incorrecta
            </button>
          </div>
        </div>
      )}

      {/* PANEL: VALIDACIÓN DE CALIFICACIONES */}
      {safePhase === "validation_ratings" && (
        <div
          style={{
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 20,
            backgroundColor: "white",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>⚖️ VALIDAR CALIFICACIONES</h3>

          {/* Info de la respuesta */}
          <div style={{
            padding: 12,
            backgroundColor: round.responseValidated ? "#dcfce7" : "#fee2e2",
            borderRadius: 8,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 24 }}>
              {round.responseValidated ? "✅" : "❌"}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {language === 'es'
                ? `La respuesta fue marcada como ${round.responseValidated ? "CORRECTA" : "INCORRECTA"}`
                : language === 'pt'
                  ? `A resposta foi marcada como ${round.responseValidated ? "CORRETA" : "INCORRETA"}`
                  : `The response fue marcada como ${round.responseValidated ? "CORRECT" : "INCORRECT"}`
              }
            </span>
          </div>

          {/* Tarjetas de validación por equipo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(round.ratingTeams || {}).map(([teamId, rater]) => {
              const team = teamsSorted.find(t => t.id === teamId);
              if (!team) return null;

              const rating = (rater as any).rating;
              const validated = (rater as any).validated;
              const playerName = (rater as any).playerName || "—";
              const responseCorrect = round.responseValidated === true;

              // Determinar el estado y los puntos
              let ratingIcon = "⬜";
              let ratingText = language === 'es' ? "Sin calificar" : language === 'pt' ? "Sem avaliar" : "Not rated";
              let isAutomatic = true;
              let automaticPoints = 0;
              let acceptPoints = 0;
              let showWarning = false;

              if (rating === "green") {
                ratingIcon = "🟩";
                ratingText = language === 'es' ? "Verde" : language === 'pt' ? "Verde" : "Green";
                isAutomatic = true;
                automaticPoints = responseCorrect ? 5 : 0;
              } else if (rating === "yellow") {
                ratingIcon = "🟨";
                ratingText = language === 'es' ? "Amarillo" : language === 'pt' ? "Amarelo" : "Yellow";
                isAutomatic = false;
                acceptPoints = 10;
              } else if (rating === "red") {
                ratingIcon = "🟥";
                ratingText = language === 'es' ? "Rojo" : language === 'pt' ? "Vermelho" : "Red";
                isAutomatic = false;
                acceptPoints = 12;
                showWarning = responseCorrect; // Advertencia si respuesta fue correcta
              } else {
                // Sin calificar
                isAutomatic = true;
                automaticPoints = 0;
              }

              // Mensaje automático según contexto
              let automaticMessage = "";
              if (isAutomatic) {
                if (!rating) {
                  automaticMessage = language === 'es'
                    ? "No calificó → 0 pts"
                    : language === 'pt'
                      ? "Não avaliou → 0 pts"
                      : "Did not rate → 0 pts";
                } else if (rating === "green" && responseCorrect) {
                  automaticMessage = language === 'es'
                    ? "Calificó Verde, respuesta correcta → 5 pts"
                    : language === 'pt'
                      ? "Avaliou Verde, resposta correta → 5 pts"
                      : "Rated Green, correct response → 5 pts";
                } else if (rating === "green" && !responseCorrect) {
                  automaticMessage = language === 'es'
                    ? "Calificó Verde, respuesta incorrecta → 0 pts"
                    : language === 'pt'
                      ? "Avaliou Verde, resposta incorreta → 0 pts"
                      : "Rated Green, incorrect response → 0 pts";
                }
              }

              return (
                <div
                  key={teamId}
                  style={{
                    padding: 16,
                    backgroundColor: validated === true ? "#f0fdf4" : validated === false ? "#fef2f2" : "#f8fafc",
                    borderRadius: 12,
                    border: `2px solid ${validated === true ? "#22c55e" : validated === false ? "#ef4444" : "#e2e8f0"}`,
                  }}
                >
                  {/* Header del equipo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>{ratingIcon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{team.name}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{playerName}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 14, fontWeight: 600, color: "#475569" }}>
                      {ratingText}
                    </div>
                  </div>

                  {/* Advertencia para rojo + respuesta correcta */}
                  {showWarning && (
                    <div style={{
                      padding: 10,
                      backgroundColor: "#fef3c7",
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 13,
                      color: "#92400e",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span>⚠️</span>
                      <span>
                        {language === 'es'
                          ? "La respuesta fue aceptada como correcta. Esta calificación roja normalmente no debería aceptarse."
                          : language === 'pt'
                            ? "A resposta foi aceita como correta. Esta avaliação vermelha normalmente não deveria ser aceita."
                            : "The response fue aceptada como correcta. This red rating normally should not be accepted."
                        }
                      </span>
                    </div>
                  )}

                  {/* Contenido según si es automático o requiere validación */}
                  {isAutomatic ? (
                    <div style={{
                      padding: 10,
                      backgroundColor: "#e0f2fe",
                      borderRadius: 8,
                      fontSize: 14,
                      color: "#0369a1",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span>ℹ️</span>
                      <span>{automaticMessage}</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 10 }}>
                      {validated === null || validated === undefined ? (
                        <>
                          <button
                            onClick={() => validateRating(gameId, teamId, true)}
                            style={{
                              flex: 1,
                              padding: "10px 16px",
                              backgroundColor: "#22c55e",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 14,
                            }}
                          >
                            ✅ Aceptar ({acceptPoints} pts)
                          </button>
                          <button
                            onClick={() => validateRating(gameId, teamId, false)}
                            style={{
                              flex: 1,
                              padding: "10px 16px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 14,
                            }}
                          >
                            ❌ Rechazar
                          </button>
                        </>
                      ) : (
                        <div style={{
                          padding: 10,
                          backgroundColor: validated ? "#dcfce7" : "#fee2e2",
                          borderRadius: 8,
                          fontSize: 14,
                          color: validated ? "#166534" : "#991b1b",
                          fontWeight: 600,
                          width: "100%",
                          textAlign: "center",
                        }}>
                          {validated
                            ? `✅ Aceptado (+${acceptPoints} pts)`
                            : "❌ Rechazado (0 pts)"
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botón para calcular puntos y avanzar */}
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button
              onClick={() => calculateAndAwardPoints(gameId)}
              disabled={!isValidationComplete(round)}
              style={{
                flex: 1,
                padding: "14px 24px",
                backgroundColor: isValidationComplete(round) ? "#6366f1" : "#94a3b8",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: isValidationComplete(round) ? "pointer" : "not-allowed",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              🏆 Calcular Puntos y Ver Resultados
            </button>
          </div>

          {/* Botones globales (secundarios) */}
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: 10,
            flexWrap: "wrap"
          }}>
            <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center" }}>
              Acciones rápidas:
            </span>
            <button
              onClick={() => validateAllRatings(gameId, true, "yellow")}
              style={{
                padding: "8px 14px",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fcd34d",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              🟨 Aceptar Amarillos
            </button>
            <button
              onClick={() => validateAllRatings(gameId, true, "red")}
              style={{
                padding: "8px 14px",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              🟥 Aceptar Rojos
            </button>
            <button
              onClick={() => validateAllRatings(gameId, false)}
              style={{
                padding: "8px 14px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ❌ Rechazar Pendientes
            </button>
          </div>
        </div>
      )}
      {/* CONTROLES DOCENTE */}
      <div style={{
        marginTop: 20,
        padding: 16,
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        display: "flex",
        gap: 12,
        flexWrap: "wrap"
      }}>
        <span style={{ fontWeight: 700, alignSelf: "center" }}>🎮 Controles:</span>
        <button
          onClick={() => setStage2Phase(gameId, "hint")}
          style={{
            padding: "8px 12px",
            backgroundColor: "#cbd5e1",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Hint
        </button>
        <button
          onClick={() => setStage2Phase(gameId, "designated")}
          style={{
            padding: "8px 12px",
            backgroundColor: "#cbd5e1",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Designar
        </button>
        <button
          onClick={() => setStage2Phase(gameId, "rating")}
          style={{
            padding: "8px 12px",
            backgroundColor: "#cbd5e1",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Rating
        </button>
        <button
          onClick={() => setStage2Phase(gameId, "rating_reveal")}
          style={{
            padding: "8px 12px",
            backgroundColor: "#cbd5e1",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Reveal
        </button>
        <button
          onClick={() => setStage2Phase(gameId, "justification")}
          style={{
            padding: "8px 12px",
            backgroundColor: "#cbd5e1",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Justify
        </button>
        <button
          onClick={() => setStage2Phase(gameId, "validation_ratings")}
          style={{
            padding: "8px 12px",
            backgroundColor: "#cbd5e1",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Validate
        </button>
        <button
          onClick={() => setStage2Phase(gameId, "results")}
          style={{
            padding: "8px 12px",
            backgroundColor: "#cbd5e1",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Results
        </button>
      </div>

      {/* ========== FASE: RESULTS ========== */}
      {safePhase === "results" && (
        <div style={{
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 8,
          marginBottom: 20,
          backgroundColor: "white",
        }}>
          {/* Ganador */}
          {(() => {
            const maxPoints = Math.max(...roundRanking.map(r => r.roundPoints), 0);
            const winners = roundRanking.filter(r => r.roundPoints === maxPoints);

            return (
              <div style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                borderRadius: 16,
                padding: 32,
                textAlign: "center",
                color: "white",
                boxShadow: "0 8px 32px rgba(245, 158, 11, 0.4)",
                marginBottom: 24,
              }}>
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
          <div style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 22, fontWeight: 700, color: "#1e293b" }}>📊 Puntos de la Ronda</h3>
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

          {/* ✅ CORREGIDO: Verificar si hay más preguntas antes de mostrar botones */}
          {(() => {
            const allQuestions = Object.values(game.questions || {}) as any[];
            const stage2Questions = allQuestions.filter(q => q.suggestedStage === 2);
            const currentRoundNum = game.stage2?.currentRound ?? 0;
            const hasMoreRounds = (currentRoundNum + 1) < stage2Questions.length;

            return hasMoreRounds ? (
              <button
                onClick={async () => {
                  const nextRound = currentRoundNum + 1;

                  await update(ref(database), {
                    [`games/${gameId}/stage2/currentRound`]: nextRound,
                    [`games/${gameId}/updatedAt`]: Date.now(),
                  });

                  await startStage2Round(gameId);
                }}
                style={{
                  padding: "16px 32px",
                  fontSize: 18,
                  fontWeight: 700,
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
                  transition: "all 0.2s",
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                ➡️ SIGUIENTE RONDA ({currentRoundNum + 2} de {stage2Questions.length})
              </button>
            ) : (
              <button
                onClick={async () => {
                  await update(ref(database), {
                    [`games/${gameId}/status/status`]: "game_complete",
                    [`games/${gameId}/stage2/completed`]: true,
                    [`games/${gameId}/stage2/completedAt`]: Date.now(),
                    [`games/${gameId}/updatedAt`]: Date.now(),
                  });
                }}
                style={{
                  padding: "16px 32px",
                  fontSize: 18,
                  fontWeight: 700,
                  backgroundColor: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(34, 197, 94, 0.4)",
                  transition: "all 0.2s",
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                🏆 FINALIZAR JUEGO
              </button>
            );
          })()}
        </div>
      )}

      {/* Representantes info */}
      {responding && safePhase !== "results" && (
        <div style={{ marginTop: 20, fontSize: 14, color: "#64748b" }}>
          👤 Representantes: {responding.players?.map(p => p.name).join(", ") || "No asignados"}
        </div>
      )}

      <ReconnectBadge gameId={gameId} roomCode={game?.roomCode} />
    </div>
  );
}