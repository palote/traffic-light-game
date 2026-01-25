// src/components/library/LibraryCard.tsx
// Card individual de un CSV en la biblioteca - Con funcionalidad completa para admin

import { useState, useRef } from "react";
import type { CSVLibraryItem, Subject, Area } from "../../types/library";
import { linkCSVFile, updateLibraryItemMetadata } from "../../services/libraryService";
import { ref as storageRef, uploadString } from "firebase/storage";
import { storage } from "../../firebase.config";
import { SUBJECT_TO_AREA, SUBJECTS_ES, SUBJECTS_EN } from "../../types/library";

interface LibraryCardProps {
  item: CSVLibraryItem;
  onUse: (item: CSVLibraryItem) => void;
  onDelete?: (item: CSVLibraryItem) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isAdmin?: boolean;
}

// Colores por área/materia
const AREA_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  'Lengua': { bg: "#fef3c7", border: "#f59e0b", icon: "📖" },
  'Matemática': { bg: "#dbeafe", border: "#3b82f6", icon: "🔢" },
  'Ciencias Naturales': { bg: "#dcfce7", border: "#22c55e", icon: "🌿" },
  'Ciencias Sociales': { bg: "#fce7f3", border: "#ec4899", icon: "🌍" },
  'Language Arts': { bg: "#fef3c7", border: "#f59e0b", icon: "📖" },
  'Mathematics': { bg: "#dbeafe", border: "#3b82f6", icon: "🔢" },
  'Natural Sciences': { bg: "#dcfce7", border: "#22c55e", icon: "🔬" },
  'Social Studies': { bg: "#fce7f3", border: "#ec4899", icon: "🌍" },
  'Chemistry': { bg: "#fae8ff", border: "#a855f7", icon: "⚗️" },
  'Química': { bg: "#fae8ff", border: "#a855f7", icon: "⚗️" },
  'Physics': { bg: "#e0e7ff", border: "#4f46e5", icon: "⚛️" },
  'Física': { bg: "#e0e7ff", border: "#4f46e5", icon: "⚛️" },
  'Biology': { bg: "#dcfce7", border: "#22c55e", icon: "🧬" },
  'Biología': { bg: "#dcfce7", border: "#22c55e", icon: "🧬" },
  'History': { bg: "#fef3c7", border: "#b45309", icon: "📜" },
  'Historia': { bg: "#fef3c7", border: "#b45309", icon: "📜" },
  'Geography': { bg: "#ccfbf1", border: "#0d9488", icon: "🗺️" },
  'Geografía': { bg: "#ccfbf1", border: "#0d9488", icon: "🗺️" },
};

