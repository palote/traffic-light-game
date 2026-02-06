// src/components/PromptGeneratorModal.tsx
// Modal para generar prompts de consignas educativas con IA

import { useState, useMemo } from 'react';
import { useI18n } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import type { 
  PromptConfig, 
  ContentCategory,
  PromptLanguage,
  SavedPreset,
} from '../types/promptGenerator';
import {
  DEFAULT_CONFIG,
  PRIMARY_SUBJECTS_ES,
  SECONDARY_SUBJECTS_ES,
  PRIMARY_SUBJECTS_EN,
  SECONDARY_SUBJECTS_EN,
  PRIMARY_SUBJECTS_PT, // ✅ AGREGADO
  SECONDARY_SUBJECTS_PT, // ✅ AGREGADO
  HISTORICAL_EVENTS,
  BOOKS,
  MEDIA_CONTENT,
} from '../types/promptGenerator';
import {
  generatePrompt,
  copyToClipboard,
  openInGemini,
  getSavedPresets,
  savePreset,
  deletePreset,
} from '../services/promptGeneratorService';

interface PromptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIMARY_GRADES = ['3°', '4°', '5°', '6°', '7°'];
const SECONDARY_GRADES = ['1°', '2°', '3°', '4°', '5°', '6°'];

export function PromptGeneratorModal({ isOpen, onClose }: PromptGeneratorModalProps) {
  const { t, language: appLang } = useI18n();
  const { theme } = useGameMode();

  // Config state
  const [config, setConfig] = useState<PromptConfig>({
    ...DEFAULT_CONFIG,
    language: appLang as PromptLanguage,
  });

  // UI state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showStageInfo, setShowStageInfo] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<SavedPreset[]>(getSavedPresets());

  // Filters for content lists
  const [historyFilter, setHistoryFilter] = useState<'all' | 'universal' | 'argentina' | 'americas'>('all');
  const [bookFilter, setBookFilter] = useState<'all' | 'primary' | 'secondary'>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'movie' | 'series' | 'documentary'>('all');

  // Get subjects based on level and language
  const subjects = useMemo(() => { // ✅ MODIFICADO
    if (config.level === 'primary') {
      if (config.language === 'pt') return [...PRIMARY_SUBJECTS_PT];
      if (config.language === 'en') return [...PRIMARY_SUBJECTS_EN];
      return [...PRIMARY_SUBJECTS_ES];
    }
    if (config.language === 'pt') return [...SECONDARY_SUBJECTS_PT];
    if (config.language === 'en') return [...SECONDARY_SUBJECTS_EN];
    return [...SECONDARY_SUBJECTS_ES];
  }, [config.level, config.language]);

  // Get grades based on level
  const grades = config.level === 'primary' ? PRIMARY_GRADES : SECONDARY_GRADES;

  // Filter historical events
  const filteredEvents = useMemo(() => {
    let events = HISTORICAL_EVENTS.filter(e => 
      e.level === 'both' || e.level === config.level
    );
    if (historyFilter !== 'all') {
      events = events.filter(e => e.category === historyFilter);
    }
    return events;
  }, [config.level, historyFilter]);

  // Filter books
  const filteredBooks = useMemo(() => {
    let books = [...BOOKS];
    if (bookFilter === 'primary') {
      books = books.filter(b => b.level === 'primary' || b.level === 'both');
    } else if (bookFilter === 'secondary') {
      books = books.filter(b => b.level === 'secondary' || b.level === 'both');
    }
    return books;
  }, [bookFilter]);

  // Filter media
  const filteredMedia = useMemo(() => {
    let media = MEDIA_CONTENT.filter(m => 
      m.level === 'both' || m.level === config.level
    );
    if (mediaFilter !== 'all') {
      media = media.filter(m => m.type === mediaFilter);
    }
    return media;
  }, [config.level, mediaFilter]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Update config helper
  const updateConfig = (updates: Partial<PromptConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Handle generate
  const handleGenerate = () => {
    const prompt = generatePrompt(config);
    setGeneratedPrompt(prompt);
  };

  // Handle copy
  const handleCopy = async () => {
    if (generatedPrompt) {
      const success = await copyToClipboard(generatedPrompt);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  // Handle open in Gemini
  const handleOpenGemini = () => {
    if (generatedPrompt) {
      openInGemini(generatedPrompt);
    }
  };

  // Handle save preset
  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    savePreset({
      name: presetName.trim(),
      level: config.level,
      grade: config.grade,
      category: config.category,
      selection: config.selection,
      customSelection: config.customSelection,
      language: config.language,
    });
    
    setPresets(getSavedPresets());
    setPresetName('');
  };

  // Handle load preset
  const handleLoadPreset = (preset: SavedPreset) => {
    updateConfig({
      level: preset.level,
      grade: preset.grade,
      category: preset.category,
      selection: preset.selection,
      customSelection: preset.customSelection,
      language: preset.language,
    });
    setShowPresets(false);
  };

  // Handle delete preset
  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    setPresets(getSavedPresets());
  };

  // Check if can proceed
  const canProceed = config.selection !== '' && (config.selection !== 'custom' || config.customSelection);

  // Render content selection based on category
  const renderContentSelection = () => {
    const renderOption = (id: string, label: string, subtitle?: string) => (
      <button
        key={id}
        onClick={() => updateConfig({ selection: id })}
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          border: config.selection === id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0',
          backgroundColor: config.selection === id ? `${theme.primary}15` : 'white',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: config.selection === id ? 600 : 400, color: config.selection === id ? theme.primary : '#475569' }}>
          {label}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
      </button>
    );

    const renderCustomOption = () => (
      <>
        <button
          onClick={() => updateConfig({ selection: 'custom' })}
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            border: config.selection === 'custom' ? `3px solid ${theme.primary}` : '2px dashed #cbd5e1',
            backgroundColor: config.selection === 'custom' ? `${theme.primary}15` : '#f8fafc',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 14,
            color: '#64748b',
          }}
        >
          ➕ {t.promptGenerator.other}
        </button>
        {config.selection === 'custom' && (
          <input
            type="text"
            value={config.customSelection || ''}
            onChange={(e) => updateConfig({ customSelection: e.target.value })}
            placeholder={t.promptGenerator.customPlaceholder}
            style={{ ...inputStyle, marginTop: 8 }}
            autoFocus
          />
        )}
      </>
    );

    const renderFilterButtons = (
      filters: readonly string[],
      current: string,
      setter: (v: any) => void,
      labels: Record<string, string>
    ) => (
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setter(f)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: 'none',
              backgroundColor: current === f ? theme.primary : '#f1f5f9',
              color: current === f ? 'white' : '#64748b',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {labels[f]}
          </button>
        ))}
      </div>
    );

    switch (config.category) {
      case 'subject':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subjects.map((subj) => renderOption(subj, subj))}
            {renderCustomOption()}
          </div>
        );

      case 'history':
        return (
          <div>
            {renderFilterButtons(
              ['all', 'universal', 'argentina', 'americas'] as const,
              historyFilter,
              setHistoryFilter,
              { all: t.promptGenerator.showAll, universal: t.promptGenerator.universal, argentina: t.promptGenerator.argentina, americas: t.promptGenerator.americas }
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {filteredEvents.map((event) => renderOption(
                event.id,
                config.language === 'es' ? event.nameEs : event.nameEn
              ))}
              {renderCustomOption()}
            </div>
          </div>
        );

      case 'book':
        return (
          <div>
            {renderFilterButtons(
              ['all', 'primary', 'secondary'] as const,
              bookFilter,
              setBookFilter,
              { all: t.promptGenerator.showAll, primary: t.promptGenerator.forPrimary, secondary: t.promptGenerator.forSecondary }
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {filteredBooks.map((book) => renderOption(book.id, `📖 ${book.title}`, book.author))}
              {renderCustomOption()}
            </div>
          </div>
        );

      case 'fun':
        return (
          <div>
            {renderFilterButtons(
              ['all', 'movie', 'series', 'documentary'] as const,
              mediaFilter,
              setMediaFilter,
              { all: t.promptGenerator.showAll, movie: t.promptGenerator.movies, series: t.promptGenerator.series, documentary: t.promptGenerator.documentaries }
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {filteredMedia.map((media) => renderOption(
                media.id,
                `${media.type === 'movie' ? '🎬' : media.type === 'series' ? '📺' : '🎥'} ${media.title}`,
                media.themes.slice(0, 3).join(' • ')
              ))}
              {renderCustomOption()}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // If showing generated prompt
  if (generatedPrompt) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, maxWidth: 800 }}>
          <div style={{ ...headerStyle, background: theme.primaryGradient }}>
            <h2 style={headerTitleStyle}>✅ {t.promptGenerator.promptReady}</h2>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>
          </div>

          <div style={{ padding: 24 }}>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 14 }}>
              {t.promptGenerator.promptReadyDesc}
            </p>

            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: 12,
              padding: 16,
              maxHeight: 400,
              overflowY: 'auto',
              marginBottom: 20,
            }}>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                color: '#e2e8f0',
                fontFamily: 'monospace',
              }}>
                {generatedPrompt}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: '14px 20px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: 'none',
                  background: copied ? '#22c55e' : theme.primaryGradient,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓' : '📋'} {copied ? t.promptGenerator.copied : t.promptGenerator.copyToClipboard}
              </button>

              <button
                onClick={handleOpenGemini}
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: '14px 20px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ✨ {t.promptGenerator.openInGemini}
              </button>
            </div>

            <button
              onClick={() => setGeneratedPrompt(null)}
              style={{
                width: '100%',
                marginTop: 12,
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
              ← {t.common.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ ...headerStyle, background: theme.primaryGradient }}>
          <div>
            <h2 style={headerTitleStyle}>🤖 {t.promptGenerator.title}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
              {t.promptGenerator.subtitle}
            </p>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', padding: '16px 24px', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              onClick={() => step <= currentStep && setCurrentStep(step as 1 | 2 | 3)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: currentStep === step ? theme.primary : currentStep > step ? '#dcfce7' : '#f1f5f9',
                color: currentStep === step ? 'white' : currentStep > step ? '#16a34a' : '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center',
                cursor: step <= currentStep ? 'pointer' : 'default',
              }}
            >
              {step}. {t.promptGenerator[`step${step}` as keyof typeof t.promptGenerator]}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 24, maxHeight: '55vh', overflowY: 'auto' }}>
          
          {/* Step 1: Level & Config */}
          {currentStep === 1 && (
            <div>
              {/* Education Level */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.level}</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['primary', 'secondary'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateConfig({ level, grade: level === 'primary' ? '6°' : '3°', selection: '' })}
                      style={{
                        flex: 1,
                        padding: '16px',
                        borderRadius: 12,
                        border: config.level === level ? `3px solid ${theme.primary}` : '2px solid #e2e8f0',
                        backgroundColor: config.level === level ? `${theme.primary}15` : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{level === 'primary' ? '🎒' : '🎓'}</div>
                      <div style={{ fontWeight: 600, color: config.level === level ? theme.primary : '#1e293b' }}>
                        {t.promptGenerator[level]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.grade}</label>
                <select
                  value={config.grade}
                  onChange={(e) => updateConfig({ grade: e.target.value })}
                  style={selectStyle}
                >
                  {grades.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Language */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.promptLanguage}</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['es', 'en', 'pt'] as const).map((lang) => ( // ✅ MODIFICADO: agregado 'pt'
                    <button
                      key={lang}
                      onClick={() => updateConfig({ language: lang, selection: '' })}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: config.language === lang ? `3px solid ${theme.primary}` : '2px solid #e2e8f0',
                        backgroundColor: config.language === lang ? `${theme.primary}15` : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>
                        {lang === 'es' ? '🇪🇸' : lang === 'en' ? '🇺🇸' : '🇧🇷'}
                      </span>
                      <span style={{ fontWeight: 600, color: config.language === lang ? theme.primary : '#475569' }}>
                        {t.promptGenerator[lang === 'es' ? 'spanish' : lang === 'en' ? 'english' : 'portuguese']}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Presets */}
              <div>
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '2px dashed #e2e8f0',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#64748b',
                    fontSize: 14,
                  }}
                >
                  <span>💾 {t.promptGenerator.savedPresets}</span>
                  <span>{showPresets ? '▲' : '▼'}</span>
                </button>

                {showPresets && (
                  <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    {presets.length === 0 ? (
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                        {t.promptGenerator.noPresets}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {presets.map((preset) => (
                          <div key={preset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{preset.name}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleLoadPreset(preset)} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', backgroundColor: theme.primary, color: 'white', cursor: 'pointer' }}>
                                {t.promptGenerator.loadPreset}
                              </button>
                              <button onClick={() => handleDeletePreset(preset.id)} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}>
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Content Selection */}
          {currentStep === 2 && (
            <div>
              {/* Category selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.category}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {([
                    { id: 'subject' as ContentCategory, icon: '📚', label: t.promptGenerator.subject },
                    { id: 'history' as ContentCategory, icon: '📜', label: t.promptGenerator.history },
                    { id: 'book' as ContentCategory, icon: '📖', label: t.promptGenerator.book },
                    { id: 'fun' as ContentCategory, icon: '🎬', label: t.promptGenerator.fun },
                  ]).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateConfig({ category: cat.id, selection: '' })}
                      style={{
                        padding: '16px',
                        borderRadius: 12,
                        border: config.category === cat.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0',
                        backgroundColor: config.category === cat.id ? `${theme.primary}15` : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: config.category === cat.id ? theme.primary : '#1e293b' }}>
                        {cat.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  {config.category === 'subject' && t.promptGenerator.selectSubject}
                  {config.category === 'history' && t.promptGenerator.selectEvent}
                  {config.category === 'book' && t.promptGenerator.selectBook}
                  {config.category === 'fun' && t.promptGenerator.selectMedia}
                </label>
                {renderContentSelection()}
              </div>

              {/* Stage explanation */}
              <div style={{ padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <div onClick={() => setShowStageInfo(!showStageInfo)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 600, color: '#1e40af', fontSize: 14 }}>💡 {t.promptGenerator.stageExplanation}</span>
                  <span style={{ color: '#1e40af' }}>{showStageInfo ? '▲' : '▼'}</span>
                </div>

                {showStageInfo && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>🟢 {t.promptGenerator.stage1Title}</div>
                      <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{t.promptGenerator.stage1Desc}</p>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>🔴 {t.promptGenerator.stage2Title}</div>
                      <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{t.promptGenerator.stage2Desc}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Advanced Settings */}
          {currentStep === 3 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.totalQuestions}</label>
                <input type="number" value={config.totalQuestions} onChange={(e) => updateConfig({ totalQuestions: parseInt(e.target.value) || 44 })} min={10} max={100} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.stage1Production}: {config.stage1ProductionPercent}%</label>
                <input type="range" value={config.stage1ProductionPercent} onChange={(e) => updateConfig({ stage1ProductionPercent: parseInt(e.target.value) })} min={0} max={100} style={{ width: '100%' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.stage2Production}: {config.stage2ProductionPercent}%</label>
                <input type="range" value={config.stage2ProductionPercent} onChange={(e) => updateConfig({ stage2ProductionPercent: parseInt(e.target.value) })} min={0} max={100} style={{ width: '100%' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.preferredStyle}</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['practical', 'analytical', 'mixed'] as const).map((style) => (
                    <button key={style} onClick={() => updateConfig({ preferredStyle: style })} style={{ flex: 1, padding: '12px', borderRadius: 10, border: config.preferredStyle === style ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: config.preferredStyle === style ? `${theme.primary}15` : 'white', cursor: 'pointer', fontSize: 13, fontWeight: config.preferredStyle === style ? 600 : 400, color: config.preferredStyle === style ? theme.primary : '#475569' }}>
                      {t.promptGenerator[style]}
                    </button>
                  ))}
                </div>
              </div>

              {/* ✅ NUEVO: Contexto geográfico/cultural */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  🌍 {config.language === 'es' ? 'Contexto geográfico/cultural (opcional)' : config.language === 'en' ? 'Geographic/cultural context (optional)' : 'Contexto geográfico/cultural (opcional)'}
                </label>
                <input 
                  type="text" 
                  value={config.culturalContext || ''} 
                  onChange={(e) => updateConfig({ culturalContext: e.target.value })} 
                  placeholder={config.language === 'es' 
                    ? 'Ej: México, zona rural de Oaxaca / España, Cataluña / Perú, Lima' 
                    : config.language === 'en'
                    ? 'E.g.: Mexico, rural Oaxaca / Spain, Catalonia / USA, Texas'
                    : 'Ex: Brasil, zona rural de Minas Gerais / Portugal, Lisboa / Angola, Luanda'}
                  style={inputStyle} 
                />
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>
                  {config.language === 'es' 
                    ? 'Los ejemplos y referencias se adaptarán a este contexto' 
                    : config.language === 'en'
                    ? 'Examples and references will be adapted to this context'
                    : 'Os exemplos e referências serão adaptados a este contexto'}
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.subtopicsInclude}</label>
                <input type="text" value={config.subtopicsInclude || ''} onChange={(e) => updateConfig({ subtopicsInclude: e.target.value })} placeholder={t.promptGenerator.subtopicsPlaceholder} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.subtopicsExclude}</label>
                <input type="text" value={config.subtopicsExclude || ''} onChange={(e) => updateConfig({ subtopicsExclude: e.target.value })} placeholder={t.promptGenerator.subtopicsPlaceholder} style={inputStyle} />
              </div>

              <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <label style={{ ...labelStyle, marginBottom: 8 }}>💾 {t.promptGenerator.savePreset}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder={t.promptGenerator.presetNamePlaceholder} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={handleSavePreset} disabled={!presetName.trim()} style={{ padding: '12px 20px', borderRadius: 10, border: 'none', backgroundColor: presetName.trim() ? theme.primary : '#e2e8f0', color: presetName.trim() ? 'white' : '#94a3b8', fontWeight: 600, cursor: presetName.trim() ? 'pointer' : 'not-allowed' }}>💾</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          {currentStep > 1 ? (
            <button onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3)} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>
              ← {t.common.back}
            </button>
          ) : <div />}

          {currentStep < 3 ? (
            <button onClick={() => { if (currentStep === 2 && !canProceed) { alert(t.promptGenerator.selectContent); return; } setCurrentStep((currentStep + 1) as 1 | 2 | 3); }} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', background: theme.primaryGradient, color: 'white', cursor: 'pointer' }}>
              {t.common.continue} →
            </button>
          ) : (
            <button onClick={handleGenerate} style={{ padding: '14px 32px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: theme.primaryGradient, color: 'white', cursor: 'pointer' }}>
              🤖 {t.promptGenerator.generatePrompt}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' };
const headerStyle: React.CSSProperties = { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white' };
const headerTitleStyle: React.CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700 };
const closeButtonStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#475569' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' };