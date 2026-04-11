// src/pages/InformeGeneratorPage.tsx
// ✅ Generador de Informes de Alumnos
// ✅ Dos modos: Por materia (secundaria) y Por alumno completo (primaria)
// ✅ Tres extensiones: corto / mediano / largo
// ✅ Tono: formal o comunicativo
// ✅ Freemium: 2 usos sin login
// ✅ Output editable + copiar

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';
import {
  PRIMARY_SUBJECTS_ES, SECONDARY_SUBJECTS_ES,
} from '../types/promptGenerator';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'informe_uses';
const FREEMIUM_LIMIT = 2;

const SECONDARY_GRADES = ['1°','2°','3°','4°','5°','6°'];
const PRIMARY_GRADES   = ['1°','2°','3°','4°','5°','6°','7°'];

const PERFORMANCE_LEVELS = [
  { id: 'bajo',       label: 'Bajo',        color: '#dc2626', bg: '#fef2f2' },
  { id: 'en_proceso', label: 'En proceso',  color: '#d97706', bg: '#fffbeb' },
  { id: 'logrado',    label: 'Logrado',     color: '#16a34a', bg: '#f0fdf4' },
  { id: 'destacado',  label: 'Destacado',   color: '#7c3aed', bg: '#f5f3ff' },
] as const;

type PerfLevel = typeof PERFORMANCE_LEVELS[number]['id'];

// Dimensiones para informe por materia
const SUBJECT_DIMENSIONS = [
  { id: 'academic',      label: 'Desempeño académico'              },
  { id: 'participation', label: 'Participación en clase'           },
  { id: 'attitude',      label: 'Actitud ante el error/dificultad' },
  { id: 'organization',  label: 'Entrega y organización'           },
];

// Áreas para informe por alumno completo
const AREAS = [
  { id: 'lengua',    label: 'Lengua'            },
  { id: 'mate',      label: 'Matemática'        },
  { id: 'sociales',  label: 'Cs. Sociales'      },
  { id: 'naturales', label: 'Cs. Naturales'     },
  { id: 'otras',     label: 'Otras áreas'       },
];

// Dimensiones transversales
const TRANSVERSAL_DIMENSIONS = [
  { id: 'peers',        label: 'Vínculo con pares'        },
  { id: 'autonomy',     label: 'Autonomía'                 },
  { id: 'error',        label: 'Actitud ante el error'     },
  { id: 'effort',       label: 'Esfuerzo y compromiso'     },
];

const PERIOD_ORGS = [
  { id: 'bimestres',     label: 'Bimestres',     periods: ['1er bimestre','2do bimestre','3er bimestre','4to bimestre'] },
  { id: 'cuatrimestres', label: 'Cuatrimestres', periods: ['1er cuatrimestre','2do cuatrimestre'] },
  { id: 'trimestres',    label: 'Trimestres',    periods: ['1er trimestre','2do trimestre','3er trimestre'] },
] as const;

// Extensiones de output
const LENGTH_OPTIONS = [
  { id: 'short',  icon: '📝', label: 'Corto',   subjectWords: '~50 pal.',  fullWords: '~90 pal.',  subjectRange: '40-60',   fullRange: '80-100'  },
  { id: 'medium', icon: '📄', label: 'Mediano', subjectWords: '~90 pal.',  fullWords: '~165 pal.', subjectRange: '80-100',  fullRange: '150-180' },
  { id: 'long',   icon: '📋', label: 'Largo',   subjectWords: '~145 pal.', fullWords: '~240 pal.', subjectRange: '130-160', fullRange: '220-260' },
] as const;

type LengthOption = typeof LENGTH_OPTIONS[number]['id'];
type InformeMode  = 'subject' | 'full' | null;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFreemiumUses(): number {
  try { return parseInt(localStorage.getItem(FREEMIUM_KEY) || '0', 10); }
  catch { return 0; }
}
function incrementFreemiumUses(): void {
  try { localStorage.setItem(FREEMIUM_KEY, String(getFreemiumUses() + 1)); }
  catch { /* noop */ }
}

