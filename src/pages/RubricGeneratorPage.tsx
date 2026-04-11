// src/pages/RubricGeneratorPage.tsx
// ✅ Criterios sugeridos generados por IA según nivel + grado + materia + actividad
// ✅ Freemium: 2 usos sin login, ilimitado con Google
// ✅ Export PDF (window.print)
// ✅ Tipos: actividad específica y evaluación de período
// ✅ Estadísticas por docente (total, último uso, historial)

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDatabase, ref, update, increment, push } from 'firebase/database';
import { app } from '../firebase.config';
import {
  PRIMARY_SUBJECTS_ES, SECONDARY_SUBJECTS_ES, HIGHER_SUBJECTS_ES,
} from '../types/promptGenerator';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'rubric_uses';
const FREEMIUM_LIMIT = 2;

const PRIMARY_GRADES   = ['1°','2°','3°','4°','5°','6°','7°'];
const SECONDARY_GRADES = ['1°','2°','3°','4°','5°','6°'];
const HIGHER_GRADES    = ['1° año','2° año','3° año','4° año','5° año'];

const ACTIVITY_TYPES = [
  { id: 'written',  icon: '📝', labelEs: 'Trabajo práctico escrito' },
  { id: 'oral',     icon: '🎤', labelEs: 'Exposición oral'          },
  { id: 'group',    icon: '👥', labelEs: 'Proyecto grupal'          },
  { id: 'creative', icon: '🎨', labelEs: 'Producción creativa'      },
  { id: 'exam',     icon: '📋', labelEs: 'Evaluación escrita'       },
  { id: 'other',    icon: '✏️', labelEs: 'Otra'                     },
];

const PERIOD_ORGS = [
  { id: 'cuatrimestres', label: 'Cuatrimestres (2)', hint: 'Común en CABA',                        periods: ['1er cuatrimestre', '2do cuatrimestre'] },
  { id: 'bimestres',     label: 'Bimestres (4)',     hint: 'CABA — 2 bimestres por cuatrimestre',  periods: ['1er bimestre', '2do bimestre', '3er bimestre', '4to bimestre'] },
  { id: 'trimestres',    label: 'Trimestres (3)',    hint: 'Provincia y otras jurisdicciones',      periods: ['1er trimestre', '2do trimestre', '3er trimestre'] },
  { id: 'otro',          label: 'Otro',              hint: 'Especificá tu organización',            periods: [] as string[] },
] as const;

const SCALES = [
  { id: 'logrado',  labels: ['Inicial', 'En proceso', 'Logrado', 'Destacado'],              keys: ['inicial', 'en_proceso', 'logrado', 'destacado'] },
  { id: 'bueno',    labels: ['Insuficiente', 'Suficiente', 'Bueno', 'Muy bueno'],           keys: ['insuficiente', 'suficiente', 'bueno', 'muy_bueno'] },
  { id: 'numeric',  labels: ['1', '2', '3', '4'],                                           keys: ['nivel_1', 'nivel_2', 'nivel_3', 'nivel_4'] },
];

// Criterios de fallback por si falla la generación IA
const FALLBACK_CRITERIA_ACTIVITY = ['Comprensión del tema', 'Desarrollo de la tarea', 'Uso del lenguaje', 'Presentación'];
const FALLBACK_CRITERIA_PERIOD   = ['Evolución del aprendizaje', 'Participación y compromiso', 'Producción de trabajos', 'Dominio conceptual'];

