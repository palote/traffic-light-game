// ============================================
// ClassSelectorModal.tsx
// Modal para seleccionar o guardar cursos
// Ubicación: src/components/ClassSelectorModal.tsx
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getSavedClasses, 
  saveClass, 
  deleteClass,
  type SavedClass,
  type NewClassData 
} from '../services/savedClassesService';

interface ClassSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClass: (students: string[], defaultTeams: number, defaultStudentsPerTeam: number) => void;
  currentStudents: string[];
  currentTeams: number;
  currentStudentsPerTeam: number;
  language: 'es' | 'en' | 'pt';
}

export function ClassSelectorModal({
  isOpen,
  onClose,
  onSelectClass,
  currentStudents,
  currentTeams,
  currentStudentsPerTeam,
  language,
}: ClassSelectorModalProps) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SavedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'select' | 'save'>('select');
  const [newClassName, setNewClassName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const texts = {
    es: {
      title: '📂 Mis Cursos',
      selectTab: 'Cargar curso',
      saveTab: 'Guardar curso',
      noClasses: 'No tenés cursos guardados todavía',
      loadClass: 'Cargar',
      delete: 'Eliminar',
      confirmDeleteTitle: '¿Eliminar este curso?',
      confirmDeleteYes: 'Sí, eliminar',
      cancel: 'Cancelar',
      students: 'alumnos',
      teams: 'equipos de',
      saveNewClass: 'Guardar lista actual como curso',
      className: 'Nombre del curso',
      classNamePlaceholder: 'Ej: 3°A Matemática 2025',
      saveButton: 'Guardar curso',
      saving: 'Guardando...',
      currentList: 'Lista actual:',
      savedSuccess: '✅ Curso guardado',
      noStudentsToSave: 'No hay alumnos para guardar',
      close: 'Cerrar',
    },
    en: {
      title: '📂 My Classes',
      selectTab: 'Load class',
      saveTab: 'Save class',
      noClasses: "You don't have any saved classes yet",
      loadClass: 'Load',
      delete: 'Delete',
      confirmDeleteTitle: 'Delete this class?',
      confirmDeleteYes: 'Yes, delete',
      cancel: 'Cancel',
      students: 'students',
      teams: 'teams of',
      saveNewClass: 'Save current list as a class',
      className: 'Class name',
      classNamePlaceholder: 'E.g.: Grade 3A Math 2025',
      saveButton: 'Save class',
      saving: 'Saving...',
      currentList: 'Current list:',
      savedSuccess: '✅ Class saved',
      noStudentsToSave: 'No students to save',
      close: 'Close',
    },
    pt: {
      title: '📂 Minhas Turmas',
      selectTab: 'Carregar turma',
      saveTab: 'Salvar turma',
      noClasses: 'Você ainda não tem turmas salvas',
      loadClass: 'Carregar',
      delete: 'Excluir',
      confirmDeleteTitle: 'Excluir esta turma?',
      confirmDeleteYes: 'Sim, excluir',
      cancel: 'Cancelar',
      students: 'alunos',
      teams: 'equipes de',
      saveNewClass: 'Salvar lista atual como turma',
      className: 'Nome da turma',
      classNamePlaceholder: 'Ex: 3°A Matemática 2025',
      saveButton: 'Salvar turma',
      saving: 'Salvando...',
      currentList: 'Lista atual:',
      savedSuccess: '✅ Turma salva',
      noStudentsToSave: 'Não há alunos para salvar',
      close: 'Fechar',
    },
  };

  const t = texts[language];

  // Cargar cursos al abrir
  useEffect(() => {
    if (isOpen && user?.uid) {
      loadClasses();
    }
  }, [isOpen, user?.uid]);

  const loadClasses = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const savedClasses = await getSavedClasses(user.uid);
      setClasses(savedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (savedClass: SavedClass) => {
    onSelectClass(
      savedClass.students,
      savedClass.defaultTeams,
      savedClass.defaultStudentsPerTeam
    );
    onClose();
  };

  // ============================================
  // Versión mejorada con logs y alerta de error
  // ============================================
  const handleSaveClass = async () => {
    if (!user?.uid || !newClassName.trim() || currentStudents.length === 0) return;

    console.log('🔵 Attempting to save class:', {
      uid: user.uid,
      name: newClassName.trim(),
      studentsCount: currentStudents.length,
    });

    setSaving(true);
    try {
      const classId = await saveClass(user.uid, {
        name: newClassName.trim(),
        students: currentStudents,
        defaultTeams: currentTeams,
        defaultStudentsPerTeam: currentStudentsPerTeam,
      });
      console.log('🟢 Class saved with ID:', classId);
      setNewClassName('');
      setMode('select');
      await loadClasses();
    } catch (error: any) {
      console.error('🔴 Error saving class:', error);
      alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!user?.uid) return;
    try {
      await deleteClass(user.uid, classId);
      setConfirmDelete(null);
      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 20,
          width: '100%',
          maxWidth: 500,
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{t.title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: 36,
              height: 36,
              borderRadius: '50%',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <button
            onClick={() => setMode('select')}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              backgroundColor: mode === 'select' ? '#f8fafc' : 'white',
              color: mode === 'select' ? '#7c3aed' : '#64748b',
              cursor: 'pointer',
              borderBottom: mode === 'select' ? '3px solid #7c3aed' : '3px solid transparent',
            }}
          >
            📂 {t.selectTab}
          </button>
          <button
            onClick={() => setMode('save')}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              backgroundColor: mode === 'save' ? '#f8fafc' : 'white',
              color: mode === 'save' ? '#7c3aed' : '#64748b',
              cursor: 'pointer',
              borderBottom: mode === 'save' ? '3px solid #7c3aed' : '3px solid transparent',
            }}
          >
            💾 {t.saveTab}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {mode === 'select' ? (
            // Lista de cursos guardados
            loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                ⏳ Loading...
              </div>
            ) : classes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
                <p>{t.noClasses}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {classes.map((savedClass) => (
                  <div
                    key={savedClass.id}
                    style={{
                      padding: 16,
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {confirmDelete === savedClass.id ? (
                      // Confirmación de eliminación
                      <div>
                        <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#dc2626' }}>
                          {t.confirmDeleteTitle}
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleDeleteClass(savedClass.id)}
                            style={{
                              padding: '8px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              borderRadius: 8,
                              border: 'none',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            {t.confirmDeleteYes}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            style={{
                              padding: '8px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              backgroundColor: 'white',
                              color: '#64748b',
                              cursor: 'pointer',
                            }}
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Info del curso
                      <>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 8,
                          }}
                        >
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                            {savedClass.name}
                          </h4>
                        </div>
                        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
                          👥 {savedClass.students.length} {t.students} · 
                          📦 {savedClass.defaultTeams} {t.teams} {savedClass.defaultStudentsPerTeam}
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleSelectClass(savedClass)}
                            style={{
                              flex: 1,
                              padding: '8px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              borderRadius: 8,
                              border: 'none',
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              color: 'white',
                              cursor: 'pointer',
                            }}
                          >
                            📂 {t.loadClass}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(savedClass.id)}
                            style={{
                              padding: '8px 12px',
                              fontSize: 13,
                              fontWeight: 600,
                              borderRadius: 8,
                              border: '1px solid #fca5a5',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            // Guardar curso nuevo
            <div>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
                {t.saveNewClass}
              </p>

              {currentStudents.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    backgroundColor: '#fef3c7',
                    borderRadius: 12,
                    border: '2px solid #fbbf24',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, color: '#a16207' }}>⚠️ {t.noStudentsToSave}</p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      backgroundColor: '#f0fdf4',
                      borderRadius: 8,
                      border: '1px solid #86efac',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>
                      {t.currentList} <strong>{currentStudents.length} {t.students}</strong>
                    </p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#475569',
                      }}
                    >
                      {t.className}
                    </label>
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder={t.classNamePlaceholder}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: 14,
                        borderRadius: 10,
                        border: '2px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    onClick={handleSaveClass}
                    disabled={!newClassName.trim() || saving}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      fontSize: 15,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: 'none',
                      background: newClassName.trim()
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : '#e2e8f0',
                      color: newClassName.trim() ? 'white' : '#94a3b8',
                      cursor: newClassName.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {saving ? t.saving : `💾 ${t.saveButton}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: '2px solid #e2e8f0',
              backgroundColor: 'white',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}