// src/services/gameRepository.ts

import {
  ref,
  set,
  get,
  update,
  runTransaction,
  onValue,
  off,
  push,
  remove,
} from "firebase/database";
import { database } from "../firebase.config";
import type {
  Game,
  GameConfig,
  Team,
  Player,
  Question,
  Round,
  Rating,
  GameStatus,
} from "../types/game";

const GAMES_ROOT = "games";

/* ============================================================
   HELPERS INTERNOS
============================================================ */

function normalizePlayers(players: any): Player[] {
  if (!players) return [];

  if (Array.isArray(players)) {
    return players
      .filter(Boolean)
      .map((p: any, idx: number) => ({
        ...p,
        id: p?.id ?? p?.playerId ?? `player_${idx}`,
        name: p?.name ?? p?.playerName ?? "Sin nombre",
        score: Number.isFinite(Number(p?.score)) ? Number(p.score) : 0,
        consecutiveLastPlace: Number.isFinite(Number(p?.consecutiveLastPlace))
          ? Number(p.consecutiveLastPlace)
          : 0,
      }))
      .filter((p) => !!p.id);
  }

  if (typeof players === "object") {
    return Object.entries(players)
      .map(([key, p]: [string, any]) => ({
        ...p,
        id: p?.id ?? p?.playerId ?? key,
        name: p?.name ?? p?.playerName ?? "Sin nombre",
        score: Number.isFinite(Number(p?.score)) ? Number(p.score) : 0,
        consecutiveLastPlace: Number.isFinite(Number(p?.consecutiveLastPlace))
          ? Number(p.consecutiveLastPlace)
          : 0,
      }))
      .filter((p) => !!p.id);
  }

  return [];
}

function getRoundFromGame(game: any, roundNumber: number): any | null {
  if (!game?.rounds) return null;
  return game.rounds?.[roundNumber] ?? game.rounds?.[String(roundNumber)] ?? null;
}

async function updateGameTimestamp(gameId: string): Promise<void> {
  await set(ref(database, `${GAMES_ROOT}/${gameId}/updatedAt`), Date.now());
}

