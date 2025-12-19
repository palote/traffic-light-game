// src/components/Stage2/ClassroomView.tsx

import { useEffect, useMemo, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase.config";

import {
  getRoundRanking,
  getRoundWinner,
  getRoundSummary,
} from "../../services/stage2ResultsHelpers";

import type { Game, Team, Question } from "../../types/game";

import {
  startStage2Round,
  designateRepresentatives,
  setStage2Phase,
  setRespondingResponseGiven,

  // Control docente del timer (responding)
  teacherStartRespondingHelp,
  teacherPauseRespondingHelp,
  teacherEndRespondingHelp,

  // 🆕 Calificación simultánea
  startRatingPhase,
  getRatingProgress,
  finalizeRatings,
  teacherStartRatingTimer,
  teacherPauseRatingTimer,
  teacherStopRatingTimer,

  // 🆕 Justificación secuencial
  startJustificationPhase,
  advanceJustification,
  getCurrentJustifyingTeamId,

  // 🆕 Validación (calificaciones)
  validateRating,
  isValidationComplete,
  calculateAndAwardPoints,

  // 🆕 Validación de respuesta (docente)
  validateResponse,
} from "../../services/stage2Repository";

interface ClassroomViewProps {
  gameId: string;
}

export function ClassroomView({ gameId }: ClassroomViewProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 🆕 Estado para contador de calificaciones
  const [ratingProgress, setRatingProgress] = useState<{ rated: number; total: number } | null>(null);

  // 🆕 Estado para justificación actual
  const [currentJustifyingTeamId, setCurrentJustifyingTeamId] = useState<string | null>(null);

  // 1) Suscripción al juego
  useEffect(() => {
    const gameRef = ref(database, `games/${gameId}`);
    const unsub = onValue(gameRef, (snap) => {
      setGame(snap.val() ?? null);
    });
    return () => unsub();
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

  // 🆕 Actualizar progreso de calificaciones cuando estamos en fase rating
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
    const interval = setInterval(fetchProgress, 2000); // Poll cada 2 segundos

    return () => clearInterval(interval);
  }, [gameId, safePhase]);

  // 🆕 Cargar equipo que justifica actualmente
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

  // 🆕 Tick visual para timer de rating
  useEffect(() => {
    if (!round) return;
    if (safePhase !== "rating") return;
    if (!round.ratingTimerActive) return;

    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [safePhase, round?.ratingTimerActive]);

  // 🆕 Segundos restantes para rating timer
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
        <h1>ETAPA 2</h1>
        <p>Stage 2 todavía no fue iniciado.</p>
        <button onClick={() => startStage2Round(gameId)}>▶️ INICIAR STAGE 2</button>
      </div>
    );
  }

  if (!round) {
    return (
      <div style={{ padding: 40 }}>
        <h1>ETAPA 2</h1>
        <p>No se encontró la ronda actual.</p>
        <button onClick={() => startStage2Round(gameId)}>🔁 RECREAR RONDA</button>
      </div>
    );
  }

  const roundRanking = getRoundRanking(round, teamsSorted);
  const roundWinner = getRoundWinner(round);
  const roundSummary = getRoundSummary(round);

  const respondingHelpRequested = !!(responding as any)?.helpRequested;
  const respondingHelpRunning = !!(responding as any)?.helpStartedAt;
  const respondingHelpHasState =
    respondingHelpRequested ||
    respondingHelpRunning ||
    ((responding as any)?.helpRemainingSec != null);

  return (
    <div style={{ padding: 40 }}>
      <h1>ETAPA 2</h1>

      <div style={{ marginBottom: 12 }}>
        <div>
          Ronda actual: <b>{game.stage2.currentRound + 1}</b>
        </div>
        <div>
          Fase: <b>{safePhase}</b>
        </div>
      </div>

      {/* PANEL PRIORITARIO: AYUDA DOCENTE (solo en responding) */}
      {safePhase === "responding" && responding && respondingHelpHasState && (
        <div style={{ marginBottom: 12, padding: 12, border: "1px solid #ddd" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            🤝 AYUDA (control docente)
          </div>

          {respondingHelpRequested ? (
            <div style={{ marginBottom: 8 }}>
              🆘 <b>{responding.playerName}</b> pidió ayuda.
            </div>
          ) : (
            <div style={{ marginBottom: 8, opacity: 0.8 }}>
              (No hay pedido activo)
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            ⏱️ Tiempo restante:{" "}
            <b>{respondingHelpRemaining ?? "—"}</b> s{" "}
            {respondingHelpRemaining === 0 && (
              <span style={{ marginLeft: 10, fontWeight: 700 }}>⏰ TERMINÓ</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              disabled={!respondingHelpRequested && !((responding as any)?.helpRemainingSec > 0)}
              onClick={() => teacherStartRespondingHelp(gameId)}
            >
              ▶️ INICIAR / REANUDAR AYUDA
            </button>

            <button
              disabled={!respondingHelpRunning}
              onClick={() => teacherPauseRespondingHelp(gameId)}
            >
              ⏸️ PAUSAR
            </button>

            <button
              disabled={
                !respondingHelpRunning &&
                !(((responding as any)?.helpRemainingSec ?? null) != null)
              }
              onClick={() => teacherEndRespondingHelp(gameId)}
            >
              ⏹️ TERMINAR AYUDA
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            El timer es visual y NO cambia fases automáticamente.
          </div>
        </div>
      )}

      {/* HINT / PREGUNTA */}
      <div style={{ padding: 16, border: "1px solid #ddd", marginBottom: 18 }}>
        {safePhase === "hint" ? (
          <>
            <h3>💡 Pista</h3>
            <p style={{ fontSize: 18 }}>{currentQuestion?.hint ?? "⚠️ Pista no encontrada"}</p>
          </>
        ) : safePhase === "designated" ? (
          <>
            <h3>👥 Representantes Designados</h3>
            <p style={{ fontSize: 16, opacity: 0.8 }}>
              Los representantes deben pasar al frente. La pregunta se revelará cuando el docente lo indique.
            </p>
          </>
        ) : (
          <>
            <h3>📝 Pregunta</h3>
            <p style={{ fontSize: 18 }}>{currentQuestion?.text ?? "⚠️ Pregunta no encontrada"}</p>
          </>
        )}
        <small>questionId: {round.questionId}</small>
      </div>

      {/* RANKING */}
      <h3>Ranking</h3>
      <ol>
        {teamsSorted.map((t) => (
          <li key={t.id}>
            {t.name} — {t.totalScore ?? 0} pts
          </li>
        ))}
      </ol>

      {/* 🆕 PANEL: CALIFICACIÓN SIMULTÁNEA */}
      {safePhase === "rating" && (
        <div style={{ marginBottom: 12, padding: 12, border: "2px solid #4CAF50" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 18 }}>
            🎨 CALIFICACIÓN EN CURSO (SIMULTÁNEA)
          </div>

          {/* Contador */}
          <div style={{ marginBottom: 10, fontSize: 16 }}>
            📊 Calificaron:{" "}
            <b>{ratingProgress?.rated ?? 0}</b> de <b>{ratingProgress?.total ?? 0}</b> equipos
          </div>

          {/* Timer opcional */}
          {round.ratingTimerActive && ratingTimeRemaining !== null && (
            <div style={{ marginBottom: 10, fontSize: 16 }}>
              ⏱️ Tiempo restante: <b>{ratingTimeRemaining}</b> s
              {ratingTimeRemaining === 0 && (
                <span style={{ marginLeft: 10, fontWeight: 700 }}>⏰ TERMINÓ</span>
              )}
            </div>
          )}

          {/* Controles */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!round.ratingTimerActive ? (
              <button onClick={() => teacherStartRatingTimer(gameId)}>
                ⏱️ ACTIVAR TIMER
              </button>
            ) : (
              <>
                <button onClick={() => teacherPauseRatingTimer(gameId)}>
                  ⏸️ PAUSAR TIMER
                </button>
                <button onClick={() => teacherStopRatingTimer(gameId)}>
                  ⏹️ DETENER TIMER
                </button>
              </>
            )}

            <button
              onClick={() => finalizeRatings(gameId)}
              style={{ backgroundColor: "#4CAF50", color: "white", fontWeight: 700 }}
            >
              ✅ FINALIZAR Y REVELAR COLORES
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            Esperá a que todos califiquen (o usá el timer) y luego FINALIZÁ.
          </div>
        </div>
      )}

      {/* 🆕 PANEL: REVELACIÓN DE CALIFICACIONES */}
      {safePhase === "rating_reveal" && (
        <div style={{ marginBottom: 12, padding: 12, border: "2px solid #2196F3" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            📊 CALIFICACIONES REVELADAS
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {Object.entries(round.ratingTeams || {}).map(([teamId, rater]: [string, any]) => {
              const colorEmoji =
                rater.rating === "green" ? "🟩" :
                  rater.rating === "yellow" ? "🟨" :
                    rater.rating === "red" ? "🟥" : "⬜";

              const colorBg =
                rater.rating === "green" ? "#4CAF50" :
                  rater.rating === "yellow" ? "#FFC107" :
                    rater.rating === "red" ? "#F44336" : "#999";

              return (
                <div
                  key={teamId}
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    backgroundColor: colorBg + "20",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {rater.teamName}
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.8 }}>
                    {rater.playerName}
                  </div>
                  <div style={{ fontSize: 32 }}>
                    {colorEmoji}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {rater.rating ? rater.rating.toUpperCase() : "SIN CALIFICAR"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => startJustificationPhase(gameId)}
              style={{ backgroundColor: "#2196F3", color: "white", fontWeight: 700 }}
            >
              ➡️ IR A JUSTIFICACIONES
            </button>
          </div>
        </div>
      )}

      {/* 🆕 PANEL: JUSTIFICACIÓN SECUENCIAL */}
      {safePhase === "justification" && (
        <div style={{ marginBottom: 12, padding: 12, border: "2px solid #FF9800" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            📝 JUSTIFICACIONES (Secuencial)
          </div>

          {currentJustifyingTeamId ? (
            (() => {
              const currentRater = round.ratingTeams?.[currentJustifyingTeamId];
              const team = teamsSorted.find((t) => t.id === currentJustifyingTeamId);
              const order = (round as any).justificationOrder || [];
              const currentIndex = (round as any).currentJustificationIndex ?? 0;

              if (!currentRater) return <div>⚠️ Error: No se encontró el equipo</div>;

              const colorEmoji =
                currentRater.rating === "yellow" ? "🟨 AMARILLO" :
                  currentRater.rating === "red" ? "🟥 ROJO" : "—";

              return (
                <div>
                  <div style={{
                    padding: 16,
                    backgroundColor: "#fff3cd",
                    borderRadius: 8,
                    marginBottom: 12,
                  }}>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>
                      <strong>Turno actual:</strong> {currentIndex + 1} de {order.length}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                      {currentRater.teamName} - {currentRater.playerName}
                    </div>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>
                      Calificó: {colorEmoji}
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.8 }}>
                      Puntaje del equipo: {team?.totalScore ?? 0} pts
                    </div>
                  </div>

                  {currentRater.justification && (
                    <div style={{
                      padding: 12,
                      backgroundColor: "#f5f5f5",
                      borderRadius: 4,
                      marginBottom: 12,
                      fontSize: 14,
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        Justificación escrita:
                      </div>
                      <div>{currentRater.justification}</div>
                    </div>
                  )}

                  <div style={{
                    padding: 12,
                    backgroundColor: "#e3f2fd",
                    borderRadius: 4,
                    marginBottom: 12,
                    fontSize: 14,
                  }}>
                    💬 El representante está justificando oralmente al frente.
                    <br />
                    Debate con la clase si es necesario.
                  </div>

                  <button
                    onClick={() => advanceJustification(gameId)}
                    style={{
                      padding: 12,
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
                      ? "➡️ SIGUIENTE JUSTIFICACIÓN"
                      : "✅ TERMINAR JUSTIFICACIONES"
                    }
                  </button>
                </div>
              );
            })()
          ) : (
            <div>⏳ Cargando equipo actual...</div>
          )}
        </div>
      )}

      {/* 🆕 PANEL: VALIDACIÓN DE RESPUESTA */}
      {safePhase === "validation_response" && (
        <div style={{ marginBottom: 12, padding: 12, border: "2px solid #FF5722" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            ⚖️ VALIDACIÓN DE LA RESPUESTA
          </div>

          {/* Info de la respuesta */}
          <div style={{
            padding: 16,
            backgroundColor: "#fff3cd",
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Equipo que respondió:</strong>{" "}
              {teamsSorted.find((t) => t.id === responding?.teamId)?.name ?? "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Representante:</strong> {responding?.playerName ?? "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Pregunta:</strong> {currentQuestion?.text ?? "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Ayuda usada:</strong>{" "}
              {responding?.helpStartedAt ? "Sí (9 pts)" : "No (12 pts)"}
            </div>
          </div>

          {/* Decisión del docente */}
          <div style={{
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              ¿La respuesta fue correcta?
            </p>
            <p style={{ fontSize: 14, marginBottom: 16, opacity: 0.8 }}>
              Esta decisión determina quién recibe puntos.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={async () => {
                  try {
                    await validateResponse(gameId, true);
                  } catch (e) {
                    console.error(e);
                    alert("Error validando respuesta");
                  }
                }}
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
                ✅ RESPUESTA CORRECTA
              </button>

              <button
                onClick={async () => {
                  try {
                    await validateResponse(gameId, false);
                  } catch (e) {
                    console.error(e);
                    alert("Error validando respuesta");
                  }
                }}
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
                ❌ RESPUESTA INCORRECTA
              </button>
            </div>
          </div>

          {/* Explicación pedagógica */}
          <div style={{
            padding: 12,
            backgroundColor: "#e3f2fd",
            borderRadius: 4,
            fontSize: 14,
          }}>
            <p style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>
              💡 Recordatorio:
            </p>
            <p style={{ margin: 0 }}>
              • Si CORRECTA: verdes 5pts, amarillos validados 10pts, rojos 0pts<br />
              • Si INCORRECTA: solo rojos validados 10pts, resto 0pts
            </p>
          </div>
        </div>
      )}

      {/* 🆕 PANEL: VALIDACIÓN DE CALIFICACIONES (renombrado) */}
      {safePhase === "validation_ratings" && (
        <div style={{ marginBottom: 12, padding: 12, border: "2px solid #9C27B0" }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
            ⚖️ VALIDACIÓN DE CALIFICACIONES
          </div>

          <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 4 }}>
            <div style={{ fontSize: 14 }}>
              <strong>Verde:</strong> Auto-aceptado (5 pts) — No requiere acción<br />
              <strong>Amarillo/Rojo:</strong> Aceptar (10 pts) o Rechazar (0 pts)
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(round.ratingTeams || {}).map(([teamId, rater]: [string, any]) => {
              const team = teamsSorted.find((t) => t.id === teamId);

              const colorEmoji =
                rater.rating === "green" ? "🟩" :
                  rater.rating === "yellow" ? "🟨" :
                    rater.rating === "red" ? "🟥" : "⬜";

              const colorBg =
                rater.rating === "green" ? "#4CAF50" :
                  rater.rating === "yellow" ? "#FFC107" :
                    rater.rating === "red" ? "#F44336" : "#999";

              const isGreen = rater.rating === "green";
              const isValidated = rater.validated !== null && rater.validated !== undefined;

              return (
                <div
                  key={teamId}
                  style={{
                    padding: 16,
                    border: "2px solid " + colorBg,
                    borderRadius: 8,
                    backgroundColor: colorBg + "10",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                        {rater.teamName} - {rater.playerName}
                      </div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>
                        Puntaje del equipo: {team?.totalScore ?? 0} pts
                      </div>
                    </div>
                    <div style={{ fontSize: 32 }}>
                      {colorEmoji}
                    </div>
                  </div>

                  {rater.justification && (
                    <div style={{
                      padding: 12,
                      backgroundColor: "white",
                      borderRadius: 4,
                      marginBottom: 12,
                      fontSize: 14,
                      border: "1px solid #ddd",
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        Justificación:
                      </div>
                      <div>{rater.justification}</div>
                    </div>
                  )}

                  {isGreen ? (
                    <div style={{
                      padding: 12,
                      backgroundColor: "#4CAF50",
                      color: "white",
                      borderRadius: 4,
                      textAlign: "center",
                      fontWeight: 700,
                    }}>
                      ✅ AUTO-ACEPTADO (5 puntos)
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12 }}>
                      {!isValidated ? (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await validateRating(gameId, teamId, true);
                              } catch (e) {
                                console.error(e);
                                alert("Error aceptando calificación");
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: 12,
                              fontSize: 16,
                              backgroundColor: "#4CAF50",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            ✅ ACEPTAR (10 pts)
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                await validateRating(gameId, teamId, false);
                              } catch (e) {
                                console.error(e);
                                alert("Error rechazando calificación");
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: 12,
                              fontSize: 16,
                              backgroundColor: "#F44336",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            ❌ RECHAZAR (0 pts)
                          </button>
                        </>
                      ) : (
                        <div style={{
                          flex: 1,
                          padding: 12,
                          backgroundColor: rater.validated ? "#4CAF50" : "#F44336",
                          color: "white",
                          borderRadius: 8,
                          textAlign: "center",
                          fontWeight: 700,
                        }}>
                          {rater.validated ? "✅ ACEPTADO (10 pts)" : "❌ RECHAZADO (0 pts)"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isValidationComplete(round) ? (
            <button
              onClick={async () => {
                try {
                  await calculateAndAwardPoints(gameId);
                } catch (e) {
                  console.error(e);
                  alert("Error calculando puntos: " + (e as Error).message);
                }
              }}
              style={{
                marginTop: 16,
                padding: 16,
                fontSize: 18,
                backgroundColor: "#9C27B0",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
                width: "100%",
              }}
            >
              💰 CONFIRMAR PUNTOS Y VER RESULTADOS
            </button>
          ) : (
            <div style={{
              marginTop: 16,
              padding: 16,
              backgroundColor: "#fff3cd",
              borderRadius: 8,
              textAlign: "center",
              fontSize: 16,
            }}>
              ⏳ Validá todas las calificaciones para continuar
            </div>
          )}
        </div>
      )}

      {/* CONTROLES DOCENTE */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {safePhase === "hint" && (
          <button onClick={() => designateRepresentatives(gameId)}>
            🎲 DESIGNAR REPRESENTANTES
          </button>
        )}

        {safePhase === "designated" && (
          <button onClick={() => setStage2Phase(gameId, "question_revealed")}>
            👁️ REVELAR PREGUNTA
          </button>
        )}

        {safePhase === "question_revealed" && (
          <button onClick={() => setStage2Phase(gameId, "responding")}>
            ▶️ INICIAR RESPUESTA
          </button>
        )}

        {safePhase === "responding" && (
          <>
            <button onClick={() => setRespondingResponseGiven(gameId, true)}>
              ✅ RESPUESTA DADA (DOCENTE)
            </button>

            <button onClick={() => startRatingPhase(gameId)}>
              ➡️ IR A CALIFICACIÓN
            </button>
          </>
        )}

        <button onClick={() => setStage2Phase(gameId, "hint")}>🧪 VOLVER A HINT</button>
      </div>

      {safePhase === "results" && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd" }}>
          <h2 style={{ fontSize: 28, marginBottom: 16 }}>🏁 RESULTADOS DE LA RONDA</h2>

          {/* GANADOR(ES) */}
          {(() => {
            const maxRoundPoints = Math.max(...roundRanking.map(r => r.roundPoints), 0);
            const winners = roundRanking.filter(r => r.roundPoints === maxRoundPoints);
            const isPlural = winners.length > 1;

            return (
              <div style={{
                padding: 20,
                backgroundColor: "#FFD700",
                borderRadius: 8,
                marginBottom: 16,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {isPlural ? "GANADORES DE LA RONDA" : "GANADOR DE LA RONDA"}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
                  {winners.map((w) => (
                    <div key={w.teamId}>
                      {w.teamName} 👑
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* PUNTOS DE LA RONDA */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>📊 Puntos ganados en esta ronda</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roundRanking.map((r) => {
                const maxRoundPoints = Math.max(...roundRanking.map(rr => rr.roundPoints), 0);
                const isWinner = r.roundPoints === maxRoundPoints && maxRoundPoints > 0;

                return (
                  <div
                    key={r.teamId}
                    style={{
                      padding: 12,
                      backgroundColor: isWinner ? "#FFD70020" : "#f5f5f5",
                      border: isWinner ? "2px solid #FFD700" : "none",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {r.teamName} {isWinner && "👑"}
                      </div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>
                        Total: {r.totalScore} pts
                      </div>
                    </div>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: r.roundPoints > 0 ? "#4CAF50" : "#666",
                    }}>
                      +{r.roundPoints}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RANKING ACTUALIZADO */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>📈 Ranking General Actualizado</h3>
            <ol style={{ margin: 0, paddingLeft: 24 }}>
              {(() => {
                const sorted = [...teamsSorted].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
                const maxTotalScore = sorted[0]?.totalScore || 0;

                return sorted.map((t) => {
                  const isLeader = t.totalScore === maxTotalScore && maxTotalScore > 0;

                  return (
                    <li
                      key={t.id}
                      style={{
                        fontSize: 18,
                        padding: 8,
                        fontWeight: isLeader ? 700 : 400,
                        color: isLeader ? "#FFD700" : "inherit",
                      }}
                    >
                      {t.name} — {t.totalScore ?? 0} pts
                      {isLeader && " 👑"}
                    </li>
                  );
                });
              })()}
            </ol>
          </div>

          {/* RESUMEN PEDAGÓGICO */}
          {roundSummary.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, marginBottom: 12 }}>🧠 Claves de la ronda</h3>
              <ul style={{ margin: 0, paddingLeft: 24 }}>
                {roundSummary.map((s, i) => (
                  <li key={i} style={{ fontSize: 16, marginBottom: 8 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* DETALLES DE RESPUESTA */}
          {responding && (
            <div style={{
              padding: 12,
              backgroundColor: "#e3f2fd",
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <h4 style={{ fontSize: 16, marginBottom: 8 }}>📝 Respuesta</h4>
              <div style={{ fontSize: 14 }}>
                <strong>Equipo:</strong> {teamsSorted.find((t) => t.id === responding.teamId)?.name ?? "—"}<br />
                <strong>Representante:</strong> {responding.playerName}<br />
                <strong>Ayuda:</strong> {responding.helpStartedAt ? "Sí (9 pts)" : "No (12 pts)"}<br />
                <strong>Puntos:</strong> {round.pointsAwarded?.[responding.teamId] ?? 0} pts
              </div>
            </div>
          )}

          {/* BOTÓN SIGUIENTE RONDA */}
          <button
            onClick={async () => {
              try {
                const nextQIndex = (game.stage2?.currentQuestionIndex ?? 0) + 1;
                const nextRound = (game.stage2?.currentRound ?? 0) + 1;

                await update(ref(database), {
                  [`games/${gameId}/stage2/currentQuestionIndex`]: nextQIndex,
                  [`games/${gameId}/stage2/currentRound`]: nextRound,
                  [`games/${gameId}/updatedAt`]: Date.now(),
                });

                await startStage2Round(gameId);
              } catch (e) {
                console.error(e);
                alert("Error iniciando siguiente ronda: " + (e as Error).message);
              }
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

      {/* REPRESENTANTES */}
      {responding && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd" }}>
          <h3>Representantes</h3>
          <p>
            <b>Responde:</b> {responding.playerName} (
            {teamsSorted.find((t) => t.id === responding.teamId)?.name ?? responding.teamId})
          </p>
          <ul>
            {Object.values(round.ratingTeams || {}).map((rt: any) => (
              <li key={rt.teamId}>
                {rt.playerName} ({rt.teamName})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
