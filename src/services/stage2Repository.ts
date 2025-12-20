// src/services/stage2Repository.ts

import { ref, update, get, runTransaction } from "firebase/database";
import { database } from "../firebase.config";

import type {
  Game,
  Team,
  Stage2Round,
  Stage2RespondingTeam,
  Stage2RatingTeam,
  Stage2Phase,
  RatingColor,
  Question,
} from "../types/game";


const GAMES_ROOT = "games";

/* =========================================
   HELPERS
========================================= */

function normalizeQuestions(raw: unknown): Question[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((q: any, idx: number) => ({
        id: q?.id ?? String(idx),
        text: q?.text ?? "",
        hint: q?.hint ?? "",
        suggestedStage: q?.suggestedStage ?? 1,
      }))
      .filter((q: any) => !!q.id && !!q.text);
  }

  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, any>)
      .map(([key, q]) => ({
        id: q?.id ?? key,
        text: q?.text ?? "",
        hint: q?.hint ?? "",
        suggestedStage: q?.suggestedStage ?? 1,
      }))
      .filter((q: any) => !!q.id && !!q.text);
  }

  return [];
}

function normalizeTeams(raw: unknown): Team[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return (raw as any[]).filter((t) => t?.id);
  }

  if (typeof raw === "object") {
    return Object.values(raw as Record<string, any>).filter((t) => t?.id);
  }

  return [];
}

/**
 * Normaliza players del equipo (array u objeto)
 * y devuelve solo los que tengan id y name.
 * - Si RTDB guardó players como objeto, usa la key como id si falta value.id.
 */
function normalizePlayers(team: Team): { id: string; name: string }[] {
  const raw: unknown = (team as any).players;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((p: any, idx: number) => ({
        id: p?.id ?? String(idx),
        name: p?.name ?? "",
      }))
      .filter((p) => !!p.id && !!p.name);
  }

  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, any>)
      .map(([key, value]) => ({
        id: value?.id ?? key,
        name: value?.name ?? "",
      }))
      .filter((p) => !!p.id && !!p.name);
  }

  return [];
}

/**
 * Selecciona jugador aleatorio NO usado.
 * Si todos fueron usados → vuelve a permitir cualquiera (pool completo).
 */
function selectUnusedPlayer(team: Team): { id: string; name: string } | null {
  const players = normalizePlayers(team);
  if (players.length === 0) return null;

  const used = team.representativesUsed || [];
  const available = players.filter((p) => !used.includes(p.id));

  const pool = available.length > 0 ? available : players;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? null;
}

/**
 * Marca jugador como usado en el equipo.
 * Si ya se usaron todos → resetea la lista dejando solo el nuevo.
 */