async function resolvePlayerPath(
  gameId: string,
  teamId: string,
  playerId: string
): Promise<string> {
  const teamRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}`);
  const snap = await get(teamRef);
  if (!snap.exists()) throw new Error(`Team not found: ${teamId}`);

  const team = snap.val();
  const players = team?.players;

  // players como array: buscamos índice
  if (Array.isArray(players)) {
    const idx = players.findIndex(
      (p: any) => p?.id === playerId || p?.playerId === playerId
    );
    if (idx === -1) throw new Error(`Player ${playerId} not found in team array`);
    return `${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${idx}`;
  }

  // players como objeto: key = playerId (ideal) o buscamos por p.id
  if (players && typeof players === "object") {
    if (players[playerId]) {
      return `${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${playerId}`;
    }

    const entries = Object.entries(players) as Array<[string, any]>;
    const found = entries.find(
      ([, p]) => p?.id === playerId || p?.playerId === playerId
    );
    if (!found) throw new Error(`Player ${playerId} not found in team object`);
    const [key] = found;
    return `${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${key}`;
  }

  throw new Error("Invalid players structure in team");
}

/**
 * Capitán simple y seguro: primer jugador que no sea el responder
 * (si hay 1 solo jugador, es él mismo)
 */
function pickCaptain(players: Player[], responderId: string): Player {
  return players.find((p) => p.id !== responderId) ?? players[0];
}

/* ============================================================
   CREAR Y CONFIGURAR JUEGO
============================================================ */

export async function createGame(config: Omit<GameConfig, "id">): Promise<string> {
  const gamesRef = ref(database, GAMES_ROOT);
  const newGameRef = push(gamesRef);
  const gameId = newGameRef.key!;

  const fullConfig: GameConfig = {
    ...config,
    id: gameId,
    createdAt: Date.now(),
  };

  const initialGame: Game = {
    config: fullConfig,
    status: {
      status: "setup",
      currentStage: 1,
      currentRound: 0,
      currentQuestionIndex: 0,
      updatedAt: Date.now(),
    },
    teams: {},
    questions: {},
    rounds: {},
    updatedAt: Date.now(),
  };

  await set(newGameRef, initialGame);
  return gameId;
}

export async function addTeams(gameId: string, teams: Team[]): Promise<void> {
  const teamsObject = teams.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {} as Record<string, Team>);

  await set(ref(database, `${GAMES_ROOT}/${gameId}/teams`), teamsObject);
  await updateGameTimestamp(gameId);
}

export async function addQuestions(gameId: string, questions: Question[]): Promise<void> {
  const questionsObject = questions.reduce((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {} as Record<string, Question>);

  await set(ref(database, `${GAMES_ROOT}/${gameId}/questions`), questionsObject);
  await updateGameTimestamp(gameId);
}

/* ============================================================
   STATUS DEL JUEGO
============================================================ */

export async function updateGameStatus(
  gameId: string,
  status: GameStatus["status"],
  stage?: 1 | 2
): Promise<void> {
  const updates: any = {
    [`${GAMES_ROOT}/${gameId}/status/status`]: status,
    [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  };

  if (stage !== undefined) {
    updates[`${GAMES_ROOT}/${gameId}/status/currentStage`] = stage;
  }

  await update(ref(database), updates);
}

/* ============================================================
   START GAME (Stage 1)
============================================================ */

export async function startGame(gameId: string): Promise<void> {
  await updateGameStatus(gameId, "stage1", 1);

  const game = await getGameOnce(gameId);
  const hasRound0 = !!(game as any)?.rounds?.[0] || !!(game as any)?.rounds?.["0"];
  if (hasRound0) return;

  await createFirstRoundStage1(gameId);
}

async function createFirstRoundStage1(gameId: string): Promise<void> {
  const game = await getGameOnce(gameId);
  if (!game) throw new Error("Game not found");

  const allQuestions = Object.values(game.questions || {}) as Question[];
  const stage1Only = allQuestions.filter((q) => q?.suggestedStage === 1);
  if (stage1Only.length === 0) throw new Error("No Stage 1 questions available");

  const firstQuestion = stage1Only[0];

  const teamsArray = Object.values(game.teams || {}) as Team[];
  if (teamsArray.length === 0) throw new Error("No teams available");

  const team = teamsArray[0];
  const players = normalizePlayers((team as any).players);
  if (players.length === 0) throw new Error("No players available");

  const responder = [...players].sort((a, b) => (a.score || 0) - (b.score || 0))[0];
  if (!responder?.id) throw new Error("Responder has no id");

  const captain = pickCaptain(players, responder.id);

  const firstRound: Round = {
    roundNumber: 0,
    questionId: firstQuestion.id,
    respondingPlayerId: responder.id,
    respondingPlayerName: responder.name,
    captainId: captain.id,
    captainName: captain.name,
    ratings: {},
    pointsAwarded: {},
    hasResponded: false,
    timestamp: Date.now(),
  };

  await set(ref(database, `${GAMES_ROOT}/${gameId}/rounds/0`), firstRound);

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/status/currentRound`]: 0,
    [`${GAMES_ROOT}/${gameId}/status/currentQuestionIndex`]: 0,
    [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/* ============================================================
   STAGE 2 – TRANSICIÓN SEGURA (LOCK REAL)
============================================================ */

export async function startStage2Safely(gameId: string): Promise<boolean> {
  const lockPath = `${GAMES_ROOT}/${gameId}/status/stage2Started`;
  const lockRefDb = ref(database, lockPath);

  const lockToken = `client_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const tx = await runTransaction(lockRefDb, (current) => {
    if (current) return current;
    return { by: lockToken, at: Date.now() };
  });

  const val = tx.snapshot.val();
  if (!val || typeof val !== "object" || val.by !== lockToken) {
    return false;
  }

  await applyStage0Bonus(gameId);
  await updateGameStatus(gameId, "stage2", 2);
  return true;
}

/* ============================================================
   BONUS STAGE 0 (IDEMPOTENTE)
============================================================ */

export async function applyStage0Bonus(gameId: string): Promise<void> {
  const flagRef = ref(database, `${GAMES_ROOT}/${gameId}/status/stage0BonusApplied`);
  const flagSnap = await get(flagRef);
  if (flagSnap.val() === true) return;

  const teamsSnap = await get(ref(database, `${GAMES_ROOT}/${gameId}/teams`));
  const teams = teamsSnap.val();
  if (!teams) return;

  const updates: any = {};
  Object.keys(teams).forEach((teamId) => {
    const team = teams[teamId];
    const bonus = team.stage0Bonus || 0;
    const score = team.totalScore || 0;
    updates[`${GAMES_ROOT}/${gameId}/teams/${teamId}/totalScore`] = score + bonus;
  });

  updates[`${GAMES_ROOT}/${gameId}/status/stage0BonusApplied`] = true;
  updates[`${GAMES_ROOT}/${gameId}/updatedAt`] = Date.now();

  await update(ref(database), updates);
}

/* ============================================================
   CONFIRMACIÓN DE PUNTOS (ANTI DUPLICADO)
============================================================ */

export async function arePointsConfirmed(gameId: string, roundNumber: number): Promise<boolean> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}/rounds/${roundNumber}`));
  return snap.val()?.pointsConfirmed === true;
}

export async function markPointsAsConfirmed(gameId: string, roundNumber: number): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/rounds/${roundNumber}/pointsConfirmed`]: true,
    [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/* ============================================================
   RONDAS Y CALIFICACIONES
============================================================ */

export async function createRound(gameId: string, round: Round): Promise<void> {
  await set(ref(database, `${GAMES_ROOT}/${gameId}/rounds/${round.roundNumber}`), round);
  await updateGameTimestamp(gameId);
}

export async function addRating(gameId: string, roundNumber: number, rating: Rating): Promise<void> {
  await set(
    ref(database, `${GAMES_ROOT}/${gameId}/rounds/${roundNumber}/ratings/${rating.playerId}`),
    rating
  );
  await updateGameTimestamp(gameId);
}

export async function validateRating(
  gameId: string,
  roundNumber: number,
  playerId: string,
  isValid: boolean
): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/rounds/${roundNumber}/ratings/${playerId}/validated`]: isValid,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function setRoundHasResponded(
  gameId: string,
  roundNumber: number,
  value: boolean
): Promise<void> {
  if (value === true) {
    const refHas = ref(database, `${GAMES_ROOT}/${gameId}/rounds/${roundNumber}/hasResponded`);
    await runTransaction(refHas, (current) => {
      if (current === true) return current;
      return true;
    });
  } else {
    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/rounds/${roundNumber}/hasResponded`]: false,
    });
  }

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function markAnswerCorrectness(
  gameId: string,
  roundNumber: number,
  wasCorrect: boolean
): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/rounds/${roundNumber}/answerWasCorrect`]: wasCorrect,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function awardPoints(
  gameId: string,
  roundNumber: number,
  pointsAwarded: Record<string, number>
): Promise<void> {
  await set(ref(database, `${GAMES_ROOT}/${gameId}/rounds/${roundNumber}/pointsAwarded`), pointsAwarded);
  await updateGameTimestamp(gameId);
}

/* ============================================================
   SCORES (SMART) – soporta players array u objeto
============================================================ */

export async function updatePlayerScoreSmart(
  gameId: string,
  teamId: string,
  playerId: string,
  newScore: number
): Promise<void> {
  const playerPath = await resolvePlayerPath(gameId, teamId, playerId);
  await update(ref(database), {
    [`${playerPath}/score`]: newScore,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function updatePlayerLastPlaceCounterSmart(
  gameId: string,
  teamId: string,
  playerId: string,
  count: number
): Promise<void> {
  const playerPath = await resolvePlayerPath(gameId, teamId, playerId);
  await update(ref(database), {
    [`${playerPath}/consecutiveLastPlace`]: count,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/* ============================================================
   NEXT ROUND (Stage 1 only) - multi-team friendly
============================================================ */

export async function prepareNextRound(gameId: string, teamId: string): Promise<void> {
  const game = await getGameOnce(gameId);
  if (!game) throw new Error("Game not found");

  const status = game.status as any;

  const currentRound =
    typeof status?.currentRound === "number" ? status.currentRound : 0;

  const currentQuestionIndex =
    typeof status?.currentQuestionIndex === "number" ? status.currentQuestionIndex : 0;

  const allQuestions = Object.values(game.questions || {}) as Question[];
  const stage1Only = allQuestions.filter((q) => q?.suggestedStage === 1);
  if (stage1Only.length === 0) throw new Error("No Stage 1 questions available");

  const nextQuestionIndex = currentQuestionIndex + 1;

  // ✅ Fin Stage 1 para este equipo
  if (nextQuestionIndex >= stage1Only.length) {
    const teamsObj = game.teams || {};
    const teamsArr = Object.values(teamsObj) as any[];

    const updates: any = {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Completed`]: true,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    };

    const completedAfterThis = teamsArr.every((t) => {
      if (!t?.id) return false;
      if (t.id === teamId) return true;
      return t.stage1Completed === true;
    });

    console.log('🔍 Checking Stage 1 completion...');
    console.log('   Teams total:', teamsArr.length);
    console.log('   Team that just finished:', teamId);
    console.log('   All teams completed?', completedAfterThis);

    if (teamsArr.length > 0 && completedAfterThis) {
      console.log('✅ MARKING GAME AS STAGE1-COMPLETE');
      updates[`${GAMES_ROOT}/${gameId}/status/status`] = "stage1-complete";
      updates[`${GAMES_ROOT}/${gameId}/status/currentStage`] = 1;
      updates[`${GAMES_ROOT}/${gameId}/status/updatedAt`] = Date.now();
    } else {
      console.log('⏳ Not all teams completed yet');
    }

    console.log('📝 Updates to apply:', updates);

    // ✅ Hay próxima pregunta Stage 1
    const nextQuestion = stage1Only[nextQuestionIndex];
    if (!nextQuestion?.id) throw new Error("Next question invalid");

    // ✅ Tomamos el equipo por teamId
    const team = (game.teams as any)?.[teamId] as Team | undefined;
    if (!team) throw new Error(`Team not found: ${teamId}`);

    const players = normalizePlayers((team as any).players);
    if (players.length === 0) throw new Error("No players available");

    const responder = [...players].sort((a, b) => (a.score || 0) - (b.score || 0))[0];
    if (!responder?.id) throw new Error("Responder has no id");

    const captain = pickCaptain(players, responder.id);

    const nextRoundNumber = currentRound + 1;

    const nextRound: Round = {
      roundNumber: nextRoundNumber,
      questionId: nextQuestion.id,
      respondingPlayerId: responder.id,
      respondingPlayerName: responder.name,
      captainId: captain.id,
      captainName: captain.name,
      ratings: {},
      pointsAwarded: {},
      hasResponded: false,
      timestamp: Date.now(),
    };

    await createRound(gameId, nextRound);

    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/status/currentRound`]: nextRoundNumber,
      [`${GAMES_ROOT}/${gameId}/status/currentQuestionIndex`]: nextQuestionIndex,
      [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: Date.now(),
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
  }

  /* ============================================================
     LECTURA / SUBSCRIPCIÓN
  ============================================================ */

  export async function getGameOnce(gameId: string): Promise<Game | null> {
    const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
    return snap.exists() ? (snap.val() as Game) : null;
  }

  export function subscribeToGame(
    gameId: string,
    callback: (game: Game | null) => void
  ): () => void {
    const gameRef = ref(database, `${GAMES_ROOT}/${gameId}`);
    const listener = onValue(gameRef, (snap) => {
      callback(snap.exists() ? (snap.val() as Game) : null);
    });
    return () => off(gameRef, "value", listener);
  }

  /* ============================================================
     UTILIDADES
  ============================================================ */

  export async function deleteGame(gameId: string): Promise<void> {
    await remove(ref(database, `${GAMES_ROOT}/${gameId}`));
  }

  export function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}