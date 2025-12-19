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

function nowMs() {
  return Date.now();
}

async function updateGameTimestamp(gameId: string) {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: nowMs(),
    [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: nowMs(),
  });
}

function normalizePlayers(players: unknown): Player[] {
  if (Array.isArray(players)) return players as Player[];
  if (players && typeof players === "object") return Object.values(players as any) as Player[];
  return [];
}

function normalizeTeams(teams: unknown): Team[] {
  if (Array.isArray(teams)) return teams as Team[];
  if (teams && typeof teams === "object") return Object.values(teams as any) as Team[];
  return [];
}

function normalizeQuestions(questions: unknown): Question[] {
  if (Array.isArray(questions)) return questions as Question[];
  if (questions && typeof questions === "object") return Object.values(questions as any) as Question[];
  return [];
}

/* ============================================================
  SUBSCRIBE
============================================================ */

export function subscribeToGame(gameId: string, cb: (game: Game | null) => void) {
  const gameRef = ref(database, `${GAMES_ROOT}/${gameId}`);
  const handler = (snap: any) => cb((snap.val() as Game) ?? null);
  onValue(gameRef, handler);
  return () => off(gameRef, "value", handler);
}

/* ============================================================
  CREATE / SETUP GAME
============================================================ */

export async function createGame(
  config: Omit<GameConfig, "createdAt" | "updatedAt">
): Promise<string> {
  const gamesRef = ref(database, GAMES_ROOT);
  const newGameRef = push(gamesRef);
  const gameId = newGameRef.key!;
  const now = nowMs();

  const status: GameStatus = {
    status: "setup",
    currentStage: 1,
    currentRound: 0,
    currentQuestionIndex: 0,
    updatedAt: now,
  };

  const game: Game = {
    id: gameId,
    config: {
      ...config,
      createdAt: now,
      updatedAt: now,
    } as any,
    status,
    teams: {},
    players: {},
    questions: {},
    stage1Rounds: {},
    updatedAt: now,
  } as any;

  await set(newGameRef, game);
  return gameId;
}

export async function addTeams(gameId: string, teams: Team[]): Promise<void> {
  const updates: Record<string, any> = {};
  for (const t of teams) {
    updates[`${GAMES_ROOT}/${gameId}/teams/${t.id}`] = t;
  }
  updates[`${GAMES_ROOT}/${gameId}/updatedAt`] = nowMs();
  await update(ref(database), updates);
}

export async function addQuestions(gameId: string, questions: Question[]): Promise<void> {
  const updates: Record<string, any> = {};
  for (const q of questions) {
    updates[`${GAMES_ROOT}/${gameId}/questions/${q.id}`] = q;
  }
  updates[`${GAMES_ROOT}/${gameId}/updatedAt`] = nowMs();
  await update(ref(database), updates);
}

