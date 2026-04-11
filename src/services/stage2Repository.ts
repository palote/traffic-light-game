// src/services/stage2Repository.ts
// ✅ VERSIÓN COMPLETA: Todas las funciones exportadas + sin errores de build

import { ref, update, get, set, remove } from "firebase/database";
import { database } from "../firebase.config";
import type {
  Game,
  Team,
  Player,
  Stage2Round,
  Stage2RespondingTeam,
  Stage2RatingTeam,
  Question,
} from "../types/game";

const GAMES_ROOT = "games";

/* =========================
   TIPOS FALTANTES (agregados)
========================= */

type Stage2Phase =
  | "hint"
  | "designated"
  | "question_revealed"
  | "responding"
  | "rating"
  | "rating_reveal"
  | "justification"
  | "validation_response"
  | "validation_ratings"
  | "results";

type RatingColor = "green" | "yellow" | "red";

/* =========================
   HELPERS DE NORMALIZACIÓN (locales a este archivo)
========================= */

/**
 * Normaliza jugadores de cualquier estructura a array consistente
 */
function normalizePlayers(raw: unknown): Player[] {
  if (Array.isArray(raw)) {
    return raw.filter((p): p is Player =>
      !!p && typeof p === "object" && !!p.id && !!p.name
    );
  }

  if (raw && typeof raw === "object") {
    return Object.values(raw).filter((p): p is Player =>
      !!p && typeof p === "object" && !!p.id && !!p.name
    );
  }

  return [];
}

/**
 * Normaliza equipos de cualquier estructura a array consistente
 */
function normalizeTeams(raw: unknown): Team[] {
  if (!raw) return [];

  const teamsArray = Array.isArray(raw)
    ? raw
    : typeof raw === 'object'
      ? Object.values(raw as Record<string, any>)
      : [];

  return teamsArray
    .filter((t): t is Team => !!t && typeof t === "object" && !!t.id)
    .map((t) => {
      const players = normalizePlayers((t as any).players || []);

      return {
        id: t.id || "",
        name: t.name || "",
        players: players,
        representativesUsed: Array.isArray(t.representativesUsed)
          ? t.representativesUsed
          : [],
        totalScore: t.totalScore || 0,
        stage1Completed: t.stage1Completed || false,
        currentRound: (t.currentRound as number) || 0,
        stage0Bonus: t.stage0Bonus === true, // o t.stage0Bonus || false según tu lógica
      } satisfies Team; // ✅ Verifica que el objeto cumpla exactamente con Team
    });
}

/**
 * Selecciona jugador aleatorio NO usado.
 * Si todos fueron usados → vuelve a permitir cualquiera (pool completo).
 */
function selectUnusedPlayer(team: Team): { id: string; name: string } | null {
  // ✅ CORREGIDO: pasar team.players (gracias a Claude)
  const players = normalizePlayers(team.players);

  if (players.length === 0) {
    console.warn(`⚠️ Team ${team.name} has no players`);
    return null;
  }

  const used = team.representativesUsed || [];
  const available = players.filter((p) => !used.includes(p.id));

  const pool = available.length > 0 ? available : players;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? null;
}

/**
 * Marca un jugador como usado para un equipo
 */
async function markPlayerAsUsed(gameId: string, teamId: string, playerId: string) {
  const teamRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}`);
  const snap = await get(teamRef);
  const team = snap.val() as Team;

  if (!team) {
    console.warn(`⚠️ Team ${teamId} not found when marking player as used`);
    return;
  }

  // ✅ ASEGURAR ESTRUCTURA DE REPRESENTATIVESUSED
  const used = Array.isArray(team.representativesUsed)
    ? team.representativesUsed
    : [];

  const allPlayers = normalizePlayers(team.players);

  if (allPlayers.length === 0) {
    console.warn(`⚠️ No players found in team ${teamId} when marking player as used`);
    return;
  }

  const nextUsed =
    used.length >= allPlayers.length ? [playerId] : [...used, playerId];

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/teams/${teamId}/representativesUsed`]: nextUsed,
  });
}

