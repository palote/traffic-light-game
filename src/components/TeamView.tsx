// src/components/TeamView.tsx

import { useEffect, useMemo, useState } from 'react';
import { ref, update } from 'firebase/database';
import { database } from '../firebase.config';
import type { Team, Round, Rating, RatingColor } from '../types/game';

import {
  subscribeToGame,
  setRoundHasResponded,
  validateRating,
  addRating,
  awardPoints,
  updatePlayerScoreSmartCompat,
  updatePlayerLastPlaceCounterSmartCompat,
  prepareNextRound,
  arePointsConfirmed,
  markPointsAsConfirmed,
  areAllTeamsStage1Complete,
} from '../services/gameRepository';

import './TeamView.css';

interface TeamViewProps {
  gameId: string;
  team: Team;
  currentRound: Round;
  currentQuestion: string;
  totalStage1Questions: number;
}

export function TeamView({
  gameId,
  team,
  currentRound,
  currentQuestion,
  totalStage1Questions,
}: TeamViewProps) {
  const [validations, setValidations] = useState<{ [playerId: string]: boolean }>({});
  const [allValidated, setAllValidated] = useState(false);
  const [liveRatings, setLiveRatings] = useState<{ [playerId: string]: Rating }>({});
  const [lastRoundPoints, setLastRoundPoints] = useState<{ [playerId: string]: number }>({});
  const [phase, setPhase] = useState<'response' | 'rating' | 'validation'>('response');
  const [hasResponded, setHasResponded] = useState(false);

  const [isConfirmingPoints, setIsConfirmingPoints] = useState(false);
  const [pointsAlreadyConfirmed, setPointsAlreadyConfirmed] = useState(false);
  const [showPedagogicalTip, setShowPedagogicalTip] = useState(false);

  const displayRoundNumber = currentRound?.roundNumber ?? 0;

  // =========================
  // Verificar si los puntos ya fueron confirmados (1-shot)
  // =========================
  useEffect(() => {
    const checkConfirmation = async () => {
      const targetRoundNumber = currentRound?.roundNumber;
      if (targetRoundNumber === undefined) return;
      const confirmed = await arePointsConfirmed(gameId, team.id, targetRoundNumber);
      setPointsAlreadyConfirmed(confirmed);
    };
    checkConfirmation();
  }, [gameId, team.id, currentRound?.roundNumber]);

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (game) => {
      if (!game?.teams) return;

      // ✅ NUEVO: Leer del equipo específico
      const teamData = (game.teams as any)?.[team.id];
      if (!teamData) return;

      const rn = teamData.currentRound ?? 0;
      const round: any = teamData.stage1Rounds?.[rn] ?? teamData.stage1Rounds?.[String(rn)];

      if (!round) return;

      setLiveRatings(round.ratings || {});
      setLastRoundPoints(round.pointsAwarded || {});
      setHasResponded(round.hasResponded === true);
      setPointsAlreadyConfirmed(round.pointsConfirmed === true);
    });

    return () => unsubscribe();
  }, [gameId, team.id, currentRound?.roundNumber]);

  // =========================
  // Reset al cambiar de ronda
  // =========================
  useEffect(() => {
    setValidations({});
    setAllValidated(false);
    setLastRoundPoints({});
    setHasResponded(false);
    setPhase('response');
    setLiveRatings({});
  }, [currentRound?.roundNumber]);

  // =========================
  // Orden ascendente de calificadores
  // =========================
  const ratersInOrder = useMemo(() => {
    const respondingId = currentRound?.respondingPlayerId;
    return [...team.players]
      .filter((p) => p.id !== respondingId)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  }, [team.players, currentRound?.respondingPlayerId]);

  const currentRaterIndex = useMemo(() => {
    return ratersInOrder.findIndex((p) => !liveRatings[p.id]);
  }, [ratersInOrder, liveRatings]);

  const currentRater = currentRaterIndex >= 0 ? ratersInOrder[currentRaterIndex] : null;

  const ratingsCount = Object.keys(liveRatings).length;
  const totalRaters = ratersInOrder.length;
  const ratingProgress = `${ratingsCount} de ${totalRaters} calificaron`;

  // =========================
  // Cambio automático de fase
  // =========================
  useEffect(() => {
    if (!hasResponded) {
      setPhase('response');
      return;
    }

    if (totalRaters === 0) {
      setPhase('rating');
      return;
    }

    if (ratingsCount === totalRaters && ratingsCount > 0) {
      setPhase('validation');
    } else {
      setPhase('rating');
    }
  }, [hasResponded, ratingsCount, totalRaters]);

  // =========================
  // Auto-aceptar verdes al entrar en validación
  // =========================
  useEffect(() => {
    if (phase !== 'validation') return;

    setValidations((prev) => {
      const next = { ...prev };
      for (const [playerId, rating] of Object.entries(liveRatings)) {
        if (rating?.color === 'green' && next[playerId] === undefined) {
          next[playerId] = true;
          validateRating(gameId, team.id, currentRound?.roundNumber ?? 0, playerId, true)
            .catch(() => { });
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, liveRatings, gameId, team.id, displayRoundNumber]);

  // =========================
  // allValidated: solo amarillo/rojo requieren validación
  // =========================
  useEffect(() => {
    const needValidation = Object.entries(liveRatings).filter(
      ([, rating]) => rating.color === 'yellow' || rating.color === 'red'
    );

    if (needValidation.length === 0) {
      setAllValidated(true);
      return;
    }

    const allDone = needValidation.every(([playerId]) => validations[playerId] !== undefined);
    setAllValidated(allDone);
  }, [validations, liveRatings]);

  // =========================
  // Handlers
  // =========================
  const handleRating = async (playerId: string, playerName: string, color: RatingColor) => {
    const targetRoundNumber = currentRound?.roundNumber ?? 0;

    const rating: Rating = {
      playerId,
      playerName,
      color,
      validated: true,
    };

    try {
      await addRating(gameId, team.id, targetRoundNumber, rating);
    } catch (error) {
      console.error('Error adding rating:', error);
      alert('Error al guardar la calificación');
    }
  };

  const handleSetValidation = async (playerId: string, value: boolean) => {
    setValidations((prev) => ({ ...prev, [playerId]: value }));
    try {
      await validateRating(gameId, team.id, displayRoundNumber, playerId, value);
    } catch (error) {
      console.error('Error validating rating:', error);
    }
  };

  const handleMarkResponded = async () => {
    try {
      await setRoundHasResponded(gameId, team.id, displayRoundNumber, true);
    } catch (e) {
      console.error('Error setting hasResponded:', e);
      alert('Error al marcar "ya respondió".');
    }
  };

  const calculatePoints = (): { [playerId: string]: number } => {
    const points: { [playerId: string]: number } = {};
    const ratingsArray = Object.values(liveRatings);

    // Inicializar todos en 0
    team.players.forEach((p) => (points[p.id] = 0));

    // Solo contar ratings validados (aceptados)
    const validatedRatings = ratingsArray.filter((rating) => validations[rating.playerId] === true);

    // ✅ NUEVO: Verificar si hay algún ROJO VALIDADO
    const hasValidatedRed = validatedRatings.some((rating) => rating.color === 'red');

    // Si hay rojo validado → respuesta INCORRECTA
    if (hasValidatedRed) {
      // Solo los rojos validados reciben 10 puntos
      validatedRatings.forEach((rating) => {
        if (rating.color === 'red') {
          points[rating.playerId] = 10;
        }
        // Verdes y amarillos quedan en 0 (ya inicializados)
      });

      // Respondedor NO recibe puntos (respuesta incorrecta)
      points[currentRound.respondingPlayerId] = 0;

    } else {
      // No hay rojos validados → respuesta CORRECTA

      // Verificar que haya al menos un verde o amarillo validado
      const hasValidatedGreenOrYellow = validatedRatings.some(
        (rating) => rating.color === 'green' || rating.color === 'yellow'
      );

      if (hasValidatedGreenOrYellow) {
        // Respondedor recibe 12 puntos (respuesta correcta)
        points[currentRound.respondingPlayerId] = 12;

        // Distribuir puntos a los calificadores validados
        validatedRatings.forEach((rating) => {
          if (rating.color === 'green') {
            points[rating.playerId] = 5;
          } else if (rating.color === 'yellow') {
            points[rating.playerId] = 10;
          }
          // Rojos no validados quedan en 0
        });
      }
    }

    return points;
  };

  const updateLastPlaceCounters = async () => {
    if (!team.players || team.players.length === 0) return;

    const minScore = Math.min(...team.players.map(p => p.score ?? 0));

    const lastPlaceIdsLocal = new Set(
      team.players
        .filter(p => (p.score ?? 0) === minScore)
        .map(p => p.id)
    );

    for (const player of team.players) {
      if (lastPlaceIdsLocal.has(player.id)) {
        const newCount = (player.consecutiveLastPlace ?? 0) + 1;
        await updatePlayerLastPlaceCounterSmartCompat(gameId, team.id, player.id, newCount);
      } else {
        if ((player.consecutiveLastPlace ?? 0) > 0) {
          await updatePlayerLastPlaceCounterSmartCompat(gameId, team.id, player.id, 0);
        }
      }
    }
  };

  const handleConfirmPoints = async () => {
    const targetRoundNumber = currentRound?.roundNumber ?? 0;

    try {
      const alreadyConfirmed = await arePointsConfirmed(gameId, team.id, targetRoundNumber);
      if (alreadyConfirmed) {
        console.log('⚠️ Puntos ya confirmados - solo avanzando ronda (prepareNextRound)');
        await prepareNextRound(gameId, team.id);

        const allComplete = await areAllTeamsStage1Complete(gameId);
        if (allComplete) {
          console.log('🎉 Todos los equipos completaron Stage 1');
          await update(ref(database), {
            [`games/${gameId}/status/status`]: 'transition',
            [`games/${gameId}/status/currentStage`]: 2,
            [`games/${gameId}/updatedAt`]: Date.now(),
          });
        }

        return;
      }
    } catch (e) {
      console.warn('⚠️ No se pudo verificar arePointsConfirmed, intentando flujo normal', e);
    }

    if (phase !== 'validation') {
      alert('Primero deben calificar todos (Fase 1).');
      return;
    }

    if (!allValidated) {
      alert('Debés completar la validación (Fase 2) antes de confirmar puntos.');
      return;
    }

    setIsConfirmingPoints(true);

    try {
      await markPointsAsConfirmed(gameId, team.id, targetRoundNumber);
      console.log('🔒 Ronda marcada como confirmada');

      const points = calculatePoints();
      setLastRoundPoints(points);
      console.log('📊 Puntos calculados:', points);

      await awardPoints(gameId, team.id, targetRoundNumber, points);
      console.log('💾 Puntos guardados en Firebase');

      for (const [playerId, earnedPoints] of Object.entries(points)) {
        if (earnedPoints > 0) {
          const player = team.players.find((p) => p.id === playerId);
          if (player) {
            const newScore = (player.score ?? 0) + earnedPoints;
            console.log(`💰 ${player.name}: ${player.score} + ${earnedPoints} = ${newScore}`);
            await updatePlayerScoreSmartCompat(gameId, team.id, playerId, newScore);
          }
        }
      }
      console.log('👥 Scores actualizados');

      await updateLastPlaceCounters();
      console.log('📉 Contadores actualizados');

      await prepareNextRound(gameId, team.id);
      console.log('⏭️ prepareNextRound ejecutado');

      const allComplete = await areAllTeamsStage1Complete(gameId);
      if (allComplete) {
        console.log('🎉 Todos los equipos completaron Stage 1');
        await update(ref(database), {
          [`games/${gameId}/status/status`]: 'transition',
          [`games/${gameId}/status/currentStage`]: 2,
          [`games/${gameId}/updatedAt`]: Date.now(),
        });
      }

      setShowPedagogicalTip(true);
      setTimeout(() => setShowPedagogicalTip(false), 3000);

    } catch (error) {
      console.error('❌ Error confirmando puntos:', error);
      alert('Error al confirmar puntos. Intentá de nuevo.');
    } finally {
      setIsConfirmingPoints(false);
    }
  };

  // =========================
  // UI helpers
  // =========================
  const rankedPlayers = [...team.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const lowestScorePlayer = rankedPlayers[rankedPlayers.length - 1];

  const respondingPlayer = team.players.find((p) => p.id === currentRound.respondingPlayerId);

  const pendingValidations = ratersInOrder.filter((p) => {
    const r = liveRatings[p.id];
    if (!r) return false;
    if (r.color !== 'yellow' && r.color !== 'red') return false;
    return validations[p.id] === undefined;
  });

  const currentValidationTurnPlayerId = pendingValidations[0]?.id;

  const totalNeedValidation = useMemo(() => {
    return ratersInOrder.filter((p) => {
      const r = liveRatings[p.id];
      return r && (r.color === 'yellow' || r.color === 'red');
    }).length;
  }, [ratersInOrder, liveRatings]);

  const validatedRelevantCount = useMemo(() => {
    return Object.keys(validations).filter((pid) => {
      const r = liveRatings[pid];
      return r && (r.color === 'yellow' || r.color === 'red');
    }).length;
  }, [validations, liveRatings]);

  const validationProgressPercent = (validatedRelevantCount / Math.max(totalNeedValidation, 1)) * 100;

  const lastPlaceIds = useMemo(() => {
    if (!team.players || team.players.length === 0) return new Set<string>();

    const minScore = Math.min(...team.players.map(p => p.score ?? 0));

    return new Set(
      team.players
        .filter(p => (p.score ?? 0) === minScore)
        .map(p => p.id)
    );
  }, [team.players]);

  if ((team as any)?.stage1Completed === true) {
    return (
      <div className="team-view">
        <div className="header">
          <h1>🎮 {team.name}</h1>
          <p>✅ Este equipo terminó Stage 1</p>
          <p>⏳ Esperando a que los demás equipos terminen...</p>
        </div>
      </div>
    );
  }

  // =========================
  // Render
  // =========================
  return (
    <div className="team-view">
      <div className="header">
        <h1>🎮 {team.name}</h1>
        <p>
          Etapa 1 | Ronda {displayRoundNumber + 1} de {totalStage1Questions}
        </p>
      </div>

      {(lowestScorePlayer?.consecutiveLastPlace ?? 0) >= 2 && (
        <div className="reminder pedagogical">
          💡 <strong>Recordatorio pedagógico:</strong> Si alguien está teniendo dificultades sostenidas, es un buen
          momento para pausar y reforzar la comprensión como equipo.
        </div>
      )}

      <div className="question-section">
        <h2>📝 PREGUNTA DE ESTA RONDA:</h2>
        <div className="question-text">{currentQuestion}</div>
      </div>

      {phase === 'response' ? (
        <div className="response-phase">
          <div className="response-instructions">
            <p>
              🎤 <strong>{respondingPlayer?.name || 'El jugador'}</strong> está respondiendo la pregunta en voz alta.
            </p>

            {(currentRound as any)?.captainName && (
              <p className="captain-inline">
                📱 <strong>Capitán del dispositivo:</strong>{' '}
                <span className="captain-name-inline">
                  {(currentRound as any).captainName}
                </span>
              </p>
            )}

            <p>👂 El resto del equipo escucha con atención para poder calificar después.</p>

            <p className="tip">
              💡 <em>Tip: Presten atención a si la respuesta es completa y correcta.</em>
            </p>
          </div>

          <button className="btn-responded" onClick={handleMarkResponded} disabled={hasResponded}>
            {hasResponded ? '✅ Ya marcado' : '✅ YA RESPONDIÓ (pasar a calificar)'}
          </button>
        </div>
      ) : phase === 'rating' ? (
        <div className="ratings-container">
          <h3>💬 FASE 1: CALIFICAR LA RESPUESTA</h3>
          <p className="phase-instruction">Cada uno califica en orden, de menor a mayor puntaje</p>

          <div className="legend-items">
            <div className="legend-item green">
              <span className="legend-color">🟩 VERDE</span>
              <span className="legend-sep">—</span>
              <span className="legend-description">La respuesta es correcta y no quiero agregar nada</span>
              <span className="legend-points">+5 pts</span>
            </div>

            <div className="legend-item yellow">
              <span className="legend-color">🟨 AMARILLO</span>
              <span className="legend-sep">—</span>
              <span className="legend-description">
                La respuesta es correcta pero hay algo importante que deseo agregar o relacionar
              </span>
              <span className="legend-points">+10 pts</span>
            </div>

            <div className="legend-item red">
              <span className="legend-color">🟥 ROJO</span>
              <span className="legend-sep">—</span>
              <span className="legend-description">La respuesta es incorrecta y voy a explicar exactamente por qué</span>
              <span className="legend-points">+10 pts*</span>
            </div>

            <p className="legend-note">
              . . . . . . . . . . . . . . . . . . .
            </p>
          </div>

          {ratersInOrder.map((player, index) => {
            const hasRated = !!liveRatings[player.id];
            const isCurrentTurn = currentRater?.id === player.id;
            const isBlocked = !hasRated && !isCurrentTurn;
            const rating = liveRatings[player.id];
            const isLastPlace = lastPlaceIds.has(player.id);

            return (
              <div
                key={player.id}
                className={`rater-row
                  ${isCurrentTurn ? 'current-turn' : ''}
                  ${isBlocked ? 'blocked' : ''}
                  ${hasRated ? 'completed' : ''}
                  ${isLastPlace ? 'last-place' : ''}
                `}
              >
                <div className="rater-info">
                  <span className="rater-number">{index + 1}️⃣</span>
                  <span className="rater-name">{player.name}</span>
                  <span className="rater-score">({player.score ?? 0} pts)</span>

                  {isCurrentTurn && <span className="turn-indicator">⬅️ TU TURNO 🔥</span>}
                  {isBlocked && <span className="blocked-indicator">🔒</span>}
                  {hasRated && <span className="completed-indicator">✅</span>}
                </div>

                {hasRated ? (
                  <div className="rating-display">
                    <span className={`vote-pill ${rating.color}`}>
                      {rating.color === 'green' && '🟩 Verde'}
                      {rating.color === 'yellow' && '🟨 Amarillo'}
                      {rating.color === 'red' && '🟥 Rojo'}
                    </span>
                  </div>
                ) : isCurrentTurn ? (
                  <div className="color-buttons">
                    <button className="color-btn green" onClick={() => handleRating(player.id, player.name, 'green')}>
                      🟩 Verde
                    </button>
                    <button className="color-btn yellow" onClick={() => handleRating(player.id, player.name, 'yellow')}>
                      🟨 Amarillo
                    </button>
                    <button className="color-btn red" onClick={() => handleRating(player.id, player.name, 'red')}>
                      🟥 Rojo
                    </button>
                  </div>
                ) : (
                  <div className="waiting-message">{isBlocked ? '⏳ Esperá - Pronto será tu turno' : '⏳ Esperando...'}</div>
                )}
              </div>
            );
          })}

          <div className="progress-bar">
            <div className="progress-text">{ratingProgress}</div>
            <div className="progress-visual">
              {'▓'.repeat(ratingsCount)}
              {'░'.repeat(Math.max(0, totalRaters - ratingsCount))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ratings-container">
          <h3>💬 FASE 2: VALIDAR JUSTIFICACIONES</h3>
          <p className="phase-instruction">Solo los votos amarillos y rojos necesitan justificación</p>

          <div className="validation-progress">
            <div className="progress-info">
              <span className="progress-label">Progreso de validación:</span>
              <span className="progress-numbers">
                {validatedRelevantCount} de {totalNeedValidation} validados
              </span>
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${validationProgressPercent}%` }} />
            </div>
          </div>

          {ratersInOrder.map((player, index) => {
            const rating = liveRatings[player.id];
            if (!rating) return null;

            const needsValidation = rating.color === 'yellow' || rating.color === 'red';
            const isValidated = validations[player.id] !== undefined;
            const isCurrentValidationTurn = currentValidationTurnPlayerId === player.id;
            const isLastPlace = lastPlaceIds.has(player.id);

            return (
              <div
                key={player.id}
                className={`validation-row
                   ${needsValidation ? 'needs-validation' : 'auto-accepted'}
                   ${isCurrentValidationTurn ? 'current-turn' : ''}
                    ${isLastPlace ? 'last-place' : ''}
                `}
              >
                <div className="validation-info">
                  <span className="rater-number">{index + 1}️⃣</span>
                  <span className="rater-name">{player.name}</span>
                  <span className={`vote-pill ${rating.color}`}>
                    {rating.color === 'green' && '🟩 Verde'}
                    {rating.color === 'yellow' && '🟨 Amarillo'}
                    {rating.color === 'red' && '🟥 Rojo'}
                  </span>
                </div>

                {needsValidation ? (
                  isValidated ? (
                    <div className="validation-result">
                      <span className={`validation-badge ${validations[player.id] ? 'accepted' : 'rejected'}`}>
                        {validations[player.id] ? '✅ Aceptado' : '❌ Rechazado'}
                      </span>
                    </div>
                  ) : isCurrentValidationTurn ? (
                    <div className="validation-controls">
                      <p className="validation-prompt">
                        💬 {player.name} está justificando su voto.
                        <br />
                        Escuchen con atención y decidan en equipo:
                      </p>

                      <div className="validation-buttons">
                        <button
                          className={`validation-btn reject ${validations[player.id] === false ? 'selected' : ''}`}
                          onClick={() => handleSetValidation(player.id, false)}
                        >
                          ❌ Rechazar
                        </button>

                        <button
                          className={`validation-btn accept ${validations[player.id] === true ? 'selected' : ''}`}
                          onClick={() => handleSetValidation(player.id, true)}
                        >
                          ✅ Aceptar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="waiting-validation">⏳ Esperando validar primero a los anteriores...</div>
                  )
                ) : (
                  <div className="auto-accepted-badge">✅ Aceptado automáticamente</div>
                )}
              </div>
            );
          })}

          {pointsAlreadyConfirmed && (
            <p>✅ Los puntos de esta ronda ya fueron confirmados</p>
          )}

          <button
            className="btn-confirm-points"
            onClick={handleConfirmPoints}
            disabled={isConfirmingPoints || !allValidated}
          >
            {pointsAlreadyConfirmed
              ? '▶️ Pasar a la siguiente ronda'
              : isConfirmingPoints
                ? '⏳ Confirmando...'
                : '✅ Confirmar puntos y avanzar'}
          </button>
        </div>
      )}

      {showPedagogicalTip && (
        <div className="pedagogical-tip">
          <div className="tip-icon">💡</div>
          <div className="tip-text">
            Recuerden: Lo importante no es ganar puntos, sino <strong>aprender juntos</strong>
          </div>
        </div>
      )}

      <div className="ranking-section">
        <h3>📊 Ranking de {team.name}</h3>

        {rankedPlayers.map((player, index) => {
          const minScore = rankedPlayers[rankedPlayers.length - 1]?.score ?? 0;
          const isLast = (player.score ?? 0) === minScore;

          return (
            <div key={player.id} className={`ranking-item ${isLast ? 'last' : ''}`}>
              <div>
                <span>
                  {index + 1}. {player.name}
                </span>
              </div>
              <span>{player.score ?? 0} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}