// src/components/Stage1/Stage1ClassroomView.tsx

import { useState } from "react";
import { ref, update } from "firebase/database";
import { database } from "../../firebase.config";
import type { Game, Team } from "../../types/game";

interface Stage1ClassroomViewProps {
  game: Game;
  gameId: string;
}

export function Stage1ClassroomView({ game, gameId }: Stage1ClassroomViewProps) {
  const [resetting, setResetting] = useState<string | null>(null);

  // Normalizar equipos
  const teams: Team[] = (() => {
    const raw = (game as any).teams;
    if (!raw) return [];

    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.filter((t: any) => !!t && typeof t === "object" && !!t.id);
  })();

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

  return (
    <div style={{ padding: 40 }}>
      <h1>📊 STAGE 1 - Vista del Aula</h1>

      <div style={{
        marginBottom: 24,
        padding: 16,
        backgroundColor: "#e3f2fd",
        borderRadius: 8,
      }}>
        <p style={{ margin: 0, fontSize: 16 }}>
          💡 <strong>Vista del profesor:</strong> Monitoreo del progreso de todos los equipos en Stage 1
        </p>
      </div>

      {/* Tabla de equipos */}
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderRadius: 8,
        overflow: "hidden",
      }}>
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
                <td style={{ padding: 16, fontWeight: 700, fontSize: 16 }}>
                  {team.name}
                </td>

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
                    <span style={{
                      padding: "6px 12px",
                      backgroundColor: "#4caf50",
                      color: "white",
                      borderRadius: 4,
                      fontSize: 14,
                      fontWeight: 700,
                    }}>
                      ✅ Completado
                    </span>
                  ) : (
                    <span style={{
                      padding: "6px 12px",
                      backgroundColor: "#2196f3",
                      color: "white",
                      borderRadius: 4,
                      fontSize: 14,
                      fontWeight: 700,
                    }}>
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
        <div style={{
          padding: 40,
          textAlign: "center",
          backgroundColor: "#fff3cd",
          borderRadius: 8,
          marginTop: 24,
        }}>
          <p style={{ margin: 0, fontSize: 16 }}>
            ⚠️ No hay equipos creados todavía
          </p>
        </div>
      )}
    </div>
  );
}