/* =========================
   FUNCIONES PÚBLICAS CRÍTICAS
========================= */

/**
 * ✅ CORREGIDO: Inicia una nueva ronda de Stage 2
 * Retorna false si no hay más preguntas disponibles
 */
export async function startStage2Round(gameId: string): Promise<boolean> {
  console.log("🚀 Iniciando nueva ronda de Stage 2...");

  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game) throw new Error("Game not found");
  if (!game.stage2) throw new Error("Stage 2 not initialized");

  const currentRound = game.stage2.currentRound ?? 0;

  // ✅ Seleccionar preguntas para Stage 2 (solo preguntas con suggestedStage === 2)
  const allQuestions = Object.values(game.questions || {}) as Question[];
  const stage2Questions = allQuestions.filter(q => q.suggestedStage === 2);

  if (stage2Questions.length === 0) {
    throw new Error("No Stage 2 questions available");
  }

  // ✅ NUEVO: Verificar si ya se jugaron todas las preguntas
  // currentRound es base 0, así que si currentRound >= cantidad de preguntas, ya terminamos
  if (currentRound >= stage2Questions.length) {
    console.log("🏁 No hay más preguntas de Stage 2. Finalizando juego...");
    
    // Marcar el juego como finalizado
    await update(ref(database), {
      [`${GAMES_ROOT}/${gameId}/status/status`]: "game_complete",
      [`${GAMES_ROOT}/${gameId}/stage2/completed`]: true,
      [`${GAMES_ROOT}/${gameId}/stage2/completedAt`]: Date.now(),
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
    });
    
    return false; // Indica que no se creó nueva ronda
  }

  // ✅ Seleccionar la pregunta correspondiente a esta ronda (sin repetir)
  const selectedQuestion = stage2Questions[currentRound];

  if (!selectedQuestion?.id) {
    throw new Error("Selected question has no ID");
  }

  // ✅ Crear estructura de nueva ronda
  const newRound: Stage2Round = {
    roundNumber: currentRound,
    questionId: selectedQuestion.id,
    phase: "hint",
    hintRevealedAt: Date.now(),
    respondingTeam: null,
    ratingTeams: {},
    justificationOrder: [],
    currentJustificationIndex: 0,
    pointsAwarded: {},
    responseValidated: null,
  };

  // ✅ Actualizar estado del juego
  const updates: Record<string, any> = {
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${currentRound}`]: newRound,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  };

  await update(ref(database), updates);
  console.log(`✅ Stage 2 round ${currentRound + 1} of ${stage2Questions.length} created successfully`);
  
  return true; // Indica que se creó la ronda exitosamente
}

/**
 * ✅ NUEVA FUNCIÓN: Verifica si hay más rondas disponibles en Stage 2
 */
export async function hasMoreStage2Rounds(gameId: string): Promise<boolean> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) return false;

  const currentRound = game.stage2.currentRound ?? 0;
  const allQuestions = Object.values(game.questions || {}) as Question[];
  const stage2Questions = allQuestions.filter(q => q.suggestedStage === 2);

  // Si la ronda actual + 1 es menor que el total de preguntas, hay más rondas
  return (currentRound + 1) < stage2Questions.length;
}

/**
 * ✅ NUEVA FUNCIÓN: Finaliza Stage 2 manualmente
 */
export async function finalizeStage2(gameId: string): Promise<void> {
  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/status/status`]: "game_complete",
    [`${GAMES_ROOT}/${gameId}/stage2/completed`]: true,
    [`${GAMES_ROOT}/${gameId}/stage2/completedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
  console.log("🏁 Stage 2 finalized manually");
}

/**
 * Designa representantes para la ronda actual de Stage 2
 */
export async function designateRepresentatives(gameId: string) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  // ✅ NORMALIZAR EQUIPOS CON ESTRUCTURA SEGURA
  const teams = normalizeTeams((game as any).teams);
  console.log("🔍 DESIGNATE REPRESENTATIVES - Teams normalized:", teams.map(t => ({
    id: t.id,
    name: t.name,
    playersCount: t.players.length,
    players: t.players
  })));


  // ✅ AGREGAR ESTE LOG:
  console.log("DEV raw team data:", JSON.stringify(teams[0], null, 2));
  if (teams.length < 2) throw new Error("Need at least 2 teams");
  console.log("DEV players per team:", teams.map((t) => ({
    team: t.name,
    playersNormalized: normalizePlayers(t.players).length,
    repsUsed: t.representativesUsed?.length ?? 0,
  })));
  // Ordenar por puntaje (menor primero)
  const sorted = [...teams].sort((a, b) => (a.totalScore || 0) - (b.totalScore || 0));

  // ✅ VALIDAR JUGADORES ANTES DE SELECCIONAR
  const respondingTeam = sorted[0];
  console.log("🔍 RESPONDING TEAM:", respondingTeam.name, {
    players: respondingTeam.players,
    representativesUsed: respondingTeam.representativesUsed
  });

  if (respondingTeam.players.length === 0) {
    throw new Error(`Team ${respondingTeam.name} has no players available`);
  }

  // ✅ SELECCIONAR JUGADOR CON VALIDACIÓN EXTRA
  let respondingPlayer = selectUnusedPlayer(respondingTeam);

  if (!respondingPlayer) {
    console.warn("⚠️ No unused player found, trying all players pool");
    // Forzar selección de cualquier jugador si no hay disponibles
    respondingPlayer = respondingTeam.players[0];
  }

  if (!respondingPlayer) {
    throw new Error(`No responding player available for team ${respondingTeam.name}`);
  }

  const helpDuration =
    (game.stage2Config as any)?.helpDuration ??
    (game.config as any)?.timers?.stage2Help ??
    60;

  const responding: Stage2RespondingTeam = {
    teamId: respondingTeam.id,
    playerId: respondingPlayer.id,
    playerName: respondingPlayer.name,
    helpRequested: false,
    helpStartedAt: null,
    helpDuration,
    helpRemainingSec: helpDuration,
    responseGiven: false,
    helpUsed: false, // ✅ Inicializar helpUsed
  };

  // Califican los demás (sin orden específico)
  const raters = sorted.slice(1);
  const ratingTeams: Record<string, Stage2RatingTeam> = {};
  // ✅ AGREGAR: Log de diagnóstico para TODOS los equipos
  console.log("🔍 ALL TEAMS PLAYERS:", teams.map(t => ({
    name: t.name,
    playersCount: t.players?.length ?? 0,
    rawPlayers: (game.teams as any)?.[t.id]?.players,
  })));
  for (const team of raters) {
    if (team.players.length === 0) {
      throw new Error(`Team ${team.name} has no players available for rating`);
    }

    let p = selectUnusedPlayer(team);

    if (!p) {
      console.warn(`⚠️ No unused rater for ${team.name}, using first player`);
      p = team.players[0];
    }

    if (!p) {
      throw new Error(`No rater available for team ${team.name}`);
    }

    ratingTeams[team.id] = {
      teamId: team.id,
      teamName: team.name,
      playerId: p.id,
      playerName: p.name,
      rating: null,
      ratedAt: null,
      justification: null,
      validated: null,
    };
  }

  // ✅ MARCAR JUGADORES USADOS (con validación)
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

  console.log("✅ Representatives designated successfully");
}

/**
 * Obtiene el teamId del equipo que está justificando actualmente.
 */
export async function getCurrentJustifyingTeamId(gameId: string): Promise<string | null> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) return null;

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) return null;

  const order = (round as any).justificationOrder || [];
  const currentIndex = (round as any).currentJustificationIndex ?? 0;

  return order[currentIndex] ?? null;
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
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/phase`]: "question_revealed",
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/questionRevealedAt`]: Date.now(),
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });
}

/**
 * Setea la fase de la ronda actual de Stage 2.
 */
export async function setStage2Phase(gameId: string, phase: Stage2Phase) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;

  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${r}/phase`]: phase,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });

  console.log("✅ Stage 2 phase set to:", phase);
}

