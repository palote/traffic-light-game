// src/services/gameRepository.ts
// ⚠️ SOLO SE MODIFICÓ LA FUNCIÓN createGame - El resto está igual

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
import {
  database,
  auth
} from "../firebase.config";
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
  if (Array.isArray(players)) {
    return players.filter((p): p is Player => !!p && typeof p === 'object' && !!p.id);
  }
  if (players && typeof players === "object") {
    return Object.entries(players as Record<string, any>)
      .filter(([key, val]) => val && typeof val === 'object')
      .map(([key, val]) => ({
        id: val.id || key,
        name: val.name || 'Jugador',  // ✅ Explícitamente extraer name
        score: val.score || 0,
        consecutiveLastPlace: val.consecutiveLastPlace || 0,
      })) as Player[];
  }
  return [];
}

function normalizeTeams(teams: unknown): Team[] {
  if (Array.isArray(teams)) {
    return teams.filter((t): t is Team => !!t && typeof t === 'object');
  }
  if (teams && typeof teams === "object") {
    return Object.entries(teams as Record<string, any>)
      .filter(([key, val]) => val && typeof val === 'object')
      .map(([key, val]) => ({
        ...val,
        id: val.id || key,
      })) as Team[];
  }
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

import { markGameCreated } from "./metricsService"; // ✅ NUEVO (métricas docentes, RTDB)

/**
 * Crea un juego en RTDB y devuelve gameId.
 * ✅ MODIFICADO: Soporta Stage 0
 */
export async function createGame(
  config: Omit<GameConfig, "id">
): Promise<string> {
  const now = Date.now();

  // ✅ Compatibilidad: juegos sin login / sin usuario
  const u = auth.currentUser;
  const createdBy =
    u && u.uid
      ? {
        uid: u.uid,
        email: u.email ?? null,
        createdAt: now,
      }
      : null;

  // Creamos el nodo del juego
  const gameRef = push(ref(database, `${GAMES_ROOT}`));
  const gameId = gameRef.key;
  if (!gameId) throw new Error("No se pudo generar gameId");

  // ✅ NUEVO: Detectar si Stage 0 está habilitado
  const stage0Enabled = (config as any).stage0Config?.enabled === true;

  const gameData: Game = {
    id: gameId,

    // ✅ Tu config
    config: config as any,

    // ✅ MODIFICADO: Estado inicial depende de Stage 0
    status: {
      status: stage0Enabled ? "stage0" : "setup",
      currentStage: stage0Enabled ? 0 : 1,
      currentRound: 0,
      currentQuestionIndex: 0,
    } as any,

    teams: {} as any,
    players: {} as any,
    questions: {} as any,
    rounds: {} as any,

    createdAt: now,
    updatedAt: now,

    // ✅ NUEVO (no rompe juegos viejos)
    createdBy,

    // ✅ NUEVO: Stage 0 state inicial (si está habilitado)
    ...(stage0Enabled ? {
      stage0: {
        phase: 'reading',
        proposals: {},
        readyTeams: [],
      }
    } : {}),
  } as any;

  await set(ref(database, `${GAMES_ROOT}/${gameId}`), gameData);

  // ✅ MÉTRICAS (no afecta el juego, solo registra "game creado" si hay docente logueado)
  // Importante: no rompe modo sin-auth (createdBy null), y si falla NO frena la creación.
  if (createdBy?.uid) {
    markGameCreated(createdBy.uid, gameId).catch((e) => {
      console.warn("⚠️ metrics markGameCreated failed:", e);
    });
  }

  return gameId;
}

export async function addTeams(gameId: string, teams: Team[]): Promise<void> {
  const updates: Record<string, any> = {};
  for (const t of teams) {
    updates[`${GAMES_ROOT}/${gameId}/teams/${t.id}`] = {
      ...t,
      currentRound: 0, // ✅ NUEVO: cada equipo empieza en ronda 0
      currentQuestionIndex: 0, // ✅ NUEVO
    };
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

  const stage1Questions = questions.filter((q: any) => (q as any).suggestedStage !== 2);
  const firstQ = stage1Questions[0] ?? questions[0];

  // ✅ NUEVO: Crear ronda inicial para CADA equipo
  const updates: Record<string, any> = {};

  for (const team of teams) {
    const players = normalizePlayers((team as any).players ?? (team as any).members ?? []);
    const sorted = [...players].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    const responder = sorted[0] ?? players[0];

    if (!responder) continue;

    // ✅ Capitán rota en orden fijo
    let captainIndex = 0 % players.length;
    let captain = players[captainIndex];

    // Si el capitán es el respondedor, pasar al siguiente
    if (captain.id === responder.id) {
      captainIndex = (captainIndex + 1) % players.length;
      captain = players[captainIndex];
    }

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

    // Guardar ronda en el equipo específico
    updates[`${GAMES_ROOT}/${gameId}/teams/${team.id}/stage1Rounds/0`] = firstRound;
    updates[`${GAMES_ROOT}/${gameId}/teams/${team.id}/currentRound`] = 0;
    updates[`${GAMES_ROOT}/${gameId}/teams/${team.id}/currentQuestionIndex`] = 0;
  }

  updates[`${GAMES_ROOT}/${gameId}/status/status`] = "stage1";
  updates[`${GAMES_ROOT}/${gameId}/status/currentStage`] = 1;
  updates[`${GAMES_ROOT}/${gameId}/updatedAt`] = Date.now();

  await update(ref(database), updates);
}

/* ============================================================
  STAGE 1 ROUNDS - AHORA POR EQUIPO
============================================================ */

export async function createRound(gameId: string, teamId: string, round: Round): Promise<void> {
  await set(
    ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${round.roundNumber}`),
    round
  );
  await updateGameTimestamp(gameId);
}

export async function setRoundHasResponded(
  gameId: string,
  teamId: string,
  roundNumber: number,
  value: boolean
): Promise<void> {
  if (value === true) {
    const refHas = ref(
      database,
      `games/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}/hasResponded`
    );

    await runTransaction(refHas, (current) => {
      if (current === true) return current;
      return true;
    });

    console.log(`✅ Team ${teamId} Round ${roundNumber} marked as responded`);
  } else {
    await set(
      ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}/hasResponded`),
      false
    );
    await updateGameTimestamp(gameId);
    console.log(`✅ Team ${teamId} Round ${roundNumber} unmarked as responded`);
  }
}