const LEVEL_COLORS = [
  { bg: '#fef2f2', text: '#dc2626' },
  { bg: '#fff7ed', text: '#c2410c' },
  { bg: '#fefce8', text: '#a16207' },
  { bg: '#f0fdf4', text: '#15803d' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RubricCriterion { name: string; levels: Record<string, string>; }
interface GeneratedRubric { title: string; criteria: RubricCriterion[]; }
type Level     = 'primary' | 'secondary' | 'higher';
type PeriodOrg = typeof PERIOD_ORGS[number]['id'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFreemiumUses(): number {
  try { return parseInt(localStorage.getItem(FREEMIUM_KEY) || '0', 10); }
  catch { return 0; }
}
function incrementFreemiumUses(): void {
  try { localStorage.setItem(FREEMIUM_KEY, String(getFreemiumUses() + 1)); }
  catch { /* noop */ }
}

// ─── CSS de impresión ─────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body > *:not(#rubric-print-area) { display: none !important; }
  #rubric-print-area {
    display: block !important;
    padding: 24px; font-family: 'Segoe UI', sans-serif; font-size: 12px;
  }
  #rubric-print-area h2 { font-size: 16px; margin: 0 0 4px; }
  #rubric-print-area p  { font-size: 12px; color: #64748b; margin: 0 0 16px; }
  #rubric-print-area table { width: 100%; border-collapse: collapse; }
  #rubric-print-area th, #rubric-print-area td {
    border: 1px solid #cbd5e1; padding: 8px 10px;
    font-size: 11px; vertical-align: top; text-align: left;
  }
  #rubric-print-area th { font-weight: 700; background: #f1f5f9; }
  #rubric-print-area .level-0 { background: #fef2f2; }
  #rubric-print-area .level-1 { background: #fff7ed; }
  #rubric-print-area .level-2 { background: #fefce8; }
  #rubric-print-area .level-3 { background: #f0fdf4; }
  #rubric-print-area .footer-print { margin-top: 16px; font-size: 10px; color: #94a3b8; text-align: right; }
}`;

function injectPrintStyle() {
  if (document.getElementById('rubric-print-style')) return;
  const s = document.createElement('style');
  s.id = 'rubric-print-style';
  s.textContent = PRINT_STYLE;
  document.head.appendChild(s);
}

function buildPrintArea(rubric: GeneratedRubric, scale: typeof SCALES[number], context: string) {
  const div = document.createElement('div');
  div.id = 'rubric-print-area';
  div.style.display = 'none';
  div.innerHTML = `
    <h2>${rubric.title}</h2><p>${context}</p>
    <table>
      <thead>
        <tr>
          <th style="width:160px">Criterio</th>
          ${scale.labels.map((l, i) => `<th class="level-${i}">${l}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rubric.criteria.map(c => `
        <tr>
          <td style="font-weight:700">${c.name}</td>
          ${scale.keys.map(k => `<td>${c.levels[k] || '—'}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="footer-print">Generado con El Juego del Semáforo · eljuegodelsemaforo.com</div>`;
  return div;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function RubricGeneratorPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Tipo de rúbrica
  const [rubricType, setRubricType] = useState<'activity' | 'period' | null>(null);

  // Contexto común
  const [level,   setLevel]   = useState<Level>('secondary');
  const [grade,   setGrade]   = useState('3°');
  const [subject, setSubject] = useState('');

  // Solo período
  const [periodOrg,      setPeriodOrg]      = useState<PeriodOrg | ''>('');
  const [periodOtherOrg, setPeriodOtherOrg] = useState('');
  const [periodNumber,   setPeriodNumber]   = useState('');
  const [periodOtherNum, setPeriodOtherNum] = useState('');

  // Solo actividad
  const [activityType,  setActivityType]  = useState('');
  const [activityOther, setActivityOther] = useState('');
  const [activityDesc,  setActivityDesc]  = useState('');

  // Criterios y escala
  const [criteria,        setCriteria]        = useState<string[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [newCriterion,    setNewCriterion]    = useState('');
  const [scaleId,         setScaleId]         = useState('logrado');

  // Generación rúbrica
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [rubric,        setRubric]        = useState<GeneratedRubric | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [copied,        setCopied]        = useState(false);
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

  const currentScale     = useMemo(() => SCALES.find(s => s.id === scaleId)!, [scaleId]);
  const currentPeriodOrg = useMemo(() => PERIOD_ORGS.find(o => o.id === periodOrg), [periodOrg]);
  const periodNumbers    = currentPeriodOrg?.periods ?? [];

  const selectedPeriodLabel = useMemo(() => {
    if (!periodOrg) return '';
    return periodOrg === 'otro' ? periodOtherNum : periodNumber;
  }, [periodOrg, periodNumber, periodOtherNum]);

  const levelLabel = level === 'primary' ? 'Primaria' : level === 'higher' ? 'Superior' : 'Secundaria';

  const printContext = useMemo(() => {
    if (rubricType === 'period') return `${selectedPeriodLabel} · ${subject} · ${grade} · ${levelLabel}`;
    const actLabel = ACTIVITY_TYPES.find(a => a.id === activityType)?.labelEs ?? activityOther;
    return `${actLabel} · ${subject} · ${grade} · ${levelLabel}`;
  }, [rubricType, levelLabel, grade, subject, activityType, activityOther, selectedPeriodLabel]);

  // ── Generar criterios con IA ──────────────────────────────────────────────────

  const generateCriteria = async () => {
    setLoadingCriteria(true);
    setCriteria([]);

    const actLabel = ACTIVITY_TYPES.find(a => a.id === activityType)?.labelEs ?? activityOther ?? 'Actividad';

    const contextLine = rubricType === 'period'
      ? `Evaluación de período (${selectedPeriodLabel}) · ${subject} · ${grade} · ${levelLabel}`
      : `${actLabel}${activityDesc.trim() ? ` — ${activityDesc.trim()}` : ''} · ${subject} · ${grade} · ${levelLabel}`;

    const prompt = `Generá entre 4 y 5 criterios de evaluación para una rúbrica con este contexto:
${contextLine}

Los criterios deben ser:
- Específicos para la materia y el tipo de actividad (NO genéricos)
- Observables y medibles por un docente
- Redactados como sustantivos o frases nominales cortas (máximo 5 palabras cada uno)
- Apropiados para el nivel indicado

${rubricType === 'period' ? 'Al ser una evaluación de período, incluí criterios que reflejen evolución, proceso y constancia a lo largo del tiempo.' : ''}

Respondé ÚNICAMENTE con un array JSON de strings, sin texto adicional, sin markdown:
["Criterio 1", "Criterio 2", "Criterio 3", "Criterio 4", "Criterio 5"]`;

    try {
      const fn = httpsCallable(getFunctions(app), 'generateQuestions');
      const result: any = await fn({ prompt });
      const raw     = result.data.content?.find((b: any) => b.type === 'text')?.text || '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: string[] = JSON.parse(cleaned);
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('formato inesperado');
      setCriteria(parsed.filter(c => typeof c === 'string' && c.trim()));
    } catch {
      // Fallback silencioso — el docente puede agregar criterios manualmente
      setCriteria(rubricType === 'period' ? FALLBACK_CRITERIA_PERIOD : FALLBACK_CRITERIA_ACTIVITY);
    } finally {
      setLoadingCriteria(false);
    }
  };

  // Auto-generar criterios al entrar al step 3
  useEffect(() => {
    if (step === 3 && subject && rubricType) {
      generateCriteria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleLevelChange = (l: Level) => {
    setLevel(l);
    setGrade(l === 'primary' ? '6°' : l === 'higher' ? '1° año' : '3°');
    setSubject('');
  };

  const handleRubricTypeSelect = (type: 'activity' | 'period') => {
    setRubricType(type);
    setCriteria([]);
  };

  const handleActivitySelect = (id: string) => {
    setActivityType(id);
  };

  const handlePeriodOrgSelect = (orgId: PeriodOrg) => {
    setPeriodOrg(orgId);
    setPeriodNumber('');
    setPeriodOtherNum('');
  };

  const handleAddCriterion = () => {
    const val = newCriterion.trim();
    if (val && !criteria.includes(val)) {
      setCriteria(prev => [...prev, val]);
      setNewCriterion('');
    }
  };

  const handleNext = () => {
    if (step === 1 && rubricType === 'period') { setStep(3); return; }
    setStep(prev => Math.min(prev + 1, 3) as 1|2|3);
  };

  const handleBack = () => {
    if (step === 3 && rubricType === 'period') { setStep(1); return; }
    if (step > 1) { setStep(prev => (prev - 1) as 1|2|3); return; }
    navigate('/');
  };

  // ── Validaciones ──────────────────────────────────────────────────────────────

  const canGoStep2 = rubricType !== null && subject.trim() !== '' && (
    rubricType === 'activity' ? true : periodOrg !== '' && selectedPeriodLabel !== ''
  );
  const canGoStep3 = rubricType === 'activity'
    ? activityType !== '' && (activityType !== 'other' || activityOther.trim() !== '')
    : true;
  const canGenerate = criteria.length >= 1 && !loadingCriteria;

  // ── Generar rúbrica completa ──────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }
    setIsGenerating(true); setError(null); setRubric(null);

    let contextBlock = '';
    if (rubricType === 'activity') {
      const actLabel = ACTIVITY_TYPES.find(a => a.id === activityType)?.labelEs ?? activityOther;
      contextBlock = `Tipo de evaluación: Actividad específica\nTipo de actividad: ${actLabel}${activityDesc.trim() ? `\nDescripción: ${activityDesc.trim()}` : ''}`;
    } else {
      const orgLabel = periodOrg === 'otro'
        ? (periodOtherOrg || 'Organización propia')
        : (PERIOD_ORGS.find(o => o.id === periodOrg)?.label ?? '');
      contextBlock = `Tipo de evaluación: Evaluación de período\nOrganización del año: ${orgLabel}\nPeríodo evaluado: ${selectedPeriodLabel}\nNOTA: Los descriptores deben reflejar evolución, constancia y proceso a lo largo del período.`;
    }

    const prompt = `Generá una rúbrica de evaluación para docentes argentinos:

Nivel: ${levelLabel}
Año/Grado: ${grade}
Materia: ${subject}
${contextBlock}

Criterios:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Escala (de menor a mayor): ${currentScale.labels.join(' → ')}

INSTRUCCIONES:
- Descripciones concretas y observables, 15-40 palabras por celda
- Específicas para la materia y el nivel (no genéricas)
- Lenguaje claro para docentes argentinos

Respondé ÚNICAMENTE con JSON válido, sin markdown:
{
  "title": "Rúbrica de evaluación: [descripción]",
  "criteria": [
    {
      "name": "nombre del criterio",
      "levels": {
        "${currentScale.keys[0]}": "descripción nivel 1",
        "${currentScale.keys[1]}": "descripción nivel 2",
        "${currentScale.keys[2]}": "descripción nivel 3",
        "${currentScale.keys[3]}": "descripción nivel 4"
      }
    }
  ]
}`;

    try {
      const fn = httpsCallable(getFunctions(app), 'generateQuestions');
      const result: any = await fn({ prompt });
      const raw     = result.data.content?.find((b: any) => b.type === 'text')?.text || '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: GeneratedRubric = JSON.parse(cleaned);
      if (!parsed.criteria?.length) throw new Error('Formato inesperado en la respuesta');
      setRubric(parsed);
      
      // ── Registrar estadísticas en Firebase (si el usuario está logueado) ──
      if (user) {
        try {
          const db = getDatabase(app);
          const statsRef = ref(db, `rubricStats/${user.uid}`);
          const historyRef = ref(db, `rubricStats/${user.uid}/history`);
          await update(statsRef, {
            totalGenerated: increment(1),
            lastGeneratedAt: Date.now(),
          });
          await push(historyRef, {
            createdAt: Date.now(),
            subject: subject,
            level: level,
            type: rubricType,
            grade: grade,
            ...(rubricType === 'activity' && { activityType: activityType === 'other' ? activityOther : activityType }),
            ...(rubricType === 'period' && { periodLabel: selectedPeriodLabel }),
          });
        } catch (statsErr) {
          // Error silencioso — no interrumpe la experiencia del usuario
          console.error('Error guardando estadísticas de rúbrica:', statsErr);
        }
      }
      
      if (!user) incrementFreemiumUses();
    } catch (err: any) {
      setError(`Error al generar: ${err.message}. Intentá de nuevo.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Copy & PDF ────────────────────────────────────────────────────────────────

  const handleCopy = async () => {
    if (!rubric) return;
    const lines = [rubric.title, '', ['Criterio', ...currentScale.labels].join('\t')];
    for (const c of rubric.criteria)
      lines.push([c.name, ...currentScale.keys.map(k => c.levels[k] || '')].join('\t'));
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* noop */ }
  };

  const handleExportPDF = () => {
    if (!rubric) return;
    injectPrintStyle();
    document.getElementById('rubric-print-area')?.remove();
    document.body.appendChild(buildPrintArea(rubric, currentScale, printContext));
    window.print();
    setTimeout(() => document.getElementById('rubric-print-area')?.remove(), 1000);
  };

  const handleLoginAndContinue = async () => {
    try { await loginWithGoogle(); setShowLoginWall(false); }
    catch (e) { console.error(e); }
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
              Generaste {FREEMIUM_LIMIT} rúbricas sin iniciar sesión.<br />
              Iniciá sesión para seguir generando <strong>sin límite</strong>.
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

  // ─── Resultado ────────────────────────────────────────────────────────────────

  if (rubric) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, maxWidth: 860 }}>
          <div style={{ background: theme.primaryGradient, padding: '20px 28px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>✅ Rúbrica generada</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>{rubric.title}</p>
            </div>
            <button onClick={() => { setRubric(null); setStep(3); }} style={closeBtnStyle}>✕</button>
          </div>

          <div style={{ padding: '24px 28px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 160 }}>Criterio</th>
                  {currentScale.labels.map((lbl, i) => (
                    <th key={i} style={{ ...thStyle, backgroundColor: LEVEL_COLORS[i].bg, color: LEVEL_COLORS[i].text }}>{lbl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((c, ri) => (
                  <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#f8fafc' : 'white' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b', backgroundColor: ri % 2 === 0 ? '#f1f5f9' : '#f8fafc' }}>{c.name}</td>
                    {currentScale.keys.map((k, ki) => (
                      <td key={ki} style={tdStyle}>{c.levels[k] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0 28px 24px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleCopy} style={{ ...btnPrimary, flex: 1, minWidth: 140 }}>
              {copied ? '✅ Copiado' : '📋 Copiar tabla'}
            </button>
            <button onClick={handleExportPDF} style={{ ...btnPrimary, flex: 1, minWidth: 140, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
              📄 Exportar PDF
            </button>
            <button onClick={() => { setRubric(null); setRubricType(null); setStep(1); }} style={{ ...btnSecondary, flex: 1, minWidth: 120 }}>
              🔄 Generar otra
            </button>
          </div>

          <div style={{ margin: '0 28px 28px', padding: '20px 24px', backgroundColor: '#f0fdf4', borderRadius: 14, border: '2px solid #86efac' }}>
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
                style={{ padding: '12px 20px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                Crear juego →
              </button>
            </div>
          </div>

          {!user && (
            <div style={{ margin: '0 28px 28px', padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>Usaste {getFreemiumUses()} de {FREEMIUM_LIMIT} rúbricas gratuitas.</span>
              <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>Iniciar sesión →</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Wizard ───────────────────────────────────────────────────────────────────

  const stepsConfig  = rubricType === 'period'
    ? [{ n: 1, label: 'Contexto' }, { n: 3, label: 'Criterios' }]
    : [{ n: 1, label: 'Contexto' }, { n: 2, label: 'Actividad' }, { n: 3, label: 'Criterios' }];
  const orderedSteps = rubricType === 'period' ? [1, 3] : [1, 2, 3];

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ background: theme.primaryGradient, padding: '20px 28px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📐</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Generador de Rúbricas</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>Creá rúbricas con IA en minutos</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', padding: '16px 28px', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
          {stepsConfig.map(s => {
            const isActive = step === s.n;
            const isPast   = orderedSteps.indexOf(s.n) < orderedSteps.indexOf(step);
            return (
              <div key={s.n} onClick={() => isPast && setStep(s.n as 1|2|3)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: isPast ? 'pointer' : 'default', backgroundColor: isActive ? theme.primary : isPast ? '#dcfce7' : '#f1f5f9', color: isActive ? 'white' : isPast ? '#16a34a' : '#94a3b8' }}>
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: '58vh' }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              <div>
                <label style={labelStyle}>¿Para qué es la rúbrica?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => handleRubricTypeSelect('activity')}
                    style={{ padding: '16px 20px', borderRadius: 12, border: rubricType === 'activity' ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: rubricType === 'activity' ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>📝</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: rubricType === 'activity' ? theme.primary : '#1e293b' }}>Una actividad específica</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Trabajo práctico, examen, exposición, proyecto…</div>
                    </div>
                  </button>
                  <button onClick={() => handleRubricTypeSelect('period')}
                    style={{ padding: '16px 20px', borderRadius: 12, border: rubricType === 'period' ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: rubricType === 'period' ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>📅</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: rubricType === 'period' ? theme.primary : '#1e293b' }}>Evaluación de período</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Bimestre, cuatrimestre, trimestre — seguimiento del proceso</div>
                    </div>
                  </button>
                </div>
              </div>

              {rubricType === 'period' && (
                <div style={{ padding: 20, backgroundColor: '#eff6ff', borderRadius: 14, border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>¿Cómo organizás el año en tu escuela?</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {PERIOD_ORGS.map(org => (
                        <button key={org.id} onClick={() => handlePeriodOrgSelect(org.id)}
                          style={{ padding: '12px 14px', borderRadius: 10, border: periodOrg === org.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: periodOrg === org.id ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: periodOrg === org.id ? theme.primary : '#1e293b' }}>{org.label}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{org.hint}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {periodOrg === 'otro' && (
                    <div>
                      <label style={labelStyle}>¿Cómo se llama tu período?</label>
                      <input type="text" value={periodOtherOrg} onChange={e => setPeriodOtherOrg(e.target.value)} placeholder="Ej: Módulo, Semestre…" style={inputStyle} />
                    </div>
                  )}
                  {periodOrg && periodOrg !== 'otro' && periodNumbers.length > 0 && (
                    <div>
                      <label style={labelStyle}>¿Qué período querés evaluar?</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {periodNumbers.map(p => (
                          <button key={p} onClick={() => setPeriodNumber(p)}
                            style={{ padding: '10px 16px', borderRadius: 20, border: 'none', backgroundColor: periodNumber === p ? theme.primary : '#f1f5f9', color: periodNumber === p ? 'white' : '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {periodOrg === 'otro' && (
                    <div>
                      <label style={labelStyle}>¿Qué período es?</label>
                      <input type="text" value={periodOtherNum} onChange={e => setPeriodOtherNum(e.target.value)} placeholder="Ej: 1er semestre, Módulo 2…" style={inputStyle} />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={labelStyle}>Nivel educativo</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {([
                    { id: 'primary'   as const, icon: '🎒', label: 'Primaria'   },
                    { id: 'secondary' as const, icon: '🎓', label: 'Secundaria' },
                    { id: 'higher'    as const, icon: '🏛️', label: 'Superior'   },
                  ]).map(lv => (
                    <button key={lv.id} onClick={() => handleLevelChange(lv.id)}
                      style={{ ...optionBtn, ...(level === lv.id ? optionBtnSelected(theme.primary) : {}) }}>
                      <span style={{ fontSize: 22 }}>{lv.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: level === lv.id ? theme.primary : '#1e293b' }}>{lv.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Año / Grado</label>
                <select value={grade} onChange={e => setGrade(e.target.value)} style={selectStyle}>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Materia</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} style={selectStyle}>
                  <option value="">— Seleccioná una materia —</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="Otra">Otra</option>
                </select>
                {subject === 'Otra' && (
                  <input type="text" placeholder="Nombre de la materia"
                    onChange={e => { if (e.target.value) setSubject(e.target.value); }}
                    style={{ ...inputStyle, marginTop: 8 }} />
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && rubricType === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={labelStyle}>Tipo de actividad</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {ACTIVITY_TYPES.map(at => (
                    <button key={at.id} onClick={() => handleActivitySelect(at.id)}
                      style={{ ...optionBtn, ...(activityType === at.id ? optionBtnSelected(theme.primary) : {}), flexDirection: 'row', gap: 10, textAlign: 'left' }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{at.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: activityType === at.id ? theme.primary : '#1e293b' }}>{at.labelEs}</span>
                    </button>
                  ))}
                </div>
                {activityType === 'other' && (
                  <input type="text" value={activityOther} onChange={e => setActivityOther(e.target.value)}
                    placeholder="Describí el tipo de actividad" style={{ ...inputStyle, marginTop: 10 }} autoFocus />
                )}
              </div>
              <div>
                <label style={labelStyle}>
                  Descripción <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional, mejora la precisión de los criterios)</span>
                </label>
                <textarea value={activityDesc} onChange={e => setActivityDesc(e.target.value)} rows={3}
                  placeholder="Ej: Trabajo en grupos de 3 sobre la Revolución de Mayo. Presentan causas, consecuencias y un análisis propio."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {rubricType === 'period' && selectedPeriodLabel && (
                <div style={{ padding: '10px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
                  📅 {selectedPeriodLabel} · {subject} · {grade}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Criterios a evaluar</label>
                  {/* Botón regenerar criterios */}
                  {!loadingCriteria && criteria.length > 0 && (
                    <button onClick={generateCriteria}
                      style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${theme.primary}`, backgroundColor: 'white', color: theme.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      🔄 Regenerar
                    </button>
                  )}
                </div>

                {/* Estado de carga */}
                {loadingCriteria ? (
                  <div style={{ padding: '20px 16px', backgroundColor: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.primary, opacity: 0.6, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 13, color: '#64748b' }}>
                      Generando criterios para <strong>{subject}</strong> · {ACTIVITY_TYPES.find(a => a.id === activityType)?.labelEs ?? activityOther ?? 'período'}…
                    </span>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>
                      Generados específicamente para tu contexto — editá, eliminá o agregá los que necesites.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {criteria.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', backgroundColor: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                          <span style={{ flex: 1, fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{i + 1}. {c}</span>
                          <button onClick={() => setCriteria(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ padding: '3px 8px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={newCriterion} onChange={e => setNewCriterion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCriterion()}
                    placeholder="Agregar criterio propio…" style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={handleAddCriterion} disabled={!newCriterion.trim()}
                    style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', background: !newCriterion.trim() ? '#e2e8f0' : theme.primaryGradient, color: !newCriterion.trim() ? '#94a3b8' : 'white', cursor: !newCriterion.trim() ? 'not-allowed' : 'pointer' }}>
                    + Agregar
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Escala de niveles (siempre 4)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SCALES.map(sc => (
                    <button key={sc.id} onClick={() => setScaleId(sc.id)}
                      style={{ padding: '12px 16px', borderRadius: 10, border: scaleId === sc.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: scaleId === sc.id ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: scaleId === sc.id ? 'none' : '2px solid #cbd5e1', backgroundColor: scaleId === sc.id ? theme.primary : 'white', flexShrink: 0 }} />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sc.labels.map((lbl, i) => (
                          <span key={i} style={{ padding: '3px 10px', borderRadius: 20, backgroundColor: LEVEL_COLORS[i].bg, color: LEVEL_COLORS[i].text, fontSize: 12, fontWeight: 600 }}>{lbl}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {!user && (
                <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                  💡 Podés generar {FREEMIUM_LIMIT - getFreemiumUses()} rúbrica{FREEMIUM_LIMIT - getFreemiumUses() !== 1 ? 's' : ''} más sin iniciar sesión.
                </div>
              )}

              {error && (
                <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626', border: '1px solid #fecaca' }}>{error}</div>
              )}

              {isGenerating && (
                <div style={{ padding: '14px 18px', backgroundColor: '#fffbeb', borderRadius: 10, border: '1px solid #fbbf24', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>⏳</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Generando rúbrica con IA…</div>
                    <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>Puede tardar hasta 30 segundos.</div>
                  </div>
                </div>
              )}
            </div>
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
          ) : (
            <button onClick={handleGenerate} disabled={!canGenerate || isGenerating}
              style={{ ...btnPrimary, opacity: (!canGenerate || isGenerating) ? 0.5 : 1, minWidth: 200 }}>
              {isGenerating ? '⏳ Generando…' : '✨ Generar rúbrica'}
            </button>
          )}
        </div>

        {/* CSS animación dots */}
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50%       { transform: scale(1.4); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '32px 20px', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};
const cardStyle: React.CSSProperties = {
  backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 680,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 10, fontSize: 14, fontWeight: 700, color: '#475569',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
  border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'auto' };
const optionBtn: React.CSSProperties = {
  padding: '14px', borderRadius: 12, border: '2px solid #e2e8f0', backgroundColor: 'white',
  cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
};
const optionBtnSelected = (color: string): React.CSSProperties => ({
  border: `3px solid ${color}`, backgroundColor: `${color}12`,
});
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
const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700,
  backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 12, color: '#475569',
  border: '1px solid #e2e8f0', verticalAlign: 'top', lineHeight: 1.5,
};