/* =========================================
   RESPONDING (RESPUESTA)
========================================= */

/**
 * Marca pedido de ayuda del equipo que responde.
 */
export async function setRespondingHelpRequested(gameId: string, requested: boolean) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/respondingTeam/helpRequested`]: requested,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Responding helpRequested set to:", requested);
}

export async function teacherStartRespondingHelp(gameId: string) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const round = game.stage2.rounds?.[r];
  if (!round?.respondingTeam) throw new Error("Responding team not found");

  const rt: any = round.respondingTeam;
  const now = Date.now();

  const duration = rt.helpDuration ?? (game as any)?.stage2Config?.helpDuration ?? 60;
  const remainingBase = rt.helpRemainingSec ?? duration;

  await update(ref(database), {
    [`${base}/respondingTeam/helpRequested`]: false,
    [`${base}/respondingTeam/helpStartedAt`]: now,
    [`${base}/respondingTeam/helpDuration`]: duration,
    [`${base}/respondingTeam/helpRemainingSec`]: remainingBase,
    [`${base}/respondingTeam/helpUsed`]: true,   // ✅ FIX: marcar aquí, no solo al terminar
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Teacher started responding help (helpUsed = true)");
}

export async function teacherPauseRespondingHelp(gameId: string) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const round = game.stage2.rounds?.[r];
  if (!round?.respondingTeam) throw new Error("Responding team not found");

  const rt: any = round.respondingTeam;
  const startedAt = rt.helpStartedAt;
  if (!startedAt) {
    console.log("⚠️ Pause ignored (help not running)");
    return;
  }

  const now = Date.now();
  const elapsedSec = Math.floor((now - startedAt) / 1000);
  const remainingBase = rt.helpRemainingSec ?? rt.helpDuration ?? 60;
  const remaining = Math.max(0, remainingBase - elapsedSec);

  await update(ref(database), {
    [`${base}/respondingTeam/helpStartedAt`]: null,
    [`${base}/respondingTeam/helpRemainingSec`]: remaining,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Teacher paused responding help. Remaining:", remaining);
}

export async function teacherEndRespondingHelp(gameId: string) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/respondingTeam/helpRequested`]: false,
    [`${base}/respondingTeam/helpStartedAt`]: null,
    [`${base}/respondingTeam/helpRemainingSec`]: 0,
    [`${base}/respondingTeam/helpUsed`]: true, // ✅ FLAG PERMANENTE: ayuda fue usada
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Teacher ended responding help");
}

