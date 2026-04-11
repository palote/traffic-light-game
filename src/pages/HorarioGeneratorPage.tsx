// src/pages/HorarioGeneratorPage.tsx
// ✅ Recreos insertados ENTRE módulos (no reemplazando módulos)
// ✅ Horarios se ajustan automáticamente al agregar/quitar recreos
// ✅ Edición manual de hora de inicio de cada slot
// ✅ Dropdowns + formato condicional por materia
// ✅ Freemium: 2 usos sin login

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'horario_uses';
const FREEMIUM_LIMIT = 2;

const DAYS_OPTIONS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const MODULE_DURATIONS = [
  { id: 40,  label: '40 min', desc: 'Secundaria CABA' },
  { id: 45,  label: '45 min', desc: 'Común'           },
  { id: 60,  label: '60 min', desc: '1 hora'          },
  { id: 80,  label: '80 min', desc: '2 módulos'       },
  { id: 0,   label: 'Personalizado', desc: ''          },
];

const SUBJECT_COLORS = [
  { argb: 'FF9DC3E6', hex: '#9DC3E6', label: 'Azul claro'    },
  { argb: 'FFA9D18E', hex: '#A9D18E', label: 'Verde claro'   },
  { argb: 'FFFFCC99', hex: '#FFCC99', label: 'Naranja claro' },
  { argb: 'FFFF9999', hex: '#FF9999', label: 'Rojo suave'    },
  { argb: 'FFE6B8D0', hex: '#E6B8D0', label: 'Rosa'          },
  { argb: 'FFFFE699', hex: '#FFE699', label: 'Amarillo'      },
  { argb: 'FFB4C6E7', hex: '#B4C6E7', label: 'Celeste'       },
  { argb: 'FFC5E0B4', hex: '#C5E0B4', label: 'Verde menta'   },
  { argb: 'FFD9D9D9', hex: '#D9D9D9', label: 'Gris claro'    },
  { argb: 'FFDAEEF3', hex: '#DAEEF3', label: 'Agua'          },
  { argb: 'FFEAD1DC', hex: '#EAD1DC', label: 'Lavanda'       },
  { argb: 'FFFCE4D6', hex: '#FCE4D6', label: 'Durazno'       },
];

const SUBJECT_SUGGESTIONS = {
  primary:   ['Lengua','Matemática','Ciencias Sociales','Ciencias Naturales','Educación Física','Música','Plástica','Inglés'],
  secondary: ['Matemática','Lengua y Literatura','Historia','Geografía','Biología','Física','Química','Inglés','Educación Física','Filosofía','Ciudadanía','Informática','Arte'],
};

// ─── Types ─────────────────────────────────────────────────────────────────────

// Un "item" en la lista puede ser un módulo o un recreo
type ItemType = 'module' | 'break';

interface ScheduleItem {
  id:         string;
  type:       ItemType;
  startTime:  string;   // editable manualmente
  endTime:    string;   // calculado o editable
  label?:     string;   // "Recreo", "Almuerzo", etc.
  durationMin: number;  // duración en minutos
  moduleNum?: number;   // número de módulo (solo para type=module)
  manualStart?: boolean; // si el usuario editó la hora manualmente
}

interface SubjectConfig {
  id:    string;
  name:  string;
  color: string;
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
function triggerDownload(base64: string, filename: string) {
  const bytes = atob(base64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function uid() { return Math.random().toString(36).slice(2, 8); }

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// Recalcula todos los endTime y startTime encadenados
// Respeta los manualStart — solo recalcula desde el primer cambio
function recalcTimes(items: ScheduleItem[]): ScheduleItem[] {
  const result = [...items];
  for (let i = 0; i < result.length; i++) {
    const item = { ...result[i] };
    // endTime siempre se calcula desde startTime + duration
    item.endTime = minutesToTime(timeToMinutes(item.startTime) + item.durationMin);
    result[i] = item;

    // Si el siguiente item no tiene manualStart, actualizar su startTime
    if (i + 1 < result.length && !result[i + 1].manualStart) {
      result[i + 1] = { ...result[i + 1], startTime: item.endTime };
    }
  }
  return result;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function HorarioGeneratorPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [step, setStep] = useState<1|2|3>(1);

  // Step 1
  const [scheduleName, setScheduleName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lunes','Martes','Miércoles','Jueves','Viernes']);
  const [levelHint,    setLevelHint]    = useState<'primary'|'secondary'>('secondary');

  // Step 2 — config base
  const [startTime,   setStartTime]   = useState('07:30');
  const [moduleDur,   setModuleDur]   = useState(40);
  const [customDur,   setCustomDur]   = useState(40);
  const [moduleCount, setModuleCount] = useState(8);

  // Step 2 — items construidos
  const [items,      setItems]      = useState<ScheduleItem[]>([]);
  const [builtOnce,  setBuiltOnce]  = useState(false);

  // Step 3 — materias
  const [subjects,        setSubjects]        = useState<SubjectConfig[]>([]);
  const [newSubjectName,  setNewSubjectName]  = useState('');

  // Generación
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [downloaded,    setDownloaded]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [showLoginWall, setShowLoginWall] = useState(false);

  const effectiveDur = moduleDur === 0 ? customDur : moduleDur;

  // ── Preview (sin estado) ──────────────────────────────────────────────────────

  const previewSlots = useMemo(() => {
    const result: { start: string; end: string }[] = [];
    let cur = startTime;
    for (let i = 0; i < Math.min(moduleCount, 12); i++) {
      const end = minutesToTime(timeToMinutes(cur) + effectiveDur);
      result.push({ start: cur, end });
      cur = end;
    }
    return result;
  }, [startTime, effectiveDur, moduleCount]);

  // ── Construir items desde cero ────────────────────────────────────────────────

  const buildItems = () => {
    const newItems: ScheduleItem[] = [];
    let cur = startTime;
    for (let i = 0; i < moduleCount; i++) {
      const end = minutesToTime(timeToMinutes(cur) + effectiveDur);
      newItems.push({
        id: uid(), type: 'module',
        startTime: cur, endTime: end,
        durationMin: effectiveDur,
        moduleNum: i + 1,
      });
      cur = end;
    }
    setItems(newItems);
    setBuiltOnce(true);
  };

  // ── Agregar recreo después del índice dado ─────────────────────────────────────

  const addBreak = (afterIndex: number) => {
    const prev = items[afterIndex];
    const breakDur = 15;
    const newBreak: ScheduleItem = {
      id: uid(), type: 'break',
      startTime: prev.endTime,
      endTime:   minutesToTime(timeToMinutes(prev.endTime) + breakDur),
      durationMin: breakDur,
      label: 'Recreo',
    };
    const newItems = [
      ...items.slice(0, afterIndex + 1),
      newBreak,
      ...items.slice(afterIndex + 1),
    ];
    setItems(recalcTimes(newItems));
  };

  const removeBreak = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(recalcTimes(newItems));
  };

  // ── Cambiar duración de un recreo ─────────────────────────────────────────────

  const updateBreakDuration = (id: string, mins: number) => {
    const newItems = items.map(it =>
      it.id === id ? { ...it, durationMin: Math.max(1, mins) } : it
    );
    setItems(recalcTimes(newItems));
  };

  const updateBreakLabel = (id: string, label: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, label } : it));
  };

  // ── Edición manual de hora de inicio ─────────────────────────────────────────

  const updateStartTime = (id: string, time: string) => {
    const newItems = items.map(it =>
      it.id === id ? { ...it, startTime: time, manualStart: true } : it
    );
    setItems(recalcTimes(newItems));
  };

  // ── Materias ──────────────────────────────────────────────────────────────────

