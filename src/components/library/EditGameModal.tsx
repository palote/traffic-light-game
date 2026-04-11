// src/components/library/EditGameModal.tsx
// Modal para editar metadata + preguntas de un juego guardado

import { useState, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { ref as storageRef, uploadString } from 'firebase/storage';
import { storage } from '../../firebase.config';
import type { TeacherGame } from '../../types/teacherLibrary';
import type { Area, Subject, PrimaryGrade, LibraryLanguage } from '../../types/library';
import { AREAS_ES, AREAS_EN, SUBJECTS_ES, SUBJECTS_EN, PRIMARY_GRADES } from '../../types/library';
import { getTeacherGameCSV } from '../../services/teacherLibraryService';

interface GeneratedQuestion {
  id: string;
  text: string;
  hint?: string;
  suggestedStage?: 1 | 2;
}

interface EditGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: TeacherGame;
  onSave: (updates: Partial<TeacherGame>) => Promise<void>;
}

function parseCSVToQuestions(csvText: string): GeneratedQuestion[] {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const questions: GeneratedQuestion[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Parse CSV respecting quoted fields
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { row.push(current); current = ''; }
      else { current += ch; }
    }
    row.push(current);
    if (row[0]?.trim()) {
      questions.push({
        id: `q${i}`,
        text: row[0]?.trim() || '',
        hint: row[1]?.trim() || '',
        suggestedStage: row[2]?.trim() === '2' ? 2 : 1,
      });
    }
  }
  return questions;
}

function questionsToCSV(questions: GeneratedQuestion[]): string {
  const lines = ['text,hint,stage'];
  for (const q of questions) {
    const text = `"${(q.text || '').replace(/"/g, '""')}"`;
    const hint = `"${(q.hint || '').replace(/"/g, '""')}"`;
    const stage = q.suggestedStage || 1;
    lines.push(`${text},${hint},${stage}`);
  }
  return lines.join('\n');
}

