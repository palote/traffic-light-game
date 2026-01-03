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
    type: "file" | "text" | "link";
    name: string;
    content: string;
  }>;
  maxProposalsPerTeam: number;
  timerMinutes: number | null;
  showLiveProposals: boolean;
  teams: Team[];  // ✅ AGREGADO: Equipos con jugadores asignados
}

// Nombres de equipos
const TEAM_ANIMALS = [
  { emoji: "🦁", name: "Leones", nameEn: "Lions" },
  { emoji: "🐯", name: "Tigres", nameEn: "Tigers" },
  { emoji: "🐻", name: "Osos", nameEn: "Bears" },
  { emoji: "🦅", name: "Águilas", nameEn: "Eagles" },
  { emoji: "🐺", name: "Lobos", nameEn: "Wolves" },
  { emoji: "🦊", name: "Zorros", nameEn: "Foxes" },
  { emoji: "🦒", name: "Jirafas", nameEn: "Giraffes" },
  { emoji: "🐘", name: "Elefantes", nameEn: "Elephants" },
];

const TEAM_PROFESSIONAL = [
  { emoji: "🔷", name: "Estrategas", nameEn: "Strategists" },
  { emoji: "🔶", name: "Innovadores", nameEn: "Innovators" },
  { emoji: "💎", name: "Vanguardia", nameEn: "Vanguard" },
  { emoji: "⚡", name: "Impulso", nameEn: "Momentum" },
  { emoji: "🎯", name: "Enfoque", nameEn: "Focus" },
  { emoji: "🚀", name: "Pioneros", nameEn: "Pioneers" },
  { emoji: "💡", name: "Creativos", nameEn: "Creatives" },
  { emoji: "🔥", name: "Impacto", nameEn: "Impact" },
];

type FlowStep = "setup" | "waiting" | "collecting" | "curating" | "done";

interface ProposalFlowOrchestratorProps {
  onBack: () => void;
  onGameCreated: (gameId: string) => void;
}

