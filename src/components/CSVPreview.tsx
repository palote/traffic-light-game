// src/components/CSVPreview.tsx
// Preview de CSV con i18n y mensaje pedagógico de curación

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { ParseResult, ParsedQuestion, SuggestedStage } from "../utils/csvParser";

interface CSVPreviewProps {
  parseResult: ParseResult;
  onConfirm: (questions: ParsedQuestion[]) => void;
  onCancel: () => void;
}

export function CSVPreview({ parseResult, onConfirm, onCancel }: CSVPreviewProps) {
  const { t, language } = useI18n();
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [editableQuestions, setEditableQuestions] = useState<ParsedQuestion[]>([]);
  const [showCurationGuide, setShowCurationGuide] = useState(true);

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

  // Textos del mensaje pedagógico
  const curationGuide = language === 'es' ? {
    title: '🎯 Guía para asignar etapas',
    subtitle: 'Como docente, tu rol es curar las consignas asignándolas a la etapa más apropiada:',
    stage1Title: 'Etapa 1: Preparación grupal',
    stage1Desc: 'Consignas de conocimiento base que el equipo resuelve internamente. Sirven para que los estudiantes se familiaricen con el contenido, alineen conceptos y construyan confianza grupal antes de competir.',
    stage1Examples: 'Ejemplos: definiciones, identificación de conceptos, preguntas de comprensión directa.',
    stage2Title: 'Etapa 2: Competencia inter-equipos',
    stage2Desc: 'Consignas de comprensión profunda donde los equipos compiten entre sí. Requieren análisis, síntesis, argumentación o aplicación del conocimiento a situaciones nuevas.',
    stage2Examples: 'Ejemplos: comparaciones, análisis de casos, justificaciones, resolución de problemas.',
    tip: '💡 Tip: Un buen balance es 40-60% Stage 1 y 40-60% Stage 2, dependiendo del nivel del grupo.',
    hideGuide: 'Ocultar guía',
    showGuide: 'Mostrar guía de curación',
  } : {
    title: '🎯 Stage Assignment Guide',
    subtitle: 'As a teacher, your role is to curate questions by assigning them to the most appropriate stage:',
    stage1Title: 'Stage 1: Team Preparation',
    stage1Desc: 'Base knowledge questions that teams solve internally. They help students familiarize themselves with the content, align concepts, and build group confidence before competing.',
    stage1Examples: 'Examples: definitions, concept identification, direct comprehension questions.',
    stage2Title: 'Stage 2: Inter-team Competition',
    stage2Desc: 'Deep understanding questions where teams compete against each other. They require analysis, synthesis, argumentation, or applying knowledge to new situations.',
    stage2Examples: 'Examples: comparisons, case analysis, justifications, problem-solving.',
    tip: '💡 Tip: A good balance is 40-60% Stage 1 and 40-60% Stage 2, depending on the group level.',
    hideGuide: 'Hide guide',
    showGuide: 'Show curation guide',
  };

  return (
    <div style={{
      position: "fixed",
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
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: 20,
        width: "100%",
        maxWidth: 900,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span>📊</span>
            {t.csvPreview.title}
          </h2>
          <button 
            onClick={onCancel}
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
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}>
            <StatCard value={totalRows} label={t.csvPreview.totalRows} color="#64748b" />
            <StatCard value={validRows} label={t.csvPreview.validQuestions} color="#22c55e" />
            <StatCard value={stage1Count} label="Stage 1" color="#3b82f6" />
            <StatCard value={stage2Count} label="Stage 2" color="#a855f7" />
          </div>

          {/* ✅ NUEVO: Mensaje pedagógico de curación */}
          <div style={{ marginBottom: 20 }}>
            {showCurationGuide ? (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: 16,
                padding: 20,
                position: 'relative',
              }}>
                <button
                  onClick={() => setShowCurationGuide(false)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'none',
                    border: 'none',
                    fontSize: 12,
                    color: '#64748b',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {curationGuide.hideGuide}
                </button>

                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: 16, 
                  fontWeight: 700, 
                  color: '#15803d',
                }}>
                  {curationGuide.title}
                </h3>
                <p style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: 14, 
                  color: '#166534',
                  lineHeight: 1.5,
                }}>
                  {curationGuide.subtitle}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Stage 1 */}
                  <div style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: 12,
                    padding: 16,
                    border: '2px solid #3b82f6',
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 8,
                    }}>
                      <span style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        Stage 1
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
                        {curationGuide.stage1Title}
                      </span>
                    </div>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: 13, 
                      color: '#1e40af',
                      lineHeight: 1.5,
                    }}>
                      {curationGuide.stage1Desc}
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: 12, 
                      color: '#3b82f6',
                      fontStyle: 'italic',
                    }}>
                      {curationGuide.stage1Examples}
                    </p>
                  </div>

                  {/* Stage 2 */}
                  <div style={{
                    backgroundColor: '#faf5ff',
                    borderRadius: 12,
                    padding: 16,
                    border: '2px solid #a855f7',
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 8,
                    }}>
                      <span style={{
                        backgroundColor: '#a855f7',
                        color: 'white',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        Stage 2
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed' }}>
                        {curationGuide.stage2Title}
                      </span>
                    </div>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: 13, 
                      color: '#7c3aed',
                      lineHeight: 1.5,
                    }}>
                      {curationGuide.stage2Desc}
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: 12, 
                      color: '#a855f7',
                      fontStyle: 'italic',
                    }}>
                      {curationGuide.stage2Examples}
                    </p>
                  </div>
                </div>

                <p style={{
                  margin: '16px 0 0 0',
                  fontSize: 13,
                  color: '#15803d',
                  backgroundColor: '#dcfce7',
                  padding: '10px 14px',
                  borderRadius: 8,
                }}>
                  {curationGuide.tip}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowCurationGuide(true)}
                style={{
                  background: 'none',
                  border: '2px dashed #86efac',
                  borderRadius: 12,
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: 14,
                  color: '#22c55e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                🎯 {curationGuide.showGuide}
              </button>
            )}
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <Section
              type="warning"
              title={`⚠️ ${t.csvPreview.warnings} (${parseResult.warnings?.length})`}
              isOpen={showWarnings}
              onToggle={() => setShowWarnings(!showWarnings)}
              items={parseResult.warnings || []}
            />
          )}

          {/* Errors */}
          {hasErrors && (
            <Section
              type="error"
              title={`❌ ${t.csvPreview.errors} (${parseResult.errors?.length})`}
              isOpen={showErrors}
              onToggle={() => setShowErrors(!showErrors)}
              items={parseResult.errors || []}
            />
          )}

          {/* Questions Table */}
          {editableQuestions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  ✅ {t.csvPreview.validQuestionsTitle} ({editableQuestions.length})
                </span>
                <span style={{ fontSize: 13, color: "#64748b", marginLeft: 8 }}>
                  — {t.csvPreview.editBeforeImport}
                </span>
              </div>

              <div style={{
                overflowX: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>{t.csvPreview.question}</th>
                      <th style={{ ...thStyle, width: 180 }}>{t.csvPreview.hint}</th>
                      <th style={{ ...thStyle, width: 100 }}>{t.csvPreview.stage}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableQuestions.map((q, i) => (
                      <tr key={`${q.id}_${i}`}>
                        <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 13 }}>
                          {q.rowNumber}
                        </td>
                        <td style={tdStyle}>
                          <textarea
                            style={textareaStyle}
                            value={q.text}
                            onChange={(e) => updateText(i, e.target.value)}
                            rows={2}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="text"
                            style={inputStyle}
                            value={q.hint ?? ""}
                            onChange={(e) => updateHint(i, e.target.value)}
                            placeholder={t.csvPreview.noHint}
                          />
                        </td>
                        <td style={tdStyle}>
                          <select
                            style={{
                              ...selectStyle,
                              backgroundColor: q.suggestedStage === 2 ? '#faf5ff' : '#eff6ff',
                              borderColor: q.suggestedStage === 2 ? '#a855f7' : '#3b82f6',
                              color: q.suggestedStage === 2 ? '#7c3aed' : '#1e40af',
                              fontWeight: 600,
                            }}
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
            <div style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span>ℹ️</span>
              <span>{t.csvPreview.note}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            {t.csvPreview.cancel}
          </button>

          <button
            onClick={() => canImport && onConfirm(editableQuestions)}
            disabled={!canImport}
            style={{
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 700,
              background: canImport 
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" 
                : "#e2e8f0",
              color: canImport ? "white" : "#94a3b8",
              border: "none",
              borderRadius: 10,
              cursor: canImport ? "pointer" : "not-allowed",
              boxShadow: canImport ? "0 4px 12px rgba(34, 197, 94, 0.3)" : "none",
            }}
          >
            {canImport
              ? `✅ ${t.csvPreview.import} ${editableQuestions.length} ${t.csvPreview.questions}`
              : `❌ ${t.csvPreview.noValidQuestions}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper components
function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      backgroundColor: `${color}10`,
      border: `2px solid ${color}`,
      borderRadius: 12,
      padding: 16,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, margin: 0 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Section({ type, title, isOpen, onToggle, items }: {
  type: "warning" | "error";
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  items: string[];
}) {
  const colors = {
    warning: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309", itemBg: "#fffbeb" },
    error: { bg: "#fee2e2", border: "#ef4444", text: "#dc2626", itemBg: "#fef2f2" },
  };
  const c = colors[type];

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={onToggle}
        style={{
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
        }}
      >
        <span>{title}</span>
        <span>{isOpen ? "▼" : "▶"}</span>
      </div>
      {isOpen && (
        <div style={{
          backgroundColor: "#f8fafc",
          borderRadius: "0 0 10px 10px",
          padding: 12,
          marginTop: -1,
          border: "1px solid #e2e8f0",
          borderTop: "none",
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              padding: "8px 12px",
              borderRadius: 6,
              marginBottom: 6,
              fontSize: 13,
              backgroundColor: c.itemBg,
              color: c.text,
            }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: 600,
  color: "#475569",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "2px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  resize: "vertical",
  fontFamily: "inherit",
  minHeight: 60,
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 14,
  border: "2px solid #e2e8f0",
  borderRadius: 8,
  backgroundColor: "white",
  cursor: "pointer",
};