export async function startGame(gameId: string): Promise<void> {
  const gameSnap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = gameSnap.val() as Game;
  if (!game) throw new Error("Game not found");

  const teams = normalizeTeams((game as any).teams);
  const questions = normalizeQuestions((game as any).questions);

  if (!teams.length) throw new Error("No teams");
  if (!questions.length) throw new Error("No questions");

  // Primera pregunta Stage 1
  const stage1Questions = questions.filter((q: any) => (q as any).suggestedStage !== 2);
  const firstQ = stage1Questions[0] ?? questions[0];

  // Seleccionar respondedor inicial (el de menor score del equipo 0)
  const firstTeam = teams[0];
  const players = normalizePlayers((firstTeam as any).players ?? (firstTeam as any).members ?? []);
  const sorted = [...players].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const responder = sorted[0] ?? players[0];
  if (!responder) throw new Error("No players in first team");

  const captain = responder; // en Stage 1 el “capitán” puede ser el respondedor

  const firstRound: Round = {
    roundNumber: 0,
    questionId: (firstQ as any).id,
    respondingPlayerId: responder.id,
    respondingPlayerName: responder.name,
    captainId: captain.id,
    captainName: captain.name,
    ratings: {},
    pointsAwarded: {},
    hasResponded: false,
    timestamp: Date.now(),
  };

  // ✅ Stage 1: guardar ronda en stage1Rounds (no en rounds)
  await set(ref(database, `${GAMES_ROOT}/${gameId}/stage1Rounds/0`), firstRound);

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/status/currentRound`]: 0,
    [`${GAMES_ROOT}/${gameId}/status/currentQuestionIndex`]: 0,
    [`${GAMES_ROOT}/${gameId}/status/status`]: "stage1",
    [`${GAMES_ROOT}/${gameId}/status/currentStage`]: 1,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/* ============================================================
  STAGE 1 ROUNDS
============================================================ */

export async function createRound(gameId: string, round: Round): Promise<void> {
  // ✅ Stage 1: crear ronda en stage1Rounds (no en rounds)
  await set(
    ref(database, `${GAMES_ROOT}/${gameId}/stage1Rounds/${round.roundNumber}`),
    round
  );
  await updateGameTimestamp(gameId);
}

export async function setRoundHasResponded(
  gameId: string,
  roundNumber: number,
  value: boolean
): Promise<void> {
  if (value === true) {
    // 🔥 CORREGIDO: stage1Rounds en lugar de rounds
    const refHas = ref(
      database,
      `games/${gameId}/stage1Rounds/${roundNumber}/hasResponded`
    );

    await runTransaction(refHas, (current) => {
      if (current === true) return current;
      return true;
    });

    console.log(`✅ Stage 1 Round ${roundNumber} marked as responded`);
  } else {
    await set(
      ref(database, `${GAMES_ROOT}/${gameId}/stage1Rounds/${roundNumber}/hasResponded`),
      false
    );
    await updateGameTimestamp(gameId);
    console.log(`✅ Stage 1 Round ${roundNumber} unmarked as responded`);
  }
}

export async function addRating(
  gameId: string,
  roundNumber: number,
  rating: Rating
): Promise<void> {
  // ✅ Stage 1: guardar rating en stage1Rounds (no en rounds)
  await set(
    ref(
      database,
      `${GAMES_ROOT}/${gameId}/stage1Rounds/${roundNumber}/ratings/${rating.playerId}`
    ),
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
  // ✅ Stage 1: validar rating en stage1Rounds (no en rounds)
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage1Rounds/${roundNumber}/ratings/${playerId}/validated`]:
      isValid,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function markAnswerCorrectness(
  gameId: string,
  roundNumber: number,
  wasCorrect: boolean
): Promise<void> {
  // ✅ Stage 1: guardar correctness en stage1Rounds (no en rounds)
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage1Rounds/${roundNumber}/answerWasCorrect`]:
      wasCorrect,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function awardPoints(
  gameId: string,
  roundNumber: number,
  pointsAwarded: Record<string, number>
): Promise<void> {
  // ✅ Stage 1: puntos de ronda en stage1Rounds (no en rounds)
  await set(
    ref(
      database,
      `${GAMES_ROOT}/${gameId}/stage1Rounds/${roundNumber}/pointsAwarded`
    ),
    pointsAwarded
  );
  await updateGameTimestamp(gameId);
}

export async function arePointsConfirmed(
  gameId: string,
  roundNumber: number
): Promise<boolean> {
  // ✅ Stage 1: pointsConfirmed vive en stage1Rounds
  const snap = await get(
    ref(database, `${GAMES_ROOT}/${gameId}/stage1Rounds/${roundNumber}`)
  );
  return snap.val()?.pointsConfirmed === true;
}

export async function markPointsAsConfirmed(
  gameId: string,
  roundNumber: number
): Promise<void> {
  // ✅ Stage 1: pointsConfirmed vive en stage1Rounds
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage1Rounds/${roundNumber}/pointsConfirmed`]: true,
    [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/**
 * Verifica si TODOS los equipos completaron Stage 1
 */
export async function areAllTeamsStage1Complete(gameId: string): Promise<boolean> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}/teams`));
  const teams = snap.val();
  if (!teams) return false;

  const teamsArray = Array.isArray(teams) ? teams : Object.values(teams);
  if (teamsArray.length === 0) return false;

  return teamsArray.every((team: any) => team?.stage1Completed === true);
}

/* ============================================================
  UPDATE SCORE SMART (evita pisar si ya está actualizado)
============================================================ */

export async function updatePlayerScoreSmart(
  gameId: string,
  teamId: string,
  playerId: string,
  newScore: number
): Promise<void> {
  const pRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${playerId}`);
  await runTransaction(pRef, (current) => {
    if (!current) return current;
    const currScore = (current as any).score ?? 0;
    if (currScore >= newScore) return current;
    return { ...(current as any), score: newScore };
  });
  await updateGameTimestamp(gameId);
}

