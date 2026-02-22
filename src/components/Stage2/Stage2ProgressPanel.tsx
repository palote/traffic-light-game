// src/components/Stage2/Stage2ProgressPanel.tsx
// Panel de progreso de equipos para Stage 2 - con internacionalización completa

import { useMemo } from "react";
import type { Game, Team, Stage2Round } from "../../types/game";
import { useI18n } from "../../i18n";

interface Stage2ProgressPanelProps {
  game: Game;
  round: Stage2Round | null;
}

// Mapeo de fases a nombres amigables y colores (ya con soporte de idiomas)
const PHASE_LABELS: Record<string, { es: string; en: string; pt: string; emoji: string; color: string }> = {
  hint: { es: "Pista", en: "Hint", pt: "Dica", emoji: "💡", color: "#FFC107" },
  designated: { es: "Designados", en: "Designated", pt: "Designados", emoji: "👥", color: "#2196F3" },
  question_revealed: { es: "Pregunta", en: "Question", pt: "Pergunta", emoji: "📝", color: "#9C27B0" },
  responding: { es: "Respondiendo", en: "Responding", pt: "Respondendo", emoji: "🎤", color: "#FF5722" },
  rating: { es: "Calificando", en: "Rating", pt: "Avaliando", emoji: "🎨", color: "#4CAF50" },
  rating_reveal: { es: "Colores", en: "Colors", pt: "Cores", emoji: "📊", color: "#00BCD4" },
  justification: { es: "Justificando", en: "Justifying", pt: "Justificando", emoji: "💬", color: "#FF9800" },
  validation_response: { es: "Validar Resp.", en: "Validate Resp.", pt: "Validar Resp.", emoji: "⚖️", color: "#E91E63" },
  validation_ratings: { es: "Validar Calif.", en: "Validate Ratings", pt: "Validar Aval.", emoji: "✅", color: "#673AB7" },
  results: { es: "Resultados", en: "Results", pt: "Resultados", emoji: "🏆", color: "#FFD700" },
};

