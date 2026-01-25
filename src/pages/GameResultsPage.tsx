// src/pages/GameResultsPage.tsx
// 📊 Página de resultados del juego para el docente

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
  players?: Record<string, { name: string }>;
}

interface Round {
  questionId: string;
  respondingTeam?: {
    teamId: string;
    playerName: string;
    helpRequested?: boolean;
    responseAccepted?: boolean;
  };
  ratingTeams?: Record<string, {
    teamId: string;
    playerName: string;
    rating: "green" | "yellow" | "red";
    accepted?: boolean;
  }>;
  pointsAwarded?: Record<string, number>;
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

interface GameData {
  config?: {
    className?: string;
    gameName?: string;
    subject?: string;
  };
  teams?: Record<string, Team>;
  stage2?: {
    rounds?: Round[];
    currentRound?: number;
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
  const [activeTab, setActiveTab] = useState<"podium" | "performance" | "autoevaluaciones">("podium");

  // Detectar tab inicial desde URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "autoevaluaciones") {
      setActiveTab("autoevaluaciones");
    }
  }, [searchParams]);

  const texts = {
    es: {
      title: "Resultados del Juego",
      backToDashboard: "← Volver al Dashboard",
      tabs: {
        podium: "🏆 Podio",
        performance: "📊 Desempeño",
        autoevaluaciones: "📝 Autoevaluaciones",
      },
      podium: {
        champion: "CAMPEÓN",
        points: "puntos",
        otherTeams: "Otros equipos",
      },
      performance: {
        title: "Desempeño en Stage 2",
        team: "Equipo",
        responded: "Respondió",
        times: "veces",
        withHelp: "con ayuda",
        rated: "Calificó",
        accepted: "aceptadas",
        green: "verdes",
        yellow: "amarillos",
        red: "rojos",
        noStage2: "Este juego no tiene datos de Stage 2",
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
        activateSelfEval: "La autoevaluación no está activa. Activala desde el podio del juego.",
      },
      loading: "Cargando...",
      gameNotFound: "Juego no encontrado",
    },
    en: {
      title: "Game Results",
      backToDashboard: "← Back to Dashboard",
      tabs: {
        podium: "🏆 Podium",
        performance: "📊 Performance",
        autoevaluaciones: "📝 Self-Evaluations",
      },
      podium: {
        champion: "CHAMPION",
        points: "points",
        otherTeams: "Other teams",
      },
      performance: {
        title: "Stage 2 Performance",
        team: "Team",
        responded: "Responded",
        times: "times",
        withHelp: "with help",
        rated: "Rated",
        accepted: "accepted",
        green: "green",
        yellow: "yellow",
        red: "red",
        noStage2: "This game has no Stage 2 data",
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
        activateSelfEval: "Self-evaluation is not active. Activate it from the game podium.",
      },
      loading: "Loading...",
      gameNotFound: "Game not found",
    },
    pt: {
      title: "Resultados do Jogo",
      backToDashboard: "← Voltar ao Dashboard",
      tabs: {
        podium: "🏆 Pódio",
        performance: "📊 Desempenho",
        autoevaluaciones: "📝 Autoavaliações",
      },
      podium: {
        champion: "CAMPEÃO",
        points: "pontos",
        otherTeams: "Outras equipes",
      },
      performance: {
        title: "Desempenho no Stage 2",
        team: "Equipe",
        responded: "Respondeu",
        times: "vezes",
        withHelp: "com ajuda",
        rated: "Avaliou",
        accepted: "aceitas",
        green: "verdes",
        yellow: "amarelos",
        red: "vermelhos",
        noStage2: "Este jogo não tem dados do Stage 2",
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
        activateSelfEval: "A autoavaliação não está ativa. Ative-a no pódio do jogo.",
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

  // Calcular desempeño por equipo en Stage 2
  const teamPerformance = useMemo(() => {
    if (!game?.stage2?.rounds) return {};

    const performance: Record<string, {
        responded: number;
        helpRequested: number;
        responseAccepted: number;
        rated: number;
        ratingAccepted: number;
        greenRatings: number;
        yellowRatings: number;
        redRatings: number;
      }> = {};

    // Inicializar para todos los equipos
    sortedTeams.forEach((team) => {
      performance[team.id] = {
        responded: 0,
        helpRequested: 0,
        responseAccepted: 0,
        rated: 0,
        ratingAccepted: 0,
        greenRatings: 0,
        yellowRatings: 0,
        redRatings: 0,
      };
    });

    // Analizar cada ronda
    for (const round of game.stage2.rounds) {
      // Equipo que respondió
      if (round.respondingTeam) {
        const teamId = round.respondingTeam.teamId;
        if (performance[teamId]) {
          performance[teamId].responded++;
          if (round.respondingTeam.helpRequested) {
            performance[teamId].helpRequested++;
          }
          if (round.respondingTeam.responseAccepted) {
            performance[teamId].responseAccepted++;
          }
        }
      }

      // Equipos que calificaron
      if (round.ratingTeams) {
        for (const [teamId, ratingData] of Object.entries(round.ratingTeams)) {
          if (performance[teamId]) {
            performance[teamId].rated++;
            if (ratingData.accepted) {
              performance[teamId].ratingAccepted++;
            }
            if (ratingData.rating === "green") {
              performance[teamId].greenRatings++;
            } else if (ratingData.rating === "yellow") {
              performance[teamId].yellowRatings++;
            } else if (ratingData.rating === "red") {
              performance[teamId].redRatings++;
            }
          }
        }
      }
    }

    return performance;
  }, [game, sortedTeams]);

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
          <TabButton active={activeTab === "performance"} onClick={() => setActiveTab("performance")}>
            {t.tabs.performance}
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

          {/* PERFORMANCE TAB */}
          {activeTab === "performance" && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>{t.performance.title}</h3>

              {!game.stage2?.rounds || game.stage2.rounds.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>{t.performance.noStage2}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <Th>{t.performance.team}</Th>
                        <Th>🏆 Pts</Th>
                        <Th>🎤 {t.performance.responded}</Th>
                        <Th>✍️ {t.performance.rated}</Th>
                        <Th>🟩🟨🟥</Th>
                        <Th>✅ {t.performance.accepted}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team) => {
                        const perf = teamPerformance[team.id];
                        return (
                          <tr key={team.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <Td>
                              <span style={{ marginRight: 8 }}>{team.emoji}</span>
                              {team.name}
                            </Td>
                            <Td style={{ fontWeight: 700 }}>{team.totalScore ?? 0}</Td>
                            <Td>
                              {perf?.responded || 0}
                              {perf?.helpRequested ? (
                                <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 4 }}>
                                  ({perf.helpRequested} 🆘)
                                </span>
                              ) : null}
                            </Td>
                            <Td>{perf?.rated || 0}</Td>
                            <Td>
                              <span style={{ color: "#22c55e" }}>{perf?.greenRatings || 0}</span>
                              {" / "}
                              <span style={{ color: "#eab308" }}>{perf?.yellowRatings || 0}</span>
                              {" / "}
                              <span style={{ color: "#ef4444" }}>{perf?.redRatings || 0}</span>
                            </Td>
                            <Td>
                              <span style={{ color: "#22c55e", fontWeight: 600 }}>{perf?.ratingAccepted || 0}</span>
                              <span style={{ color: "#64748b" }}> / {perf?.rated || 0}</span>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                              {help.concept && (
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{help.concept}</div>
                              )}
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
                              {help.concept && (
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{help.concept}</div>
                              )}
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

// Componentes auxiliares
function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 16px",
        fontSize: 12,
        fontWeight: 600,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td
      style={{
        padding: "12px 16px",
        fontSize: 14,
        ...style,
      }}
    >
      {children}
    </td>
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