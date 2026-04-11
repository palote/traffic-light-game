import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { useGameMode } from "../contexts/GameModeContext";

const STORAGE_KEY = "planificacion_uses";
const FREE_LIMIT = 2;

type DuracionType = "Anual" | "Cuatrimestral" | "Bimestral" | "Por unidad";
type NivelType = "Primaria" | "Secundaria" | "Superior";
type ModalidadType = "Presencial" | "Virtual" | "Híbrida";
type EnfoqueType = "objetivos" | "capacidades";

interface FormData {
  institucion: string;
  docente: string;
  materia: string;
  nivel: NivelType;
  anio: string;
  duracion: DuracionType;
  eje: string;
  modalidad: ModalidadType;
  enfoqueObjetivos: EnfoqueType;
}

export default function PlanificacionGeneratorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [form, setForm] = useState<FormData>({
    institucion: "",
    docente: "",
    materia: "",
    nivel: "Secundaria",
    anio: "",
    duracion: "Anual",
    eje: "",
    modalidad: "Presencial",
    enfoqueObjetivos: "objetivos",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const getUses = () => parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  const incrementUses = () => localStorage.setItem(STORAGE_KEY, String(getUses() + 1));

  const canUse = () => {
    if (user) return true;
    return getUses() < FREE_LIMIT;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!canUse()) {
      setError("Alcanzaste el límite gratuito. Iniciá sesión para generar más planificaciones.");
      return;
    }

    if (!form.materia.trim() || !form.eje.trim()) {
      setError("Completá al menos la materia y el eje temático.");
      return;
    }

    setLoading(true);

    try {
      const functions = getFunctions();
      const generatePlanificacion = httpsCallable(functions, "generatePlanificacion");
      const result = await generatePlanificacion(form) as { data: { base64: string; filename: string } };

      const { base64, filename } = result.data;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      if (!user) incrementUses();
      setDownloaded(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al generar la planificación.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const usesLeft = FREE_LIMIT - getUses();

  // ─── Estilos del wrapper modal (igual que el resto de herramientas) ──────────
  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "32px 20px",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  };
  const outerCardStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: 20,
    width: "100%",
    maxWidth: 720,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  // ─── Estilos internos (igual que antes, sin cambios) ────────────────────────
  const cardStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };
  const cardTitleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#475569",
    marginBottom: "16px",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#334155",
    marginBottom: "6px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "10px",
    border: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    transition: "all 0.2s",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical" };
  const grid2Style: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  };
  const radioGroupStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "8px",
  };
  const radioButtonStyle = (isSelected: boolean, color: string = "#3b82f6"): React.CSSProperties => ({
    flex: 1,
    padding: "16px",
    borderRadius: "12px",
    border: `2px solid ${isSelected ? color : "#e2e8f0"}`,
    backgroundColor: isSelected ? `${color}10` : "white",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
  });
  const errorStyle: React.CSSProperties = {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#dc2626",
    marginBottom: "20px",
  };

  return (
    <div style={pageStyle}>
      <div style={outerCardStyle}>

        {/* ── Header con gradiente del tema ── */}
        <div style={{
          background: theme.primaryGradient,
          padding: "20px 28px",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          color: "white",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Generador de Planificaciones</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>
                Planificación docente en Word lista para presentar
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              width: 36,
              height: 36,
              borderRadius: "50%",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* ── Body scrollable ── */}
        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "72vh" }}>

          {/* Freemium notice */}
          {!user && (
            <div style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              color: "#b45309",
            }}>
              <span>⚡</span>
              <span>
                Podés generar{" "}
                <strong>
                  {usesLeft > 0 ? `${usesLeft} planificación${usesLeft !== 1 ? "es" : ""}` : "0 planificaciones"}
                </strong>{" "}
                más sin cuenta.{" "}
                <button
                  onClick={() => navigate("/login")}
                  style={{ background: "none", border: "none", color: "#b45309", textDecoration: "underline", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Iniciá sesión
                </button>{" "}
                para acceso ilimitado.
              </span>
            </div>
          )}

          {/* ── Contenido del formulario — SIN CAMBIOS ── */}

          {/* Datos del docente */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Datos del docente (opcionales)</div>
            <div style={grid2Style}>
              <div>
                <label style={labelStyle}>Institución</label>
                <input
                  type="text" name="institucion" value={form.institucion} onChange={handleChange}
                  placeholder="Nombre de la escuela" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                />
              </div>
              <div>
                <label style={labelStyle}>Docente</label>
                <input
                  type="text" name="docente" value={form.docente} onChange={handleChange}
                  placeholder="Tu nombre" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>
          </div>

          {/* Datos de la planificación */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Datos de la planificación</div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>
                Materia / Asignatura <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text" name="materia" value={form.materia} onChange={handleChange} required
                placeholder="Ej: Matemática, Lengua y Literatura, Historia..." style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>

            <div style={grid2Style}>
              <div>
                <label style={labelStyle}>Nivel</label>
                <select name="nivel" value={form.nivel} onChange={handleChange} style={selectStyle}>
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Superior">Superior</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Año / Grado</label>
                <input
                  type="text" name="anio" value={form.anio} onChange={handleChange}
                  placeholder="Ej: 3°, 5° año" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                />
              </div>
              <div>
                <label style={labelStyle}>Modalidad</label>
                <select name="modalidad" value={form.modalidad} onChange={handleChange} style={selectStyle}>
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Híbrida">Híbrida</option>
                </select>
              </div>
            </div>

            <div style={{ margin: "16px 0" }}>
              <label style={labelStyle}>Duración</label>
              <div style={radioGroupStyle}>
                {(["Anual", "Cuatrimestral", "Bimestral", "Por unidad"] as DuracionType[]).map((d) => (
                  <button
                    key={d} type="button"
                    onClick={() => setForm((prev) => ({ ...prev, duracion: d }))}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: 500,
                      border: `2px solid ${form.duracion === d ? "#3b82f6" : "#e2e8f0"}`,
                      backgroundColor: form.duracion === d ? "#eff6ff" : "white",
                      color: form.duracion === d ? "#1d4ed8" : "#475569",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >{d}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Eje temático / Descripción general <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                name="eje" value={form.eje} onChange={handleChange} required rows={3}
                placeholder="Describí el eje central, la unidad o los temas principales que abarca esta planificación..."
                style={textareaStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          {/* Enfoque de objetivos */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Enfoque de los objetivos</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, enfoqueObjetivos: "objetivos" }))}
                style={radioButtonStyle(form.enfoqueObjetivos === "objetivos", "#3b82f6")}
              >
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>📋 Objetivos clásicos</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Redacción tradicional: "El alumno será capaz de..."</div>
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, enfoqueObjetivos: "capacidades" }))}
                style={radioButtonStyle(form.enfoqueObjetivos === "capacidades", "#8b5cf6")}
              >
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>🎯 Capacidades fundamentales</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Pensamiento crítico, comunicación, resolución de problemas...</div>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={errorStyle}>
              {error}
              {error.includes("límite") && (
                <button
                  onClick={() => navigate("/login")}
                  style={{ marginLeft: "8px", background: "none", border: "none", color: "#dc2626", textDecoration: "underline", fontWeight: 600, cursor: "pointer" }}
                >
                  Iniciá sesión
                </button>
              )}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div style={{ padding: "14px 18px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Generando planificación con IA…</div>
                <div style={{ fontSize: 12, color: "#a16207", marginTop: 2 }}>Puede tardar 20–30 segundos. No cierres esta ventana.</div>
              </div>
            </div>
          )}

          {/* Success + Conversion block */}
          {downloaded && (
            <div>
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "16px", padding: "20px", textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
                <p style={{ fontWeight: 700, color: "#166534", margin: 0 }}>¡Planificación descargada!</p>
                <p style={{ fontSize: "13px", color: "#15803d", marginTop: "6px" }}>
                  Revisá tu carpeta de descargas para encontrar el archivo .docx
                </p>
                <button
                  onClick={() => {
                    setDownloaded(false);
                    setForm({ institucion: "", docente: "", materia: "", nivel: "Secundaria", anio: "", duracion: "Anual", eje: "", modalidad: "Presencial", enfoqueObjetivos: "objetivos" });
                  }}
                  style={{ background: "none", border: "none", color: "#15803d", textDecoration: "underline", fontSize: "13px", marginTop: "12px", cursor: "pointer" }}
                >
                  Generar otra planificación
                </button>
              </div>
              <div style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)", borderRadius: "16px", padding: "20px", color: "white" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "32px" }}>🚦</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "16px", margin: "0 0 6px" }}>
                      ¿Querés generar una dinámica áulica con un juego para que los alumnos aprendan este tema?
                    </p>
                    <p style={{ fontSize: "13px", opacity: 0.9, margin: 0 }}>
                      Creá una actividad con el Juego del Semáforo para que tus alumnos trabajen y debatan el contenido antes de la evaluación.
                    </p>
                    <button
                      onClick={() => navigate("/")}
                      style={{ marginTop: "16px", backgroundColor: "white", color: "#ea580c", fontWeight: 700, padding: "10px 20px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "13px" }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#fffbeb")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      Crear juego →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer con botones ── */}
        {!downloaded && (
          <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => navigate("/")}
              style={{ padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", cursor: "pointer" }}
            >
              ← Volver
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (!canUse() && !user)}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none",
                background: loading || (!canUse() && !user) ? "#94a3b8" : theme.primaryGradient,
                color: "white", cursor: loading || (!canUse() && !user) ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 8, minWidth: 220,
                opacity: loading || (!canUse() && !user) ? 0.7 : 1,
              }}
            >
              {loading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>Generando…</> : <>📄 Generar planificación en Word</>}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}