// src/components/library/SaveGameModal.tsx
// Modal para guardar un juego en la biblioteca personal
// ✅ FIX: Selector de nivel (Secundaria / Superior) para modo coopetición
// ✅ FIX: Materias de nivel superior
// ✅ FIX: Idioma portugués agregado

import { useState } from 'react';
import { useI18n } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useGameMode } from '../../contexts/GameModeContext';
import type { NewTeacherGame } from '../../types/teacherLibrary';
import type { Area, Subject, PrimaryGrade, LibraryLanguage } from '../../types/library';
import { AREAS_ES, AREAS_EN, AREAS_PT, SUBJECTS_ES, SUBJECTS_EN, SUBJECTS_PT, PRIMARY_GRADES } from '../../types/library';
import {
  HIGHER_SUBJECTS_ES,
  HIGHER_SUBJECTS_EN,
  HIGHER_SUBJECTS_PT,
} from '../../types/promptGenerator';

interface SaveGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gameData: NewTeacherGame, csvContent: string) => Promise<void>;
  csvContent: string;
  csvFileName?: string;
  initialData?: Partial<NewTeacherGame>;
}

// Strings locales para el selector de nivel
const LEVEL_STRINGS = {
  es: {
    levelLabel: 'Nivel educativo',
    secondary: 'Secundaria',
    higher: 'Superior (Terciario / Universidad)',
    subjectLabel: 'Materia / Carrera',
    yearLabel: 'Año',
  },
  en: {
    levelLabel: 'Education level',
    secondary: 'Secondary',
    higher: 'Higher Ed (College / University)',
    subjectLabel: 'Subject / Program',
    yearLabel: 'Year',
  },
  pt: {
    levelLabel: 'Nível educacional',
    secondary: 'Médio',
    higher: 'Superior (Faculdade / Universidade)',
    subjectLabel: 'Disciplina / Curso',
    yearLabel: 'Ano',
  },
};

