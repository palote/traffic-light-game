// src/pages/CorreccionPage.tsx
// ✅ Corrección de trabajos escritos con rúbrica
// ✅ Dos modos: de a uno / lote (hasta 5)
// ✅ Evaluación por criterio + devolución personalizada
// ✅ Resumen de patrones cuando hay 3+ correcciones
// ✅ Copiar devolución / Exportar PDF
// ✅ Freemium: 2 correcciones sin login

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'correccion_uses';
const FREEMIUM_LIMIT = 2;

const LEVEL_ICONS: Record<string, string> = {
  'inicial':      '🔴',
  'en proceso':   '🟡',
  'logrado':      '🟢',
  'destacado':    '⭐',
  'insuficiente': '🔴',
  'suficiente':   '🟡',
  'bueno':        '🟢',
  'muy bueno':    '⭐',
  '1': '🔴', '2': '🟡', '3': '🟢', '4': '⭐',
};

function getLevelIcon(level: string): string {
  const key = level.toLowerCase().trim();
  return LEVEL_ICONS[key] || '📋';
}

const PRINT_STYLE = `
@media print {
  body > *:not(#correccion-print-area) { display: none !important; }
  #correccion-print-area {
    display: block !important; padding: 24px;
    font-family: Arial, sans-serif; font-size: 12px; color: #1e293b;
  }
  #correccion-print-area h1 { font-size: 16px; margin: 0 0 4px; }
  #correccion-print-area .meta { font-size: 11px; color: #64748b; margin: 0 0 16px; }
  #correccion-print-area .alumno-header { font-size: 14px; font-weight: 700; background: #f1f5f9; padding: 8px 12px; margin: 16px 0 8px; border-left: 4px solid #1e40af; }
  #correccion-print-area .criterio { margin: 8px 0; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; }
  #correccion-print-area .criterio-title { font-weight: 700; font-size: 12px; }
  #correccion-print-area .criterio-nivel { color: #1e40af; font-size: 11px; margin: 2px 0; }
  #correccion-print-area .criterio-comment { font-size: 11px; color: #475569; }
  #correccion-print-area .devolucion { margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px; font-size: 12px; line-height: 1.6; }
  #correccion-print-area .footer-print { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @page { margin: 1.5cm; }
}`;

