// src/services/stage2ResultsHelpers.ts

import type { Team, Stage2Round } from '../types/game';

/**
 * Devuelve los equipos ordenados por puntos obtenidos en la ronda
 */
export function getRoundRanking(
  round: Stage2Round,
  teams: Team[]
) {
  if (!round.pointsAwarded) return [];

  return teams
    .map(team => ({
      teamId: team.id,
      teamName: team.name,
      roundPoints: round.pointsAwarded?.[team.id] || 0,
      totalScore: team.totalScore || 0
    }))
    .sort((a, b) => b.roundPoints - a.roundPoints);
}

/**
 * Devuelve el teamId ganador de la ronda
 */
export function getRoundWinner(
  round: Stage2Round
): string | null {
  if (!round.pointsAwarded) return null;

  let winner: string | null = null;
  let max = -Infinity;

  Object.entries(round.pointsAwarded).forEach(([teamId, pts]) => {
    if (pts > max) {
      max = pts;
      winner = teamId;
    }
  });

  return winner;
}

/**
 * Genera un resumen pedagógico simple de la ronda
 */
export function getRoundSummary(round: Stage2Round) {
  const summary: string[] = [];

  if (round.respondingTeam) {
    summary.push(
      round.respondingTeam.helpRequested
        ? 'El equipo que respondió solicitó ayuda'
        : 'El equipo que respondió lo hizo sin ayuda'
    );
  }

  if (round.validation) {
    const rejected = Object.values(round.validation)
      .filter(v => v.validated === false).length;

    if (rejected > 0) {
      summary.push(
        `${rejected} calificación${rejected > 1 ? 'es fueron' : ' fue'} rechazada por el docente`
      );
    }
  }

  return summary;
}
