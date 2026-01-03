// src/services/stage0Service.ts
// Servicio para gestionar Stage 0 - Propuestas de consignas

import { ref, update, get, push, set, serverTimestamp, remove } from 'firebase/database';
import { database } from '../firebase.config';
import type {
  Stage0Proposal,
  Stage0State,
  Stage0Phase,
  ProposalType,
  Game
} from '../types/game';

// ============================================
// INICIALIZAR STAGE 0
// ============================================

export async function initializeStage0(gameId: string): Promise<void> {
  const stage0State: Stage0State = {
    phase: 'reading',
    proposals: {},
    readyTeams: [],
  };

  await update(ref(database, `games/${gameId}`), {
    stage0: stage0State,
    'status/status': 'stage0',
    'status/currentStage': 0,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// CAMBIAR FASE DE STAGE 0
// ============================================

export async function setStage0Phase(
  gameId: string,
  phase: Stage0Phase,
  timerMinutes?: number
): Promise<void> {
  const updates: Record<string, unknown> = {
    'stage0/phase': phase,
    updatedAt: serverTimestamp(),
  };

  // Si estamos iniciando la fase de propuestas con timer
  if (phase === 'proposing' && timerMinutes) {
    updates['stage0/timerStartedAt'] = Date.now();
  }

  await update(ref(database, `games/${gameId}`), updates);
}

// ============================================
// PROPUESTAS DE EQUIPOS
// ============================================

export interface NewProposal {
  teamId: string;
  teamName: string;
  type: ProposalType;
  questionText: string;
  hint?: string;
  relatedTopic?: string;
  submittedBy?: string;
}

export async function submitProposal(
  gameId: string,
  proposal: NewProposal
): Promise<string> {
  // Generar ID único
  const proposalRef = push(ref(database, `games/${gameId}/stage0/proposals`));
  const proposalId = proposalRef.key!;

  const newProposal: Stage0Proposal = {
    id: proposalId,
    teamId: proposal.teamId,
    teamName: proposal.teamName,
    type: proposal.type,
    questionText: proposal.questionText,
    hint: proposal.hint || undefined,
    relatedTopic: proposal.relatedTopic || undefined,
    submittedAt: Date.now(),
    submittedBy: proposal.submittedBy || undefined,
    status: 'pending',
    bonusPoints: 0,
  };

  await update(ref(database, `games/${gameId}/stage0/proposals/${proposalId}`), newProposal);

  return proposalId;
}

export async function deleteProposal(
  gameId: string,
  proposalId: string
): Promise<void> {
  await remove(
    ref(database, `games/${gameId}/stage0/proposals/${proposalId}`)
  );
}

export async function getTeamProposals(
  gameId: string,
  teamId: string
): Promise<Stage0Proposal[]> {
  const snapshot = await get(ref(database, `games/${gameId}/stage0/proposals`));

  if (!snapshot.exists()) return [];

  const proposals = snapshot.val() as Record<string, Stage0Proposal>;
  return Object.values(proposals).filter(p => p.teamId === teamId);
}

export async function getAllProposals(
  gameId: string
): Promise<Stage0Proposal[]> {
  const snapshot = await get(ref(database, `games/${gameId}/stage0/proposals`));

  if (!snapshot.exists()) return [];

  const proposals = snapshot.val() as Record<string, Stage0Proposal>;
  return Object.values(proposals).sort((a, b) => a.submittedAt - b.submittedAt);
}

// ============================================
// EQUIPO LISTO
// ============================================

export async function markTeamReady(
  gameId: string,
  teamId: string
): Promise<void> {
  const snapshot = await get(ref(database, `games/${gameId}/stage0/readyTeams`));
  const readyTeams: string[] = snapshot.exists() ? snapshot.val() : [];

  if (!readyTeams.includes(teamId)) {
    readyTeams.push(teamId);
    await update(ref(database, `games/${gameId}/stage0`), {
      readyTeams,
    });
  }
}

export async function unmarkTeamReady(
  gameId: string,
  teamId: string
): Promise<void> {
  const snapshot = await get(ref(database, `games/${gameId}/stage0/readyTeams`));
  const readyTeams: string[] = snapshot.exists() ? snapshot.val() : [];

  const filtered = readyTeams.filter(id => id !== teamId);
  await update(ref(database, `games/${gameId}/stage0`), {
    readyTeams: filtered,
  });
}

// ============================================
// REVISIÓN DEL DOCENTE
// ============================================

export interface ReviewData {
  status: 'approved' | 'rejected' | 'edited';
  bonusPoints?: number;
  teacherComment?: string;
  editedText?: string;
  savedToLibrary?: boolean;
}

export async function reviewProposal(
  gameId: string,
  proposalId: string,
  review: ReviewData
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: review.status,
    bonusPoints: review.bonusPoints || 0,
    reviewedAt: Date.now(),
  };

  if (review.teacherComment) {
    updates.teacherComment = review.teacherComment;
  }

  if (review.editedText) {
    updates.editedText = review.editedText;
  }

  if (review.savedToLibrary) {
    updates.savedToLibrary = true;
  }

  await update(ref(database, `games/${gameId}/stage0/proposals/${proposalId}`), updates);
}

export async function approveProposal(
  gameId: string,
  proposalId: string,
  bonusPoints: number = 0,
  editedText?: string
): Promise<void> {
  await reviewProposal(gameId, proposalId, {
    status: editedText ? 'edited' : 'approved',
    bonusPoints,
    editedText,
  });
}

export async function rejectProposal(
  gameId: string,
  proposalId: string,
  comment?: string
): Promise<void> {
  await reviewProposal(gameId, proposalId, {
    status: 'rejected',
    bonusPoints: 0,
    teacherComment: comment,
  });
}

// ============================================
// APLICAR BONUS Y FINALIZAR STAGE 0
// ============================================

export async function applyStage0Bonus(gameId: string): Promise<Record<string, number>> {
  // Obtener todas las propuestas aprobadas
  const proposals = await getAllProposals(gameId);
  const approvedProposals = proposals.filter(p =>
    p.status === 'approved' || p.status === 'edited'
  );

  // Calcular bonus por equipo
  const bonusByTeam: Record<string, number> = {};

  for (const proposal of approvedProposals) {
    if (!bonusByTeam[proposal.teamId]) {
      bonusByTeam[proposal.teamId] = 0;
    }
    bonusByTeam[proposal.teamId] += proposal.bonusPoints;
  }

  // Aplicar bonus a cada equipo
  const gameSnapshot = await get(ref(database, `games/${gameId}`));
  const game = gameSnapshot.val() as Game;

  const teamUpdates: Record<string, unknown> = {};

  // Soportar teams como ARRAY u OBJECT
  if (Array.isArray((game as any).teams)) {
    const teamsArr = (game as any).teams as any[];
    teamsArr.forEach((team, index) => {
      const teamId = team?.id;
      if (!teamId) return;

      const bonus = bonusByTeam[teamId] || 0;
      const path = `teams/${index}`;

      teamUpdates[`${path}/stage0Bonus`] = bonus;

      const prevScore = (team?.totalScore ?? team?.score ?? 0) as number;
      teamUpdates[`${path}/totalScore`] = prevScore + bonus;
      teamUpdates[`${path}/score`] = prevScore + bonus;
    });
  } else {
    const teamsObj = ((game as any).teams || {}) as Record<string, any>;

    Object.entries(teamsObj).forEach(([teamKey, teamVal]) => {
      const teamId = teamVal?.id || teamKey;
      const bonus = bonusByTeam[teamId] || 0;
      const path = `teams/${teamKey}`;

      teamUpdates[`${path}/stage0Bonus`] = bonus;

      const prevScore = (teamVal?.totalScore ?? teamVal?.score ?? 0) as number;
      teamUpdates[`${path}/totalScore`] = prevScore + bonus;
      teamUpdates[`${path}/score`] = prevScore + bonus;
    });
  }

  teamUpdates['stage0BonusApplied'] = true;
  teamUpdates['updatedAt'] = serverTimestamp();

  await update(ref(database, `games/${gameId}`), teamUpdates);

  return bonusByTeam;
}

export async function finishStage0AndStartStage1(gameId: string): Promise<void> {
  // 1. Aplicar bonus de Stage 0
  await applyStage0Bonus(gameId);

  // 2. Leer el juego completo
  const gameSnap = await get(ref(database, `games/${gameId}`));
  const game = gameSnap.val();

  console.log("🔍 DEBUG finishStage0:", {
    gameId,
    gameExists: !!game,
    teamsKeys: game?.teams ? Object.keys(game.teams) : [],
  });

  if (!game) throw new Error("Game not found");
  if (!game.teams) throw new Error("No teams found in game");

  // 3. Obtener preguntas de Stage 1
  const questionsRaw = game.questions;
  const questions = questionsRaw
    ? (Array.isArray(questionsRaw) ? questionsRaw : Object.values(questionsRaw))
        .filter((q: any) => q && typeof q === 'object')
    : [];

  if (questions.length === 0) throw new Error("No questions found");

  const stage1Questions = questions.filter((q: any) => q.suggestedStage !== 2);
  const firstQuestion = stage1Questions[0] || questions[0];

  // 4. Preparar updates
  const updates: Record<string, any> = {
    'status/status': 'stage1',
    'status/currentStage': 1,
    'stage0/phase': 'results',
    updatedAt: Date.now(),
  };

  // 5. Inicializar cada equipo con su ronda inicial
  const teamEntries = Object.entries(game.teams);

  for (const [teamId, teamData] of teamEntries) {
    const team = teamData as any;
    if (!team || typeof team !== 'object') continue;

    // Obtener jugadores del equipo (filtrar fantasmas)
    const playersRaw = team.players;
    let players: any[] = [];

    if (playersRaw) {
      if (Array.isArray(playersRaw)) {
        players = playersRaw.filter((p: any) => p && typeof p === 'object' && p.id);
      } else if (typeof playersRaw === 'object') {
        players = Object.entries(playersRaw).map(([key, val]: [string, any]) => ({
          id: val?.id || key,
          name: val?.name || 'Jugador',
          score: val?.score || 0,
          consecutiveLastPlace: val?.consecutiveLastPlace || 0,
        }));
      }
    }

    // ✅ NUEVO: Filtrar jugadores fantasma
    players = players.filter(p =>
      p.name &&
      p.name !== 'Jugador' &&
      p.name !== 'Capitán' &&
      p.name !== 'Equipo' &&
      !String(p.id || '').startsWith('player_') // IDs generados automáticamente
    );

    console.log("🔍 Players for team", teamId, players.map(p => ({ id: p.id, name: p.name })));

    // Crear ronda inicial
    let firstRound: any;

    if (players.length === 0) {
      // Sin jugadores: crear ronda básica
      firstRound = {
        roundNumber: 0,
        questionId: (firstQuestion as any).id,
        respondingPlayerId: null,
        respondingPlayerName: 'Equipo',
        captainId: null,
        captainName: 'Equipo',
        ratings: {},
        pointsAwarded: {},
        hasResponded: false,
        timestamp: Date.now(),
      };
    } else {
      // Con jugadores: asignar respondedor y capitán
      const sorted = [...players].sort((a: any, b: any) => (a.score ?? 0) - (b.score ?? 0));
      const responder = sorted[0];

      let captainIndex = 0;
      let captain = players[captainIndex];

      if (players.length > 1 && captain.id === responder.id) {
        captainIndex = 1;
        captain = players[captainIndex];
      }

      firstRound = {
        roundNumber: 0,
        questionId: (firstQuestion as any).id,
        respondingPlayerId: responder.id,
        respondingPlayerName: responder.name, // ✅ Ya no necesita fallback
        captainId: captain.id,
        captainName: captain.name, // ✅ Ya no necesita fallback
        ratings: {},
        pointsAwarded: {},
        hasResponded: false,
        timestamp: Date.now(),
      };
    }

    // Guardar ronda inicial en el equipo
    updates[`teams/${teamId}/stage1Rounds/0`] = firstRound;
    updates[`teams/${teamId}/currentRound`] = 0;
    updates[`teams/${teamId}/currentQuestionIndex`] = 0;
    updates[`teams/${teamId}/stage1Completed`] = false;
  }

  // 6. Aplicar todas las actualizaciones
  await update(ref(database, `games/${gameId}`), updates);

  console.log("✅ Stage 0 finished, Stage 1 started with", teamEntries.length, "teams");
}

// ============================================
// ESTADÍSTICAS
// ============================================

export interface Stage0Stats {
  totalProposals: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  editedCount: number;
  byTeam: Record<string, {
    teamName: string;
    submitted: number;
    approved: number;
    totalBonus: number;
  }>;
  byType: Record<ProposalType, number>;
}

export async function getStage0Stats(gameId: string): Promise<Stage0Stats> {
  const proposals = await getAllProposals(gameId);

  const stats: Stage0Stats = {
    totalProposals: proposals.length,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    editedCount: 0,
    byTeam: {},
    byType: {
      comprehension: 0,
      relation: 0,
      application: 0,
      analysis: 0,
      production: 0,
    },
  };

  for (const p of proposals) {
    // Por estado
    switch (p.status) {
      case 'pending': stats.pendingCount++; break;
      case 'approved': stats.approvedCount++; break;
      case 'rejected': stats.rejectedCount++; break;
      case 'edited': stats.editedCount++; break;
    }

    // Por tipo
    stats.byType[p.type]++;

    // Por equipo
    if (!stats.byTeam[p.teamId]) {
      stats.byTeam[p.teamId] = {
        teamName: p.teamName,
        submitted: 0,
        approved: 0,
        totalBonus: 0,
      };
    }
    stats.byTeam[p.teamId].submitted++;
    if (p.status === 'approved' || p.status === 'edited') {
      stats.byTeam[p.teamId].approved++;
      stats.byTeam[p.teamId].totalBonus += p.bonusPoints;
    }
  }

  return stats;
}

// ============================================
// HELPERS
// ============================================

export function getProposalTypeLabel(type: ProposalType, language: 'es' | 'en'): string {
  const labels = {
    es: {
      comprehension: '📝 Comprensión',
      relation: '🔗 Relación con otros temas',
      application: '🌍 Aplicación práctica',
      analysis: '🤔 Análisis / Opinión',
      production: '💡 Producción',
    },
    en: {
      comprehension: '📝 Comprehension',
      relation: '🔗 Connection to other topics',
      application: '🌍 Practical application',
      analysis: '🤔 Analysis / Opinion',
      production: '💡 Production',
    },
  };
  return labels[language][type];
}

export function getProposalTypeDescription(type: ProposalType, language: 'es' | 'en'): string {
  const descriptions = {
    es: {
      comprehension: '¿Qué significa...? / Explicá con tus palabras...',
      relation: '¿Cómo se conecta con...? / ¿Qué similitudes hay con...?',
      application: '¿Dónde se ve en la vida real? / ¿Cómo usarías...?',
      analysis: '¿Por qué crees que...? / ¿Qué pasaría si...?',
      production: 'Dibujá / Representá / Ordená los pasos...',
    },
    en: {
      comprehension: 'What does it mean...? / Explain in your own words...',
      relation: 'How does it connect to...? / What similarities are there with...?',
      application: 'Where do you see this in real life? / How would you use...?',
      analysis: 'Why do you think...? / What would happen if...?',
      production: 'Draw / Represent / Order the steps...',
    },
  };
  return descriptions[language][type];
}

// ============================================
// GUARDAR EN BIBLIOTECA PERSONAL
// ============================================

export interface SavedPrompt {
  id: string;
  text: string;
  type: ProposalType;
  hint?: string;
  relatedTopic?: string;
  originalTeam?: string;
  gameId?: string;
  gameTopic?: string;
  savedAt: number;
  usedCount: number;
}

export async function saveProposalToLibrary(
  userId: string,
  proposal: Stage0Proposal,
  gameInfo?: { gameId: string; topic?: string }
): Promise<string> {
  const savedRef = push(ref(database, `users/${userId}/savedPrompts`));
  const savedId = savedRef.key!;

  const savedPrompt: SavedPrompt = {
    id: savedId,
    text: proposal.editedText || proposal.questionText,
    type: proposal.type,
    hint: proposal.hint,
    relatedTopic: proposal.relatedTopic,
    originalTeam: proposal.teamName,
    gameId: gameInfo?.gameId,
    gameTopic: gameInfo?.topic,
    savedAt: Date.now(),
    usedCount: 0,
  };

  await set(savedRef, savedPrompt);

  // Mark as saved in the original proposal
  if (gameInfo?.gameId) {
    await update(ref(database, `games/${gameInfo.gameId}/stage0/proposals/${proposal.id}`), {
      savedToLibrary: true,
    });
  }

  return savedId;
}

export async function getSavedPrompts(userId: string): Promise<SavedPrompt[]> {
  const snapshot = await get(ref(database, `users/${userId}/savedPrompts`));

  if (!snapshot.exists()) return [];

  const prompts = snapshot.val() as Record<string, SavedPrompt>;
  return Object.values(prompts).sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteSavedPrompt(
  userId: string,
  promptId: string
): Promise<void> {
  await remove(
    ref(database, `users/${userId}/savedPrompts/${promptId}`)
  );
}

export async function incrementPromptUsage(userId: string, promptId: string): Promise<void> {
  const promptRef = ref(database, `users/${userId}/savedPrompts/${promptId}`);
  const snapshot = await get(promptRef);

  if (snapshot.exists()) {
    const prompt = snapshot.val() as SavedPrompt;
    await update(promptRef, {
      usedCount: (prompt.usedCount || 0) + 1,
    });
  }
}
