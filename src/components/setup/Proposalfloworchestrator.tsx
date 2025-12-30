// src/components/setup/ProposalFlowOrchestrator.tsx
// Orquestador que maneja todo el flujo de "Los equipos proponen"

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, set, update, push } from "firebase/database";
import { database } from "../../firebase.config";
import { useAuth } from "../../contexts/AuthContext";
import { useGameMode } from "../../contexts/GameModeContext";
import { useI18n } from "../../i18n";

// Importar componentes
import { StudentProposalSetup } from "./StudentProposalSetup";
import { ProposalWaitingRoom } from "./ProposalWaitingRoom";
import { ProposalTeacherView } from "../Stage0/ProposalTeacherView";
import { ProposalCurationView } from "../Stage0/ProposalCurationView";

// Tipos
import type { Team, Question } from "../../types/game";

// Tipo para la configuración del juego de propuestas
interface ProposalGameConfig {
  gameName: string;
  subject: string;
  numberOfTeams: number;
  materials: Array<{
    id: string;
    type: 'file' | 'text' | 'link';
    name: string;
    content: string;
  }>;
  maxProposalsPerTeam: number;
  timerMinutes: number | null;
  showLiveProposals: boolean;
}

// Nombres de equipos
const TEAM_ANIMALS = [
  { emoji: '🦁', name: 'Leones', nameEn: 'Lions' },
  { emoji: '🐯', name: 'Tigres', nameEn: 'Tigers' },
  { emoji: '🐻', name: 'Osos', nameEn: 'Bears' },
  { emoji: '🦅', name: 'Águilas', nameEn: 'Eagles' },
  { emoji: '🐺', name: 'Lobos', nameEn: 'Wolves' },
  { emoji: '🦊', name: 'Zorros', nameEn: 'Foxes' },
  { emoji: '🦒', name: 'Jirafas', nameEn: 'Giraffes' },
  { emoji: '🐘', name: 'Elefantes', nameEn: 'Elephants' },
];

const TEAM_PROFESSIONAL = [
  { emoji: '🔷', name: 'Estrategas', nameEn: 'Strategists' },
  { emoji: '🔶', name: 'Innovadores', nameEn: 'Innovators' },
  { emoji: '💎', name: 'Vanguardia', nameEn: 'Vanguard' },
  { emoji: '⚡', name: 'Impulso', nameEn: 'Momentum' },
  { emoji: '🎯', name: 'Enfoque', nameEn: 'Focus' },
  { emoji: '🚀', name: 'Pioneros', nameEn: 'Pioneers' },
  { emoji: '💡', name: 'Creativos', nameEn: 'Creatives' },
  { emoji: '🔥', name: 'Impacto', nameEn: 'Impact' },
];

type FlowStep = 'setup' | 'waiting' | 'collecting' | 'curating' | 'done';

interface ProposalFlowOrchestratorProps {
  onBack: () => void;
  onGameCreated: (gameId: string) => void;
}

