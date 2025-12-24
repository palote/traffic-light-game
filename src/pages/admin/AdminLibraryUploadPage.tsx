// src/pages/admin/AdminLibraryUploadPage.tsx
// Página para que admins suban nuevos CSVs a la biblioteca

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { uploadLibraryItem } from "../../services/libraryService";
import { parseCSV } from "../../utils/csvParser";
import type { Grade, Subject, NewCSVLibraryItem } from "../../types/library";

const GRADES: Grade[] = ['3°', '4°', '5°', '6°', '7°'];
const SUBJECTS: Subject[] = ['Lengua', 'Matemática', 'Ciencias Naturales', 'Ciencias Sociales'];

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    padding: "24px 32px",
    color: "white",
    boxShadow: "0 4px 20px rgba(245, 158, 11, 0.3)",
  },
  headerContent: {
    maxWidth: 800,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },
  content: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "32px 24px",
  },
  form: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: "#475569",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    outline: "none",
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    minHeight: 80,
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    cursor: "pointer",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  fileInput: {
    padding: "12px",
    border: "2px dashed #e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    cursor: "pointer",
  },
  preview: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    border: "2px solid #22c55e",
  },
  previewTitle: {
    margin: "0 0 8px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#16a34a",
  },
  previewText: {
    margin: 0,
    fontSize: 13,
    color: "#166534",
  },
  error: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    border: "2px solid #ef4444",
    color: "#dc2626",
    fontSize: 13,
  },
  submitBtn: {
    width: "100%",
    padding: "14px 20px",
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    cursor: "pointer",
    marginTop: 24,
  },
  successMessage: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    border: "2px solid #22c55e",
    textAlign: "center" as const,
  },
};

export function AdminLibraryUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState<Grade>("3°");
  const [subject, setSubject] = useState<Subject>("Lengua");
  const [content, setContent] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(0);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setError(null);

    // Leer contenido
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      // Validar parseando
      try {
        const result = await parseCSV(text);
        setQuestionCount(result.questions.length);
        
        // Auto-completar título si está vacío
        if (!title && file.name) {
          const autoTitle = file.name
            .replace(".csv", "")
            .replace(/_/g, " ")
            .replace(/-/g, " ");
          setTitle(autoTitle);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al parsear CSV");
        setQuestionCount(0);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content || !csvContent) {
      setError("Completá todos los campos");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const item: NewCSVLibraryItem = {
        title,
        grade,
        subject,
        content,
        language: "es",
        storagePath: "", // Se llena en el servicio
        questionCount,
        createdBy: user?.uid,
      };

      await uploadLibraryItem(item, csvContent);
      setSuccess(true);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate("/library");
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setIsUploading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>📤 Subir CSV</h1>
          </div>
        </header>
        <main style={styles.content}>
          <div style={styles.successMessage}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: "0 0 8px 0", color: "#16a34a" }}>
              ¡CSV subido exitosamente!
            </h2>
            <p style={{ margin: 0, color: "#166534" }}>
              Redirigiendo a la biblioteca...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <button
              style={styles.backBtn}
              onClick={() => navigate("/library")}
            >
              ← Volver
            </button>
            <h1 style={styles.title}>📤 Subir nuevo CSV</h1>
          </div>
        </div>
      </header>

      <main style={styles.content}>
        <form style={styles.form} onSubmit={handleSubmit}>
          {/* Título */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Título del banco de preguntas</label>
            <input
              type="text"
              style={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Vertebrados e Invertebrados"
            />
          </div>

          {/* Grado y Materia */}
          <div style={{ ...styles.formGroup, ...styles.row }}>
            <div>
              <label style={styles.label}>Grado</label>
              <select
                style={styles.select}
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade)}
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g} grado</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Materia</label>
              <select
                style={styles.select}
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Descripción del contenido</label>
            <textarea
              style={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ej: Clasificación de animales según su columna vertebral..."
            />
          </div>

          {/* Archivo CSV */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Archivo CSV</label>
            <input
              type="file"
              accept=".csv"
              style={styles.fileInput}
              onChange={handleFileChange}
            />
          </div>

          {/* Preview del CSV */}
          {csvFile && questionCount > 0 && (
            <div style={styles.preview}>
              <h4 style={styles.previewTitle}>✅ CSV válido</h4>
              <p style={styles.previewText}>
                Archivo: {csvFile.name}<br />
                Preguntas detectadas: {questionCount}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={styles.error}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              opacity: isUploading ? 0.7 : 1,
            }}
            disabled={isUploading || !csvContent || questionCount === 0}
          >
            {isUploading ? "Subiendo..." : "📤 Subir a la biblioteca"}
          </button>
        </form>
      </main>
    </div>
  );
}