/**
 * Marca que el equipo que responde ya dio su respuesta.
 */
export async function setRespondingResponseGiven(gameId: string, given: boolean) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/respondingTeam/responseGiven`]: given,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Responding responseGiven set to:", given);
}

/* =========================================
   🆕 RATING (CALIFICACIÓN SIMULTÁNEA)
========================================= */

/**
 * Inicia la fase de calificación simultánea.
 * - Setea phase a "rating"
 * - Inicializa ratingStartedAt (opcional)
 */
export async function startRatingPhase(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/phase`]: "rating",
    [`${base}/ratingStartedAt`]: now,
    [`${base}/ratingTimerActive`]: false,
    [`${base}/ratingsRevealed`]: false,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Rating phase started (simultaneous)");
}

/**
 * Un equipo calificador envía su rating.
 * - Guarda el color y el timestamp
 */
export async function submitRating(
  gameId: string,
  teamId: string,
  color: RatingColor
): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  if (!round.ratingTeams?.[teamId]) {
    throw new Error(`Team ${teamId} is not a rater in this round`);
  }

  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/ratingTeams/${teamId}/rating`]: color,
    [`${base}/ratingTeams/${teamId}/ratedAt`]: now,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Rating submitted:", teamId, color);
}

/**
 * Devuelve cuántos equipos ya calificaron (tienen rating != null).
 */
export async function getRatingProgress(
  gameId: string
): Promise<{ rated: number; total: number }> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  const raters = Object.values(round.ratingTeams || {});
  const total = raters.length;
  const rated = raters.filter((r: any) => !!r?.rating).length;  // ✅ FIX: usar `raters`

  return { rated, total };
}

/**
 * Finaliza la calificación y revela los colores.
 * - Setea phase a "rating_reveal"
 * - Marca ratingsRevealed = true
 */
export async function finalizeRatings(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/phase`]: "rating_reveal",
    [`${base}/ratingsRevealed`]: true,
    [`${base}/ratingTimerActive`]: false,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Ratings finalized and revealed");
}

