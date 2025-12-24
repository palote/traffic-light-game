// src/components/CSVPreview.tsx
// CON MEJORAS VISUALES 🎨

import { useEffect, useMemo, useState } from "react";
import type { ParseResult, ParsedQuestion, SuggestedStage } from "../utils/csvParser";

interface CSVPreviewProps {
  parseResult: ParseResult;
  onConfirm: (questions: ParsedQuestion[]) => void;
  onCancel: () => void;
}

// 🎨 Estilos
const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 10000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "100%",
    maxWidth: 900,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column" as const,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "white",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  closeBtn: {
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
    transition: "background 0.2s",
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
    padding: 24,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  statCard: (color: string) => ({
    backgroundColor: `${color}10`,
    border: `2px solid ${color}`,
    borderRadius: 12,
    padding: 16,
    textAlign: "center" as const,
  }),
  statNumber: (color: string) => ({
    fontSize: 32,
    fontWeight: 800,
    color: color,
    margin: 0,
  }),
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: (type: "warning" | "error" | "success") => {
    const colors = {
      warning: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
      error: { bg: "#fee2e2", border: "#ef4444", text: "#dc2626" },
      success: { bg: "#dcfce7", border: "#22c55e", text: "#16a34a" },
    };
    const c = colors[type];
    return {
      backgroundColor: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: "12px 16px",
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      color: c.text,
      fontWeight: 600,
      fontSize: 14,
    };
  },
  messageList: {
    backgroundColor: "#f8fafc",
    borderRadius: "0 0 10px 10px",
    padding: 12,
    marginTop: -1,
    border: "1px solid #e2e8f0",
    borderTop: "none",
  },
  messageItem: (type: "warning" | "error") => ({
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 6,
    fontSize: 13,
    backgroundColor: type === "error" ? "#fef2f2" : "#fffbeb",
    color: type === "error" ? "#dc2626" : "#b45309",
  }),
  tableWrapper: {
    overflowX: "auto" as const,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 14,
  },
  th: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    textAlign: "left" as const,
    fontWeight: 600,
    color: "#475569",
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    borderBottom: "2px solid #e2e8f0",
    position: "sticky" as const,
    top: 0,
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top" as const,
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    resize: "vertical" as const,
    fontFamily: "inherit",
    minHeight: 60,
  },
  select: {
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    backgroundColor: "white",
    cursor: "pointer",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  cancelBtn: {
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 600,
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  confirmBtn: (enabled: boolean) => ({
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 700,
    background: enabled 
      ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" 
      : "#e2e8f0",
    color: enabled ? "white" : "#94a3b8",
    border: "none",
    borderRadius: 10,
    cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: enabled ? "0 4px 12px rgba(34, 197, 94, 0.3)" : "none",
    transition: "all 0.2s",
  }),
  note: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#1e40af",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  stageBadge: (stage: number) => ({
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: stage === 1 ? "#dbeafe" : "#f3e8ff",
    color: stage === 1 ? "#1d4ed8" : "#7c3aed",
  }),
};

