// src/pages/ConsignaAdapterPage.tsx
// ✅ Adaptador de consignas — página independiente
// ✅ Input: consigna original + contexto
// ✅ Output: 3 versiones (básico / estándar / avanzado) o solo una
// ✅ Freemium: 2 usos sin login
// ✅ Export: copiar cada versión individualmente
// ✅ Bloque conversión → Juego del Semáforo

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';
import {
  PRIMARY_SUBJECTS_ES, SECONDARY_SUBJECTS_ES, HIGHER_SUBJECTS_ES,
} from '../types/promptGenerator';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'adapter_uses';
const FREEMIUM_LIMIT = 2;

const PRIMARY_GRADES   = ['1°','2°','3°','4°','5°','6°','7°'];
const SECONDARY_GRADES = ['1°','2°','3°','4°','5°','6°'];
const HIGHER_GRADES    = ['1° año','2° año','3° año','4° año','5° año'];

const ADAPT_OPTIONS = [
  { id: 'three',    icon: '📊', label: 'Tres niveles',         desc: 'Básico, estándar y avanzado' },
  { id: 'simpler',  icon: '📗', label: 'Solo simplificar',     desc: 'Versión más accesible' },
  { id: 'richer',   icon: '📙', label: 'Solo enriquecer',      desc: 'Versión más desafiante' },
] as const;

type AdaptOption = typeof ADAPT_OPTIONS[number]['id'];

const ADAPT_ASPECTS = [
  { id: 'language',    label: 'Vocabulario y complejidad del lenguaje' },
  { id: 'length',      label: 'Extensión de la respuesta esperada' },
  { id: 'scaffolding', label: 'Andamiaje (guías y preguntas auxiliares)' },
  { id: 'abstraction', label: 'Nivel de abstracción' },
];