export function ProposalFlowOrchestrator({
  onBack,
  onGameCreated,
}: ProposalFlowOrchestratorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode: gameMode } = useGameMode();
  const { language } = useI18n();

  const [step, setStep] = useState<FlowStep>("setup");
  const [gameId, setGameId] = useState<string>("");
  const [config, setConfig] = useState<ProposalGameConfig | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Generar código de sala
  const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Crear juego en Firebase
  const createGame = async (proposalConfig: ProposalGameConfig): Promise<string> => {
    const isCoopetition = gameMode === "coopetition";
    const teamNames = isCoopetition ? TEAM_PROFESSIONAL : TEAM_ANIMALS;
    const lang = language === "en" ? "en" : "es";

    // ✅ MODIFICADO (Cambio 1): Usar los equipos que vienen del config (ya tienen jugadores)
    const gameTeams: Team[] = proposalConfig.teams;

    // Configuración del juego
    const gameConfig = {
      level: "primary",
      language: lang,
      gameMode: gameMode,
      className: proposalConfig.gameName,
      subject: proposalConfig.subject || "",
      numberOfTeams: proposalConfig.numberOfTeams,
      studentsPerTeam: 5,
      ratingMode: "devices",
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
    const gamesRef = ref(database, "games");
    const newGameRef = push(gamesRef);
    const newGameId = newGameRef.key!;

    await set(newGameRef, {
      config: gameConfig,
      status: {
        currentStage: 0,
        currentPhase: "proposal-setup",
        isActive: true,
        startedAt: Date.now(),
      },
      createdBy: {
        uid: user?.uid || "anonymous",
        email: user?.email || "",
      },
    });

    // ✅ MODIFICADO (Cambio 2): Agregar equipos con jugadores (players array -> objeto para Firebase)
    const teamsRef = ref(database, `games/${newGameId}/teams`);
    const teamsData: Record<string, unknown> = {};
    gameTeams.forEach((team) => {
      // Convertir players array a objeto para Firebase
      const playersObj: Record<string, any> = {};
      (team.players as any[]).forEach((player: any) => {
        playersObj[player.id] = {
          id: player.id,
          name: player.name,
          score: player.score || 0,
          consecutiveLastPlace: player.consecutiveLastPlace || 0,
        };
      });

      teamsData[team.id] = {
        id: team.id,
        name: team.name,
        emoji: (team as any).emoji || "",
        color: (team as any).color || "#6366f1",
        score: 0,
        stage0Bonus: 0,
        players: playersObj,
      };
    });
    await set(teamsRef, teamsData);

    // Inicializar stage0
    const stage0Ref = ref(database, `games/${newGameId}/stage0`);
    await set(stage0Ref, {
      phase: "waiting",
      proposals: {},
      timerMinutes: proposalConfig.timerMinutes,
    });

    // Generar código de sala
    const roomCode = generateRoomCode();
    const roomCodeRef = ref(database, `roomCodes/${roomCode}`);
    await set(roomCodeRef, {
      gameId: newGameId,
      createdAt: Date.now(),
      createdBy: user?.uid || "anonymous",
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
      setStep("waiting");
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Error al crear el juego");
    } finally {
      setIsCreating(false);
    }
  };

  // Handler: Comenzar propuestas
  const handleStartProposals = async () => {
    if (!gameId || !config) return;

    await update(ref(database, `games/${gameId}/stage0`), {
      phase: "collecting",
      timerStartedAt: Date.now(),
      timerMinutes: config.timerMinutes,
    });

    await update(ref(database, `games/${gameId}/status`), {
      currentPhase: "proposal-collecting",
    });

    setStep("collecting");
  };

  // Handler: Cerrar propuestas y pasar a curado
  const handleCloseProposals = async () => {
    if (!gameId) return;

    await update(ref(database, `games/${gameId}/stage0`), {
      phase: "curating",
      closedAt: Date.now(),
    });

    await update(ref(database, `games/${gameId}/status`), {
      currentPhase: "proposal-curating",
    });

    setStep("curating");
  };

  // Handler: Curado completado
  const handleCurationComplete = async (
    questions: Question[],
    bonusPoints: Record<string, number>
  ) => {
    if (!gameId) return;

    // ✅ DEBUG: Ver qué llega
    console.log("🔍 handleCurationComplete questions:", questions.map(q => ({
      id: q.id,
      text: (q as any).questionText || (q as any).text,
      hint: q.hint,
      stage: (q as any).stage,
    })));

    // Guardar preguntas
    const questionsRef = ref(database, `games/${gameId}/questions`);
    const questionsData: Record<string, unknown> = {};
    questions.forEach((q) => {
      questionsData[q.id] = {
        id: q.id,
        text: q.questionText || q.text,
        hint: q.hint || "",
        suggestedStage: q.stage || 1,
        order: q.order,
      };
    });
    await set(questionsRef, questionsData);

    // Actualizar bonus points en equipos
    for (const [teamId, bonus] of Object.entries(bonusPoints)) {
      if (bonus > 0) {
        await update(ref(database, `games/${gameId}/teams/${teamId}`), {
          stage0Bonus: bonus,
          totalScore: bonus,
        });
      }
    }

    // Actualizar estado del juego - marcar Stage 0 como completado
    await update(ref(database, `games/${gameId}/stage0`), {
      phase: "done",
      completedAt: Date.now(),
    });

    // ✅ NUEVO: Cambiar a status "stage0" para que finishStage0AndStartStage1 funcione
    await update(ref(database, `games/${gameId}/status`), {
      status: "stage0",
      currentStage: 0,
    });

    // ✅ NUEVO: Usar la función que inicializa Stage 1 correctamente
    const { finishStage0AndStartStage1 } = await import("../../services/stage0Service");
    await finishStage0AndStartStage1(gameId);

    console.log("✅ Curation complete, Stage 1 started");
    onGameCreated(gameId);
  };

  // Handler: Volver al paso anterior
  const handleBack = () => {
    if (step === "setup") {
      onBack();
    } else if (step === "waiting") {
      setStep("setup");
      setGameId("");
      setConfig(null);
    }
  };

  // Render según el paso
  if (step === "setup") {
    return <StudentProposalSetup onComplete={handleSetupComplete} onBack={onBack} />;
  }

  if (step === "waiting") {
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

  if (step === "collecting") {
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

  if (step === "curating") {
    if (!gameId) return null;
    return (
      <ProposalCurationView
        gameId={gameId}
        teams={teams}
        onComplete={handleCurationComplete}
        onBack={() => { }}
      />
    );
  }

  return null;
}
