// src/components/Stage1/Stage1ClassroomView.tsx
// ✅ v3: + Help request + Pause request con reveal de nombre

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, update } from "firebase/database";
import { database } from "../../firebase.config";
import type { Game, Team } from "../../types/game";
import { useI18n } from "../../i18n";
import { startStage2Safely } from "../../services/gameRepository";
import { ReconnectBadge } from "../ReconnectBadge";

interface Stage1ClassroomViewProps {
  game: Game;
  gameId: string;
}

export function Stage1ClassroomView({ game, gameId }: Stage1ClassroomViewProps) {
  const [resetting, setResetting] = useState<string | null>(null);
  const [pausingTeam, setPausingTeam] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Controla qué equipos tienen el detalle del jugador revelado
  const [revealedTeams, setRevealedTeams] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { language } = useI18n();

  const texts = {
    es: {
      title: "📊 ETAPA 1 - Vista del Aula",
      instructions: "💡 <strong>Vista del profesor:</strong> Monitoreo del progreso de todos los equipos en Etapa 1",
      completedTitle: "🎉 ¡Listo para Etapa 2!",
      completedSubtitle: "Cuando estés listo, presiona el botón para iniciar la Etapa 2",
      forceStage2Confirm: "¿Pasar TODOS los equipos a Etapa 2? Los equipos que no terminaron perderán su progreso.",
      resetConfirm: "¿Resetear {team} a ronda 1? Perderá todo su progreso.",
      resetSuccess: "✅ Equipo {team} reseteado",
      resetError: "Error al resetear el equipo",
      tableHeaders: { team: "Equipo", currentRound: "Ronda Actual", totalScore: "Puntaje Total", status: "Estado", actions: "Acciones" },
      statuses: { completed: "✅ Completado", inProgress: "🏃 En progreso", paused: "⏸️ Pausado" },
      resetButton: { resetting: "⏳ Reseteando...", reset: "🔄 Resetear" },
      mainButton: { starting: "INICIANDO ETAPA 2...", startAllCompleted: "INICIAR ETAPA 2", startIncomplete: "PASAR A ETAPA 2 ({completed}/{total})" },
      mainButtonAria: {
        transitioning: "Iniciando Etapa 2, espere",
        allCompleted: "Iniciar Etapa 2 (todos los equipos han completado Stage 1)",
        incomplete: "Pasar a Etapa 2 de todas formas ({completed} de {total} equipos completaron)",
      },
      resetButtonAria: { resetting: "Reseteando equipo {team}", reset: "Resetear el progreso del equipo {team} a la ronda 1" },
      noTeams: "⚠️ No hay equipos creados todavía",
      confirmIncomplete: "⚠️ No todos los equipos terminaron. ¿Pasar a Etapa 2 de todas formas?",
      pause: {
        pauseButton: "⏸️ Pausar equipo",
        resumeButton: "▶️ Reanudar equipo",
        pausing: "⏳ Pausando...",
        resuming: "⏳ Reanudando...",
      },
      notifications: {
        helpTitle: "❓ Pedido de ayuda",
        interventionTitle: "🚨 Solicitud de intervención",
        interventionDetail: "{player} lleva {rounds} rondas en último lugar",
        revealDetail: "👁️ Ver detalle",
        hideDetail: "🙈 Ocultar",
        dismiss: "✕",
        pauseFromHere: "⏸️ Pausar ahora",
        dismissAria: "Descartar notificación del equipo {team}",
      },
    },
    en: {
      title: "📊 STAGE 1 - Classroom View",
      instructions: "💡 <strong>Teacher view:</strong> Monitoring progress of all teams in Stage 1",
      completedTitle: "🎉 Ready for Stage 2!",
      completedSubtitle: "When ready, press the button to start Stage 2",
      forceStage2Confirm: "Move ALL teams to Stage 2? Teams that haven't finished will lose progress.",
      resetConfirm: "Reset {team} to round 1? Will lose all progress.",
      resetSuccess: "✅ Team {team} reset",
      resetError: "Error resetting team",
      tableHeaders: { team: "Team", currentRound: "Current Round", totalScore: "Total Score", status: "Status", actions: "Actions" },
      statuses: { completed: "✅ Completed", inProgress: "🏃 In progress", paused: "⏸️ Paused" },
      resetButton: { resetting: "⏳ Resetting...", reset: "🔄 Reset" },
      mainButton: { starting: "STARTING STAGE 2...", startAllCompleted: "START STAGE 2", startIncomplete: "MOVE TO STAGE 2 ({completed}/{total})" },
      mainButtonAria: {
        transitioning: "Starting Stage 2, please wait",
        allCompleted: "Start Stage 2 (all teams have completed Stage 1)",
        incomplete: "Move to Stage 2 anyway ({completed} of {total} teams completed)",
      },
      resetButtonAria: { resetting: "Resetting team {team}", reset: "Reset team {team}'s progress to round 1" },
      noTeams: "⚠️ No teams created yet",
      confirmIncomplete: "⚠️ Not all teams finished. Move to Stage 2 anyway?",
      pause: {
        pauseButton: "⏸️ Pause team",
        resumeButton: "▶️ Resume team",
        pausing: "⏳ Pausing...",
        resuming: "⏳ Resuming...",
      },
      notifications: {
        helpTitle: "❓ Help request",
        interventionTitle: "🚨 Intervention request",
        interventionDetail: "{player} has been in last place for {rounds} rounds",
        revealDetail: "👁️ View detail",
        hideDetail: "🙈 Hide",
        dismiss: "✕",
        pauseFromHere: "⏸️ Pause now",
        dismissAria: "Dismiss notification for team {team}",
      },
    },
    pt: {
      title: "📊 ETAPA 1 - Visão da Sala de Aula",
      instructions: "💡 <strong>Visão do professor:</strong> Monitoramento do progresso de todas as equipes na Etapa 1",
      completedTitle: "🎉 Pronto para Etapa 2!",
      completedSubtitle: "Quando estiver pronto, pressione o botão para iniciar a Etapa 2",
      forceStage2Confirm: "Passar TODAS as equipes para Etapa 2? As equipes que não terminaram perderão seu progresso.",
      resetConfirm: "Resetar {team} para rodada 1? Perderá todo o progresso.",
      resetSuccess: "✅ Equipe {team} resetada",
      resetError: "Erro ao resetar a equipe",
      tableHeaders: { team: "Equipe", currentRound: "Rodada Atual", totalScore: "Pontuação Total", status: "Estado", actions: "Ações" },
      statuses: { completed: "✅ Completado", inProgress: "🏃 Em progresso", paused: "⏸️ Pausado" },
      resetButton: { resetting: "⏳ Resetando...", reset: "🔄 Resetar" },
      mainButton: { starting: "INICIANDO ETAPA 2...", startAllCompleted: "INICIAR ETAPA 2", startIncomplete: "PASSAR PARA ETAPA 2 ({completed}/{total})" },
      mainButtonAria: {
        transitioning: "Iniciando Etapa 2, aguarde",
        allCompleted: "Iniciar Etapa 2 (todas as equipes completaram a Etapa 1)",
        incomplete: "Passar para Etapa 2 mesmo assim ({completed} de {total} equipes completaram)",
      },
      resetButtonAria: { resetting: "Resetando equipe {team}", reset: "Resetar o progresso da equipe {team} para a rodada 1" },
      noTeams: "⚠️ Nenhuma equipe criada ainda",
      confirmIncomplete: "⚠️ Nem todas as equipes terminaram. Passar para Etapa 2 mesmo assim?",
      pause: {
        pauseButton: "⏸️ Pausar equipe",
        resumeButton: "▶️ Retomar equipe",
        pausing: "⏳ Pausando...",
        resuming: "⏳ Retomando...",
      },
      notifications: {
        helpTitle: "❓ Pedido de ajuda",
        interventionTitle: "🚨 Solicitação de intervenção",
        interventionDetail: "{player} está em último lugar há {rounds} rodadas",
        revealDetail: "👁️ Ver detalhe",
        hideDetail: "🙈 Ocultar",
        dismiss: "✕",
        pauseFromHere: "⏸️ Pausar agora",
        dismissAria: "Descartar notificação da equipe {team}",
      },
    },
  };

  const t = texts[language as keyof typeof texts] || texts.es;

  // Normalizar equipos
  const teams: Team[] = (() => {
    const raw = (game as any).teams;
    if (!raw) return [];
    if (!Array.isArray(raw) && typeof raw === 'object') {
      return Object.entries(raw)
        .filter(([, val]) => val && typeof val === 'object')
        .map(([key, val]: [string, any]) => ({ ...val, id: val.id || key }));
    }
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.filter((t: any) => !!t && typeof t === "object");
  })();

  const teamsIds = Object.keys(game.teams || {});
  const completedCount = teamsIds.filter(tid => (game.teams as any)?.[tid]?.stage1Completed === true).length;
  const totalTeams = teamsIds.length;
  const allTeamsCompleted = totalTeams > 0 && completedCount === totalTeams;

  // ============================
  // Pause / Resume
  // ============================
  const handleTogglePause = async (teamId: string, currentlyPaused: boolean) => {
    setPausingTeam(teamId);
    try {
      await update(ref(database), {
        [`games/${gameId}/teams/${teamId}/isPaused`]: !currentlyPaused,
      });
    } catch (e) {
      console.error("Error toggling pause:", e);
    } finally {
      setPausingTeam(null);
    }
  };

  // ============================
  // Dismiss notification (help o pause request)
  // ============================
  const handleDismissNotification = async (teamId: string, type: 'helpRequest' | 'pauseRequest') => {
    try {
      await update(ref(database), {
        [`games/${gameId}/teams/${teamId}/${type}`]: null,
      });
      // Si era pauseRequest, también limpiar el reveal
      if (type === 'pauseRequest') {
        setRevealedTeams(prev => {
          const next = new Set(prev);
          next.delete(teamId);
          return next;
        });
      }
    } catch (e) {
      console.error("Error dismissing notification:", e);
    }
  };

  // ============================
  // Toggle reveal de nombre
  // ============================
  const toggleReveal = (teamId: string) => {
    setRevealedTeams(prev => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  // ============================
  // Transition to Stage 2
  // ============================
  const handleGoToStage2 = async () => {
    if (isTransitioning) return;
    const confirmMsg = allTeamsCompleted ? t.forceStage2Confirm : t.confirmIncomplete;
    if (!confirm(confirmMsg)) return;
    setIsTransitioning(true);
    let success = false;
    try {
      const updates: Record<string, any> = {};
      teamsIds.forEach(tid => {
        updates[`games/${gameId}/teams/${tid}/stage1Completed`] = true;
        updates[`games/${gameId}/teams/${tid}/isPaused`] = false;
        updates[`games/${gameId}/teams/${tid}/helpRequest`] = null;
        updates[`games/${gameId}/teams/${tid}/pauseRequest`] = null;
      });
      await update(ref(database), updates);
      await startStage2Safely(gameId);
      success = true;
    } catch (e) {
      console.error('❌ Error en transición:', e);
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setIsTransitioning(false);
      if (success) navigate(`/stage2/classroom/${gameId}`);
    }
  };

  // ============================
  // Reset team
  // ============================
  const handleResetTeam = async (teamId: string) => {
    const teamName = teams.find(t => t.id === teamId)?.name || teamId;
    if (!confirm(t.resetConfirm.replace("{team}", teamName))) return;
    setResetting(teamId);
    try {
      const team = teams.find((t) => t.id === teamId);
      if (!team) throw new Error("Team not found");
      const updates: any = {};
      updates[`games/${gameId}/teams/${teamId}/currentRound`] = 0;
      updates[`games/${gameId}/teams/${teamId}/currentQuestionIndex`] = 0;
      updates[`games/${gameId}/teams/${teamId}/stage1Completed`] = false;
      updates[`games/${gameId}/teams/${teamId}/stage1Rounds`] = null;
      updates[`games/${gameId}/teams/${teamId}/totalScore`] = 0;
      updates[`games/${gameId}/teams/${teamId}/isPaused`] = false;
      updates[`games/${gameId}/teams/${teamId}/helpRequest`] = null;
      updates[`games/${gameId}/teams/${teamId}/pauseRequest`] = null;

      // ✅ DESPUÉS — usa índice o id según cómo estén almacenados
      const playersRaw = team.players;
      if (Array.isArray(playersRaw)) {
        playersRaw.forEach((player: any, idx: number) => {
          if (player?.id) {
            updates[`games/${gameId}/teams/${teamId}/players/${idx}/score`] = 0;
            updates[`games/${gameId}/teams/${teamId}/players/${idx}/consecutiveLastPlace`] = 0;
          }
        });
      } else if (playersRaw && typeof playersRaw === "object") {
        Object.entries(playersRaw).forEach(([key, player]: [string, any]) => {
          if (player?.id) {
            updates[`games/${gameId}/teams/${teamId}/players/${key}/score`] = 0;
            updates[`games/${gameId}/teams/${teamId}/players/${key}/consecutiveLastPlace`] = 0;
          }
        });
      }

      await update(ref(database), updates);
      const stage1Questions = Object.values(game.questions || {})
        .filter((q: any) => q.suggestedStage === 1)
        .sort((a: any, b: any) => {
          const na = Number(String((a as any)?.id || "").replace(/\D+/g, "")) || 0;
          const nb = Number(String((b as any)?.id || "").replace(/\D+/g, "")) || 0;
          return na - nb;
        });
      // ✅ REEMPLAZADO: ahora crea la ronda con todos los campos necesarios
      if (stage1Questions.length > 0) {
        const firstQuestion = stage1Questions[0] as any;

        // Reconstruir jugadores con score reseteado a 0
        const playersArray: any[] = Array.isArray(team.players)
          ? team.players
          : Object.values(team.players || {});

        const resetPlayers = playersArray
          .filter((p: any) => p?.id)
          .map((p: any) => ({ ...p, score: 0, consecutiveLastPlace: 0 }));

        // Respondedor: primero de la lista (todos en 0, tomar índice 0)
        const sorted = [...resetPlayers].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
        const responder = sorted[0];

        // Capitán: siguiente al respondedor
        let captainIndex = 1 % resetPlayers.length;
        let captain = resetPlayers[captainIndex];
        if (captain?.id === responder?.id) {
          captainIndex = (captainIndex + 1) % resetPlayers.length;
          captain = resetPlayers[captainIndex];
        }

        await update(ref(database), {
          [`games/${gameId}/teams/${teamId}/stage1Rounds/0`]: {
            roundNumber: 0,
            questionId: firstQuestion.id,
            respondingPlayerId: responder?.id ?? "",
            respondingPlayerName: responder?.name ?? "",
            captainId: captain?.id ?? "",
            captainName: captain?.name ?? "",
            ratings: {},
            pointsAwarded: {},
            hasResponded: false,
            timestamp: Date.now(),
          },
        });
      }
      alert(t.resetSuccess.replace("{team}", teamName));
    } catch (e) {
      console.error("Error reseteando equipo:", e);
      alert(t.resetError);
    } finally {
      setResetting(null);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{t.title}</h1>
      </div>

      <div style={{ marginBottom: 24, padding: 16, backgroundColor: "#e3f2fd", borderRadius: 8 }}>
        <p style={{ margin: 0, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: t.instructions }} />
      </div>

      {/* Botón Stage 2 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleGoToStage2}
          disabled={isTransitioning}
          style={{
            padding: "16px 40px", fontSize: 20, fontWeight: 700, borderRadius: 16, border: "none",
            background: allTeamsCompleted
              ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
              : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white", cursor: isTransitioning ? "wait" : "pointer",
            boxShadow: "0 8px 25px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 15, transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => !isTransitioning && (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseOut={(e) => !isTransitioning && (e.currentTarget.style.transform = 'scale(1)')}
          aria-label={
            isTransitioning ? t.mainButtonAria.transitioning
              : allTeamsCompleted ? t.mainButtonAria.allCompleted
              : t.mainButtonAria.incomplete.replace("{completed}", String(completedCount)).replace("{total}", String(totalTeams))
          }
        >
          {isTransitioning ? (
            <><span style={{ fontSize: 24 }}>⏳</span>{t.mainButton.starting}</>
          ) : allTeamsCompleted ? (
            <><span style={{ fontSize: 28 }}>🚀</span>{t.mainButton.startAllCompleted}</>
          ) : (
            <><span style={{ fontSize: 24 }}>⚠️</span>{t.mainButton.startIncomplete
              .replace("{completed}", String(completedCount)).replace("{total}", String(totalTeams))}</>
          )}
        </button>
      </div>

      {allTeamsCompleted && (
        <div style={{ marginBottom: 24, padding: 24, backgroundColor: "#f0fdf4", borderRadius: 12, border: "2px solid #22c55e", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#16a34a", fontSize: 20 }}>{t.completedTitle}</h3>
          <p style={{ margin: "0 0 16px 0", color: "#15803d", fontSize: 14 }}>{t.completedSubtitle}</p>
        </div>
      )}

      {/* Tabla */}
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderRadius: 8, overflow: "hidden" }}>
        <thead>
          <tr style={{ backgroundColor: "#1e293b", color: "white" }}>
            <th style={{ padding: 16, textAlign: "left", fontSize: 16 }}>{t.tableHeaders.team}</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>{t.tableHeaders.currentRound}</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>{t.tableHeaders.totalScore}</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>{t.tableHeaders.status}</th>
            <th style={{ padding: 16, textAlign: "center", fontSize: 16 }}>{t.tableHeaders.actions}</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const teamData = (game.teams as any)?.[team.id];
            const currentRound = teamData?.currentRound ?? 0;
            const isCompleted = teamData?.stage1Completed === true;
            const isPaused = teamData?.isPaused === true;
            const isPausingThis = pausingTeam === team.id;
            const helpRequest = teamData?.helpRequest ?? null;
            const pauseRequest = teamData?.pauseRequest ?? null;
            const isRevealed = revealedTeams.has(team.id);

            const players = Array.isArray(team.players)
              ? team.players
              : team.players && typeof team.players === "object"
                ? Object.values(team.players) : [];
            const totalScore = players.reduce((sum: number, p: any) => sum + (p.score ?? 0), 0);
            const hasNotification = (helpRequest || pauseRequest) && !isCompleted;

            return (
              <tr
                key={team.id}
                style={{
                  borderBottom: index < teams.length - 1 ? "1px solid #eee" : "none",
                  backgroundColor: hasNotification
                    ? "#fff8e1"
                    : isPaused ? "#fef2f2"
                    : isCompleted ? "#f1f8e9"
                    : "white",
                }}
              >
                {/* Nombre + notificaciones */}
                <td style={{ padding: 16, fontWeight: 700, fontSize: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span>{team.name}</span>

                    {/* ✅ Notificación: pedido de ayuda */}
                    {helpRequest && !isCompleted && (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", backgroundColor: "#dbeafe",
                        border: "1px solid #3b82f6", borderRadius: 8, gap: 8,
                      }}
                        role="alert" aria-live="polite"
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
                          {t.notifications.helpTitle}
                        </span>
                        <button
                          onClick={() => handleDismissNotification(team.id, 'helpRequest')}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#1d4ed8", fontWeight: 700, fontSize: 14, padding: "0 4px",
                          }}
                          aria-label={t.notifications.dismissAria.replace("{team}", team.name)}
                        >
                          {t.notifications.dismiss}
                        </button>
                      </div>
                    )}

                    {/* ✅ Notificación: solicitud de intervención */}
                    {pauseRequest && !isCompleted && (
                      <div style={{
                        display: "flex", flexDirection: "column", gap: 6,
                        padding: "8px 12px", backgroundColor: "#fef3c7",
                        border: "1px solid #f59e0b", borderRadius: 8,
                      }}
                        role="alert" aria-live="polite"
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                            {t.notifications.interventionTitle}
                          </span>
                          <button
                            onClick={() => handleDismissNotification(team.id, 'pauseRequest')}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#92400e", fontWeight: 700, fontSize: 14, padding: "0 4px",
                            }}
                            aria-label={t.notifications.dismissAria.replace("{team}", team.name)}
                          >
                            {t.notifications.dismiss}
                          </button>
                        </div>

                        {/* Detalle oculto por defecto */}
                        {isRevealed && (
                          <div style={{ fontSize: 13, color: "#78350f", fontWeight: 600 }}>
                            {t.notifications.interventionDetail
                              .replace("{player}", pauseRequest.playerName ?? "")
                              .replace("{rounds}", String(pauseRequest.playerRounds ?? ""))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            onClick={() => toggleReveal(team.id)}
                            style={{
                              padding: "4px 10px", fontSize: 12, fontWeight: 600,
                              backgroundColor: isRevealed ? "#fde68a" : "#fffbeb",
                              color: "#92400e", border: "1px solid #f59e0b",
                              borderRadius: 6, cursor: "pointer",
                            }}
                          >
                            {isRevealed ? t.notifications.hideDetail : t.notifications.revealDetail}
                          </button>
                          {!isPaused && (
                            <button
                              onClick={() => handleTogglePause(team.id, false)}
                              style={{
                                padding: "4px 10px", fontSize: 12, fontWeight: 600,
                                backgroundColor: "#dc2626", color: "white",
                                border: "none", borderRadius: 6, cursor: "pointer",
                              }}
                            >
                              {t.notifications.pauseFromHere}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                <td style={{ padding: 16, textAlign: "center", fontSize: 16 }}>
                  {isCompleted ? "—" : `${language === 'es' ? 'Ronda' : language === 'pt' ? 'Rodada' : 'Round'} ${currentRound + 1}`}
                </td>
                <td style={{ padding: 16, textAlign: "center", fontSize: 16, fontWeight: 700 }}>
                  {totalScore} pts
                </td>
                <td style={{ padding: 16, textAlign: "center" }}>
                  {isCompleted ? (
                    <span style={{ padding: "6px 12px", backgroundColor: "#16a34a", color: "white", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>
                      {t.statuses.completed}
                    </span>
                  ) : isPaused ? (
                    <span style={{ padding: "6px 12px", backgroundColor: "#dc2626", color: "white", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>
                      {t.statuses.paused}
                    </span>
                  ) : (
                    <span style={{ padding: "6px 12px", backgroundColor: "#4f46e5", color: "white", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>
                      {t.statuses.inProgress}
                    </span>
                  )}
                </td>
                <td style={{ padding: 16, textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                    {!isCompleted && (
                      <button
                        onClick={() => handleTogglePause(team.id, isPaused)}
                        disabled={isPausingThis}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: isPausingThis ? "#cbd5e1" : isPaused ? "#16a34a" : "#dc2626",
                          color: "white", border: "none", borderRadius: 6,
                          cursor: isPausingThis ? "not-allowed" : "pointer",
                          fontSize: 14, fontWeight: 700, minWidth: 140,
                        }}
                      >
                        {isPausingThis
                          ? (isPaused ? t.pause.resuming : t.pause.pausing)
                          : isPaused ? t.pause.resumeButton : t.pause.pauseButton}
                      </button>
                    )}
                    <button
                      onClick={() => handleResetTeam(team.id)}
                      disabled={resetting === team.id}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: resetting === team.id ? "#cbd5e1" : "#d97706",
                        color: "white", border: "none", borderRadius: 6,
                        cursor: resetting === team.id ? "not-allowed" : "pointer",
                        fontSize: 14, fontWeight: 700, minWidth: 140,
                      }}
                      aria-label={
                        resetting === team.id
                          ? t.resetButtonAria.resetting.replace("{team}", team.name)
                          : t.resetButtonAria.reset.replace("{team}", team.name)
                      }
                    >
                      {resetting === team.id ? t.resetButton.resetting : t.resetButton.reset}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {teams.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", backgroundColor: "#fff3cd", borderRadius: 8, marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 16 }}>{t.noTeams}</p>
        </div>
      )}

      <ReconnectBadge gameId={gameId} roomCode={game.roomCode} />
    </div>
  );
}