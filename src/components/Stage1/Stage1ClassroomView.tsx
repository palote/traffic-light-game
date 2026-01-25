// src/components/Stage1/Stage1ClassroomView.tsx
// ✅ VERSIÓN FINAL: ÚNICO FLUJO DE TRANSICIÓN (botón docente)

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ref, update } from "firebase/database";
import { database } from "../../firebase.config";
import type { Game, Team } from "../../types/game";
import { useI18n } from "../../i18n";
import { startStage2Safely } from "../../services/gameRepository";

interface Stage1ClassroomViewProps {
  game: Game;
  gameId: string;
}

export function Stage1ClassroomView({ game, gameId }: Stage1ClassroomViewProps) {
  const [resetting, setResetting] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const { language } = useI18n();

  // ✅ Textos traducidos
  const texts = {
    title: language === 'es'
      ? "📊 ETAPA 1 - Vista del Aula"
      : language === 'pt'
        ? "📊 ETAPA 1 - Visão da Sala de Aula"
        : "📊 STAGE 1 - Classroom View",

    instructions: language === 'es'
      ? "💡 <strong>Vista del profesor:</strong> Monitoreo del progreso de todos los equipos en Etapa 1"
      : language === 'pt'
        ? "💡 <strong>Visão do professor:</strong> Monitoramento do progresso de todas as equipes na Etapa 1"
        : "💡 <strong>Teacher view:</strong> Monitoring progress of all teams in Stage 1",

    completedTitle: language === 'es'
      ? "🎉 ¡Listo para Etapa 2!"
      : language === 'pt'
        ? "🎉 Pronto para Etapa 2!"
        : "🎉 Ready for Stage 2!",

    completedSubtitle: language === 'es'
      ? "Cuando estés listo, presiona el botón para iniciar la Etapa 2"
      : language === 'pt'
        ? "Quando estiver pronto, pressione o botão para iniciar a Etapa 2"
        : "When ready, press the button to start Stage 2",

    forceStage2: language === 'es'
      ? "🚀 INICIAR ETAPA 2"
      : language === 'pt'
        ? "🚀 INICIAR ETAPA 2"
        : "🚀 START STAGE 2",

    forceStage2Confirm: language === 'es'
      ? "¿Pasar TODOS los equipos a Etapa 2? Los equipos que no terminaron perderán su progreso."
      : language === 'pt'
        ? "Passar TODAS as equipes para Etapa 2? As equipes que não terminaram perderão seu progresso."
        : "Move ALL teams to Stage 2? Teams that haven't finished will lose progress.",

    resetConfirm: language === 'es'
      ? "¿Resetear {team} a ronda 1? Perderá todo su progreso."
      : language === 'pt'
        ? "Resetar {team} para rodada 1? Perderá todo o progresso."
        : "Reset {team} to round 1? Will lose all progress.",

    resetSuccess: language === 'es'
      ? "✅ Equipo {team} reseteado"
      : language === 'pt'
        ? "✅ Equipe {team} resetada"
        : "✅ Team {team} reset",

    resetError: language === 'es'
      ? "Error al resetear el equipo"
      : language === 'pt'
        ? "Erro ao resetar a equipe"
        : "Error resetting team",

    noTeams: language === 'es'
      ? "⚠️ No hay equipos creados todavía"
      : language === 'pt'
        ? "⚠️ Nenhuma equipe criada ainda"
        : "⚠️ No teams created yet",
  };

  // Normalizar equipos
  const teams: Team[] = (() => {
    const raw = (game as any).teams;
    if (!raw) return [];

    if (!Array.isArray(raw) && typeof raw === 'object') {
      return Object.entries(raw)
        .filter(([key, val]) => val && typeof val === 'object')
        .map(([key, val]: [string, any]) => ({
          ...val,
          id: val.id || key,
        }));
    }

    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.filter((t: any) => !!t && typeof t === "object");
  })();

  // ✅ Calcular estado para el botón
  const teamsIds = Object.keys(game.teams || {});
  const completedCount = teamsIds.filter(tid => 
    (game.teams as any)?.[tid]?.stage1Completed === true
  ).length;
  const totalTeams = teamsIds.length;
  const allTeamsCompleted = totalTeams > 0 && completedCount === totalTeams;

  // ✅ ÚNICO FLUJO: Botón para pasar a Etapa 2
  const handleGoToStage2 = async () => {
    if (isTransitioning) return;

    // Mensaje de confirmación según el estado
    const confirmMsg = allTeamsCompleted
      ? (language === 'es'
          ? '¿Iniciar Etapa 2? Todos los equipos completaron Stage 1.'
          : language === 'pt'
          ? 'Iniciar Etapa 2? Todas as equipes completaram Etapa 1.'
          : 'Start Stage 2? All teams completed Stage 1.')
      : (language === 'es'
          ? '⚠️ No todos los equipos terminaron. ¿Pasar a Etapa 2 de todas formas? Los equipos que no terminaron perderán su progreso.'
          : language === 'pt'
          ? '⚠️ Nem todas as equipes terminaram. Passar para Etapa 2 mesmo assim? As equipes que não terminaram perderão seu progresso.'
          : '⚠️ Not all teams finished. Move to Stage 2 anyway? Teams that haven\'t finished will lose their progress.');

    if (!confirm(confirmMsg)) return;

    setIsTransitioning(true);
    let success = false;

    try {
      console.log('🚀 [1/3] Marcando equipos como completados...');

      // 1. Marcar todos los equipos como stage1Completed
      const updates: Record<string, any> = {};
      teamsIds.forEach(tid => {
        updates[`games/${gameId}/teams/${tid}/stage1Completed`] = true;
      });
      await update(ref(database), updates);

      console.log('🚀 [2/3] Inicializando Stage 2...');

      // 2. Crear estructura de Stage 2 y actualizar status directamente
      await startStage2Safely(gameId);

      console.log('🚀 [3/3] Transición completada');
      success = true;

    } catch (e) {
      console.error('❌ Error en transición:', e);
      alert(language === 'es' 
        ? `Error al iniciar Etapa 2: ${(e as Error).message}`
        : language === 'pt'
        ? `Erro ao iniciar Etapa 2: ${(e as Error).message}`
        : `Error starting Stage 2: ${(e as Error).message}`);
    } finally {
      setIsTransitioning(false);
      if (success) {
        // Redirigir al docente a la vista de Stage 2
        navigate(`/stage2/classroom/${gameId}`);
      }
    }
  };

  // Resetear un equipo específico
  const handleResetTeam = async (teamId: string) => {
    const teamName = teams.find(t => t.id === teamId)?.name || teamId;
    const confirmText = texts.resetConfirm.replace("{team}", teamName);

    if (!confirm(confirmText)) return;

    setResetting(teamId);

    try {
      const team = teams.find((t) => t.id === teamId);
      if (!team) throw new Error("Team not found");

      const updates: any = {};

      updates[`games/${gameId}/teams/${teamId}/currentRound`] = 0;
      updates[`games/${gameId}/teams/${teamId}/currentQuestionIndex`] = 0;
      updates[`games/${gameId}/teams/${teamId}/stage1Completed`] = false;
      updates[`games/${gameId}/teams/${teamId}/stage1Rounds`] = {};

      team.players.forEach((player) => {
        updates[`games/${gameId}/teams/${teamId}/players/${player.id}/score`] = 0;
        updates[`games/${gameId}/teams/${teamId}/players/${player.id}/consecutiveLastPlace`] = 0;
      });

      await update(ref(database), updates);

      console.log(`✅ Team ${teamId} reseteado`);
      alert(texts.resetSuccess.replace("{team}", teamName));
    } catch (e) {
      console.error("Error reseteando equipo:", e);
      alert(texts.resetError);
    } finally {
      setResetting(null);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      {/* Header SIN botón de logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>{texts.title}</h1>
      </div>

      <div
        style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: "#e3f2fd",
          borderRadius: 8,
        }}
      >
        <p
          style={{ margin: 0, fontSize: 16 }}
          dangerouslySetInnerHTML={{ __html: texts.instructions }}
        />
      </div>

      {/* ✅ BOTÓN PARA INICIAR STAGE 2 - Siempre visible con estado claro */}
      <div style={{ 
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          onClick={handleGoToStage2}
          disabled={isTransitioning}
          style={{
            padding: "16px 40px",
            fontSize: 20,
            fontWeight: 700,
            borderRadius: 16,
            border: "none",
            background: allTeamsCompleted 
              ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"  // Verde si todos completaron
              : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", // Naranja si faltan
            color: "white",
            cursor: isTransitioning ? "wait" : "pointer",
            boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 15,
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => !isTransitioning && (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseOut={(e) => !isTransitioning && (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isTransitioning ? (
            <>
              <span style={{ fontSize: 24 }}>⏳</span>
              {language === 'es' ? 'INICIANDO ETAPA 2...' : 
               language === 'pt' ? 'INICIANDO ETAPA 2...' : 
               'STARTING STAGE 2...'}
            </>
          ) : allTeamsCompleted ? (
            <>
              <span style={{ fontSize: 28 }}>🚀</span>
              {language === 'es' ? 'INICIAR ETAPA 2' : 
               language === 'pt' ? 'INICIAR ETAPA 2' : 
               'START STAGE 2'}
            </>
          ) : (
            <>
              <span style={{ fontSize: 24 }}>⚠️</span>
              {language === 'es' ? `PASAR A ETAPA 2 (${completedCount}/${totalTeams})` : 
               language === 'pt' ? `PASSAR PARA ETAPA 2 (${completedCount}/${totalTeams})` : 
               `MOVE TO STAGE 2 (${completedCount}/${totalTeams})`}
            </>
          )}
        </button>
      </div>

      {/* Panel de información cuando todos completaron */}
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
            {texts.completedTitle}
          </h3>
          <p style={{ margin: "0 0 16px 0", color: "#15803d", fontSize: 14 }}>
            {texts.completedSubtitle}
          </p>
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
                <td style={{ padding: 16, fontWeight: 700, fontSize: 16 }}>{team.name}</td>
                <td style={{ padding: 16, textAlign: "center", fontSize: 16 }}>
                  {isCompleted ? "—" : `Ronda ${currentRound + 1}`}
                </td>
                <td style={{ padding: 16, textAlign: "center", fontSize: 16, fontWeight: 700 }}>
                  {totalScore} pts
                </td>
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
          <p style={{ margin: 0, fontSize: 16 }}>{texts.noTeams}</p>
        </div>
      )}
    </div>
  );
}