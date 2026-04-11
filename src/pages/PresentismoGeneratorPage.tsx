// src/pages/PresentismoGeneratorPage.tsx
// ✅ Generador de planilla de presentismo
// ✅ Dropdowns + formato condicional en Excel
// ✅ Feriados nacionales argentinos
// ✅ Freemium: 2 usos sin login

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'presentismo_uses';
const FREEMIUM_LIMIT = 2;

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const PRESENT_COLORS = [
  { label: 'Verde claro',  argb: 'FF92D050', hex: '#92D050' },
  { label: 'Verde oscuro', argb: 'FF00B050', hex: '#00B050' },
  { label: 'Azul celeste', argb: 'FF00B0F0', hex: '#00B0F0' },
];
const ABSENT_COLORS = [
  { label: 'Rojo',    argb: 'FFFF0000', hex: '#FF0000' },
  { label: 'Naranja', argb: 'FFFF7043', hex: '#FF7043' },
  { label: 'Rosa',    argb: 'FFFF91C1', hex: '#FF91C1' },
];
const HALF_COLORS = [
  { label: 'Amarillo',      argb: 'FFFFFF00', hex: '#FFFF00' },
  { label: 'Naranja claro', argb: 'FFFFC000', hex: '#FFC000' },
  { label: 'Celeste',       argb: 'FF00BFFF', hex: '#00BFFF' },
];

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
  const blob = new Blob([arr], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PresentismoGeneratorPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [step, setStep] = useState<1|2>(1);

  // ── Step 1: configuración básica ──
  const [sheetName,        setSheetName]        = useState('');
  const [month,            setMonth]            = useState(new Date().getMonth() + 1);
  const [year,             setYear]             = useState(new Date().getFullYear());
  const [studentCount,     setStudentCount]     = useState(30);
  const [excludeWeekends,  setExcludeWeekends]  = useState(true);
  const [markHolidays,     setMarkHolidays]     = useState(true);

  // ── Step 2: símbolos, colores, extras ──
  const [presentSymbol,      setPresentSymbol]      = useState('P');
  const [absentSymbol,       setAbsentSymbol]        = useState('A');
  const [halfPresentEnabled, setHalfPresentEnabled] = useState(false);
  const [halfPresentSymbol,  setHalfPresentSymbol]  = useState('MP');
  const [presentColor,       setPresentColor]        = useState(PRESENT_COLORS[0]);
  const [absentColor,        setAbsentColor]         = useState(ABSENT_COLORS[0]);
  const [halfColor,          setHalfColor]           = useState(HALF_COLORS[0]);
  const [showTotals,         setShowTotals]          = useState(true);
  const [showPercentage,     setShowPercentage]      = useState(true);
  const [showObservations,   setShowObservations]    = useState(false);

  // Generación
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [downloaded,    setDownloaded]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [showLoginWall, setShowLoginWall] = useState(false);

  const canGoStep2 = sheetName.trim() !== '';

  const handleGenerate = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }

    setIsGenerating(true);
    setError(null);
    setDownloaded(false);

    try {
      const fn = httpsCallable(getFunctions(app), 'generateAttendanceSheet');
      const result: any = await fn({
        sheetName: sheetName.trim(),
        month, year, studentCount,
        excludeWeekends, markHolidays,
        presentSymbol, absentSymbol,
        halfPresentEnabled, halfPresentSymbol,
        presentColor: presentColor.argb,
        absentColor:  absentColor.argb,
        halfPresentColor: halfColor.argb,
        showTotals, showPercentage, showObservations,
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
          <div style={{ textAlign: 'center', padding: '40px 28px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
              Límite de uso gratuito
            </h2>
            <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
              Generaste {FREEMIUM_LIMIT} planillas sin iniciar sesión.<br />
              Iniciá sesión para seguir generando <strong>sin límite</strong>.
            </p>
            <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, fontSize: 15, padding: '14px 32px' }}>
              Continuar con Google
            </button>
            <br />
            <button onClick={() => navigate('/')} style={{ ...btnSecondary, marginTop: 12 }}>← Volver</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ background: theme.primaryGradient, padding: '20px 28px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Planilla de Presentismo</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                Con dropdowns y formato condicional automático
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', padding: '16px 28px', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
          {[
            { n: 1, label: 'Configuración básica' },
            { n: 2, label: 'Símbolos y extras' },
          ].map(s => {
            const isActive = step === s.n;
            const isPast   = s.n < step;
            return (
              <div key={s.n} onClick={() => isPast && setStep(s.n as 1|2)}
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
              <div>
                <label style={labelStyle}>Nombre de la planilla *</label>
                <input type="text" value={sheetName} onChange={e => setSheetName(e.target.value)}
                  placeholder="Ej: 3° B — Matemática, 5° A — Historia…"
                  style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mes</label>
                  <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Año</label>
                  <select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>
                    {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Número de alumnos</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[15, 20, 25, 30, 35, 40].map(n => (
                    <button key={n} onClick={() => setStudentCount(n)}
                      style={{ padding: '8px 16px', borderRadius: 20, border: 'none', backgroundColor: studentCount === n ? theme.primary : '#f1f5f9', color: studentCount === n ? 'white' : '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {n}
                    </button>
                  ))}
                  <input type="number" value={studentCount} onChange={e => setStudentCount(Number(e.target.value))}
                    min={1} max={60}
                    style={{ ...inputStyle, width: 80, textAlign: 'center' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Toggle label="Excluir fines de semana" value={excludeWeekends} onChange={setExcludeWeekends} color={theme.primary} />
                <Toggle label="Marcar feriados nacionales (Argentina)" value={markHolidays} onChange={setMarkHolidays} color={theme.primary} />
              </div>
            </>
          )}

          {/* ══ STEP 2 ══ */}
          {step === 2 && (
            <>
              {/* Símbolos */}
              <div>
                <label style={labelStyle}>Símbolos del dropdown</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <SymbolRow label="Presente" value={presentSymbol} onChange={setPresentSymbol}
                    colors={PRESENT_COLORS} selectedColor={presentColor} onColorChange={setPresentColor} />
                  <SymbolRow label="Ausente" value={absentSymbol} onChange={setAbsentSymbol}
                    colors={ABSENT_COLORS} selectedColor={absentColor} onColorChange={setAbsentColor} />

                  {/* Toggle medio presente */}
                  <div style={{ padding: '12px 16px', borderRadius: 12, border: halfPresentEnabled ? `2px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: halfPresentEnabled ? `${theme.primary}08` : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: halfPresentEnabled ? 12 : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Medio presente (opcional)</span>
                      <button onClick={() => setHalfPresentEnabled(!halfPresentEnabled)}
                        style={{ padding: '4px 12px', borderRadius: 20, border: 'none', backgroundColor: halfPresentEnabled ? theme.primary : '#e2e8f0', color: halfPresentEnabled ? 'white' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {halfPresentEnabled ? 'Activado' : 'Activar'}
                      </button>
                    </div>
                    {halfPresentEnabled && (
                      <SymbolRow label="Medio presente" value={halfPresentSymbol} onChange={setHalfPresentSymbol}
                        colors={HALF_COLORS} selectedColor={halfColor} onColorChange={setHalfColor} />
                    )}
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div>
                <label style={labelStyle}>Columnas adicionales</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Toggle label="Total de faltas por alumno" value={showTotals} onChange={setShowTotals} color={theme.primary} />
                  <Toggle label="Porcentaje de asistencia" value={showPercentage} onChange={setShowPercentage} color={theme.primary}
                    disabled={!showTotals} disabledNote="Requiere activar total de faltas" />
                  <Toggle label="Columna de observaciones" value={showObservations} onChange={setShowObservations} color={theme.primary} />
                </div>
              </div>

              {/* Preview resumen */}
              <div style={{ padding: '16px 18px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Resumen de la planilla:</div>
                <div>📋 {sheetName} — {MONTHS[month-1]} {year}</div>
                <div>👥 {studentCount} alumnos · {excludeWeekends ? 'Sin fines de semana' : 'Con fines de semana'}</div>
                <div>
                  <span style={{ background: presentColor.hex, color: 'white', padding: '2px 8px', borderRadius: 4, marginRight: 6, fontSize: 11, fontWeight: 700 }}>{presentSymbol}</span>
                  <span style={{ background: absentColor.hex, color: 'white', padding: '2px 8px', borderRadius: 4, marginRight: 6, fontSize: 11, fontWeight: 700 }}>{absentSymbol}</span>
                  {halfPresentEnabled && <span style={{ background: halfColor.hex, color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{halfPresentSymbol}</span>}
                </div>
                <div>{[showTotals && 'Total faltas', showPercentage && '% asistencia', showObservations && 'Observaciones', markHolidays && 'Feriados marcados'].filter(Boolean).join(' · ')}</div>
              </div>

              {/* Aviso freemium */}
              {!user && (
                <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                  💡 Podés generar {FREEMIUM_LIMIT - getFreemiumUses()} planilla{FREEMIUM_LIMIT - getFreemiumUses() !== 1 ? 's' : ''} más sin iniciar sesión.
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Generando planilla…</div>
                    <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>Unos segundos. No cierres esta ventana.</div>
                  </div>
                </div>
              )}

              {downloaded && (
                <div style={{ padding: '14px 18px', backgroundColor: '#f0fdf4', borderRadius: 10, border: '2px solid #86efac', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>¡Planilla descargada!</div>
                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                      Abrila en Excel o Google Sheets. Los dropdowns y colores ya están configurados.
                    </div>
                  </div>
                </div>
              )}

              {/* Bloque conversión */}
              {downloaded && (
                <div style={{ padding: '18px 22px', backgroundColor: '#f0fdf4', borderRadius: 14, border: '2px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                        🚦 ¿Querés generar una dinámica áulica para consolidar el aprendizaje de tu clase?
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                        El Juego del Semáforo — dinámicas grupales para primaria y secundaria, gratuito.
                      </p>
                    </div>
                    <button onClick={() => navigate('/setup')}
                      style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', cursor: 'pointer', flexShrink: 0 }}>
                      Conocer el juego →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => step > 1 ? setStep(1) : navigate('/')} style={btnSecondary}>
            ← {step > 1 ? 'Atrás' : 'Volver'}
          </button>
          {step === 1 ? (
            <button onClick={() => setStep(2)} disabled={!canGoStep2}
              style={{ ...btnPrimary, opacity: canGoStep2 ? 1 : 0.5 }}>
              Continuar →
            </button>
          ) : (
            <button onClick={handleGenerate} disabled={isGenerating}
              style={{ ...btnPrimary, opacity: isGenerating ? 0.5 : 1, minWidth: 200 }}>
              {isGenerating ? '⏳ Generando…' : '📥 Descargar planilla Excel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function Toggle({ label, value, onChange, color, disabled = false, disabledNote }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
  color: string; disabled?: boolean; disabledNote?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', backgroundColor: disabled ? '#f8fafc' : 'white', opacity: disabled ? 0.5 : 1 }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</span>
        {disabled && disabledNote && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{disabledNote}</div>}
      </div>
      <button onClick={() => !disabled && onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', backgroundColor: value && !disabled ? color : '#e2e8f0', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

function SymbolRow({ label, value, onChange, colors, selectedColor, onColorChange }: {
  label: string; value: string; onChange: (v: string) => void;
  colors: typeof PRESENT_COLORS; selectedColor: typeof PRESENT_COLORS[number];
  onColorChange: (c: any) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', minWidth: 90 }}>{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value.toUpperCase().slice(0, 3))}
        style={{ ...inputStyle, width: 56, textAlign: 'center', fontWeight: 700, fontSize: 14, padding: '6px 8px', backgroundColor: selectedColor.hex, color: 'white', border: 'none' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {colors.map(c => (
          <button key={c.argb} onClick={() => onColorChange(c)}
            title={c.label}
            style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: c.hex, border: selectedColor.argb === c.argb ? '3px solid #1e293b' : '2px solid white', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>{selectedColor.label}</span>
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
  backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 640,
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