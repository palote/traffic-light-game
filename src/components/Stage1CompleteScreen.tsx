// src/components/Stage1CompleteScreen.tsx

import { useEffect, useMemo, useState } from 'react';
import type { Team } from '../types/game';
import { subscribeToGame } from '../services/gameRepository';
import './Stage1CompleteScreen.css';

interface Stage1CompleteScreenProps {
  gameId: string;
  team: Team;
}

export function Stage1CompleteScreen({ gameId, team }: Stage1CompleteScreenProps) {
  const [totalTeams, setTotalTeams] = useState(0);
  const [completedTeams, setCompletedTeams] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (game) => {
      const teamsArr = game?.teams ? Object.values(game.teams) : [];

      // ✅ hardening (por si viene algo raro desde Firebase)
      const cleaned = teamsArr.filter(
        (t: any) => !!t && typeof t === 'object' && !!t.id
      );

      const completed = cleaned.filter((t: any) => t?.stage1Completed === true).length;

      setTotalTeams(cleaned.length);
      setCompletedTeams(completed);
    });

    return () => unsubscribe();
  }, [gameId]);

  const progress = useMemo(() => {
    return totalTeams > 0 ? Math.round((completedTeams / totalTeams) * 100) : 0;
  }, [totalTeams, completedTeams]);

  const teamName = team?.name?.trim() ? team.name : 'Tu equipo';
  const allDone = totalTeams > 0 && completedTeams >= totalTeams;

  return (
    <div className="stage1-complete-screen">
      <div className="celebration-header">
        <h1>🎉 ¡COMPLETARON LA ETAPA DE PRÁCTICA!</h1>
      </div>

      <div className="team-summary">
        <h2>{teamName}</h2>
        <p>Han completado todas las rondas de práctica cooperativa.</p>
      </div>

      <div className="achievements-box">
        <h3>💪 En Stage 2 tendrán la oportunidad de demostrar:</h3>
        <ul>
          <li>Su capacidad de argumentación</li>
          <li>Su habilidad para detectar errores</li>
          <li>Su trabajo en equipo bajo presión</li>
          <li>Todo lo que aprendieron juntos</li>
        </ul>
      </div>

      <div className="waiting-section">
        <h3>{allDone ? '✅ ¡Todos los equipos están listos!' : '⏳ Esperando que los demás equipos terminen...'}</h3>

        <div className="teams-progress">
          <div className="progress-text">
            Equipos listos: <strong>{completedTeams}</strong> de <strong>{totalTeams}</strong> ({progress}%)
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {!allDone && totalTeams > 0 && (
            <p style={{ marginTop: 10, opacity: 0.9 }}>
              Faltan {Math.max(0, totalTeams - completedTeams)} equipo{totalTeams - completedTeams === 1 ? '' : 's'}.
            </p>
          )}
        </div>
      </div>

      <div className="encouragement">
        <p>💡 Mientras esperan, pueden repasar los conceptos más importantes.</p>
      </div>
    </div>
  );
}