function injectPrintStyle() {
  if (document.getElementById('correccion-print-style')) return;
  const s = document.createElement('style');
  s.id = 'correccion-print-style';
  s.textContent = PRINT_STYLE;
  document.head.appendChild(s);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CriterioResult {
  criterio:   string;
  nivel:      string;
  comentario: string;
}

interface CorrectionResult {
  nombre:      string;
  criterios:   CriterioResult[];
  devolucion:  string;
  notaSugerida?: string;
}

interface StudentInput {
  id:     string;
  nombre: string;
  texto:  string;
}

type CorrectionMode = 'one' | 'batch' | null;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFreemiumUses(): number {
  try { return parseInt(localStorage.getItem(FREEMIUM_KEY) || '0', 10); }
  catch { return 0; }
}
function incrementFreemiumUses(): void {
  try { localStorage.setItem(FREEMIUM_KEY, String(getFreemiumUses() + 1)); }
  catch { /* noop */ }
}
function uid() { return Math.random().toString(36).slice(2, 8); }

function buildPrompt(rubrica: string, nombre: string, trabajo: string): string {
  return `Sos un docente experto evaluando el trabajo escrito de un alumno.

RÚBRICA DE EVALUACIÓN:
${rubrica}

NOMBRE DEL ALUMNO: ${nombre || 'Alumno'}

TRABAJO A CORREGIR:
${trabajo}

Evaluá el trabajo según cada criterio de la rúbrica. Para cada criterio indicá:
1. El nivel alcanzado (usando exactamente los niveles de la rúbrica)
2. Un comentario concreto de 1-2 oraciones que justifique el nivel y oriente la mejora

Al final generá una devolución general de 3-4 oraciones dirigida al alumno: empezá reconociendo los logros, luego señalá el área principal de mejora y cerrá con una recomendación concreta.

Respondé ÚNICAMENTE con JSON válido, sin markdown:
{
  "criterios": [
    {
      "criterio": "nombre del criterio",
      "nivel": "nivel alcanzado",
      "comentario": "comentario constructivo"
    }
  ],
  "devolucion": "devolución general para el alumno",
  "notaSugerida": "opcional: nota o calificación sugerida según la escala de la rúbrica"
}`;
}

// Analiza patrones del grupo
function analyzePatterns(results: CorrectionResult[]): string[] {
  if (results.length < 2) return [];
  const critMap: Record<string, string[]> = {};
  for (const r of results) {
    for (const c of r.criterios) {
      if (!critMap[c.criterio]) critMap[c.criterio] = [];
      critMap[c.criterio].push(c.nivel.toLowerCase());
    }
  }
  const patterns: string[] = [];
  for (const [criterio, niveles] of Object.entries(critMap)) {
    const bajos = niveles.filter(n => ['inicial','insuficiente','1','en proceso','suficiente','2'].includes(n));
    const pct = Math.round((bajos.length / niveles.length) * 100);
    if (pct >= 60) {
      patterns.push(`${pct}% del grupo tuvo dificultades en "${criterio}" — considerá reenseñar este aspecto`);
    }
    const altos = niveles.filter(n => ['destacado','muy bueno','4','⭐'].includes(n));
    if (altos.length === niveles.length) {
      patterns.push(`Todo el grupo alcanzó el nivel máximo en "${criterio}" ✅`);
    }
  }
  return patterns;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function CorreccionPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  // Flujo general
  const [step, setStep]         = useState<1|2|3>(1);
  const [mode, setMode]         = useState<CorrectionMode>(null);

  // Rúbrica
  const [rubrica, setRubrica]   = useState('');

  // Modo "de a uno"
  const [nombre,  setNombre]    = useState('');
  const [trabajo, setTrabajo]   = useState('');

  // Modo "lote"
  const [students, setStudents] = useState<StudentInput[]>([
    { id: uid(), nombre: '', texto: '' },
    { id: uid(), nombre: '', texto: '' },
  ]);

  // Resultados acumulados en la sesión
  const [allResults,    setAllResults]    = useState<CorrectionResult[]>([]);
  const [currentResult, setCurrentResult] = useState<CorrectionResult | null>(null);
  const [batchResults,  setBatchResults]  = useState<CorrectionResult[]>([]);

  // UI
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [copiedId,      setCopiedId]      = useState<string | null>(null);
  const [showLoginWall, setShowLoginWall] = useState(false);

  const patterns = analyzePatterns(allResults);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleLoginAndContinue = async () => {
    try { await loginWithGoogle(); setShowLoginWall(false); }
    catch (e) { console.error(e); }
  };

  const updateStudent = (id: string, field: 'nombre' | 'texto', value: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  const addStudent    = () => { if (students.length < 5) setStudents(prev => [...prev, { id: uid(), nombre: '', texto: '' }]); };
  const removeStudent = (id: string) => { if (students.length > 1) setStudents(prev => prev.filter(s => s.id !== id)); };

  // ── Corregir uno ──────────────────────────────────────────────────────────────

  const handleCorrectOne = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }
    if (!trabajo.trim()) return;
    setIsGenerating(true); setError(null); setCurrentResult(null);

    try {
      const fn = httpsCallable(getFunctions(app), 'generateQuestions');
      const res: any = await fn({ prompt: buildPrompt(rubrica, nombre, trabajo) });
      const raw     = res.data.content?.find((b: any) => b.type === 'text')?.text || '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed  = JSON.parse(cleaned);
      const result: CorrectionResult = {
        nombre:       nombre.trim() || 'Alumno',
        criterios:    parsed.criterios || [],
        devolucion:   parsed.devolucion || '',
        notaSugerida: parsed.notaSugerida,
      };
      setCurrentResult(result);
      setAllResults(prev => [...prev, result]);
      if (!user) incrementFreemiumUses();
      setStep(3);
    } catch (err: any) {
      setError(`Error: ${err.message}. Intentá de nuevo.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Corregir lote ─────────────────────────────────────────────────────────────

  const handleCorrectBatch = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }
    const valid = students.filter(s => s.texto.trim());
    if (!valid.length) return;
    setIsGenerating(true); setError(null); setBatchResults([]);

    try {
      const fn = httpsCallable(getFunctions(app), 'generateQuestions');
      const results: CorrectionResult[] = [];

      for (const student of valid) {
        const res: any = await fn({ prompt: buildPrompt(rubrica, student.nombre, student.texto) });
        const raw     = res.data.content?.find((b: any) => b.type === 'text')?.text || '';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed  = JSON.parse(cleaned);
        results.push({
          nombre:       student.nombre.trim() || `Alumno ${results.length + 1}`,
          criterios:    parsed.criterios || [],
          devolucion:   parsed.devolucion || '',
          notaSugerida: parsed.notaSugerida,
        });
      }

      setBatchResults(results);
      setAllResults(prev => [...prev, ...results]);
      if (!user) incrementFreemiumUses();
      setStep(3);
    } catch (err: any) {
      setError(`Error: ${err.message}. Intentá de nuevo.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Copiar devolución ─────────────────────────────────────────────────────────

  const copyDevolucion = async (result: CorrectionResult) => {
    const text = [
      `Devolución para ${result.nombre}`,
      '',
      ...result.criterios.map(c => `${c.criterio}: ${c.nivel}\n${c.comentario}`),
      '',
      result.devolucion,
      result.notaSugerida ? `\nCalificación sugerida: ${result.notaSugerida}` : '',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(result.nombre);
      setTimeout(() => setCopiedId(null), 2500);
    } catch { /* noop */ }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────────

  const handlePDF = (results: CorrectionResult[]) => {
    injectPrintStyle();
    document.getElementById('correccion-print-area')?.remove();
    const div = document.createElement('div');
    div.id = 'correccion-print-area';
    div.style.display = 'none';

    let html = `<h1>Correcciones</h1><p class="meta">Generado el ${new Date().toLocaleDateString('es-AR')}</p>`;
    for (const r of results) {
      html += `<div class="alumno-header">👤 ${r.nombre}</div>`;
      for (const c of r.criterios) {
        html += `<div class="criterio">
          <div class="criterio-title">${c.criterio}</div>
          <div class="criterio-nivel">${getLevelIcon(c.nivel)} ${c.nivel}</div>
          <div class="criterio-comment">${c.comentario}</div>
        </div>`;
      }
      html += `<div class="devolucion"><strong>Devolución general:</strong><br>${r.devolucion}</div>`;
      if (r.notaSugerida) html += `<p><strong>Calificación sugerida:</strong> ${r.notaSugerida}</p>`;
    }
    html += `<div class="footer-print">Generado con El Juego del Semáforo · eljuegodelsemaforo.com</div>`;
    div.innerHTML = html;
    document.body.appendChild(div);
    window.print();
    setTimeout(() => document.getElementById('correccion-print-area')?.remove(), 1000);
  };

  // ── Render: resultado individual ──────────────────────────────────────────────

  const renderResult = (result: CorrectionResult) => (
    <div key={result.nombre} style={{ borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', backgroundColor:'white' }}>
      {/* Header del alumno */}
      <div style={{ padding:'12px 18px', backgroundColor:'#1e40af', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:700, fontSize:15 }}>👤 {result.nombre}</span>
        {result.notaSugerida && (
          <span style={{ padding:'3px 10px', borderRadius:20, backgroundColor:'rgba(255,255,255,0.2)', fontSize:13, fontWeight:600 }}>
            {result.notaSugerida}
          </span>
        )}
      </div>

      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
        {/* Criterios */}
        {result.criterios.map((c, i) => (
          <div key={i} style={{ padding:'12px 14px', borderRadius:10, backgroundColor:'#f8fafc', border:'1px solid #e2e8f0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{c.criterio}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#1e40af', display:'flex', alignItems:'center', gap:4 }}>
                {getLevelIcon(c.nivel)} {c.nivel}
              </span>
            </div>
            <p style={{ margin:0, fontSize:13, color:'#475569', lineHeight:1.6 }}>{c.comentario}</p>
          </div>
        ))}

        {/* Devolución general */}
        <div style={{ padding:'14px 16px', borderRadius:10, backgroundColor:'#eff6ff', border:'1px solid #bfdbfe' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1e40af', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
            Devolución general
          </div>
          <p style={{ margin:0, fontSize:14, color:'#1e293b', lineHeight:1.7 }}>{result.devolucion}</p>
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => copyDevolucion(result)}
            style={{ flex:1, padding:'9px', fontSize:13, fontWeight:600, borderRadius:8, border:'none', background:copiedId===result.nombre?'#22c55e':theme.primaryGradient, color:'white', cursor:'pointer' }}>
            {copiedId === result.nombre ? '✅ Copiado' : '📋 Copiar devolución'}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Freemium wall ────────────────────────────────────────────────────────────

  if (showLoginWall) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign:'center', padding:'40px 28px' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🔒</div>
            <h2 style={{ margin:'0 0 12px', fontSize:24, fontWeight:800, color:'#1e293b' }}>Límite de uso gratuito</h2>
            <p style={{ margin:'0 0 28px', color:'#64748b', fontSize:15, lineHeight:1.6 }}>
              Usaste {FREEMIUM_LIMIT} correcciones sin iniciar sesión.<br/>
              Iniciá sesión para seguir <strong>sin límite</strong>.
            </p>
            <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, fontSize:15, padding:'14px 32px' }}>Continuar con Google</button>
            <br/>
            <button onClick={() => navigate('/')} style={{ ...btnSecondary, marginTop:12 }}>← Volver</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER principal ─────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: step === 3 ? 760 : 660 }}>

        {/* Header */}
        <div style={{ background:theme.primaryGradient, padding:'20px 28px', borderRadius:'20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', color:'white' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:28 }}>✍️</span>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>Corrector con Rúbrica</h1>
              <p style={{ margin:'4px 0 0', fontSize:13, opacity:0.9 }}>
                Evaluá trabajos escritos con criterios pedagógicos
              </p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display:'flex', padding:'16px 28px', gap:8, borderBottom:'1px solid #e2e8f0' }}>
          {[{n:1,label:'Rúbrica'},{n:2,label:'Trabajos'},{n:3,label:'Correcciones'}].map(s => {
            const isActive = step === s.n;
            const isPast   = s.n < step;
            return (
              <div key={s.n} onClick={() => isPast && setStep(s.n as 1|2|3)}
                style={{ flex:1, padding:'8px 12px', borderRadius:8, textAlign:'center', fontSize:12, fontWeight:600, cursor:isPast?'pointer':'default', backgroundColor:isActive?theme.primary:isPast?'#dcfce7':'#f1f5f9', color:isActive?'white':isPast?'#16a34a':'#94a3b8' }}>
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding:'24px 28px', overflowY:'auto', maxHeight:'64vh', display:'flex', flexDirection:'column', gap:22 }}>

          {/* ══ STEP 1: Rúbrica ══ */}
          {step === 1 && (
            <>
              <div style={{ padding:'14px 16px', backgroundColor:'#eff6ff', borderRadius:12, border:'1px solid #bfdbfe', fontSize:13, color:'#1e40af' }}>
                💡 Pegá el texto de tu rúbrica — puede ser la que generaste con el Generador de Rúbricas o cualquier otra que tengas.
                <br/>
                <button onClick={() => window.open('/rubric-generator', '_blank')}
                  style={{ marginTop:8, padding:'5px 12px', fontSize:12, fontWeight:600, borderRadius:8, border:`1px solid ${theme.primary}`, backgroundColor:'white', color:theme.primary, cursor:'pointer' }}>
                  Ir al Generador de Rúbricas →
                </button>
              </div>

              <div>
                <label style={labelStyle}>Rúbrica de evaluación *</label>
                <textarea value={rubrica} onChange={e => setRubrica(e.target.value)}
                  rows={10}
                  placeholder={`Pegá aquí tu rúbrica. Ejemplo:

Criterio 1: Comprensión del tema
- Inicial: No demuestra comprensión del tema
- En proceso: Comprende parcialmente
- Logrado: Comprende y explica correctamente
- Destacado: Comprende con profundidad y relaciona conceptos

Criterio 2: Uso del lenguaje
- Inicial: Vocabulario inadecuado
...`}
                  style={{ ...inputStyle, resize:'vertical', fontFamily:'monospace', lineHeight:1.6, fontSize:13 }} />
              </div>
            </>
          )}

          {/* ══ STEP 2: Trabajos ══ */}
          {step === 2 && (
            <>
              {/* Selector de modo */}
              {!mode && (
                <div>
                  <label style={labelStyle}>¿Cómo querés corregir?</label>
                  <div style={{ display:'flex', gap:12 }}>
                    <button onClick={() => setMode('one')}
                      style={{ flex:1, padding:'20px 16px', borderRadius:14, border:'2px solid #e2e8f0', backgroundColor:'white', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor=theme.primary; e.currentTarget.style.backgroundColor=`${theme.primary}08`; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.backgroundColor='white'; }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>👤</div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:4 }}>De a uno</div>
                      <div style={{ fontSize:12, color:'#64748b' }}>Corregís un trabajo por vez, resultado inmediato</div>
                    </button>
                    <button onClick={() => setMode('batch')}
                      style={{ flex:1, padding:'20px 16px', borderRadius:14, border:'2px solid #e2e8f0', backgroundColor:'white', cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor=theme.primary; e.currentTarget.style.backgroundColor=`${theme.primary}08`; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.backgroundColor='white'; }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:4 }}>En lote</div>
                      <div style={{ fontSize:12, color:'#64748b' }}>Cargás hasta 5 trabajos y los corregís juntos</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Modo: de a uno */}
              {mode === 'one' && (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <label style={{ ...labelStyle, marginBottom:0 }}>Trabajo del alumno</label>
                    <button onClick={() => setMode(null)} style={{ fontSize:12, color:'#64748b', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                      Cambiar modo
                    </button>
                  </div>
                  <div>
                    <label style={labelStyle}>Nombre del alumno <span style={{ fontWeight:400, color:'#94a3b8' }}>(opcional)</span></label>
                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                      placeholder="Ej: Valentina García" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Trabajo (texto a corregir) *</label>
                    <textarea value={trabajo} onChange={e => setTrabajo(e.target.value)}
                      rows={8} placeholder="Pegá aquí el texto del trabajo del alumno..."
                      style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
                  </div>
                </>
              )}

              {/* Modo: lote */}
              {mode === 'batch' && (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <label style={{ ...labelStyle, marginBottom:0 }}>Trabajos ({students.length}/5)</label>
                    <button onClick={() => setMode(null)} style={{ fontSize:12, color:'#64748b', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                      Cambiar modo
                    </button>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {students.map((s, i) => (
                      <div key={s.id} style={{ padding:'16px', borderRadius:12, border:'1px solid #e2e8f0', backgroundColor:'#f8fafc' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>Alumno {i + 1}</span>
                          {students.length > 1 && (
                            <button onClick={() => removeStudent(s.id)}
                              style={{ padding:'2px 8px', fontSize:12, borderRadius:6, border:'1px solid #fecaca', backgroundColor:'#fef2f2', color:'#dc2626', cursor:'pointer' }}>✕</button>
                          )}
                        </div>
                        <input type="text" value={s.nombre} onChange={e => updateStudent(s.id, 'nombre', e.target.value)}
                          placeholder="Nombre (opcional)" style={{ ...inputStyle, marginBottom:8 }} />
                        <textarea value={s.texto} onChange={e => updateStudent(s.id, 'texto', e.target.value)}
                          rows={5} placeholder="Pegá el trabajo aquí..."
                          style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
                      </div>
                    ))}
                  </div>

                  {students.length < 5 && (
                    <button onClick={addStudent}
                      style={{ width:'100%', padding:'10px', borderRadius:10, border:`2px dashed ${theme.primary}`, backgroundColor:'white', color:theme.primary, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      + Agregar alumno
                    </button>
                  )}
                </>
              )}

              {!user && (
                <div style={{ padding:'12px 16px', backgroundColor:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', fontSize:13, color:'#1e40af' }}>
                  💡 Podés hacer {FREEMIUM_LIMIT - getFreemiumUses()} corrección{FREEMIUM_LIMIT - getFreemiumUses()!==1?'es':''} más sin iniciar sesión.
                </div>
              )}

              {error && (
                <div style={{ padding:'12px 14px', backgroundColor:'#fef2f2', borderRadius:8, fontSize:13, color:'#dc2626', border:'1px solid #fecaca' }}>{error}</div>
              )}

              {isGenerating && (
                <div style={{ padding:'14px 18px', backgroundColor:'#fffbeb', borderRadius:10, border:'1px solid #fbbf24', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:24 }}>⏳</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#92400e' }}>
                      {mode === 'batch' ? 'Corrigiendo trabajos con IA…' : 'Corrigiendo con IA…'}
                    </div>
                    <div style={{ fontSize:12, color:'#a16207', marginTop:2 }}>
                      {mode === 'batch' ? 'Puede tardar hasta 1 minuto según la cantidad.' : 'Unos segundos. No cierres esta ventana.'}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ STEP 3: Resultados ══ */}
          {step === 3 && (
            <>
              {/* Acciones globales */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={() => handlePDF(mode === 'batch' ? batchResults : currentResult ? [currentResult] : [])}
                  style={{ ...btnPrimary, flex:1, minWidth:140, justifyContent:'center', background:'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                  📄 Exportar PDF
                </button>
                <button onClick={() => {
                  setStep(2);
                  setCurrentResult(null);
                  setBatchResults([]);
                  setNombre('');
                  setTrabajo('');
                  setStudents([{ id:uid(), nombre:'', texto:'' },{ id:uid(), nombre:'', texto:'' }]);
                  setError(null);
                }} style={{ ...btnSecondary, flex:1, minWidth:140 }}>
                  ✍️ {mode === 'one' ? 'Corregir otro' : 'Nuevo lote'}
                </button>
              </div>

              {/* Resultados */}
              {mode === 'one' && currentResult && renderResult(currentResult)}
              {mode === 'batch' && batchResults.map(r => renderResult(r))}

              {/* Patrones del grupo */}
              {patterns.length > 0 && (
                <div style={{ padding:'16px 20px', backgroundColor:'#fefce8', borderRadius:14, border:'2px solid #fde047' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#92400e', marginBottom:10 }}>
                    📊 Patrones del grupo ({allResults.length} correcciones en esta sesión)
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {patterns.map((p, i) => (
                      <div key={i} style={{ fontSize:13, color:'#78350f', display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ flexShrink:0 }}>→</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque conversión */}
              <div style={{ padding:'18px 22px', backgroundColor:'#f0fdf4', borderRadius:14, border:'2px solid #86efac' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#166534', marginBottom:6 }}>
                      🚦 ¿Querés que tus alumnos se preparen mejor para la próxima evaluación?
                    </div>
                    <p style={{ margin:0, fontSize:13, color:'#1e40af', lineHeight:1.5 }}>
                      Creá una actividad grupal con el Juego del Semáforo — los equipos debaten y consolidan el aprendizaje juntos.
                    </p>
                  </div>
                  <button onClick={() => navigate('/setup')}
                    style={{ padding:'10px 18px', fontSize:13, fontWeight:700, borderRadius:10, border:'none', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color:'white', cursor:'pointer', flexShrink:0 }}>
                    Crear juego →
                  </button>
                </div>
              </div>

              {!user && (
                <div style={{ padding:'12px 16px', backgroundColor:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', fontSize:13, color:'#1e40af', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span>Usaste {getFreemiumUses()} de {FREEMIUM_LIMIT} correcciones gratuitas.</span>
                  <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, padding:'8px 16px', fontSize:13 }}>Iniciar sesión →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 28px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={() => {
            if (step === 3) { setStep(2); setCurrentResult(null); setBatchResults([]); }
            else if (step === 2) setStep(1);
            else navigate('/');
          }} style={btnSecondary}>
            ← {step > 1 ? 'Atrás' : 'Volver'}
          </button>

          {step === 1 && (
            <button onClick={() => setStep(2)} disabled={!rubrica.trim()}
              style={{ ...btnPrimary, opacity:rubrica.trim()?1:0.5 }}>
              Continuar →
            </button>
          )}
          {step === 2 && mode === 'one' && (
            <button onClick={handleCorrectOne} disabled={!trabajo.trim() || isGenerating}
              style={{ ...btnPrimary, opacity:(!trabajo.trim()||isGenerating)?0.5:1, minWidth:200 }}>
              {isGenerating ? '⏳ Corrigiendo…' : '✨ Corregir trabajo'}
            </button>
          )}
          {step === 2 && mode === 'batch' && (
            <button onClick={handleCorrectBatch}
              disabled={!students.some(s => s.texto.trim()) || isGenerating}
              style={{ ...btnPrimary, opacity:(!students.some(s=>s.texto.trim())||isGenerating)?0.5:1, minWidth:200 }}>
              {isGenerating ? '⏳ Corrigiendo…' : `✨ Corregir ${students.filter(s=>s.texto.trim()).length} trabajo${students.filter(s=>s.texto.trim()).length!==1?'s':''}`}
            </button>
          )}
          {step === 2 && !mode && (
            <button disabled style={{ ...btnPrimary, opacity:0.3 }}>Continuar →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight:'100vh', background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display:'flex', alignItems:'flex-start', justifyContent:'center',
  padding:'32px 20px', fontFamily:"'Segoe UI', system-ui, -apple-system, sans-serif",
};
const cardStyle: React.CSSProperties = {
  backgroundColor:'white', borderRadius:20, width:'100%', maxWidth:660,
  boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden', display:'flex', flexDirection:'column',
};
const labelStyle: React.CSSProperties = {
  display:'block', marginBottom:10, fontSize:14, fontWeight:700, color:'#475569',
};
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'11px 14px', fontSize:14, borderRadius:10,
  border:'2px solid #e2e8f0', backgroundColor:'#f8fafc', outline:'none', boxSizing:'border-box',
};
const btnPrimary: React.CSSProperties = {
  padding:'12px 24px', fontSize:14, fontWeight:700, borderRadius:10, border:'none',
  background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color:'white', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8,
};
const btnSecondary: React.CSSProperties = {
  padding:'12px 20px', fontSize:14, fontWeight:600, borderRadius:10,
  border:'2px solid #e2e8f0', backgroundColor:'white', color:'#64748b', cursor:'pointer',
};
const closeBtnStyle: React.CSSProperties = {
  background:'rgba(255,255,255,0.2)', border:'none', color:'white',
  width:36, height:36, borderRadius:'50%', fontSize:18, cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
};