// src/pages/admin/AdminLibraryUploadPage.tsx
// Página para que admins suban nuevos CSVs a la biblioteca

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { uploadLibraryItem, readFileWithEncoding } from "../../services/libraryService";
import { parseCSV } from "../../utils/csvParser";
import type { NewCSVLibraryItem, LibraryGameMode, LibraryLanguage } from "../../types/library";
import { PRIMARY_GRADES, AREAS_ES, AREAS_EN, AREAS_PT, SUBJECTS_ES, SUBJECTS_EN, SUBJECTS_PT } from "../../types/library";

const styles: Record<string, React.CSSProperties> = {
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
  section: {
    marginBottom: 28,
    paddingBottom: 24,
    borderBottom: "1px solid #e2e8f0",
  },
  sectionTitle: {
    margin: "0 0 16px 0",
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: "#475569",
  },
  labelOptional: {
    fontWeight: 400,
    color: "#94a3b8",
    fontSize: 12,
    marginLeft: 4,
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
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  row3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 16,
  },
  fileInput: {
    padding: "16px",
    border: "2px dashed #e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box" as const,
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
  txtPreview: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    border: "2px solid #0ea5e9",
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
    padding: "16px 20px",
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    cursor: "pointer",
    marginTop: 8,
  },
  successMessage: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    border: "2px solid #22c55e",
    textAlign: "center" as const,
  },
  gameModeBtn: {
    flex: 1,
    padding: "16px",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center" as const,
  },
};

