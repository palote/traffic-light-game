// src/components/StudentView.tsx

import { useState, useEffect } from 'react';
import type { Team, Player, RatingColor, GameLabels } from '../types/game';
import { addRating } from '../services/gameRepository';
import './StudentView.css';

interface StudentViewProps {
  gameId: string;
  playerId: string;
  team: Team;
  currentRound: number;
  currentQuestion: string;
  currentQuestionHint: string;
  respondingPlayer: Player | null;
  isMyTurn: boolean;
  labels: GameLabels;
  onRatingSubmitted: () => void;
}

export function StudentView({
  gameId,
  playerId,
  team,
  currentRound,
  currentQuestion,
  currentQuestionHint,
  respondingPlayer,
  isMyTurn,
  labels,
  onRatingSubmitted
}: StudentViewProps) {
  const [selectedRating, setSelectedRating] = useState<RatingColor | null>(null);
  const [hasRated, setHasRated] = useState(false);

  // Encontrar mi jugador
  const me = team.players.find(p => p.id === playerId);
  
  // Ordenar jugadores por puntaje para mostrar ranking
  const rankedPlayers = [...team.players].sort((a, b) => b.score - a.score);
  const myPosition = rankedPlayers.findIndex(p => p.id === playerId) + 1;

  // Reset cuando cambia la ronda
  useEffect(() => {
    setSelectedRating(null);
    setHasRated(false);
  }, [currentRound]);

  // Reset cuando cambia el jugador (para testing)
  useEffect(() => {
    setSelectedRating(null);
    setHasRated(false);
  }, [playerId]);

  const handleRatingSubmit = async () => {
    if (!selectedRating || !me || !respondingPlayer) return;

    try {
      await addRating(gameId, currentRound, {
        playerId: me.id,
        playerName: me.name,
        color: selectedRating,
        validated: false
      });

      setHasRated(true);
      onRatingSubmitted();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Error al enviar calificación');
    }
  };

  // Si es mi turno de responder
  if (isMyTurn) {
    return (
      <div className="student-view">
        <div className="header">
          <h1>{labels.gameTitle}</h1>
          <p>{team.name} | Ronda {currentRound}</p>
        </div>

        <div className="status-bar">
          <div><strong>Tu posición:</strong> {myPosition}°</div>
          <div><strong>Tus puntos:</strong> {me?.score || 0} pts</div>
        </div>

        <div className="turn-indicator your-turn">
          🎯 ¡ES TU TURNO DE RESPONDER!<br />
          Respondé oralmente a tu equipo
        </div>

        <div className="question-box">
          <h2>📝 PREGUNTA:</h2>
          <div className="question-text">{currentQuestion}</div>
          {currentQuestionHint && (
            <div className="hint-text">💡 Pista: {currentQuestionHint}</div>
          )}
        </div>

        <div className="waiting-message">
          <div className="icon">⏳</div>
          <p><strong>Esperando que termines de responder...</strong></p>
          <p>Tus compañeros te calificarán cuando termines</p>
        </div>

        <div className="ranking-box">
          <h3>📊 Ranking de {team.name}</h3>
          {rankedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`ranking-item ${player.id === playerId ? 'you' : ''} ${index === rankedPlayers.length - 1 ? 'last' : ''}`}
            >
              <span>{index + 1}. {player.name} {player.id === playerId ? '(VOS)' : ''}</span>
              <span>{player.score} pts</span>
            </div>
          ))}
        </div>

        <div className="help-message">{labels.helpMessage}</div>
      </div>
    );
  }

  // Si debo calificar a otro compañero
  if (respondingPlayer && respondingPlayer.id !== playerId) {
    return (
      <div className="student-view">
        <div className="header">
          <h1>{labels.gameTitle}</h1>
          <p>{team.name} | Ronda {currentRound}</p>
        </div>

        <div className="status-bar">
          <div><strong>Tu posición:</strong> {myPosition}°</div>
          <div><strong>Tus puntos:</strong> {me?.score || 0} pts</div>
        </div>

        <div className="turn-indicator waiting">
          👂 Responde: <strong>{respondingPlayer.name}</strong><br />
          Escuchá atentamente para calificar
        </div>

        <div className="question-box">
          <h2>📝 PREGUNTA:</h2>
          <div className="question-text">{currentQuestion}</div>
          {currentQuestionHint && (
            <div className="hint-text">💡 Pista: {currentQuestionHint}</div>
          )}
        </div>

        {!hasRated ? (
          <>
           <div className="rating-section">
      <h3>¿Cómo calificás la respuesta de {respondingPlayer.name}?</h3>

      <div className="rating-buttons">
        <button 
          className={`rating-btn green ${selectedRating === 'green' ? 'selected' : ''}`}
          onClick={() => setSelectedRating('green')}
        >
          {labels.ratingGreen} [+5]
        </button>

        <button 
          className={`rating-btn yellow ${selectedRating === 'yellow' ? 'selected' : ''}`}
          onClick={() => setSelectedRating('yellow')}
        >
          {labels.ratingYellow} [+10]
        </button>

        <button 
          className={`rating-btn red ${selectedRating === 'red' ? 'selected' : ''}`}
          onClick={() => setSelectedRating('red')}
        >
          {labels.ratingRed} [+10]
        </button>
      </div>
    </div>

            <button 
              className="submit-rating-btn"
              onClick={handleRatingSubmit}
              disabled={!selectedRating}
            >
              Enviar Calificación
            </button>

            <div className="warning-box">
              <strong>⚠️ Recordá:</strong> Tu calificación quedará oculta hasta que todos califiquen.
            </div>
          </>
        ) : (
          <div className="rating-submitted">
            <div className="icon">✅</div>
            <p><strong>Calificación enviada</strong></p>
            <p>Esperando que tus compañeros terminen de calificar...</p>
          </div>
        )}

        <div className="ranking-box">
          <h3>📊 Ranking de {team.name}</h3>
          {rankedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`ranking-item ${player.id === playerId ? 'you' : ''} ${index === rankedPlayers.length - 1 ? 'last' : ''}`}
            >
              <span>{index + 1}. {player.name} {player.id === playerId ? '(VOS)' : ''}</span>
              <span>{player.score} pts</span>
            </div>
          ))}
        </div>

        <div className="next-turn-info">
          Siguiente en responder: {rankedPlayers[rankedPlayers.length - 1].name} (menor puntaje)
        </div>
      </div>
    );
  }

  // Estado por defecto
  return (
    <div className="student-view">
      <div className="header">
        <h1>{labels.gameTitle}</h1>
        <p>{team.name} | Ronda {currentRound}</p>
      </div>
      <div className="waiting-message">
        <p>Esperando inicio de ronda...</p>
      </div>
    </div>
  );
}