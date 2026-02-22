// src/components/ImportFromClassroomModal.tsx
// 📚 Modal para seleccionar un curso de Google Classroom e importar alumnos

import { useState, useEffect } from "react";
import {
  getCourses,
  getStudents,
  clearClassroomToken,
  type ClassroomCourse,
  type ClassroomStudent,
} from "../services/classroomService";

interface ImportFromClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (studentNames: string[]) => void;
  language: "es" | "en" | "pt";
}

type ModalState = "loading" | "courses" | "students" | "error" | "success";

export function ImportFromClassroomModal({
  isOpen,
  onClose,
  onImport,
  language,
}: ImportFromClassroomModalProps) {
  const [state, setState] = useState<ModalState>("loading");
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [error, setError] = useState<string>("");
  const [importedCount, setImportedCount] = useState(0);

  const texts = {
    es: {
      title: "Importar desde Google Classroom",
      selectCourse: "Seleccioná un curso",
      noCourses: "No se encontraron cursos activos",
      noCoursesHint: "Asegurate de ser docente en al menos un curso de Google Classroom.",
      loading: "Cargando...",
      loadingCourses: "Obteniendo tus cursos...",
      loadingStudents: "Obteniendo estudiantes...",
      students: "estudiantes",
      import: "Importar",
      importAll: "Importar todos",
      cancel: "Cancelar",
      back: "← Volver",
      close: "Cerrar",
      success: "importados correctamente",
      error: "Error",
      retry: "Reintentar",
      authorizeHint: "Se abrirá una ventana para autorizar el acceso a Google Classroom",
      noStudents: "Este curso no tiene estudiantes",
      section: "Sección",
    },
    en: {
      title: "Import from Google Classroom",
      selectCourse: "Select a course",
      noCourses: "No active courses found",
      noCoursesHint: "Make sure you are a teacher in at least one Google Classroom course.",
      loading: "Loading...",
      loadingCourses: "Getting your courses...",
      loadingStudents: "Getting students...",
      students: "students",
      import: "Import",
      importAll: "Import all",
      cancel: "Cancel",
      back: "← Back",
      close: "Close",
      success: "imported successfully",
      error: "Error",
      retry: "Retry",
      authorizeHint: "A window will open to authorize access to Google Classroom",
      noStudents: "This course has no students",
      section: "Section",
    },
    pt: {
      title: "Importar do Google Classroom",
      selectCourse: "Selecione um curso",
      noCourses: "Nenhum curso ativo encontrado",
      noCoursesHint: "Certifique-se de ser professor em pelo menos um curso do Google Classroom.",
      loading: "Carregando...",
      loadingCourses: "Obtendo seus cursos...",
      loadingStudents: "Obtendo estudantes...",
      students: "estudantes",
      import: "Importar",
      importAll: "Importar todos",
      cancel: "Cancelar",
      back: "← Voltar",
      close: "Fechar",
      success: "importados com sucesso",
      error: "Erro",
      retry: "Tentar novamente",
      authorizeHint: "Uma janela será aberta para autorizar o acesso ao Google Classroom",
      noStudents: "Este curso não tem estudantes",
      section: "Seção",
    },
  };

  const t = texts[language] || texts.es;

  // Cargar cursos al abrir
  useEffect(() => {
    if (isOpen) {
      loadCourses();
    } else {
      // Reset state when closing
      setState("loading");
      setCourses([]);
      setStudents([]);
      setSelectedCourse(null);
      setError("");
    }
  }, [isOpen]);

  const loadCourses = async () => {
    setState("loading");
    setError("");

    try {
      const coursesData = await getCourses();
      setCourses(coursesData);
      setState("courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setState("error");
    }
  };

  const loadStudents = async (course: ClassroomCourse) => {
    setSelectedCourse(course);
    setState("loading");
    setError("");

    try {
      const studentsData = await getStudents(course.id);
      setStudents(studentsData);
      setState("students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setState("error");
    }
  };

  const handleImport = () => {
    const names = students.map((s) => s.name);
    setImportedCount(names.length);
    onImport(names);
    setState("success");
  };

  const handleRetry = () => {
    clearClassroomToken();
    loadCourses();
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setStudents([]);
    setState("courses");
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          maxWidth: 500,
          width: "100%",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>📚</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1f2937" }}>
              {t.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#9ca3af",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {/* Loading State */}
          {state === "loading" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  border: "4px solid #e5e7eb",
                  borderTopColor: "#3b82f6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <p style={{ color: "#6b7280", margin: 0 }}>
                {selectedCourse ? t.loadingStudents : t.loadingCourses}
              </p>
              {!selectedCourse && (
                <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>
                  {t.authorizeHint}
                </p>
              )}
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h3 style={{ margin: "0 0 8px", color: "#dc2626" }}>{t.error}</h3>
              <p style={{ color: "#6b7280", marginBottom: 20 }}>{error}</p>
              <button
                onClick={handleRetry}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.retry}
              </button>
            </div>
          )}

          {/* Courses List */}
          {state === "courses" && (
            <>
              {courses.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <h3 style={{ margin: "0 0 8px", color: "#374151" }}>{t.noCourses}</h3>
                  <p style={{ color: "#6b7280", fontSize: 14 }}>{t.noCoursesHint}</p>
                </div>
              ) : (
                <>
                  <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 14 }}>
                    {t.selectCourse}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => loadStudents(course)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: 16,
                          backgroundColor: "#f9fafb",
                          border: "2px solid #e5e7eb",
                          borderRadius: 12,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#3b82f6";
                          e.currentTarget.style.backgroundColor = "#eff6ff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                      >
                        <span style={{ fontSize: 28 }}>🏫</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: "#1f2937", marginBottom: 2 }}>
                            {course.name}
                          </div>
                          {course.section && (
                            <div style={{ fontSize: 13, color: "#6b7280" }}>
                              {t.section}: {course.section}
                            </div>
                          )}
                        </div>
                        <span style={{ color: "#9ca3af", fontSize: 20 }}>→</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Students List */}
          {state === "students" && (
            <>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                {t.back}
              </button>

              <div
                style={{
                  padding: 12,
                  backgroundColor: "#eff6ff",
                  borderRadius: 8,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>🏫</span>
                <div>
                  <div style={{ fontWeight: 600, color: "#1e40af" }}>
                    {selectedCourse?.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#3b82f6" }}>
                    {students.length} {t.students}
                  </div>
                </div>
              </div>

              {students.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>
                  {t.noStudents}
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: 300,
                    overflow: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                >
                  {students.map((student, index) => (
                    <div
                      key={student.id}
                      style={{
                        padding: "10px 12px",
                        borderBottom: index < students.length - 1 ? "1px solid #f3f4f6" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt=""
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: "#e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            color: "#6b7280",
                          }}
                        >
                          {(student.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: "#1f2937", fontSize: 14 }}>
                          {student.name || "Sin nombre"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Success State */}
          {state === "success" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h3 style={{ margin: "0 0 8px", color: "#059669" }}>
                {importedCount} {t.students}
              </h3>
              <p style={{ color: "#6b7280" }}>{t.success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          {state === "students" && students.length > 0 && (
            <button
              onClick={handleImport}
              style={{
                padding: "10px 24px",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ✓ {t.importAll} ({students.length})
            </button>
          )}

          {state === "success" ? (
            <button
              onClick={onClose}
              style={{
                padding: "10px 24px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.close}
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: "10px 24px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.cancel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}