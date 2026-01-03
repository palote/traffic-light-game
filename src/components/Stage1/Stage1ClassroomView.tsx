// src/components/Stage1/Stage1ClassroomView.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, update } from "firebase/database";
import { database } from "../../firebase.config";
import type { Game, Team } from "../../types/game";

// ✅ Auth (solo docente) — no toca lógica del juego
import { useAuth } from "../../hooks/useAuth";

interface Stage1ClassroomViewProps {
  game: Game;
  gameId: string;
}

export function Stage1ClassroomView({ game, gameId }: Stage1ClassroomViewProps) {
  const [resetting, setResetting] = useState<string | null>(null);
  const navigate = useNavigate();

  // ✅ Auth: logout docente (métricas cierran sesión desde AuthContext)
  const { logout, authRequired } = useAuth();

  // Normalizar equipos
  const teams: Team[] = (() => {
    const raw = (game as any).teams;
    if (!raw) return [];

    // Si es objeto, convertir a array agregando el id de la key
    if (!Array.isArray(raw) && typeof raw === 'object') {
      return Object.entries(raw)
        .filter(([key, val]) => val && typeof val === 'object')
        .map(([key, val]: [string, any]) => ({
          ...val,
          id: val.id || key, // ✅ Usar la key como id si no existe
        }));
    }

    // Si es array, filtrar los válidos
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.filter((t: any) => !!t && typeof t === "object");
  })();

  // ✅ Verificar si todos los equipos completaron Stage 1
  const allTeamsCompleted = teams.length > 0 && teams.every((t) => {
    const teamData = (game.teams as any)?.[t.id];
    return teamData?.stage1Completed === true;
  });
  console.log("DEBUG allTeamsCompleted:", allTeamsCompleted, "teams:", teams.length);
  // Resetear un equipo específico
  const handleResetTeam = async (teamId: string) => {
    if (!confirm(`¿Resetear ${teamId} a ronda 1? Perderá todo su progreso.`)) return;

    setResetting(teamId);

    try {
      const team = teams.find((t) => t.id === teamId);
      if (!team) throw new Error("Team not found");

      const updates: any = {};

      // Resetear ronda y estado
      updates[`games/${gameId}/teams/${teamId}/currentRound`] = 0;
      updates[`games/${gameId}/teams/${teamId}/currentQuestionIndex`] = 0;
      updates[`games/${gameId}/teams/${teamId}/stage1Completed`] = false;
      updates[`games/${gameId}/teams/${teamId}/stage1Rounds`] = {};

      // Resetear puntos de jugadores
      team.players.forEach((player) => {
        updates[`games/${gameId}/teams/${teamId}/players/${player.id}/score`] = 0;
        updates[`games/${gameId}/teams/${teamId}/players/${player.id}/consecutiveLastPlace`] = 0;
      });

      await update(ref(database), updates);

      console.log(`✅ Team ${teamId} reseteado`);
    } catch (e) {
      console.error("Error reseteando equipo:", e);
      alert("Error al resetear el equipo");
    } finally {
      setResetting(null);
    }
  };

  // ✅ Iniciar Stage 2
  const handleStartStage2 = () => {
    navigate(`/stage2/classroom/${gameId}`);
  };

  return (
    <div style={{ padding: 40 }}>
      {/* Header con Logout (sin tocar lógica del juego) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>📊 STAGE 1 - Vista del Aula</h1>

        {authRequired && (
          <button
            onClick={logout}
            style={{
              padding: "10px 16px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 800,
            }}
            title="Cerrar sesión del docente"
          >
            🚪 Salir
          </button>
        )}
      </div>

      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#e3f2fd",
          borderRadius: 8,
        }}
      >
        <p style={{ margin: 0, fontSize: 16 }}>
          💡 <strong>Vista del profesor:</strong> Monitoreo del progreso de todos los equipos en Stage 1
        </p>
      </div>

      {/* ✅ BOTÓN PARA INICIAR STAGE 2 - Solo visible cuando todos completaron */}
      {allTeamsCompleted && (
        <div
          style={{
            marginBottom: 24,
            padding: 24,
            backgroundColor: "#f0fdf4",
            borderRadius: 12,
            border: "2px solid #22c55e",
            textAlign: "center",
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", color: "#16a34a", fontSize: 20 }}>
            🎉 ¡Todos los equipos completaron Stage 1!
          </h3>
          <p style={{ margin: "0 0 16px 0", color: "#15803d", fontSize: 14 }}>
            Los equipos están listos para la siguiente etapa
          </p>
          <button
            onClick={handleStartStage2}
            style={{
              padding: "16px 32px",
              fontSize: 18,
              fontWeight: 700,
              backgroundColor: "#22c55e",
              color: "white",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(34, 197, 94, 0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(34, 197, 94, 0.5)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(34, 197, 94, 0.4)";
            }}
          >
            🚀 INICIAR STAGE 2
          </button>
        </div>
      )}

      {/* Tabla de equipos */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
            <th style={{ padding: 16, textAlign: "left", fontSize: 16 }}>Equipo</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>Ronda Actual</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>Puntaje Total</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>Estado</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const teamData = (game.teams as any)?.[team.id];
            const currentRound = teamData?.currentRound ?? 0;
            const isCompleted = teamData?.stage1Completed === true;

            // Normalizar players
            const players = Array.isArray(team.players)
              ? team.players
              : team.players && typeof team.players === "object"
                ? Object.values(team.players)
                : [];

            const totalScore = players.reduce((sum: number, p: any) => sum + (p.score ?? 0), 0);

            return (
              <tr
                key={team.id}
                style={{
                  borderBottom: index < teams.length - 1 ? "1px solid #eee" : "none",
                  backgroundColor: isCompleted ? "#f1f8e9" : "white",
                }}
              >
                {/* Equipo */}
                <td style={{ padding: 16, fontWeight: 700, fontSize: 16 }}>{team.name}</td>

                {/* Ronda */}
                <td style={{ padding: 16, textAlign: "center", fontSize: 16 }}>
                  {isCompleted ? "—" : `Ronda ${currentRound + 1}`}
                </td>

                {/* Puntaje */}
                <td style={{ padding: 16, textAlign: "center", fontSize: 16, fontWeight: 700 }}>
                  {totalScore} pts
                </td>

                {/* Estado */}
                <td style={{ padding: 16, textAlign: "center" }}>
                  {isCompleted ? (
                    <span
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#4caf50",
                        color: "white",
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      ✅ Completado
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#2196f3",
                        color: "white",
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      🏃 En progreso
                    </span>
                  )}
                </td>

                {/* Acciones */}
                <td style={{ padding: 16, textAlign: "center" }}>
                  <button
                    onClick={() => handleResetTeam(team.id)}
                    disabled={resetting === team.id}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: resetting === team.id ? "#ccc" : "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: resetting === team.id ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {resetting === team.id ? "⏳ Reseteando..." : "🔄 Resetear"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {teams.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            backgroundColor: "#fff3cd",
            borderRadius: 8,
            marginTop: 24,
          }}
        >
          <p style={{ margin: 0, fontSize: 16 }}>⚠️ No hay equipos creados todavía</p>
        </div>
      )}
    </div>
  );
}