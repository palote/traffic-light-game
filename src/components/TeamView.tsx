// src/components/TeamView.tsx
// CON SONIDOS INTEGRADOS 🔊 + INTERNACIONALIZACIÓN 🌐 + ACCESIBILIDAD ♿
import { useEffect, useMemo, useState, useRef } from 'react';
import { ref, update } from 'firebase/database';
import { ref as storageRef, getBlob } from 'firebase/storage';
import { database, storage } from '../firebase.config';
import type { Team, Round, Rating, RatingColor } from '../types/game';
import {
  subscribeToGame,
  setRoundHasResponded,
  validateRating,
  addRating,
  awardPoints,
  updatePlayerScoreSmartCompat,
  updatePlayerLastPlaceCounterSmartCompat,
  prepareNextRound,
  arePointsConfirmed,
  markPointsAsConfirmed,
  areAllTeamsStage1Complete,
} from '../services/gameRepository';
import { useSound } from '../hooks/useSound';
import { useI18n } from '../i18n';
import './TeamView.css';

// ============================================
// TRADUCCIONES
// ============================================
const getTeamViewTexts = (lang: 'es' | 'en' | 'pt') => ({
  stage1Complete: {
    title: lang === 'es' ? '✅ Este equipo terminó Stage 1' : lang === 'pt' ? '✅ Esta equipe terminou a Etapa 1' : '✅ This team finished Stage 1',
    waiting: lang === 'es' ? '⏳ Esperando a que los demás equipos terminen...' : lang === 'pt' ? '⏳ Aguardando as outras equipes terminarem...' : '⏳ Waiting for other teams to finish...',
  },
  header: {
    stage: lang === 'es' ? 'Etapa 1' : lang === 'pt' ? 'Etapa 1' : 'Stage 1',
    round: lang === 'es' ? 'Ronda' : lang === 'pt' ? 'Rodada' : 'Round',
    of: lang === 'es' ? 'de' : lang === 'pt' ? 'de' : 'of',
  },
  pedagogicalReminder: lang === 'es'
    ? 'Si alguien está teniendo dificultades sostenidas, es un buen momento para pausar y reforzar la comprensión como equipo.'
    : lang === 'pt'
      ? 'Se alguém está tendo dificuldades constantes, é um bom momento para pausar e reforçar a compreensão como equipe.'
      : 'If someone is having sustained difficulties, it\'s a good time to pause and reinforce understanding as a team.',
  question: {
    title: lang === 'es' ? '📝 PREGUNTA DE ESTA RONDA:' : lang === 'pt' ? '📝 PERGUNTA DESTA RODADA:' : '📝 THIS ROUND\'S QUESTION:',
    supportMaterial: lang === 'es' ? '📄 Material de apoyo' : lang === 'pt' ? '📄 Material de apoio' : '📄 Support material',
  },
  response: {
    isAnswering: lang === 'es' ? 'está respondiendo la pregunta en voz alta.' : lang === 'pt' ? 'está respondendo a pergunta em voz alta.' : 'is answering the question out loud.',
    thePlayer: lang === 'es' ? 'El jugador' : lang === 'pt' ? 'O jogador' : 'The player',
    captain: lang === 'es' ? 'Capitán del dispositivo:' : lang === 'pt' ? 'Capitão do dispositivo:' : 'Device captain:',
    teamListens: lang === 'es' ? 'El resto del equipo escucha con atención para poder calificar después.' : lang === 'pt' ? 'O resto da equipe ouve com atenção para poder avaliar depois.' : 'The rest of the team listens carefully to rate afterwards.',
    tip: lang === 'es' ? 'Tip: Presten atención a si la respuesta es completa y correcta.' : lang === 'pt' ? 'Dica: Prestem atenção se a resposta é completa e correta.' : 'Tip: Pay attention to whether the answer is complete and correct.',
    alreadyMarked: lang === 'es' ? '✅ Ya marcado' : lang === 'pt' ? '✅ Já marcado' : '✅ Already marked',
    markAnswered: lang === 'es' ? '✅ YA RESPONDIÓ (pasar a calificar)' : lang === 'pt' ? '✅ JÁ RESPONDEU (passar a avaliar)' : '✅ ANSWERED (proceed to rate)',
  },
  rating: {
    phase1Title: lang === 'es' ? '💬 FASE 1: CALIFICAR LA RESPUESTA' : lang === 'pt' ? '💬 FASE 1: AVALIAR A RESPOSTA' : '💬 PHASE 1: RATE THE ANSWER',
    phase1Subtitle: lang === 'es' ? 'Cada uno califica en orden, de menor a mayor puntaje' : lang === 'pt' ? 'Cada um avalia em ordem, do menor ao maior pontuação' : 'Each one rates in order, from lowest to highest score',
    green: lang === 'es' ? 'VERDE' : lang === 'pt' ? 'VERDE' : 'GREEN',
    greenShort: lang === 'es' ? 'Verde' : lang === 'pt' ? 'Verde' : 'Green',
    greenDesc: lang === 'es' ? 'La respuesta es correcta y no quiero agregar nada' : lang === 'pt' ? 'A resposta está correta e não quero adicionar nada' : 'The answer is correct and I don\'t want to add anything',
    yellow: lang === 'es' ? 'AMARILLO' : lang === 'pt' ? 'AMARELO' : 'YELLOW',
    yellowShort: lang === 'es' ? 'Amarillo' : lang === 'pt' ? 'Amarelo' : 'Yellow',
    yellowDesc: lang === 'es' ? 'La respuesta es correcta pero hay algo importante que deseo agregar o relacionar' : lang === 'pt' ? 'A resposta está correta mas há algo importante que desejo adicionar ou relacionar' : 'The answer is correct but there\'s something important I want to add or relate',
    red: lang === 'es' ? 'ROJO' : lang === 'pt' ? 'VERMELHO' : 'RED',
    redShort: lang === 'es' ? 'Rojo' : lang === 'pt' ? 'Vermelho' : 'Red',
    redDesc: lang === 'es' ? 'La respuesta es incorrecta y voy a explicar exactamente por qué' : lang === 'pt' ? 'A resposta está incorreta e vou explicar exatamente por quê' : 'The answer is incorrect and I will explain exactly why',
    yourTurn: lang === 'es' ? '⬅️ TU TURNO 🔥' : lang === 'pt' ? '⬅️ SUA VEZ 🔥' : '⬅️ YOUR TURN 🔥',
    waitYourTurn: lang === 'es' ? '⏳ Esperá - Pronto será tu turno' : lang === 'pt' ? '⏳ Aguarde - Logo será sua vez' : '⏳ Wait - Soon it will be your turn',
    waiting: lang === 'es' ? '⏳ Esperando...' : lang === 'pt' ? '⏳ Aguardando...' : '⏳ Waiting...',
    rated: lang === 'es' ? 'calificaron' : lang === 'pt' ? 'avaliaram' : 'rated',
  },
  validation: {
    phase2Title: lang === 'es' ? '💬 FASE 2: VALIDAR JUSTIFICACIONES' : lang === 'pt' ? '💬 FASE 2: VALIDAR JUSTIFICATIVAS' : '💬 PHASE 2: VALIDATE JUSTIFICATIONS',
    phase2Subtitle: lang === 'es' ? 'Solo los votos amarillos y rojos necesitan justificación' : lang === 'pt' ? 'Apenas os votos amarelos e vermelhos precisam de justificativa' : 'Only yellow and red votes need justification',
    progress: lang === 'es' ? 'Progreso de validación:' : lang === 'pt' ? 'Progresso de validação:' : 'Validation progress:',
    validated: lang === 'es' ? 'validados' : lang === 'pt' ? 'validados' : 'validated',
    accepted: lang === 'es' ? '✅ Aceptado' : lang === 'pt' ? '✅ Aceito' : '✅ Accepted',
    rejected: lang === 'es' ? '❌ Rechazado' : lang === 'pt' ? '❌ Rejeitado' : '❌ Rejected',
    isJustifying: lang === 'es' ? 'está justificando su voto.' : lang === 'pt' ? 'está justificando seu voto.' : 'is justifying their vote.',
    listenAndDecide: lang === 'es' ? 'Escuchen con atención y decidan en equipo:' : lang === 'pt' ? 'Ouçam com atenção e decidam em equipe:' : 'Listen carefully and decide as a team:',
    reject: lang === 'es' ? '❌ Rechazar' : lang === 'pt' ? '❌ Rejeitar' : '❌ Reject',
    accept: lang === 'es' ? '✅ Aceptar' : lang === 'pt' ? '✅ Aceitar' : '✅ Accept',
    waitingPrevious: lang === 'es' ? '⏳ Esperando validar primero a los anteriores...' : lang === 'pt' ? '⏳ Aguardando validar primeiro os anteriores...' : '⏳ Waiting to validate previous ones first...',
    autoAccepted: lang === 'es' ? '✅ Aceptado automáticamente' : lang === 'pt' ? '✅ Aceito automaticamente' : '✅ Automatically accepted',
    pointsConfirmed: lang === 'es' ? '✅ Los puntos de esta ronda ya fueron confirmados' : lang === 'pt' ? '✅ Os pontos desta rodada já foram confirmados' : '✅ This round\'s points have already been confirmed',
    nextRound: lang === 'es' ? '▶️ Pasar a la siguiente ronda' : lang === 'pt' ? '▶️ Passar para a próxima rodada' : '▶️ Go to next round',
    confirming: lang === 'es' ? '⏳ Confirmando...' : lang === 'pt' ? '⏳ Confirmando...' : '⏳ Confirming...',
    confirmAndAdvance: lang === 'es' ? '✅ Confirmar puntos y avanzar' : lang === 'pt' ? '✅ Confirmar pontos e avançar' : '✅ Confirm points and advance',
  },
  pedagogicalTip: lang === 'es'
    ? 'Recuerden: Lo importante no es ganar puntos, sino aprender juntos'
    : lang === 'pt'
      ? 'Lembrem: O importante não é ganhar pontos, mas aprender juntos'
      : 'Remember: The important thing is not to win points, but to learn together',
  ranking: lang === 'es' ? '📊 Ranking de' : lang === 'pt' ? '📊 Ranking de' : '📊 Ranking of',
  modal: {
    title: lang === 'es' ? '📄 Material de apoyo' : lang === 'pt' ? '📄 Material de apoio' : '📄 Support material',
    loading: lang === 'es' ? '⏳ Cargando material...' : lang === 'pt' ? '⏳ Carregando material...' : '⏳ Loading material...',
    close: lang === 'es' ? 'Cerrar' : lang === 'pt' ? 'Fechar' : 'Close',
  },
  errors: {
    savingRating: lang === 'es' ? 'Error al guardar la calificación' : lang === 'pt' ? 'Erro ao salvar a avaliação' : 'Error saving rating',
    markingResponse: lang === 'es' ? 'Error al marcar "ya respondió".' : lang === 'pt' ? 'Erro ao marcar "já respondeu".' : 'Error marking "already answered".',
    phase1First: lang === 'es' ? 'Primero deben calificar todos (Fase 1).' : lang === 'pt' ? 'Primeiro todos devem avaliar (Fase 1).' : 'Everyone must rate first (Phase 1).',
    phase2First: lang === 'es' ? 'Debés completar la validación (Fase 2) antes de confirmar puntos.' : lang === 'pt' ? 'Você deve completar a validação (Fase 2) antes de confirmar pontos.' : 'You must complete validation (Phase 2) before confirming points.',
    confirmingPoints: lang === 'es' ? 'Error al confirmar puntos. Intentá de nuevo.' : lang === 'pt' ? 'Erro ao confirmar pontos. Tente novamente.' : 'Error confirming points. Try again.',
    loadingMaterial: lang === 'es' ? 'Error al cargar el material. Intentá de nuevo.' : lang === 'pt' ? 'Erro ao carregar o material. Tente novamente.' : 'Error loading material. Try again.',
  },
  teamActions: {
    helpButton: lang === 'es' ? '❓ Pedir ayuda' : lang === 'pt' ? '❓ Pedir ajuda' : '❓ Ask for help',
    interventionButton: lang === 'es' ? '🙋 Solicitar intervención docente' : lang === 'pt' ? '🙋 Solicitar intervenção do professor' : '🙋 Request teacher intervention',
    helpSent: lang === 'es' ? '✅ Pedido enviado' : lang === 'pt' ? '✅ Pedido enviado' : '✅ Request sent',
    interventionSent: lang === 'es' ? '✅ Docente notificado' : lang === 'pt' ? '✅ Professor notificado' : '✅ Teacher notified',
    // ✅ CAMBIO 3
    driveButton: lang === 'es' ? '📂 Material de estudio' : lang === 'pt' ? '📂 Material de estudo' : '📂 Study material',
    drivePauseHint: lang === 'es' ? 'Usen este momento para revisar el material juntos' : lang === 'pt' ? 'Usem este momento para revisar o material juntos' : 'Use this moment to review the material together',
  },
  aria: {
    openMaterial: lang === 'es'
      ? 'Abrir material complementario en ventana modal'
      : lang === 'pt'
        ? 'Abrir material complementar em janela modal'
        : 'Open supplementary material in modal window',
    alreadyMarked: lang === 'es'
      ? 'Ya se marcó que el equipo respondió'
      : lang === 'pt'
        ? 'Já foi marcado que a equipe respondeu'
        : 'The team has already been marked as having responded',
    markAnswered: lang === 'es'
      ? 'Marcar que el equipo ya respondió'
      : lang === 'pt'
        ? 'Marcar que a equipe já respondeu'
        : 'Mark that the team has already responded',
    nextRound: lang === 'es'
      ? 'Avanzar a la siguiente ronda'
      : lang === 'pt'
        ? 'Avançar para a próxima rodada'
        : 'Go to next round',
    confirmingPoints: lang === 'es'
      ? 'Confirmando puntos, espere'
      : lang === 'pt'
        ? 'Confirmando pontos, aguarde'
        : 'Confirming points, please wait',
    confirmAndAdvance: lang === 'es'
      ? 'Confirmar puntos de esta ronda y avanzar'
      : lang === 'pt'
        ? 'Confirmar pontos desta rodada e avançar'
        : 'Confirm this round\'s points and advance',
    closeModal: lang === 'es'
      ? 'Cerrar modal'
      : lang === 'pt'
        ? 'Fechar modal'
        : 'Close modal',
    closeMaterial: lang === 'es'
      ? 'Cerrar material complementario'
      : lang === 'pt'
        ? 'Fechar material complementar'
        : 'Close supplementary material',
  },
});

