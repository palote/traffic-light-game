// src/pages/admin/AdminLibraryFixPage.tsx
// Página para corregir metadata de items de biblioteca en lote

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllLibraryItems, updateLibraryItemMetadata, deleteLibraryItem } from '../../services/libraryService';
import { SUBJECT_TO_AREA, SUBJECTS_ES, SUBJECTS_EN, AREAS_ES, AREAS_EN } from '../../types/library';
import type { CSVLibraryItem, Subject, Area } from '../../types/library';

export function AdminLibraryFixPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CSVLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'no-file' | 'wrong-area'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getAllLibraryItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
      setMessage({ type: 'error', text: 'Error al cargar items' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar items
  const filteredItems = items.filter(item => {
    if (filter === 'no-file') return !item.storagePath;
    if (filter === 'wrong-area') {
      // Items donde el área no coincide con la materia según SUBJECT_TO_AREA
      if (item.subject && SUBJECT_TO_AREA[item.subject]) {
        return item.area !== SUBJECT_TO_AREA[item.subject];
      }
      return false;
    }
    return true;
  });

  // Actualizar materia y área de un item
  const handleUpdateSubject = async (itemId: string, newSubject: Subject) => {
    setSaving(itemId);
    try {
      const newArea = SUBJECT_TO_AREA[newSubject];
      await updateLibraryItemMetadata(itemId, { 
        subject: newSubject,
        area: newArea 
      });
      
      // Actualizar localmente
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, subject: newSubject, area: newArea }
          : item
      ));
      
      setMessage({ type: 'success', text: 'Item actualizado' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error updating item:', error);
      setMessage({ type: 'error', text: 'Error al actualizar' });
    } finally {
      setSaving(null);
    }
  };

  // Actualizar área directamente
  const handleUpdateArea = async (itemId: string, newArea: Area) => {
    setSaving(itemId);
    try {
      await updateLibraryItemMetadata(itemId, { area: newArea });
      
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, area: newArea }
          : item
      ));
      
      setMessage({ type: 'success', text: 'Área actualizada' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error updating area:', error);
      setMessage({ type: 'error', text: 'Error al actualizar' });
    } finally {
      setSaving(null);
    }
  };

  // Auto-corregir área basado en materia
  const handleAutoFixArea = async (item: CSVLibraryItem) => {
    if (!item.subject) return;
    
    const correctArea = SUBJECT_TO_AREA[item.subject];
    if (!correctArea || item.area === correctArea) return;
    
    await handleUpdateArea(item.id, correctArea);
  };

  // Auto-corregir todos los items con área incorrecta
  const handleAutoFixAll = async () => {
    const itemsToFix = items.filter(item => {
      if (item.subject && SUBJECT_TO_AREA[item.subject]) {
        return item.area !== SUBJECT_TO_AREA[item.subject];
      }
      return false;
    });

    if (itemsToFix.length === 0) {
      setMessage({ type: 'success', text: 'No hay items para corregir' });
      return;
    }

    setSaving('all');
    let fixed = 0;
    
    for (const item of itemsToFix) {
      try {
        const correctArea = SUBJECT_TO_AREA[item.subject!];
        await updateLibraryItemMetadata(item.id, { area: correctArea });
        fixed++;
      } catch (error) {
        console.error('Error fixing item:', item.id, error);
      }
    }

    await loadItems();
    setSaving(null);
    setMessage({ type: 'success', text: `${fixed} items corregidos` });
  };

  // Eliminar item
  const handleDelete = async (itemId: string) => {
    if (!confirm('¿Eliminar este item?')) return;
    
    setSaving(itemId);
    try {
      await deleteLibraryItem(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      setMessage({ type: 'success', text: 'Item eliminado' });
    } catch (error) {
      console.error('Error deleting item:', error);
      setMessage({ type: 'error', text: 'Error al eliminar' });
    } finally {
      setSaving(null);
    }
  };

  // Detectar materia desde el nombre del archivo
  const detectSubjectFromFileName = (fileName: string): Subject | null => {
    const lower = fileName.toLowerCase();
    
    if (lower.includes('quimica') || lower.includes('chemistry')) {
      return lower.includes('chemistry') ? 'Chemistry' : 'Química';
    }
    if (lower.includes('biologia') || lower.includes('biology') || lower.includes('cienciasnaturales') || lower.includes('naturalsciences')) {
      return lower.includes('biology') || lower.includes('naturalsciences') ? 'Biology' : 'Biología';
    }
    if (lower.includes('fisica') || lower.includes('physics')) {
      return lower.includes('physics') ? 'Physics' : 'Física';
    }
    if (lower.includes('historia') || lower.includes('history')) {
      return lower.includes('history') ? 'History' : 'Historia';
    }
    if (lower.includes('geografia') || lower.includes('geography')) {
      return lower.includes('geography') ? 'Geography' : 'Geografía';
    }
    if (lower.includes('matematica') || lower.includes('math')) {
      return lower.includes('math') ? 'Mathematics' : 'Matemática';
    }
    if (lower.includes('lengua') || lower.includes('language')) {
      return lower.includes('language') ? 'Language Arts' : 'Lengua';
    }
    
    return null;
  };

  // Auto-detectar y corregir basado en nombre de archivo
  const handleAutoDetectAll = async () => {
    const itemsToFix = items.filter(item => {
      const detected = detectSubjectFromFileName(item.fileName);
      if (!detected) return false;
      return item.subject !== detected || item.area !== SUBJECT_TO_AREA[detected];
    });

    if (itemsToFix.length === 0) {
      setMessage({ type: 'success', text: 'No hay items para corregir' });
      return;
    }

    if (!confirm(`Se corregirán ${itemsToFix.length} items basándose en el nombre del archivo. ¿Continuar?`)) {
      return;
    }

    setSaving('all');
    let fixed = 0;
    
    for (const item of itemsToFix) {
      try {
        const detected = detectSubjectFromFileName(item.fileName);
        if (detected) {
          await updateLibraryItemMetadata(item.id, { 
            subject: detected,
            area: SUBJECT_TO_AREA[detected] 
          });
          fixed++;
        }
      } catch (error) {
        console.error('Error fixing item:', item.id, error);
      }
    }

    await loadItems();
    setSaving(null);
    setMessage({ type: 'success', text: `${fixed} items corregidos` });
  };

  const subjects = items[0]?.language === 'en' ? SUBJECTS_EN : SUBJECTS_ES;
  const areas = items[0]?.language === 'en' ? AREAS_EN : AREAS_ES;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: 24 }}>
      {/* Header */}
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/library')}
            style={{
              padding: '8px 12px',
              fontSize: 14,
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
          <h1 style={{ margin: 0, fontSize: 24 }}>🔧 Corregir Biblioteca</h1>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleAutoDetectAll}
            disabled={saving !== null}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            🔍 Auto-detectar desde nombre
          </button>
          <button
            onClick={handleAutoFixAll}
            disabled={saving !== null}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            ✨ Auto-corregir áreas
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          maxWidth: 1200,
          margin: '0 auto 16px',
          padding: '12px 16px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#16a34a' : '#ef4444',
          borderRadius: 8,
          fontWeight: 600,
        }}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto 24px',
        display: 'flex',
        gap: 8,
      }}>
        {[
          { id: 'all', label: `Todos (${items.length})` },
          { id: 'no-file', label: `Sin archivo (${items.filter(i => !i.storagePath).length})` },
          { id: 'wrong-area', label: `Área incorrecta (${items.filter(i => i.subject && SUBJECT_TO_AREA[i.subject] && i.area !== SUBJECT_TO_AREA[i.subject]).length})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: filter === f.id ? 700 : 500,
              backgroundColor: filter === f.id ? '#6366f1' : 'white',
              color: filter === f.id ? 'white' : '#64748b',
              border: '2px solid',
              borderColor: filter === f.id ? '#6366f1' : '#e2e8f0',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          Cargando...
        </div>
      ) : (
        /* Items Table */
        <div style={{ 
          maxWidth: 1200, 
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#64748b' }}>Archivo</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#64748b' }}>Tema</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#64748b' }}>Materia</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#64748b' }}>Área Actual</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#64748b' }}>Área Correcta</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#64748b' }}>CSV</th>
                <th style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#64748b' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const detectedSubject = detectSubjectFromFileName(item.fileName);
                const correctArea = item.subject ? SUBJECT_TO_AREA[item.subject] : (detectedSubject ? SUBJECT_TO_AREA[detectedSubject] : null);
                const isAreaWrong = correctArea && item.area !== correctArea;
                
                return (
                  <tr 
                    key={item.id}
                    style={{ 
                      borderTop: '1px solid #f1f5f9',
                      backgroundColor: isAreaWrong ? '#fef3c7' : 'transparent',
                    }}
                  >
                    <td style={{ padding: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>{item.fileName}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.id}</div>
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>{item.topic}</td>
                    <td style={{ padding: 12 }}>
                      <select
                        value={item.subject || ''}
                        onChange={(e) => handleUpdateSubject(item.id, e.target.value as Subject)}
                        disabled={saving === item.id}
                        style={{
                          padding: '6px 8px',
                          fontSize: 12,
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <option value="">Sin materia</option>
                        {[...SUBJECTS_ES, ...SUBJECTS_EN].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {detectedSubject && item.subject !== detectedSubject && (
                        <div style={{ fontSize: 10, color: '#8b5cf6', marginTop: 4 }}>
                          Detectado: {detectedSubject}
                        </div>
                      )}
                    </td>
                    <td style={{ 
                      padding: 12, 
                      fontSize: 13,
                      color: isAreaWrong ? '#b45309' : '#1e293b',
                      fontWeight: isAreaWrong ? 600 : 400,
                    }}>
                      {item.area}
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: '#22c55e' }}>
                      {correctArea || '-'}
                    </td>
                    <td style={{ padding: 12 }}>
                      {item.storagePath ? (
                        <span style={{ color: '#22c55e', fontSize: 12 }}>✅</span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontSize: 12 }}>❌</span>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {isAreaWrong && (
                          <button
                            onClick={() => handleAutoFixArea(item)}
                            disabled={saving === item.id}
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              backgroundColor: '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            Fix
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={saving === item.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      <div style={{ 
        maxWidth: 1200, 
        margin: '24px auto 0',
        padding: 16,
        backgroundColor: '#f0f9ff',
        borderRadius: 8,
        fontSize: 13,
        color: '#0369a1',
      }}>
        <strong>📊 Resumen:</strong> {items.length} items totales | 
        {items.filter(i => i.storagePath).length} con CSV | 
        {items.filter(i => !i.storagePath).length} sin CSV | 
        {items.filter(i => i.subject && SUBJECT_TO_AREA[i.subject] && i.area !== SUBJECT_TO_AREA[i.subject]).length} con área incorrecta
      </div>
    </div>
  );
}