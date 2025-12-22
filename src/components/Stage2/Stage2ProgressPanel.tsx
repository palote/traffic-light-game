// src/components/Stage2/Stage2ProgressPanel.tsx
// Panel de progreso de equipos para Stage 2 (similar a Stage1ClassroomView)

import { useMemo } from "react";
import type { Game, Team, Stage2Round } from "../../types/game";

interface Stage2ProgressPanelProps {
  game: Game;
  round: Stage2Round | null;
}

// Mapeo de fases a nombres amigables
const PHASE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  hint: { label: "Pista", emoji: "💡", color: "#FFC107" },
  designated: { label: "Designados", emoji: "👥", color: "#2196F3" },
  question_revealed: { label: "Pregunta", emoji: "📝", color: "#9C27B0" },
  responding: { label: "Respondiendo", emoji: "🎤", color: "#FF5722" },
  rating: { label: "Calificando", emoji: "🎨", color: "#4CAF50" },
  rating_reveal: { label: "Colores", emoji: "📊", color: "#00BCD4" },
  justification: { label: "Justificando", emoji: "💬", color: "#FF9800" },
  validation_response: { label: "Validar Resp.", emoji: "⚖️", color: "#E91E63" },
  validation_ratings: { label: "Validar Calif.", emoji: "✅", color: "#673AB7" },
  results: { label: "Resultados", emoji: "🏆", color: "#FFD700" },
};

export function Stage2ProgressPanel({ game, round }: Stage2ProgressPanelProps) {
  // Normalizar equipos
  const teams: Team[] = useMemo(() => {
    const raw = (game as any).teams;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.filter((t: any) => !!t && typeof t === "object" && !!t.id);
  }, [game]);

  // Ordenar por puntaje (mayor a menor)
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  }, [teams]);

  const currentPhase = round?.phase ?? "hint";
  const phaseInfo = PHASE_LABELS[currentPhase] ?? { label: currentPhase, emoji: "❓", color: "#999" };

  // Obtener info de cada equipo en esta ronda
  const getTeamRoundInfo = (team: Team) => {
    if (!round) return { role: "—", status: "—", rated: false };

    // ¿Es el equipo que responde?
    if (round.respondingTeam?.teamId === team.id) {
      const responding = round.respondingTeam;
      return {
        role: "🎤 Responde",
        playerName: responding.playerName,
        status: responding.responseGiven ? "✅ Respondió" : "⏳ Esperando",
        isResponder: true,
        helpUsed: responding.helpStartedAt !== null,
      };
    }

    // ¿Es un equipo calificador?
    const rater = round.ratingTeams?.[team.id];
    if (rater) {
      const hasRated = rater.rating !== null;
      const ratingEmoji = 
        rater.rating === "green" ? "🟩" :
        rater.rating === "yellow" ? "🟨" :
        rater.rating === "red" ? "🟥" : "⬜";

      return {
        role: "🎨 Califica",
        playerName: rater.playerName,
        status: hasRated ? `${ratingEmoji} Calificó` : "⏳ Pendiente",
        isRater: true,
        rated: hasRated,
        rating: rater.rating,
        validated: rater.validated,
      };
    }

    return { role: "—", status: "—" };
  };

  // Contar calificaciones
  const ratingStats = useMemo(() => {
    if (!round?.ratingTeams) return { rated: 0, total: 0 };
    const raters = Object.values(round.ratingTeams);
    return {
      rated: raters.filter(r => r.rating !== null).length,
      total: raters.length,
    };
  }, [round]);

  return (
    <div style={{
      backgroundColor: "#f5f5f5",
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 20 }}>
          📊 Progreso de Equipos
        </h3>
        
        {/* Fase actual */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <span style={{ fontSize: 14, opacity: 0.7 }}>
            Ronda {(game.stage2?.currentRound ?? 0) + 1}
          </span>
          <div style={{
            padding: "6px 12px",
            backgroundColor: phaseInfo.color,
            color: "white",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 700,
          }}>
            {phaseInfo.emoji} {phaseInfo.label}
          </div>
        </div>
      </div>

      {/* Barra de progreso de calificación (solo en fase rating) */}
      {currentPhase === "rating" && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: "#e8f5e9",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            🎨 Calificaciones: <strong>{ratingStats.rated}</strong> de <strong>{ratingStats.total}</strong>
          </div>
          <div style={{
            height: 8,
            backgroundColor: "#c8e6c9",
            borderRadius: 4,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${ratingStats.total > 0 ? (ratingStats.rated / ratingStats.total) * 100 : 0}%`,
              backgroundColor: "#4CAF50",
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

      {/* Tabla de equipos */}
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: "white",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}>
        <thead>
          <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
            <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Pos</th>
            <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Equipo</th>
            <th style={{ padding: 12, textAlign: "center", fontSize: 14 }}>Rol</th>
            <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Representante</th>
            <th style={{ padding: 12, textAlign: "center", fontSize: 14 }}>Estado</th>
            <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>Puntaje</th>
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map((team, index) => {
            const info = getTeamRoundInfo(team);
            const isLeader = index === 0 && (team.totalScore ?? 0) > 0;

            return (
              <tr
                key={team.id}
                style={{
                  borderBottom: index < sortedTeams.length - 1 ? "1px solid #eee" : "none",
                  backgroundColor: (info as any).isResponder ? "#fff3e0" : 
                                   (info as any).isRater ? "#e3f2fd" : "white",
                }}
              >
                {/* Posición */}
                <td style={{ padding: 12, fontSize: 16, fontWeight: 700 }}>
                  {index + 1}{isLeader && " 👑"}
                </td>

                {/* Nombre del equipo */}
                <td style={{ padding: 12, fontWeight: 700, fontSize: 15 }}>
                  {team.name}
                </td>

                {/* Rol */}
                <td style={{ padding: 12, textAlign: "center", fontSize: 14 }}>
                  {info.role}
                </td>

                {/* Representante */}
                <td style={{ padding: 12, fontSize: 14 }}>
                  {(info as any).playerName ?? "—"}
                </td>

                {/* Estado */}
                <td style={{ padding: 12, textAlign: "center" }}>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 13,
                    backgroundColor: 
                      info.status.includes("✅") || info.status.includes("🟩") || info.status.includes("🟨") || info.status.includes("🟥") 
                        ? "#e8f5e9" 
                        : "#fff3e0",
                    color: 
                      info.status.includes("✅") || info.status.includes("🟩") || info.status.includes("🟨") || info.status.includes("🟥")
                        ? "#2e7d32"
                        : "#e65100",
                  }}>
                    {info.status}
                  </span>
                </td>

                {/* Puntaje */}
                <td style={{ 
                  padding: 12, 
                  textAlign: "right", 
                  fontWeight: 700, 
                  fontSize: 16,
                  color: isLeader ? "#FFD700" : "#333",
                }}>
                  {team.totalScore ?? 0} pts
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Leyenda */}
      <div style={{
        marginTop: 12,
        padding: 12,
        backgroundColor: "#fafafa",
        borderRadius: 8,
        fontSize: 12,
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <span><span style={{ backgroundColor: "#fff3e0", padding: "2px 6px", borderRadius: 4 }}>🎤</span> = Equipo que responde</span>
        <span><span style={{ backgroundColor: "#e3f2fd", padding: "2px 6px", borderRadius: 4 }}>🎨</span> = Equipos que califican</span>
        <span>🟩 Verde | 🟨 Amarillo | 🟥 Rojo</span>
      </div>
    </div>
  );
}