export function Stage2ProgressPanel({ game, round }: Stage2ProgressPanelProps) {
  const { language } = useI18n();

  // 📦 Textos traducidos (todos los strings visibles)
  const texts = useMemo(() => ({
    // Estados de calificación
    pending: language === 'es' ? '⏳ Pendiente' : 
             language === 'pt' ? '⏳ Pendente' : 
             '⏳ Pending',
    ratedGreen: language === 'es' ? '🟩 Verde' : 
                language === 'pt' ? '🟩 Verde' : 
                '🟩 Green',
    ratedYellow: language === 'es' ? '🟨 Amarillo' : 
                 language === 'pt' ? '🟨 Amarelo' : 
                 '🟨 Yellow',
    ratedRed: language === 'es' ? '🟥 Rojo' : 
              language === 'pt' ? '🟥 Vermelho' : 
              '🟥 Red',
    noRating: language === 'es' ? '⬜ Sin calificar' : 
              language === 'pt' ? '⬜ Sem avaliar' : 
              '⬜ Not rated',
    waiting: language === 'es' ? '⏳ Esperando' : 
             language === 'pt' ? '⏳ Aguardando' : 
             '⏳ Waiting',
    responded: language === 'es' ? '✅ Respondió' : 
               language === 'pt' ? '✅ Respondeu' : 
               '✅ Responded',
    
    // Títulos y etiquetas generales
    progressTitle: language === 'es' ? '📊 Progreso de Equipos' :
                   language === 'pt' ? '📊 Progresso das Equipes' :
                   '📊 Team Progress',
    roundOf: language === 'es' ? 'de' : 
             language === 'pt' ? 'de' : 
             'of',
    ratings: language === 'es' ? 'Calificaciones' :
             language === 'pt' ? 'Avaliações' :
             'Ratings',
    
    // Cabeceras de tabla
    tablePos: language === 'es' ? 'Pos' :
              language === 'pt' ? 'Pos' :
              'Pos',
    tableTeam: language === 'es' ? 'Equipo' :
               language === 'pt' ? 'Equipe' :
               'Team',
    tableRole: 'Rol',
    tableRepresentative: language === 'es' ? 'Representante' :
                          language === 'pt' ? 'Representante' :
                          'Representative',
    tableStatus: language === 'es' ? 'Estado' :
                 language === 'pt' ? 'Estado' :
                 'Status',
    tableScore: language === 'es' ? 'Puntaje' :
                language === 'pt' ? 'Pontuação' :
                'Score',
    
    // Leyenda de colores (usada en la explicación)
    legendCorrect: language === 'es' ? 'Correcto' :
                   language === 'pt' ? 'Correto' :
                   'Correct',
    legendPartial: language === 'es' ? 'Parcial' :
                   language === 'pt' ? 'Parcial' :
                   'Partial',
    legendIncorrect: language === 'es' ? 'Incorrecto' :
                     language === 'pt' ? 'Incorreto' :
                     'Incorrect',
    legendNotRated: language === 'es' ? 'Sin calificar' :
                    language === 'pt' ? 'Sem avaliar' :
                    'Not rated',
    
    // Leyenda de roles (al pie)
    roleResponding: language === 'es' ? 'Equipo que responde' :
                    language === 'pt' ? 'Equipe que responde' :
                    'Responding team',
    roleRating: language === 'es' ? 'Equipos que califican' :
                language === 'pt' ? 'Equipes que avaliam' :
                'Rating teams',
  }), [language]);

  // ✅ Calcular total de rondas
  const totalRounds = useMemo(() => {
    if (!game?.questions) return 0;
    const questions = Object.values(game.questions);
    return questions.filter((q: any) => q.suggestedStage === 2).length;
  }, [game?.questions]);

  const currentRoundNumber = (game.stage2?.currentRound ?? 0) + 1;

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
  const phaseInfo = PHASE_LABELS[currentPhase] ?? { es: currentPhase, en: currentPhase, pt: currentPhase, emoji: "❓", color: "#999" };
  // Seleccionar label según idioma
  const phaseLabel = language === 'es' ? phaseInfo.es : language === 'pt' ? phaseInfo.pt : phaseInfo.en;

  // Obtener info de cada equipo
  const getTeamRoundInfo = (team: Team) => {
    if (!round) return { role: "—", status: "—", rated: false };

    // ¿Es el equipo que responde?
    if (round.respondingTeam?.teamId === team.id) {
      const responding = round.respondingTeam;
      return {
        role: "🎤 " + (language === 'es' ? 'Responde' : language === 'pt' ? 'Responde' : 'Responds'),
        playerName: responding.playerName,
        status: responding.responseGiven ? texts.responded : texts.waiting,
        isResponder: true,
        helpUsed: responding.helpStartedAt !== null,
      };
    }

    // ¿Es un equipo calificador?
    const rater = round.ratingTeams?.[team.id];
    if (rater) {
      const hasRated = !!rater.rating;
      
      let statusText: string;
      if (!hasRated) {
        statusText = texts.pending;
      } else if (rater.rating === "green") {
        statusText = texts.ratedGreen;
      } else if (rater.rating === "yellow") {
        statusText = texts.ratedYellow;
      } else if (rater.rating === "red") {
        statusText = texts.ratedRed;
      } else {
        statusText = texts.noRating;
      }

      return {
        role: "🎨 " + (language === 'es' ? 'Califica' : language === 'pt' ? 'Avalia' : 'Rates'),
        playerName: rater.playerName,
        status: statusText,
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
      rated: raters.filter(r => !!r.rating).length,
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
        flexWrap: "wrap",
        gap: 12,
      }}>
        <h3 style={{ margin: 0, fontSize: 20 }}>
          {texts.progressTitle}
        </h3>
        
        {/* Fase actual + Ronda X de Y */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          {/* Ronda X de Y */}
          <div style={{
            padding: "6px 14px",
            backgroundColor: "#e3f2fd",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 700,
            color: "#1976d2",
          }}>
            {language === 'es' ? 'Ronda' : language === 'pt' ? 'Rodada' : 'Round'} {currentRoundNumber} {texts.roundOf} {totalRounds || '?'}
          </div>
          
          {/* Fase actual */}
          <div style={{
            padding: "6px 12px",
            backgroundColor: phaseInfo.color,
            color: "white",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 700,
          }}>
            {phaseInfo.emoji} {phaseLabel}
          </div>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div style={{
        marginBottom: 16,
        padding: 10,
        backgroundColor: "#f0f9ff",
        borderRadius: 8,
        fontSize: 13,
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        border: "1px solid #bae6fd",
      }}>
        <span>🟩 {texts.legendCorrect}</span>
        <span>🟨 {texts.legendPartial}</span>
        <span>🟥 {texts.legendIncorrect}</span>
        <span>⬜ {texts.legendNotRated}</span>
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
            🎨 {texts.ratings}: <strong>{ratingStats.rated}</strong> {texts.roundOf} <strong>{ratingStats.total}</strong>
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
            <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>{texts.tablePos}</th>
            <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>{texts.tableTeam}</th>
            <th style={{ padding: 12, textAlign: "center", fontSize: 14 }}>{texts.tableRole}</th>
            <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>{texts.tableRepresentative}</th>
            <th style={{ padding: 12, textAlign: "center", fontSize: 14 }}>{texts.tableStatus}</th>
            <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>{texts.tableScore}</th>
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map((team, index) => {
            const info = getTeamRoundInfo(team);
            const isLeader = index === 0 && (team.totalScore ?? 0) > 0;

            // Determinar color de fondo del estado
            const getStatusStyle = () => {
              if (info.status.includes('🟩')) return { bg: '#dcfce7', color: '#166534' };
              if (info.status.includes('🟨')) return { bg: '#fef9c3', color: '#854d0e' };
              if (info.status.includes('🟥')) return { bg: '#fee2e2', color: '#991b1b' };
              if (info.status.includes('✅')) return { bg: '#dcfce7', color: '#166534' };
              if (info.status.includes('⏳')) return { bg: '#fff3e0', color: '#e65100' };
              return { bg: '#f1f5f9', color: '#475569' };
            };
            
            const statusStyle = getStatusStyle();

            return (
              <tr
                key={team.id}
                style={{
                  borderBottom: index < sortedTeams.length - 1 ? "1px solid #eee" : "none",
                  backgroundColor: (info as any).isResponder ? "#fff3e0" : 
                                   (info as any).isRater ? "#e3f2fd" : "white",
                }}
              >
                <td style={{ padding: 12, fontSize: 16, fontWeight: 700 }}>
                  {index + 1}{isLeader && " 👑"}
                </td>
                <td style={{ padding: 12, fontWeight: 700, fontSize: 15 }}>
                  {team.name}
                </td>
                <td style={{ padding: 12, textAlign: "center", fontSize: 14 }}>
                  {info.role}
                </td>
                <td style={{ padding: 12, fontSize: 14 }}>
                  {(info as any).playerName ?? "—"}
                </td>
                <td style={{ padding: 12, textAlign: "center" }}>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                  }}>
                    {info.status}
                  </span>
                </td>
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

      {/* Leyenda de roles */}
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
        <span><span style={{ backgroundColor: "#fff3e0", padding: "2px 6px", borderRadius: 4 }}>🎤</span> = {texts.roleResponding}</span>
        <span><span style={{ backgroundColor: "#e3f2fd", padding: "2px 6px", borderRadius: 4 }}>🎨</span> = {texts.roleRating}</span>
      </div>
    </div>
  );
}