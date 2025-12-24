// src/pages/LibraryPage.tsx
// Página de biblioteca de CSVs para el docente

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import { LibraryFilters, LibraryGrid } from "../components/library";
import { getAllLibraryItems, getCSVAsFile } from "../services/libraryService";

import type { CSVLibraryItem, LibraryFilters as Filters } from "../types/library";

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "24px 32px",
    color: "white",
    boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
  },
  headerContent: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: 16,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    fontSize: 32,
  },
  logoText: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.9,
  },
  content: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 24px",
  },
  pageTitle: {
    margin: "0 0 8px 0",
    fontSize: 28,
    fontWeight: 800,
    color: "#1e293b",
  },
  pageSubtitle: {
    margin: "0 0 32px 0",
    fontSize: 16,
    color: "#64748b",
  },
  adminSection: {
    marginTop: 48,
    padding: 24,
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    border: "2px solid #fbbf24",
  },
  adminTitle: {
    margin: "0 0 12px 0",
    fontSize: 18,
    fontWeight: 700,
    color: "#b45309",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  adminBtn: {
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};

export function LibraryPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Estado
  const [items, setItems] = useState<CSVLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    grade: 'all',
    subject: 'all',
    search: '',
  });

  // Cargar items al montar
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await getAllLibraryItems();
      setItems(data);
    } catch (error) {
      console.error("Error loading library:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro por grado
      if (filters.grade !== 'all' && item.grade !== filters.grade) {
        return false;
      }
      // Filtro por materia
      if (filters.subject !== 'all' && item.subject !== filters.subject) {
        return false;
      }
      // Filtro por búsqueda de texto
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(searchLower);
        const matchContent = item.content.toLowerCase().includes(searchLower);
        if (!matchTitle && !matchContent) {
          return false;
        }
      }
      return true;
    });
  }, [items, filters]);

  // Handler: Usar un CSV en el juego
  const handleUseItem = async (item: CSVLibraryItem) => {
    setLoadingItemId(item.id);
    
    try {
      // Descargar el CSV como File
      const file = await getCSVAsFile(item);
      
      // Navegar a /setup con el archivo precargado
      // Usamos sessionStorage para pasar el archivo (no se puede pasar por state directamente)
      const reader = new FileReader();
      reader.onload = () => {
        const csvContent = reader.result as string;
        sessionStorage.setItem('library_csv_content', csvContent);
        sessionStorage.setItem('library_csv_filename', file.name);
        sessionStorage.setItem('library_csv_title', item.title);
        sessionStorage.setItem('library_csv_subject', item.subject);
        sessionStorage.setItem('library_csv_grade', item.grade);
        
        navigate('/setup', { 
          state: { 
            fromLibrary: true,
            csvTitle: item.title,
          } 
        });
      };
      reader.readAsText(file);
      
    } catch (error) {
      console.error("Error loading CSV:", error);
      alert("Error al cargar el archivo. Intentá de nuevo.");
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <button
              style={styles.backBtn}
              onClick={() => navigate("/")}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
            >
              ← Volver
            </button>
            
            <div style={styles.logo}>
              <span style={styles.logoIcon}>📚</span>
              <h1 style={styles.logoText}>Biblioteca</h1>
            </div>
          </div>

          <div style={styles.userInfo}>
            <span style={styles.userEmail}>{user?.email}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={styles.content}>
        <h2 style={styles.pageTitle}>Bancos de Preguntas</h2>
        <p style={styles.pageSubtitle}>
          Explorá preguntas organizadas por grado y materia. Elegí un banco para usarlo en tu próximo juego.
        </p>

        {/* Filtros */}
        <LibraryFilters 
          filters={filters}
          onFiltersChange={setFilters}
          totalResults={filteredItems.length}
        />

        {/* Grid de cards */}
        <LibraryGrid
          items={filteredItems}
          onUseItem={handleUseItem}
          loadingItemId={loadingItemId}
          isLoading={isLoading}
        />

        {/* Sección Admin (solo visible para admins) */}
        {isAdmin && (
          <div style={styles.adminSection}>
            <h3 style={styles.adminTitle}>
              <span>⚙️</span>
              Administración
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#92400e", fontSize: 14 }}>
              Como administrador, podés subir nuevos bancos de preguntas a la biblioteca.
            </p>
            <button
              style={styles.adminBtn}
              onClick={() => navigate("/admin/library/upload")}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              📤 Subir nuevo banco de preguntas
            </button>
          </div>
        )}
      </main>
    </div>
  );
}