// src/components/PostGame/SelfEvalPage.tsx
// 📱 Página de entrada para autoevaluación via QR/link
// ✅ ACTUALIZADO: Acepta teamId tanto de la ruta (/autoevaluacion/:gameId/:teamId) 
//    como de query params (?team=X&player=Y)

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import { StudentSelfEvalForm } from "./StudentSelfEvalForm";
import type { Team, Player } from "../../types/game";

type PageState = "loading" | "select-player" | "form" | "not-active" | "error";

export function SelfEvalPage() {
  // ✅ ACTUALIZADO: Captura gameId Y teamId de la URL
  const { gameId, teamId: teamIdFromPath } = useParams<{ gameId: string; teamId?: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useI18n();

  // Parámetros opcionales - pueden venir de la ruta O de query params
  const teamIdFromUrl = teamIdFromPath || searchParams.get("team");
  const playerIdFromUrl = searchParams.get("player");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [error, setError] = useState<string | null>(null);

  // Datos del juego
  const [teams, setTeams] = useState<Team[]>([]);
  const [gameName, setGameName] = useState("");

  // Selección del estudiante
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teamIdFromUrl);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(playerIdFromUrl);

  const texts = {
    es: {
      loading: "Cargando...",
      title: "Autoevaluación",
      selectTeam: "¿En qué equipo estás?",
      selectPlayer: "¿Quién sos?",
      continue: "Continuar",
      notActive: "La autoevaluación no está activa",
      notActiveDesc: "Tu docente todavía no habilitó la autoevaluación para este juego.",
      waitForTeacher: "Esperá a que tu docente la active desde el podio.",
      gameNotFound: "Juego no encontrado",
      errorLoading: "Error al cargar el juego",
      back: "← Volver",
    },
    en: {
      loading: "Loading...",
      title: "Self-Evaluation",
      selectTeam: "Which team are you on?",
      selectPlayer: "Who are you?",
      continue: "Continue",
      notActive: "Self-evaluation is not active",
      notActiveDesc: "Your teacher hasn't enabled self-evaluation for this game yet.",
      waitForTeacher: "Wait for your teacher to activate it from the podium.",
      gameNotFound: "Game not found",
      errorLoading: "Error loading game",
      back: "← Back",
    },
    pt: {
      loading: "Carregando...",
      title: "Autoavaliação",
      selectTeam: "Em qual equipe você está?",
      selectPlayer: "Quem é você?",
      continue: "Continuar",
      notActive: "A autoavaliação não está ativa",
      notActiveDesc: "Seu professor ainda não habilitou a autoavaliação para este jogo.",
      waitForTeacher: "Aguarde seu professor ativar no pódio.",
      gameNotFound: "Jogo não encontrado",
      errorLoading: "Erro ao carregar jogo",
      back: "← Voltar",
    },
  };

  const t = texts[language] || texts.es;

  // Verificar estado del juego y cargar datos
  useEffect(() => {
    if (!gameId) {
      setError(t.gameNotFound);
      setPageState("error");
      return;
    }

    console.log("🔵 [SelfEvalPage] Loading game:", gameId);
    console.log("🔵 [SelfEvalPage] teamIdFromUrl:", teamIdFromUrl);
    console.log("🔵 [SelfEvalPage] playerIdFromUrl:", playerIdFromUrl);

    const checkGame = async () => {
      try {
        // Verificar si autoevaluación está activa
        const gameSnap = await get(ref(database, `games/${gameId}`));
        
        if (!gameSnap.exists()) {
          console.log("🔴 [SelfEvalPage] Game not found");
          setError(t.gameNotFound);
          setPageState("error");
          return;
        }

        const gameData = gameSnap.val();
        console.log("🔵 [SelfEvalPage] Game data loaded, selfEvaluationActive:", gameData.selfEvaluationActive);
        
        // Verificar si está activa
        if (!gameData.selfEvaluationActive) {
          console.log("🔴 [SelfEvalPage] Self-evaluation not active");
          setPageState("not-active");
          return;
        }

        // Guardar nombre del juego
        setGameName(gameData.config?.className || "");

        // Cargar equipos
        const teamsData = gameData.teams;
        const teamsList: Team[] = Array.isArray(teamsData)
          ? teamsData
          : Object.values(teamsData || {});
        
        console.log("🔵 [SelfEvalPage] Teams loaded:", teamsList.length);
        setTeams(teamsList);

        // ✅ ACTUALIZADO: Si viene teamId en la URL, preseleccionar
        if (teamIdFromUrl) {
          const team = teamsList.find((t) => t.id === teamIdFromUrl);
          if (team) {
            console.log("🔵 [SelfEvalPage] Team found from URL:", team.name);
            setSelectedTeamId(teamIdFromUrl);
            
            // Si también viene player, ir directo al form
            if (playerIdFromUrl) {
              const players: Player[] = Array.isArray(team.players)
                ? team.players
                : Object.values(team.players || {});
              const player = players.find((p) => p.id === playerIdFromUrl);
              
              if (player) {
                console.log("🔵 [SelfEvalPage] Player found from URL:", player.name);
                setSelectedPlayerId(playerIdFromUrl);
                setPageState("form");
                return;
              }
            }
          }
        }

        // Mostrar selector
        setPageState("select-player");
      } catch (err) {
        console.error("🔴 [SelfEvalPage] Error checking game:", err);
        setError(t.errorLoading);
        setPageState("error");
      }
    };

    checkGame();
  }, [gameId, teamIdFromUrl, playerIdFromUrl, t.gameNotFound, t.errorLoading]);

  // Obtener jugadores del equipo seleccionado
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const teamPlayers: Player[] = selectedTeam
    ? Array.isArray(selectedTeam.players)
      ? selectedTeam.players
      : Object.values(selectedTeam.players || {})
    : [];

  // Manejar selección y continuar
  const handleContinue = () => {
    if (selectedTeamId && selectedPlayerId) {
      console.log("🔵 [SelfEvalPage] Continuing to form with:", { selectedTeamId, selectedPlayerId });
      setPageState("form");
    }
  };

  // ========== RENDERS ==========

  // Loading
  if (pageState === "loading") {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ color: "#64748b" }}>{t.loading}</p>
        </div>
      </div>
    );
  }

  // Error
  if (pageState === "error") {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <p style={{ color: "#dc2626", fontWeight: 600 }}>{error}</p>
        </div>
      </div>
    );
  }

  // No activo
  if (pageState === "not-active") {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: "0 0 12px", color: "#1e293b", fontSize: 22 }}>
            {t.notActive}
          </h2>
          <p style={{ color: "#64748b", marginBottom: 8 }}>{t.notActiveDesc}</p>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>{t.waitForTeacher}</p>
        </div>
      </div>
    );
  }

  // Formulario de autoevaluación
  if (pageState === "form" && selectedTeamId && selectedPlayerId && gameId) {
    return (
      <StudentSelfEvalForm
        gameId={gameId}
        teamId={selectedTeamId}
        playerId={selectedPlayerId}
      />
    );
  }

  // Selector de equipo/jugador
  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
          {t.title}
        </h1>
        {gameName && (
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14 }}>{gameName}</p>
        )}
      </div>

      {/* Selector de equipo */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontWeight: 600, color: "#334155", marginBottom: 12 }}>
          {t.selectTeam}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => {
                setSelectedTeamId(team.id);
                setSelectedPlayerId(null); // Reset player al cambiar equipo
              }}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: selectedTeamId === team.id ? "3px solid #3b82f6" : "2px solid #e2e8f0",
                backgroundColor: selectedTeamId === team.id ? "#eff6ff" : "white",
                color: selectedTeamId === team.id ? "#3b82f6" : "#334155",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de jugador (solo si hay equipo seleccionado) */}
      {selectedTeamId && teamPlayers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontWeight: 600, color: "#334155", marginBottom: 12 }}>
            {t.selectPlayer}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {teamPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedPlayerId(player.id)}
                style={{
                  padding: "12px 20px",
                  borderRadius: 20,
                  border: selectedPlayerId === player.id ? "3px solid #22c55e" : "2px solid #e2e8f0",
                  backgroundColor: selectedPlayerId === player.id ? "#f0fdf4" : "white",
                  color: selectedPlayerId === player.id ? "#16a34a" : "#334155",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {selectedPlayerId === player.id && "✓ "}{player.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botón continuar */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!selectedTeamId || !selectedPlayerId}
        style={{
          width: "100%",
          padding: "16px 24px",
          fontSize: 18,
          fontWeight: 700,
          backgroundColor: selectedTeamId && selectedPlayerId ? "#3b82f6" : "#e2e8f0",
          color: selectedTeamId && selectedPlayerId ? "white" : "#94a3b8",
          border: "none",
          borderRadius: 12,
          cursor: selectedTeamId && selectedPlayerId ? "pointer" : "not-allowed",
          marginTop: 16,
        }}
      >
        {t.continue}
      </button>
    </div>
  );
}

// Estilos del contenedor
const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f8fafc",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  maxWidth: 500,
  margin: "0 auto",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};