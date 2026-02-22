// src/components/ClassroomAnnouncementModal.tsx
// 📢 Modal para publicar anuncio de autoevaluación en Google Classroom

import { useState, useEffect } from "react";
import {
  getCourses,
  createSelfEvaluationAnnouncement,
  type ClassroomCourse,
} from "../services/classroomService";

interface ClassroomAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationLink: string;
  gameName: string;
  language: "es" | "en" | "pt";
}

type ModalState = "loading" | "select-course" | "preview" | "publishing" | "success" | "error";

export function ClassroomAnnouncementModal({
  isOpen,
  onClose,
  evaluationLink,
  gameName,
  language,
}: ClassroomAnnouncementModalProps) {
  const [state, setState] = useState<ModalState>("loading");
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [error, setError] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");

  const texts = {
    es: {
      title: "📢 Publicar en Google Classroom",
      selectCourse: "Seleccioná el curso",
      selectCourseHint: "El anuncio aparecerá en el stream del curso y los alumnos recibirán una notificación",
      noCourses: "No se encontraron cursos activos",
      noCoursesHint: "Asegurate de ser docente en al menos un curso de Google Classroom.",
      loading: "Cargando cursos...",
      publishing: "Publicando anuncio...",
      preview: "Vista previa del anuncio",
      previewHint: "Este mensaje se publicará en el curso:",
      messageTitle: "📝 ¡Hora de la autoevaluación!",
      messageBody: `Completá tu autoevaluación del juego "${gameName}":`,
      messageReminder: "Recordá mencionar quién te ayudó y a quién ayudaste durante el juego.",
      editMessage: "Editar mensaje (opcional)",
      publish: "📢 Publicar anuncio",
      cancel: "Cancelar",
      back: "← Volver",
      success: "¡Anuncio publicado!",
      successHint: "Los alumnos recibirán una notificación en Google Classroom.",
      close: "Cerrar",
      error: "Error",
      retry: "Reintentar",
    },
    en: {
      title: "📢 Post to Google Classroom",
      selectCourse: "Select a course",
      selectCourseHint: "The announcement will appear in the course stream and students will be notified",
      noCourses: "No active courses found",
      noCoursesHint: "Make sure you are a teacher in at least one Google Classroom course.",
      loading: "Loading courses...",
      publishing: "Publishing announcement...",
      preview: "Announcement preview",
      previewHint: "This message will be posted to the course:",
      messageTitle: "📝 Self-evaluation time!",
      messageBody: `Complete your self-evaluation for the game "${gameName}":`,
      messageReminder: "Remember to mention who helped you and who you helped during the game.",
      editMessage: "Edit message (optional)",
      publish: "📢 Publish announcement",
      cancel: "Cancel",
      back: "← Back",
      success: "Announcement published!",
      successHint: "Students will receive a notification in Google Classroom.",
      close: "Close",
      error: "Error",
      retry: "Retry",
    },
    pt: {
      title: "📢 Publicar no Google Classroom",
      selectCourse: "Selecione um curso",
      selectCourseHint: "O anúncio aparecerá no stream do curso e os alunos serão notificados",
      noCourses: "Nenhum curso ativo encontrado",
      noCoursesHint: "Certifique-se de ser professor em pelo menos um curso do Google Classroom.",
      loading: "Carregando cursos...",
      publishing: "Publicando anúncio...",
      preview: "Prévia do anúncio",
      previewHint: "Esta mensagem será publicada no curso:",
      messageTitle: "📝 Hora da autoavaliação!",
      messageBody: `Complete sua autoavaliação do jogo "${gameName}":`,
      messageReminder: "Lembre-se de mencionar quem te ajudou e quem você ajudou durante o jogo.",
      editMessage: "Editar mensagem (opcional)",
      publish: "📢 Publicar anúncio",
      cancel: "Cancelar",
      back: "← Voltar",
      success: "Anúncio publicado!",
      successHint: "Os alunos receberão uma notificação no Google Classroom.",
      close: "Fechar",
      error: "Erro",
      retry: "Tentar novamente",
    },
  };

  const t = texts[language];

  // Cargar cursos al abrir
  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen]);

  // Resetear al cerrar
  useEffect(() => {
    if (!isOpen) {
      setState("loading");
      setCourses([]);
      setSelectedCourse(null);
      setError("");
      setCustomMessage("");
    }
  }, [isOpen]);

  const loadCourses = async () => {
    setState("loading");
    setError("");
    try {
      const coursesData = await getCourses();
      setCourses(coursesData);
      setState("select-course");
    } catch (err: any) {
      setError(err.message || "Error loading courses");
      setState("error");
    }
  };

  const getDefaultMessage = () => {
    return `${t.messageTitle}\n\n${t.messageBody}\n${evaluationLink}\n\n${t.messageReminder}`;
  };

  const handleSelectCourse = (course: ClassroomCourse) => {
    setSelectedCourse(course);
    setCustomMessage(getDefaultMessage());
    setState("preview");
  };

  const handlePublish = async () => {
    if (!selectedCourse) return;

    setState("publishing");
    setError("");

    try {
      await createSelfEvaluationAnnouncement(
        selectedCourse.id,
        evaluationLink,
        gameName,
        language
      );
      setState("success");
    } catch (err: any) {
      setError(err.message || "Error publishing announcement");
      setState("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.title}</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Loading */}
          {state === "loading" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
              <p style={{ color: "#64748b" }}>{t.loading}</p>
            </div>
          )}

          {/* Select Course */}
          {state === "select-course" && (
            <div>
              <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#334155" }}>
                {t.selectCourse}
              </p>
              <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748b" }}>
                {t.selectCourseHint}
              </p>

              {courses.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: 32, 
                  backgroundColor: "#fef3c7", 
                  borderRadius: 12,
                  border: "1px solid #fbbf24",
                }}>
                  <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#92400e" }}>
                    {t.noCourses}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#a16207" }}>
                    {t.noCoursesHint}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: "2px solid #e2e8f0",
                        backgroundColor: "white",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#4285f4";
                        e.currentTarget.style.backgroundColor = "#eff6ff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.backgroundColor = "white";
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>
                        {course.name}
                      </div>
                      {course.section && (
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {course.section}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={onClose} style={secondaryButtonStyle}>
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {state === "preview" && selectedCourse && (
            <div>
              <p style={{ margin: "0 0 4px 0", fontSize: 13, color: "#64748b" }}>
                Curso: <strong>{selectedCourse.name}</strong>
              </p>
              
              <p style={{ margin: "16px 0 8px 0", fontWeight: 600, color: "#334155" }}>
                {t.preview}
              </p>
              <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b" }}>
                {t.previewHint}
              </p>

              <div style={{
                padding: 16,
                backgroundColor: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                whiteSpace: "pre-wrap",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#334155",
              }}>
                {customMessage}
              </div>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
                <button 
                  onClick={() => setState("select-course")} 
                  style={secondaryButtonStyle}
                >
                  {t.back}
                </button>
                <button onClick={handlePublish} style={primaryButtonStyle}>
                  {t.publish}
                </button>
              </div>
            </div>
          )}

          {/* Publishing */}
          {state === "publishing" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>📤</div>
              <p style={{ color: "#64748b" }}>{t.publishing}</p>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                borderRadius: "50%", 
                backgroundColor: "#dcfce7", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <span style={{ fontSize: 40 }}>✅</span>
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "#16a34a" }}>{t.success}</h3>
              <p style={{ margin: "0 0 24px 0", color: "#64748b", fontSize: 14 }}>
                {t.successHint}
              </p>
              <button onClick={onClose} style={primaryButtonStyle}>
                {t.close}
              </button>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                borderRadius: "50%", 
                backgroundColor: "#fef2f2", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <span style={{ fontSize: 40 }}>❌</span>
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "#dc2626" }}>{t.error}</h3>
              <p style={{ margin: "0 0 24px 0", color: "#64748b", fontSize: 14 }}>
                {error}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={onClose} style={secondaryButtonStyle}>
                  {t.cancel}
                </button>
                <button onClick={loadCourses} style={primaryButtonStyle}>
                  {t.retry}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ESTILOS
// ============================================

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 16,
  width: "100%",
  maxWidth: 500,
  maxHeight: "85vh",
  overflow: "hidden",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#eff6ff",
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 20,
  cursor: "pointer",
  color: "#64748b",
  padding: 4,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  border: "none",
  backgroundColor: "#4285f4",
  color: "white",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  border: "2px solid #e2e8f0",
  backgroundColor: "white",
  color: "#64748b",
  cursor: "pointer",
};