const LEVEL_CONFIG = {
  basic:    { icon: '📗', label: 'Básico',    color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  standard: { icon: '📘', label: 'Estándar',  color: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
  advanced: { icon: '📙', label: 'Avanzado',  color: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdaptedResult {
  basic?:    string;
  standard?: string;
  advanced?: string;
}

type Level = 'primary' | 'secondary' | 'higher';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFreemiumUses(): number {
  try { return parseInt(localStorage.getItem(FREEMIUM_KEY) || '0', 10); }
  catch { return 0; }
}
function incrementFreemiumUses(): void {
  try { localStorage.setItem(FREEMIUM_KEY, String(getFreemiumUses() + 1)); }
  catch { /* noop */ }
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function ConsignaAdapterPage() {
  const navigate  = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  // Paso único (no hay wizard de múltiples steps — todo en una pantalla)
  const [consigna,    setConsigna]    = useState('');
  const [level,       setLevel]       = useState<Level>('secondary');
  const [grade,       setGrade]       = useState('3°');
  const [subject,     setSubject]     = useState('');
  const [adaptOption, setAdaptOption] = useState<AdaptOption>('three');
  const [aspects,     setAspects]     = useState<string[]>(['language', 'scaffolding']);

  // Generación
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [result,        setResult]        = useState<AdaptedResult | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [copied,        setCopied]        = useState<string | null>(null); // 'basic' | 'standard' | 'advanced'
  const [showLoginWall, setShowLoginWall] = useState(false);

  // ── Derivados ─────────────────────────────────────────────────────────────────

  const grades = useMemo(() => {
    if (level === 'primary') return PRIMARY_GRADES;
    if (level === 'higher')  return HIGHER_GRADES;
    return SECONDARY_GRADES;
  }, [level]);

  const subjects = useMemo(() => {
    if (level === 'primary') return PRIMARY_SUBJECTS_ES;
    if (level === 'higher')  return HIGHER_SUBJECTS_ES;
    return SECONDARY_SUBJECTS_ES;
  }, [level]);

  const levelLabel = level === 'primary' ? 'Primaria' : level === 'higher' ? 'Superior' : 'Secundaria';
  const canGenerate = consigna.trim().length >= 10 && subject.trim() !== '';

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleLevelChange = (l: Level) => {
    setLevel(l);
    setGrade(l === 'primary' ? '6°' : l === 'higher' ? '1° año' : '3°');
    setSubject('');
  };

  const toggleAspect = (id: string) => {
    setAspects(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch { /* noop */ }
  };

  const handleLoginAndContinue = async () => {
    try { await loginWithGoogle(); setShowLoginWall(false); }
    catch (e) { console.error(e); }
  };

  // ── Generación ────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    const aspectLabels = ADAPT_ASPECTS
      .filter(a => aspects.includes(a.id))
      .map(a => a.label);

    const aspectsLine = aspectLabels.length > 0
      ? `Dimensiones a adaptar: ${aspectLabels.join(', ')}.`
      : '';

    // Construir instrucción según opción elegida
    let versionesLine = '';
    let jsonStructure = '';
    if (adaptOption === 'three') {
      versionesLine = 'Generá TRES versiones de la consigna: básica, estándar y avanzada.';
      jsonStructure = '{"basic": "...", "standard": "...", "advanced": "..."}';
    } else if (adaptOption === 'simpler') {
      versionesLine = 'Generá solo una versión SIMPLIFICADA (básica) de la consigna.';
      jsonStructure = '{"basic": "..."}';
    } else {
      versionesLine = 'Generá solo una versión ENRIQUECIDA (avanzada) de la consigna.';
      jsonStructure = '{"advanced": "..."}';
    }

    const prompt = `Sos un especialista en didáctica y diseño curricular para el sistema educativo argentino.

Contexto:
- Nivel: ${levelLabel}
- Año/Grado: ${grade}
- Materia: ${subject}
${aspectsLine}

Consigna original:
"${consigna.trim()}"

${versionesLine}

Criterios para cada versión:
- BÁSICA: vocabulario simple, oraciones cortas, andamiaje explícito (preguntas guía, ítems paso a paso), respuesta acotada. Para alumnos que necesitan más apoyo.
- ESTÁNDAR: la consigna original o ligeramente mejorada en claridad. No cambiar la exigencia.
- AVANZADA: mayor complejidad conceptual, menor andamiaje, solicitar justificación, análisis, relaciones o transferencia a nuevos contextos.

Reglas:
- Mantené el tema y el objetivo de aprendizaje en todas las versiones
- El lenguaje debe ser apropiado para el nivel educativo indicado
- No agregues aclaraciones ni meta-comentarios — solo la consigna adaptada
- Cada versión debe ser autosuficiente (no hacer referencia a "la versión anterior")

Respondé ÚNICAMENTE con JSON válido, sin markdown:
${jsonStructure}`;

    try {
      const fn = httpsCallable(getFunctions(app), 'generateQuestions');
      const res: any = await fn({ prompt });
      const raw     = res.data.content?.find((b: any) => b.type === 'text')?.text || '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: AdaptedResult = JSON.parse(cleaned);
      if (!parsed.basic && !parsed.standard && !parsed.advanced) throw new Error('Formato inesperado');
      setResult(parsed);
      if (!user) incrementFreemiumUses();
    } catch (err: any) {
      setError(`Error al adaptar: ${err.message}. Intentá de nuevo.`);
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
              Adaptaste {FREEMIUM_LIMIT} consignas sin iniciar sesión.<br />
              Iniciá sesión para seguir usando <strong>sin límite</strong>.
            </p>
            <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, fontSize: 15, padding: '14px 32px' }}>
              Continuar con Google
            </button>
            <br />
            <button onClick={() => navigate('/')} style={{ ...btnSecondary, marginTop: 12, fontSize: 14 }}>
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER principal ─────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: result ? 800 : 680 }}>

        {/* Header */}
        <div style={{ background: theme.primaryGradient, padding: '20px 28px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>✏️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Adaptador de Consignas</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                Adaptá cualquier consigna a distintos niveles en segundos
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: '72vh', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Consigna original ── */}
          <div>
            <label style={labelStyle}>
              Consigna original <span style={{ fontWeight: 400, color: '#94a3b8' }}>(pegá la tuya)</span>
            </label>
            <textarea
              value={consigna}
              onChange={e => setConsigna(e.target.value)}
              rows={4}
              placeholder={'Ej: Leé el texto y explicá con tus palabras cuáles fueron las causas de la Primera Guerra Mundial.'}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, fontSize: 14 }}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {consigna.length} caracteres
            </div>
          </div>

          {/* ── Contexto ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {([
              { id: 'primary'   as const, icon: '🎒', label: 'Primaria'   },
              { id: 'secondary' as const, icon: '🎓', label: 'Secundaria' },
              { id: 'higher'    as const, icon: '🏛️', label: 'Superior'   },
            ]).map(lv => (
              <button key={lv.id} onClick={() => handleLevelChange(lv.id)}
                style={{ padding: '12px', borderRadius: 10, border: level === lv.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: level === lv.id ? `${theme.primary}12` : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{lv.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: level === lv.id ? theme.primary : '#1e293b' }}>{lv.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Año / Grado</label>
              <select value={grade} onChange={e => setGrade(e.target.value)} style={selectStyle}>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Materia</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={selectStyle}>
                <option value="">— Seleccioná —</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="Otra">Otra</option>
              </select>
            </div>
          </div>

          {/* ── Qué adaptar ── */}
          <div>
            <label style={labelStyle}>¿Qué necesitás?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ADAPT_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setAdaptOption(opt.id)}
                  style={{ padding: '12px 16px', borderRadius: 10, border: adaptOption === opt.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: adaptOption === opt.id ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: adaptOption === opt.id ? theme.primary : '#1e293b' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Dimensiones ── */}
          <div>
            <label style={labelStyle}>
              ¿Qué dimensiones adaptar? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(podés elegir varias)</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {ADAPT_ASPECTS.map(asp => {
                const sel = aspects.includes(asp.id);
                return (
                  <button key={asp.id} onClick={() => toggleAspect(asp.id)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: sel ? `2px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: sel ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: sel ? 'none' : '2px solid #cbd5e1', backgroundColor: sel ? theme.primary : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, flexShrink: 0 }}>
                      {sel && '✓'}
                    </div>
                    <span style={{ fontSize: 13, color: sel ? theme.primary : '#475569', fontWeight: sel ? 600 : 400 }}>{asp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Aviso freemium ── */}
          {!user && (
            <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
              💡 Podés adaptar {FREEMIUM_LIMIT - getFreemiumUses()} consigna{FREEMIUM_LIMIT - getFreemiumUses() !== 1 ? 's' : ''} más sin iniciar sesión.
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {/* ── Aviso generando ── */}
          {isGenerating && (
            <div style={{ padding: '14px 18px', backgroundColor: '#fffbeb', borderRadius: 10, border: '1px solid #fbbf24', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Adaptando consigna con IA…</div>
                <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>
                  Puede tardar unos segundos. No cierres esta ventana.
                </div>
              </div>
            </div>
          )}

          {/* ── RESULTADO ── */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  ✅ Consigna adaptada
                </h3>
                <button onClick={() => { setResult(null); setConsigna(''); }}
                  style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>
                  Nueva consigna
                </button>
              </div>

              {/* Tarjetas por nivel */}
              {(['basic', 'standard', 'advanced'] as const).map(key => {
                const text = result[key];
                if (!text) return null;
                const cfg = LEVEL_CONFIG[key];
                return (
                  <div key={key} style={{ padding: '18px 20px', borderRadius: 14, border: `2px solid ${cfg.border}`, backgroundColor: cfg.bg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <button onClick={() => handleCopy(text, key)}
                        style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${cfg.border}`, backgroundColor: 'white', color: cfg.color, cursor: 'pointer' }}>
                        {copied === key ? '✅ Copiado' : '📋 Copiar'}
                      </button>
                    </div>
                    {/* Textarea editable */}
                    <textarea
                      defaultValue={text}
                      rows={3}
                      style={{ width: '100%', fontSize: 14, color: '#1e293b', lineHeight: 1.6, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit', backgroundColor: 'white', boxSizing: 'border-box' }}
                    />
                  </div>
                );
              })}

              {/* Bloque conversión */}
              <div style={{ padding: '20px 24px', backgroundColor: '#f0fdf4', borderRadius: 14, border: '2px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                      🚦 ¿Querés generar una dinámica áulica con un juego para que los alumnos aprendan este tema?
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                      Creá una actividad con el Juego del Semáforo para que tus alumnos trabajen y debatan el contenido antes de la evaluación.
                    </p>
                  </div>
                  <button onClick={() => navigate('/setup')}
                    style={{ padding: '12px 20px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    Crear juego →
                  </button>
                </div>
              </div>

              {!user && (
                <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span>Usaste {getFreemiumUses()} de {FREEMIUM_LIMIT} adaptaciones gratuitas.</span>
                  <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>Iniciar sesión →</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — solo visible si no hay resultado */}
        {!result && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => navigate('/')} style={btnSecondary}>← Volver</button>
            <button onClick={handleGenerate} disabled={!canGenerate || isGenerating}
              style={{ ...btnPrimary, opacity: (!canGenerate || isGenerating) ? 0.5 : 1, minWidth: 200 }}>
              {isGenerating ? '⏳ Adaptando…' : '✨ Adaptar consigna'}
            </button>
          </div>
        )}
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