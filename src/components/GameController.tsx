// src/components/GameController.tsx
// ✅ VERSIÓN OPTIMIZADA: 3 fixes de performance/Firebase
// ✅ NUEVO: driveLink pasado a TeamView desde game.config

import { useEffect, useMemo, useRef, useState } from "react";
import { ref, update, get, onValue, } from "firebase/database";
import { database } from "../firebase.config";
import type { Game, Player, Team, Round } from "../types/game";
import {
  subscribeToGame,
  updateGameStatus,
  startStage2Safely,
  devSetStage,
} from "../services/gameRepository";

import { TeamView } from "./TeamView";
import { Stage1CompleteScreen } from "./Stage1CompleteScreen";
import { Stage1ClassroomView } from "./Stage1/Stage1ClassroomView";
import { TransitionScreen } from "./TransitionScreen";
import { Stage2Controller } from "./Stage2/Stage2Controller";
import { DevConsole } from "./DevConsole";

import { Stage0TeamView, Stage0TeacherPanel } from "./Stage0";
import { useI18n } from "../i18n";

import "./GameController.css";

/* =========================
   Helpers de normalización
========================= */

function normalizePlayers(players: unknown): Player[] {
  if (Array.isArray(players)) {
    return players.filter(
      (p): p is Player => !!p && typeof p === "object" && !!(p as any).id
    );
  }
  if (players && typeof players === "object") {
    return Object.values(players as Record<string, unknown>).filter(
      (p): p is Player => !!p && typeof p === "object" && !!(p as any).id
    );
  }
  return [];
}

function normalizeRounds(rounds: unknown): Record<number, Round> {
  if (Array.isArray(rounds)) {
    const result: Record<number, Round> = {};
    rounds.forEach((r: any) => {
      if (r && typeof r.roundNumber === "number") {
        result[r.roundNumber] = r as Round;
      }
    });
    return result;
  }
  if (rounds && typeof rounds === "object") {
    const result: Record<number, Round> = {};
    Object.entries(rounds as Record<string, unknown>).forEach(([k, v]) => {
      const n = Number(k);
      if (Number.isFinite(n)) result[n] = v as Round;
    });
    return result;
  }
  return {};
}

function normalizeTeams(teamsObj: unknown): Team[] {
  if (!teamsObj || typeof teamsObj !== "object") return [];

  if (!Array.isArray(teamsObj)) {
    return Object.entries(teamsObj as Record<string, unknown>)
      .filter(([key, val]) => val && typeof val === 'object')
      .map(([key, val]: [string, any]) => ({
        ...val,
        id: val.id || key,
        players: normalizePlayers(val.players),
      })) as Team[];
  }

  return (teamsObj as any[])
    .filter((t: any) => !!t && typeof t === "object")
    .map((t: any) => ({
      ...t,
      players: normalizePlayers(t.players),
    })) as Team[];
}

/* =========================
   Props
========================= */

interface GameControllerProps {
  gameId: string;
  teamId: string;
  isTeacher?: boolean;
}

type DevStage2ViewMode = "auto" | "classroom" | "team";

/* =========================
   Componente PRINCIPAL
========================= */

