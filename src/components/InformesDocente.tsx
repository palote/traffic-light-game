import { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { app } from "../firebase.config";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface SesionResumen {
  id: string;
  materia: string;
  area?: string;
  nivel: string;
  anio: string;
  tema: string;
  subtema?: string;
  creadoEn?: string;
  expiresAt?: string;
  tieneInforme: boolean;
  informe?: InformeSesion;
}

interface InformeSesion {
  resumenEjecutivo: string;
  conceptosDebatidos: string[];
  fortalezas: string;
  areasDeOportunidad: string;
  patronesObservados: string;
  recomendacionesDocente: string[];
  preguntasParaRetomar: string[];
  nivelDebate: "superficial" | "adecuado" | "profundo";
  generadoEn: string;
  totalConsultas: number;
  estadisticas: {
    correctasA: number;
    correctasB: number;
    ambasCorrectas: number;
    ambasIncorrectas: number;
    fueraDeTema: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NIVEL_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  superficial: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  adecuado:    { bg: "#fefce8", text: "#92400e", border: "#fde68a" },
  profundo:    { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
};

const NIVEL_LABEL: Record<string, string> = {
  superficial: "🌱 Debate superficial",
  adecuado:    "🌿 Debate adecuado",
  profundo:    "🌳 Debate profundo",
};

function formatFecha(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Componente principal ──────────────────────────────────────────────────────

export function InformesDocente() {
  const [sesiones, setSesiones]         = useState<SesionResumen[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [sesionActiva, setSesionActiva] = useState<string | null>(null);
  const [generando, setGenerando]       = useState<string | null>(null);
  const [informeVisto, setInformeVisto] = useState<InformeSesion | null>(null);

  const fns = getFunctions(app, "us-central1");

  const cargarSesiones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth(app);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setError("Necesitás estar autenticado para ver tus sesiones.");
        setLoading(false);
        return;
      }
      const fn = httpsCallable(fns, "listarSesionesDocente");
      const res = await fn({ uid, limit: 30 }) as { data: { sesiones: SesionResumen[] } };
      setSesiones(res.data.sesiones);
    } catch (err: any) {
      setError(`Error al cargar sesiones: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarSesiones(); }, [cargarSesiones]);

  const handleGenerarInforme = async (sessionId: string) => {
    setGenerando(sessionId);
    try {
      const fn = httpsCallable(fns, "generarInformeSesion");
      const res = await fn({ sessionId }) as { data: InformeSesion };
      // Actualizar la sesión en la lista local con el informe recibido
      setSesiones((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, tieneInforme: true, informe: res.data }
            : s
        )
      );
      setInformeVisto(res.data);
      setSesionActiva(sessionId);
    } catch (err: any) {
      alert(`No se pudo generar el informe: ${err.message}`);
    } finally {
      setGenerando(null);
    }
  };

  const handleVerInforme = (sesion: SesionResumen) => {
    if (sesion.informe) {
      setInformeVisto(sesion.informe);
      setSesionActiva(sesion.id);
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.centered}>
        <span style={{ fontSize: 32 }}>⏳</span>
        <p style={{ color: "#6b7280", marginTop: 12 }}>Cargando sesiones…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <span style={{ fontSize: 32 }}>⚠️</span>
        <p style={{ color: "#ef4444", marginTop: 8 }}>{error}</p>
        <button style={styles.btnPrimary} onClick={cargarSesiones}>Reintentar</button>
      </div>
    );
  }

  if (sesiones.length === 0) {
    return (
      <div style={styles.centered}>
        <span style={{ fontSize: 40 }}>📋</span>
        <p style={{ color: "#6b7280", marginTop: 12, textAlign: "center", maxWidth: 320 }}>
          Todavía no tenés sesiones de árbitro. Creá una desde el panel de configuración.
        </p>
      </div>
    );
  }

  // ── Vista de informe abierto ───────────────────────────────────────────────

  if (informeVisto && sesionActiva) {
    const sesion = sesiones.find((s) => s.id === sesionActiva);
    const nc = NIVEL_COLOR[informeVisto.nivelDebate] ?? NIVEL_COLOR.adecuado;

    return (
      <div style={styles.container}>
        {/* Header del informe */}
        <div style={styles.informeHeader}>
          <button style={styles.btnBack} onClick={() => { setInformeVisto(null); setSesionActiva(null); }}>
            ← Volver
          </button>
          <div>
            <h2 style={styles.informeTitle}>
              📄 Informe — {sesion?.materia ?? "Sesión"}
            </h2>
            <p style={styles.informeMeta}>
              {sesion?.tema} · {sesion?.nivel} {sesion?.anio}° · {formatFecha(informeVisto.generadoEn)}
            </p>
          </div>
          <span style={{ ...styles.nivelBadge, background: nc.bg, color: nc.text, border: `1px solid ${nc.border}` }}>
            {NIVEL_LABEL[informeVisto.nivelDebate]}
          </span>
        </div>

        {/* Estadísticas */}
        <div style={styles.statsRow}>
          {[
            { label: "Consultas totales", value: informeVisto.totalConsultas, color: "#3b82f6" },
            { label: "Posición A ganó",   value: informeVisto.estadisticas.correctasA, color: "#10b981" },
            { label: "Posición B ganó",   value: informeVisto.estadisticas.correctasB, color: "#8b5cf6" },
            { label: "Ambas correctas",   value: informeVisto.estadisticas.ambasCorrectas, color: "#f59e0b" },
            { label: "Ambas incorrectas", value: informeVisto.estadisticas.ambasIncorrectas, color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} style={styles.statBox}>
              <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Resumen ejecutivo */}
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitle}>🔍 Resumen ejecutivo</h3>
          <p style={styles.seccionBody}>{informeVisto.resumenEjecutivo}</p>
        </div>

        {/* Conceptos debatidos */}
        {informeVisto.conceptosDebatidos.length > 0 && (
          <div style={styles.seccion}>
            <h3 style={styles.seccionTitle}>📚 Conceptos debatidos</h3>
            <div style={styles.tagRow}>
              {informeVisto.conceptosDebatidos.map((c) => (
                <span key={c} style={styles.tag}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Fortalezas / Oportunidades */}
        <div style={styles.dosCols}>
          <div style={{ ...styles.seccion, ...styles.colVerde }}>
            <h3 style={styles.seccionTitle}>✅ Fortalezas del grupo</h3>
            <p style={styles.seccionBody}>{informeVisto.fortalezas}</p>
          </div>
          <div style={{ ...styles.seccion, ...styles.colRojo }}>
            <h3 style={styles.seccionTitle}>🎯 Áreas de oportunidad</h3>
            <p style={styles.seccionBody}>{informeVisto.areasDeOportunidad}</p>
          </div>
        </div>

        {/* Patrones observados */}
        <div style={styles.seccion}>
          <h3 style={styles.seccionTitle}>🔎 Patrones de debate observados</h3>
          <p style={styles.seccionBody}>{informeVisto.patronesObservados}</p>
        </div>

        {/* Recomendaciones */}
        {informeVisto.recomendacionesDocente.length > 0 && (
          <div style={{ ...styles.seccion, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <h3 style={{ ...styles.seccionTitle, color: "#1e40af" }}>💡 Recomendaciones para el docente</h3>
            <ul style={styles.lista}>
              {informeVisto.recomendacionesDocente.map((r, i) => (
                <li key={i} style={styles.listaItem}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preguntas para retomar */}
        {informeVisto.preguntasParaRetomar.length > 0 && (
          <div style={{ ...styles.seccion, background: "#fefce8", border: "1px solid #fde68a" }}>
            <h3 style={{ ...styles.seccionTitle, color: "#92400e" }}>❓ Preguntas para retomar en clase</h3>
            <ul style={styles.lista}>
              {informeVisto.preguntasParaRetomar.map((p, i) => (
                <li key={i} style={styles.listaItem}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Lista de sesiones ──────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <div style={styles.listHeader}>
        <h2 style={styles.listTitle}>📋 Informes de sesiones</h2>
        <button style={styles.btnSecondary} onClick={cargarSesiones}>🔄 Actualizar</button>
      </div>

      <div style={styles.sesionesGrid}>
        {sesiones.map((sesion) => (
          <div key={sesion.id} style={styles.sesionCard}>
            <div style={styles.sesionCardTop}>
              <div>
                <div style={styles.sesionMateria}>{sesion.materia}</div>
                <div style={styles.sesionTema}>{sesion.tema}</div>
                {sesion.subtema && <div style={styles.sesionSubtema}>{sesion.subtema}</div>}
              </div>
              <div style={styles.sesionMeta}>
                <span style={styles.metaBadge}>{sesion.nivel} · {sesion.anio}°</span>
                {sesion.area && <span style={styles.areaBadge}>{sesion.area}</span>}
              </div>
            </div>

            <div style={styles.sesionFecha}>
              Creada: {formatFecha(sesion.creadoEn ?? sesion.expiresAt)}
            </div>

            <div style={styles.sesionActions}>
              {sesion.tieneInforme ? (
                <button
                  style={styles.btnVer}
                  onClick={() => handleVerInforme(sesion)}
                >
                  📄 Ver informe
                </button>
              ) : (
                <button
                  style={generando === sesion.id ? styles.btnGenerandoDisabled : styles.btnGenerar}
                  onClick={() => handleGenerarInforme(sesion.id)}
                  disabled={generando === sesion.id}
                >
                  {generando === sesion.id ? "⏳ Generando…" : "✨ Generar informe"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "24px 16px 48px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#1f2937",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "40vh",
    gap: 8,
  },

  // Header lista
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  listTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" },

  // Grid de sesiones
  sesionesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  sesionCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  sesionCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  sesionMateria: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  sesionTema:    { fontSize: 13, color: "#374151", marginTop: 2 },
  sesionSubtema: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  sesionMeta:    { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  metaBadge: {
    background: "#f3f4f6", border: "1px solid #e5e7eb",
    borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#6b7280",
  },
  areaBadge: {
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#1d4ed8",
    maxWidth: 140, textAlign: "right",
  },
  sesionFecha: { fontSize: 12, color: "#9ca3af" },
  sesionActions: { marginTop: 4 },

  // Botones
  btnGenerar: {
    padding: "8px 16px", background: "#6366f1", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 700, width: "100%",
  },
  btnGenerandoDisabled: {
    padding: "8px 16px", background: "#c7d2fe", color: "#fff",
    border: "none", borderRadius: 8, cursor: "not-allowed",
    fontSize: 13, fontWeight: 700, width: "100%",
  },
  btnVer: {
    padding: "8px 16px", background: "#10b981", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 700, width: "100%",
  },
  btnPrimary: {
    padding: "8px 20px", background: "#3b82f6", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer",
    fontSize: 14, fontWeight: 600, marginTop: 8,
  },
  btnSecondary: {
    padding: "8px 16px", background: "#f3f4f6", color: "#374151",
    border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 600,
  },
  btnBack: {
    padding: "8px 14px", background: "#f3f4f6", color: "#374151",
    border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
    flexShrink: 0,
  },

  // Informe header
  informeHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  informeTitle:  { margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" },
  informeMeta:   { margin: "4px 0 0", fontSize: 13, color: "#6b7280" },
  nivelBadge: {
    borderRadius: 20, padding: "4px 14px", fontSize: 13,
    fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
  },

  // Estadísticas
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    background: "#f9fafb", border: "1px solid #e5e7eb",
    borderRadius: 10, padding: "12px 8px", textAlign: "center",
  },
  statValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.3 },

  // Secciones
  seccion: {
    background: "#f9fafb", border: "1px solid #e5e7eb",
    borderRadius: 10, padding: 20, marginBottom: 16,
  },
  seccionTitle: { margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#111827" },
  seccionBody:  { margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 },

  dosCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  colVerde: { background: "#f0fdf4", borderColor: "#86efac" },
  colRojo:  { background: "#fff7ed", borderColor: "#fed7aa" },

  tagRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tag: {
    background: "#e0e7ff", border: "1px solid #c7d2fe",
    borderRadius: 20, padding: "3px 12px",
    fontSize: 12, color: "#3730a3", fontWeight: 600,
  },

  lista: { margin: "8px 0 0", paddingLeft: 20 },
  listaItem: { fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 4 },
};