export async function addRating(
  gameId: string,
  teamId: string,
  roundNumber: number,
  rating: Rating
): Promise<void> {
  await set(
    ref(
      database,
      `${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}/ratings/${rating.playerId}`
    ),
    rating
  );
  await updateGameTimestamp(gameId);
}

export async function validateRating(
  gameId: string,
  teamId: string,
  roundNumber: number,
  playerId: string,
  isValid: boolean
): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}/ratings/${playerId}/validated`]:
      isValid,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function markAnswerCorrectness(
  gameId: string,
  teamId: string,
  roundNumber: number,
  wasCorrect: boolean
): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}/answerWasCorrect`]:
      wasCorrect,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

export async function awardPoints(
  gameId: string,
  teamId: string,
  roundNumber: number,
  pointsAwarded: Record<string, number>
): Promise<void> {
  await set(
    ref(
      database,
      `${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}/pointsAwarded`)
    ,
    pointsAwarded
  );
  await updateGameTimestamp(gameId);
}

export async function arePointsConfirmed(
  gameId: string,
  teamId: string,
  roundNumber: number
): Promise<boolean> {
  const snap = await get(
    ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}`)
  );
  return snap.val()?.pointsConfirmed === true;
}

export async function markPointsAsConfirmed(
  gameId: string,
  teamId: string,
  roundNumber: number
): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${roundNumber}/pointsConfirmed`]: true,
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
  PREPARE NEXT ROUND (STAGE 1) - AHORA POR EQUIPO
============================================================ */

