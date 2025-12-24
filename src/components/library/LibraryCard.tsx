// src/components/library/LibraryCard.tsx
// Card individual de un CSV en la biblioteca

import type { CSVLibraryItem } from "../../types/library";

interface LibraryCardProps {
  item: CSVLibraryItem;
  onUse: (item: CSVLibraryItem) => void;
  isLoading?: boolean;
}

// Colores por materia
const SUBJECT_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  'Lengua': { bg: "#fef3c7", border: "#f59e0b", icon: "📖" },
  'Matemática': { bg: "#dbeafe", border: "#3b82f6", icon: "🔢" },
  'Ciencias Naturales': { bg: "#dcfce7", border: "#22c55e", icon: "🌿" },
  'Ciencias Sociales': { bg: "#fce7f3", border: "#ec4899", icon: "🌍" },
};

const styles = {
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "2px solid #e2e8f0",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    cursor: "default",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    flexShrink: 0,
  },
  titleSection: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
    lineHeight: 1.3,
  },
  badges: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 6,
  },
  badge: {
    display: "inline-block",
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  gradeBadge: {
    backgroundColor: "#667eea",
    color: "white",
  },
  content: {
    margin: 0,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 12,
    borderTop: "1px solid #f1f5f9",
  },
  questionCount: {
    fontSize: 12,
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  useBtn: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
};

export function LibraryCard({ item, onUse, isLoading }: LibraryCardProps) {
  const colors = SUBJECT_COLORS[item.subject] || SUBJECT_COLORS['Lengua'];

  return (
    <div 
      style={{
        ...styles.card,
        borderColor: colors.border,
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
      {/* Header con icono y título */}
      <div style={styles.header}>
        <div 
          style={{
            ...styles.iconContainer,
            backgroundColor: colors.bg,
            border: `2px solid ${colors.border}`,
          }}
        >
          {colors.icon}
        </div>
        
        <div style={styles.titleSection}>
          <h3 style={styles.title}>{item.title}</h3>
          
          <div style={styles.badges}>
            <span style={{ ...styles.badge, ...styles.gradeBadge }}>
              {item.grade}
            </span>
            <span style={{ ...styles.badge, backgroundColor: colors.bg, color: colors.border }}>
              {item.subject}
            </span>
          </div>
        </div>
      </div>

      {/* Descripción del contenido */}
      <p style={styles.content}>{item.content}</p>

      {/* Footer con contador y botón */}
      <div style={styles.footer}>
        <span style={styles.questionCount}>
          <span>📝</span>
          {item.questionCount 
            ? `${item.questionCount} preguntas` 
            : "Preguntas disponibles"
          }
        </span>

        <button
          style={{
            ...styles.useBtn,
            opacity: isLoading ? 0.7 : 1,
          }}
          onClick={() => onUse(item)}
          disabled={isLoading}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {isLoading ? (
            <>⏳ Cargando...</>
          ) : (
            <>🎮 Usar en juego</>
          )}
        </button>
      </div>
    </div>
  );
}