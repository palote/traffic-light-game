// src/components/PostGame/ValidationPanel.tsx
// 📋 Panel para que el docente valide las autoevaluaciones de los estudiantes
// Muestra las respuestas y permite aprobar/comentar

import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { Team } from "../../types/game";

// Estructura de una autoevaluación individual
export interface SelfEvaluation {
  odgId: string;
  odgplayerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  
  // Respuestas
  whatLearned: string;
  helpedBy: string[];      // IDs de compañeros que lo ayudaron
  helpedOthers: string[];  // IDs de compañeros a quienes ayudó
  
  // Metacognición (opcional)
  difficultyRating?: 1 | 2 | 3 | 4 | 5;
  confidenceBefore?: 1 | 2 | 3 | 4 | 5;
  confidenceAfter?: 1 | 2 | 3 | 4 | 5;
  
  // Metadata
  submittedAt: number;
  
  // Validación del docente
  validated?: boolean;
  teacherComment?: string;
  validatedAt?: number;
}

interface ValidationPanelProps {
  gameId: string;
  teams: Team[];
  onClose: () => void;
}

export function ValidationPanel({ gameId, teams, onClose }: ValidationPanelProps) {
  const { language } = useI18n();
  
  const [evaluations, setEvaluations] = useState<SelfEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEval, setSelectedEval] = useState<SelfEvaluation | null>(null);
  const [teacherComment, setTeacherComment] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "validated">("all");

  const texts = {
    es: {
      title: "Validación de Autoevaluaciones",
      subtitle: "Revisá las reflexiones de tus alumnos",
      loading: "Cargando autoevaluaciones...",
      noEvaluations: "Aún no hay autoevaluaciones enviadas",
      filterAll: "Todas",
      filterPending: "Pendientes",
      filterValidated: "Validadas",
      team: "Equipo",
      student: "Estudiante",
      whatLearned: "¿Qué aprendí?",
      helpedBy: "Me ayudaron:",
      helpedOthers: "Ayudé a:",
      metacognition: "Metacognición",
      difficultyRating: "Dificultad percibida",
      confidenceBefore: "Confianza antes",
      confidenceAfter: "Confianza después",
      teacherComment: "Comentario del docente",
      commentPlaceholder: "Escribí un comentario para el alumno...",
      validate: "✅ Validar",
      validated: "Validada",
      pending: "Pendiente",
      close: "Cerrar",
      of: "de",
    },
    en: {
      title: "Self-Evaluation Validation",
      subtitle: "Review your students' reflections",
      loading: "Loading self-evaluations...",
      noEvaluations: "No self-evaluations submitted yet",
      filterAll: "All",
      filterPending: "Pending",
      filterValidated: "Validated",
      team: "Team",
      student: "Student",
      whatLearned: "What did I learn?",
      helpedBy: "Helped by:",
      helpedOthers: "I helped:",
      metacognition: "Metacognition",
      difficultyRating: "Perceived difficulty",
      confidenceBefore: "Confidence before",
      confidenceAfter: "Confidence after",
      teacherComment: "Teacher's comment",
      commentPlaceholder: "Write a comment for the student...",
      validate: "✅ Validate",
      validated: "Validated",
      pending: "Pending",
      close: "Close",
      of: "of",
    },
    pt: {
      title: "Validação de Autoavaliações",
      subtitle: "Revise as reflexões dos seus alunos",
      loading: "Carregando autoavaliações...",
      noEvaluations: "Ainda não há autoavaliações enviadas",
      filterAll: "Todas",
      filterPending: "Pendentes",
      filterValidated: "Validadas",
      team: "Equipe",
      student: "Estudante",
      whatLearned: "O que aprendi?",
      helpedBy: "Me ajudaram:",
      helpedOthers: "Ajudei:",
      metacognition: "Metacognição",
      difficultyRating: "Dificuldade percebida",
      confidenceBefore: "Confiança antes",
      confidenceAfter: "Confiança depois",
      teacherComment: "Comentário do professor",
      commentPlaceholder: "Escreva um comentário para o aluno...",
      validate: "✅ Validar",
      validated: "Validada",
      pending: "Pendente",
      close: "Fechar",
      of: "de",
    },
  };

  const t = texts[language] || texts.es;

  // Escuchar autoevaluaciones en tiempo real
  useEffect(() => {
    const evalsRef = ref(database, `games/${gameId}/selfEvaluations`);
    
    const unsubscribe = onValue(evalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const evalsList: SelfEvaluation[] = Object.values(data);
        setEvaluations(evalsList);
      } else {
        setEvaluations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  // Filtrar evaluaciones
  const filteredEvaluations = evaluations.filter((ev) => {
    if (filter === "pending") return !ev.validated;
    if (filter === "validated") return ev.validated;
    return true;
  });

  // Validar una evaluación
  const handleValidate = async (evalId: string) => {
    try {
      await update(ref(database, `games/${gameId}/selfEvaluations/${evalId}`), {
        validated: true,
        teacherComment: teacherComment || null,
        validatedAt: Date.now(),
      });
      setSelectedEval(null);
      setTeacherComment("");
    } catch (error) {
      console.error("Error validating evaluation:", error);
    }
  };

  // Estadísticas rápidas
  const stats = {
    total: evaluations.length,
    validated: evaluations.filter((e) => e.validated).length,
    pending: evaluations.filter((e) => !e.validated).length,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          width: "100%",
          maxWidth: 900,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
              📋 {t.title}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        {/* Stats + Filters */}
        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Total</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{stats.validated}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t.filterValidated}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{stats.pending}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t.filterPending}</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["all", "pending", "validated"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: filter === f ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                  backgroundColor: filter === f ? "#eff6ff" : "white",
                  color: filter === f ? "#3b82f6" : "#64748b",
                  cursor: "pointer",
                }}
              >
                {f === "all" ? t.filterAll : f === "pending" ? t.filterPending : t.filterValidated}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              ⏳ {t.loading}
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              📭 {t.noEvaluations}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredEvaluations.map((ev) => (
                <div
                  key={ev.odgId}
                  onClick={() => {
                    setSelectedEval(ev);
                    setTeacherComment(ev.teacherComment || "");
                  }}
                  style={{
                    padding: 16,
                    backgroundColor: ev.validated ? "#f0fdf4" : "#fffbeb",
                    borderRadius: 12,
                    border: `2px solid ${ev.validated ? "#22c55e" : "#f59e0b"}`,
                    cursor: "pointer",
                    transition: "transform 0.1s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#1e293b" }}>{ev.playerName}</span>
                      <span style={{ color: "#64748b", marginLeft: 8 }}>({ev.teamName})</span>
                    </div>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: ev.validated ? "#22c55e" : "#f59e0b",
                        color: "white",
                      }}
                    >
                      {ev.validated ? t.validated : t.pending}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 14,
                      color: "#334155",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    "{ev.whatLearned}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {t.close}
          </button>
        </div>
      </div>

      {/* Modal de detalle */}
      {selectedEval && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            padding: 20,
          }}
          onClick={() => setSelectedEval(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              maxWidth: 500,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>
              {selectedEval.playerName}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{t.whatLearned}</label>
              <p style={{ margin: "4px 0 0", color: "#1e293b" }}>{selectedEval.whatLearned}</p>
            </div>

            {selectedEval.difficultyRating && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{t.metacognition}</label>
                <p style={{ margin: "4px 0 0", color: "#1e293b" }}>
                  {t.difficultyRating}: {selectedEval.difficultyRating}/5
                </p>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{t.teacherComment}</label>
              <textarea
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
                placeholder={t.commentPlaceholder}
                rows={3}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setSelectedEval(null)}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
              {!selectedEval.validated && (
                <button
                  onClick={() => handleValidate(selectedEval.odgId)}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  {t.validate}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}