// ✅ REEMPLAZADA COMPLETA (versión corregida con filtro de jugadores fantasma + capitán rotativo)
export async function prepareNextRound(gameId: string, teamId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game) throw new Error("Game not found");

  const teams = normalizeTeams((game as any).teams);
  const currentTeam = teams.find((t) => t.id === teamId);
  if (!currentTeam) throw new Error("Team not found");

  const currentRound = (currentTeam as any).currentRound ?? 0;
  const currentQuestionIndex = (currentTeam as any).currentQuestionIndex ?? 0;

  const questions = normalizeQuestions((game as any).questions);
  const stage1Questions = questions.filter((q: any) => (q as any).suggestedStage !== 2);

  const nextQuestionIndex = currentQuestionIndex + 1;
  const nextRoundNumber = currentRound + 1;

  // ✅ CORREGIDO: Filtrar jugadores fantasma
  const allPlayers = normalizePlayers((currentTeam as any).players);
  const players = allPlayers.filter(p =>
    (p as any).name &&
    (p as any).name !== 'Jugador' &&
    (p as any).name !== 'Capitán' &&
    (p as any).name !== 'Equipo' &&
    !(String((p as any).id || "").startsWith('player_')) // IDs generados automáticamente
  );

  console.log("🔍 prepareNextRound players:", players.map(p => ({ id: (p as any).id, name: (p as any).name, score: (p as any).score })));

  if (!players.length) throw new Error("No players in team");

  // Si ya no hay preguntas Stage 1, marcar stage1Completed
  if (nextQuestionIndex >= stage1Questions.length) {
    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Completed`]: true,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
    console.log(`✅ Team ${teamId} completed Stage 1`);
    return;
  }

  // Respondedor: el de menor puntaje
  const sorted = [...players].sort((a, b) => ((a as any).score ?? 0) - ((b as any).score ?? 0));
  const nextResponder = sorted[0];

  // ✅ CORREGIDO: Capitán rota según número de ronda
  let captainIndex = nextRoundNumber % players.length;
  let captain = players[captainIndex];

  // Si el capitán es el mismo que el respondedor, pasar al siguiente
  if ((captain as any).id === (nextResponder as any).id) {
    captainIndex = (captainIndex + 1) % players.length;
    captain = players[captainIndex];
  }

  const nextQuestion = stage1Questions[nextQuestionIndex];

  const nextRound: Round = {
    roundNumber: nextRoundNumber,
    questionId: (nextQuestion as any).id,
    respondingPlayerId: (nextResponder as any).id,
    respondingPlayerName: (nextResponder as any).name,
    captainId: (captain as any).id,
    captainName: (captain as any).name,
    ratings: {},
    pointsAwarded: {},
    hasResponded: false,
    timestamp: Date.now(),
  };

  console.log("🔍 nextRound:", { responder: (nextResponder as any).name, captain: (captain as any).name });

  await set(
    ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/stage1Rounds/${nextRoundNumber}`),
    nextRound
  );

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/teams/${teamId}/currentRound`]: nextRoundNumber,
    [`${GAMES_ROOT}/${gameId}/teams/${teamId}/currentQuestionIndex`]: nextQuestionIndex,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });

  console.log(`✅ Team ${teamId} advanced to round ${nextRoundNumber}`);
}

export async function startStage2Safely(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game) throw new Error("Game not found");

  // Si stage2 ya existe, solo asegurar que el status sea correcto
  if ((game as any).stage2) {
    console.log("ℹ️ Stage 2 already exists, ensuring status is updated.");

    // ✅ Asegurar que el status sea "stage2" aunque ya exista
    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/status/status`]: "stage2",
      [`${GAMES_ROOT}/${gameId}/status/currentStage`]: 2,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
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

export function generateRoomCode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Compat: actualiza score aunque `players` sea array u object
 */
export async function updatePlayerScoreSmartCompat(
  gameId: string,
  teamId: string,
  playerId: string,
  newScore: number
): Promise<void> {
  const playersRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/players`);
  const snap = await get(playersRef);
  const players = snap.val();

  if (!players) return;

  if (!Array.isArray(players) && typeof players === "object") {
    const p = (players as any)[playerId];
    if (!p) return;
    const curr = p?.score ?? 0;
    if (curr >= newScore) return;

    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${playerId}/score`]: newScore,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
    return;
  }

  if (Array.isArray(players)) {
    const idx = players.findIndex((p: any) => p?.id === playerId);
    if (idx < 0) return;

    const curr = players[idx]?.score ?? 0;
    if (curr >= newScore) return;

    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${idx}/score`]: newScore,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
  }
}

/**
 * Compat: actualiza consecutiveLastPlace aunque `players` sea array u object
 */
export async function updatePlayerLastPlaceCounterSmartCompat(
  gameId: string,
  teamId: string,
  playerId: string,
  newCount: number
): Promise<void> {
  const playersRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}/players`);
  const snap = await get(playersRef);
  const players = snap.val();

  if (!players) return;

  if (!Array.isArray(players) && typeof players === "object") {
    const p = (players as any)[playerId];
    if (!p) return;

    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${playerId}/consecutiveLastPlace`]: newCount,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
    return;
  }

  if (Array.isArray(players)) {
    const idx = players.findIndex((p: any) => p?.id === playerId);
    if (idx < 0) return;

    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/teams/${teamId}/players/${idx}/consecutiveLastPlace`]: newCount,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
  }
}
