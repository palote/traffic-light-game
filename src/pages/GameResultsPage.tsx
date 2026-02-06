// src/pages/GameResultsPage.tsx
// 📊 Página de resultados del juego para el docente
// ✅ ACTUALIZADO: Vista por alumno + Exportar Excel

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../firebase.config";
import { useI18n } from "../i18n";

interface Team {
  id: string;
  name: string;
  emoji?: string;
  totalScore?: number;
  players?: Record<string, { id: string; name: string }> | Array<{ id: string; name: string }>;
}

interface Question {
  id: string;
  text: string;
  hint?: string;
}

interface RatingTeamData {
  teamId: string;
  teamName: string;
  playerId: string;
  playerName: string;
  rating: "green" | "yellow" | "red" | null;
  validated?: boolean;
  ratedAt?: number;
}

interface Round {
  questionId: string;
  phase: string;
  respondingTeam?: {
    teamId: string;
    playerId: string;
    playerName: string;
    helpRequested?: boolean;
    responseGiven?: boolean;
  };
  ratingTeams?: Record<string, RatingTeamData>;
  pointsAwarded?: Record<string, number>;
  responseValidated?: "correct" | "incorrect" | null;
}

interface SelfEvaluation {
  id: string;
  studentName: string;
  teamName: string;
  teamId: string;
  receivedHelp: Array<{ concept: string; fromWho: string[]; description: string }>;
  gaveHelp: Array<{ concept: string; toWho: string[]; description: string }>;
  submittedAt: number;
}

interface StudentPerformance {
  studentName: string;
  playerId: string;
  teamId: string;
  teamName: string;
  teamEmoji?: string;
  respondedCount: number;
  respondedWithHelp: number;
  respondedCorrect: number;
  respondedIncorrect: number;
  respondedQuestions: Array<{
    questionText: string;
    helpRequested: boolean;
    responseValidated: "correct" | "incorrect" | null;
    roundNumber: number;
  }>;
  ratedCount: number;
  greenRatings: number;
  yellowRatings: number;
  redRatings: number;
  ratingsAccepted: number;
  ratingsRejected: number;
  ratingDetails: Array<{
    rating: "green" | "yellow" | "red";
    validated?: boolean;
    roundNumber: number;
  }>;
  selfEvaluation?: SelfEvaluation;
}

interface GameData {
  config?: {
    className?: string;
    gameName?: string;
    subject?: string;
  };
  teams?: Record<string, Team>;
  questions?: Record<string, Question>;
  stage2?: {
    rounds?: Round[];
    currentRound?: number;
    completed?: boolean;
  };
  selfEvaluationActive?: boolean;
}

interface GameData {
  config?: {
    className?: string;
    gameName?: string;
    subject?: string;
  };
  teams?: Record<string, Team>;
  questions?: Record<string, Question>;
  stage2?: {
    rounds?: Round[];
    currentRound?: number;
    completed?: boolean;
  };
  selfEvaluationActive?: boolean;
}