// ─── Sub-componente: selector de nivel ────────────────────────────────────────

function LevelSelector({
  label, value, onChange, optional = false,
}: {
  label: string;
  value: PerfLevel | '';
  onChange: (v: PerfLevel) => void;
  optional?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
        {label} {optional && <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PERFORMANCE_LEVELS.map(lv => (
          <button key={lv.id} onClick={() => onChange(lv.id)}
            style={{ padding: '7px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', backgroundColor: value === lv.id ? lv.color : '#f1f5f9', color: value === lv.id ? 'white' : '#64748b', transition: 'all 0.15s' }}>
            {lv.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function InformeGeneratorPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [step,        setStep]        = useState<1|2|3>(1);
  const [mode,        setMode]        = useState<InformeMode>(null);

  // Contexto común
  const [grade,       setGrade]       = useState('3°');
  const [studentName, setStudentName] = useState('');
  const [length,      setLength]      = useState<LengthOption>('medium');
  const [tone,        setTone]        = useState<'formal'|'comunicativo'>('comunicativo');
  const [extraNotes,  setExtraNotes]  = useState('');

  // Contexto "por materia"
  const [subject,     setSubject]     = useState('');
  const [subjectDims, setSubjectDims] = useState<Record<string, PerfLevel | ''>>({
    academic: '', participation: '', attitude: '', organization: '',
  });

  // Contexto "por alumno completo"
  const [primaryGrade,  setPrimaryGrade]  = useState('5°');
  const [periodOrg,     setPeriodOrg]     = useState<typeof PERIOD_ORGS[number]['id'] | ''>('');
  const [periodNumber,  setPeriodNumber]  = useState('');
  const [areaDims,      setAreaDims]      = useState<Record<string, PerfLevel | ''>>(
    Object.fromEntries(AREAS.map(a => [a.id, '']))
  );
  const [areaNotes,     setAreaNotes]     = useState<Record<string, string>>(
    Object.fromEntries(AREAS.map(a => [a.id, '']))
  );
  const [transversals,  setTransversals]  = useState<Record<string, PerfLevel | ''>>(
    Object.fromEntries(TRANSVERSAL_DIMENSIONS.map(d => [d.id, '']))
  );

  // Generación
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [result,        setResult]        = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [copied,        setCopied]        = useState(false);
  const [showLoginWall, setShowLoginWall] = useState(false);

  // ── Derivados ─────────────────────────────────────────────────────────────────

  const currentPeriodOrg = useMemo(() => PERIOD_ORGS.find(o => o.id === periodOrg), [periodOrg]);
  const periodNumbers    = currentPeriodOrg?.periods ?? [];
  const currentLength    = useMemo(() => LENGTH_OPTIONS.find(l => l.id === length)!, [length]);

  const wordRange = mode === 'subject'
    ? currentLength.subjectRange
    : currentLength.fullRange;

  // Validaciones por step
  const canGoStep2 = mode !== null && (
    mode === 'subject'
      ? subject !== ''
      : periodOrg !== '' && periodNumber !== ''
  );

  const canGoStep3 = mode === 'subject'
    ? Object.values(subjectDims).some(v => v !== '')
    : Object.values(areaDims).some(v => v !== '') || Object.values(transversals).some(v => v !== '');

  const canGenerate = canGoStep3;

  // Nombre para el prompt
  const nameRef = mode === 'subject' ? studentName : studentName;
  const nameLine = nameRef.trim() ? `Alumno/a: ${nameRef.trim()}.` : '';

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleModeSelect = (m: InformeMode) => {
    setMode(m);
    setResult(null);
    setError(null);
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 3) as 1|2|3);
  const handleBack = () => {
    if (step > 1) { setStep(prev => (prev - 1) as 1|2|3); return; }
    navigate('/');
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* noop */ }
  };

  const handleLoginAndContinue = async () => {
    try { await loginWithGoogle(); setShowLoginWall(false); }
    catch (e) { console.error(e); }
  };

  // ── Construcción del prompt ────────────────────────────────────────────────────

  const buildPrompt = (): string => {
    const toneDesc = tone === 'formal'
      ? 'lenguaje formal y técnico-pedagógico, apropiado para legajo o acta oficial'
      : 'lenguaje claro y cercano, pensado para comunicar a la familia del alumno/a';

    if (mode === 'subject') {
      const dimsText = SUBJECT_DIMENSIONS
        .filter(d => subjectDims[d.id])
        .map(d => {
          const lv = PERFORMANCE_LEVELS.find(l => l.id === subjectDims[d.id]);
          return `- ${d.label}: ${lv?.label}`;
        }).join('\n');

      return `Sos un docente argentino redactando un informe pedagógico.

${nameLine}
Materia: ${subject}
Nivel: Secundaria — ${grade}
${extraNotes.trim() ? `Observaciones adicionales: ${extraNotes.trim()}` : ''}

Dimensiones evaluadas:
${dimsText || '(sin datos específicos)'}

Redactá UN párrafo de informe pedagógico con las siguientes características:
- Extensión: entre ${wordRange} palabras
- Tono: ${toneDesc}
- Mencioná las dimensiones evaluadas de manera integrada, no como lista
- Si hay nombre, usalo naturalmente en el texto
- Destacá logros y señalá áreas de mejora con constructividad
- Lenguaje apropiado para el sistema educativo argentino

Respondé ÚNICAMENTE con el texto del informe, sin título, sin comillas, sin explicaciones.`;
    }

    // Modo alumno completo
    const areasText = AREAS
      .filter(a => areaDims[a.id])
      .map(a => {
        const lv = PERFORMANCE_LEVELS.find(l => l.id === areaDims[a.id]);
        const note = areaNotes[a.id]?.trim();
        return `- ${a.label}: ${lv?.label}${note ? ` (${note})` : ''}`;
      }).join('\n');

    const transText = TRANSVERSAL_DIMENSIONS
      .filter(d => transversals[d.id])
      .map(d => {
        const lv = PERFORMANCE_LEVELS.find(l => l.id === transversals[d.id]);
        return `- ${d.label}: ${lv?.label}`;
      }).join('\n');

    const periodLabel = `${periodNumber} (${PERIOD_ORGS.find(o => o.id === periodOrg)?.label ?? ''})`;

    return `Sos una maestra/docente argentina redactando un informe pedagógico integral de un alumno/a.

${nameLine}
Nivel: Primaria — ${primaryGrade}
Período: ${periodLabel}
${extraNotes.trim() ? `Observaciones generales: ${extraNotes.trim()}` : ''}

Desempeño por área:
${areasText || '(sin datos de áreas)'}

Dimensiones transversales:
${transText || '(sin datos transversales)'}

Redactá un informe pedagógico integral con las siguientes características:
- Extensión: entre ${wordRange} palabras
- Tono: ${toneDesc}
- Organizá el texto en 2-3 párrafos: comenzá con el desempeño general, continuá con observaciones específicas y cerrá con proyección o recomendaciones
- Integrá las dimensiones naturalmente, no como lista
- Si hay nombre, usalo con naturalidad
- Destacá logros y señalá áreas de mejora de manera constructiva
- Lenguaje apropiado para el sistema educativo argentino

Respondé ÚNICAMENTE con el texto del informe, sin título, sin comillas, sin explicaciones.`;
  };

  // ── Generación ────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const fn = httpsCallable(getFunctions(app), 'generateQuestions');
      const res: any = await fn({ prompt: buildPrompt() });
      const raw = res.data.content?.find((b: any) => b.type === 'text')?.text || '';
      if (!raw.trim()) throw new Error('Respuesta vacía');
      setResult(raw.trim());
      if (!user) incrementFreemiumUses();
    } catch (err: any) {
      setError(`Error al generar: ${err.message}. Intentá de nuevo.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Freemium wall ────────────────────────────────────────────────────────────

  if (showLoginWall) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 28px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
              Límite de uso gratuito
            </h2>
            <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
              Generaste {FREEMIUM_LIMIT} informes sin iniciar sesión.<br />
              Iniciá sesión para seguir generando <strong>sin límite</strong>.
            </p>
            <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, fontSize: 15, padding: '14px 32px' }}>
              Continuar con Google
            </button>
            <br />
            <button onClick={() => navigate('/')} style={{ ...btnSecondary, marginTop: 12 }}>
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Steps config ─────────────────────────────────────────────────────────────

  const stepsConfig = [
    { n: 1, label: 'Tipo y contexto' },
    { n: 2, label: 'El alumno/a'     },
    { n: 3, label: 'Formato'         },
  ];

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: result ? 720 : 680 }}>

        {/* Header */}
        <div style={{ background: theme.primaryGradient, padding: '20px 28px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📋</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Generador de Informes</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                Informes pedagógicos listos para copiar en segundos
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', padding: '16px 28px', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
          {stepsConfig.map(s => {
            const isActive = step === s.n;
            const isPast   = s.n < step;
            return (
              <div key={s.n} onClick={() => isPast && setStep(s.n as 1|2|3)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: isPast ? 'pointer' : 'default', backgroundColor: isActive ? theme.primary : isPast ? '#dcfce7' : '#f1f5f9', color: isActive ? 'white' : isPast ? '#16a34a' : '#94a3b8' }}>
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: '60vh', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ══ STEP 1 ══ */}
          {step === 1 && (
            <>
              {/* Tipo de informe */}
              <div>
                <label style={labelStyle}>¿Qué tipo de informe necesitás?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => handleModeSelect('subject')}
                    style={{ padding: '16px 20px', borderRadius: 12, border: mode === 'subject' ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: mode === 'subject' ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>🎓</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: mode === 'subject' ? theme.primary : '#1e293b' }}>Por materia</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Secundaria — un docente evalúa su materia específica</div>
                    </div>
                  </button>
                  <button onClick={() => handleModeSelect('full')}
                    style={{ padding: '16px 20px', borderRadius: 12, border: mode === 'full' ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: mode === 'full' ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>🎒</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: mode === 'full' ? theme.primary : '#1e293b' }}>Por alumno completo</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Primaria — maestra de grado evalúa todas las áreas</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Contexto según modo */}
              {mode === 'subject' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Materia</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} style={selectStyle}>
                      <option value="">— Seleccioná —</option>
                      {SECONDARY_SUBJECTS_ES.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Año</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {SECONDARY_GRADES.map(g => (
                        <button key={g} onClick={() => setGrade(g)}
                          style={{ padding: '8px 16px', borderRadius: 20, border: 'none', backgroundColor: grade === g ? theme.primary : '#f1f5f9', color: grade === g ? 'white' : '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === 'full' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Grado</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {PRIMARY_GRADES.map(g => (
                        <button key={g} onClick={() => setPrimaryGrade(g)}
                          style={{ padding: '8px 16px', borderRadius: 20, border: 'none', backgroundColor: primaryGrade === g ? theme.primary : '#f1f5f9', color: primaryGrade === g ? 'white' : '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Período */}
                  <div>
                    <label style={labelStyle}>Organización del año</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {PERIOD_ORGS.map(org => (
                        <button key={org.id} onClick={() => { setPeriodOrg(org.id); setPeriodNumber(''); }}
                          style={{ padding: '8px 16px', borderRadius: 20, border: 'none', backgroundColor: periodOrg === org.id ? theme.primary : '#f1f5f9', color: periodOrg === org.id ? 'white' : '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                          {org.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {periodOrg && periodNumbers.length > 0 && (
                    <div>
                      <label style={labelStyle}>Período</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {periodNumbers.map(p => (
                          <button key={p} onClick={() => setPeriodNumber(p)}
                            style={{ padding: '8px 16px', borderRadius: 20, border: 'none', backgroundColor: periodNumber === p ? theme.primary : '#f1f5f9', color: periodNumber === p ? 'white' : '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ STEP 2 ══ */}
          {step === 2 && (
            <>
              {/* Nombre del alumno */}
              <div>
                <label style={labelStyle}>
                  Nombre del alumno/a <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span>
                </label>
                <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
                  placeholder="Ej: Valentina, Martín…"
                  style={inputStyle} />
              </div>

              {/* Dimensiones por materia */}
              {mode === 'subject' && (
                <div>
                  <label style={labelStyle}>Evaluación por dimensión</label>
                  {SUBJECT_DIMENSIONS.map(d => (
                    <LevelSelector key={d.id} label={d.label}
                      value={subjectDims[d.id] as PerfLevel | ''}
                      onChange={v => setSubjectDims(prev => ({ ...prev, [d.id]: v }))} />
                  ))}
                </div>
              )}

              {/* Dimensiones por alumno completo */}
              {mode === 'full' && (
                <>
                  <div>
                    <label style={labelStyle}>Desempeño por área</label>
                    {AREAS.map(a => (
                      <div key={a.id} style={{ marginBottom: 20 }}>
                        <LevelSelector label={a.label} optional
                          value={areaDims[a.id] as PerfLevel | ''}
                          onChange={v => setAreaDims(prev => ({ ...prev, [a.id]: v }))} />
                        {areaDims[a.id] && (
                          <input type="text" value={areaNotes[a.id]}
                            onChange={e => setAreaNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                            placeholder={`Observación sobre ${a.label} (opcional)`}
                            style={{ ...inputStyle, fontSize: 13, marginTop: -8 }} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label style={labelStyle}>Dimensiones transversales</label>
                    {TRANSVERSAL_DIMENSIONS.map(d => (
                      <LevelSelector key={d.id} label={d.label} optional
                        value={transversals[d.id] as PerfLevel | ''}
                        onChange={v => setTransversals(prev => ({ ...prev, [d.id]: v }))} />
                    ))}
                  </div>
                </>
              )}

              {/* Notas adicionales */}
              <div>
                <label style={labelStyle}>
                  Algo específico a destacar <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span>
                </label>
                <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
                  rows={2} placeholder="Ej: Mejoró notablemente en lectura este bimestre. Necesita reforzar la escritura."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </div>
            </>
          )}

          {/* ══ STEP 3 ══ */}
          {step === 3 && (
            <>
              {/* Extensión */}
              <div>
                <label style={labelStyle}>Extensión del informe</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {LENGTH_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setLength(opt.id)}
                      style={{ flex: 1, padding: '14px 10px', borderRadius: 12, border: length === opt.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: length === opt.id ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 22 }}>{opt.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: length === opt.id ? theme.primary : '#1e293b' }}>{opt.label}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {mode === 'subject' ? opt.subjectWords : opt.fullWords}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tono */}
              <div>
                <label style={labelStyle}>Tono del informe</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setTone('comunicativo')}
                    style={{ flex: 1, padding: '14px', borderRadius: 12, border: tone === 'comunicativo' ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: tone === 'comunicativo' ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>💬</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: tone === 'comunicativo' ? theme.primary : '#1e293b' }}>Comunicativo</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Para entregar a la familia</div>
                    </div>
                  </button>
                  <button onClick={() => setTone('formal')}
                    style={{ flex: 1, padding: '14px', borderRadius: 12, border: tone === 'formal' ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: tone === 'formal' ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>📁</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: tone === 'formal' ? theme.primary : '#1e293b' }}>Formal</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Para legajo o acta oficial</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Resumen de configuración */}
              <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>📋 {mode === 'subject' ? `${subject} — ${grade} Secundaria` : `${primaryGrade} Primaria — ${periodNumber}`}</div>
                {studentName && <div>👤 {studentName}</div>}
                <div>📝 {currentLength.label} ({wordRange} palabras) · {tone === 'formal' ? 'Formal' : 'Comunicativo'}</div>
              </div>

              {/* Aviso freemium */}
              {!user && (
                <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                  💡 Podés generar {FREEMIUM_LIMIT - getFreemiumUses()} informe{FREEMIUM_LIMIT - getFreemiumUses() !== 1 ? 's' : ''} más sin iniciar sesión.
                </div>
              )}

              {error && (
                <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              {isGenerating && (
                <div style={{ padding: '14px 18px', backgroundColor: '#fffbeb', borderRadius: 10, border: '1px solid #fbbf24', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>⏳</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Redactando informe con IA…</div>
                    <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>Unos segundos. No cierres esta ventana.</div>
                  </div>
                </div>
              )}

              {/* ── RESULTADO ── */}
              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                      ✅ Informe generado
                    </h3>
                    <button onClick={() => { setResult(null); }}
                      style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>
                      Nuevo informe
                    </button>
                  </div>

                  <div style={{ padding: '18px 20px', backgroundColor: '#f8fafc', borderRadius: 14, border: '2px solid #e2e8f0' }}>
                    <textarea
                      defaultValue={result}
                      rows={6}
                      style={{ width: '100%', fontSize: 14, color: '#1e293b', lineHeight: 1.7, border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', backgroundColor: 'transparent', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button onClick={handleCopy} style={{ ...btnPrimary, justifyContent: 'center' }}>
                    {copied ? '✅ Copiado al portapapeles' : '📋 Copiar informe'}
                  </button>

                  {/* Bloque conversión */}
                  <div style={{ padding: '20px 24px', backgroundColor: '#f0fdf4', borderRadius: 14, border: '2px solid #86efac' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                          🚦 ¿Querés que tus alumnos se preparen mejor para la próxima evaluación?
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                          Creá una actividad grupal con el Juego del Semáforo — los equipos debaten y consolidan el aprendizaje juntos.
                        </p>
                      </div>
                      <button onClick={() => navigate('/setup')}
                        style={{ padding: '12px 20px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', cursor: 'pointer', flexShrink: 0 }}>
                        Crear juego →
                      </button>
                    </div>
                  </div>

                  {!user && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span>Usaste {getFreemiumUses()} de {FREEMIUM_LIMIT} informes gratuitos.</span>
                      <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>Iniciar sesión →</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleBack} style={btnSecondary}>
            ← {step > 1 ? 'Atrás' : 'Volver'}
          </button>

          {step < 3 ? (
            <button onClick={handleNext}
              disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
              style={{ ...btnPrimary, opacity: ((step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)) ? 0.5 : 1 }}>
              Continuar →
            </button>
          ) : !result ? (
            <button onClick={handleGenerate} disabled={!canGenerate || isGenerating}
              style={{ ...btnPrimary, opacity: (!canGenerate || isGenerating) ? 0.5 : 1, minWidth: 200 }}>
              {isGenerating ? '⏳ Generando…' : '✨ Generar informe'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '32px 20px',
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};
const cardStyle: React.CSSProperties = {
  backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 680,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 10, fontSize: 14, fontWeight: 700, color: '#475569',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
  border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'auto' };
const btnPrimary: React.CSSProperties = {
  padding: '12px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
};
const btnSecondary: React.CSSProperties = {
  padding: '12px 20px', fontSize: 14, fontWeight: 600, borderRadius: 10,
  border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer',
};
const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
  width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};