export function SaveGameModal({
  isOpen,
  onClose,
  onSave,
  csvContent,
  csvFileName,
  initialData,
}: SaveGameModalProps) {
  const { t, language: appLang } = useI18n();
  const { user } = useAuth();
  const { mode: gameMode } = useGameMode();

  const lang = (appLang as string) in LEVEL_STRINGS
    ? (appLang as keyof typeof LEVEL_STRINGS)
    : 'es';

  const ls = LEVEL_STRINGS[lang];

  const [title, setTitle] = useState(initialData?.title || csvFileName?.replace('.csv', '') || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [area, setArea] = useState<Area>(initialData?.area || (appLang === 'es' ? 'Lengua' : appLang === 'pt' ? 'Língua Portuguesa' : 'Language Arts'));
  const [subject, setSubject] = useState<Subject | undefined>(initialData?.subject);
  const [grade, setGrade] = useState<PrimaryGrade | undefined>(initialData?.grade || '3°');
  const [topic, setTopic] = useState(initialData?.topic || '');
  const [mainContents, setMainContents] = useState(initialData?.mainContents || '');
  const [mainSkills, setMainSkills] = useState(initialData?.mainSkills || '');
  const [language, setLanguage] = useState<LibraryLanguage>(initialData?.language || (appLang as LibraryLanguage));
  const [visibility, setVisibility] = useState<'private' | 'public'>(initialData?.visibility || 'private');

  // ✅ NUEVO: Estado de nivel para modo coopetición
  const [educationLevel, setEducationLevel] = useState<'secondary' | 'higher'>(
    initialData?.level === 'higher' ? 'higher' : 'secondary'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError(t.admin.completeAllFields);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const gameData: NewTeacherGame = {
        title: title.trim(),
        description: description.trim(),
        gameMode: gameMode || 'traffic-light',
        language,
        area,
        // ✅ FIX: nivel y materia correctos según modo y nivel elegido
        subject: gameMode === 'coopetition' ? subject : undefined,
        grade: gameMode === 'traffic-light' ? grade : undefined,
        level: gameMode === 'coopetition' ? educationLevel : undefined,
        topic: topic.trim(),
        mainContents: mainContents.trim(),
        mainSkills: mainSkills.trim(),
        visibility,
      };

      await onSave(gameData, csvContent);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving game');
    } finally {
      setIsSaving(false);
    }
  };

  // Listas de área y materia según idioma
  const areas = appLang === 'pt' ? AREAS_PT : appLang === 'es' ? AREAS_ES : AREAS_EN;

  // Materias según nivel y idioma
  const getSubjects = () => {
    if (educationLevel === 'higher') {
      return appLang === 'pt' ? [...HIGHER_SUBJECTS_PT] : appLang === 'es' ? [...HIGHER_SUBJECTS_ES] : [...HIGHER_SUBJECTS_EN];
    }
    return appLang === 'pt' ? [...SUBJECTS_PT] : appLang === 'es' ? [...SUBJECTS_ES] : [...SUBJECTS_EN];
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: 20,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: 20, width: '100%',
        maxWidth: 600, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
            💾 {t.teacherLibrary.saveGame}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t.teacherLibrary.gameTitle} *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.teacherLibrary.gameTitlePlaceholder} style={inputStyle} required />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t.teacherLibrary.gameDescription}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.teacherLibrary.gameDescriptionPlaceholder} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} rows={3} />
          </div>

          {/* ✅ NUEVO: Selector de nivel para coopetición */}
          {gameMode === 'coopetition' && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>{ls.levelLabel}</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {([
                  { id: 'secondary' as const, icon: '🎓', label: ls.secondary },
                  { id: 'higher' as const, icon: '🏛️', label: ls.higher },
                ]).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      setEducationLevel(lvl.id);
                      setSubject(undefined); // Reset materia al cambiar nivel
                    }}
                    style={{
                      flex: 1, padding: '14px 16px', borderRadius: 10,
                      border: educationLevel === lvl.id ? '3px solid #6366f1' : '2px solid #e2e8f0',
                      backgroundColor: educationLevel === lvl.id ? '#eef2ff' : 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 14, fontWeight: educationLevel === lvl.id ? 600 : 400,
                      color: educationLevel === lvl.id ? '#6366f1' : '#475569',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{lvl.icon}</span>
                    <span>{lvl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Area & Grade/Subject */}
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
                <label style={labelStyle}>{ls.subjectLabel}</label>
                <select value={subject || ''} onChange={(e) => setSubject(e.target.value as Subject)} style={inputStyle}>
                  <option value="">--</option>
                  {getSubjects().map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Topic */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Topic</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="E.g.: Fractions and decimals" style={inputStyle} />
          </div>

          {/* Contents & Skills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>{t.library.contents}</label>
              <textarea value={mainContents} onChange={(e) => setMainContents(e.target.value)} placeholder="Main contents..." style={{ ...inputStyle, minHeight: 60 }} rows={2} />
            </div>
            <div>
              <label style={labelStyle}>{t.library.skills}</label>
              <textarea value={mainSkills} onChange={(e) => setMainSkills(e.target.value)} placeholder="Main skills..." style={{ ...inputStyle, minHeight: 60 }} rows={2} />
            </div>
          </div>

          {/* Language — ✅ FIX: con portugués */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{t.setup.language}</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { code: 'es', flag: '🇪🇸', label: t.setup.spanish },
                { code: 'en', flag: '🇺🇸', label: t.setup.english },
                { code: 'pt', flag: '🇧🇷', label: t.setup.portuguese },
              ].map(({ code, flag, label }) => (
                <label key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="radio"
                    name="language"
                    value={code}
                    checked={language === code}
                    onChange={() => setLanguage(code as LibraryLanguage)}
                  />
                  {flag} {label}
                </label>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>{t.teacherLibrary.selectVisibility}</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                style={{
                  flex: 1, padding: 16, borderRadius: 10,
                  border: visibility === 'private' ? '3px solid #6366f1' : '2px solid #e2e8f0',
                  backgroundColor: visibility === 'private' ? '#eef2ff' : 'white',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{t.teacherLibrary.private}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.teacherLibrary.onlyYou}</div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('public')}
                style={{
                  flex: 1, padding: 16, borderRadius: 10,
                  border: visibility === 'public' ? '3px solid #22c55e' : '2px solid #e2e8f0',
                  backgroundColor: visibility === 'public' ? '#f0fdf4' : 'white',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>🌐</div>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{t.teacherLibrary.public}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{t.teacherLibrary.everyoneCanSee}</div>
              </button>
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: 12, color: '#64748b' }}>
              💡 {t.teacherLibrary.visibilityNote}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '14px 20px', fontSize: 15, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{ flex: 2, padding: '14px 20px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? t.common.loading : `💾 ${t.teacherLibrary.saveGame}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#475569',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10,
  border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box',
};