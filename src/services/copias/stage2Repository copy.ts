import { ref, update, get } from "firebase/database";
import { database } from "../firebase.config";
import type {
  Game,
  Team,
  Stage2Round,
  Stage2RespondingTeam,
  Stage2RatingTeam,
  RatingColor,
  Question,
} from "../types/game";

const GAMES_ROOT = "games";

/* =========================================
   HELPERS
========================================= */

/**
 * Normaliza players del equipo (array u objeto)
 */
function normalizePlayers(team: Team) {
  const raw: any = (team as any).players;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((p) => p?.id);
  if (typeof raw === "object")
    return Object.values(raw).filter((p: any) => p?.id);
  return [];
}

/**
 * Selecciona jugador aleatorio NO usado
 */
function selectUnusedPlayer(team: Team): { id: string; name: string } | null {
  const players = normalizePlayers(team);
  if (players.length === 0) return null;

  const used = team.representativesUsed || [];
  const available = players.filter((p: any) => !used.includes(p.id));

  const pool = available.length > 0 ? available : players;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return { id: pool[randomIndex].id, name: pool[randomIndex].name };
}

/**
 * Marca jugador como usado
 */
async function markPlayerAsUsed(
  gameId: string,
  teamId: string,
  playerId: string
) {
  const teamRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}`);
  const snap = await get(teamRef);
  const team = snap.val() as Team;

  const used = team.representativesUsed || [];
  const allPlayers = normalizePlayers(team);

  if (used.length >= allPlayers.length) {
    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/representativesUsed`]: [
        playerId,
      ],
    });
  } else {
    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/representativesUsed`]: [
        ...used,
        playerId,
      ],
    });
  }
}

/* =========================================
   STAGE 2 CORE
========================================= */

/**
 * Inicia una ronda Stage 2 (fase hint)
 */
export async function startStage2Round(gameId: string) {
  const gameRef = ref(database, `${GAMES_ROOT}/${gameId}`);
  const snap = await get(gameRef);
  const game = snap.val() as Game;
  if (!game) throw new Error("Game not found");

  const stage2 = game.stage2 || {
    currentRound: 0,
    currentQuestionIndex: 0,
    rounds: {},
  };

  const roundNumber = stage2.currentRound;
  const qIndex = stage2.currentQuestionIndex;

  const questions = Object.values(game.questions || {}) as Question[];
  const stage2Questions = questions.filter((q) => q.suggestedStage === 2);

  if (qIndex >= stage2Questions.length)
    throw new Error("No Stage 2 questions left");

  const question = stage2Questions[qIndex];

  const newRound: Stage2Round = {
    roundNumber,
    questionId: question.id,
    phase: "hint",
    hintStartedAt: Date.now(),
    hintDuration: 60,
    questionRevealedAt: null,
    respondingTeam: null,
    ratingTeams: {},
    pointsAwarded: {},
    timestamp: Date.now(),
  };

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage2`]: {
      currentRound: roundNumber,
      currentQuestionIndex: qIndex,
      rounds: {
        ...(stage2.rounds || {}),
        [roundNumber]: newRound,
      },
    },
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/**
 * Designa representantes
 */