export function LibraryCard({ item, onUse, onDelete, onRefresh, isLoading, isAdmin }: LibraryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Estados para CSV
  const [isLinkingCSV, setIsLinkingCSV] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para TXT
  const [isLinkingTXT, setIsLinkingTXT] = useState(false);
  const [txtSuccess, setTxtSuccess] = useState(false);
  const [txtError, setTxtError] = useState<string | null>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para editar materia
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  
  // Colores
  const colors = AREA_COLORS[item.subject || ''] || AREA_COLORS[item.area] || AREA_COLORS['Lengua'];
  
  const isCoopetition = item.gameMode === 'coopetition';
  const hasCSV = !!item.storagePath;
  const hasTXT = !!item.sourceTextPath;

  // ============================================
  // HANDLERS
  // ============================================

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.(item);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  // ----- CSV -----
  const handleCSVClick = () => {
    if (!isAdmin) return;
    csvInputRef.current?.click();
  };

  const handleCSVSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvError('Debe ser un archivo .csv');
      return;
    }

    setIsLinkingCSV(true);
    setCsvError(null);
    setCsvSuccess(false);

    try {
      const content = await file.text();
      await linkCSVFile(item.id, content);
      setCsvSuccess(true);
      setTimeout(() => onRefresh?.(), 1000);
    } catch (error) {
      console.error('Error linking CSV:', error);
      setCsvError('Error al subir CSV');
    } finally {
      setIsLinkingCSV(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // ----- TXT -----
  const handleTXTClick = () => {
    if (!isAdmin) return;
    txtInputRef.current?.click();
  };

  const handleTXTSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setTxtError('Debe ser un archivo .txt');
      return;
    }

    setIsLinkingTXT(true);
    setTxtError(null);
    setTxtSuccess(false);

    try {
      const content = await file.text();
      
      // Subir TXT a Storage
      const timestamp = Date.now();
      const safeTitle = (item.title || 'untitled').replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      const folder = item.gameMode === 'coopetition' ? 'coopetition' : 'traffic-light';
      const subFolder = item.grade || item.level || 'general';
      
      const txtPath = `csv-library/${folder}/${subFolder}/${item.area}/${timestamp}_${safeTitle}_source.txt`;
      const txtRef = storageRef(storage, txtPath);
      
      await uploadString(txtRef, content, "raw", { contentType: "text/plain" });
      
      // Actualizar metadata
      await updateLibraryItemMetadata(item.id, { sourceTextPath: txtPath });
      
      setTxtSuccess(true);
      setTimeout(() => onRefresh?.(), 1000);
    } catch (error) {
      console.error('Error uploading TXT:', error);
      setTxtError('Error al subir TXT');
    } finally {
      setIsLinkingTXT(false);
      if (txtInputRef.current) txtInputRef.current.value = '';
    }
  };

  // ----- MATERIA -----
  const handleSubjectChange = async (newSubject: Subject) => {
    setSavingSubject(true);
    try {
      const newArea = SUBJECT_TO_AREA[newSubject] || item.area;
      await updateLibraryItemMetadata(item.id, { 
        subject: newSubject,
        area: newArea 
      });
      setIsEditingSubject(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error updating subject:', error);
    } finally {
      setSavingSubject(false);
    }
  };

  const subjects = item.language === 'en' ? SUBJECTS_EN : SUBJECTS_ES;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div 
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: `2px solid ${colors.border}`,
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        opacity: hasCSV ? 1 : 0.8,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 12px 32px ${colors.border}30`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
      }}
    >
      {/* Hidden file inputs */}
      <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVSelected} />
      <input ref={txtInputRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleTXTSelected} />

      {/* Admin buttons (top right) */}
      {isAdmin && (
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
          {/* TXT button */}
          <button
            onClick={handleTXTClick}
            disabled={isLinkingTXT}
            title={hasTXT ? "TXT vinculado" : "Agregar TXT"}
            style={{
              padding: "4px 8px",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 4,
              border: "none",
              backgroundColor: txtSuccess ? "#dcfce7" : hasTXT ? "#dbeafe" : "#f1f5f9",
              color: txtSuccess ? "#16a34a" : hasTXT ? "#3b82f6" : "#64748b",
              cursor: isLinkingTXT ? "wait" : "pointer",
            }}
          >
            {txtSuccess ? "✅" : isLinkingTXT ? "⏳" : hasTXT ? "📄✓" : "📄+"}
          </button>

          {/* Delete button */}
          {onDelete && (
            <button 
              onClick={handleDelete}
              style={{
                padding: "4px 8px",
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 4,
                border: "none",
                backgroundColor: confirmDelete ? "#ef4444" : "#fee2e2",
                color: confirmDelete ? "white" : "#ef4444",
                cursor: "pointer",
              }}
            >
              {confirmDelete ? "¿Sí?" : "🗑️"}
            </button>
          )}
        </div>
      )}
      
      {/* CSV status button - Reemplazar si ya existe */}
      {isAdmin && (
        <button
          onClick={handleCSVClick}
          disabled={isLinkingCSV}
          style={{
            position: "absolute",
            top: 44,
            right: 12,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            borderRadius: 4,
            border: "none",
            backgroundColor: csvSuccess ? "#dcfce7" : isLinkingCSV ? "#e0e7ff" : hasCSV ? "#dbeafe" : "#fef3c7",
            color: csvSuccess ? "#16a34a" : isLinkingCSV ? "#4f46e5" : hasCSV ? "#3b82f6" : "#b45309",
            cursor: !isLinkingCSV ? "pointer" : "wait",
          }}
          title={hasCSV ? "Reemplazar CSV" : "Agregar CSV"}
        >
          {csvSuccess ? "✅ CSV" : isLinkingCSV ? "⏳..." : hasCSV ? "📊↻" : "📎 CSV"}
        </button>
      )}

      {/* Mostrar advertencia solo para no-admin sin CSV */}
      {!isAdmin && !hasCSV && (
        <span
          style={{
            position: "absolute",
            top: 44,
            right: 12,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            borderRadius: 4,
            backgroundColor: "#fef3c7",
            color: "#b45309",
          }}
        >
          ⚠️ Sin CSV
        </span>
      )}

      {/* Errors */}
      {(csvError || txtError) && (
        <div style={{
          position: "absolute",
          top: 76,
          right: 12,
          padding: "4px 8px",
          fontSize: 10,
          backgroundColor: "#fee2e2",
          color: "#ef4444",
          borderRadius: 4,
        }}>
          {csvError || txtError}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          flexShrink: 0,
          backgroundColor: colors.bg,
          border: `2px solid ${colors.border}`,
        }}>
          {colors.icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: "0 0 4px 0",
            fontSize: 15,
            fontWeight: 700,
            color: "#1e293b",
            lineHeight: 1.3,
            paddingRight: isAdmin ? 80 : 0,
          }}>
            {item.topic || item.title}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {item.fileName}
          </p>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
            {/* Game mode badge */}
            <span style={{
              display: "inline-block",
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 6,
              backgroundColor: isCoopetition ? "#eef2ff" : "#f0fdf4",
              color: isCoopetition ? "#6366f1" : "#22c55e",
            }}>
              {isCoopetition ? "🎯 Coopetition" : "🚦 Semáforo"}
            </span>
            
            {/* Subject/Area - editable for admin */}
            {isAdmin && isEditingSubject ? (
              <select
                value={item.subject || ''}
                onChange={(e) => handleSubjectChange(e.target.value as Subject)}
                disabled={savingSubject}
                style={{
                  padding: "3px 6px",
                  fontSize: 10,
                  borderRadius: 6,
                  border: "2px solid #6366f1",
                }}
                autoFocus
                onBlur={() => !savingSubject && setIsEditingSubject(false)}
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <span 
                onClick={() => isAdmin && setIsEditingSubject(true)}
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 6,
                  backgroundColor: colors.bg,
                  color: colors.border,
                  cursor: isAdmin ? "pointer" : "default",
                  border: isAdmin ? "1px dashed transparent" : "none",
                }}
                onMouseOver={(e) => isAdmin && (e.currentTarget.style.borderColor = colors.border)}
                onMouseOut={(e) => isAdmin && (e.currentTarget.style.borderColor = "transparent")}
                title={isAdmin ? "Click para editar" : ""}
              >
                {item.subject || item.area}
              </span>
            )}
            
            {/* Language */}
            <span style={{
              display: "inline-block",
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 6,
              backgroundColor: item.language === 'es' ? "#fef3c7" : "#cffafe",
              color: item.language === 'es' ? "#b45309" : "#0891b2",
            }}>
              {item.language === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
            </span>

            {/* Indicators */}
            {hasCSV && (
              <span style={{ fontSize: 10, color: "#22c55e" }} title="CSV vinculado">📊✓</span>
            )}
            {hasTXT && (
              <span style={{ fontSize: 10, color: "#3b82f6" }} title="TXT vinculado">📄✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{
          padding: "12px 0",
          borderTop: "1px solid #f1f5f9",
          fontSize: 13,
          color: "#475569",
          lineHeight: 1.6,
        }}>
          {item.area && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                Área
              </div>
              <div>{item.area}</div>
            </div>
          )}
          {item.mainContents && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                Contenidos
              </div>
              <div>{item.mainContents}</div>
            </div>
          )}
          {item.mainSkills && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                Habilidades
              </div>
              <div>{item.mainSkills}</div>
            </div>
          )}
          {item.questionCount && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                Preguntas
              </div>
              <div>{item.questionCount} preguntas</div>
            </div>
          )}
          {isAdmin && (
            <div style={{ marginTop: 10, fontSize: 10, color: "#94a3b8" }}>
              ID: {item.id}
              {item.storagePath && <span> | CSV: ✓</span>}
              {item.sourceTextPath && <span> | TXT: ✓</span>}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "auto",
        paddingTop: 12,
        borderTop: "1px solid #f1f5f9",
        gap: 8,
      }}>
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            backgroundColor: "white",
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          {expanded ? "▲ Menos" : "▼ Más info"}
        </button>

        <button
          onClick={() => hasCSV && onUse(item)}
          disabled={isLoading || !hasCSV}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            background: hasCSV 
              ? (isCoopetition 
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)")
              : "#e2e8f0",
            color: hasCSV ? "white" : "#94a3b8",
            cursor: hasCSV && !isLoading ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            if (!isLoading && hasCSV) {
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "none";
          }}
        >
          {isLoading ? "⏳ Cargando..." : !hasCSV ? "⚠️ Sin CSV" : "🎮 Usar"}
        </button>
      </div>
    </div>
  );
}
