// src/pages/LibraryPage.tsx
// Página de biblioteca de CSVs para el docente

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode } from "../contexts/GameModeContext";

import { LibraryCard } from "../components/library/LibraryCard";
import { getAllLibraryItems, getCSVAsFile, deleteLibraryItem } from "../services/libraryService";

import type { CSVLibraryItem, LibraryGameMode, PrimaryGrade, Area, Subject, LibraryLanguage } from "../types/library";
import { PRIMARY_GRADES, AREAS_ES, AREAS_EN, SUBJECTS_ES, SUBJECTS_EN } from "../types/library";

export function LibraryPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { mode: currentGameMode, theme } = useGameMode();

  // Estado
  const [items, setItems] = useState<CSVLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  
  // Filtros
  const [gameMode, setGameMode] = useState<LibraryGameMode | 'all'>(currentGameMode || 'all');
  const [grade, setGrade] = useState<PrimaryGrade | 'all'>('all');
  const [area, setArea] = useState<Area | 'all'>('all');
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const [language, setLanguage] = useState<LibraryLanguage | 'all'>('all');
  const [search, setSearch] = useState('');

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
      if (gameMode !== 'all' && item.gameMode !== gameMode) return false;
      if (grade !== 'all' && item.grade !== grade) return false;
      if (area !== 'all' && item.area !== area) return false;
      if (subject !== 'all' && item.subject !== subject) return false;
      if (language !== 'all' && item.language !== language) return false;
      
      if (search) {
        const searchLower = search.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(searchLower);
        const matchTopic = item.topic?.toLowerCase().includes(searchLower);
        const matchContents = item.mainContents?.toLowerCase().includes(searchLower);
        const matchFileName = item.fileName?.toLowerCase().includes(searchLower);
        if (!matchTitle && !matchTopic && !matchContents && !matchFileName) {
          return false;
        }
      }
      return true;
    });
  }, [items, gameMode, grade, area, subject, language, search]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const trafficLight = items.filter(i => i.gameMode === 'traffic-light').length;
    const coopetition = items.filter(i => i.gameMode === 'coopetition').length;
    const withFile = items.filter(i => !!i.storagePath).length;
    return { trafficLight, coopetition, withFile, total: items.length };
  }, [items]);

  // Handler: Usar un CSV en el juego
  const handleUseItem = async (item: CSVLibraryItem) => {
    setLoadingItemId(item.id);
    
    try {
      const file = await getCSVAsFile(item);
      
      const reader = new FileReader();
      reader.onload = () => {
        const csvContent = reader.result as string;
        sessionStorage.setItem('library_csv_content', csvContent);
        sessionStorage.setItem('library_csv_filename', file.name);
        sessionStorage.setItem('library_csv_title', item.title || item.topic);
        sessionStorage.setItem('library_csv_subject', item.subject || item.area);
        sessionStorage.setItem('library_csv_grade', item.grade || item.level || '');
        
        navigate('/setup', { 
          state: { 
            fromLibrary: true,
            csvTitle: item.title || item.topic,
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

  // Handler: Delete item (admin only)
  const handleDeleteItem = async (item: CSVLibraryItem) => {
    try {
      await deleteLibraryItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error al eliminar el item.");
    }
  };

  const isCoopetition = gameMode === 'coopetition';
  const showSubjectFilter = gameMode === 'coopetition' || gameMode === 'all';
  const showGradeFilter = gameMode === 'traffic-light' || gameMode === 'all';

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: theme.primaryGradient,
        padding: "24px 32px",
        color: "white",
        boxShadow: `0 4px 20px ${theme.primary}40`,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "8px 12px",
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ← Volver
            </button>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>📚</span>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Biblioteca</h1>
            </div>
          </div>

          <div style={{ fontSize: 14, opacity: 0.9 }}>
            {user?.email}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 800, color: "#1e293b" }}>
          Bancos de Preguntas
        </h2>
        <p style={{ margin: "0 0 24px 0", fontSize: 16, color: "#64748b" }}>
          Explorá preguntas organizadas por nivel, área y materia.
        </p>

        {/* Stats */}
        <div style={{
          display: "flex",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}>
          <div style={{
            padding: "12px 20px",
            backgroundColor: "#f0fdf4",
            borderRadius: 10,
            border: "2px solid #22c55e",
          }}>
            <span style={{ fontSize: 20, marginRight: 8 }}>🚦</span>
            <strong>{stats.trafficLight}</strong> Traffic Light
          </div>
          <div style={{
            padding: "12px 20px",
            backgroundColor: "#eef2ff",
            borderRadius: 10,
            border: "2px solid #6366f1",
          }}>
            <span style={{ fontSize: 20, marginRight: 8 }}>🎯</span>
            <strong>{stats.coopetition}</strong> Coopetition
          </div>
          <div style={{
            padding: "12px 20px",
            backgroundColor: "#f8fafc",
            borderRadius: 10,
            border: "2px solid #94a3b8",
          }}>
            <span style={{ fontSize: 20, marginRight: 8 }}>📄</span>
            <strong>{stats.withFile}</strong> con archivo
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16,
          }}>
            {/* Game Mode */}
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                Juego
              </label>
              <select
                value={gameMode}
                onChange={(e) => {
                  setGameMode(e.target.value as LibraryGameMode | 'all');
                  setGrade('all');
                  setSubject('all');
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                }}
              >
                <option value="all">Todos</option>
                <option value="traffic-light">🚦 Traffic Light</option>
                <option value="coopetition">🎯 Coopetition</option>
              </select>
            </div>

            {/* Grade (solo para Traffic Light) */}
            {showGradeFilter && (
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  Grado
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as PrimaryGrade | 'all')}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "2px solid #e2e8f0",
                  }}
                >
                  <option value="all">Todos</option>
                  {PRIMARY_GRADES.map(g => (
                    <option key={g} value={g}>{g} Primaria</option>
                  ))}
                </select>
              </div>
            )}

            {/* Area */}
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                Área
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as Area | 'all')}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                }}
              >
                <option value="all">Todas</option>
                <optgroup label="Español">
                  {AREAS_ES.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </optgroup>
                <optgroup label="English">
                  {AREAS_EN.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Subject (solo para Coopetition) */}
            {showSubjectFilter && (
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  Materia
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject | 'all')}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: "2px solid #e2e8f0",
                  }}
                >
                  <option value="all">Todas</option>
                  <optgroup label="Español">
                    {SUBJECTS_ES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  <optgroup label="English">
                    {SUBJECTS_EN.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Language */}
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                Idioma
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LibraryLanguage | 'all')}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                }}
              >
                <option value="all">Todos</option>
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>

            {/* Search */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                Buscar
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, tema o contenido..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 14, color: "#64748b" }}>
            Mostrando <strong>{filteredItems.length}</strong> de {items.length} items
          </div>
        </div>

        {/* Grid de cards */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p>Cargando biblioteca...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p>No se encontraron items con los filtros seleccionados.</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}>
            {filteredItems.map(item => (
              <LibraryCard
                key={item.id}
                item={item}
                onUse={handleUseItem}
                onDelete={isAdmin ? handleDeleteItem : undefined}
                isLoading={loadingItemId === item.id}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        {/* Sección Admin */}
        {isAdmin && (
          <div style={{
            marginTop: 48,
            padding: 24,
            backgroundColor: "#fffbeb",
            borderRadius: 16,
            border: "2px solid #fbbf24",
          }}>
            <h3 style={{
              margin: "0 0 12px 0",
              fontSize: 18,
              fontWeight: 700,
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              ⚙️ Administración
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#92400e", fontSize: 14 }}>
              Como administrador, podés subir nuevos bancos de preguntas.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/admin/library/upload")}
                style={{
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                📤 Subir individual
              </button>
              <button
                onClick={() => navigate("/admin/library/bulk")}
                style={{
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                📦 Bulk upload
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}