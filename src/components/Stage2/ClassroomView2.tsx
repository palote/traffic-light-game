// src/components/Stage2/ClassroomViewImproved.tsx
// Versión mejorada del ClassroomView para Stage 2 con panel de progreso

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
import {
  startCountdownMusic,
  stopCountdownMusic,
  pauseCountdownMusic,
} from "../../hooks/useCountdownMusic";


interface ClassroomViewProps {
  gameId: string;
}

export function ClassroomViewImproved({ gameId }: ClassroomViewProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ratingProgress, setRatingProgress] = useState<{ rated: number; total: number } | null>(null);
  const [currentJustifyingTeamId, setCurrentJustifyingTeamId] = useState<string | null>(null);

  // 🆕 Toggle para mostrar/ocultar panel de progreso
  const [showProgressPanel, setShowProgressPanel] = useState(true);
  const { logout, authRequired } = useAuth();

  // 1) Suscripción al juego
  useEffect(() => {
    const gameRef = ref(database, `games/${gameId}`);
    const unsub = onValue(gameRef, (snap) => {
      setGame(snap.val() ?? null);
    });
    return () => unsub();
  }, [gameId]);
  // ✅ MÉTRICA: último acceso del docente a este juego (1 sola vez por carga)
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

  // Actualizar progreso de calificaciones
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
      {/* Header */}
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
        <h1 style={{ margin: 0, fontSize: 28 }}>🎯 ETAPA 2 - Vista del Aula</h1>

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

      {/* PANEL PRIORITARIO: AYUDA DOCENTE (solo en responding) */}
      {safePhase === "responding" && responding && respondingHelpHasState && (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            border: "2px solid #FF5722",
            borderRadius: 8,
            backgroundColor: "#fff3e0",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>
            🤝 AYUDA (control docente)
          </div>

          {respondingHelpRequested ? (
            <div style={{ marginBottom: 8 }}>
              🆘 <b>{responding.playerName}</b> pidió ayuda y se reúne con su equipo.
            </div>
          ) : (
            <div style={{ marginBottom: 8, opacity: 0.8 }}>(No hay pedido activo)</div>
          )}

          <div style={{ marginBottom: 12, fontSize: 18 }}>
            ⏱️ Tiempo restante:{" "}
            <b style={{ fontSize: 24 }}>{respondingHelpRemaining ?? "—"}</b> s{" "}
            {respondingHelpRemaining === 0 && (
              <span style={{ marginLeft: 10, fontWeight: 700, color: "#F44336" }}>
                ⏰ TERMINÓ
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              disabled={
                !respondingHelpRequested && !((responding as any)?.helpRemainingSec > 0)
              }
              onClick={async () => {
                await teacherStartRespondingHelp(gameId);

                await startCountdownMusic(
                  (responding as any)?.helpDuration ?? 60,
                  () =>
                    respondingHelpRemaining ??
                    (responding as any)?.helpRemainingSec ??
                    (responding as any)?.helpDuration ??
                    60
                );
              }}

              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ▶️ INICIAR / REANUDAR
            </button>

            <button
              disabled={!respondingHelpRunning}
              onClick={async () => {
                await teacherPauseRespondingHelp(gameId);
                pauseCountdownMusic();
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#FF9800",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ⏸️ PAUSAR
            </button>

            <button
              disabled={
                !respondingHelpRunning &&
                !(((responding as any)?.helpRemainingSec ?? null) != null)
              }
              onClick={async () => {
                await teacherEndRespondingHelp(gameId);
                stopCountdownMusic();
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#F44336",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ⏹️ TERMINAR
            </button>
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
        <div style={{
          marginBottom: 16,
          padding: 16,
          border: "2px solid #4CAF50",
          borderRadius: 8,
          backgroundColor: "#e8f5e9",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            🎨 CALIFICACIÓN EN CURSO
          </div>

          <div style={{ marginBottom: 12, fontSize: 16 }}>
            📊 Calificaron: <b>{ratingProgress?.rated ?? 0}</b> de <b>{ratingProgress?.total ?? 0}</b> equipos
          </div>

          {round.ratingTimerActive && ratingTimeRemaining !== null && (
            <div style={{ marginBottom: 12, fontSize: 16 }}>
              ⏱️ Tiempo: <b>{ratingTimeRemaining}</b> s
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!round.ratingTimerActive ? (
              <button
                onClick={() => teacherStartRatingTimer(gameId)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                ⏱️ ACTIVAR TIMER
              </button>
            ) : (
              <>
                <button onClick={() => teacherPauseRatingTimer(gameId)}>⏸️ PAUSAR</button>
                <button onClick={() => teacherStopRatingTimer(gameId)}>⏹️ DETENER</button>
              </>
            )}

            <button
              onClick={() => finalizeRatings(gameId)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                fontWeight: 700,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ✅ FINALIZAR Y REVELAR
            </button>
          </div>
        </div>
      )}

      {/* PANEL: REVELACIÓN DE CALIFICACIONES */}
      {safePhase === "rating_reveal" && (
        <div style={{
          marginBottom: 16,
          padding: 16,
          border: "2px solid #2196F3",
          borderRadius: 8,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>
            📊 CALIFICACIONES REVELADAS
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}>
            {Object.entries(round.ratingTeams || {}).map(([teamId, rater]: [string, any]) => {
              const colorEmoji =
                rater.rating === "green" ? "🟩" :
                  rater.rating === "yellow" ? "🟨" :
                    rater.rating === "red" ? "🟥" : "⬜";

              return (
                <div
                  key={teamId}
                  style={{
                    padding: 16,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    backgroundColor: "white",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{rater.teamName}</div>
                  <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>{rater.playerName}</div>
                  <div style={{ fontSize: 40 }}>{colorEmoji}</div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => startJustificationPhase(gameId)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#2196F3",
              color: "white",
              fontWeight: 700,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ➡️ IR A JUSTIFICACIONES
          </button>
        </div>
      )}

      {/* PANEL: JUSTIFICACIÓN SECUENCIAL */}
      {safePhase === "justification" && currentJustifyingTeamId && (
        <div style={{
          marginBottom: 16,
          padding: 16,
          border: "2px solid #FF9800",
          borderRadius: 8,
          backgroundColor: "#fff3e0",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            📝 JUSTIFICACIONES
          </div>

          {(() => {
            const currentRater = round.ratingTeams?.[currentJustifyingTeamId];
            const order = (round as any).justificationOrder || [];
            const currentIndex = (round as any).currentJustificationIndex ?? 0;

            if (!currentRater) return <div>⚠️ Error</div>;

            const colorEmoji =
              currentRater.rating === "yellow" ? "🟨 AMARILLO" :
                currentRater.rating === "red" ? "🟥 ROJO" : "—";

            return (
              <div>
                <div style={{
                  padding: 16,
                  backgroundColor: "white",
                  borderRadius: 8,
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    Turno {currentIndex + 1} de {order.length}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {currentRater.teamName} - {currentRater.playerName}
                  </div>
                  <div style={{ fontSize: 16, marginTop: 8 }}>
                    Calificó: {colorEmoji}
                  </div>
                </div>

                {currentRater.justification && (
                  <div style={{
                    padding: 12,
                    backgroundColor: "white",
                    borderRadius: 4,
                    marginBottom: 12,
                    fontSize: 14,
                  }}>
                    <strong>Justificación escrita:</strong> {currentRater.justification}
                  </div>
                )}

                <button
                  onClick={() => advanceJustification(gameId)}
                  style={{
                    padding: "12px 24px",
                    fontSize: 16,
                    backgroundColor: "#FF9800",
                    color: "white",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  {currentIndex < order.length - 1
                    ? "➡️ SIGUIENTE"
                    : "✅ TERMINAR JUSTIFICACIONES"
                  }
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* PANEL: VALIDACIÓN DE RESPUESTA */}
      {safePhase === "validation_response" && (
        <div style={{
          marginBottom: 16,
          padding: 16,
          border: "2px solid #FF5722",
          borderRadius: 8,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            ⚖️ VALIDACIÓN DE LA RESPUESTA
          </div>

          <div style={{
            padding: 16,
            backgroundColor: "#fff3e0",
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <p><strong>Equipo:</strong> {teamsSorted.find((t) => t.id === responding?.teamId)?.name ?? "—"}</p>
            <p><strong>Representante:</strong> {responding?.playerName ?? "—"}</p>
            <p><strong>Ayuda usada:</strong> {responding?.helpStartedAt ? "Sí (9 pts)" : "No (12 pts)"}</p>
          </div>

          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            ¿La respuesta fue correcta?
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => validateResponse(gameId, true)}
              style={{
                flex: 1,
                padding: 16,
                fontSize: 18,
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✅ CORRECTA
            </button>

            <button
              onClick={() => validateResponse(gameId, false)}
              style={{
                flex: 1,
                padding: 16,
                fontSize: 18,
                backgroundColor: "#F44336",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ❌ INCORRECTA
            </button>
          </div>
        </div>
      )}

      {/* PANEL: VALIDACIÓN DE CALIFICACIONES */}
      {safePhase === "validation_ratings" && (
        <div style={{
          marginBottom: 16,
          padding: 16,
          border: "2px solid #9C27B0",
          borderRadius: 8,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            ⚖️ VALIDACIÓN DE CALIFICACIONES
          </div>

          {/* Cartel pedagógico si hay rojo */}
          {Object.values(round.ratingTeams || {}).some((rt: any) => rt.rating === "red") && (
            <div style={{
              marginBottom: 16,
              padding: 16,
              backgroundColor: "#fff3cd",
              border: "2px solid #ff9800",
              borderRadius: 8,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: "#ff6f00" }}>
                ⚠️ Hay calificación(es) ROJA(s)
              </div>
              <div style={{ fontSize: 14 }}>
                • Rojo aceptado = respuesta incorrecta detectada (12 pts)<br />
                • Los demás podrían recibir 0 pts
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(() => {
              const ratersArray = Object.entries(round.ratingTeams || {});
              const sortedRaters = ratersArray.sort(([, a], [, b]) => {
                const colorOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 };
                return (colorOrder[(a as any).rating] ?? 3) - (colorOrder[(b as any).rating] ?? 3);
              });

              return sortedRaters.map(([teamId, rater]: [string, any]) => {
                const colorEmoji =
                  rater.rating === "green" ? "🟩" :
                    rater.rating === "yellow" ? "🟨" :
                      rater.rating === "red" ? "🟥" : "⬜";

                const isValidated = rater.validated !== null && rater.validated !== undefined;
                const pts = rater.rating === "red" ? "12" : rater.rating === "yellow" ? "10" : "5";

                return (
                  <div
                    key={teamId}
                    style={{
                      padding: 16,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      backgroundColor: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          {rater.teamName} - {rater.playerName}
                        </div>
                        {rater.justification && (
                          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                            "{rater.justification}"
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 32 }}>{colorEmoji}</div>
                    </div>

                    {!isValidated ? (
                      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                        <button
                          onClick={() => validateRating(gameId, teamId, true)}
                          style={{
                            flex: 1,
                            padding: 10,
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          ✅ ACEPTAR ({pts} pts)
                        </button>
                        <button
                          onClick={() => validateRating(gameId, teamId, false)}
                          style={{
                            flex: 1,
                            padding: 10,
                            backgroundColor: "#F44336",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          ❌ RECHAZAR
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        marginTop: 12,
                        padding: 10,
                        backgroundColor: rater.validated ? "#e8f5e9" : "#ffebee",
                        borderRadius: 6,
                        textAlign: "center",
                        fontWeight: 600,
                      }}>
                        {rater.validated ? `✅ Aceptado (${pts} pts)` : "❌ Rechazado"}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {isValidationComplete(round) && (
            <button
              onClick={() => calculateAndAwardPoints(gameId)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: 16,
                fontSize: 18,
                backgroundColor: "#9C27B0",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              💰 CONFIRMAR PUNTOS Y VER RESULTADOS
            </button>
          )}
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

        {safePhase === "hint" && (
          <button
            onClick={() => designateRepresentatives(gameId)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🎲 DESIGNAR REPRESENTANTES
          </button>
        )}

        {safePhase === "designated" && (
          <button
            onClick={async () => {
              await setStage2Phase(gameId, "question_revealed");
              setTimeout(() => setStage2Phase(gameId, "responding"), 2000);
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#9C27B0",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            👁️ REVELAR PREGUNTA
          </button>
        )}

        {safePhase === "responding" && (
          <button
            onClick={async () => {
              await setRespondingResponseGiven(gameId, true);
              await startRatingPhase(gameId);
            }}
            style={{
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ✅ RESPUESTA COMPLETA → CALIFICACIÓN
          </button>
        )}

        <button
          onClick={() => setStage2Phase(gameId, "hint")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#757575",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          🧪 VOLVER A HINT
        </button>
      </div>

      {/* RESULTADOS */}
      {safePhase === "results" && (
        <div style={{
          marginTop: 20,
          padding: 20,
          border: "2px solid #FFD700",
          borderRadius: 12,
          backgroundColor: "#fffde7",
        }}>
          <h2 style={{ fontSize: 28, marginBottom: 20, textAlign: "center" }}>
            🏁 RESULTADOS DE LA RONDA
          </h2>

          {/* Ganador */}
          {(() => {
            const maxRoundPoints = Math.max(...roundRanking.map(r => r.roundPoints), 0);
            const winners = roundRanking.filter(r => r.roundPoints === maxRoundPoints);

            return (
              <div style={{
                padding: 20,
                backgroundColor: "#FFD700",
                borderRadius: 12,
                marginBottom: 20,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 48 }}>🏆</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {winners.length > 1 ? "GANADORES" : "GANADOR"}
                </div>
                {winners.map(w => (
                  <div key={w.teamId} style={{ fontSize: 28, fontWeight: 700 }}>
                    {w.teamName} 👑
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Puntos de la ronda */}
          <div style={{ marginBottom: 20 }}>
            <h3>📊 Puntos ganados</h3>
            {roundRanking.map((r) => (
              <div
                key={r.teamId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 12,
                  backgroundColor: "white",
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 700 }}>{r.teamName}</span>
                <span style={{
                  fontWeight: 700,
                  color: r.roundPoints > 0 ? "#4CAF50" : "#999"
                }}>
                  +{r.roundPoints} pts
                </span>
              </div>
            ))}
          </div>

          {/* Botón siguiente ronda */}
          <button
            onClick={async () => {
              const nextQIndex = (game.stage2?.currentQuestionIndex ?? 0) + 1;
              const nextRound = (game.stage2?.currentRound ?? 0) + 1;

              await update(ref(database), {
                [`games/${gameId}/stage2/currentQuestionIndex`]: nextQIndex,
                [`games/${gameId}/stage2/currentRound`]: nextRound,
                [`games/${gameId}/updatedAt`]: Date.now(),
              });

              await startStage2Round(gameId);
            }}
            style={{
              width: "100%",
              padding: 16,
              fontSize: 20,
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ➡️ SIGUIENTE RONDA
          </button>
        </div>
      )}

      {/* Representantes info */}
      {responding && safePhase !== "results" && (
        <div style={{
          marginTop: 20,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          backgroundColor: "white",
        }}>
          <h3 style={{ margin: "0 0 12px 0" }}>👥 Representantes</h3>
          <p>
            <strong>🎤 Responde:</strong> {responding.playerName} ({teamsSorted.find((t) => t.id === responding.teamId)?.name})
          </p>
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            <strong>🎨 Califican:</strong>{" "}
            {Object.values(round.ratingTeams || {}).map((rt: any) => rt.teamName).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}