export function AdminLibraryUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Configuración base
  const [gameMode, setGameMode] = useState<LibraryGameMode>("traffic-light");
  const [language, setLanguage] = useState<LibraryLanguage>("es");

  // Metadata
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState<string>("3°");
  const [area, setArea] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [mainContents, setMainContents] = useState("");
  const [mainSkills, setMainSkills] = useState("");

  // Archivos
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(0);
  
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const [txtContent, setTxtContent] = useState<string | null>(null);

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Listas dinámicas según idioma
  const areas = language === "es" ? AREAS_ES : language === "pt" ? AREAS_PT : AREAS_EN;
  const subjects = language === "es" ? SUBJECTS_ES : language === "pt" ? SUBJECTS_PT : SUBJECTS_EN;

  // Handlers
  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setError(null);

    try {
      const text = await readFileWithEncoding(file);
      setCsvContent(text);

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

  const handleTxtChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTxtFile(file);

    try {
      const text = await readFileWithEncoding(file);
      setTxtContent(text);
    } catch (err) {
      console.error("Error reading TXT:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !area || !csvContent) {
      setError("Completá al menos: título, área y archivo CSV");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const item: NewCSVLibraryItem = {
        title,
        topic: topic || title,
        gameMode,
        language,
        grade: gameMode === "traffic-light" ? grade : undefined,
        level: gameMode === "coopetition" ? "secondary" : undefined,
        area,
        subject: subject || undefined,
        mainContents: mainContents || undefined,
        mainSkills: mainSkills || undefined,
        storagePath: "", // Se llena en el servicio
        questionCount,
        createdBy: user?.uid,
      };

      await uploadLibraryItem(item, csvContent, txtContent || undefined);
      setSuccess(true);

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
              ¡Tarjeta creada exitosamente!
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
            <button style={styles.backBtn} onClick={() => navigate("/library")}>
              ← Volver
            </button>
            <h1 style={styles.title}>📤 Nueva tarjeta de biblioteca</h1>
          </div>
        </div>
      </header>

      <main style={styles.content}>
        <form style={styles.form} onSubmit={handleSubmit}>
          
          {/* SECCIÓN 1: Modo de juego e idioma */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🎮 Configuración del juego</h3>
            
            {/* Game Mode */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Modo de juego</label>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setGameMode("traffic-light")}
                  style={{
                    ...styles.gameModeBtn,
                    backgroundColor: gameMode === "traffic-light" ? "#dcfce7" : "#f8fafc",
                    border: gameMode === "traffic-light" ? "2px solid #22c55e" : "2px solid #e2e8f0",
                    color: gameMode === "traffic-light" ? "#16a34a" : "#64748b",
                  }}
                >
                  🚦 Traffic Light
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Primaria</div>
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode("coopetition")}
                  style={{
                    ...styles.gameModeBtn,
                    backgroundColor: gameMode === "coopetition" ? "#eef2ff" : "#f8fafc",
                    border: gameMode === "coopetition" ? "2px solid #6366f1" : "2px solid #e2e8f0",
                    color: gameMode === "coopetition" ? "#4f46e5" : "#64748b",
                  }}
                >
                  🎯 Coopetition
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Secundaria+</div>
                </button>
              </div>
            </div>

            {/* Idioma */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Idioma</label>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setLanguage("es"); setArea(""); setSubject(""); }}
                  style={{
                    ...styles.gameModeBtn,
                    backgroundColor: language === "es" ? "#fef3c7" : "#f8fafc",
                    border: language === "es" ? "2px solid #f59e0b" : "2px solid #e2e8f0",
                    color: language === "es" ? "#b45309" : "#64748b",
                  }}
                >
                  🇪🇸 Español
                </button>
                <button
                  type="button"
                  onClick={() => { setLanguage("en"); setArea(""); setSubject(""); }}
                  style={{
                    ...styles.gameModeBtn,
                    backgroundColor: language === "en" ? "#cffafe" : "#f8fafc",
                    border: language === "en" ? "2px solid #0891b2" : "2px solid #e2e8f0",
                    color: language === "en" ? "#0e7490" : "#64748b",
                  }}
                >
                  🇺🇸 English
                </button>
                {/* ✅ NUEVO: Portugués */}
                <button
                  type="button"
                  onClick={() => { setLanguage("pt"); setArea(""); setSubject(""); }}
                  style={{
                    ...styles.gameModeBtn,
                    backgroundColor: language === "pt" ? "#dcfce7" : "#f8fafc",
                    border: language === "pt" ? "2px solid #22c55e" : "2px solid #e2e8f0",
                    color: language === "pt" ? "#16a34a" : "#64748b",
                  }}
                >
                  🇧🇷 Português
                </button>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Información básica */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📝 Información básica</h3>
            
            {/* Título */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Título *</label>
              <input
                type="text"
                style={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Vertebrados e Invertebrados"
              />
            </div>

            {/* Topic */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Tema / Topic
                <span style={styles.labelOptional}>(opcional)</span>
              </label>
              <input
                type="text"
                style={styles.input}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: Clasificación de animales"
              />
            </div>

            {/* Grado, Área, Materia */}
            <div style={styles.row3}>
              {gameMode === "traffic-light" && (
                <div>
                  <label style={styles.label}>Grado</label>
                  <select
                    style={styles.select}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    {PRIMARY_GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label style={styles.label}>Área *</label>
                <select
                  style={styles.select}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={styles.label}>
                  Materia
                  <span style={styles.labelOptional}>(opcional)</span>
                </label>
                <select
                  style={styles.select}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Contenidos y habilidades */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🎯 Contenidos y habilidades</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Contenidos principales
                <span style={styles.labelOptional}>(opcional)</span>
              </label>
              <textarea
                style={styles.textarea}
                value={mainContents}
                onChange={(e) => setMainContents(e.target.value)}
                placeholder="Ej: Clasificación de animales según su columna vertebral; Características de vertebrados e invertebrados"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Habilidades desarrolladas
                <span style={styles.labelOptional}>(opcional)</span>
              </label>
              <textarea
                style={styles.textarea}
                value={mainSkills}
                onChange={(e) => setMainSkills(e.target.value)}
                placeholder="Ej: Comparación; Clasificación; Argumentación"
              />
            </div>
          </div>

          {/* SECCIÓN 4: Archivos */}
          <div style={{ ...styles.section, borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
            <h3 style={styles.sectionTitle}>📁 Archivos</h3>
            
            {/* CSV */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Archivo CSV con preguntas *</label>
              <input
                type="file"
                accept=".csv"
                style={styles.fileInput}
                onChange={handleCsvChange}
              />
              {csvFile && questionCount > 0 && (
                <div style={styles.preview}>
                  <h4 style={styles.previewTitle}>✅ CSV válido</h4>
                  <p style={styles.previewText}>
                    Archivo: {csvFile.name}<br />
                    Preguntas detectadas: {questionCount}
                  </p>
                </div>
              )}
            </div>

            {/* TXT */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Material complementario (TXT)
                <span style={styles.labelOptional}>(opcional)</span>
              </label>
              <input
                type="file"
                accept=".txt"
                style={styles.fileInput}
                onChange={handleTxtChange}
              />
              {txtFile && txtContent && (
                <div style={styles.txtPreview}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "#0369a1" }}>
                    📄 TXT cargado
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: "#0c4a6e" }}>
                    Archivo: {txtFile.name}<br />
                    Tamaño: {(txtContent.length / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
            </div>
          </div>

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
              cursor: isUploading ? "wait" : "pointer",
            }}
            disabled={isUploading || !csvContent || questionCount === 0}
          >
            {isUploading ? "⏳ Subiendo..." : "📤 Crear tarjeta en biblioteca"}
          </button>
        </form>
      </main>
    </div>
  );
}