export function GameController({ gameId, teamId, isTeacher = false }: GameControllerProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStage0TeacherPanel, setShowStage0TeacherPanel] = useState(false);

  const [devStage2ViewMode, setDevStage2ViewMode] = useState<DevStage2ViewMode>(() => {
    const v = localStorage.getItem("devStage2ViewMode") as DevStage2ViewMode | null;
    return v ?? "auto";
  });

  const [devStage2TeamId, setDevStage2TeamId] = useState<string>(() => {
    return localStorage.getItem("devStage2TeamId") || teamId || "teamA";
  });

  const { language = "es" } = useI18n();

  const teamDataJson = JSON.stringify((game?.teams as any)?.[teamId] ?? null);

  const team = useMemo(() => {
    if (!game?.teams) return null;
    const teamsNormalized = normalizeTeams(game.teams);
    return teamsNormalized.find((t: any) => t?.id === teamId) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamDataJson, teamId]);

  const currentRoundDataJson = JSON.stringify((() => {
    const teamData = (game?.teams as any)?.[teamId];
    const rn = teamData?.currentRound ?? 0;
    return teamData?.stage1Rounds?.[rn] ?? null;
  })());

  const currentRound = useMemo(() => {
    if (!game?.teams) return null;
    const teamData = (game.teams as any)?.[teamId];
    const roundsByNumber = normalizeRounds(teamData?.stage1Rounds);
    const currentRoundNumber = teamData?.currentRound ?? 0;
    return roundsByNumber[currentRoundNumber] ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundDataJson, teamId]);

  const questionsArray = useMemo(() => {
    return Object.values(game?.questions || {}).sort((a: any, b: any) => {
      const na = Number(String(a?.id || "").replace(/\D+/g, "")) || 0;
      const nb = Number(String(b?.id || "").replace(/\D+/g, "")) || 0;
      return na - nb;
    });
  }, [game?.questions]);

  const totalStage1Questions = useMemo(() => {
    return questionsArray.filter((q: any) => q?.suggestedStage === 1).length;
  }, [questionsArray]);

  // ✅ NUEVO: leer driveLink del config del juego
  const driveLink = (game?.config as any)?.driveLink ?? null;

  useEffect(() => {
    localStorage.setItem("devStage2ViewMode", devStage2ViewMode);
  }, [devStage2ViewMode]);

  useEffect(() => {
    localStorage.setItem("devStage2TeamId", devStage2TeamId);
  }, [devStage2TeamId]);

  /* =========================
     SUSCRIPCIÓN AL JUEGO
  ========================= */

  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
      if (!updatedGame) {
        setGame(null);
        setError("Juego no encontrado");
        setLoading(false);
        return;
      }
      setGame(updatedGame);
      setError(null);
      setLoading(false);
      console.log('📡 GAME SUBSCRIPTION: New status:', updatedGame.status?.status);
    });
    return () => unsubscribe();
  }, [gameId]);

  /* =========================
     Renderizado de pantalla
  ========================= */

  let screen: React.ReactNode = null;

  if (loading) {
    screen = (
      <div className="game-controller loading">
        <div className="spinner"></div>
        <p>Cargando juego...</p>
      </div>
    );
  }
  else if (game?.status?.status === "transition") {
    const transitionText = {
      title: language === 'es' ? '🔄 Preparando Etapa 2...'
        : language === 'pt' ? '🔄 Preparando Etapa 2...'
          : '🔄 Preparing Stage 2...',
      subtitle: language === 'es' ? 'Por favor esperen, el juego continuará automáticamente'
        : language === 'pt' ? 'Por favor aguardem, o jogo continuará automaticamente'
          : 'Please wait, the game will continue automatically',
      refresh: language === 'es' ? '🔄 Refrescar'
        : language === 'pt' ? '🔄 Atualizar'
          : '🔄 Refresh',
    };

    screen = (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: 20,
      }}>
        <div style={{ fontSize: 64, marginBottom: 20, animation: 'pulse 1.5s infinite' }}>
          🚦
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
          {transitionText.title}
        </h1>
        <p style={{ fontSize: 16, opacity: 0.9 }}>
          {transitionText.subtitle}
        </p>
        <div style={{
          marginTop: 20,
          padding: '12px 24px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 8,
          fontSize: 14
        }}>
          {isTeacher
            ? '⏳ Esperando a que todos los jugadores se sincronicen...'
            : '⏳ El docente está preparando la siguiente etapa...'}
        </div>
        {!isTeacher && (
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {transitionText.refresh}
          </button>
        )}
        <div style={{ marginTop: 15, fontSize: 12, opacity: 0.7, fontStyle: 'italic' }}>
          📡 Sincronizando con el estado del juego...
        </div>
        {import.meta.env.VITE_APP_ENV !== 'production' && (
          <div style={{ marginTop: 10, fontSize: 11, opacity: 0.5 }}>
            Status: {game?.status?.status} | Stage: {game?.status?.currentStage}
          </div>
        )}
      </div>
    );
  }
  else if (error || !game) {
    screen = (
      <div className="game-controller error">
        <h2>❌ Error</h2>
        <p>{error || "No se pudo cargar el juego"}</p>
      </div>
    );
  } else {
    if (!team) {
      screen = (
        <div className="game-controller error">
          <h2>❌ Error</h2>
          <p>Equipo no encontrado: {teamId}</p>
        </div>
      );
    }
    else if (game.status?.status === "stage0") {
      if (isTeacher || showStage0TeacherPanel) {
        screen = <Stage0TeacherPanel game={game} />;
      } else {
        screen = <Stage0TeamView game={game} team={team} />;
      }
    }
    else if (game.status?.status === "game_complete") {
      if (isTeacher) {
        screen = (
          <Stage2Controller
            key="classroom-complete"
            gameId={gameId}
            teamId={undefined}
          />
        );
      } else {
        screen = (
          <Stage2Controller
            key={teamId + "-complete"}
            gameId={gameId}
            teamId={teamId}
          />
        );
      }
    }
    else if (game.status?.status === "stage2") {
      const effectiveStage2TeamId =
        devStage2ViewMode === "classroom"
          ? undefined
          : devStage2ViewMode === "team"
            ? (devStage2TeamId || "").trim() || teamId
            : teamId;

      screen = (
        <Stage2Controller
          key={effectiveStage2TeamId || "classroom"}
          gameId={gameId}
          teamId={effectiveStage2TeamId}
        />
      );
    }
    else if (game.status?.status === "stage1-complete") {
      screen = <Stage1CompleteScreen gameId={gameId} team={team} />;
    }
    else {
      if (!currentRound) {
        screen = (
          <div className="game-controller waiting">
            <h2>⏳ Esperando</h2>
            <p>Preparando la siguiente ronda...</p>
          </div>
        );
      } else {
        const teamData = (game.teams as any)?.[teamId];
        const currentQuestionIndex = teamData?.currentQuestionIndex ?? 0;
        const fallbackQuestion = questionsArray[currentQuestionIndex] as any;

        let questionText = "";
        if (currentRound?.questionId) {
          const q = (game.questions as any)?.[currentRound.questionId];
          if (q) questionText = q.text;
        } else if (fallbackQuestion) {
          questionText = fallbackQuestion.text;
        }

        screen = isTeacher ? (
          <Stage1ClassroomView
            game={game}
            gameId={gameId}
          />
        ) : (
          <TeamView
            key={teamId}
            gameId={gameId}
            team={team}
            currentRound={currentRound}
            currentQuestion={questionText}
            totalStage1Questions={totalStage1Questions}
            sourceTextPath={(game.config as any)?.sourceTextPath ?? null}
            driveLink={driveLink}  // ✅ NUEVO
          />
        );
      }
    }
  }

  return (
    <div className="game-controller" style={{ position: "relative", minHeight: "100vh" }}>
      {screen}

      {game?.status?.status === "stage0" && (
        <button
          onClick={() => setShowStage0TeacherPanel(!showStage0TeacherPanel)}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 10000,
            padding: "12px 20px",
            backgroundColor: showStage0TeacherPanel ? "#8b5cf6" : "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {showStage0TeacherPanel ? "👥 Ver Equipo" : "🎓 Panel Docente"}
        </button>
      )}

      <div style={{ position: "fixed", bottom: 12, right: 12, zIndex: 999999 }}>
        <DevConsole
          onSetStage1={async () => { }}
          onSetStage2={async () => { }}
          onResetGame={async () => { }}
          stage2ViewMode={devStage2ViewMode}
          setStage2ViewMode={setDevStage2ViewMode}
          stage2TeamId={devStage2TeamId}
          setStage2TeamId={setDevStage2TeamId}
        />
      </div>
    </div>
  );
}