export function ProposalFlowOrchestrator({ onBack, onGameCreated }: ProposalFlowOrchestratorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode: gameMode } = useGameMode();
  const { language } = useI18n();
  
  const [step, setStep] = useState<FlowStep>('setup');
  const [gameId, setGameId] = useState<string>('');
  const [config, setConfig] = useState<ProposalGameConfig | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Generar código de sala
  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Crear juego en Firebase
  const createGame = async (proposalConfig: ProposalGameConfig): Promise<string> => {
    const isCoopetition = gameMode === 'coopetition';
    const teamNames = isCoopetition ? TEAM_PROFESSIONAL : TEAM_ANIMALS;
    const lang = language === 'en' ? 'en' : 'es';
    
    // Crear equipos
    const gameTeams: Team[] = [];
    for (let i = 0; i < proposalConfig.numberOfTeams; i++) {
      const teamData = teamNames[i];
      gameTeams.push({
        id: `team_${i + 1}`,
        name: lang === 'en' ? teamData.nameEn : teamData.name,
        emoji: teamData.emoji,
        color: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][i],
        players: [],
        score: 0,
        stage0Bonus: 0,
      });
    }
    
    // Configuración del juego
    const gameConfig = {
      level: 'primary',
      language: lang,
      gameMode: gameMode,
      className: proposalConfig.gameName,
      subject: proposalConfig.subject || '',
      numberOfTeams: proposalConfig.numberOfTeams,
      studentsPerTeam: 5,
      ratingMode: 'devices',
      timers: {
        stage1Rating: 30,
        stage2Hint: 60,
        stage2Answer: 45,
        stage2Help: 30,
      },
      createdAt: Date.now(),
      stage0Config: {
        enabled: true,
        proposalsEnabled: true,
        maxProposalsPerTeam: proposalConfig.maxProposalsPerTeam,
        timerMinutes: proposalConfig.timerMinutes || undefined,
        showLiveProposals: proposalConfig.showLiveProposals,
        materials: proposalConfig.materials,
      },
    };

    // Crear juego en Firebase
    const gamesRef = ref(database, 'games');
    const newGameRef = push(gamesRef);
    const newGameId = newGameRef.key!;
    
    await set(newGameRef, {
      config: gameConfig,
      status: {
        currentStage: 0,
        currentPhase: 'proposal-setup',
        isActive: true,
        startedAt: Date.now(),
      },
      createdBy: {
        uid: user?.uid || 'anonymous',
        email: user?.email || '',
      },
    });

    // Agregar equipos
    const teamsRef = ref(database, `games/${newGameId}/teams`);
    const teamsData: Record<string, unknown> = {};
    gameTeams.forEach(team => {
      teamsData[team.id] = {
        name: team.name,
        emoji: team.emoji,
        color: team.color,
        score: 0,
        stage0Bonus: 0,
        players: {},
      };
    });
    await set(teamsRef, teamsData);

    // Inicializar stage0
    const stage0Ref = ref(database, `games/${newGameId}/stage0`);
    await set(stage0Ref, {
      phase: 'waiting',
      proposals: {},
      timerMinutes: proposalConfig.timerMinutes,
    });

    // Generar código de sala
    const roomCode = generateRoomCode();
    const roomCodeRef = ref(database, `roomCodes/${roomCode}`);
    await set(roomCodeRef, {
      gameId: newGameId,
      createdAt: Date.now(),
      createdBy: user?.uid || 'anonymous',
    });

    // Guardar código en el juego
    await update(ref(database, `games/${newGameId}`), {
      roomCode: roomCode,
    });

    setTeams(gameTeams);
    return newGameId;
  };

  // Handler: Configuración completada
  const handleSetupComplete = async (proposalConfig: ProposalGameConfig) => {
    setIsCreating(true);
    try {
      setConfig(proposalConfig);
      const newGameId = await createGame(proposalConfig);
      setGameId(newGameId);
      setStep('waiting');
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Error al crear el juego');
    } finally {
      setIsCreating(false);
    }
  };

  // Handler: Comenzar propuestas
  const handleStartProposals = async () => {
    if (!gameId || !config) return;
    
    await update(ref(database, `games/${gameId}/stage0`), {
      phase: 'collecting',
      timerStartedAt: Date.now(),
      timerMinutes: config.timerMinutes,
    });
    
    await update(ref(database, `games/${gameId}/status`), {
      currentPhase: 'proposal-collecting',
    });
    
    setStep('collecting');
  };

  // Handler: Cerrar propuestas y pasar a curado
  const handleCloseProposals = async () => {
    if (!gameId) return;
    
    await update(ref(database, `games/${gameId}/stage0`), {
      phase: 'curating',
      closedAt: Date.now(),
    });
    
    await update(ref(database, `games/${gameId}/status`), {
      currentPhase: 'proposal-curating',
    });
    
    setStep('curating');
  };

  // Handler: Curado completado
  const handleCurationComplete = async (questions: Question[], bonusPoints: Record<string, number>) => {
    if (!gameId) return;
    
    // Guardar preguntas
    const questionsRef = ref(database, `games/${gameId}/questions`);
    const questionsData: Record<string, unknown> = {};
    questions.forEach(q => {
      questionsData[q.id] = {
        questionText: q.questionText,
        hint: q.hint || '',
        stage: q.stage,
        order: q.order,
      };
    });
    await set(questionsRef, questionsData);

    // Actualizar bonus points en equipos
    for (const [teamId, bonus] of Object.entries(bonusPoints)) {
      if (bonus > 0) {
        await update(ref(database, `games/${gameId}/teams/${teamId}`), {
          stage0Bonus: bonus,
          score: bonus,
        });
      }
    }

    // Actualizar estado del juego
    await update(ref(database, `games/${gameId}/stage0`), {
      phase: 'done',
      completedAt: Date.now(),
    });
    
    await update(ref(database, `games/${gameId}/status`), {
      currentStage: 1,
      currentPhase: 'preparation',
    });

    onGameCreated(gameId);
  };

  // Handler: Volver al paso anterior
  const handleBack = () => {
    if (step === 'setup') {
      onBack();
    } else if (step === 'waiting') {
      setStep('setup');
      setGameId('');
      setConfig(null);
    }
  };

  // Render según el paso
  if (step === 'setup') {
    return (
      <StudentProposalSetup
        onComplete={handleSetupComplete}
        onBack={onBack}
      />
    );
  }
  
  if (step === 'waiting') {
    if (!gameId || !config) return null;
    return (
      <ProposalWaitingRoom
        gameId={gameId}
        config={config}
        onStartProposals={handleStartProposals}
        onBack={handleBack}
      />
    );
  }
  
  if (step === 'collecting') {
    if (!gameId || !config) return null;
    return (
      <ProposalTeacherView
        gameId={gameId}
        config={{
          maxProposalsPerTeam: config.maxProposalsPerTeam,
          timerMinutes: config.timerMinutes,
          showLiveProposals: config.showLiveProposals,
        }}
        onCloseProposals={handleCloseProposals}
      />
    );
  }
  
  if (step === 'curating') {
    if (!gameId) return null;
    return (
      <ProposalCurationView
        gameId={gameId}
        teams={teams}
        onComplete={handleCurationComplete}
        onBack={() => {}}
      />
    );
  }
  
  return null;
}