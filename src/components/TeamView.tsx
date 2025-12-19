// src/components/TeamView.tsx

import { useEffect, useMemo, useState } from "react";
import type { Team, Round, Rating, RatingColor } from "../types/game";

import {
  subscribeToGame,
  setRoundHasResponded,
  validateRating,
  addRating,
  awardPoints,
  updatePlayerScoreSmart,
  updatePlayerLastPlaceCounterSmart,
  prepareNextRound,
  arePointsConfirmed,
  markPointsAsConfirmed,
  areAllTeamsStage1Complete, // ✅ NUEVO (transición Stage 1 → Stage 2)
} from "../services/gameRepository";

import { ref, update } from "firebase/database";
import { database } from "../firebase.config";

import "./TeamView.css";

interface TeamViewProps {
  gameId: string;
  team: Team;
  currentRound: Round;
  currentQuestion: string;
  totalStage1Questions: number;
}

type Phase = "response" | "rating" | "validation";

export function TeamView({
  gameId,
  team,
  currentRound,
  currentQuestion,
  totalStage1Questions,
}: TeamViewProps) {
  const [validations, setValidations] = useState<Record<string, boolean>>({});
  const [allValidated, setAllValidated] = useState(false);

  const [liveRatings, setLiveRatings] = useState<Record<string, Rating>>({});
  const [lastRoundPoints, setLastRoundPoints] = useState<Record<string, number>>({});

  const [phase, setPhase] = useState<Phase>("response");
  const [hasResponded, setHasResponded] = useState(false);

  const [isConfirmingPoints, setIsConfirmingPoints] = useState(false);
  const [pointsAlreadyConfirmed, setPointsAlreadyConfirmed] = useState(false);
  const [showPedagogicalTip, setShowPedagogicalTip] = useState(false);

  const displayRoundNumber = currentRound?.roundNumber ?? 0;

  // =========================
  // Verificar 1-shot si ya confirmaron puntos
  // =========================
  useEffect(() => {
    const checkConfirmation = async () => {
      const rn = currentRound?.roundNumber;
      if (rn === undefined) return;
      try {
        const confirmed = await arePointsConfirmed(gameId, rn);
        setPointsAlreadyConfirmed(confirmed);
      } catch {
        // si falla, no bloqueamos la UI
      }
    };
    checkConfirmation();
  }, [gameId, currentRound?.roundNumber]);

  // =========================
  // Suscripción a Stage 1 rounds (live)
  // =========================
  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (game) => {
      if (!game?.stage1Rounds) return;

      const rn = (game.status as any)?.currentRound ?? 0;

      const round: any =
        (game.stage1Rounds as any)?.[rn] ?? (game.stage1Rounds as any)?.[String(rn)];

      if (!round) return;

      setLiveRatings(round.ratings || {});
      setLastRoundPoints(round.pointsAwarded || {});
      setHasResponded(round.hasResponded === true);
      setPointsAlreadyConfirmed(round.pointsConfirmed === true);
    });

    return () => unsubscribe();
  }, [gameId]);

  // =========================
  // Reset al cambiar de ronda
  // =========================
  useEffect(() => {
    setValidations({});
    setAllValidated(false);
    setLastRoundPoints({});
    setHasResponded(false);
    setPhase("response");
    setLiveRatings({}); // ✅ crítico para no arrastrar ratings viejos
    // ❌ NO resetear pointsAlreadyConfirmed: viene de Firebase
  }, [currentRound?.roundNumber]);

  // =========================
  // Orden de calificadores (de menor a mayor score, excluye respondedor)
  // =========================
  const ratersInOrder = useMemo(() => {
    const respondingId = currentRound?.respondingPlayerId;
    return [...(team.players ?? [])]
      .filter((p) => p.id !== respondingId)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  }, [team.players, currentRound?.respondingPlayerId]);

  const currentRaterIndex = useMemo(() => {
    return ratersInOrder.findIndex((p) => !liveRatings[p.id]);
  }, [ratersInOrder, liveRatings]);

  const currentRater = currentRaterIndex >= 0 ? ratersInOrder[currentRaterIndex] : null;

  const ratingsCount = Object.keys(liveRatings).length;
  const totalRaters = ratersInOrder.length;

  // =========================
  // Cambio automático de fase
  // =========================
  useEffect(() => {
    if (!hasResponded) {
      setPhase("response");
      return;
    }

    if (totalRaters === 0) {
      setPhase("rating");
      return;
    }

    if (ratingsCount === totalRaters && ratingsCount > 0) {
      setPhase("validation");
    } else {
      setPhase("rating");
    }
  }, [hasResponded, ratingsCount, totalRaters]);

  // =========================
  // Auto-aceptar verdes al entrar en validación
  // =========================
  useEffect(() => {
    if (phase !== "validation") return;

    setValidations((prev) => {
      const next = { ...prev };

      for (const [playerId, rating] of Object.entries(liveRatings)) {
        if (rating?.color === "green" && next[playerId] === undefined) {
          next[playerId] = true;
          validateRating(gameId, displayRoundNumber, playerId, true).catch(() => {});
        }
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, liveRatings, gameId, displayRoundNumber]);

  // =========================
  // allValidated: solo amarillo/rojo requieren decisión
  // =========================
  useEffect(() => {
    const needValidation = Object.entries(liveRatings).filter(
      ([, r]) => r.color === "yellow" || r.color === "red"
    );

    if (needValidation.length === 0) {
      setAllValidated(true);
      return;
    }

    const allDone = needValidation.every(([playerId]) => validations[playerId] !== undefined);
    setAllValidated(allDone);
  }, [validations, liveRatings]);

  // =========================
  // Handlers Stage 1
  // =========================
  const handleMarkResponded = async () => {
    const targetRoundNumber = currentRound?.roundNumber ?? displayRoundNumber ?? 0;

    try {
      console.log("🟦 Click: YA RESPONDIMOS", { gameId, targetRoundNumber });
      await setRoundHasResponded(gameId, targetRoundNumber, true);
      console.log("✅ setRoundHasResponded OK");
    } catch (error) {
      console.error("❌ Error marcando responded:", error);
      alert("Error al marcar respuesta. Intentá de nuevo.");
    }
  };

  // 🔒 Wrapper anti-overlay / anti-captura (sin tocar CSS)
  const handleMarkRespondedClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void handleMarkResponded();
  };

  const handleRating = async (playerId: string, playerName: string, color: RatingColor) => {
    console.log("🔥 handleRating ejecutado:", { playerId, playerName, color });
    console.log("gameId:", gameId);
    console.log("roundNumber:", currentRound?.roundNumber);

    const targetRoundNumber = currentRound?.roundNumber ?? 0;

    const rating: Rating = {
      playerId,
      playerName,
      color,
      validated: true,
    };

    try {
      console.log("🚀 Llamando a addRating...");
      await addRating(gameId, targetRoundNumber, rating);
      console.log("✅ addRating completado");
    } catch (error) {
      console.error("❌ Error adding rating:", error);
      alert("Error al guardar la calificación");
    }
  };

  const handleSetValidation = async (playerId: string, value: boolean) => {
    setValidations((prev) => ({ ...prev, [playerId]: value }));

    try {
      await validateRating(gameId, displayRoundNumber, playerId, value);
    } catch (error) {
      console.error("❌ Error validando rating:", error);
      alert("Error al validar calificación");
    }
  };

  const calculatePoints = (): Record<string, number> => {
    const points: Record<string, number> = {};

    const ratingsArray = Object.values(liveRatings || {});
    const answerWasCorrect = (currentRound as any)?.answerWasCorrect !== false; // fallback legacy

    // Respondedor (si la respuesta queda como correcta)
    if (currentRound?.respondingPlayerId && answerWasCorrect) {
      points[currentRound.respondingPlayerId] = 12;
    }

    ratingsArray.forEach((rating) => {
      const isValidated = validations[rating.playerId] === true;

      if (!isValidated) return;

      if (rating.color === "green") {
        points[rating.playerId] = 5;
      } else if (rating.color === "yellow") {
        points[rating.playerId] = 10;
      } else if (rating.color === "red") {
        if (!answerWasCorrect) {
          points[rating.playerId] = 10;
          ratingsArray.forEach((r) => {
            if (r.color !== "red") points[r.playerId] = 0;
          });
        } else {
          points[rating.playerId] = 0;
        }
      }
    });

    return points;
  };

  const updateLastPlaceCounters = async () => {
    if (!team.players || team.players.length === 0) return;

    const minScore = Math.min(...team.players.map((p) => p.score ?? 0));

    const lastPlaceIdsLocal = new Set(
      team.players.filter((p) => (p.score ?? 0) === minScore).map((p) => p.id)
    );

    for (const player of team.players) {
      if (lastPlaceIdsLocal.has(player.id)) {
        const newCount = (player.consecutiveLastPlace ?? 0) + 1;
        await updatePlayerLastPlaceCounterSmart(gameId, team.id, player.id, newCount);
      } else {
        if ((player.consecutiveLastPlace ?? 0) > 0) {
          await updatePlayerLastPlaceCounterSmart(gameId, team.id, player.id, 0);
        }
      }
    }
  };

  const handleConfirmPoints = async () => {
    const targetRoundNumber = currentRound?.roundNumber ?? 0;

    try {
      const alreadyConfirmed = await arePointsConfirmed(gameId, targetRoundNumber);
      if (alreadyConfirmed) {
        console.log("⚠️ Puntos ya confirmados - solo avanzando ronda (prepareNextRound)");
        await prepareNextRound(gameId, team.id);

        const allComplete = await areAllTeamsStage1Complete(gameId);
        if (allComplete) {
          await update(ref(database), {
            [`games/${gameId}/status/status`]: "transition",
            [`games/${gameId}/status/currentStage`]: 2,
            [`games/${gameId}/updatedAt`]: Date.now(),
          });
        }
        return;
      }
    } catch (e) {
      console.warn("⚠️ No se pudo verificar arePointsConfirmed, intentando flujo normal", e);
    }

    if (phase !== "validation") {
      alert("Primero deben calificar todos (Fase 1).");
      return;
    }

    if (!allValidated) {
      alert("Debés completar la validación (Fase 2) antes de confirmar puntos.");
      return;
    }

    setIsConfirmingPoints(true);

    try {
      await markPointsAsConfirmed(gameId, targetRoundNumber);
      console.log("🔒 Ronda marcada como confirmada");

      const points = calculatePoints();
      setLastRoundPoints(points);
      console.log("📊 Puntos calculados:", points);

      await awardPoints(gameId, targetRoundNumber, points);
      console.log("💾 Puntos guardados en Firebase");

      for (const [playerId, earnedPoints] of Object.entries(points)) {
        if (earnedPoints > 0) {
          const player = team.players.find((p) => p.id === playerId);
          if (player) {
            const newScore = (player.score ?? 0) + earnedPoints;
            await updatePlayerScoreSmart(gameId, team.id, playerId, newScore);
          }
        }
      }
      console.log("👥 Scores actualizados");

      await updateLastPlaceCounters();
      console.log("📉 Contadores actualizados");

      await prepareNextRound(gameId, team.id);
      console.log("⏭️ prepareNextRound ejecutado");

      const allComplete = await areAllTeamsStage1Complete(gameId);
      if (allComplete) {
        console.log("🎉 Todos los equipos completaron Stage 1 → transition");
        await update(ref(database), {
          [`games/${gameId}/status/status`]: "transition",
          [`games/${gameId}/status/currentStage`]: 2,
          [`games/${gameId}/updatedAt`]: Date.now(),
        });
      }

      setShowPedagogicalTip(true);
      setTimeout(() => setShowPedagogicalTip(false), 3000);
    } catch (error) {
      console.error("❌ Error confirmando puntos:", error);
      alert("Error al confirmar puntos. Intentá de nuevo.");
    } finally {
      setIsConfirmingPoints(false);
    }
  };

  // =========================
  // UI helpers
  // =========================
  const rankedPlayers = [...(team.players ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const lowestScorePlayer = rankedPlayers[rankedPlayers.length - 1];

  const respondingPlayer = team.players.find((p) => p.id === currentRound.respondingPlayerId);

  const pendingValidations = ratersInOrder.filter((p) => {
    const r = liveRatings[p.id];
    if (!r) return false;
    if (r.color !== "yellow" && r.color !== "red") return false;
    return validations[p.id] === undefined;
  });

  // =========================
  // Render
  // =========================
  return (
    <div className="team-view">
      <div className="header">
        <h1>{team.name}</h1>
        <p>
          Ronda {displayRoundNumber + 1} / {totalStage1Questions}
        </p>
      </div>

      {showPedagogicalTip && (
        <div className="pedagogical-tip">✅ ¡Puntos confirmados! Avanzando a la siguiente ronda…</div>
      )}

      <div className="question-section">
        <h2>Pregunta</h2>
        <p className="question-text">{currentQuestion}</p>
      </div>

      {phase === "response" && (
        <div className="response-phase">
          <div className="phase-instruction">🎤 Turno de respuesta</div>

          <div className="status-box">
            <div className="status-content">
              <div className="status-row main-action">
                <span className="status-label">Responde:</span>
                <span className="status-action">
                  <strong>{respondingPlayer?.name ?? "—"}</strong>
                </span>
              </div>
            </div>
          </div>

          {!hasResponded ? (
            <button
              type="button"
              className="btn-responded"
              onClick={handleMarkRespondedClick}
              disabled={hasResponded}
            >
              ✅ Ya respondimos (pasar a calificación)
            </button>
          ) : (
            <div className="ok-banner">✅ Ya está marcada la respuesta.</div>
          )}
        </div>
      )}

      {phase === "rating" && (
        <div className="ratings-container">
          <h3>🧪 Calificación</h3>
          <p className="phase-instruction">
            Progreso: <strong>{ratingsCount}</strong> / {totalRaters}
          </p>

          {totalRaters === 0 ? (
            <div className="ok-banner">No hay calificadores en esta ronda.</div>
          ) : currentRater ? (
            <div className="rater-row current-turn">
              <div className="rater-info">
                <span className="rater-number">🎯</span>
                <span className="rater-name">
                  Califica ahora: <strong>{currentRater.name}</strong>
                </span>
              </div>

              <div className="color-buttons">
                <button
                  type="button"
                  className="color-btn green"
                  onClick={() => handleRating(currentRater.id, currentRater.name, "green")}
                >
                  🟩 Verde
                </button>
                <button
                  type="button"
                  className="color-btn yellow"
                  onClick={() => handleRating(currentRater.id, currentRater.name, "yellow")}
                >
                  🟨 Amarillo
                </button>
                <button
                  type="button"
                  className="color-btn red"
                  onClick={() => handleRating(currentRater.id, currentRater.name, "red")}
                >
                  🟥 Rojo
                </button>
              </div>
            </div>
          ) : (
            <div className="ok-banner">✅ Todos calificaron. Pasando a validación…</div>
          )}

          {Object.keys(liveRatings).length > 0 && (
            <div className="ratings-list">
              {Object.values(liveRatings).map((r) => (
                <div key={r.playerId} className="rater-row completed">
                  <div className="rater-info">
                    <span className="rater-name">{r.playerName}</span>
                  </div>
                  <div className="rating-display">
                    <span className={`vote-pill ${r.color}`}>{r.color.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "validation" && (
        <div className="ratings-container">
          <h3>✅ Validación (solo amarillos y rojos)</h3>

          {pendingValidations.length === 0 ? (
            <div className="ok-banner">✅ No quedan validaciones pendientes.</div>
          ) : (
            <>
              <p className="phase-instruction">
                Pendientes: <strong>{pendingValidations.length}</strong>
              </p>

              <div className="validation-list">
                {pendingValidations.map((p) => {
                  const r = liveRatings[p.id];
                  if (!r) return null;

                  return (
                    <div key={p.id} className="validation-row needs-validation">
                      <div className="rater-info">
                        <span className="rater-name">{p.name}</span>
                        <span className={`vote-pill ${r.color}`}>{r.color.toUpperCase()}</span>
                      </div>

                      <div className="validation-buttons">
                        <button
                          type="button"
                          className="validation-btn accept"
                          onClick={() => handleSetValidation(p.id, true)}
                        >
                          ✅ Aceptar
                        </button>
                        <button
                          type="button"
                          className="validation-btn reject"
                          onClick={() => handleSetValidation(p.id, false)}
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn-confirm-points"
              onClick={handleConfirmPoints}
              disabled={isConfirmingPoints || pointsAlreadyConfirmed}
            >
              {pointsAlreadyConfirmed
                ? "🔒 Puntos ya confirmados"
                : isConfirmingPoints
                ? "⏳ Confirmando..."
                : "✅ Confirmar puntos"}
            </button>
          </div>

          {Object.keys(lastRoundPoints).length > 0 && (
            <div className="points-box">
              <div className="points-title">Puntos de la ronda</div>
              {Object.entries(lastRoundPoints).map(([pid, pts]) => (
                <div key={pid} className="points-row">
                  <span>{team.players.find((pl) => pl.id === pid)?.name ?? pid}</span>
                  <strong>{pts}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ranking-section">
        <h3>📊 Puntaje del equipo</h3>

        {rankedPlayers.map((p) => {
          const isLast = lowestScorePlayer?.id === p.id;
          return (
            <div key={p.id} className={`ranking-item ${isLast ? "last" : ""}`}>
              <span>{p.name}</span>
              <strong>{p.score ?? 0}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