export async function updatePlayerLastPlaceCounterSmart(
  gameId: string,
  teamId: string,
  playerId: string,
  newCount: number
): Promise<void> {
  const pRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${playerId}`);
  await runTransaction(pRef, (current) => {
    if (!current) return current;
    return { ...(current as any), consecutiveLastPlace: newCount };
  });
  await updateGameTimestamp(gameId);
}

/* ============================================================
  STATUS / STAGES
============================================================ */

export async function updateGameStatus(
  gameId: string,
  status: GameStatus["status"],
  stage?: 1 | 2
): Promise<void> {
  const updates: Record<string, any> = {
    [`${GAMES_ROOT}/${gameId}/status/status`]: status,
    [`${GAMES_ROOT}/${gameId}/status/updatedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  };

  if (stage) {
    updates[`${GAMES_ROOT}/${gameId}/status/currentStage`] = stage;
  }

  await update(ref(database), updates);
}

/* ============================================================
  PREPARE NEXT ROUND (STAGE 1)
============================================================ */

export async function prepareNextRound(gameId: string, teamId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game) throw new Error("Game not found");

  const status = game.status as any;
  const currentRound = status?.currentRound ?? 0;

  const questions = normalizeQuestions((game as any).questions);
  const stage1Questions = questions.filter((q: any) => (q as any).suggestedStage !== 2);

  const nextQuestionIndex = (status?.currentQuestionIndex ?? 0) + 1;
  const nextRoundNumber = currentRound + 1;

  const teams = normalizeTeams((game as any).teams);
  const currentTeam = teams.find((t) => t.id === teamId) ?? (game as any).teams?.[teamId];
  if (!currentTeam) throw new Error("Team not found");

  const players = normalizePlayers((currentTeam as any).players);
  if (!players.length) throw new Error("No players in team");

  const sorted = [...players].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const nextResponder = sorted[0] ?? players[0];

  // Si ya no hay preguntas Stage 1, marcar stage1Completed
  if (nextQuestionIndex >= stage1Questions.length) {
    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Completed`]: true,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
    console.log(`✅ Team ${teamId} completed Stage 1`);
    return;
  }

  const nextQuestion = stage1Questions[nextQuestionIndex];

  const nextRound: Round = {
    roundNumber: nextRoundNumber,
    questionId: (nextQuestion as any).id,
    respondingPlayerId: nextResponder.id,
    respondingPlayerName: nextResponder.name,
    captainId: nextResponder.id,
    captainName: nextResponder.name,
    ratings: {},
    pointsAwarded: {},
    hasResponded: false,
    timestamp: Date.now(),
  };

  // ✅ Stage 1: guardar en stage1Rounds
  await set(ref(database, `${GAMES_ROOT}/${gameId}/stage1Rounds/${nextRoundNumber}`), nextRound);

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/status/currentRound`]: nextRoundNumber,
    [`${GAMES_ROOT}/${gameId}/status/currentQuestionIndex`]: nextQuestionIndex,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });

  console.log(`✅ Stage 1 advanced to round ${nextRoundNumber}`);
}

/* ============================================================
  STAGE 2 BOOTSTRAP (solo helpers usados por tu UI)
============================================================ */

// Nota: Stage 2 real lo manejás en stage2Repository.ts,
// acá queda solamente lo que ya tenías como orquestación.

export async function startStage2Safely(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game) throw new Error("Game not found");

  if ((game as any).stage2) {
    console.log("ℹ️ Stage 2 already exists, skipping bootstrap.");
    return;
  }

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage2`]: {
      currentRound: 0,
      currentQuestionIndex: 0,
      rounds: {},
    },
    [`${GAMES_ROOT}/${gameId}/status/status`]: "stage2",
    [`${GAMES_ROOT}/${gameId}/status/currentStage`]: 2,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });

  console.log("✅ Stage 2 bootstrapped");
}

export async function devSetStage(gameId: string, stage: 1 | 2): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/status/currentStage`]: stage,
    [`${GAMES_ROOT}/${gameId}/status/status`]: stage === 1 ? "stage1" : "stage2",
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/* ============================================================
  CLEANUP / DELETE
============================================================ */

export async function deleteGame(gameId: string): Promise<void> {
  await remove(ref(database, `${GAMES_ROOT}/${gameId}`));
}
// ✅ Genera un código corto para que los alumnos entren (por ej: "A7K9Q2")
export function generateRoomCode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I, O, 0, 1
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
