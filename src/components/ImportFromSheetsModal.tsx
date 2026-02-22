// src/components/ImportFromSheetsModal.tsx
// 📊 Modal para importar lista de alumnos desde Google Sheets

import { useState, useEffect } from "react";
import {
  listUserSpreadsheets,
  getSpreadsheetInfo,
  readSheetData,
  type SpreadsheetInfo,
  type SheetInfo,
} from "../services/sheetsService";

interface ImportFromSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: string[]) => void;
  language: "es" | "en" | "pt";
}

type ModalView = "loading" | "select-file" | "select-sheet" | "select-column" | "preview" | "error";

interface SpreadsheetListItem {
  id: string;
  name: string;
  modifiedTime: string;
}

export function ImportFromSheetsModal({
  isOpen,
  onClose,
  onImport,
  language,
}: ImportFromSheetsModalProps) {
  const [view, setView] = useState<ModalView>("loading");
  const [error, setError] = useState("");

  // Data states
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetListItem[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SheetInfo | null>(null);
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number>(0);
  const [hasHeader, setHasHeader] = useState(true);
  const [previewStudents, setPreviewStudents] = useState<string[]>([]);

  const texts = {
    es: {
      title: "📊 Importar desde Google Sheets",
      selectFile: "Seleccioná un archivo",
      selectFileHint: "Elegí el spreadsheet que contiene la lista de alumnos",
      noFiles: "No se encontraron archivos",
      loading: "Cargando...",
      selectSheet: "Seleccioná una hoja",
      selectSheetHint: "El archivo tiene varias hojas, elegí la correcta",
      selectColumn: "Seleccioná la columna",
      selectColumnHint: "¿En qué columna están los nombres de los alumnos?",
      column: "Columna",
      hasHeader: "La primera fila es encabezado",
      preview: "Vista previa",
      previewHint: "Verificá que los nombres sean correctos",
      studentsFound: "alumnos encontrados",
      import: "Importar",
      importing: "Importando...",
      cancel: "Cancelar",
      back: "← Volver",
      error: "Error",
      retry: "Reintentar",
      modifiedAt: "Modificado",
      rows: "filas",
    },
    en: {
      title: "📊 Import from Google Sheets",
      selectFile: "Select a file",
      selectFileHint: "Choose the spreadsheet containing the student list",
      noFiles: "No files found",
      loading: "Loading...",
      selectSheet: "Select a sheet",
      selectSheetHint: "The file has multiple sheets, choose the correct one",
      selectColumn: "Select the column",
      selectColumnHint: "Which column contains the student names?",
      column: "Column",
      hasHeader: "First row is header",
      preview: "Preview",
      previewHint: "Verify that the names are correct",
      studentsFound: "students found",
      import: "Import",
      importing: "Importing...",
      cancel: "Cancel",
      back: "← Back",
      error: "Error",
      retry: "Retry",
      modifiedAt: "Modified",
      rows: "rows",
    },
    pt: {
      title: "📊 Importar do Google Sheets",
      selectFile: "Selecione um arquivo",
      selectFileHint: "Escolha a planilha que contém a lista de alunos",
      noFiles: "Nenhum arquivo encontrado",
      loading: "Carregando...",
      selectSheet: "Selecione uma aba",
      selectSheetHint: "O arquivo tem várias abas, escolha a correta",
      selectColumn: "Selecione a coluna",
      selectColumnHint: "Em qual coluna estão os nomes dos alunos?",
      column: "Coluna",
      hasHeader: "A primeira linha é cabeçalho",
      preview: "Prévia",
      previewHint: "Verifique se os nomes estão corretos",
      studentsFound: "alunos encontrados",
      import: "Importar",
      importing: "Importando...",
      cancel: "Cancelar",
      back: "← Voltar",
      error: "Erro",
      retry: "Tentar novamente",
      modifiedAt: "Modificado",
      rows: "linhas",
    },
  };

  const t = texts[language];

  // Cargar lista de spreadsheets al abrir
  useEffect(() => {
    if (isOpen) {
      loadSpreadsheets();
    }
  }, [isOpen]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setView("loading");
      setSpreadsheets([]);
      setSelectedSpreadsheet(null);
      setSelectedSheet(null);
      setSheetData([]);
      setSelectedColumn(0);
      setHasHeader(true);
      setPreviewStudents([]);
      setError("");
    }
  }, [isOpen]);

  // Actualizar preview cuando cambian los parámetros
  useEffect(() => {
    if (sheetData.length > 0) {
      const students = extractStudents(sheetData, selectedColumn, hasHeader);
      setPreviewStudents(students);
    }
  }, [sheetData, selectedColumn, hasHeader]);

  const loadSpreadsheets = async () => {
    setView("loading");
    setError("");
    
    try {
      const files = await listUserSpreadsheets(30);
      setSpreadsheets(files);
      setView("select-file");
    } catch (err: any) {
      setError(err.message || "Error loading files");
      setView("error");
    }
  };

  const handleSelectSpreadsheet = async (file: SpreadsheetListItem) => {
    setView("loading");
    setError("");
    
    try {
      const info = await getSpreadsheetInfo(file.id);
      setSelectedSpreadsheet(info);
      
      if (info.sheets.length === 1) {
        // Si solo hay una hoja, seleccionarla automáticamente
        await handleSelectSheet(info.sheets[0], info.id);
      } else {
        setView("select-sheet");
      }
    } catch (err: any) {
      setError(err.message || "Error loading spreadsheet");
      setView("error");
    }
  };

  const handleSelectSheet = async (sheet: SheetInfo, spreadsheetId?: string) => {
    setView("loading");
    setError("");
    setSelectedSheet(sheet);
    
    try {
      const id = spreadsheetId || selectedSpreadsheet?.id;
      if (!id) throw new Error("No spreadsheet selected");
      
      const data = await readSheetData(id, `'${sheet.title}'!A1:Z100`);
      setSheetData(data.values);
      setView("select-column");
    } catch (err: any) {
      setError(err.message || "Error loading sheet data");
      setView("error");
    }
  };

  const extractStudents = (data: string[][], columnIndex: number, skipHeader: boolean): string[] => {
    const startRow = skipHeader ? 1 : 0;
    return data
      .slice(startRow)
      .map(row => row[columnIndex] || "")
      .filter(name => name && name.trim() !== "")
      .map(name => name.trim());
  };

  const handleImport = () => {
    if (previewStudents.length > 0) {
      onImport(previewStudents);
      onClose();
    }
  };

  const getColumnLetter = (index: number): string => {
    return String.fromCharCode(65 + index);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString(
        language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US",
        { day: "2-digit", month: "short" }
      );
    } catch {
      return "—";
    }
  };

  // Detectar cuántas columnas tienen datos
  const availableColumns = sheetData.length > 0 
    ? Math.max(...sheetData.map(row => row.length))
    : 0;

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.title}</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {/* ========== LOADING ========== */}
        {view === "loading" && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
            <p style={{ color: "#64748b" }}>{t.loading}</p>
          </div>
        )}

        {/* ========== SELECT FILE ========== */}
        {view === "select-file" && (
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#334155" }}>
              {t.selectFile}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
              {t.selectFileHint}
            </p>

            {spreadsheets.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                <p>{t.noFiles}</p>
              </div>
            ) : (
              <div style={{ maxHeight: 350, overflowY: "auto" }}>
                {spreadsheets.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleSelectSpreadsheet(file)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      marginBottom: 8,
                      borderRadius: 10,
                      border: "2px solid #e2e8f0",
                      backgroundColor: "white",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 24 }}>📊</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {t.modifiedAt}: {formatDate(file.modifiedTime)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button onClick={onClose} style={{ ...secondaryButtonStyle, marginTop: 16 }}>
              {t.cancel}
            </button>
          </div>
        )}

        {/* ========== SELECT SHEET ========== */}
        {view === "select-sheet" && selectedSpreadsheet && (
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#334155" }}>
              {t.selectSheet}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: "#64748b" }}>
              📊 {selectedSpreadsheet.name}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#94a3b8" }}>
              {t.selectSheetHint}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedSpreadsheet.sheets.map((sheet) => (
                <button
                  key={sheet.sheetId}
                  onClick={() => handleSelectSheet(sheet)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: "2px solid #e2e8f0",
                    backgroundColor: "white",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#1e293b" }}>{sheet.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {sheet.rowCount} {t.rows}
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={() => setView("select-file")} 
              style={{ ...secondaryButtonStyle, marginTop: 16 }}
            >
              {t.back}
            </button>
          </div>
        )}

        {/* ========== SELECT COLUMN ========== */}
        {view === "select-column" && sheetData.length > 0 && (
          <div style={{ padding: 20 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#334155" }}>
              {t.selectColumn}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
              {t.selectColumnHint}
            </p>

            {/* Selector de columna */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                {t.column}
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Array.from({ length: Math.min(availableColumns, 10) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColumn(i)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: selectedColumn === i ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                      backgroundColor: selectedColumn === i ? "#eff6ff" : "white",
                      color: selectedColumn === i ? "#3b82f6" : "#64748b",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {getColumnLetter(i)}
                    {sheetData[0]?.[i] && (
                      <span style={{ fontWeight: 400, marginLeft: 4, fontSize: 11 }}>
                        ({sheetData[0][i].substring(0, 10)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox de header */}
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              marginBottom: 16,
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 14, color: "#475569" }}>{t.hasHeader}</span>
            </label>

            {/* Preview */}
            <div style={{
              backgroundColor: "#f8fafc",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
              maxHeight: 200,
              overflowY: "auto",
            }}>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: "#22c55e", 
                marginBottom: 8 
              }}>
                ✅ {previewStudents.length} {t.studentsFound}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {previewStudents.slice(0, 20).map((name, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "white",
                      borderRadius: 6,
                      fontSize: 13,
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {name}
                  </span>
                ))}
                {previewStudents.length > 20 && (
                  <span style={{ padding: "4px 10px", fontSize: 13, color: "#94a3b8" }}>
                    +{previewStudents.length - 20} más
                  </span>
                )}
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={() => setView(selectedSpreadsheet?.sheets.length === 1 ? "select-file" : "select-sheet")} 
                style={secondaryButtonStyle}
              >
                {t.back}
              </button>
              <button 
                onClick={handleImport}
                disabled={previewStudents.length === 0}
                style={{ 
                  ...primaryButtonStyle, 
                  flex: 1,
                  opacity: previewStudents.length === 0 ? 0.5 : 1,
                  cursor: previewStudents.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                {t.import} ({previewStudents.length})
              </button>
            </div>
          </div>
        )}

        {/* ========== ERROR ========== */}
        {view === "error" && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h3 style={{ margin: "0 0 8px", color: "#dc2626" }}>{t.error}</h3>
            <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
              {error}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={onClose} style={secondaryButtonStyle}>
                {t.cancel}
              </button>
              <button onClick={loadSpreadsheets} style={primaryButtonStyle}>
                {t.retry}
              </button>
            </div>
          </div>
        )}
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
  maxWidth: 520,
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
  backgroundColor: "#f0fdf4",
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
  backgroundColor: "#22c55e",
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