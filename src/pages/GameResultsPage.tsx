// src/pages/GameResultsPage.tsx
// 📊 Página de resultados del juego para el docente
// ✅ ACTUALIZADO: Agregado tab "Cierre Pedagógico" con Top Ayudantes
// ✅ CORREGIDO: Textos hardcodeados en export Excel, fallback de nombre y resultados de preguntas
// ✅ AGREGADO: Exportar autoevaluaciones a Google Sheets
// ✅ CORREGIDO: Botones de estrategia ahora funcionan

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../firebase.config";
import { useI18n } from "../i18n";
import {
  exportSelfEvaluationsToSheet,
  type SelfEvaluationExportData
} from "../services/sheetsService";

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

interface HelpBlock {
  concept: string;
  fromWho?: string[];
  toWho?: string[];
  description: string;
}

interface SelfEvaluation {
  id: string;
  studentName: string;
  teamName: string;
  teamId: string;
  receivedHelp: HelpBlock[];
  gaveHelp: HelpBlock[];
  difficultyRating?: number;
  confidenceBefore?: number;
  confidenceAfter?: number;
  validated?: boolean;
  teacherComment?: string;
  validatedAt?: number;
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

interface TopHelper {
  studentName: string;
  teamId: string;
  teamName: string;
  teamEmoji?: string;
  helpCount: number;
  conceptsHelped: string[];
  helpedStudents: string[];
  isSelected?: boolean;
}

interface GameData {
  config?: {
    className?: string;
    gameName?: string;
    subject?: string;
    groupReflection?: {
      enabled: boolean;
      strategy: 'top3' | 'onePerTeam' | 'manual';
      duration?: number;
    };
  };
  teams?: Record<string, Team>;
  questions?: Record<string, Question>;
  stage2?: {
    rounds?: Round[];
    currentRound?: number;
    completed?: boolean;
  };
  selfEvaluationActive?: boolean;
  selfEvaluations?: Record<string, SelfEvaluation>;
}

export function GameResultsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useI18n();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameData | null>(null);
  const [selfEvaluations, setSelfEvaluations] = useState<SelfEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<"podium" | "alumnos" | "autoevaluaciones" | "cierre">("podium");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const [selectedHelpers, setSelectedHelpers] = useState<Set<string>>(new Set());
  const [presentationMode, setPresentationMode] = useState(false);
  const [currentPresenterIndex, setCurrentPresenterIndex] = useState(0);
  const [exportingToSheets, setExportingToSheets] = useState(false);
  // Estado para la estrategia seleccionada (fix botones)
  const [selectedStrategy, setSelectedStrategy] = useState<'top3' | 'onePerTeam' | 'manual'>(
    game?.config?.groupReflection?.strategy || 'top3'
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "autoevaluaciones") {
      setActiveTab("autoevaluaciones");
    } else if (tab === "alumnos") {
      setActiveTab("alumnos");
    } else if (tab === "cierre") {
      setActiveTab("cierre");
    }
  }, [searchParams]);

  const texts = {
    es: {
      title: "Resultados del Juego",
      backToDashboard: "← Volver al Dashboard",
      gameNameFallback: "Juego",
      tabs: {
        podium: "🏆 Podio",
        alumnos: "👤 Por Alumno",
        autoevaluaciones: "📝 Autoevaluaciones",
        cierre: "🎤 Cierre Pedagógico",
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
        correctAnswer: "Correcta",
        incorrectAnswer: "Incorrecta",
        unvalidated: "Sin validar",
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
        validated: "Validada",
        pending: "Pendiente",
        metacognition: "Metacognición",
        difficulty: "Dificultad percibida",
        confidenceBefore: "Confianza antes",
        confidenceAfter: "Confianza después",
        teacherComment: "Comentario del docente",
        exportSheets: "📊 Exportar a Google Sheets",
        exporting: "Exportando...",
      },
      cierre: {
        title: "Cierre Pedagógico",
        subtitle: "Alumnos destacados que explicarán a la clase",
        noData: "No hay datos de autoevaluaciones validadas para calcular los destacados.",
        topHelpers: "Top Ayudantes",
        helpedTimes: "ayudó",
        times: "veces",
        concepts: "Conceptos que domina",
        helpedTo: "Ayudó a",
        strategy: "Estrategia de selección",
        strategyTop3: "Top 3 más mencionados",
        strategyOnePerTeam: "Uno por equipo",
        strategyManual: "Selección manual",
        selected: "Seleccionados para explicar",
        select: "Seleccionar",
        deselect: "Quitar",
        startPresentation: "🎬 Iniciar Reflexión Grupal",
        endPresentation: "Finalizar",
        nextPresenter: "Siguiente →",
        prevPresenter: "← Anterior",
        presenterOf: "de",
        nowPresenting: "Ahora explica",
        willExplain: "Explicará sobre",
        tip: "💡 Tip: Los alumnos seleccionados explicarán los conceptos que dominan al resto de la clase. \"El que enseña aprende dos veces.\"",
        noHelpers: "No hay alumnos con menciones de ayuda validadas.",
        validateFirst: "Primero validá las autoevaluaciones en la pestaña correspondiente.",
      },
      loading: "Cargando...",
      gameNotFound: "Juego no encontrado",
    },
    en: {
      title: "Game Results",
      backToDashboard: "← Back to Dashboard",
      gameNameFallback: "Game",
      tabs: {
        podium: "🏆 Podium",
        alumnos: "👤 By Student",
        autoevaluaciones: "📝 Self-Evaluations",
        cierre: "🎤 Pedagogical Closing",
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
        correctAnswer: "Correct",
        incorrectAnswer: "Incorrect",
        unvalidated: "Unvalidated",
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
        validated: "Validated",
        pending: "Pending",
        metacognition: "Metacognition",
        difficulty: "Perceived difficulty",
        confidenceBefore: "Confidence before",
        confidenceAfter: "Confidence after",
        teacherComment: "Teacher comment",
        exportSheets: "📊 Export to Google Sheets",
        exporting: "Exporting...",
      },
      cierre: {
        title: "Pedagogical Closing",
        subtitle: "Outstanding students who will explain to the class",
        noData: "No validated self-evaluation data to calculate top helpers.",
        topHelpers: "Top Helpers",
        helpedTimes: "helped",
        times: "times",
        concepts: "Concepts mastered",
        helpedTo: "Helped",
        strategy: "Selection strategy",
        strategyTop3: "Top 3 most mentioned",
        strategyOnePerTeam: "One per team",
        strategyManual: "Manual selection",
        selected: "Selected to explain",
        select: "Select",
        deselect: "Remove",
        startPresentation: "🎬 Start Group Reflection",
        endPresentation: "End",
        nextPresenter: "Next →",
        prevPresenter: "← Previous",
        presenterOf: "of",
        nowPresenting: "Now explaining",
        willExplain: "Will explain about",
        tip: "💡 Tip: Selected students will explain the concepts they master to the rest of the class. \"Who teaches, learns twice.\"",
        noHelpers: "No students with validated help mentions.",
        validateFirst: "First validate the self-evaluations in the corresponding tab.",
      },
      loading: "Loading...",
      gameNotFound: "Game not found",
    },
    pt: {
      title: "Resultados do Jogo",
      backToDashboard: "← Voltar ao Dashboard",
      gameNameFallback: "Jogo",
      tabs: {
        podium: "🏆 Pódio",
        alumnos: "👤 Por Aluno",
        autoevaluaciones: "📝 Autoavaliações",
        cierre: "🎤 Fechamento Pedagógico",
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
        correctAnswer: "Correta",
        incorrectAnswer: "Incorreta",
        unvalidated: "Não validado",
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
        validated: "Validada",
        pending: "Pendente",
        metacognition: "Metacognição",
        difficulty: "Dificuldade percebida",
        confidenceBefore: "Confiança antes",
        confidenceAfter: "Confiança depois",
        teacherComment: "Comentário do professor",
        exportSheets: "📊 Exportar para Google Sheets",
        exporting: "Exportando...",
      },
      cierre: {
        title: "Fechamento Pedagógico",
        subtitle: "Alunos destacados que explicarão para a turma",
        noData: "Não há dados de autoavaliações validadas para calcular os destaques.",
        topHelpers: "Top Ajudantes",
        helpedTimes: "ajudou",
        times: "vezes",
        concepts: "Conceitos que domina",
        helpedTo: "Ajudou a",
        strategy: "Estratégia de seleção",
        strategyTop3: "Top 3 mais mencionados",
        strategyOnePerTeam: "Um por equipe",
        strategyManual: "Seleção manual",
        selected: "Selecionados para explicar",
        select: "Selecionar",
        deselect: "Remover",
        startPresentation: "🎬 Iniciar Reflexão em Grupo",
        endPresentation: "Finalizar",
        nextPresenter: "Próximo →",
        prevPresenter: "← Anterior",
        presenterOf: "de",
        nowPresenting: "Agora explica",
        willExplain: "Explicará sobre",
        tip: "💡 Dica: Os alunos selecionados explicarão os conceitos que dominam para o resto da turma. \"Quem ensina aprende duas vezes.\"",
        noHelpers: "Não há alunos com menções de ajuda validadas.",
        validateFirst: "Primeiro valide as autoavaliações na aba correspondente.",
      },
      loading: "Carregando...",
      gameNotFound: "Jogo não encontrado",
    },
  };

  const t = texts[language] || texts.es;

  useEffect(() => {
    async function loadData() {
      if (!gameId) {
        setLoading(false);
        return;
      }

      try {
        const gameSnap = await get(ref(database, `games/${gameId}`));

        if (gameSnap.exists()) {
          const gameData = gameSnap.val();
          setGame(gameData);

          // Inicializar la estrategia seleccionada desde la configuración del juego
          if (gameData.config?.groupReflection?.strategy) {
            setSelectedStrategy(gameData.config.groupReflection.strategy);
          }

          if (gameData.selfEvaluations) {
            const evals: SelfEvaluation[] = Object.entries(gameData.selfEvaluations).map(
              ([id, val]: [string, any]) => ({
                id,
                ...val,
              })
            );
            evals.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
            setSelfEvaluations(evals);
          }
        }
      } catch (error) {
        console.error("Error loading game results:", error);
      }

      setLoading(false);
    }

    loadData();
  }, [gameId]);

  const sortedTeams = useMemo(() => {
    if (!game?.teams) return [];
    return Object.entries(game.teams)
      .map(([id, team]) => ({ id, ...team }))
      .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  }, [game]);

  const topHelpers = useMemo((): TopHelper[] => {
    if (!selfEvaluations.length || !game?.teams) return [];

    const validatedEvals = selfEvaluations.filter(e => e.validated);

    if (!validatedEvals.length) return [];

    const helperMap: Record<string, TopHelper> = {};

    for (const evaluation of validatedEvals) {
      if (evaluation.gaveHelp && evaluation.gaveHelp.length > 0) {
        const key = `${evaluation.teamId}-${evaluation.studentName}`;

        if (!helperMap[key]) {
          const team = game.teams[evaluation.teamId];
          helperMap[key] = {
            studentName: evaluation.studentName,
            teamId: evaluation.teamId,
            teamName: evaluation.teamName || team?.name || evaluation.teamId,
            teamEmoji: team?.emoji,
            helpCount: 0,
            conceptsHelped: [],
            helpedStudents: [],
          };
        }

        for (const help of evaluation.gaveHelp) {
          const studentsHelped = help.toWho || [];
          helperMap[key].helpCount += studentsHelped.length || 1;

          if (help.concept && !helperMap[key].conceptsHelped.includes(help.concept)) {
            helperMap[key].conceptsHelped.push(help.concept);
          }

          for (const student of studentsHelped) {
            if (!helperMap[key].helpedStudents.includes(student)) {
              helperMap[key].helpedStudents.push(student);
            }
          }
        }
      }
    }

    for (const evaluation of validatedEvals) {
      if (evaluation.receivedHelp && evaluation.receivedHelp.length > 0) {
        for (const help of evaluation.receivedHelp) {
          const fromStudents = help.fromWho || [];
          for (const helperName of fromStudents) {
            const helperKey = Object.keys(helperMap).find(
              k => helperMap[k].studentName.toLowerCase() === helperName.toLowerCase()
            );

            if (helperKey && helperMap[helperKey]) {
              if (!helperMap[helperKey].helpedStudents.includes(evaluation.studentName)) {
                helperMap[helperKey].helpedStudents.push(evaluation.studentName);
              }
            }
          }
        }
      }
    }

    const helpers = Object.values(helperMap)
      .filter(h => h.helpCount > 0)
      .sort((a, b) => b.helpCount - a.helpCount);

    return helpers;
  }, [selfEvaluations, game]);

  const getHelpersByStrategy = (strategy: 'top3' | 'onePerTeam' | 'manual'): TopHelper[] => {
    if (strategy === 'top3') {
      return topHelpers.slice(0, 3);
    }

    if (strategy === 'onePerTeam') {
      const seenTeams = new Set<string>();
      const result: TopHelper[] = [];

      for (const helper of topHelpers) {
        if (!seenTeams.has(helper.teamId)) {
          seenTeams.add(helper.teamId);
          result.push(helper);
        }
      }
      return result;
    }

    return topHelpers.filter(h => selectedHelpers.has(`${h.teamId}-${h.studentName}`));
  };

  const toggleHelperSelection = (helper: TopHelper) => {
    const key = `${helper.teamId}-${helper.studentName}`;
    setSelectedHelpers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const studentPerformances = useMemo((): StudentPerformance[] => {
    if (!game?.stage2?.rounds || !game?.teams) return [];

    const rounds = Array.isArray(game.stage2.rounds)
      ? game.stage2.rounds
      : Object.values(game.stage2.rounds);

    const questions = game.questions || {};
    const performances: Record<string, StudentPerformance> = {};

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

    rounds.forEach((round: Round, roundIndex: number) => {
      if (!round) return;

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

    for (const selfEval of selfEvaluations) {
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
      if (a.teamName !== b.teamName) {
        return a.teamName.localeCompare(b.teamName);
      }
      return a.studentName.localeCompare(b.studentName);
    });
  }, [game, selfEvaluations]);

  const filteredStudents = useMemo(() => {
    if (teamFilter === "all") return studentPerformances;
    return studentPerformances.filter((s) => s.teamId === teamFilter);
  }, [studentPerformances, teamFilter]);

  const handleExportExcel = () => {
    // ✅ AHORA USA TRADUCCIONES
    const headers = [
      t.alumnos.student,
      t.alumnos.team,
      `${t.alumnos.responded} (${t.alumnos.times})`,
      t.alumnos.withHelp,
      t.alumnos.correct,
      t.alumnos.incorrectAnswer,
      `${t.alumnos.rated} (${t.alumnos.times})`,
      "🟩",
      "🟨",
      "🟥",
      t.alumnos.accepted,
      t.alumnos.rejected,
      t.selfEval.title,
      `${t.selfEval.title} ${t.selfEval.validated}`,
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
      s.selfEvaluation ? t.alumnos.yes : t.alumnos.no,
      s.selfEvaluation?.validated ? t.alumnos.yes : t.alumnos.no,
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

  const handleExportToSheets = async () => {
    if (selfEvaluations.length === 0) return;

    setExportingToSheets(true);

    try {
      // Preparar datos para exportar
      const exportData: SelfEvaluationExportData[] = selfEvaluations.map(e => ({
        studentName: e.studentName,
        teamName: e.teamName,
        receivedHelpFrom: e.receivedHelp?.map(h => h.fromWho?.join(', ')).filter(Boolean).join('; ') || '',
        receivedHelpConcepts: e.receivedHelp?.map(h => h.concept).filter(Boolean).join('; ') || '',
        gaveHelpTo: e.gaveHelp?.map(h => h.toWho?.join(', ')).filter(Boolean).join('; ') || '',
        gaveHelpConcepts: e.gaveHelp?.map(h => h.concept).filter(Boolean).join('; ') || '',
        difficultyRating: e.difficultyRating,
        confidenceBefore: e.confidenceBefore,
        confidenceAfter: e.confidenceAfter,
        validated: e.validated || false,
        submittedAt: e.submittedAt,
      }));

      const { spreadsheetUrl } = await exportSelfEvaluationsToSheet(
        gameName,
        exportData,
        language as 'es' | 'en' | 'pt'
      );

      // Abrir el spreadsheet en nueva pestaña
      window.open(spreadsheetUrl, '_blank');

    } catch (error: any) {
      console.error('Error exporting to Sheets:', error);
      alert(error.message || 'Error al exportar');
    } finally {
      setExportingToSheets(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRating = (value: number | undefined) => {
    if (!value) return "—";
    return "⭐".repeat(value) + "☆".repeat(5 - value);
  };

  // Usamos el estado selectedStrategy en lugar de leer directamente de game
  const currentStrategy = selectedStrategy;
  const displayedHelpers = getHelpersByStrategy(currentStrategy);
  const currentPresenter = displayedHelpers[currentPresenterIndex];

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

  // ✅ FALLBACK TRADUCIDO
  const gameName = game.config?.className || game.config?.gameName || t.gameNameFallback;

  if (presentationMode && currentPresenter) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        color: "white",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>
        <div style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            {currentPresenterIndex + 1} {t.cierre.presenterOf} {displayedHelpers.length}
          </div>
          <button
            onClick={() => setPresentationMode(false)}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ✕ {t.cierre.endPresentation}
          </button>
        </div>

        <div style={{ textAlign: "center", maxWidth: 600 }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>
            {currentPresenter.teamEmoji || "🎤"}
          </div>

          <div style={{
            fontSize: 16,
            opacity: 0.7,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}>
            {t.cierre.nowPresenting}
          </div>

          <h1 style={{
            fontSize: 48,
            fontWeight: 800,
            margin: "0 0 16px 0",
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {currentPresenter.studentName}
          </h1>

          <div style={{
            fontSize: 20,
            opacity: 0.8,
            marginBottom: 32,
          }}>
            {currentPresenter.teamName}
          </div>

          <div style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}>
            <div style={{
              fontSize: 14,
              opacity: 0.7,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}>
              {t.cierre.willExplain}
            </div>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}>
              {currentPresenter.conceptsHelped.length > 0 ? (
                currentPresenter.conceptsHelped.map((concept, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "8px 20px",
                      backgroundColor: "rgba(251, 191, 36, 0.2)",
                      border: "2px solid #fbbf24",
                      borderRadius: 20,
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {concept}
                  </span>
                ))
              ) : (
                <span style={{ opacity: 0.5 }}>Sin conceptos específicos</span>
              )}
            </div>
          </div>

          <div style={{
            fontSize: 16,
            opacity: 0.7,
          }}>
            💪 {t.cierre.helpedTimes} {currentPresenter.helpCount} {t.cierre.times} ·
            👥 {t.cierre.helpedTo}: {currentPresenter.helpedStudents.slice(0, 3).join(", ")}
            {currentPresenter.helpedStudents.length > 3 && ` +${currentPresenter.helpedStudents.length - 3}`}
          </div>
        </div>

        <div style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          gap: 16,
        }}>
          <button
            onClick={() => setCurrentPresenterIndex(Math.max(0, currentPresenterIndex - 1))}
            disabled={currentPresenterIndex === 0}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: currentPresenterIndex === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: currentPresenterIndex === 0 ? "not-allowed" : "pointer",
              opacity: currentPresenterIndex === 0 ? 0.5 : 1,
            }}
          >
            {t.cierre.prevPresenter}
          </button>

          <button
            onClick={() => setCurrentPresenterIndex(Math.min(displayedHelpers.length - 1, currentPresenterIndex + 1))}
            disabled={currentPresenterIndex === displayedHelpers.length - 1}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: currentPresenterIndex === displayedHelpers.length - 1
                ? "rgba(255,255,255,0.1)"
                : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              background: currentPresenterIndex === displayedHelpers.length - 1
                ? "rgba(255,255,255,0.1)"
                : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              color: currentPresenterIndex === displayedHelpers.length - 1 ? "white" : "#1e293b",
              border: "none",
              borderRadius: 10,
              cursor: currentPresenterIndex === displayedHelpers.length - 1 ? "not-allowed" : "pointer",
              opacity: currentPresenterIndex === displayedHelpers.length - 1 ? 0.5 : 1,
            }}
          >
            {t.cierre.nextPresenter}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
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
          <TabButton active={activeTab === "cierre"} onClick={() => setActiveTab("cierre")}>
            {t.tabs.cierre}
          </TabButton>
        </div>

        <div style={cardStyle}>
          {activeTab === "podium" && (
            <div>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
                {sortedTeams[1] && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🥈</div>
                    <div style={{ backgroundColor: "#94a3b8", color: "white", borderRadius: 12, padding: 20, minWidth: 120 }}>
                      <div style={{ fontSize: 24 }}>{sortedTeams[1].emoji || "🐯"}</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{sortedTeams[1].name}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{sortedTeams[1].totalScore ?? 0}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{t.podium.points}</div>
                    </div>
                  </div>
                )}

                {sortedTeams[0] && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 64 }}>👑</div>
                    <div style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", color: "white", borderRadius: 12, padding: 24, minWidth: 140 }}>
                      <div style={{ fontSize: 32 }}>{sortedTeams[0].emoji || "🦁"}</div>
                      <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{sortedTeams[0].name}</div>
                      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{sortedTeams[0].totalScore ?? 0}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{t.podium.points}</div>
                      <div style={{ marginTop: 8, fontSize: 11, backgroundColor: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: 4 }}>
                        🏆 {t.podium.champion}
                      </div>
                    </div>
                  </div>
                )}

                {sortedTeams[2] && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🥉</div>
                    <div style={{ backgroundColor: "#cd7c32", color: "white", borderRadius: 12, padding: 20, minWidth: 120 }}>
                      <div style={{ fontSize: 24 }}>{sortedTeams[2].emoji || "🐻"}</div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{sortedTeams[2].name}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{sortedTeams[2].totalScore ?? 0}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>{t.podium.points}</div>
                    </div>
                  </div>
                )}
              </div>

              {sortedTeams.length > 3 && (
                <div>
                  <h3 style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>{t.podium.otherTeams}</h3>
                  {sortedTeams.slice(3).map((team, index) => (
                    <div key={team.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: 8, marginBottom: 8 }}>
                      <span style={{ color: "#64748b" }}>{index + 4}. {team.emoji} {team.name}</span>
                      <span style={{ fontWeight: 700 }}>{team.totalScore ?? 0} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "alumnos" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.alumnos.title}</h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}>
                    <option value="all">{t.alumnos.filterAll}</option>
                    {sortedTeams.map((team) => (
                      <option key={team.id} value={team.id}>{team.emoji} {team.name}</option>
                    ))}
                  </select>
                  <button onClick={handleExportExcel} style={{ padding: "8px 16px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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

          {activeTab === "autoevaluaciones" && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  {t.selfEval.title}
                </h3>

                {selfEvaluations.length > 0 && (
                  <button
                    onClick={handleExportToSheets}
                    disabled={exportingToSheets}
                    style={{
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: exportingToSheets ? '#94a3b8' : '#34a853',
                      color: 'white',
                      cursor: exportingToSheets ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {exportingToSheets ? (
                      <>⏳ {t.selfEval.exporting}</>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 11H5m14 0-4-4m4 4-4 4" />
                        </svg>
                        {t.selfEval.exportSheets}
                      </>
                    )}
                  </button>
                )}
              </div>

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
                    <SelfEvalCard key={evaluation.id} evaluation={evaluation} t={t} formatDate={formatDate} renderRating={renderRating} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "cierre" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                  🎤 {t.cierre.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                  {t.cierre.subtitle}
                </p>
              </div>

              <div style={{
                padding: 16,
                backgroundColor: "#fef3c7",
                borderRadius: 12,
                border: "2px solid #fbbf24",
                marginBottom: 24,
              }}>
                <p style={{ margin: 0, fontSize: 14, color: "#92400e" }}>
                  {t.cierre.tip}
                </p>
              </div>

              {topHelpers.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
                  <div style={{ color: "#64748b", marginBottom: 8 }}>{t.cierre.noHelpers}</div>
                  <p style={{ color: "#f59e0b", fontSize: 13 }}>{t.cierre.validateFirst}</p>
                </div>
              ) : (
                <>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 24,
                    flexWrap: "wrap",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#475569", alignSelf: "center" }}>
                      {t.cierre.strategy}:
                    </span>
                    {(['top3', 'onePerTeam', 'manual'] as const).map((strat) => (
                      <button
                        key={strat}
                        onClick={() => setSelectedStrategy(strat)}
                        style={{
                          padding: "8px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: currentStrategy === strat ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                          backgroundColor: currentStrategy === strat ? "#eff6ff" : "white",
                          color: currentStrategy === strat ? "#3b82f6" : "#64748b",
                          cursor: "pointer",
                        }}
                      >
                        {strat === 'top3' && t.cierre.strategyTop3}
                        {strat === 'onePerTeam' && t.cierre.strategyOnePerTeam}
                        {strat === 'manual' && t.cierre.strategyManual}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                      📊 {t.cierre.topHelpers}
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {topHelpers.map((helper, index) => {
                        const isSelected = currentStrategy === 'manual'
                          ? selectedHelpers.has(`${helper.teamId}-${helper.studentName}`)
                          : currentStrategy === 'top3'
                            ? index < 3
                            : currentStrategy === 'onePerTeam'
                              ? displayedHelpers.some(h => h.studentName === helper.studentName && h.teamId === helper.teamId)
                              : false;

                        return (
                          <div
                            key={`${helper.teamId}-${helper.studentName}`}
                            style={{
                              padding: 16,
                              backgroundColor: isSelected ? "#f0fdf4" : "#f8fafc",
                              borderRadius: 12,
                              border: isSelected ? "2px solid #22c55e" : "1px solid #e2e8f0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 12,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                backgroundColor: index === 0 ? "#fbbf24" : index === 1 ? "#94a3b8" : index === 2 ? "#cd7c32" : "#e2e8f0",
                                color: index < 3 ? "white" : "#64748b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 14,
                              }}>
                                {index + 1}
                              </div>

                              <div>
                                <div style={{ fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                                  {helper.teamEmoji} {helper.studentName}
                                  {isSelected && <span style={{ color: "#22c55e" }}>✓</span>}
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>
                                  {helper.teamName} ·
                                  💪 {t.cierre.helpedTimes} {helper.helpCount} {t.cierre.times}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {helper.conceptsHelped.length > 0 && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {helper.conceptsHelped.slice(0, 2).map((concept, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        padding: "4px 10px",
                                        backgroundColor: "#dbeafe",
                                        color: "#1d4ed8",
                                        borderRadius: 12,
                                        fontSize: 11,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {concept}
                                    </span>
                                  ))}
                                  {helper.conceptsHelped.length > 2 && (
                                    <span style={{ fontSize: 11, color: "#64748b" }}>
                                      +{helper.conceptsHelped.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}

                              {currentStrategy === 'manual' && (
                                <button
                                  onClick={() => toggleHelperSelection(helper)}
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    border: "none",
                                    backgroundColor: isSelected ? "#fee2e2" : "#dcfce7",
                                    color: isSelected ? "#dc2626" : "#166534",
                                    cursor: "pointer",
                                  }}
                                >
                                  {isSelected ? t.cierre.deselect : t.cierre.select}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {displayedHelpers.length > 0 && (
                    <div style={{
                      padding: 20,
                      backgroundColor: "#f0fdf4",
                      borderRadius: 16,
                      border: "2px solid #22c55e",
                    }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: "#166534" }}>
                        ✅ {t.cierre.selected} ({displayedHelpers.length})
                      </h4>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                        {displayedHelpers.map((helper) => (
                          <div
                            key={`${helper.teamId}-${helper.studentName}`}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "white",
                              borderRadius: 10,
                              border: "1px solid #86efac",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>{helper.teamEmoji}</span>
                            <span style={{ fontWeight: 600, color: "#166534" }}>{helper.studentName}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setCurrentPresenterIndex(0);
                          setPresentationMode(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "14px 24px",
                          fontSize: 16,
                          fontWeight: 700,
                          borderRadius: 12,
                          border: "none",
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: "white",
                          cursor: "pointer",
                          boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
                        }}
                      >
                        {t.cierre.startPresentation}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentCard({ student, t }: { student: StudentPerformance; t: any }) {
  const [expanded, setExpanded] = useState(false);
  const hasActivity = student.respondedCount > 0 || student.ratedCount > 0;

  return (
    <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div
        style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: hasActivity ? "pointer" : "default" }}
        onClick={() => hasActivity && setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {student.teamEmoji || "👤"}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b" }}>{student.studentName}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{student.teamName}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {student.respondedCount > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>🎤 {t.alumnos.responded}</div>
              <div style={{ fontWeight: 700, color: "#f59e0b" }}>
                {student.respondedCount}
                {student.respondedWithHelp > 0 && <span style={{ fontSize: 11, color: "#94a3b8" }}> ({student.respondedWithHelp}🆘)</span>}
              </div>
            </div>
          )}

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

          {student.selfEvaluation && (
            <div style={{ padding: "4px 8px", backgroundColor: student.selfEvaluation.validated ? "#dcfce7" : "#dbeafe", color: student.selfEvaluation.validated ? "#166534" : "#1d4ed8", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
              📝 {student.selfEvaluation.validated ? "✓" : ""}
            </div>
          )}

          {hasActivity && <span style={{ color: "#94a3b8" }}>{expanded ? "▲" : "▼"}</span>}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #e2e8f0" }}>
          {student.respondedQuestions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>🎤 {t.alumnos.responded}</div>
              {student.respondedQuestions.map((q, idx) => (
                <div key={idx} style={{ backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 8, borderLeft: `3px solid ${q.responseValidated === "correct" ? "#22c55e" : q.responseValidated === "incorrect" ? "#ef4444" : "#94a3b8"}` }}>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}><strong>{t.alumnos.question}:</strong> {q.questionText}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                    <span><strong>{t.alumnos.help}:</strong> {q.helpRequested ? `✅ ${t.alumnos.yes}` : `❌ ${t.alumnos.no}`}</span>
                    <span><strong>{t.alumnos.result}:</strong> {
                      q.responseValidated === "correct"
                        ? t.alumnos.correctAnswer
                        : q.responseValidated === "incorrect"
                          ? t.alumnos.incorrectAnswer
                          : t.alumnos.unvalidated
                    }</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {student.ratingDetails.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6", marginBottom: 8 }}>✍️ {t.alumnos.rated}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {student.ratingDetails.map((r, idx) => (
                  <div key={idx} style={{ padding: "6px 12px", borderRadius: 8, backgroundColor: r.rating === "green" ? "#dcfce7" : r.rating === "yellow" ? "#fef3c7" : "#fee2e2", color: r.rating === "green" ? "#166534" : r.rating === "yellow" ? "#a16207" : "#991b1b", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    {r.rating === "green" ? "🟩" : r.rating === "yellow" ? "🟨" : "🟥"}
                    {r.validated === true && <span>✅</span>}
                    {r.validated === false && <span>❌</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>✅ {student.ratingsAccepted} {t.alumnos.accepted} • ❌ {student.ratingsRejected} {t.alumnos.rejected}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelfEvalCard({ evaluation, t, formatDate, renderRating }: { evaluation: SelfEvaluation; t: any; formatDate: (ts: number) => string; renderRating: (val: number | undefined) => string }) {
  return (
    <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: 20, border: `2px solid ${evaluation.validated ? "#22c55e" : "#e2e8f0"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{evaluation.studentName}</span>
            <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: evaluation.validated ? "#dcfce7" : "#fef3c7", color: evaluation.validated ? "#166534" : "#92400e" }}>
              {evaluation.validated ? t.selfEval.validated : t.selfEval.pending}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{t.selfEval.team}: {evaluation.teamName}</div>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{formatDate(evaluation.submittedAt)}</div>
      </div>

      {evaluation.receivedHelp && evaluation.receivedHelp.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#22c55e", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>🤝 {t.selfEval.receivedHelp}</div>
          {evaluation.receivedHelp.map((help, idx) => (
            <div key={idx} style={{ backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 8, borderLeft: "3px solid #22c55e" }}>
              {help.concept && <div style={{ fontWeight: 600, marginBottom: 4 }}>{help.concept}</div>}
              {help.fromWho && help.fromWho.length > 0 && <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{t.selfEval.fromWho}: {help.fromWho.join(", ")}</div>}
              {help.description && <div style={{ fontSize: 13, color: "#374151" }}>{help.description}</div>}
            </div>
          ))}
        </div>
      )}

      {evaluation.gaveHelp && evaluation.gaveHelp.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>💡 {t.selfEval.gaveHelp}</div>
          {evaluation.gaveHelp.map((help, idx) => (
            <div key={idx} style={{ backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 8, borderLeft: "3px solid #3b82f6" }}>
              {help.concept && <div style={{ fontWeight: 600, marginBottom: 4 }}>{help.concept}</div>}
              {help.toWho && help.toWho.length > 0 && <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{t.selfEval.toWho}: {help.toWho.join(", ")}</div>}
              {help.description && <div style={{ fontSize: 13, color: "#374151" }}>{help.description}</div>}
            </div>
          ))}
        </div>
      )}

      {(evaluation.difficultyRating || evaluation.confidenceBefore || evaluation.confidenceAfter) && (
        <div style={{ backgroundColor: "#faf5ff", borderRadius: 8, padding: 12, marginBottom: 16, borderLeft: "3px solid #8b5cf6" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#8b5cf6", marginBottom: 8 }}>🧠 {t.selfEval.metacognition}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {evaluation.difficultyRating && <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between" }}><span style={{ color: "#64748b" }}>{t.selfEval.difficulty}:</span><span>{renderRating(evaluation.difficultyRating)}</span></div>}
            {evaluation.confidenceBefore && <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between" }}><span style={{ color: "#64748b" }}>{t.selfEval.confidenceBefore}:</span><span>{renderRating(evaluation.confidenceBefore)}</span></div>}
            {evaluation.confidenceAfter && <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between" }}><span style={{ color: "#64748b" }}>{t.selfEval.confidenceAfter}:</span><span>{renderRating(evaluation.confidenceAfter)}</span></div>}
          </div>
        </div>
      )}

      {evaluation.teacherComment && (
        <div style={{ backgroundColor: "#fffbeb", borderRadius: 8, padding: 12, borderLeft: "3px solid #f59e0b" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#b45309", marginBottom: 4 }}>💬 {t.selfEval.teacherComment}</div>
          <div style={{ fontSize: 13, color: "#374151" }}>{evaluation.teacherComment}</div>
        </div>
      )}
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 16px", fontSize: 14, fontWeight: 600, backgroundColor: active ? "#3b82f6" : "white", color: active ? "white" : "#64748b", border: active ? "none" : "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}>
      {children}
    </button>
  );
}

const containerStyle: React.CSSProperties = { minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const contentStyle: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: 24 };
const cardStyle: React.CSSProperties = { backgroundColor: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };