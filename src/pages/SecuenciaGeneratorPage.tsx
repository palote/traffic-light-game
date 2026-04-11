// src/pages/SecuenciaGeneratorPage.tsx
// ✅ Generador de Secuencias Didácticas
// ✅ 1-6 clases configurables
// ✅ Secciones por clase elegibles
// ✅ Output: texto estructurado + copiar + PDF
// ✅ Freemium: 2 usos sin login

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'secuencia_uses';
const FREEMIUM_LIMIT = 2;

const CLASS_DURATIONS = [
  { id: 40,  label: '40 min' },
  { id: 45,  label: '45 min' },
  { id: 60,  label: '60 min' },
  { id: 80,  label: '80 min' },
  { id: 90,  label: '90 min' },
  { id: 0,   label: 'Otra'   },
];

const STARTING_POINTS = [
  { id: 'new',     icon: '🆕', label: 'Tema nuevo',              desc: 'Los alumnos no vieron nada del tema' },
  { id: 'partial', icon: '📖', label: 'Conocimientos previos',   desc: 'Tienen nociones básicas del tema'     },
  { id: 'review',  icon: '🔄', label: 'Repaso / profundización', desc: 'Ya vieron el tema, se profundiza'     },
];

const SECTIONS = [
  { id: 'objective',  label: 'Objetivo de la clase',          icon: '🎯' },
  { id: 'warmup',     label: 'Inicio / enganche',             icon: '🔥' },
  { id: 'development',label: 'Desarrollo y actividades',      icon: '📝' },
  { id: 'closing',    label: 'Cierre y evaluación formativa', icon: '✅' },
  { id: 'resources',  label: 'Recursos sugeridos',            icon: '📚' },
  { id: 'timing',     label: 'Tiempos estimados',             icon: '⏱️' },
];

const LEVEL_OPTIONS = [
  { id: 'primary',   icon: '🎒', label: 'Primaria'   },
  { id: 'secondary', icon: '🎓', label: 'Secundaria' },
  { id: 'higher',    icon: '🏛️', label: 'Superior'   },
];

// ─── CSS impresión ─────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body > *:not(#secuencia-print-area) { display: none !important; }
  #secuencia-print-area {
    display: block !important;
    padding: 24px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    color: #1e293b;
  }
  #secuencia-print-area h1 { font-size: 18px; margin: 0 0 6px; }
  #secuencia-print-area .meta { font-size: 11px; color: #64748b; margin: 0 0 20px; }
  #secuencia-print-area .clase-header {
    font-size: 14px; font-weight: 700;
    background: #f1f5f9; padding: 8px 12px;
    margin: 16px 0 8px; border-left: 4px solid #1e40af;
  }
  #secuencia-print-area .section-title {
    font-size: 11px; font-weight: 700; color: #1e40af;
    text-transform: uppercase; margin: 10px 0 4px;
  }
  #secuencia-print-area p { margin: 0 0 6px; line-height: 1.6; }
  #secuencia-print-area .footer-print {
    margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: right;
    border-top: 1px solid #e2e8f0; padding-top: 8px;
  }
  @page { margin: 1.5cm; }
}`;

function injectPrintStyle() {
  if (document.getElementById('secuencia-print-style')) return;
  const s = document.createElement('style');
  s.id = 'secuencia-print-style';
  s.textContent = PRINT_STYLE;
  document.head.appendChild(s);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedSequence {
  title:   string;
  meta:    string;
  classes: { header: string; sections: { title: string; content: string }[] }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getFreemiumUses(): number {
  try { return parseInt(localStorage.getItem(FREEMIUM_KEY) || '0', 10); }
  catch { return 0; }
}
function incrementFreemiumUses(): void {
  try { localStorage.setItem(FREEMIUM_KEY, String(getFreemiumUses() + 1)); }
  catch { /* noop */ }
}

// Parsea el texto plano generado por Claude en estructura
function parseSequence(raw: string, classCount: number, title: string, meta: string): GeneratedSequence {
  const classes: GeneratedSequence['classes'] = [];
  // Dividir por "CLASE N" o "## Clase N"
  const parts = raw.split(/(?:^|\n)(?:##\s*)?CLASE\s+\d+/i).filter(Boolean);

  // Si el parse falla, devolver el texto completo como una sola sección
  if (parts.length < 2) {
    for (let i = 0; i < classCount; i++) {
      classes.push({ header: `Clase ${i + 1}`, sections: [{ title: 'Contenido', content: raw }] });
    }
    return { title, meta, classes };
  }

  parts.forEach((part, idx) => {
    if (idx === 0) return; // intro antes de "CLASE 1"
    const lines = part.trim().split('\n');
    const header = `Clase ${idx}`;
    const sections: { title: string; content: string }[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Detectar encabezados de sección: "**Título:**" o "### Título"
      const sectionMatch = line.match(/^\*\*([^*]+)\*\*:?$/) || line.match(/^###\s+(.+)/);
      if (sectionMatch) {
        if (currentTitle && currentContent.length) {
          sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
        }
        currentTitle = sectionMatch[1].trim();
        currentContent = [];
      } else if (line.trim()) {
        currentContent.push(line.replace(/^\*\*|\*\*$/g, '').trim());
      }
    }
    if (currentTitle && currentContent.length) {
      sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
    }
    // Si no se parsearon secciones, poner todo como contenido
    if (!sections.length) {
      sections.push({ title: 'Contenido', content: part.trim() });
    }
    classes.push({ header, sections });
  });

  return { title, meta, classes: classes.slice(0, classCount) };
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function SecuenciaGeneratorPage() {
  const navigate  = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [step, setStep] = useState<1|2>(1);

  // Step 1 — contexto
  const [level,        setLevel]        = useState('secondary');
  const [grade,        setGrade]        = useState('');
  const [subject,      setSubject]      = useState('');
  const [topic,        setTopic]        = useState('');
  const [objective,    setObjective]    = useState('');
  const [startingPoint,setStartingPoint]= useState('new');

  // Step 2 — estructura
  const [classCount,  setClassCount]  = useState(3);
  const [classDur,    setClassDur]    = useState(60);
  const [customDur,   setCustomDur]   = useState(60);
  const [sections,    setSections]    = useState<string[]>(['objective','warmup','development','closing']);

  // Generación
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [sequence,      setSequence]      = useState<GeneratedSequence | null>(null);
  const [rawText,       setRawText]       = useState('');
  const [error,         setError]         = useState<string | null>(null);
  const [copied,        setCopied]        = useState(false);
  const [showLoginWall, setShowLoginWall] = useState(false);

  const effectiveDur = classDur === 0 ? customDur : classDur;

  const levelLabel = useMemo(() =>
    LEVEL_OPTIONS.find(l => l.id === level)?.label || 'Secundaria'
  , [level]);

  const startingLabel = useMemo(() =>
    STARTING_POINTS.find(s => s.id === startingPoint)?.label || ''
  , [startingPoint]);

  const canGoStep2 = topic.trim() !== '' && subject.trim() !== '';
  const canGenerate = sections.length > 0;

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // ── Generación ────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }
    setIsGenerating(true); setError(null); setSequence(null); setRawText('');

    const sectionNames = SECTIONS
      .filter(s => sections.includes(s.id))
      .map(s => s.label);

    const prompt = `Generá una secuencia didáctica con las siguientes características:

Nivel educativo: ${levelLabel}${grade ? ` — ${grade}` : ''}
Materia / Asignatura: ${subject}
Tema: ${topic}
Punto de partida: ${startingLabel}
${objective.trim() ? `Objetivo general: ${objective.trim()}` : ''}
Cantidad de clases: ${classCount}
Duración de cada clase: ${effectiveDur} minutos

Cada clase debe incluir las siguientes secciones:
${sectionNames.map((s, i) => `${i + 1}. ${s}`).join('\n')}

FORMATO DE RESPUESTA:
- Usá exactamente este formato para cada clase:

CLASE 1
**[Nombre de la sección]**
[Contenido de la sección]

CLASE 2
**[Nombre de la sección]**
[Contenido de la sección]

(y así para cada clase)

INSTRUCCIONES:
- Sé concreto y práctico — cada actividad debe ser implementable en el aula
- Adaptá el lenguaje y complejidad al nivel indicado
- Las actividades de inicio deben generar interés y conectar con conocimientos previos
- El desarrollo debe incluir consignas claras y variadas
- El cierre debe incluir una instancia de evaluación formativa
- Si se piden tiempos, distribuílos coherentemente dentro de los ${effectiveDur} minutos
- No uses bullets con "•" — usá guiones o numeración
- No repitas el nombre de la materia o tema en cada clase