export function EditGameModal({ isOpen, onClose, game, onSave }: EditGameModalProps) {
  const { t, language: appLang } = useI18n();

  const [activeTab, setActiveTab] = useState<'info' | 'questions'>('info');

  // Info tab state
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description);
  const [gameMode, setGameMode] = useState<'traffic-light' | 'coopetition'>(
    game.gameMode === 'coopetition' ? 'coopetition' : 'traffic-light'
  );
  const [area, setArea] = useState<Area>(game.area);
  const [subject, setSubject] = useState<Subject | undefined>(game.subject);
  const [grade, setGrade] = useState<PrimaryGrade | undefined>(game.grade);
  const [topic, setTopic] = useState(game.topic);
  const [mainContents, setMainContents] = useState(game.mainContents);
  const [mainSkills, setMainSkills] = useState(game.mainSkills);
  const [language, setLanguage] = useState<LibraryLanguage>(game.language);
  
  // Nuevo estado para el nivel (Primaria/Secundaria)
  const [level, setLevel] = useState<'primary' | 'secondary'>(
    game.level === 'secondary' ? 'secondary' : 'primary'
  );

  // Questions tab state
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'questions' && !questionsLoaded) {
      loadQuestions();
    }
  }, [activeTab]);

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const file = await getTeacherGameCSV(game);
      const text = await file.text();
      const parsed = parseCSVToQuestions(text);
      setQuestions(parsed);
      setQuestionsLoaded(true);
    } catch (e) {
      setError('Error cargando preguntas');
    } finally {
      setLoadingQuestions(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError(t.admin.completeAllFields); return; }
    setIsSaving(true);
    setError(null);
    try {
      // Save info incluyendo los nuevos campos gameMode y level
      await onSave({
        title: title.trim(),
        description: description.trim(),
        area,
        gameMode,           // ← nuevo tipo de juego
        level: level === 'secondary' ? 'secondary' : undefined,
        subject: gameMode === 'coopetition' ? subject : undefined,
        grade: gameMode === 'traffic-light' ? grade : undefined,
        topic: topic.trim(),
        mainContents: mainContents.trim(),
        mainSkills: mainSkills.trim(),
        language,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (questions.length === 0) { setError('No hay preguntas para guardar'); return; }
    setIsSaving(true);
    setError(null);
    try {
      const csvContent = questionsToCSV(questions);
      const fileRef = storageRef(storage, game.storagePath);
      await uploadString(fileRef, csvContent, 'raw', { contentType: 'text/csv;charset=utf-8' });
      // Also update question count
      await onSave({ questionCount: questions.length });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando preguntas');
    } finally {
      setIsSaving(false);
    }
  };

  const areas = appLang === 'es' ? AREAS_ES : AREAS_EN;
  const subjects = appLang === 'es' ? SUBJECTS_ES : SUBJECTS_EN;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 16px', fontSize: 14, fontWeight: 600,
    borderRadius: 8, border: 'none', cursor: 'pointer',
    backgroundColor: active ? 'white' : 'transparent',
    color: active ? '#1e293b' : '#64748b',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
      <div style={{ backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'white' }}>✏️ {t.teacherLibrary.editGame}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{game.title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 24px 0', backgroundColor: '#f8fafc', display: 'flex', gap: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, width: '100%', gap: 4 }}>
            <button style={tabStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>
              📋 {appLang === 'es' ? 'Información' : 'Information'}
            </button>
            <button style={tabStyle(activeTab === 'questions')} onClick={() => setActiveTab('questions')}>
              ❓ {appLang === 'es' ? `Preguntas (${questionsLoaded ? questions.length : game.questionCount})` : `Questions (${questionsLoaded ? questions.length : game.questionCount})`}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.teacherLibrary.gameTitle} *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.teacherLibrary.gameDescription}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} rows={3} />
              </div>

              {/* NUEVO CAMPO: Tipo de juego */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Tipo de juego</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {([
                    { id: 'traffic-light' as const, icon: '🚦', label: 'Traffic Light Game' },
                    { id: 'coopetition' as const, icon: '🎯', label: 'Coopetition Game' },
                  ]).map((gm) => (
                    <button key={gm.id} type="button" onClick={() => setGameMode(gm.id)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10,
                        border: gameMode === gm.id ? '3px solid #f59e0b' : '2px solid #e2e8f0',
                        backgroundColor: gameMode === gm.id ? '#fffbeb' : 'white',
                        color: gameMode === gm.id ? '#b45309' : '#475569',
                        fontWeight: gameMode === gm.id ? 700 : 400,
                        cursor: 'pointer', fontSize: 13,
                      }}>
                      {gm.icon} {gm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>{t.library.area}</label>
                  <select value={area} onChange={(e) => setArea(e.target.value as Area)} style={inputStyle}>
                    {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {gameMode === 'traffic-light' ? (
                  <div>
                    <label style={labelStyle}>{t.library.grade}</label>
                    <select value={grade} onChange={(e) => setGrade(e.target.value as PrimaryGrade)} style={inputStyle}>
                      {PRIMARY_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>{t.library.subject}</label>
                    <select value={subject || ''} onChange={(e) => setSubject(e.target.value as Subject)} style={inputStyle}>
                      <option value="">--</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* NUEVO CAMPO: NIVEL (Primaria/Secundaria) */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Nivel</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['primary', 'secondary'] as const).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevel(lv)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 10,
                        border: level === lv ? '3px solid #f59e0b' : '2px solid #e2e8f0',
                        backgroundColor: level === lv ? '#fffbeb' : 'white',
                        color: level === lv ? '#b45309' : '#475569',
                        fontWeight: level === lv ? 700 : 400,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {lv === 'primary' ? '🎒 Primaria' : '🎓 Secundaria'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Tema</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>{t.library.contents}</label>
                  <textarea value={mainContents} onChange={(e) => setMainContents(e.target.value)} style={{ ...inputStyle, minHeight: 60 }} rows={2} />
                </div>
                <div>
                  <label style={labelStyle}>{t.library.skills}</label>
                  <textarea value={mainSkills} onChange={(e) => setMainSkills(e.target.value)} style={{ ...inputStyle, minHeight: 60 }} rows={2} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.setup.language}</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['es', 'en', 'pt'] as const).map((l) => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input type="radio" name="language" value={l} checked={language === l} onChange={() => setLanguage(l)} />
                      {l === 'es' ? '🇪🇸 Español' : l === 'en' ? '🇺🇸 English' : '🇧🇷 Português'}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#64748b' }}>
                <span>📝 {game.questionCount} preguntas</span> · <span>🎮 {gameMode === 'coopetition' ? 'Coopetition' : 'Traffic Light'}</span> · <span>{game.visibility === 'public' ? '🌐 Público' : '🔒 Privado'}</span>
              </div>
              {error && <div style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 20 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px 20px', fontSize: 15, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>{t.common.cancel}</button>
                <button type="submit" disabled={isSaving} style={{ flex: 2, padding: '14px 20px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                  {isSaving ? t.common.loading : `💾 ${t.common.save}`}
                </button>
              </div>
            </form>
          )}

          {/* QUESTIONS TAB */}
          {activeTab === 'questions' && (
            <div>
              {loadingQuestions ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                  <p>{appLang === 'es' ? 'Cargando preguntas...' : 'Loading questions...'}</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
                    ✏️ {appLang === 'es' ? 'Editá el texto de cada pregunta, su pista y etapa. Los cambios se guardan en tu biblioteca.' : 'Edit each question, hint and stage. Changes save to your library.'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {questions.map((q, i) => (
                      <div key={q.id} style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ padding: '2px 8px', backgroundColor: '#6366f1', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>{i + 1}</span>
                          <button
                            onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ padding: '2px 7px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', flexShrink: 0, marginTop: 3 }}>
                            ✕
                          </button>
                          <div style={{ flex: 1 }}>
                            <textarea
                              value={q.text}
                              onChange={(e) => setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item))}
                              rows={2}
                              style={{ width: '100%', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', resize: 'vertical', fontFamily: 'inherit', backgroundColor: '#fff', boxSizing: 'border-box' }}
                            />
                            <textarea
                              value={q.hint || ''}
                              onChange={(e) => setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, hint: e.target.value } : item))}
                              rows={1}
                              placeholder={appLang === 'es' ? '💡 Pista pedagógica (opcional)' : '💡 Hint (optional)'}
                              style={{ width: '100%', fontSize: 12, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px', resize: 'none', fontFamily: 'inherit', backgroundColor: '#f8fafc', marginTop: 5, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{appLang === 'es' ? 'Etapa:' : 'Stage:'}</span>
                              {([1, 2] as const).map(stage => (
                                <button key={stage}
                                  onClick={() => setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, suggestedStage: stage } : item))}
                                  style={{
                                    padding: '2px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, border: 'none', cursor: 'pointer',
                                    backgroundColor: (q.suggestedStage ?? 1) === stage ? (stage === 1 ? '#22c55e' : '#ef4444') : '#f1f5f9',
                                    color: (q.suggestedStage ?? 1) === stage ? 'white' : '#94a3b8',
                                  }}>
                                  {stage === 1 ? `🟢 ${appLang === 'es' ? 'Etapa 1' : 'Stage 1'}` : `🔴 ${appLang === 'es' ? 'Etapa 2' : 'Stage 2'}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {error && <div style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>{t.common.cancel}</button>
                    <button onClick={handleSaveQuestions} disabled={isSaving || questions.length === 0}
                      style={{ flex: 2, padding: '12px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                      {isSaving ? t.common.loading : `💾 ${appLang === 'es' ? `Guardar ${questions.length} preguntas` : `Save ${questions.length} questions`}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#475569' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' };