// ============================================
// INTERFACE
// ============================================
interface TeamViewProps {
  gameId: string;
  team: Team;
  currentRound: Round;
  currentQuestion: string;
  totalStage1Questions: number;
  sourceTextPath?: string | null;
  driveLink?: string | null; // ✅ CAMBIO 1
}

// ============================================
// COMPONENTE
// ============================================
export function TeamView({
  gameId,
  team,
  currentRound,
  currentQuestion,
  totalStage1Questions,
  sourceTextPath,
  driveLink, // ✅ CAMBIO 2
}: TeamViewProps) {
  // i18n
  const { language } = useI18n();
  const texts = getTeamViewTexts(language as 'es' | 'en' | 'pt');

  // Estado
  const [validations, setValidations] = useState<{ [playerId: string]: boolean }>({});
  const [allValidated, setAllValidated] = useState(false);
  const [liveRatings, setLiveRatings] = useState<{ [playerId: string]: Rating }>({});
  const [lastRoundPoints, setLastRoundPoints] = useState<{ [playerId: string]: number }>({});
  const [phase, setPhase] = useState<'response' | 'rating' | 'validation'>('response');
  // ✅ CAMBIO 1: derivamos hasResponded directamente de la prop currentRound
  const hasResponded = currentRound?.hasResponded === true;
  const [isConfirmingPoints, setIsConfirmingPoints] = useState(false);
  const [pointsAlreadyConfirmed, setPointsAlreadyConfirmed] = useState(false);
  const [showPedagogicalTip, setShowPedagogicalTip] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [interventionSent, setInterventionSent] = useState(false);

  // Material complementario
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialContent, setMaterialContent] = useState<string | null>(null);
  const [loadingMaterial, setLoadingMaterial] = useState(false);

  // ✅ FIX: ref para rastrear qué greens ya fueron auto-aceptados y evitar re-escrituras
  const autoAcceptedRef = useRef<Set<string>>(new Set());

  const prevPhaseRef = useRef<string | null>(null);
  const { play } = useSound();
  const displayRoundNumber = currentRound?.roundNumber ?? 0;

  // =========================
  // ACCESIBILIDAD: Cerrar modal con Escape
  // =========================
  useEffect(() => {
    if (!showMaterialModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMaterialModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showMaterialModal]);

  // =========================
  // Cargar material complementario
  // =========================
  const handleOpenMaterial = async () => {
    if (!sourceTextPath) return;
    setShowMaterialModal(true);
    if (materialContent) return;
    setLoadingMaterial(true);
    try {
      const txtRef = storageRef(storage, sourceTextPath);
      const blob = await getBlob(txtRef);
      const text = await blob.text();
      setMaterialContent(text);
    } catch (error) {
      console.error('Error loading material:', error);
      setMaterialContent(texts.errors.loadingMaterial);
    } finally {
      setLoadingMaterial(false);
    }
  };

  // =========================
  // Verificar si los puntos ya fueron confirmados
  // =========================
  useEffect(() => {
    const checkConfirmation = async () => {
      const targetRoundNumber = currentRound?.roundNumber;
      if (targetRoundNumber === undefined) return;
      const confirmed = await arePointsConfirmed(gameId, team.id, targetRoundNumber);
      setPointsAlreadyConfirmed(confirmed);
    };
    checkConfirmation();
  }, [gameId, team.id, currentRound?.roundNumber]);

  // =========================
  // ✅ FIX: Sincronización con Firebase - MERGE en lugar de REEMPLAZAR validaciones
  // =========================
  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (game) => {
      if (!game?.teams) return;
      const teamData = (game.teams as any)?.[team.id];
      if (!teamData) return;
      const rn = teamData.currentRound ?? 0;
      const round: any = teamData.stage1Rounds?.[rn] ?? teamData.stage1Rounds?.[String(rn)];
      if (!round) return;
      const ratings = round.ratings || {};
      // ✅ CAMBIO 2: eliminamos las líneas que usaban responded y setHasResponded
      // const responded = round.hasResponded === true;
      // setHasResponded(responded);

      setLiveRatings(ratings);
      setLastRoundPoints(round.pointsAwarded || {});
      setPointsAlreadyConfirmed(round.pointsConfirmed === true);
      setIsPaused(teamData.isPaused === true);

      // ✅ FIX: Construimos las validaciones desde Firebase
      const validationsFromFirebase: { [playerId: string]: boolean } = {};
      for (const [playerId, rating] of Object.entries(ratings)) {
        const r = rating as any;
        if (r?.userValidated !== undefined) {
          validationsFromFirebase[playerId] = r.userValidated === true;
        }
      }

      // ✅ FIX: MERGE — Firebase es la fuente de verdad,
      // pero no pisamos cambios locales que aún no se guardaron en Firebase.
      // Usamos la versión de Firebase si existe, sino mantenemos la local.
      setValidations(prev => ({
        ...prev,               // mantiene cambios locales pendientes
        ...validationsFromFirebase, // Firebase pisa cuando ya confirmó el dato
      }));
    });

    return () => unsubscribe();
  }, [gameId, team.id]);

  // Reset valores puramente locales al cambiar de ronda
  useEffect(() => {
    setAllValidated(false);
    setValidations({});                  // ✅ FIX v2: limpiar validaciones al cambiar de ronda
    autoAcceptedRef.current = new Set(); // ✅ FIX: limpiar los greens auto-aceptados al cambiar ronda
  }, [currentRound?.roundNumber]);

  // =========================
  // Orden ascendente de calificadores
  // =========================
  const ratersInOrder = useMemo(() => {
    const respondingId = currentRound?.respondingPlayerId;
    return [...team.players]
      .filter((p) => p.id !== respondingId)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  }, [team.players, currentRound?.respondingPlayerId]);

  const currentRaterIndex = useMemo(() => {
    return ratersInOrder.findIndex((p) => !liveRatings[p.id]);
  }, [ratersInOrder, liveRatings]);

  const currentRater = currentRaterIndex >= 0 ? ratersInOrder[currentRaterIndex] : null;
  const ratingsCount = Object.keys(liveRatings).length;
  const totalRaters = ratersInOrder.length;

  // =========================
  // Cambio automático de fase
  // =========================
  useEffect(() => {
    if (!hasResponded) {
      setPhase('response');
      return;
    }
    if (totalRaters === 0) {
      setPhase('rating');
      return;
    }
    if (ratingsCount === totalRaters && ratingsCount > 0) {
      setPhase('validation');
    } else {
      setPhase('rating');
    }
  }, [hasResponded, ratingsCount, totalRaters]);

  // Sonido al cambiar de fase
  useEffect(() => {
    if (phase && prevPhaseRef.current && phase !== prevPhaseRef.current) {
      if (phase === 'rating') {
        play('transition');
      } else if (phase === 'validation') {
        play('reveal');
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, play]);

  // =========================
  // ✅ FIX: Auto-aceptar verdes — sin setValidations, sin `validations` en deps
  // Se usa un ref para asegurar que cada green se procese UNA SOLA VEZ
  // El subscriber de Firebase actualizará `validations` cuando Firebase confirme
  // =========================
  useEffect(() => {
    if (phase !== 'validation') return;

    for (const [playerId, rating] of Object.entries(liveRatings)) {
      if (rating?.color === 'green' && !autoAcceptedRef.current.has(playerId)) {
        // Marcamos como procesado ANTES de llamar a Firebase para evitar dobles llamadas
        autoAcceptedRef.current.add(playerId);
        validateRating(gameId, team.id, currentRound?.roundNumber ?? 0, playerId, true)
          .catch(() => {
            // Si falla, lo removemos del ref para que se reintente
            autoAcceptedRef.current.delete(playerId);
          });
        // ✅ NO llamamos setValidations acá — lo hace el subscriber cuando Firebase confirma
      }
    }
    // ✅ `validations` NO está en las dependencias → se corta el ciclo infinito
  }, [phase, liveRatings, gameId, team.id, currentRound?.roundNumber]);

  // =========================
  // allValidated: solo amarillo/rojo requieren validación explícita del equipo
  // =========================
  useEffect(() => {
    // Si no hay ratings aún, no habilitar confirmar
    if (Object.keys(liveRatings).length === 0) {
      setAllValidated(false);
      return;
    }
    const needValidation = Object.entries(liveRatings).filter(
      ([, rating]) => rating.color === 'yellow' || rating.color === 'red'
    );
    // Sin amarillos ni rojos: ok confirmar
    if (needValidation.length === 0) {
      setAllValidated(true);
      return;
    }
    // Cada amarillo/rojo debe tener una decisión explícita (true o false)
    const allDone = needValidation.every(
      ([playerId]) => validations[playerId] === true || validations[playerId] === false
    );
    setAllValidated(allDone);
  }, [validations, liveRatings]);

  // =========================
  // Handlers: ayuda e intervención
  // =========================
  const handleHelpRequest = async () => {
    try {
      await update(ref(database), {
        [`games/${gameId}/teams/${team.id}/helpRequest`]: {
          requestedAt: Date.now(),
        },
      });
      setHelpSent(true);
      setTimeout(() => setHelpSent(false), 4000);
    } catch (e) {
      console.error('Error sending help request:', e);
    }
  };

  const handleInterventionRequest = async () => {
    const weakPlayer = team.players
      .slice()
      .sort((a, b) => (b.consecutiveLastPlace ?? 0) - (a.consecutiveLastPlace ?? 0))[0];
    try {
      await update(ref(database), {
        [`games/${gameId}/teams/${team.id}/pauseRequest`]: {
          requestedAt: Date.now(),
          playerName: weakPlayer?.name ?? '',
          playerRounds: weakPlayer?.consecutiveLastPlace ?? 0,
        },
      });
      setInterventionSent(true);
      setTimeout(() => setInterventionSent(false), 4000);
    } catch (e) {
      console.error('Error sending intervention request:', e);
    }
  };

  // =========================
  // UI helpers
  // =========================
  const handleRating = async (playerId: string, playerName: string, color: RatingColor) => {
    const targetRoundNumber = currentRound?.roundNumber ?? 0;
    const rating: Rating = {
      playerId,
      playerName,
      color,
      validated: true,
    };
    try {
      play('rating');
      await addRating(gameId, team.id, targetRoundNumber, rating);
      play('correct');
    } catch (error) {
      console.error('Error adding rating:', error);
      play('incorrect');
      alert(texts.errors.savingRating);
    }
  };

  const handleSetValidation = async (playerId: string, value: boolean) => {
    play('click');
    setValidations((prev) => ({ ...prev, [playerId]: value }));
    try {
      const roundNumber = currentRound?.roundNumber ?? 0;
      await update(ref(database, `games/${gameId}/teams/${team.id}/stage1Rounds/${roundNumber}/ratings/${playerId}`), {
        userValidated: value
      });
      play(value ? 'correct' : 'incorrect');
    } catch (error) {
      console.error('Error validating rating:', error);
      play('incorrect');
    }
  };

  const handleMarkResponded = async () => {
    try {
      play('click');
      await setRoundHasResponded(gameId, team.id, displayRoundNumber, true);
      play('transition');
    } catch (e) {
      console.error('Error setting hasResponded:', e);
      play('incorrect');
      alert(texts.errors.markingResponse);
    }
  };

  const calculatePoints = (): { [playerId: string]: number } => {
    const points: { [playerId: string]: number } = {};
    const ratingsArray = Object.values(liveRatings);

    team.players.forEach((p) => (points[p.id] = 0));

    const effectivelyAcceptedRatings = ratingsArray.filter((rating) => {
      if (rating.color === 'green') {
        return true;
      }
      return validations[rating.playerId] === true;
    });

    const hasAcceptedRed = effectivelyAcceptedRatings.some((rating) => rating.color === 'red');

    if (hasAcceptedRed) {
      effectivelyAcceptedRatings.forEach((rating) => {
        if (rating.color === 'red') {
          points[rating.playerId] = 10;
        }
      });
      points[currentRound.respondingPlayerId] = 0;
    } else {
      points[currentRound.respondingPlayerId] = 12;

      effectivelyAcceptedRatings.forEach((rating) => {
        if (rating.color === 'green') {
          points[rating.playerId] = 5;
        } else if (rating.color === 'yellow') {
          points[rating.playerId] = 10;
        }
      });
    }

    return points;
  };

  // CAMBIO 1: updateLastPlaceCounters recibe pointsThisRound y calcula puntajes finales
  const updateLastPlaceCounters = async (pointsThisRound: { [playerId: string]: number }) => {
    if (!team.players || team.players.length === 0) return;

    // Calcular score real post-ronda combinando acumulado + puntos de esta ronda
    const finalScores = team.players.reduce((acc, p) => {
      acc[p.id] = (p.score ?? 0) + (pointsThisRound[p.id] ?? 0);
      return acc;
    }, {} as { [id: string]: number });

    const minScore = Math.min(...Object.values(finalScores));
    const lastPlaceIdsLocal = new Set(
      Object.entries(finalScores)
        .filter(([, score]) => score === minScore)
        .map(([id]) => id)
    );

    for (const player of team.players) {
      if (lastPlaceIdsLocal.has(player.id)) {
        const newCount = (player.consecutiveLastPlace ?? 0) + 1;
        await updatePlayerLastPlaceCounterSmartCompat(gameId, team.id, player.id, newCount);
      } else {
        if ((player.consecutiveLastPlace ?? 0) > 0) {
          await updatePlayerLastPlaceCounterSmartCompat(gameId, team.id, player.id, 0);
        }
      }
    }
  };

  const handleConfirmPoints = async () => {
    const targetRoundNumber = currentRound?.roundNumber ?? 0;
    try {
      const alreadyConfirmed = await arePointsConfirmed(gameId, team.id, targetRoundNumber);
      if (alreadyConfirmed) {
        play('click');
        await prepareNextRound(gameId, team.id);
        const allComplete = await areAllTeamsStage1Complete(gameId);
        if (allComplete) {
          play('roundComplete');
          await update(ref(database), {
            [`games/${gameId}/status/status`]: 'transition',
            [`games/${gameId}/status/currentStage`]: 2,
            [`games/${gameId}/updatedAt`]: Date.now(),
          });
        }
        return;
      }
    } catch (e) {
      console.warn('⚠️ No se pudo verificar arePointsConfirmed', e);
    }

    if (phase !== 'validation') {
      play('incorrect');
      alert(texts.errors.phase1First);
      return;
    }
    // Guardia explícita: contar amarillos/rojos que tienen decisión
    const yellowsAndReds = Object.entries(liveRatings).filter(
      ([, r]) => r.color === 'yellow' || r.color === 'red'
    );
    const decidedCount = yellowsAndReds.filter(
      ([pid]) => validations[pid] === true || validations[pid] === false
    ).length;
    if (decidedCount < yellowsAndReds.length) {
      play('incorrect');
      alert(texts.errors.phase2First);
      return;
    }

    setIsConfirmingPoints(true);
    play('click');
    try {
      const points = calculatePoints();
      setLastRoundPoints(points);
      await awardPoints(gameId, team.id, targetRoundNumber, points);
      for (const [playerId, earnedPoints] of Object.entries(points)) {
        if (earnedPoints > 0) {
          const player = team.players.find((p) => p.id === playerId);
          if (player) {
            const newScore = (player.score ?? 0) + earnedPoints;
            await updatePlayerScoreSmartCompat(gameId, team.id, playerId, newScore);
          }
        }
      }
      // ✅ Solo marcamos como confirmado DESPUÉS de que los puntos se guardaron
      await markPointsAsConfirmed(gameId, team.id, targetRoundNumber);
      play('points');
      try {
        await updateLastPlaceCounters(points);
      } catch (counterError) {
        console.error('⚠️ Error actualizando last place counters:', counterError);
      }
      await prepareNextRound(gameId, team.id);
      const allComplete = await areAllTeamsStage1Complete(gameId);
      if (allComplete) {
        play('roundComplete');
        await update(ref(database), {
          [`games/${gameId}/status/status`]: 'transition',
          [`games/${gameId}/status/currentStage`]: 2,
          [`games/${gameId}/updatedAt`]: Date.now(),
        });
      } else {
        play('correct');
      }
      setShowPedagogicalTip(true);
      setTimeout(() => setShowPedagogicalTip(false), 3000);
    } catch (error) {
      console.error('❌ Error confirmando puntos:', error);
      play('incorrect');
      alert(texts.errors.confirmingPoints);
    } finally {
      setIsConfirmingPoints(false);
    }
  };

  // =========================
  // UI helpers
  // =========================
  const rankedPlayers = [...team.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const lowestScorePlayer = rankedPlayers[rankedPlayers.length - 1];
  const respondingPlayer = team.players.find((p) => p.id === currentRound.respondingPlayerId);
  const pendingValidations = ratersInOrder.filter((p) => {
    const r = liveRatings[p.id];
    if (!r) return false;
    if (r.color !== 'yellow' && r.color !== 'red') return false;
    return validations[p.id] === undefined;
  });
  const currentValidationTurnPlayerId = pendingValidations[0]?.id;
  const totalNeedValidation = useMemo(() => {
    return ratersInOrder.filter((p) => {
      const r = liveRatings[p.id];
      return r && (r.color === 'yellow' || r.color === 'red');
    }).length;
  }, [ratersInOrder, liveRatings]);
  const validatedRelevantCount = useMemo(() => {
    return Object.keys(validations).filter((pid) => {
      const r = liveRatings[pid];
      return r && (r.color === 'yellow' || r.color === 'red');
    }).length;
  }, [validations, liveRatings]);
  const validationProgressPercent = (validatedRelevantCount / Math.max(totalNeedValidation, 1)) * 100;
  const lastPlaceIds = useMemo(() => {
    if (!team.players || team.players.length === 0) return new Set<string>();
    const minScore = Math.min(...team.players.map(p => p.score ?? 0));
    return new Set(
      team.players
        .filter(p => (p.score ?? 0) === minScore)
        .map(p => p.id)
    );
  }, [team.players]);

  const getColorName = (color: string) => {
    if (color === 'green') return texts.rating.greenShort;
    if (color === 'yellow') return texts.rating.yellowShort;
    if (color === 'red') return texts.rating.redShort;
    return color;
  };

  // Stage 1 completado
  if ((team as any)?.stage1Completed === true) {
    return (
      <div className="team-view">
        <div className="header">
          <h1>🎮 {team.name}</h1>
          <p>{texts.stage1Complete.title}</p>
          <p>{texts.stage1Complete.waiting}</p>
        </div>
      </div>
    );
  }

  // =========================
  // Render
  // =========================
  // Cualquier jugador con 2+ rondas consecutivas en último lugar habilita el botón
  const canRequestIntervention = team.players.some(
    (p) => (p.consecutiveLastPlace ?? 0) >= 2
  );

  return (
    <div className="team-view">

      {/* ✅ Overlay de pausa */}
      {isPaused && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            gap: 24,
          }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ fontSize: 72 }}>🤝</div>
          <div style={{
            textAlign: 'center', color: 'white',
            fontSize: 28, fontWeight: 700, lineHeight: 1.4,
            maxWidth: 480, padding: '0 32px',
          }}>
            {language === 'es' ? '¡Momento de equipo!'
              : language === 'pt' ? 'Momento de equipe!'
              : 'Team moment!'}
          </div>
          <div style={{
            textAlign: 'center', color: '#fbbf24',
            fontSize: 18, lineHeight: 1.5,
            maxWidth: 400, padding: '0 32px',
          }}>
            {language === 'es' ? 'Su docente se está acercando para ayudarlos 💛'
              : language === 'pt' ? 'Seu professor está se aproximando para ajudá-los 💛'
              : 'Your teacher is coming over to help your team 💛'}
          </div>
          {/* ✅ CAMBIO 5 */}
          {driveLink && (
            <a href={driveLink} target="_blank" rel="noopener noreferrer"
              style={{ marginTop: 8, padding: '16px 32px', fontSize: 17, fontWeight: 700, backgroundColor: '#16a34a', color: 'white', borderRadius: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
              <span style={{ fontSize: 24 }}>📂</span>
              <div>
                <div>{texts.teamActions.driveButton}</div>
                <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.9 }}>{texts.teamActions.drivePauseHint}</div>
              </div>
            </a>
          )}
        </div>
      )}

      {/* ✅ Botones de ayuda e intervención */}
      <div style={{
        display: 'flex', gap: 10, padding: '10px 16px',
        justifyContent: 'flex-end',
      }}>
        {/* ✅ CAMBIO 4 */}
        {driveLink && (
          <button
            onClick={() => window.open(driveLink, '_blank', 'noopener,noreferrer')}
            style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, backgroundColor: '#f0fdf4', color: '#15803d', border: '2px solid #16a34a', borderRadius: 8, cursor: 'pointer' }}
          >
            {texts.teamActions.driveButton}
          </button>
        )}
        <button
          onClick={handleHelpRequest}
          disabled={helpSent}
          style={{
            padding: '8px 14px', fontSize: 13, fontWeight: 600,
            backgroundColor: helpSent ? '#86efac' : '#f0fdf4',
            color: helpSent ? '#166534' : '#15803d',
            border: '2px solid #22c55e',
            borderRadius: 8, cursor: helpSent ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {helpSent ? texts.teamActions.helpSent : texts.teamActions.helpButton}
        </button>

        <button
          onClick={handleInterventionRequest}
          disabled={!canRequestIntervention || interventionSent}
          title={
            !canRequestIntervention
              ? (language === 'es'
                  ? 'Disponible si un compañero lleva 2 rondas o más en dificultad'
                  : language === 'pt'
                    ? 'Disponível se um colega tiver 2 rodadas ou mais em dificuldade'
                    : 'Available if a teammate has been struggling for 2+ rounds')
              : undefined
          }
          style={{
            padding: '8px 14px', fontSize: 13, fontWeight: 600,
            backgroundColor: interventionSent
              ? '#fde68a'
              : canRequestIntervention
                ? '#fffbeb'
                : '#f8fafc',
            color: interventionSent
              ? '#92400e'
              : canRequestIntervention
                ? '#b45309'
                : '#94a3b8',
            border: `2px solid ${canRequestIntervention ? '#f59e0b' : '#cbd5e1'}`,
            borderRadius: 8,
            cursor: canRequestIntervention && !interventionSent ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {interventionSent
            ? texts.teamActions.interventionSent
            : texts.teamActions.interventionButton}
        </button>
      </div>

      <div className="header">
        <h1>🎮 {team.name}</h1>
        <p>
          {texts.header.stage} | {texts.header.round} {displayRoundNumber + 1} {texts.header.of} {totalStage1Questions}
        </p>
      </div>

      {(lowestScorePlayer?.consecutiveLastPlace ?? 0) >= 2 && (
        <div className="reminder pedagogical">
          💡 <strong>{language === 'es' ? 'Recordatorio pedagógico:' : language === 'pt' ? 'Lembrete pedagógico:' : 'Pedagogical reminder:'}</strong> {texts.pedagogicalReminder}
        </div>
      )}

      <div className="question-section">
        <h2>{texts.question.title}</h2>
        <div className="question-text">{currentQuestion}</div>
        {sourceTextPath && (
          <button
            onClick={handleOpenMaterial}
            style={{
              marginTop: 12,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: '#f0f9ff',
              color: '#0369a1',
              border: '2px solid #0ea5e9',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            aria-label={texts.aria.openMaterial}
          >
            {texts.question.supportMaterial}
          </button>
        )}
      </div>

      {phase === 'response' ? (
        <div className="response-phase">
          <div className="response-instructions">
            <p>
              🎤 <strong>{respondingPlayer?.name || texts.response.thePlayer}</strong> {texts.response.isAnswering}
            </p>
            {(currentRound as any)?.captainName && (
              <p className="captain-inline">
                📱 <strong>{texts.response.captain}</strong>{' '}
                <span className="captain-name-inline">
                  {(currentRound as any).captainName}
                </span>
              </p>
            )}
            <p>👂 {texts.response.teamListens}</p>
            <p className="tip">
              💡 <em>{texts.response.tip}</em>
            </p>
          </div>
          <button
            className="btn-responded"
            onClick={handleMarkResponded}
            disabled={hasResponded}
            aria-label={hasResponded ? texts.aria.alreadyMarked : texts.aria.markAnswered}
          >
            {hasResponded ? texts.response.alreadyMarked : texts.response.markAnswered}
          </button>
        </div>
      ) : phase === 'rating' ? (
        <div className="ratings-container">
          <h3>{texts.rating.phase1Title}</h3>
          <p className="phase-instruction">{texts.rating.phase1Subtitle}</p>
          <div className="legend-items">
            <div className="legend-item green">
              <span className="legend-color">🟩 {texts.rating.green}</span>
              <span className="legend-sep">—</span>
              <span className="legend-description">{texts.rating.greenDesc}</span>
              <span className="legend-points">+5 pts</span>
            </div>
            <div className="legend-item yellow">
              <span className="legend-color">🟨 {texts.rating.yellow}</span>
              <span className="legend-sep">—</span>
              <span className="legend-description">{texts.rating.yellowDesc}</span>
              <span className="legend-points">+10 pts</span>
            </div>
            <div className="legend-item red">
              <span className="legend-color">🟥 {texts.rating.red}</span>
              <span className="legend-sep">—</span>
              <span className="legend-description">{texts.rating.redDesc}</span>
              <span className="legend-points">+10 pts*</span>
            </div>
            <p className="legend-note">. . . . . . . . . . . . . . . . . . .</p>
          </div>

          {ratersInOrder.map((player, index) => {
            const hasRated = !!liveRatings[player.id];
            const isCurrentTurn = currentRater?.id === player.id;
            const isBlocked = !hasRated && !isCurrentTurn;
            const rating = liveRatings[player.id];
            const isLastPlace = lastPlaceIds.has(player.id);
            return (
              <div
                key={player.id}
                className={`rater-row ${isCurrentTurn ? 'current-turn' : ''} ${isBlocked ? 'blocked' : ''} ${hasRated ? 'completed' : ''} ${isLastPlace ? 'last-place' : ''}`}
              >
                <div className="rater-info">
                  <span className="rater-number">{index + 1}️⃣</span>
                  <span className="rater-name">{player.name}</span>
                  <span className="rater-score">({player.score ?? 0} pts)</span>
                  {isCurrentTurn && <span className="turn-indicator">{texts.rating.yourTurn}</span>}
                  {isBlocked && <span className="blocked-indicator">🔒</span>}
                  {hasRated && <span className="completed-indicator">✅</span>}
                </div>
                {hasRated ? (
                  <div className="rating-display">
                    <span className={`vote-pill ${rating.color}`}>
                      {rating.color === 'green' && `🟩 ${texts.rating.greenShort}`}
                      {rating.color === 'yellow' && `🟨 ${texts.rating.yellowShort}`}
                      {rating.color === 'red' && `🟥 ${texts.rating.redShort}`}
                    </span>
                  </div>
                ) : isCurrentTurn ? (
                  <div
                    className="color-buttons"
                    role="radiogroup"
                    aria-label={`Opciones de calificación para ${player.name}`}
                    onKeyDown={(e) => {
                      const buttons = e.currentTarget.querySelectorAll('button');
                      const currentIndex = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement);
                      
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % buttons.length;
                        (buttons[nextIndex] as HTMLButtonElement).focus();
                      }
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
                        (buttons[prevIndex] as HTMLButtonElement).focus();
                      }
                    }}
                  >
                    <button
                      className="color-btn green"
                      onClick={() => handleRating(player.id, player.name, 'green')}
                      role="radio"
                      aria-checked={liveRatings[player.id]?.color === 'green'}
                      aria-label="Verde - La respuesta es correcta y no quiero agregar nada"
                    >
                      🟩 {texts.rating.greenShort}
                    </button>
                    <button
                      className="color-btn yellow"
                      onClick={() => handleRating(player.id, player.name, 'yellow')}
                      role="radio"
                      aria-checked={liveRatings[player.id]?.color === 'yellow'}
                      aria-label="Amarillo - La respuesta es correcta pero quiero agregar algo importante"
                    >
                      🟨 {texts.rating.yellowShort}
                    </button>
                    <button
                      className="color-btn red"
                      onClick={() => handleRating(player.id, player.name, 'red')}
                      role="radio"
                      aria-checked={liveRatings[player.id]?.color === 'red'}
                      aria-label="Rojo - La respuesta es incorrecta y voy a explicar por qué"
                    >
                      🟥 {texts.rating.redShort}
                    </button>
                  </div>
                ) : (
                  <div className="waiting-message">
                    {isBlocked ? texts.rating.waitYourTurn : texts.rating.waiting}
                  </div>
                )}
              </div>
            );
          })}

          <div className="progress-bar">
            <div className="progress-text">{ratingsCount} {texts.rating.rated} {totalRaters}</div>
            <div className="progress-visual">
              {'▓'.repeat(ratingsCount)}
              {'░'.repeat(Math.max(0, totalRaters - ratingsCount))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ratings-container">
          <h3>{texts.validation.phase2Title}</h3>
          <p className="phase-instruction">{texts.validation.phase2Subtitle}</p>
          <div className="validation-progress">
            <div className="progress-info">
              <span className="progress-label">{texts.validation.progress}</span>
              <span className="progress-numbers">
                {validatedRelevantCount} {texts.header.of} {totalNeedValidation} {texts.validation.validated}
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${validationProgressPercent}%` }}
              />
            </div>
          </div>

          {ratersInOrder.map((player, index) => {
            const rating = liveRatings[player.id];
            if (!rating) return null;
            const needsValidation = rating.color === 'yellow' || rating.color === 'red';
            const isValidated = validations[player.id] !== undefined;
            const isCurrentValidationTurn = currentValidationTurnPlayerId === player.id;
            const isLastPlace = lastPlaceIds.has(player.id);
            return (
              <div
                key={player.id}
                className={`validation-row ${needsValidation ? 'needs-validation' : 'auto-accepted'} ${isCurrentValidationTurn ? 'current-turn' : ''} ${isLastPlace ? 'last-place' : ''}`}
              >
                <div className="validation-info">
                  <span className="rater-number">{index + 1}️⃣</span>
                  <span className="rater-name">{player.name}</span>
                  <span className={`vote-pill ${rating.color}`}>
                    {rating.color === 'green' && `🟩 ${texts.rating.greenShort}`}
                    {rating.color === 'yellow' && `🟨 ${texts.rating.yellowShort}`}
                    {rating.color === 'red' && `🟥 ${texts.rating.redShort}`}
                  </span>
                </div>
                {needsValidation ? (
                  isValidated ? (
                    <div className="validation-result">
                      <span className={`validation-badge ${validations[player.id] ? 'accepted' : 'rejected'}`}>
                        {validations[player.id] ? texts.validation.accepted : texts.validation.rejected}
                      </span>
                    </div>
                  ) : isCurrentValidationTurn ? (
                    <div className="validation-controls">
                      <p className="validation-prompt">
                        💬 {player.name} {texts.validation.isJustifying}
                        <br />
                        {texts.validation.listenAndDecide}
                      </p>
                      <div className="validation-buttons">
                        <button
                          className={`validation-btn reject ${validations[player.id] === false ? 'selected' : ''}`}
                          onClick={() => handleSetValidation(player.id, false)}
                          aria-label={`Rechazar justificación de ${player.name}`}
                        >
                          {texts.validation.reject}
                        </button>
                        <button
                          className={`validation-btn accept ${validations[player.id] === true ? 'selected' : ''}`}
                          onClick={() => handleSetValidation(player.id, true)}
                          aria-label={`Aceptar justificación de ${player.name}`}
                        >
                          {texts.validation.accept}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="waiting-validation">{texts.validation.waitingPrevious}</div>
                  )
                ) : (
                  <div className="auto-accepted-badge">{texts.validation.autoAccepted}</div>
                )}
              </div>
            );
          })}

          {pointsAlreadyConfirmed && (
            <p>{texts.validation.pointsConfirmed}</p>
          )}

          <button
            className="btn-confirm-points"
            onClick={handleConfirmPoints}
            disabled={isConfirmingPoints || validatedRelevantCount < totalNeedValidation}
            aria-label={
              pointsAlreadyConfirmed
                ? texts.aria.nextRound
                : isConfirmingPoints
                  ? texts.aria.confirmingPoints
                  : texts.aria.confirmAndAdvance
            }
          >
            {pointsAlreadyConfirmed
              ? texts.validation.nextRound
              : isConfirmingPoints
                ? texts.validation.confirming
                : texts.validation.confirmAndAdvance}
          </button>
        </div>
      )}

      {showPedagogicalTip && (
        <div className="pedagogical-tip">
          <div className="tip-icon">💡</div>
          <div className="tip-text">
            {texts.pedagogicalTip}
          </div>
        </div>
      )}

      {/* CAMBIO 3: Ranking con proyección en tiempo real */}
      <div className="ranking-section">
        <h3>{texts.ranking} {team.name}</h3>
        {(() => {
          // Calcular puntos proyectados en tiempo real durante fase de validación
          const projectedPoints = phase === 'validation' ? calculatePoints() : {};

          const playersWithProjection = team.players.map(p => ({
            ...p,
            projectedGain: projectedPoints[p.id] ?? 0,
            projectedTotal: (p.score ?? 0) + (projectedPoints[p.id] ?? 0),
          }));

          const sorted = [...playersWithProjection].sort(
            (a, b) => b.projectedTotal - a.projectedTotal
          );

          const minProjected = sorted[sorted.length - 1]?.projectedTotal ?? 0;

          return sorted.map((player, index) => {
            const isLast = player.projectedTotal === minProjected;
            const hasGain = player.projectedGain > 0;
            const isZeroThisRound = phase === 'validation' && player.projectedGain === 0;

            return (
              <div key={player.id} className={`ranking-item ${isLast ? 'last' : ''}`}>
                <div>
                  <span>{index + 1}. {player.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{player.score ?? 0} pts</span>
                  {phase === 'validation' && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 10,
                      backgroundColor: hasGain ? '#dcfce7' : '#fee2e2',
                      color: hasGain ? '#166534' : '#991b1b',
                    }}>
                      {hasGain ? `+${player.projectedGain}` : '+0'}
                    </span>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Modal de material complementario */}
      {showMaterialModal && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 10000,
          }}
          onClick={() => setShowMaterialModal(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowMaterialModal(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              width: '100%',
              maxWidth: 600,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 id="modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                {texts.modal.title}
              </h3>
              <button
                onClick={() => setShowMaterialModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
                aria-label={texts.aria.closeModal}
                autoFocus
              >
                ✕
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 20,
              }}
            >
              {loadingMaterial ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  {texts.modal.loading}
                </div>
              ) : (
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#334155',
                  }}
                >
                  {materialContent}
                </pre>
              )}
            </div>
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'right',
              }}
            >
              <button
                onClick={() => setShowMaterialModal(false)}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                aria-label={texts.aria.closeMaterial}
              >
                {texts.modal.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}