// src/components/PostGame/TeacherEvaluationsPage.tsx
// 📋 Página para que el docente vea y valide las autoevaluaciones de un juego
// Ruta: /teacher/evaluations/:gameId
// ✅ CORREGIDO: Ahora lee el formato de SelfEvaluationPage (receivedHelp/gaveHelp)

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, onValue, get, update } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { Team } from "../../types/game";

// Estructura de ayuda recibida/dada (como la guarda SelfEvaluationPage)
interface HelpBlock {
  concept: string;
  fromWho?: string[];  // Para receivedHelp
  toWho?: string[];    // Para gaveHelp
  description: string;
}

// Estructura de una autoevaluación (como la guarda SelfEvaluationPage)
interface SelfEvaluation {
  // ID generado por Firebase push()
  odgId: string;
  
  // Datos básicos
  gameId: string;
  teamId: string;
  teamName: string;
  studentName: string;  // ← Antes era playerName
  language?: string;
  
  // Bloques de ayuda (formato de SelfEvaluationPage)
  receivedHelp: HelpBlock[];  // ← Antes era helpedBy: string[]
  gaveHelp: HelpBlock[];      // ← Antes era helpedOthers: string[]
  
  // Metacognición (opcional, si se agrega después)
  difficultyRating?: number;
  confidenceBefore?: number;
  confidenceAfter?: number;
  
  // Timestamps y validación
  submittedAt: number;
  validated?: boolean;
  teacherComment?: string;
  validatedAt?: number;
}

