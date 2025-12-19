import { useState } from "react";
import type { ParseResult, ParsedQuestion } from "../utils/csvParser";
import "./CSVPreview.css";

interface CSVPreviewProps {
  parseResult: ParseResult;
  onConfirm: (questions: ParsedQuestion[]) => void;
  onCancel: () => void;
}

export function CSVPreview({ parseResult, onConfirm, onCancel }: CSVPreviewProps) {
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  const { questions, errors, warnings, totalRows, validRows } = parseResult;

  const stage1Count = questions.filter((q) => q.suggestedStage === 1).length;
  const stage2Count = questions.filter((q) => q.suggestedStage === 2).length;

  const hasErrors = errors.length > 0;
  const canImport = questions.length > 0;

  return (
    <div className="csv-preview-overlay">
      <div className="csv-preview-modal">
        {/* Header */}
        <div className="preview-header">
          <h2>📊 Vista Previa de Importación</h2>
          <button className="btn-close" onClick={onCancel} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="preview-summary">
          <div className="summary-stats">
            <div className="stat-box">
              <div className="stat-number">{totalRows}</div>
              <div className="stat-label">Filas totales</div>
            </div>
            <div className="stat-box success">
              <div className="stat-number">{validRows}</div>
              <div className="stat-label">Preguntas válidas</div>
            </div>
            <div className="stat-box stage1">
              <div className="stat-number">{stage1Count}</div>
              <div className="stat-label">Stage 1</div>
            </div>
            <div className="stat-box stage2">
              <div className="stat-number">{stage2Count}</div>
              <div className="stat-label">Stage 2</div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="preview-section">
            <div
              className="section-header warning"
              onClick={() => setShowWarnings(!showWarnings)}
              role="button"
              tabIndex={0}
            >
              <span>⚠️ Advertencias ({warnings.length})</span>
              <span className="toggle">{showWarnings ? "▼" : "▶"}</span>
            </div>

            {showWarnings && (
              <ul className="message-list">
                {warnings.map((warning, i) => (
                  <li key={i} className="message-item warning">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="preview-section">
            <div
              className="section-header error"
              onClick={() => setShowErrors(!showErrors)}
              role="button"
              tabIndex={0}
            >
              <span>❌ Errores ({errors.length})</span>
              <span className="toggle">{showErrors ? "▼" : "▶"}</span>
            </div>

            {showErrors && (
              <ul className="message-list">
                {errors.map((err, i) => (
                  <li key={i} className="message-item error">
                    <strong>Línea {err.rowNumber}:</strong> {err.error}
                    {err.rowData && <div className="error-data">{err.rowData}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Questions Preview */}
        {questions.length > 0 && (
          <div className="preview-section">
            <div className="section-header">
              <span>✅ Preguntas Válidas ({questions.length})</span>
            </div>

            <div className="questions-table-wrapper">
              <table className="questions-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Pregunta</th>
                    <th>Pista</th>
                    <th>Etapa</th>
                    <th>Línea</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, i) => (
                    <tr key={i}>
                      <td className="cell-id">{q.id}</td>
                      <td className="cell-text">{q.text}</td>
                      <td className="cell-hint">{q.hint || "-"}</td>
                      <td className="cell-stage">
                        <span className={`badge stage${q.suggestedStage}`}>
                          Stage {q.suggestedStage}
                        </span>
                      </td>
                      <td className="cell-row">{q.rowNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="preview-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>

          <button className="btn-confirm" onClick={() => onConfirm(questions)} disabled={!canImport}>
            {canImport
              ? `✅ Importar ${questions.length} pregunta${questions.length !== 1 ? "s" : ""}`
              : "❌ No hay preguntas válidas"}
          </button>
        </div>

        {hasErrors && canImport && (
          <div className="preview-note">
            ℹ️ Se importarán solo las preguntas válidas. Las filas con errores serán ignoradas.
          </div>
        )}
      </div>
    </div>
  );
}