export function CSVPreview({ parseResult, onConfirm, onCancel }: CSVPreviewProps) {
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [editableQuestions, setEditableQuestions] = useState<ParsedQuestion[]>([]);

  useEffect(() => {
    setEditableQuestions(parseResult.questions ?? []);
  }, [parseResult]);

  const totalRows = parseResult.rawRowCount ?? 0;
  const validRows = editableQuestions.length;

  const stage1Count = useMemo(
    () => editableQuestions.filter((q) => q.suggestedStage === 1).length,
    [editableQuestions]
  );

  const stage2Count = useMemo(
    () => editableQuestions.filter((q) => q.suggestedStage === 2).length,
    [editableQuestions]
  );

  const hasErrors = (parseResult.errors?.length ?? 0) > 0;
  const hasWarnings = (parseResult.warnings?.length ?? 0) > 0;
  const canImport = editableQuestions.length > 0;

  // Handlers de edición
  const updateText = (index: number, value: string) => {
    setEditableQuestions((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], text: value };
      return next;
    });
  };

  const updateHint = (index: number, value: string) => {
    setEditableQuestions((prev) => {
      const next = [...prev];
      if (next[index]) {
        const cleaned = value.trim();
        next[index] = { ...next[index], hint: cleaned || undefined };
      }
      return next;
    });
  };

  const updateStage = (index: number, value: string) => {
    const stage = value === "2" ? 2 : 1;
    setEditableQuestions((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], suggestedStage: stage as SuggestedStage };
      return next;
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>
            <span>📊</span>
            Vista Previa de Importación
          </h2>
          <button 
            style={styles.closeBtn} 
            onClick={onCancel}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard("#64748b")}>
              <div style={styles.statNumber("#64748b")}>{totalRows}</div>
              <div style={styles.statLabel}>Filas totales</div>
            </div>
            <div style={styles.statCard("#22c55e")}>
              <div style={styles.statNumber("#22c55e")}>{validRows}</div>
              <div style={styles.statLabel}>Preguntas válidas</div>
            </div>
            <div style={styles.statCard("#3b82f6")}>
              <div style={styles.statNumber("#3b82f6")}>{stage1Count}</div>
              <div style={styles.statLabel}>Stage 1</div>
            </div>
            <div style={styles.statCard("#a855f7")}>
              <div style={styles.statNumber("#a855f7")}>{stage2Count}</div>
              <div style={styles.statLabel}>Stage 2</div>
            </div>
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <div style={styles.section}>
              <div
                style={styles.sectionHeader("warning")}
                onClick={() => setShowWarnings(!showWarnings)}
              >
                <span>⚠️ Advertencias ({parseResult.warnings?.length})</span>
                <span>{showWarnings ? "▼" : "▶"}</span>
              </div>
              {showWarnings && (
                <div style={styles.messageList}>
                  {parseResult.warnings?.map((warning, i) => (
                    <div key={i} style={styles.messageItem("warning")}>
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {hasErrors && (
            <div style={styles.section}>
              <div
                style={styles.sectionHeader("error")}
                onClick={() => setShowErrors(!showErrors)}
              >
                <span>❌ Errores ({parseResult.errors?.length})</span>
                <span>{showErrors ? "▼" : "▶"}</span>
              </div>
              {showErrors && (
                <div style={styles.messageList}>
                  {parseResult.errors?.map((err, i) => (
                    <div key={i} style={styles.messageItem("error")}>
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Questions Table */}
          {editableQuestions.length > 0 && (
            <div style={styles.section}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  ✅ Preguntas Válidas ({editableQuestions.length})
                </span>
                <span style={{ fontSize: 13, color: "#64748b", marginLeft: 8 }}>
                  — Podés editar antes de importar
                </span>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 50 }}>#</th>
                      <th style={styles.th}>Pregunta</th>
                      <th style={{ ...styles.th, width: 180 }}>Pista</th>
                      <th style={{ ...styles.th, width: 100 }}>Etapa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableQuestions.map((q, i) => (
                      <tr key={`${q.id}_${i}`}>
                        <td style={{ ...styles.td, color: "#94a3b8", fontSize: 13 }}>
                          {q.rowNumber}
                        </td>
                        <td style={styles.td}>
                          <textarea
                            style={styles.textarea}
                            value={q.text}
                            onChange={(e) => updateText(i, e.target.value)}
                            rows={2}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="text"
                            style={styles.input}
                            value={q.hint ?? ""}
                            onChange={(e) => updateHint(i, e.target.value)}
                            placeholder="Sin pista"
                          />
                        </td>
                        <td style={styles.td}>
                          <select
                            style={styles.select}
                            value={String(q.suggestedStage)}
                            onChange={(e) => updateStage(i, e.target.value)}
                          >
                            <option value="1">Stage 1</option>
                            <option value="2">Stage 2</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Note */}
          {hasErrors && canImport && (
            <div style={styles.note}>
              <span>ℹ️</span>
              <span>Se importarán solo las preguntas válidas. Las filas con errores serán ignoradas.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.cancelBtn}
            onClick={onCancel}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
          >
            Cancelar
          </button>

          <button
            style={styles.confirmBtn(canImport)}
            onClick={() => canImport && onConfirm(editableQuestions)}
            disabled={!canImport}
          >
            {canImport
              ? `✅ Importar ${editableQuestions.length} pregunta${editableQuestions.length !== 1 ? "s" : ""}`
              : "❌ No hay preguntas válidas"}
          </button>
        </div>
      </div>
    </div>
  );
}