/* =========================================
   🆕 RATING TIMER (OPCIONAL)
========================================= */

/**
 * Activa el timer de calificación (opcional).
 * Similar al timer de responding help.
 */
export async function teacherStartRatingTimer(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/ratingTimerActive`]: true,
    [`${base}/ratingStartedAt`]: now,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Rating timer started");
}

export async function teacherPauseRatingTimer(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/ratingTimerActive`]: false,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Rating timer paused");
}

export async function teacherStopRatingTimer(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/ratingTimerActive`]: false,
    [`${base}/ratingStartedAt`]: null,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Rating timer stopped");
}

/* =========================================
   JUSTIFICATION
========================================= */

/**
 * Guarda la justificación de un rater.
 */
export async function setRaterJustification(
  gameId: string,
  teamId: string,
  text: string
) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/ratingTeams/${teamId}/justification`]: text,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Justification saved for team:", teamId);
}

/**
 * Obtiene el orden de justificación (equipos con AMARILLO o ROJO, ordenados por puntaje).
 * Devuelve array de teamIds en orden ascendente de puntaje.
 */
export async function getJustificationOrder(gameId: string): Promise<string[]> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  const teams = normalizeTeams((game as any).teams);

  // Filtrar solo equipos que necesitan justificar (amarillo o rojo)
  const needsJustification = Object.values(round.ratingTeams || {})
    .filter((rt: any) => rt.rating === "yellow" || rt.rating === "red")
    .map((rt: any) => {
      const team = teams.find((t) => t.id === rt.teamId);
      return {
        teamId: rt.teamId,
        totalScore: team?.totalScore ?? 0,
      };
    });

  // Ordenar por puntaje (menor a mayor)
  needsJustification.sort((a, b) => a.totalScore - b.totalScore);

  return needsJustification.map((item) => item.teamId);
}

/**
 * Inicia la fase de justificación secuencial.
 * - Calcula el orden de justificación
 * - Setea currentJustificationIndex = 0
 * - Cambia fase a "justification"
 */