Respondé directamente con la secuencia, sin introducción ni cierre.`;

    try {
      const fn = httpsCallable(getFunctions(app), 'generateQuestions');
      const result: any = await fn({ prompt });
      const raw = result.data.content?.find((b: any) => b.type === 'text')?.text || '';
      if (!raw.trim()) throw new Error('Respuesta vacía');

      setRawText(raw.trim());
      const title = `Secuencia: ${topic}`;
      const meta  = `${levelLabel}${grade ? ` — ${grade}` : ''} · ${subject} · ${classCount} clase${classCount !== 1 ? 's' : ''} de ${effectiveDur} min`;
      setSequence(parseSequence(raw.trim(), classCount, title, meta));
      if (!user) incrementFreemiumUses();
    } catch (err: any) {
      setError(`Error al generar: ${err.message}. Intentá de nuevo.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* noop */ }
  };

  const handlePDF = () => {
    if (!sequence) return;
    injectPrintStyle();
    document.getElementById('secuencia-print-area')?.remove();

    const div = document.createElement('div');
    div.id = 'secuencia-print-area';
    div.style.display = 'none';

    let html = `<h1>${sequence.title}</h1><p class="meta">${sequence.meta}</p>`;
    for (const cls of sequence.classes) {
      html += `<div class="clase-header">${cls.header}</div>`;
      for (const sec of cls.sections) {
        html += `<div class="section-title">${sec.title}</div>`;
        html += `<p>${sec.content.replace(/\n/g, '<br>')}</p>`;
      }
    }
    html += `<div class="footer-print">Generado con El Juego del Semáforo · eljuegodelsemaforo.com</div>`;
    div.innerHTML = html;
    document.body.appendChild(div);
    window.print();
    setTimeout(() => document.getElementById('secuencia-print-area')?.remove(), 1000);
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
          <div style={{ textAlign:'center', padding:'40px 28px' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🔒</div>
            <h2 style={{ margin:'0 0 12px', fontSize:24, fontWeight:800, color:'#1e293b' }}>Límite de uso gratuito</h2>
            <p style={{ margin:'0 0 28px', color:'#64748b', fontSize:15, lineHeight:1.6 }}>
              Generaste {FREEMIUM_LIMIT} secuencias sin iniciar sesión.<br/>
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

  // ─── Resultado ────────────────────────────────────────────────────────────────

  if (sequence) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, maxWidth:780 }}>

          {/* Header */}
          <div style={{ background:theme.primaryGradient, padding:'20px 28px', borderRadius:'20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center', color:'white' }}>
            <div>
              <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>✅ Secuencia generada</h2>
              <p style={{ margin:'4px 0 0', fontSize:13, opacity:0.9 }}>{sequence.meta}</p>
            </div>
            <button onClick={() => { setSequence(null); setStep(2); }} style={closeBtnStyle}>✕</button>
          </div>

          {/* Acciones */}
          <div style={{ padding:'16px 28px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:10, flexWrap:'wrap' }}>
            <button onClick={handleCopy} style={{ ...btnPrimary, flex:1, minWidth:140, justifyContent:'center' }}>
              {copied ? '✅ Copiado' : '📋 Copiar texto'}
            </button>
            <button onClick={handlePDF} style={{ ...btnPrimary, flex:1, minWidth:140, justifyContent:'center', background:'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
              📄 Exportar PDF
            </button>
            <button onClick={() => { setSequence(null); setStep(1); setTopic(''); setObjective(''); }}
              style={{ ...btnSecondary, flex:1, minWidth:120 }}>
              🔄 Nueva secuencia
            </button>
          </div>

          {/* Contenido */}
          <div style={{ padding:'24px 28px', overflowY:'auto', maxHeight:'60vh', display:'flex', flexDirection:'column', gap:20 }}>
            {sequence.classes.map((cls, ci) => (
              <div key={ci} style={{ borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                {/* Header de clase */}
                <div style={{ padding:'12px 18px', backgroundColor:'#1e40af', color:'white', fontWeight:700, fontSize:15 }}>
                  {cls.header}
                </div>
                {/* Secciones */}
                <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14, backgroundColor:'white' }}>
                  {cls.sections.map((sec, si) => (
                    <div key={si}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#1e40af', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
                        {sec.title}
                      </div>
                      <div style={{ fontSize:14, color:'#1e293b', lineHeight:1.7, whiteSpace:'pre-line' }}>
                        {sec.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Bloque conversión */}
            <div style={{ padding:'20px 24px', backgroundColor:'#f0fdf4', borderRadius:14, border:'2px solid #86efac' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#166534', marginBottom:6 }}>
                    🚦 ¿Querés generar una dinámica áulica con un juego para que los alumnos aprendan este tema?
                  </div>
                  <p style={{ margin:0, fontSize:13, color:'#1e40af', lineHeight:1.5 }}>
                    Creá una actividad con el Juego del Semáforo para que tus alumnos trabajen y debatan el contenido antes de la evaluación.
                  </p>
                </div>
                <button onClick={() => navigate('/setup')}
                  style={{ padding:'12px 20px', fontSize:14, fontWeight:700, borderRadius:10, border:'none', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color:'white', cursor:'pointer', flexShrink:0, boxShadow:'0 4px 12px rgba(34,197,94,0.3)' }}>
                  Crear juego →
                </button>
              </div>
            </div>

            {!user && (
              <div style={{ padding:'12px 16px', backgroundColor:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', fontSize:13, color:'#1e40af', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span>Usaste {getFreemiumUses()} de {FREEMIUM_LIMIT} secuencias gratuitas.</span>
                <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, padding:'8px 16px', fontSize:13 }}>Iniciar sesión →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Wizard ───────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ background:theme.primaryGradient, padding:'20px 28px', borderRadius:'20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', color:'white' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:28 }}>📚</span>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>Generador de Secuencias</h1>
              <p style={{ margin:'4px 0 0', fontSize:13, opacity:0.9 }}>Planificá tu secuencia didáctica con IA</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display:'flex', padding:'16px 28px', gap:8, borderBottom:'1px solid #e2e8f0' }}>
          {[{n:1,label:'Contexto'},{n:2,label:'Estructura'}].map(s => {
            const isActive = step === s.n;
            const isPast   = s.n < step;
            return (
              <div key={s.n} onClick={() => isPast && setStep(s.n as 1|2)}
                style={{ flex:1, padding:'8px 12px', borderRadius:8, textAlign:'center', fontSize:12, fontWeight:600, cursor:isPast?'pointer':'default', backgroundColor:isActive?theme.primary:isPast?'#dcfce7':'#f1f5f9', color:isActive?'white':isPast?'#16a34a':'#94a3b8' }}>
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding:'24px 28px', overflowY:'auto', maxHeight:'60vh', display:'flex', flexDirection:'column', gap:22 }}>

          {/* ══ STEP 1 ══ */}
          {step === 1 && (
            <>
              {/* Nivel */}
              <div>
                <label style={labelStyle}>Nivel educativo</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {LEVEL_OPTIONS.map(lv => (
                    <button key={lv.id} onClick={() => setLevel(lv.id)}
                      style={{ padding:'12px', borderRadius:12, border:level===lv.id?`3px solid ${theme.primary}`:'2px solid #e2e8f0', backgroundColor:level===lv.id?`${theme.primary}12`:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span style={{ fontSize:20 }}>{lv.icon}</span>
                      <span style={{ fontWeight:600, fontSize:13, color:level===lv.id?theme.primary:'#1e293b' }}>{lv.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grado y materia */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={labelStyle}>Año / Grado <span style={{ fontWeight:400, color:'#94a3b8' }}>(opcional)</span></label>
                  <input type="text" value={grade} onChange={e => setGrade(e.target.value)}
                    placeholder="Ej: 3°, 5° año, 2do ciclo" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Materia *</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Ej: Matemática, Historia, Biología" style={inputStyle} />
                </div>
              </div>

              {/* Tema */}
              <div>
                <label style={labelStyle}>Tema de la secuencia *</label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="Ej: Fracciones, La Segunda Guerra Mundial, Fotosíntesis"
                  style={inputStyle} />
              </div>

              {/* Objetivo */}
              <div>
                <label style={labelStyle}>
                  Objetivo general <span style={{ fontWeight:400, color:'#94a3b8' }}>(opcional — mejora la precisión)</span>
                </label>
                <textarea value={objective} onChange={e => setObjective(e.target.value)}
                  rows={2} placeholder="Ej: Que los alumnos comprendan el concepto de fracción y puedan aplicarlo en situaciones cotidianas."
                  style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }} />
              </div>

              {/* Punto de partida */}
              <div>
                <label style={labelStyle}>Punto de partida</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {STARTING_POINTS.map(sp => (
                    <button key={sp.id} onClick={() => setStartingPoint(sp.id)}
                      style={{ padding:'12px 16px', borderRadius:12, border:startingPoint===sp.id?`3px solid ${theme.primary}`:'2px solid #e2e8f0', backgroundColor:startingPoint===sp.id?`${theme.primary}12`:'white', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14 }}>
                      <span style={{ fontSize:22, flexShrink:0 }}>{sp.icon}</span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:startingPoint===sp.id?theme.primary:'#1e293b' }}>{sp.label}</div>
                        <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{sp.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ══ STEP 2 ══ */}
          {step === 2 && (
            <>
              {/* Cantidad de clases */}
              <div>
                <label style={labelStyle}>Cantidad de clases</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[1,2,3,4,5,6].map(n => (
                    <button key={n} onClick={() => setClassCount(n)}
                      style={{ flex:1, padding:'12px', borderRadius:10, border:classCount===n?`3px solid ${theme.primary}`:'2px solid #e2e8f0', backgroundColor:classCount===n?`${theme.primary}12`:'white', cursor:'pointer', textAlign:'center', fontWeight:700, fontSize:16, color:classCount===n?theme.primary:'#1e293b' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duración */}
              <div>
                <label style={labelStyle}>Duración de cada clase</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {CLASS_DURATIONS.map(d => (
                    <button key={d.id} onClick={() => setClassDur(d.id)}
                      style={{ padding:'10px 16px', borderRadius:20, border:classDur===d.id?`2px solid ${theme.primary}`:'2px solid #e2e8f0', backgroundColor:classDur===d.id?`${theme.primary}12`:'white', cursor:'pointer', fontWeight:600, fontSize:13, color:classDur===d.id?theme.primary:'#475569' }}>
                      {d.label}
                    </button>
                  ))}
                </div>
                {classDur === 0 && (
                  <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:10 }}>
                    <input type="number" value={customDur} onChange={e => setCustomDur(Number(e.target.value))}
                      min={15} max={240} style={{ ...inputStyle, width:80 }} />
                    <span style={{ fontSize:13, color:'#64748b' }}>minutos</span>
                  </div>
                )}
              </div>

              {/* Secciones */}
              <div>
                <label style={labelStyle}>
                  ¿Qué incluir en cada clase?
                  <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:8 }}>(elegí las secciones)</span>
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                  {SECTIONS.map(sec => {
                    const sel = sections.includes(sec.id);
                    return (
                      <button key={sec.id} onClick={() => toggleSection(sec.id)}
                        style={{ padding:'12px 14px', borderRadius:10, border:sel?`2px solid ${theme.primary}`:'2px solid #e2e8f0', backgroundColor:sel?`${theme.primary}12`:'white', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:20, height:20, borderRadius:4, border:sel?'none':'2px solid #cbd5e1', backgroundColor:sel?theme.primary:'white', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, flexShrink:0 }}>
                          {sel && '✓'}
                        </div>
                        <span style={{ fontSize:13, color:sel?theme.primary:'#475569', fontWeight:sel?600:400 }}>
                          {sec.icon} {sec.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resumen */}
              <div style={{ padding:'14px 18px', backgroundColor:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0', fontSize:13, color:'#64748b', display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ fontWeight:700, color:'#1e293b', marginBottom:4 }}>Resumen:</div>
                <div>📚 {topic} — {subject}{grade ? `, ${grade}` : ''} · {levelLabel}</div>
                <div>📅 {classCount} clase{classCount!==1?'s':''} de {effectiveDur} min · {startingLabel}</div>
                <div>📋 {sections.length} sección{sections.length!==1?'es':''}: {SECTIONS.filter(s=>sections.includes(s.id)).map(s=>s.label).join(', ')}</div>
              </div>

              {!user && (
                <div style={{ padding:'12px 16px', backgroundColor:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', fontSize:13, color:'#1e40af' }}>
                  💡 Podés generar {FREEMIUM_LIMIT - getFreemiumUses()} secuencia{FREEMIUM_LIMIT - getFreemiumUses()!==1?'s':''} más sin iniciar sesión.
                </div>
              )}

              {error && (
                <div style={{ padding:'12px 14px', backgroundColor:'#fef2f2', borderRadius:8, fontSize:13, color:'#dc2626', border:'1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              {isGenerating && (
                <div style={{ padding:'14px 18px', backgroundColor:'#fffbeb', borderRadius:10, border:'1px solid #fbbf24', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:24 }}>⏳</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#92400e' }}>Generando secuencia con IA…</div>
                    <div style={{ fontSize:12, color:'#a16207', marginTop:2 }}>
                      Puede tardar hasta 30 segundos según la cantidad de clases.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 28px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={() => step > 1 ? setStep(1) : navigate('/')} style={btnSecondary}>
            ← {step > 1 ? 'Atrás' : 'Volver'}
          </button>
          {step === 1 ? (
            <button onClick={() => setStep(2)} disabled={!canGoStep2}
              style={{ ...btnPrimary, opacity:canGoStep2?1:0.5 }}>
              Continuar →
            </button>
          ) : (
            <button onClick={handleGenerate} disabled={!canGenerate || isGenerating}
              style={{ ...btnPrimary, opacity:(!canGenerate||isGenerating)?0.5:1, minWidth:200 }}>
              {isGenerating ? '⏳ Generando…' : '✨ Generar secuencia'}
            </button>
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