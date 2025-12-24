// src/components/library/LibraryGrid.tsx
// Grid de cards de CSVs

import { LibraryCard } from "./LibraryCard";
import type { CSVLibraryItem } from "../../types/library";

interface LibraryGridProps {
  items: CSVLibraryItem[];
  onUseItem: (item: CSVLibraryItem) => void;
  loadingItemId?: string | null;
  isLoading?: boolean;
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
  },
  emptyState: {
    gridColumn: "1 / -1",
    textAlign: "center" as const,
    padding: 60,
    backgroundColor: "white",
    borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    margin: "0 0 8px 0",
    fontSize: 20,
    fontWeight: 700,
    color: "#475569",
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: "#94a3b8",
  },
  loadingState: {
    gridColumn: "1 / -1",
    textAlign: "center" as const,
    padding: 60,
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 16px",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
  },
};

// CSS animation para el spinner
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export function LibraryGrid({ items, onUseItem, loadingItemId, isLoading }: LibraryGridProps) {
  // Inyectar keyframes para el spinner
  if (typeof document !== 'undefined') {
    const styleId = 'library-grid-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = spinKeyframes;
      document.head.appendChild(style);
    }
  }

  // Estado de carga inicial
  if (isLoading) {
    return (
      <div style={styles.grid}>
        <div style={styles.loadingState}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Cargando biblioteca...</p>
        </div>
      </div>
    );
  }

  // Sin resultados
  if (items.length === 0) {
    return (
      <div style={styles.grid}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📚</div>
          <h3 style={styles.emptyTitle}>No hay preguntas disponibles</h3>
          <p style={styles.emptyText}>
            Probá ajustando los filtros o buscando con otros términos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {items.map((item) => (
        <LibraryCard
          key={item.id}
          item={item}
          onUse={onUseItem}
          isLoading={loadingItemId === item.id}
        />
      ))}
    </div>
  );
}