export async function designateRepresentatives(gameId: string) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds[r];
  if (!round) throw new Error("Round not found");

  const teams = Object.values(game.teams) as Team[];
  if (teams.length < 2)
    throw new Error("Need at least 2 teams for Stage 2");

  const sorted = [...teams].sort(
    (a, b) => (a.totalScore || 0) - (b.totalScore || 0)
  );

  const respondingTeam = sorted[0];
  const respondingPlayer = selectUnusedPlayer(respondingTeam);
  if (!respondingPlayer)
    throw new Error("No responding player available");

  const responding: Stage2RespondingTeam = {
    teamId: respondingTeam.id,
    playerId: respondingPlayer.id,
    playerName: respondingPlayer.name,
    helpRequested: false,
    helpStartedAt: null,
    responseStartedAt: null,
  };

  const ratingTeams: Record<string, Stage2RatingTeam> = {};

  for (const team of sorted.slice(1)) {
    const p = selectUnusedPlayer(team);
    if (!p) throw new Error(`No player for team ${team.name}`);

    ratingTeams[team.id] = {
      teamId: team.id,
      teamName: team.name,
      playerId: p.id,
      playerName: p.name,
      rating: null,
      validated: null,
      helpRequested: false,
      helpStartedAt: null,
    };
  }

  await markPlayerAsUsed(gameId, respondingTeam.id, respondingPlayer.id);
  for (const [tid, rt] of Object.entries(ratingTeams)) {
    await markPlayerAsUsed(gameId, tid, rt.playerId);
  }

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/respondingTeam`]: responding,
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/ratingTeams`]: ratingTeams,
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/phase`]: "designated",
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/**
 * Revela la pregunta
 */
export async function revealQuestion(gameId: string) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/phase`]: "revealed",
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/questionRevealedAt`]:
      Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/**
 * Solicitar ayuda
 */
export async function requestHelp(
  gameId: string,
  teamId: string,
  isResponding: boolean
) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;

  if (isResponding) {
    await update(ref(database), {
      [`${base}/respondingTeam/helpRequested`]: true,
      [`${base}/respondingTeam/helpStartedAt`]: Date.now(),
      [`${base}/respondingTeam/responseStartedAt`]: Date.now(),
      [`${base}/phase`]: "responding",
    });
  } else {
    await update(ref(database), {
      [`${base}/ratingTeams/${teamId}/helpRequested`]: true,
      [`${base}/ratingTeams/${teamId}/helpStartedAt`]: Date.now(),
    });
  }
}
// stage2Repository.ts
export async function nextStage2Round(gameId: string) {
  const gameRef = ref(database, `${GAMES_ROOT}/${gameId}`);
  const snap = await get(gameRef);
  const game = snap.val() as Game;

  if (!game?.stage2) throw new Error("Stage 2 not found");

  const currentRound = game.stage2.currentRound;
  const currentQuestionIndex = game.stage2.currentQuestionIndex;

  const questions = Object.values(game.questions || {}) as Question[];
  const stage2Questions = questions.filter((q) => q.suggestedStage === 2);

  const nextQuestionIndex = currentQuestionIndex + 1;
  if (nextQuestionIndex >= stage2Questions.length) {
    throw new Error("No more Stage 2 questions");
  }

  const nextRoundNumber = currentRound + 1;
  const nextQuestion = stage2Questions[nextQuestionIndex];

  const newRound: Stage2Round = {
    roundNumber: nextRoundNumber,
    questionId: nextQuestion.id,
    phase: "hint", // Reseteamos la fase a "hint"
    hintStartedAt: Date.now(),
    hintDuration: 60,
    questionRevealedAt: null,
    respondingTeam: null,
    ratingTeams: {},
    pointsAwarded: {},
    timestamp: Date.now(),
  };

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage2/currentRound`]: nextRoundNumber,
    [`${GAMES_ROOT}/${gameId}/stage2/currentQuestionIndex`]: nextQuestionIndex,
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${nextRoundNumber}`]: newRound,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });

  console.log('✅ Nueva ronda de Stage 2 iniciada');
}

/**
 * Enviar calificación
 */
export async function submitStage2Rating(
  gameId: string,
  teamId: string,
  color: RatingColor
) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;

  await update(ref(database), {
    [`${base}/ratingTeams/${teamId}/rating`]: color,
    [`${base}/ratingTeams/${teamId}/validated`]:
      color === "green" ? true : null,
  });

  const roundSnap = await get(ref(database, base));
  const round = roundSnap.val() as Stage2Round;

  const allRated = Object.values(round.ratingTeams || {}).every(
    (t) => t.rating !== null
  );

  if (allRated) {
    await update(ref(database), {
      [`${base}/phase`]: "validation",
    });
    
  }
  
}