export async function startJustificationPhase(gameId: string): Promise<void> {
  const justificationOrder = await getJustificationOrder(gameId);

  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  // ✅ Si no hay nadie que justificar (todos verdes), saltar a validación
  if (justificationOrder.length === 0) {
    console.log("ℹ️ No justifications needed (all green), skipping to validation");

    await update(ref(database), {
      [`${base}/phase`]: "validation_response",
      [`${base}/justificationOrder`]: [],
      [`${base}/currentJustificationIndex`]: 0,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
    });
    return;
  }

  await update(ref(database), {
    [`${base}/phase`]: "justification",
    [`${base}/justificationOrder`]: justificationOrder,
    [`${base}/currentJustificationIndex`]: 0,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Justification phase started. Order:", justificationOrder);
}

/**
 * Avanza al siguiente equipo en la justificación.
 * Si era el último, pasa a fase "validation".
 */
export async function advanceJustification(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  const order = (round as any).justificationOrder || [];
  const currentIndex = (round as any).currentJustificationIndex ?? 0;

  const isLast = currentIndex >= order.length - 1;

  if (!isLast) {
    // Siguiente equipo
    const nextIndex = currentIndex + 1;
    await update(ref(database), {
      [`${base}/currentJustificationIndex`]: nextIndex,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
    });

    console.log("✅ Next justification:", order[nextIndex], "index:", nextIndex);
  } else {
    // Era el último → validation
    await update(ref(database), {
      [`${base}/phase`]: "validation_response",  // ← CAMBIAR ESTA LÍNEA
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
    });

    console.log("✅ Last justification finished → validation_response");
  }
}

/* =========================================
   🆕 VALIDATION
========================================= */
/**
 * Verifica si todas las calificaciones son verdes.
 */
export function areAllRatingsGreen(round: Stage2Round): boolean {
  const raters = Object.values(round.ratingTeams || {});
  if (raters.length === 0) return false;

  return raters.every(rater => rater.rating === "green");
}

/**
 * Valida (acepta o rechaza) la calificación de un equipo.
 * Verde siempre es auto-aceptado, no necesita validación manual.
 */
export async function validateRating(
  gameId: string,
  teamId: string,
  accepted: boolean
): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  const rater = round.ratingTeams?.[teamId];
  if (!rater) throw new Error(`Team ${teamId} is not a rater`);

  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/ratingTeams/${teamId}/validated`]: accepted,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log(`✅ Rating validated for ${teamId}: ${accepted ? "ACCEPTED" : "REJECTED"}`);
}

/**
 * Valida si la respuesta fue correcta e indica si se usó ayuda.
 * La decisión del docente sobre ayuda tiene prioridad absoluta.
 * 
 * ✅ NUEVO: Si todos calificaron verde, salta validation_ratings y va directo a results.
 */
export async function validateResponse(
  gameId: string,
  correct: boolean,
  helpUsed: boolean | null
): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  // ✅ CORREGIDO: Asegurar que finalHelpUsed siempre sea booleano
  const existingHelpUsed = round?.respondingTeam?.helpUsed ?? false;
  const finalHelpUsed =
    helpUsed === true ||
    (helpUsed === false ? false : existingHelpUsed);

  // ✅ NUEVO: Verificar si todos son verdes
  const allGreen = areAllRatingsGreen(round);

  if (allGreen && correct) {
    // ✅ Todos verdes + respuesta correcta = auto-validar y saltar a results
    console.log("✅ All ratings are GREEN - skipping validation_ratings");

    // Auto-validar todos los verdes
    const ratingUpdates: Record<string, any> = {};
    const raters = Object.values(round.ratingTeams || {});
    for (const rater of raters) {
      ratingUpdates[`${base}/ratingTeams/${rater.teamId}/validated`] = true;
    }

    await update(ref(database), {
      [`${base}/responseValidated`]: correct,
      [`${base}/respondingTeam/helpUsed`]: finalHelpUsed,
      ...ratingUpdates,
      [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
    });

    // Calcular puntos directamente
    await calculateAndAwardPoints(gameId);
    return;
  }

  // Flujo normal: ir a validation_ratings
  await update(ref(database), {
    [`${base}/responseValidated`]: correct,
    [`${base}/respondingTeam/helpUsed`]: finalHelpUsed,
    [`${base}/phase`]: "validation_ratings",
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log(`✅ Response validated as: ${correct ? "CORRECT" : "INCORRECT"}`);
  console.log(`✅ Help used confirmed: ${finalHelpUsed ? "YES (9 pts)" : "NO (12 pts)"}`);
}

/**
 * Verifica si todas las validaciones están completas.
 * - Verde: automático (no requiere validación manual)
 * - Sin calificar: automático (no requiere validación manual)
 * - Amarillo/Rojo: requiere que validated sea true o false
 */
export function isValidationComplete(round: Stage2Round): boolean {
  const raters = Object.values(round.ratingTeams || {});

  for (const rater of raters) {
    // Verde o sin calificar: auto-validado, no necesita validación manual
    if (rater.rating === "green" || rater.rating === null || rater.rating === undefined) {
      continue;
    }

    // Amarillo/Rojo: debe tener validated = true o false
    if (rater.rating === "yellow" || rater.rating === "red") {
      if (rater.validated === null || rater.validated === undefined) {
        return false; // Falta validar
      }
    }
  }

  return true; // Todo validado
}

/**
 * Calcula y asigna puntos automáticamente según las validaciones.
 * - Respuesta: 12 pts (sin ayuda) o 9 pts (con ayuda)
 * - Verde aceptado: 5 pts
 * - Amarillo/Rojo aceptado: 10 pts
 * - Rechazado: 0 pts
 * 
 * Luego cambia fase a "results".
 */
export async function calculateAndAwardPoints(gameId: string): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  if (!isValidationComplete(round)) {
    throw new Error("Validation not complete. Cannot calculate points.");
  }

  const pointsAwarded: Record<string, number> = {};
  const teams = normalizeTeams((game as any).teams);

  // 🔑 Docente define si fue correcta
  const responseWasCorrect = round.responseValidated === true;

  const responding = round.respondingTeam;
  const raters = Object.values(round.ratingTeams || {});

  if (!responseWasCorrect) {
    console.log("❌ Response was INCORRECT - special point distribution");

    // 1) Respondió: 0
    if (responding) pointsAwarded[responding.teamId] = 0;

    // 2) Solo ROJOS aceptados: 12 pts (cambio de 10 a 12)
    for (const rater of raters) {
      if (rater.rating === "red" && rater.validated === true) {
        pointsAwarded[rater.teamId] = 12; // ← CAMBIO
      } else {
        pointsAwarded[rater.teamId] = 0;
      }
    }
  } else {
    console.log("✅ Response was CORRECT - normal point distribution");

    // 1) Puntos por responder (cambio: sin ayuda = 12 pts)
    if (responding) {
      // ✅ Determinar si se usó ayuda (con compatibilidad hacia atrás)
      const helpUsed =
        responding.helpUsed === true ||
        (responding.helpUsed === undefined && responding.helpStartedAt !== null);
      const responsePoints = helpUsed ? 9 : 12; // ← CAMBIO (antes era 9 : 12)
      pointsAwarded[responding.teamId] = responsePoints;
    }

    // 2) Puntos por calificar
    for (const rater of raters) {
      if (!rater.rating) continue;

      let ratingPoints = 0;

      if (rater.rating === "green") {
        // Verde YA NO es auto-aceptado, depende de validated
        ratingPoints = rater.validated === true ? 5 : 0; // ← CAMBIO
      } else if (rater.rating === "yellow") {
        ratingPoints = rater.validated === true ? 10 : 0;
      } else if (rater.rating === "red") {
        ratingPoints = 0; // Rojo en respuesta correcta no suma
      }

      pointsAwarded[rater.teamId] = (pointsAwarded[rater.teamId] || 0) + ratingPoints;
    }
  }

  // 3) Actualizar totalScore
  const teamUpdates: Record<string, any> = {};

  for (const [teamId, roundPoints] of Object.entries(pointsAwarded)) {
    const team = teams.find((t) => t.id === teamId);
    if (!team) continue;

    const newTotal = (team.totalScore || 0) + roundPoints;
    teamUpdates[`${GAMES_ROOT}/${gameId}/teams/${teamId}/totalScore`] = newTotal;
  }

  // 4) Guardar resultados
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    ...teamUpdates,
    [`${base}/pointsAwarded`]: pointsAwarded,
    [`${base}/phase`]: "results",
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Points calculated and awarded. Phase → results");
}

/* =========================================
   UTILITIES
========================================= */

/**
 * Compatibilidad Stage 1: subir preguntas desde CSV.
 */
export async function addQuestions(gameId: string, questions: any[]) {
  const updates: Record<string, any> = {};

  for (const q of questions) {
    if (!q?.id) continue;
    updates[`games/${gameId}/questions/${q.id}`] = q;
  }

  await update(ref(database), updates);
}