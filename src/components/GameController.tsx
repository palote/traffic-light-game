// src/components/GameController.tsx
// ✅ MODIFICADO: Agregado soporte para Stage 0

import { useEffect, useRef, useState } from "react";
import { ref, update } from "firebase/database";
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

// ✅ NUEVO: Importar componentes de Stage 0
import { Stage0TeamView, Stage0TeacherPanel } from "./Stage0";

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

  // Si es objeto, convertir a array agregando el id de la key
  if (!Array.isArray(teamsObj)) {
    return Object.entries(teamsObj as Record<string, unknown>)
      .filter(([key, val]) => val && typeof val === 'object')
      .map(([key, val]: [string, any]) => ({
        ...val,
        id: val.id || key, // ✅ Usar la key como id si no existe
        players: normalizePlayers(val.players),
      })) as Team[];
  }

  // Si ya es array
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
  isTeacher?: boolean; // ✅ NUEVO: para diferenciar vista docente
}

/* =========================
   Dev helpers (Stage 2 view)
========================= */

type DevStage2ViewMode = "auto" | "classroom" | "team";

/* =========================
   Componente
========================= */

export function GameController({ gameId, teamId, isTeacher = false }: GameControllerProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showStage1Classroom, setShowStage1Classroom] = useState(false);

  // ✅ NUEVO: Toggle para vista Stage 0
  const [showStage0TeacherPanel, setShowStage0TeacherPanel] = useState(false);

  const transitionRequestedRef = useRef(false);
  const devForceCooldownRef = useRef<number>(0);

  const [devStage2ViewMode, setDevStage2ViewMode] = useState<DevStage2ViewMode>(() => {
    const v = localStorage.getItem("devStage2ViewMode") as DevStage2ViewMode | null;
    return v ?? "auto";
  });

  const [devStage2TeamId, setDevStage2TeamId] = useState<string>(() => {
    return localStorage.getItem("devStage2TeamId") || teamId || "teamA";
  });

  useEffect(() => {
    localStorage.setItem("devStage2ViewMode", devStage2ViewMode);
  }, [devStage2ViewMode]);

  useEffect(() => {
    localStorage.setItem("devStage2TeamId", devStage2TeamId);
  }, [devStage2TeamId]);

  /* =========================
     DEV ONLY – FORZAR ETAPAS
  ========================= */

  const forceStage1 = async () => {
    const now = Date.now();
    if (now - devForceCooldownRef.current < 800) {
      console.warn("⛔ DEV: Ignorado forceStage1 (cooldown)");
      return;
    }
    devForceCooldownRef.current = now;

    try {
      await devSetStage(gameId, 1);
      console.log("✅ DEV: Forzado a Stage 1");
    } catch (e) {
      console.error("❌ DEV: No se pudo forzar Stage 1", e);
    }
  };

  const forceStage2 = async () => {
    const now = Date.now();
    if (now - devForceCooldownRef.current < 800) {
      console.warn("⛔ DEV: Ignorado forceStage2 (cooldown)");
      return;
    }
    devForceCooldownRef.current = now;

    try {
      await devSetStage(gameId, 2);
      console.log("✅ DEV: Forzado a Stage 2");
    } catch (e) {
      console.error("❌ DEV: No se pudo forzar Stage 2", e);
    }
  };

  /* =========================
     Suscripción al juego
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

      const status = updatedGame.status?.status;

      if (status !== "stage1-complete") {
        transitionRequestedRef.current = false;
      }

      if (status === "stage1-complete") {
        const teams = normalizeTeams(updatedGame.teams);
        const allCompleted =
          teams.length > 0 && teams.every((t: any) => t?.stage1Completed === true);

        if (allCompleted && !transitionRequestedRef.current) {
          transitionRequestedRef.current = true;
          updateGameStatus(gameId, "transition", 1);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  /* =========================
     HANDLERS
  ========================= */

  const handleStartStage2 = async () => {
    try {
      console.log("🚀 Starting Stage 2...");
      await startStage2Safely(gameId);
      console.log("✅ Stage 2 iniciado (lock-safe)");
    } catch (err) {
      console.error("❌ Error starting Stage 2:", err);
      alert("Error al iniciar Stage 2");
    }
  };

  const resetGameToRound1 = async () => {
    if (!confirm('¿Resetear TODOS los equipos a ronda 1? Perderán todo el progreso.')) return;

    try {
      const updates: any = {};

      updates[`games/${gameId}/status/status`] = 'stage1';

      const teams = normalizeTeams(game?.teams);
      teams.forEach(team => {
        // ✅ NUEVO: Resetear currentRound de cada equipo
        updates[`games/${gameId}/teams/${team.id}/currentRound`] = 0;
        updates[`games/${gameId}/teams/${team.id}/currentQuestionIndex`] = 0;
        updates[`games/${gameId}/teams/${team.id}/stage1Completed`] = false;
        updates[`games/${gameId}/teams/${team.id}/stage1Rounds`] = {};

        team.players.forEach(player => {
          updates[`games/${gameId}/teams/${team.id}/players/${player.id}/score`] = 0;
          updates[`games/${gameId}/teams/${team.id}/players/${player.id}/consecutiveLastPlace`] = 0;
        });
      });

      await update(ref(database), updates);

      console.log('✅ Juego reseteado a ronda 1');
      alert('✅ Juego reseteado. Todos los equipos vuelven a ronda 1.');
    } catch (e) {
      console.error('❌ Error reseteando:', e);
      alert('Error al resetear el juego');
    }
  };

  /* =========================
     Pantalla principal (screen)
  ========================= */

  let screen: React.ReactNode = null;

  if (loading) {
    screen = (
      <div className="game-controller loading">
        <div className="spinner"></div>
        <p>Cargando juego...</p>
      </div>
    );
  } else if (error || !game) {
    screen = (
      <div className="game-controller error">
        <h2>❌ Error</h2>
        <p>{error || "No se pudo cargar el juego"}</p>
      </div>
    );
  } else {
    const teamsNormalized = normalizeTeams(game.teams);
    const team = teamsNormalized.find((t: any) => t?.id === teamId);

    // ✅ NUEVO: STAGE 0
    if (game.status?.status === "stage0") {
      // Si es docente o se activa el toggle, mostrar panel docente
      if (isTeacher || showStage0TeacherPanel) {
        screen = <Stage0TeacherPanel game={game} />;
      } else if (team) {
        // Vista del equipo
        screen = <Stage0TeamView game={game} team={team} />;
      } else {
        screen = (
          <div className="game-controller error">
            <h2>❌ Error</h2>
            <p>Equipo no encontrado: {teamId}</p>
          </div>
        );
      }
    }
    // STAGE 2
    else if (game.status?.status === "stage2") {
      const effectiveStage2TeamId =
        devStage2ViewMode === "classroom"
          ? undefined
          : devStage2ViewMode === "team"
            ? (devStage2TeamId || "").trim() || teamId
            : teamId;

      const stage2Key = `${devStage2ViewMode}:${effectiveStage2TeamId ?? "classroom"}`;

      screen = (
        <Stage2Controller
          key={stage2Key}
          gameId={gameId}
          teamId={effectiveStage2TeamId}
        />
      );

    } else if (game.status?.status === "transition") {
      screen = <TransitionScreen teams={teamsNormalized} onStartStage2={handleStartStage2} />;
    } else {
      if (!team) {
        screen = (
          <div className="game-controller error">
            <h2>❌ Error</h2>
            <p>Equipo no encontrado</p>
          </div>
        );
      } else if (game.status?.status === "stage1-complete") {
        screen = <Stage1CompleteScreen gameId={gameId} team={team} />;
      } else {
        // ✅ NUEVO: Leer rounds del equipo específico
        const teamData = (game.teams as any)?.[teamId];
        const roundsByNumber = normalizeRounds(teamData?.stage1Rounds);
        const currentRoundNumber = teamData?.currentRound ?? 0;

        const currentRound = roundsByNumber[currentRoundNumber];

        // ✅ AGREGÁ ESTE LOG (temporal)
        console.log("🔍 GameController currentRound:", {
          teamId,
          currentRoundNumber,
          captainName: currentRound?.captainName,
          respondingPlayerName: currentRound?.respondingPlayerName,
          fullRound: currentRound
        });

        if (!currentRound) {
          screen = (
            <div className="game-controller waiting">
              <h2>⏳ Esperando</h2>
              <p>Preparando la siguiente ronda...</p>
            </div>
          );
        } else {
          const currentQuestionIndex = teamData?.currentQuestionIndex ?? 0;

          const questionsArray = Object.values(game.questions || {}).sort((a: any, b: any) => {
            const na = Number(String(a?.id || "").replace(/\D+/g, "")) || 0;
            const nb = Number(String(b?.id || "").replace(/\D+/g, "")) || 0;
            return na - nb;
          });

          const fallbackQuestion = questionsArray[currentQuestionIndex] as any;

          let questionText = "";
          if (currentRound?.questionId) {
            const q = (game.questions as any)?.[currentRound.questionId];
            if (q) questionText = q.text;
          } else if (fallbackQuestion) {
            questionText = fallbackQuestion.text;
          }

          const totalStage1Questions = Object.values(game.questions || {}).filter(
            (q: any) => q?.suggestedStage === 1
          ).length;

          // ✅ NUEVO: permitir cambiar entre TeamView y ClassroomView
          screen = showStage1Classroom ? (
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
            />
          );
        }
      }
    }
  }

  return (
    <div className="game-controller" style={{ position: "relative", minHeight: "100vh" }}>
      {screen}

      {/* ✅ NUEVO: Botón toggle Panel Docente Stage 0 */}
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

      {/* ✅ Botón toggle ClassroomView Stage 1 (solo docente) */}
      {game?.status?.status === "stage1" && isTeacher === true && (
        <button
          onClick={() => setShowStage1Classroom(!showStage1Classroom)}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 10000,
            padding: "12px 20px",
            backgroundColor: showStage1Classroom ? "#4caf50" : "#2196f3",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {showStage1Classroom ? "👥 Ver Equipo" : "📊 Vista Aula"}
        </button>
      )}

      <div style={{ position: "fixed", bottom: 12, right: 12, zIndex: 999999 }}>
        <DevConsole
          onSetStage1={forceStage1}
          onSetStage2={forceStage2}
          onResetGame={resetGameToRound1}
          stage2ViewMode={devStage2ViewMode}
          setStage2ViewMode={setDevStage2ViewMode}
          stage2TeamId={devStage2TeamId}
          setStage2TeamId={setDevStage2TeamId}
        />
      </div>
    </div>
  );

}