async function markPlayerAsUsed(gameId: string, teamId: string, playerId: string) {
  const teamRef = ref(database, `${GAMES_ROOT}/${gameId}/teams/${teamId}`);
  const snap = await get(teamRef);
  const team = snap.val() as Team;

  const used = team?.representativesUsed || [];
  const allPlayers = normalizePlayers(team);

  if (allPlayers.length === 0) return;

  const nextUsed =
    used.length >= allPlayers.length ? [playerId] : [...used, playerId];

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/teams/${teamId}/representativesUsed`]: nextUsed,
  });
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

  const stage2 = game.stage2 || { currentRound: 0, currentQuestionIndex: 0, rounds: {} };

  const roundNumber = stage2.currentRound ?? 0;
  const qIndex = stage2.currentQuestionIndex ?? 0;

  const questions = normalizeQuestions((game as any).questions);
  const stage2Questions = questions.filter((q) => q.suggestedStage === 2);

  if (qIndex >= stage2Questions.length) throw new Error("No Stage 2 questions left");

  const question = stage2Questions[qIndex];
  const hintDuration =
    (game.stage2Config as any)?.hintDuration ??
    (game.config as any)?.timers?.stage2Hint ??
    60;

  const newRound: Stage2Round = {
    roundNumber,
    questionId: question.id,
    phase: "hint",

    hintStartedAt: Date.now(),
    hintDuration,

    questionRevealedAt: null,

    respondingTeam: null,
    ratingTeams: {},

    // 🆕 Calificación simultánea (sin raterOrder ni currentRaterIndex)
    ratingStartedAt: null,
    ratingTimerActive: false,
    ratingsRevealed: false,

    pointsAwarded: {},
    timestamp: Date.now(),
  };

  await update(ref(database), {
    [`${GAMES_ROOT}/${gameId}/stage2/currentRound`]: roundNumber,
    [`${GAMES_ROOT}/${gameId}/stage2/currentQuestionIndex`]: qIndex,
    [`${GAMES_ROOT}/${gameId}/stage2/rounds/${roundNumber}`]: newRound,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });

  console.log("✅ Stage 2 round created:", roundNumber);
}

/**
 * Designa representantes:
 * - Responde: equipo con menor puntaje
 * - Califican: los demás (sin orden específico, calificación simultánea)
 */
export async function designateRepresentatives(gameId: string) {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const round = game.stage2.rounds?.[r];
  if (!round) throw new Error("Round not found");

  const teams = normalizeTeams((game as any).teams);
  if (teams.length < 2) throw new Error("Need at least 2 teams");

  console.log(
    "DEV players per team:",
    teams.map((t) => ({
      team: t.name,
      playersNormalized: normalizePlayers(t).length,
      repsUsed: t.representativesUsed?.length ?? 0,
    }))
  );

  // Orden por puntaje (menor primero)
  const sorted = [...teams].sort((a, b) => (a.totalScore || 0) - (b.totalScore || 0));

  // Responde el primero
  const respondingTeam = sorted[0];
  const respondingPlayer = selectUnusedPlayer(respondingTeam);

  if (!respondingPlayer) {
    console.error("❌ respondingTeam players:", respondingTeam);
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
  };

  // Califican los demás (sin orden específico)
  const raters = sorted.slice(1);
  const ratingTeams: Record<string, Stage2RatingTeam> = {};

  for (const team of raters) {
    const p = selectUnusedPlayer(team);

    if (!p) {
      console.error("❌ ratingTeam without available player:", team);
      throw new Error(`No rater available for team ${team.name}`);
    }

    // 🆕 Estructura simplificada (sin order, helpRequested, etc.)
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

  // Marcar usados
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

  console.log("✅ Representatives designated");
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
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log("✅ Teacher started responding help");
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
  const rated = raters.filter((rt) => rt.rating !== null).length;

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
 * Valida si la respuesta del equipo que respondió fue correcta o incorrecta.
 * Esto lo decide el docente y determina cómo se distribuyen los puntos.
 */
export async function validateResponse(
  gameId: string,
  correct: boolean
): Promise<void> {
  const snap = await get(ref(database, `${GAMES_ROOT}/${gameId}`));
  const game = snap.val() as Game;
  if (!game?.stage2) throw new Error("Stage 2 not found");

  const r = game.stage2.currentRound;
  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;

  await update(ref(database), {
    [`${base}/responseValidated`]: correct,
    [`${base}/phase`]: "validation_ratings",
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: Date.now(),
  });

  console.log(`✅ Response validated as: ${correct ? "CORRECT" : "INCORRECT"}`);
}
/* =========================================
   🆕 VALIDATION
========================================= */

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

  // Verde siempre es aceptado automáticamente
  if (rater.rating === "green") {
    console.log("⚠️ Green ratings are auto-accepted, no manual validation needed");
    return;
  }

  const base = `${GAMES_ROOT}/${gameId}/stage2/rounds/${r}`;
  const now = Date.now();

  await update(ref(database), {
    [`${base}/ratingTeams/${teamId}/validated`]: accepted,
    [`${GAMES_ROOT}/${gameId}/updatedAt`]: now,
  });

  console.log(`✅ Rating validated for ${teamId}: ${accepted ? "ACCEPTED" : "REJECTED"}`);
}

/**
 * Verifica si todas las validaciones están completas.
 * Verde = auto-aceptado (no requiere validación manual)
 * Amarillo/Rojo = requiere validación manual (validated debe ser true o false)
 */
export function isValidationComplete(round: Stage2Round): boolean {
  const raters = Object.values(round.ratingTeams || {});

  for (const rater of raters) {
    // Verde: auto-aceptado, no necesita validación manual
    if (rater.rating === "green") continue;

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
      const helpUsed = responding.helpStartedAt !== null;
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
   LEGACY / COMPATIBILITY
========================================= */

// ❌ OBSOLETAS (eran para calificación secuencial)
// Las dejamos comentadas por si necesitás referencia

// export async function setActiveRaterSolo(gameId: string) { ... }
// export async function setActiveRaterWithHelp(gameId: string) { ... }
// export async function submitActiveRaterRatingColor(...) { ... }
// export async function advanceRaterOrFinish(gameId: string) { ... }
// export async function getActiveRaterTeamId(gameId: string) { ... }
// export async function setActiveRaterHelpRequested(...) { ... }

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
