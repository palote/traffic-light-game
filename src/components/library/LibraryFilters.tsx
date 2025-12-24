// src/components/library/LibraryFilters.tsx
// Filtros de búsqueda para la biblioteca de CSVs

import type { LibraryFilters, Grade, Subject } from "../../types/library";

const GRADES: Grade[] = ['3°', '4°', '5°', '6°', '7°'];
const SUBJECTS: Subject[] = ['Lengua', 'Matemática', 'Ciencias Naturales', 'Ciencias Sociales'];

interface LibraryFiltersProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  totalResults: number;
}

const styles = {
  container: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    marginBottom: 24,
  },
  title: {
    margin: "0 0 16px 0",
    fontSize: 16,
    fontWeight: 600,
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  filtersRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 16,
    alignItems: "flex-end",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    minWidth: 140,
    flex: "1 1 auto",
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#64748b",
  },
  select: {
    padding: "10px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#1e293b",
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
  },
  searchInput: {
    padding: "10px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "2px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#1e293b",
    outline: "none",
    transition: "all 0.2s",
    minWidth: 200,
    flex: "2 1 auto",
  },
  clearBtn: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 10,
    border: "none",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap" as const,
  },
  resultsCount: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #e2e8f0",
    fontSize: 14,
    color: "#64748b",
  },
};

export function LibraryFilters({ filters, onFiltersChange, totalResults }: LibraryFiltersProps) {
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      grade: e.target.value as Grade | 'all',
    });
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      subject: e.target.value as Subject | 'all',
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: e.target.value,
    });
  };

  const handleClear = () => {
    onFiltersChange({
      grade: 'all',
      subject: 'all',
      search: '',
    });
  };

  const hasActiveFilters = 
    filters.grade !== 'all' || 
    filters.subject !== 'all' || 
    filters.search !== '';

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <span>🔍</span>
        Filtrar preguntas
      </h3>
      
      <div style={styles.filtersRow}>
        {/* Filtro por Grado */}
        <div style={styles.filterGroup}>
          <label style={styles.label}>Grado</label>
          <select
            style={styles.select}
            value={filters.grade}
            onChange={handleGradeChange}
          >
            <option value="all">Todos los grados</option>
            {GRADES.map((grade) => (
              <option key={grade} value={grade}>{grade} grado</option>
            ))}
          </select>
        </div>

        {/* Filtro por Materia */}
        <div style={styles.filterGroup}>
          <label style={styles.label}>Materia</label>
          <select
            style={styles.select}
            value={filters.subject}
            onChange={handleSubjectChange}
          >
            <option value="all">Todas las materias</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        {/* Búsqueda por texto */}
        <div style={{ ...styles.filterGroup, flex: "2 1 auto" }}>
          <label style={styles.label}>Buscar</label>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Buscar por título o contenido..."
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Botón limpiar */}
        {hasActiveFilters && (
          <button
            style={styles.clearBtn}
            onClick={handleClear}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#e2e8f0";
              e.currentTarget.style.color = "#475569";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Contador de resultados */}
      <div style={styles.resultsCount}>
        {totalResults === 0 ? (
          <span>No se encontraron resultados</span>
        ) : totalResults === 1 ? (
          <span>1 banco de preguntas encontrado</span>
        ) : (
          <span>{totalResults} bancos de preguntas encontrados</span>
        )}
      </div>
    </div>
  );
}