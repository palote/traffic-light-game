// src/components/library/LibraryCard.tsx
// Card individual de un CSV en la biblioteca - Versión expandida

import { useState } from "react";
import type { CSVLibraryItem } from "../../types/library";

interface LibraryCardProps {
  item: CSVLibraryItem;
  onUse: (item: CSVLibraryItem) => void;
  onDelete?: (item: CSVLibraryItem) => void;
  isLoading?: boolean;
  isAdmin?: boolean;
}

// Colores por área
const AREA_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  'Lengua': { bg: "#fef3c7", border: "#f59e0b", icon: "📖" },
  'Matemática': { bg: "#dbeafe", border: "#3b82f6", icon: "🔢" },
  'Ciencias Naturales': { bg: "#dcfce7", border: "#22c55e", icon: "🌿" },
  'Ciencias Sociales': { bg: "#fce7f3", border: "#ec4899", icon: "🌍" },
  'Language Arts': { bg: "#fef3c7", border: "#f59e0b", icon: "📖" },
  'Mathematics': { bg: "#dbeafe", border: "#3b82f6", icon: "🔢" },
  'Natural Sciences': { bg: "#dcfce7", border: "#22c55e", icon: "🔬" },
  'Social Studies': { bg: "#fce7f3", border: "#ec4899", icon: "🌍" },
};

// Colores por materia específica (para Coopetition)
const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Biología': { bg: "#dcfce7", text: "#16a34a" },
  'Biology': { bg: "#dcfce7", text: "#16a34a" },
  'Química': { bg: "#fae8ff", text: "#a855f7" },
  'Chemistry': { bg: "#fae8ff", text: "#a855f7" },
  'Física': { bg: "#e0e7ff", text: "#4f46e5" },
  'Physics': { bg: "#e0e7ff", text: "#4f46e5" },
  'Historia': { bg: "#fef3c7", text: "#b45309" },
  'History': { bg: "#fef3c7", text: "#b45309" },
  'Geografía': { bg: "#ccfbf1", text: "#0d9488" },
  'Geography': { bg: "#ccfbf1", text: "#0d9488" },
};

export function LibraryCard({ item, onUse, onDelete, isLoading, isAdmin }: LibraryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const colors = AREA_COLORS[item.area] || AREA_COLORS['Lengua'];
  const subjectColors = item.subject ? SUBJECT_COLORS[item.subject] : null;
  
  const isCoopetition = item.gameMode === 'coopetition';
  const hasStoragePath = !!item.storagePath;

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.(item);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

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
        opacity: hasStoragePath ? 1 : 0.7,
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
      {/* Admin delete button */}
      {isAdmin && onDelete && (
        <button 
          onClick={handleDelete}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 6,
            border: "none",
            backgroundColor: confirmDelete ? "#ef4444" : "#fee2e2",
            color: confirmDelete ? "white" : "#ef4444",
            cursor: "pointer",
          }}
        >
          {confirmDelete ? "Confirmar" : "🗑️"}
        </button>
      )}
      
      {/* No file warning */}
      {!hasStoragePath && (
        <span style={{
          position: "absolute",
          top: 12,
          right: isAdmin ? 80 : 12,
          padding: "4px 8px",
          fontSize: 10,
          fontWeight: 600,
          borderRadius: 4,
          backgroundColor: "#fef3c7",
          color: "#b45309",
        }}>
          ⚠️ Sin archivo
        </span>
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
            paddingRight: isAdmin ? 60 : 0,
          }}>
            {item.topic || item.title}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {item.fileName}
          </p>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
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
            
            {/* Grade or Level */}
            {item.grade && (
              <span style={{
                display: "inline-block",
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 6,
                backgroundColor: "#667eea",
                color: "white",
              }}>
                {item.grade}
              </span>
            )}
            {item.level && (
              <span style={{
                display: "inline-block",
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 6,
                backgroundColor: "#667eea",
                color: "white",
              }}>
                Secundario
              </span>
            )}
            
            {/* Area */}
            <span style={{ 
              display: "inline-block",
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 6,
              backgroundColor: colors.bg, 
              color: colors.border 
            }}>
              {item.area}
            </span>
            
            {/* Subject (only for Coopetition) */}
            {item.subject && subjectColors && (
              <span style={{ 
                display: "inline-block",
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 6,
                backgroundColor: subjectColors.bg, 
                color: subjectColors.text 
              }}>
                {item.subject}
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
          {item.mainContents && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontWeight: 600,
                color: "#1e293b",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}>
                Contenidos
              </div>
              <div>{item.mainContents}</div>
            </div>
          )}
          {item.mainSkills && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontWeight: 600,
                color: "#1e293b",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}>
                Habilidades
              </div>
              <div>{item.mainSkills}</div>
            </div>
          )}
          {item.questionCount && (
            <div>
              <div style={{
                fontWeight: 600,
                color: "#1e293b",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}>
                Preguntas
              </div>
              <div>{item.questionCount} preguntas</div>
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
          onClick={() => hasStoragePath && onUse(item)}
          disabled={isLoading || !hasStoragePath}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            background: isCoopetition 
              ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
              : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            color: "white",
            cursor: hasStoragePath && !isLoading ? "pointer" : "not-allowed",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: hasStoragePath ? 1 : 0.5,
          }}
          onMouseOver={(e) => {
            if (!isLoading && hasStoragePath) {
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "none";
          }}
        >
          {isLoading ? (
            <>⏳ Cargando...</>
          ) : !hasStoragePath ? (
            <>⚠️ Sin archivo</>
          ) : (
            <>🎮 Usar</>
          )}
        </button>
      </div>
    </div>
  );
}