  const nextColor = () => SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];

  const addSubject = (name: string) => {
    if (!name.trim() || subjects.find(s => s.name === name.trim()) || subjects.length >= 12) return;
    setSubjects(prev => [...prev, { id: uid(), name: name.trim(), color: nextColor().argb }]);
    setNewSubjectName('');
  };

  const removeSubject    = (id: string) => setSubjects(prev => prev.filter(s => s.id !== id));
  const updateSubjectColor = (id: string, argb: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, color: argb } : s));
  };

  // ── Validaciones ──────────────────────────────────────────────────────────────

  const canGoStep2  = scheduleName.trim() !== '' && selectedDays.length > 0;
  const canGoStep3  = builtOnce && items.filter(i => i.type === 'module').length > 0;
  const canGenerate = subjects.length > 0;

  // ── Generación ────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }
    setIsGenerating(true); setError(null); setDownloaded(false);

    // Convertir items al formato que espera la Firebase Function
    const slots = items.map(it => ({
      startTime:  it.startTime,
      endTime:    it.endTime,
      isBreak:    it.type === 'break',
      breakLabel: it.type === 'break' ? (it.label || 'Recreo') : undefined,
    }));

    try {
      const fn = httpsCallable(getFunctions(app), 'generateScheduleSheet');
      const result: any = await fn({
        scheduleName: scheduleName.trim(),
        days: selectedDays,
        slots,
        subjects: subjects.map(({ id: _, ...rest }) => rest),
      });
      triggerDownload(result.data.data, result.data.filename);
      if (!user) incrementFreemiumUses();
      setDownloaded(true);
    } catch (err: any) {
      setError(`Error al generar: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
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
              Generaste {FREEMIUM_LIMIT} horarios sin iniciar sesión.<br />
              Iniciá sesión para seguir <strong>sin límite</strong>.
            </p>
            <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, fontSize:15, padding:'14px 32px' }}>Continuar con Google</button>
            <br />
            <button onClick={() => navigate('/')} style={{ ...btnSecondary, marginTop:12 }}>← Volver</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: step === 2 ? 700 : 640 }}>

        {/* Header */}
        <div style={{ background:theme.primaryGradient, padding:'20px 28px', borderRadius:'20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', color:'white' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:28 }}>🗓️</span>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>Generador de Horarios</h1>
              <p style={{ margin:'4px 0 0', fontSize:13, opacity:0.9 }}>Con dropdowns y colores por materia</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display:'flex', padding:'16px 28px', gap:8, borderBottom:'1px solid #e2e8f0' }}>
          {[{ n:1, label:'Configuración' },{ n:2, label:'Franjas y recreos' },{ n:3, label:'Materias' }].map(s => {
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
        <div style={{ padding:'24px 28px', overflowY:'auto', maxHeight:'62vh', display:'flex', flexDirection:'column', gap:22 }}>

          {/* ══ STEP 1 ══ */}
          {step === 1 && (
            <>
              <div>
                <label style={labelStyle}>Nombre del horario *</label>
                <input type="text" value={scheduleName} onChange={e => setScheduleName(e.target.value)}
                  placeholder="Ej: 5° B — 2026  /  Mis clases — Turno mañana"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Días a incluir</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {DAYS_OPTIONS.map(d => {
                    const sel = selectedDays.includes(d);
                    return (
                      <button key={d} onClick={() => setSelectedDays(prev => sel ? prev.filter(x => x !== d) : [...prev, d])}
                        style={{ padding:'8px 14px', borderRadius:20, border:'none', backgroundColor:sel?theme.primary:'#f1f5f9', color:sel?'white':'#475569', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Nivel (para sugerencias de materias)</label>
                <div style={{ display:'flex', gap:10 }}>
                  {([{id:'secondary' as const,icon:'🎓',label:'Secundaria'},{id:'primary' as const,icon:'🎒',label:'Primaria'}]).map(lv => (
                    <button key={lv.id} onClick={() => setLevelHint(lv.id)}
                      style={{ flex:1, padding:'12px', borderRadius:12, border:levelHint===lv.id?`3px solid ${theme.primary}`:'2px solid #e2e8f0', backgroundColor:levelHint===lv.id?`${theme.primary}12`:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span style={{ fontSize:20 }}>{lv.icon}</span>
                      <span style={{ fontWeight:600, fontSize:13, color:levelHint===lv.id?theme.primary:'#1e293b' }}>{lv.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ══ STEP 2 ══ */}
          {step === 2 && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={labelStyle}>Hora de inicio</label>
                  <input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setBuiltOnce(false); }}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cantidad de módulos</label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => { setModuleCount(n); setBuiltOnce(false); }}
                        style={{ padding:'8px 12px', borderRadius:20, border:'none', backgroundColor:moduleCount===n?theme.primary:'#f1f5f9', color:moduleCount===n?'white':'#475569', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Duración de cada módulo</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                  {MODULE_DURATIONS.map(d => (
                    <button key={d.id} onClick={() => { setModuleDur(d.id); setBuiltOnce(false); }}
                      style={{ padding:'10px 8px', borderRadius:10, border:moduleDur===d.id?`3px solid ${theme.primary}`:'2px solid #e2e8f0', backgroundColor:moduleDur===d.id?`${theme.primary}12`:'white', cursor:'pointer', textAlign:'center' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:moduleDur===d.id?theme.primary:'#1e293b' }}>{d.label}</div>
                      {d.desc && <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{d.desc}</div>}
                    </button>
                  ))}
                </div>
                {moduleDur === 0 && (
                  <div style={{ marginTop:10 }}>
                    <label style={labelStyle}>Minutos por módulo</label>
                    <input type="number" value={customDur} onChange={e => { setCustomDur(Number(e.target.value)); setBuiltOnce(false); }}
                      min={5} max={180} style={{ ...inputStyle, width:100 }} />
                  </div>
                )}
              </div>

              {/* Preview */}
              {!builtOnce && (
                <div style={{ padding:'14px', backgroundColor:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:8 }}>
                    Vista previa ({moduleCount} módulos de {effectiveDur} min):
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {previewSlots.map((s, i) => (
                      <div key={i} style={{ display:'flex', gap:10, padding:'5px 10px', backgroundColor:'white', borderRadius:8, border:'1px solid #e2e8f0', fontSize:12, color:'#475569' }}>
                        <span style={{ fontFamily:'monospace', fontWeight:600, color:theme.primary, minWidth:110 }}>{s.start} - {s.end}</span>
                        <span>Módulo {i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón generar */}
              <button onClick={buildItems} style={{ ...btnPrimary, justifyContent:'center', background:theme.primaryGradient }}>
                {builtOnce ? '🔄 Regenerar (borra los recreos)' : '✨ Generar franjas horarias'}
              </button>

              {/* ── Editor de items con recreos ── */}
              {builtOnce && items.length > 0 && (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:4 }}>
                    Agregá recreos entre módulos:
                  </div>
                  <div style={{ fontSize:12, color:'#64748b', marginBottom:12 }}>
                    Podés editar la hora de inicio manualmente — los horarios siguientes se ajustan solos.
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {items.map((item, idx) => (
                      <div key={item.id}>
                        {/* ── Módulo ── */}
                        {item.type === 'module' && (
                          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', backgroundColor:'white' }}>
                            <span style={{ width:24, height:24, borderRadius:'50%', backgroundColor:theme.primary, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                              {item.moduleNum}
                            </span>
                            {/* Hora inicio editable */}
                            <input type="time" value={item.startTime}
                              onChange={e => updateStartTime(item.id, e.target.value)}
                              style={{ fontFamily:'monospace', fontSize:13, fontWeight:600, color:theme.primary, border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 6px', width:90, backgroundColor: item.manualStart ? '#fffbeb' : 'white' }}
                              title={item.manualStart ? 'Hora editada manualmente' : 'Hora calculada automáticamente'} />
                            <span style={{ fontSize:13, color:'#94a3b8' }}>→</span>
                            <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:600, color:'#1e293b' }}>{item.endTime}</span>
                            <span style={{ fontSize:12, color:'#64748b', marginLeft:4 }}>Módulo {item.moduleNum} ({item.durationMin} min)</span>
                            {item.manualStart && (
                              <span title="Hora editada manualmente" style={{ fontSize:10, color:'#f59e0b', marginLeft:'auto' }}>✏️ manual</span>
                            )}
                          </div>
                        )}

                        {/* ── Recreo ── */}
                        {item.type === 'break' && (
                          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:'2px solid #fbbf24', backgroundColor:'#fffbeb' }}>
                            <span style={{ fontSize:16 }}>☕</span>
                            {/* Hora inicio editable */}
                            <input type="time" value={item.startTime}
                              onChange={e => updateStartTime(item.id, e.target.value)}
                              style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, color:'#b45309', border:'1px solid #fde68a', borderRadius:6, padding:'3px 6px', width:80, backgroundColor:'white' }} />
                            <span style={{ fontSize:12, color:'#94a3b8' }}>→</span>
                            <span style={{ fontFamily:'monospace', fontSize:12, color:'#b45309' }}>{item.endTime}</span>
                            {/* Nombre editable */}
                            <input type="text" value={item.label || 'Recreo'} onChange={e => updateBreakLabel(item.id, e.target.value)}
                              style={{ ...inputStyle, flex:1, padding:'4px 8px', fontSize:12, minWidth:80 }} />
                            {/* Duración editable */}
                            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                              <input type="number" value={item.durationMin}
                                onChange={e => updateBreakDuration(item.id, Number(e.target.value))}
                                min={1} max={120}
                                style={{ width:52, padding:'4px 6px', fontSize:12, borderRadius:6, border:'1px solid #fde68a', textAlign:'center', fontWeight:600 }} />
                              <span style={{ fontSize:11, color:'#b45309' }}>min</span>
                            </div>
                            <button onClick={() => removeBreak(item.id)}
                              style={{ padding:'3px 8px', fontSize:12, fontWeight:700, borderRadius:6, border:'1px solid #fecaca', backgroundColor:'#fef2f2', color:'#dc2626', cursor:'pointer', flexShrink:0 }}>✕</button>
                          </div>
                        )}

                        {/* ── Botón + Recreo entre módulos ── */}
                        {item.type === 'module' && idx < items.length - 1 && items[idx + 1]?.type !== 'break' && (
                          <div style={{ display:'flex', justifyContent:'center', padding:'3px 0' }}>
                            <button onClick={() => addBreak(idx)}
                              style={{ padding:'3px 16px', borderRadius:20, border:`1px dashed ${theme.primary}`, backgroundColor:'white', color:theme.primary, fontSize:11, fontWeight:600, cursor:'pointer', opacity:0.7 }}>
                              + Recreo
                            </button>
                          </div>
                        )}

                        {/* Si ya hay un recreo, mostrar el botón solo si el siguiente también es módulo */}
                        {item.type === 'break' && idx < items.length - 1 && items[idx + 1]?.type === 'module' && (
                          <div style={{ display:'flex', justifyContent:'center', padding:'2px 0' }}>
                            <span style={{ fontSize:10, color:'#94a3b8' }}>↓</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:12, padding:'10px 14px', backgroundColor:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', fontSize:12, color:'#1e40af' }}>
                    💡 Los horarios en <strong>amarillo</strong> fueron editados manualmente. Los demás se calculan automáticamente.
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ STEP 3 ══ */}
          {step === 3 && (
            <>
              <div>
                <label style={labelStyle}>Sugerencias rápidas</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {SUBJECT_SUGGESTIONS[levelHint]
                    .filter(s => !subjects.find(x => x.name === s))
                    .map(s => (
                      <button key={s} onClick={() => addSubject(s)}
                        style={{ padding:'6px 12px', borderRadius:20, border:`1px solid ${theme.primary}`, backgroundColor:'white', color:theme.primary, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        + {s}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Agregar materia propia <span style={{ fontWeight:400, color:'#94a3b8' }}>(hasta 12)</span>
                </label>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubject(newSubjectName)}
                    placeholder="Nombre de la materia" style={{ ...inputStyle, flex:1 }} />
                  <button onClick={() => addSubject(newSubjectName)} disabled={!newSubjectName.trim() || subjects.length >= 12}
                    style={{ padding:'10px 18px', borderRadius:10, border:'none', backgroundColor:theme.primary, color:'white', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                    + Agregar
                  </button>
                </div>
              </div>

              {subjects.length > 0 && (
                <div>
                  <label style={labelStyle}>Materias configuradas ({subjects.length}/12)</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {subjects.map(subj => (
                      <div key={subj.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', backgroundColor:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
                        <div style={{ width:28, height:28, borderRadius:6, backgroundColor:`#${subj.color.slice(2)}`, border:'2px solid white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', flexShrink:0 }} />
                        <span style={{ flex:1, fontSize:14, fontWeight:600, color:'#1e293b' }}>{subj.name}</span>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {SUBJECT_COLORS.slice(0,8).map(c => (
                            <button key={c.argb} onClick={() => updateSubjectColor(subj.id, c.argb)}
                              title={c.label}
                              style={{ width:18, height:18, borderRadius:'50%', backgroundColor:c.hex, border:subj.color===c.argb?'3px solid #1e293b':'2px solid white', cursor:'pointer', boxShadow:'0 1px 2px rgba(0,0,0,0.2)', padding:0 }} />
                          ))}
                        </div>
                        <button onClick={() => removeSubject(subj.id)}
                          style={{ padding:'3px 8px', fontSize:12, fontWeight:700, borderRadius:6, border:'1px solid #fecaca', backgroundColor:'#fef2f2', color:'#dc2626', cursor:'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen */}
              {subjects.length > 0 && (
                <div style={{ padding:'14px 18px', backgroundColor:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0', fontSize:13, color:'#64748b', display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ fontWeight:700, color:'#1e293b', marginBottom:4 }}>Resumen del horario:</div>
                  <div>🗓️ {scheduleName} — {selectedDays.join(', ')}</div>
                  <div>⏰ {items.filter(i => i.type === 'module').length} módulos · {items.filter(i => i.type === 'break').length} recreo{items.filter(i => i.type === 'break').length !== 1 ? 's' : ''}</div>
                  <div>📚 {subjects.length} materia{subjects.length !== 1 ? 's' : ''}: {subjects.map(s => s.name).join(', ')}</div>
                </div>
              )}

              {!user && (
                <div style={{ padding:'12px 16px', backgroundColor:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', fontSize:13, color:'#1e40af' }}>
                  💡 Podés generar {FREEMIUM_LIMIT - getFreemiumUses()} horario{FREEMIUM_LIMIT - getFreemiumUses() !== 1 ? 's' : ''} más sin iniciar sesión.
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
                    <div style={{ fontSize:14, fontWeight:700, color:'#92400e' }}>Generando horario…</div>
                    <div style={{ fontSize:12, color:'#a16207', marginTop:2 }}>Unos segundos.</div>
                  </div>
                </div>
              )}

              {downloaded && (
                <div style={{ padding:'14px 18px', backgroundColor:'#f0fdf4', borderRadius:10, border:'2px solid #86efac', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:24 }}>✅</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#166534' }}>¡Horario descargado!</div>
                    <div style={{ fontSize:12, color:'#16a34a', marginTop:2 }}>
                      Abrilo en Excel o Google Sheets. Cada celda tiene dropdown con tus materias y colores automáticos.
                    </div>
                  </div>
                </div>
              )}

              {downloaded && (
                <div style={{ padding:'18px 22px', backgroundColor:'#f0fdf4', borderRadius:14, border:'2px solid #86efac' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#166534', marginBottom:6 }}>
                        🚦 ¿Querés generar una dinámica áulica con un juego para que los alumnos aprendan este tema?
                      </div>
                      <p style={{ margin:0, fontSize:13, color:'#1e40af', lineHeight:1.5 }}>
                        Creá una actividad con el Juego del Semáforo para que tus alumnos trabajen y debatan el contenido antes de la evaluación.
                      </p>
                    </div>
                    <button onClick={() => navigate('/setup')}
                      style={{ padding:'10px 18px', fontSize:13, fontWeight:700, borderRadius:10, border:'none', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color:'white', cursor:'pointer', flexShrink:0 }}>
                      Crear juego →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 28px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={() => step > 1 ? setStep((step-1) as 1|2|3) : navigate('/')} style={btnSecondary}>
            ← {step > 1 ? 'Atrás' : 'Volver'}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep((step+1) as 1|2|3)}
              disabled={(step===1 && !canGoStep2) || (step===2 && !canGoStep3)}
              style={{ ...btnPrimary, opacity:((step===1 && !canGoStep2)||(step===2 && !canGoStep3)) ? 0.5 : 1 }}>
              Continuar →
            </button>
          ) : (
            <button onClick={handleGenerate} disabled={!canGenerate || isGenerating}
              style={{ ...btnPrimary, opacity:(!canGenerate || isGenerating) ? 0.5 : 1, minWidth:220 }}>
              {isGenerating ? '⏳ Generando…' : '📥 Descargar horario Excel'}
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
  backgroundColor:'white', borderRadius:20, width:'100%', maxWidth:640,
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