export function GameResultsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useI18n();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameData | null>(null);
  const [selfEvaluations, setSelfEvaluations] = useState<SelfEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<"podium" | "alumnos" | "autoevaluaciones">("podium");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  // Detectar tab inicial desde URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "autoevaluaciones") {
      setActiveTab("autoevaluaciones");
    } else if (tab === "alumnos") {
      setActiveTab("alumnos");
    }
  }, [searchParams]);

  const texts = {
    es: {
      title: "Resultados del Juego",
      backToDashboard: "← Volver al Dashboard",
      tabs: {
        podium: "🏆 Podio",
        alumnos: "👤 Por Alumno",
        autoevaluaciones: "📝 Autoevaluaciones",
      },
      podium: {
        champion: "CAMPEÓN",
        points: "puntos",
        otherTeams: "Otros equipos",
      },
      alumnos: {
        title: "Desempeño Individual",
        filterAll: "Todos los equipos",
        exportExcel: "📥 Exportar Excel",
        student: "Alumno",
        team: "Equipo",
        responded: "Respondió",
        rated: "Calificó",
        times: "veces",
        withHelp: "con ayuda",
        correct: "correctas",
        ratings: "Calificaciones",
        accepted: "aceptadas",
        rejected: "rechazadas",
        question: "Pregunta",
        help: "Ayuda",
        result: "Resultado",
        yes: "Sí",
        no: "No",
        noData: "No hay datos de Stage 2",
        expandDetails: "Ver detalles",
        collapseDetails: "Ocultar detalles",
      },
      selfEval: {
        title: "Autoevaluaciones",
        noEvaluations: "No hay autoevaluaciones todavía",
        student: "Estudiante",
        team: "Equipo",
        receivedHelp: "Ayuda recibida",
        gaveHelp: "Ayuda dada",
        concept: "Concepto",
        fromWho: "De quién",
        toWho: "A quién",
        description: "Descripción",
        submittedAt: "Enviado",
        activateSelfEval: "La autoevaluación no está activa.",
      },
      loading: "Cargando...",
      gameNotFound: "Juego no encontrado",
    },
    en: {
      title: "Game Results",
      backToDashboard: "← Back to Dashboard",
      tabs: {
        podium: "🏆 Podium",
        alumnos: "👤 By Student",
        autoevaluaciones: "📝 Self-Evaluations",
      },
      podium: {
        champion: "CHAMPION",
        points: "points",
        otherTeams: "Other teams",
      },
      alumnos: {
        title: "Individual Performance",
        filterAll: "All teams",
        exportExcel: "📥 Export Excel",
        student: "Student",
        team: "Team",
        responded: "Responded",
        rated: "Rated",
        times: "times",
        withHelp: "with help",
        correct: "correct",
        ratings: "Ratings",
        accepted: "accepted",
        rejected: "rejected",
        question: "Question",
        help: "Help",
        result: "Result",
        yes: "Yes",
        no: "No",
        noData: "No Stage 2 data",
        expandDetails: "View details",
        collapseDetails: "Hide details",
      },
      selfEval: {
        title: "Self-Evaluations",
        noEvaluations: "No self-evaluations yet",
        student: "Student",
        team: "Team",
        receivedHelp: "Help received",
        gaveHelp: "Help given",
        concept: "Concept",
        fromWho: "From who",
        toWho: "To who",
        description: "Description",
        submittedAt: "Submitted",
        activateSelfEval: "Self-evaluation is not active.",
      },
      loading: "Loading...",
      gameNotFound: "Game not found",
    },
    pt: {
      title: "Resultados do Jogo",
      backToDashboard: "← Voltar ao Dashboard",
      tabs: {
        podium: "🏆 Pódio",
        alumnos: "👤 Por Aluno",
        autoevaluaciones: "📝 Autoavaliações",
      },
      podium: {
        champion: "CAMPEÃO",
        points: "pontos",
        otherTeams: "Outras equipes",
      },
      alumnos: {
        title: "Desempenho Individual",
        filterAll: "Todas as equipes",
        exportExcel: "📥 Exportar Excel",
        student: "Aluno",
        team: "Equipe",
        responded: "Respondeu",
        rated: "Avaliou",
        times: "vezes",
        withHelp: "com ajuda",
        correct: "corretas",
        ratings: "Avaliações",
        accepted: "aceitas",
        rejected: "rejeitadas",
        question: "Pergunta",
        help: "Ajuda",
        result: "Resultado",
        yes: "Sim",
        no: "Não",
        noData: "Sem dados do Stage 2",
        expandDetails: "Ver detalhes",
        collapseDetails: "Ocultar detalhes",
      },
      selfEval: {
        title: "Autoavaliações",
        noEvaluations: "Ainda não há autoavaliações",
        student: "Estudante",
        team: "Equipe",
        receivedHelp: "Ajuda recebida",
        gaveHelp: "Ajuda dada",
        concept: "Conceito",
        fromWho: "De quem",
        toWho: "Para quem",
        description: "Descrição",
        submittedAt: "Enviado",
        activateSelfEval: "A autoavaliação não está ativa.",
      },
      loading: "Carregando...",
      gameNotFound: "Jogo não encontrado",
    },
  };

  const t = texts[language] || texts.es;

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      if (!gameId) {
        setLoading(false);
        return;
      }

      try {
        const [gameSnap, selfEvalSnap] = await Promise.all([
          get(ref(database, `games/${gameId}`)),
          get(ref(database, `selfEvaluations/${gameId}`)),
        ]);

        if (gameSnap.exists()) {
          setGame(gameSnap.val());
        }

        if (selfEvalSnap.exists()) {
          const data = selfEvalSnap.val();
          const evals: SelfEvaluation[] = Object.entries(data).map(([id, val]: [string, any]) => ({
            id,
            ...val,
          }));
          evals.sort((a, b) => b.submittedAt - a.submittedAt);
          setSelfEvaluations(evals);
        }
      } catch (error) {
        console.error("Error loading game results:", error);
      }

      setLoading(false);
    }

    loadData();
  }, [gameId]);

  // Calcular equipos ordenados
  const sortedTeams = useMemo(() => {
    if (!game?.teams) return [];
    return Object.entries(game.teams)
      .map(([id, team]) => ({ id, ...team }))
      .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  }, [game]);

  // Calcular desempeño por alumno
  const studentPerformances = useMemo((): StudentPerformance[] => {
    if (!game?.stage2?.rounds || !game?.teams) return [];

    const rounds = Array.isArray(game.stage2.rounds)
      ? game.stage2.rounds
      : Object.values(game.stage2.rounds);

    const questions = game.questions || {};
    const performances: Record<string, StudentPerformance> = {};

    // Inicializar todos los jugadores de todos los equipos
    for (const [teamId, team] of Object.entries(game.teams)) {
      const players = team.players;
      if (!players) continue;

      const playerList = Array.isArray(players) ? players : Object.values(players);

      for (const player of playerList) {
        if (!player?.id || !player?.name) continue;

        const key = `${teamId}-${player.id}`;
        performances[key] = {
          studentName: player.name,
          playerId: player.id,
          teamId,
          teamName: team.name || teamId,
          teamEmoji: team.emoji,
          respondedCount: 0,
          respondedWithHelp: 0,
          respondedCorrect: 0,
          respondedIncorrect: 0,
          respondedQuestions: [],
          ratedCount: 0,
          greenRatings: 0,
          yellowRatings: 0,
          redRatings: 0,
          ratingsAccepted: 0,
          ratingsRejected: 0,
          ratingDetails: [],
          selfEvaluation: undefined,
        };
      }
    }

    // Analizar cada ronda
    rounds.forEach((round: Round, roundIndex: number) => {
      if (!round) return;

      // Equipo que respondió
      if (round.respondingTeam) {
        const rt = round.respondingTeam;
        const key = `${rt.teamId}-${rt.playerId}`;

        if (performances[key]) {
          performances[key].respondedCount++;

          if (rt.helpRequested) {
            performances[key].respondedWithHelp++;
          }

          const questionText = questions[round.questionId]?.text || round.questionId;
          const validated = round.responseValidated;

          if (validated === "correct") {
            performances[key].respondedCorrect++;
          } else if (validated === "incorrect") {
            performances[key].respondedIncorrect++;
          }

          performances[key].respondedQuestions.push({
            questionText,
            helpRequested: rt.helpRequested || false,
            responseValidated: validated || null,
            roundNumber: roundIndex,
          });
        }
      }

      // Equipos que calificaron
      if (round.ratingTeams) {
        for (const [teamId, ratingData] of Object.entries(round.ratingTeams)) {
          const key = `${teamId}-${ratingData.playerId}`;

          if (performances[key] && ratingData.rating) {
            performances[key].ratedCount++;

            if (ratingData.rating === "green") {
              performances[key].greenRatings++;
            } else if (ratingData.rating === "yellow") {
              performances[key].yellowRatings++;
            } else if (ratingData.rating === "red") {
              performances[key].redRatings++;
            }

            if (ratingData.validated === true) {
              performances[key].ratingsAccepted++;
            } else if (ratingData.validated === false) {
              performances[key].ratingsRejected++;
            }

            performances[key].ratingDetails.push({
              rating: ratingData.rating,
              validated: ratingData.validated,
              roundNumber: roundIndex,
            });
          }
        }
      }
    });

    // Vincular autoevaluaciones
    for (const selfEval of selfEvaluations) {
      // Buscar por nombre del estudiante y equipo
      for (const perf of Object.values(performances)) {
        if (
          perf.studentName.toLowerCase() === selfEval.studentName.toLowerCase() &&
          perf.teamId === selfEval.teamId
        ) {
          perf.selfEvaluation = selfEval;
          break;
        }
      }
    }

    return Object.values(performances).sort((a, b) => {
      // Ordenar por equipo, luego por nombre
      if (a.teamName !== b.teamName) {
        return a.teamName.localeCompare(b.teamName);
      }
      return a.studentName.localeCompare(b.studentName);
    });
  }, [game, selfEvaluations]);

  // Filtrar por equipo
  const filteredStudents = useMemo(() => {
    if (teamFilter === "all") return studentPerformances;
    return studentPerformances.filter((s) => s.teamId === teamFilter);
  }, [studentPerformances, teamFilter]);

  // Exportar a Excel
  const handleExportExcel = () => {
    const headers = [
      "Alumno",
      "Equipo",
      "Respondió (veces)",
      "Con ayuda",
      "Correctas",
      "Incorrectas",
      "Calificó (veces)",
      "Verdes",
      "Amarillos",
      "Rojos",
      "Aceptadas",
      "Rechazadas",
      "Tiene autoevaluación",
    ];

    const rows = filteredStudents.map((s) => [
      s.studentName,
      s.teamName,
      s.respondedCount,
      s.respondedWithHelp,
      s.respondedCorrect,
      s.respondedIncorrect,
      s.ratedCount,
      s.greenRatings,
      s.yellowRatings,
      s.redRatings,
      s.ratingsAccepted,
      s.ratingsRejected,
      s.selfEvaluation ? "Sí" : "No",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resultados_${gameId}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: "#64748b" }}>{t.loading}</div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 18, color: "#dc2626" }}>{t.gameNotFound}</div>
        </div>
      </div>
    );
  }

  const gameName = game.config?.className || game.config?.gameName || "Juego";

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              fontSize: 14,
              marginBottom: 16,
              padding: 0,
            }}
          >
            {t.backToDashboard}
          </button>

          <h1 style={{ margin: "0 0 4px 0", fontSize: 28, fontWeight: 800, color: "#1e293b" }}>{t.title}</h1>
          <p style={{ margin: 0, fontSize: 16, color: "#64748b" }}>
            {gameName} {game.config?.subject && `• ${game.config.subject}`}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <TabButton active={activeTab === "podium"} onClick={() => setActiveTab("podium")}>
            {t.tabs.podium}
          </TabButton>
          <TabButton active={activeTab === "alumnos"} onClick={() => setActiveTab("alumnos")}>
            {t.tabs.alumnos}
          </TabButton>
          <TabButton active={activeTab === "autoevaluaciones"} onClick={() => setActiveTab("autoevaluaciones")}>
            {t.tabs.autoevaluaciones} ({selfEvaluations.length})
          </TabButton>
        </div>

        {/* Content */}
        <div style={cardStyle}>
          {/* PODIUM TAB */}
          {activeTab === "podium" && (
            <div>
              {/* Top 3 */}
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
                {/* 2do lugar */}
                {sortedTeams[1] && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🥈</div>
                    <div
                      style={{
                        backgroundColor: "#94a3b8",
                        color: "white",
                        borderRadius: 12,
                        padding: 20,
                        minWidth: 120,
                      }}
                    >
                      <div style={{ fontSize: 24 }}>{sortedTeams[1].emoji || "🐯"}</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{sortedTeams[1].name}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
                        {sortedTeams[1].totalScore ?? 0}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{t.podium.points}</div>
                    </div>
                  </div>
                )}

                {/* 1er lugar */}
                {sortedTeams[0] && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 64 }}>👑</div>
                    <div
                      style={{
                        background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                        color: "white",
                        borderRadius: 12,
                        padding: 24,
                        minWidth: 140,
                      }}
                    >
                      <div style={{ fontSize: 32 }}>{sortedTeams[0].emoji || "🦁"}</div>
                      <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{sortedTeams[0].name}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
                        {sortedTeams[0].totalScore ?? 0}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{t.podium.points}</div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          backgroundColor: "rgba(255,255,255,0.2)",
                          padding: "4px 8px",
                          borderRadius: 4,
                        }}
                      >
                        🏆 {t.podium.champion}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3er lugar */}
                {sortedTeams[2] && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🥉</div>
                    <div
                      style={{
                        backgroundColor: "#cd7c32",
                        color: "white",
                        borderRadius: 12,
                        padding: 20,
                        minWidth: 120,
                      }}
                    >
                      <div style={{ fontSize: 24 }}>{sortedTeams[2].emoji || "🐻"}</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{sortedTeams[2].name}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
                        {sortedTeams[2].totalScore ?? 0}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{t.podium.points}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resto de equipos */}
              {sortedTeams.length > 3 && (
                <div>
                  <h3 style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>{t.podium.otherTeams}</h3>
                  {sortedTeams.slice(3).map((team, index) => (
                    <div
                      key={team.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        backgroundColor: "#f8fafc",
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: "#64748b" }}>
                        {index + 4}. {team.emoji} {team.name}
                      </span>
                      <span style={{ fontWeight: 700 }}>{team.totalScore ?? 0} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ALUMNOS TAB */}
          {activeTab === "alumnos" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.alumnos.title}</h3>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {/* Filtro por equipo */}
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 14,
                    }}
                  >
                    <option value="all">{t.alumnos.filterAll}</option>
                    {sortedTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.emoji} {team.name}
                      </option>
                    ))}
                  </select>

                  {/* Exportar */}
                  <button
                    onClick={handleExportExcel}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#22c55e",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {t.alumnos.exportExcel}
                  </button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>{t.alumnos.noData}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredStudents.map((student) => (
                    <StudentCard key={`${student.teamId}-${student.playerId}`} student={student} t={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AUTOEVALUACIONES TAB */}
          {activeTab === "autoevaluaciones" && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>{t.selfEval.title}</h3>

              {selfEvaluations.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                  <div style={{ color: "#64748b" }}>{t.selfEval.noEvaluations}</div>
                  {!game.selfEvaluationActive && (
                    <p style={{ color: "#f59e0b", fontSize: 13, marginTop: 12 }}>{t.selfEval.activateSelfEval}</p>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {selfEvaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      style={{
                        backgroundColor: "#f8fafc",
                        borderRadius: 12,
                        padding: 20,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>
                            {evaluation.studentName}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>
                            {t.selfEval.team}: {evaluation.teamName}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{formatDate(evaluation.submittedAt)}</div>
                      </div>

                      {/* Ayuda recibida */}
                      {evaluation.receivedHelp && evaluation.receivedHelp.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#22c55e",
                              marginBottom: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            🤝 {t.selfEval.receivedHelp}
                          </div>
                          {evaluation.receivedHelp.map((help, idx) => (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: "white",
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 8,
                                borderLeft: "3px solid #22c55e",
                              }}
                            >
                              {help.concept && <div style={{ fontWeight: 600, marginBottom: 4 }}>{help.concept}</div>}
                              {help.fromWho.length > 0 && (
                                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                                  {t.selfEval.fromWho}: {help.fromWho.join(", ")}
                                </div>
                              )}
                              {help.description && (
                                <div style={{ fontSize: 13, color: "#374151" }}>{help.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ayuda dada */}
                      {evaluation.gaveHelp && evaluation.gaveHelp.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#3b82f6",
                              marginBottom: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            💡 {t.selfEval.gaveHelp}
                          </div>
                          {evaluation.gaveHelp.map((help, idx) => (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: "white",
                                borderRadius: 8,
                                padding: 12,
                                marginBottom: 8,
                                borderLeft: "3px solid #3b82f6",
                              }}
                            >
                              {help.concept && <div style={{ fontWeight: 600, marginBottom: 4 }}>{help.concept}</div>}
                              {help.toWho.length > 0 && (
                                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                                  {t.selfEval.toWho}: {help.toWho.join(", ")}
                                </div>
                              )}
                              {help.description && (
                                <div style={{ fontSize: 13, color: "#374151" }}>{help.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta de estudiante
function StudentCard({ student, t }: { student: StudentPerformance; t: any }) {
  const [expanded, setExpanded] = useState(false);

  const hasActivity = student.respondedCount > 0 || student.ratedCount > 0;

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: hasActivity ? "pointer" : "default",
        }}
        onClick={() => hasActivity && setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            {student.teamEmoji || "👤"}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b" }}>{student.studentName}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{student.teamName}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Respondió */}
          {student.respondedCount > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>🎤 {t.alumnos.responded}</div>
              <div style={{ fontWeight: 700, color: "#f59e0b" }}>
                {student.respondedCount}
                {student.respondedWithHelp > 0 && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}> ({student.respondedWithHelp}🆘)</span>
                )}
              </div>
            </div>
          )}

          {/* Calificó */}
          {student.ratedCount > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>✍️ {t.alumnos.rated}</div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                <span style={{ color: "#22c55e", fontWeight: 700 }}>{student.greenRatings}</span>
                <span style={{ color: "#eab308", fontWeight: 700 }}>{student.yellowRatings}</span>
                <span style={{ color: "#ef4444", fontWeight: 700 }}>{student.redRatings}</span>
              </div>
            </div>
          )}

          {/* Autoevaluación */}
          {student.selfEvaluation && (
            <div
              style={{
                padding: "4px 8px",
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              📝
            </div>
          )}

          {/* Expand icon */}
          {hasActivity && <span style={{ color: "#94a3b8" }}>{expanded ? "▲" : "▼"}</span>}
        </div>
      </div>

      {/* Detalles expandidos */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #e2e8f0" }}>
          {/* Preguntas respondidas */}
          {student.respondedQuestions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>
                🎤 {t.alumnos.responded}
              </div>
              {student.respondedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    borderLeft: `3px solid ${q.responseValidated === "correct" ? "#22c55e" : q.responseValidated === "incorrect" ? "#ef4444" : "#94a3b8"}`,
                  }}
                >
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
                    <strong>{t.alumnos.question}:</strong> {q.questionText}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                    <span>
                      <strong>{t.alumnos.help}:</strong> {q.helpRequested ? `✅ ${t.alumnos.yes}` : `❌ ${t.alumnos.no}`}
                    </span>
                    <span>
                      <strong>{t.alumnos.result}:</strong>{" "}
                      {q.responseValidated === "correct" ? "✅ Correcta" : q.responseValidated === "incorrect" ? "❌ Incorrecta" : "⏳ Sin validar"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Calificaciones dadas */}
          {student.ratingDetails.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6", marginBottom: 8 }}>
                ✍️ {t.alumnos.rated}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {student.ratingDetails.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      backgroundColor: r.rating === "green" ? "#dcfce7" : r.rating === "yellow" ? "#fef3c7" : "#fee2e2",
                      color: r.rating === "green" ? "#166534" : r.rating === "yellow" ? "#a16207" : "#991b1b",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {r.rating === "green" ? "🟩" : r.rating === "yellow" ? "🟨" : "🟥"}
                    {r.validated === true && <span>✅</span>}
                    {r.validated === false && <span>❌</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                ✅ {student.ratingsAccepted} {t.alumnos.accepted} • ❌ {student.ratingsRejected} {t.alumnos.rejected}
              </div>
            </div>
          )}

          {/* Autoevaluación vinculada */}
          {student.selfEvaluation && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8b5cf6", marginBottom: 8 }}>📝 Autoevaluación</div>
              <div style={{ backgroundColor: "white", borderRadius: 8, padding: 12, fontSize: 13 }}>
                {student.selfEvaluation.receivedHelp?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <strong>Aprendió de:</strong>{" "}
                    {student.selfEvaluation.receivedHelp.map((h) => h.fromWho.join(", ")).join("; ")}
                  </div>
                )}
                {student.selfEvaluation.gaveHelp?.length > 0 && (
                  <div>
                    <strong>Ayudó a:</strong>{" "}
                    {student.selfEvaluation.gaveHelp.map((h) => h.toWho.join(", ")).join("; ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componentes auxiliares
function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 600,
        backgroundColor: active ? "#3b82f6" : "white",
        color: active ? "white" : "#64748b",
        border: active ? "none" : "1px solid #e2e8f0",
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

// Estilos
const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f1f5f9",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const contentStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};