export function TeacherEvaluationsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { language } = useI18n();

  // Estados
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<SelfEvaluation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [gameName, setGameName] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "validated">("all");
  
  // Modal de detalle
  const [selectedEval, setSelectedEval] = useState<SelfEvaluation | null>(null);
  const [teacherComment, setTeacherComment] = useState("");
  const [saving, setSaving] = useState(false);

  const texts = {
    es: {
      title: "Autoevaluaciones",
      back: "← Volver",
      loading: "Cargando...",
      noEvaluations: "Aún no hay autoevaluaciones enviadas",
      waitingForStudents: "Esperando que los alumnos completen sus autoevaluaciones...",
      filterAll: "Todas",
      filterPending: "Pendientes",
      filterValidated: "Validadas",
      total: "Total",
      validated: "Validadas",
      pending: "Pendientes",
      student: "Estudiante",
      team: "Equipo",
      // Sección de ayuda recibida
      receivedHelpTitle: "🤝 Ayuda que recibió",
      concept: "Concepto",
      fromWho: "De quién",
      howHelped: "Cómo ayudó",
      // Sección de ayuda dada
      gaveHelpTitle: "💡 Ayuda que dio",
      toWho: "A quién",
      // General
      noHelp: "No registró ayuda",
      nobody: "Nadie",
      metacognition: "Metacognición",
      difficulty: "Dificultad",
      confidenceBefore: "Confianza antes",
      confidenceAfter: "Confianza después",
      teacherComment: "Tu comentario",
      commentPlaceholder: "Escribí un comentario para el alumno (opcional)...",
      validate: "✅ Validar",
      save: "💾 Guardar",
      saving: "Guardando...",
      close: "Cerrar",
      validatedLabel: "Validada",
      pendingLabel: "Pendiente",
      submittedAt: "Enviado",
      refreshTip: "Las evaluaciones se actualizan automáticamente",
    },
    en: {
      title: "Self-Evaluations",
      back: "← Back",
      loading: "Loading...",
      noEvaluations: "No self-evaluations submitted yet",
      waitingForStudents: "Waiting for students to complete their self-evaluations...",
      filterAll: "All",
      filterPending: "Pending",
      filterValidated: "Validated",
      total: "Total",
      validated: "Validated",
      pending: "Pending",
      student: "Student",
      team: "Team",
      receivedHelpTitle: "🤝 Help received",
      concept: "Concept",
      fromWho: "From whom",
      howHelped: "How they helped",
      gaveHelpTitle: "💡 Help given",
      toWho: "To whom",
      noHelp: "No help recorded",
      nobody: "Nobody",
      metacognition: "Metacognition",
      difficulty: "Difficulty",
      confidenceBefore: "Confidence before",
      confidenceAfter: "Confidence after",
      teacherComment: "Your comment",
      commentPlaceholder: "Write a comment for the student (optional)...",
      validate: "✅ Validate",
      save: "💾 Save",
      saving: "Saving...",
      close: "Close",
      validatedLabel: "Validated",
      pendingLabel: "Pending",
      submittedAt: "Submitted",
      refreshTip: "Evaluations update automatically",
    },
    pt: {
      title: "Autoavaliações",
      back: "← Voltar",
      loading: "Carregando...",
      noEvaluations: "Ainda não há autoavaliações enviadas",
      waitingForStudents: "Aguardando os alunos completarem suas autoavaliações...",
      filterAll: "Todas",
      filterPending: "Pendentes",
      filterValidated: "Validadas",
      total: "Total",
      validated: "Validadas",
      pending: "Pendentes",
      student: "Estudante",
      team: "Equipe",
      receivedHelpTitle: "🤝 Ajuda recebida",
      concept: "Conceito",
      fromWho: "De quem",
      howHelped: "Como ajudou",
      gaveHelpTitle: "💡 Ajuda dada",
      toWho: "Para quem",
      noHelp: "Nenhuma ajuda registrada",
      nobody: "Ninguém",
      metacognition: "Metacognição",
      difficulty: "Dificuldade",
      confidenceBefore: "Confiança antes",
      confidenceAfter: "Confiança depois",
      teacherComment: "Seu comentário",
      commentPlaceholder: "Escreva um comentário para o aluno (opcional)...",
      validate: "✅ Validar",
      save: "💾 Salvar",
      saving: "Salvando...",
      close: "Fechar",
      validatedLabel: "Validada",
      pendingLabel: "Pendente",
      submittedAt: "Enviado",
      refreshTip: "As avaliações são atualizadas automaticamente",
    },
  };

  const t = texts[language] || texts.es;

  // Cargar datos del juego y escuchar evaluaciones
  useEffect(() => {
    if (!gameId) return;

    // Cargar info del juego una vez
    const loadGameInfo = async () => {
      try {
        const gameSnap = await get(ref(database, `games/${gameId}`));
        if (gameSnap.exists()) {
          const data = gameSnap.val();
          setGameName(data.config?.className || "");
          
          // Cargar equipos
          const teamsData = data.teams;
          const teamsList: Team[] = Array.isArray(teamsData)
            ? teamsData
            : Object.values(teamsData || {});
          setTeams(teamsList);
        }
      } catch (error) {
        console.error("Error loading game info:", error);
      }
    };

    loadGameInfo();

    // Escuchar evaluaciones en tiempo real
    // NOTA: También chequeamos selfEvaluations/{gameId} (ruta alternativa)
    const evalsRef = ref(database, `games/${gameId}/selfEvaluations`);
    const unsubscribe = onValue(evalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const evalsList: SelfEvaluation[] = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          odgId: key, // Guardar el key de Firebase como ID
        }));
        // Ordenar por fecha de envío (más recientes primero)
        evalsList.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        setEvaluations(evalsList);
      } else {
        setEvaluations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  // Helper: Extraer resumen de conceptos aprendidos para la preview
  const getConceptsSummary = (ev: SelfEvaluation): string => {
    const concepts: string[] = [];
    
    // Extraer conceptos de ayuda recibida
    if (ev.receivedHelp && ev.receivedHelp.length > 0) {
      ev.receivedHelp.forEach(h => {
        if (h.concept && h.concept.trim()) {
          concepts.push(h.concept.trim());
        }
      });
    }
    
    if (concepts.length === 0) {
      return "—";
    }
    
    return concepts.join("; ");
  };

  // Helper: Extraer todos los nombres de quienes ayudaron
  const getAllHelpersNames = (ev: SelfEvaluation): string[] => {
    const helpers: string[] = [];
    if (ev.receivedHelp) {
      ev.receivedHelp.forEach(h => {
        if (h.fromWho) {
          helpers.push(...h.fromWho);
        }
      });
    }
    return [...new Set(helpers)]; // Únicos
  };

  // Helper: Extraer todos los nombres de a quienes ayudó
  const getAllHelpedNames = (ev: SelfEvaluation): string[] => {
    const helped: string[] = [];
    if (ev.gaveHelp) {
      ev.gaveHelp.forEach(h => {
        if (h.toWho) {
          helped.push(...h.toWho);
        }
      });
    }
    return [...new Set(helped)]; // Únicos
  };

  // Filtrar evaluaciones
  const filteredEvaluations = evaluations.filter((ev) => {
    if (filter === "pending") return !ev.validated;
    if (filter === "validated") return ev.validated;
    return true;
  });

  // Stats
  const stats = {
    total: evaluations.length,
    validated: evaluations.filter((e) => e.validated).length,
    pending: evaluations.filter((e) => !e.validated).length,
  };

  // Validar una evaluación
  const handleValidate = async () => {
    if (!selectedEval || !gameId || saving) return;

    setSaving(true);
    try {
      const evalId = selectedEval.odgId;
      await update(ref(database, `games/${gameId}/selfEvaluations/${evalId}`), {
        validated: true,
        teacherComment: teacherComment.trim() || null,
        validatedAt: Date.now(),
      });
      setSelectedEval(null);
      setTeacherComment("");
    } catch (error) {
      console.error("Error validating evaluation:", error);
    } finally {
      setSaving(false);
    }
  };

  // Formatear fecha
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(
      language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US",
      { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }
    );
  };

  // Renderizar rating como estrellas
  const renderRating = (value: number | undefined) => {
    if (!value) return "—";
    return "⭐".repeat(value) + "☆".repeat(5 - value);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 8,
              padding: 0,
            }}
          >
            {t.back}
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
                📋 {t.title}
              </h1>
              {gameName && (
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>{gameName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats + Filters */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 24px" }}>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#3b82f6" }}>{stats.total}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t.total}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>{stats.validated}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t.validated}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{stats.pending}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t.pending}</div>
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

        {/* Tip */}
        <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 16 }}>
          🔄 {t.refreshTip}
        </p>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p style={{ color: "#64748b" }}>{t.loading}</p>
          </div>
        ) : evaluations.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              backgroundColor: "white",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <h3 style={{ margin: "0 0 8px", color: "#1e293b" }}>{t.noEvaluations}</h3>
            <p style={{ color: "#64748b", fontSize: 14 }}>{t.waitingForStudents}</p>
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
                  backgroundColor: "white",
                  borderRadius: 12,
                  border: `2px solid ${ev.validated ? "#22c55e" : "#e2e8f0"}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 16 }}>
                        {ev.studentName}
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: ev.validated ? "#dcfce7" : "#fef3c7",
                          color: ev.validated ? "#166534" : "#92400e",
                        }}
                      >
                        {ev.validated ? t.validatedLabel : t.pendingLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{ev.teamName}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    {ev.submittedAt && formatDate(ev.submittedAt)}
                  </span>
                </div>
                
                {/* Preview: conceptos aprendidos */}
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 14,
                    color: "#334155",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {getConceptsSummary(ev)}
                </p>
                
                {/* Preview: ayuda recibida/dada */}
                <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 12, color: "#64748b" }}>
                  {getAllHelpersNames(ev).length > 0 && (
                    <span>🤝 {getAllHelpersNames(ev).join(", ")}</span>
                  )}
                  {getAllHelpedNames(ev).length > 0 && (
                    <span>💡 → {getAllHelpedNames(ev).join(", ")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() => !saving && setSelectedEval(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              maxWidth: 550,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                    {selectedEval.studentName}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                    {selectedEval.teamName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEval(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Ayuda recibida - NUEVO FORMATO */}
            {selectedEval.receivedHelp && selectedEval.receivedHelp.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#10b981", display: "block", marginBottom: 12 }}>
                  {t.receivedHelpTitle}
                </label>
                {selectedEval.receivedHelp.map((help, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#f0fdf4",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
                      borderLeft: "3px solid #10b981",
                    }}
                  >
                    {help.concept && (
                      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                        📚 {help.concept}
                      </div>
                    )}
                    {help.fromWho && help.fromWho.length > 0 && (
                      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                        {t.fromWho}: <strong>{help.fromWho.join(", ")}</strong>
                      </div>
                    )}
                    {help.description && (
                      <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>
                        "{help.description}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Ayuda dada - NUEVO FORMATO */}
            {selectedEval.gaveHelp && selectedEval.gaveHelp.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6", display: "block", marginBottom: 12 }}>
                  {t.gaveHelpTitle}
                </label>
                {selectedEval.gaveHelp.map((help, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#eff6ff",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
                      borderLeft: "3px solid #3b82f6",
                    }}
                  >
                    {help.concept && (
                      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                        💡 {help.concept}
                      </div>
                    )}
                    {help.toWho && help.toWho.length > 0 && (
                      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                        {t.toWho}: <strong>{help.toWho.join(", ")}</strong>
                      </div>
                    )}
                    {help.description && (
                      <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>
                        "{help.description}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Si no hay ayuda registrada */}
            {(!selectedEval.receivedHelp || selectedEval.receivedHelp.length === 0) &&
             (!selectedEval.gaveHelp || selectedEval.gaveHelp.length === 0) && (
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 20,
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                {t.noHelp}
              </div>
            )}

            {/* Metacognición (si existe) */}
            {(selectedEval.difficultyRating || selectedEval.confidenceBefore || selectedEval.confidenceAfter) && (
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                  {t.metacognition}
                </label>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedEval.difficultyRating && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>{t.difficulty}:</span>
                      <span style={{ fontSize: 13 }}>{renderRating(selectedEval.difficultyRating)}</span>
                    </div>
                  )}
                  {selectedEval.confidenceBefore && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>{t.confidenceBefore}:</span>
                      <span style={{ fontSize: 13 }}>{renderRating(selectedEval.confidenceBefore)}</span>
                    </div>
                  )}
                  {selectedEval.confidenceAfter && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>{t.confidenceAfter}:</span>
                      <span style={{ fontSize: 13 }}>{renderRating(selectedEval.confidenceAfter)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comentario del docente */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                {t.teacherComment}
              </label>
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
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setSelectedEval(null)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 20px",
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
                  onClick={handleValidate}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    fontSize: 14,
                    fontWeight: 700,
                    backgroundColor: saving ? "#9ca3af" : "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: saving ? "wait" : "pointer",
                  }}
                >
                  {saving ? t.saving : t.validate}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}