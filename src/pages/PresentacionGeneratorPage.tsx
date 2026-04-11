// src/pages/PresentacionGeneratorPage.tsx
// ✅ Generador de presentaciones PowerPoint
// ✅ 6 tipos de diapositiva: portada, texto, texto+imagen, 2 columnas, cita, cierre
// ✅ 6 paletas de colores + 3 fuentes
// ✅ Freemium: 2 usos sin login

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n, LanguageSelector } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';

// ─── Constantes ────────────────────────────────────────────────────────────────

const FREEMIUM_KEY   = 'presentacion_uses';
const FREEMIUM_LIMIT = 2;

const PALETTES = [
  { id: 'midnight',   name: 'Midnight Azul',     primary: '#1E2761', secondary: '#CADCFC', preview: ['#1E2761','#CADCFC','#4A90D9'] },
  { id: 'forest',     name: 'Verde Bosque',       primary: '#2C5F2D', secondary: '#97BC62', preview: ['#2C5F2D','#97BC62','#4A7C59'] },
  { id: 'coral',      name: 'Coral Energía',      primary: '#F96167', secondary: '#2F3C7E', preview: ['#F96167','#2F3C7E','#F9E795'] },
  { id: 'terracotta', name: 'Terracota Cálido',   primary: '#B85042', secondary: '#A7BEAE', preview: ['#B85042','#A7BEAE','#E7E8D1'] },
  { id: 'ocean',      name: 'Océano Profundo',    primary: '#065A82', secondary: '#1C7293', preview: ['#065A82','#1C7293','#00B4D8'] },
  { id: 'charcoal',   name: 'Carbón Moderno',     primary: '#36454F', secondary: '#78909C', preview: ['#36454F','#78909C','#0D9488'] },
] as const;

const FONTS = [
  { id: 'modern',  name: 'Moderno',  sample: 'Calibri / Calibri Light' },
  { id: 'classic', name: 'Clásico', sample: 'Georgia / Calibri' },
  { id: 'bold',    name: 'Impactante', sample: 'Arial Black / Arial' },
] as const;

const SLIDE_TYPES = [
  { id: 'cover',       icon: '🎯', label: 'Portada',         desc: 'Título + subtítulo',              fields: ['title','subtitle'] },
  { id: 'text',        icon: '📝', label: 'Solo texto',      desc: 'Título + puntos/párrafo',         fields: ['title','body'] },
  { id: 'text_image',  icon: '🖼️', label: 'Texto + imagen',  desc: 'Título + texto + placeholder',    fields: ['title','body','imageNote'] },
  { id: 'two_columns', icon: '⬜⬜', label: 'Dos columnas',   desc: 'Título + columna izquierda + derecha', fields: ['title','bodyLeft','bodyRight'] },
  { id: 'quote',       icon: '💬', label: 'Cita destacada',  desc: 'Frase grande + autor',            fields: ['quote','author'] },
  { id: 'closing',     icon: '✅', label: 'Cierre',          desc: 'Título + puntos clave (hasta 4)', fields: ['title','body'] },
] as const;

type SlideTypeId = typeof SLIDE_TYPES[number]['id'];
type PaletteId   = typeof PALETTES[number]['id'];
type FontId      = typeof FONTS[number]['id'];

interface SlideConfig {
  id: string;
  type: SlideTypeId;
  title?: string;
  subtitle?: string;
  body?: string;
  bodyLeft?: string;
  bodyRight?: string;
  quote?: string;
  author?: string;
  imageNote?: string;
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
  const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function uid() { return Math.random().toString(36).slice(2, 8); }

// ─── Sub-componente: editor de una diapositiva ────────────────────────────────

function SlideEditor({
  slide, index, total, onChange, onDelete, onMoveUp, onMoveDown, primaryColor,
}: {
  slide: SlideConfig; index: number; total: number;
  onChange: (s: SlideConfig) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  primaryColor: string;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const typeDef = SLIDE_TYPES.find(t => t.id === slide.type)!;

  return (
    <div style={{ borderRadius: 12, border: `2px solid ${expanded ? primaryColor : '#e2e8f0'}`, overflow: 'hidden', backgroundColor: 'white' }}>
      {/* Header colapsable */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10, cursor: 'pointer', backgroundColor: expanded ? `${primaryColor}08` : 'white' }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: primaryColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{index + 1}</span>
        <span style={{ fontSize: 16 }}>{typeDef.icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
          {typeDef.label}
          {slide.title && <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>— {slide.title.slice(0, 35)}{slide.title.length > 35 ? '…' : ''}</span>}
          {slide.quote && <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>— {slide.quote.slice(0, 35)}{slide.quote.length > 35 ? '…' : ''}</span>}
        </span>
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={index === 0}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: 12, cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: 12, cursor: index === total - 1 ? 'not-allowed' : 'pointer', opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
          <button onClick={onDelete}
            style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '16px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Selector de tipo */}
          <div>
            <label style={labelStyle}>Tipo de diapositiva</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {SLIDE_TYPES.map(t => (
                <button key={t.id} onClick={() => onChange({ ...slide, type: t.id as SlideTypeId })}
                  style={{ padding: '8px 6px', borderRadius: 8, border: slide.type === t.id ? `2px solid ${primaryColor}` : '2px solid #e2e8f0', backgroundColor: slide.type === t.id ? `${primaryColor}12` : 'white', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 16 }}>{t.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: slide.type === t.id ? primaryColor : '#475569', marginTop: 2 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Campos según tipo */}
          {['cover','text','text_image','two_columns','closing'].includes(slide.type) && (
            <div>
              <label style={labelStyle}>Título</label>
              <input type="text" value={slide.title || ''} onChange={e => onChange({ ...slide, title: e.target.value })}
                placeholder="Título de la diapositiva" style={inputStyle} />
            </div>
          )}
          {slide.type === 'cover' && (
            <div>
              <label style={labelStyle}>Subtítulo <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
              <input type="text" value={slide.subtitle || ''} onChange={e => onChange({ ...slide, subtitle: e.target.value })}
                placeholder="Ej: 3° B — Ciencias Sociales — 2026" style={inputStyle} />
            </div>
          )}
          {['text','text_image','closing'].includes(slide.type) && (
            <div>
              <label style={labelStyle}>
                {slide.type === 'closing' ? 'Puntos clave (uno por línea, máximo 4)' : 'Contenido (uno por línea = un bullet)'}
              </label>
              <textarea value={slide.body || ''} onChange={e => onChange({ ...slide, body: e.target.value })}
                rows={4} placeholder={slide.type === 'closing'
                  ? 'La comprensión grupal mejora el aprendizaje\nLa evaluación formativa orienta el proceso\n...'
                  : 'Primer punto importante\nSegundo punto\nTercer punto'}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>
          )}
          {slide.type === 'text_image' && (
            <div>
              <label style={labelStyle}>Etiqueta del espacio para imagen <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
              <input type="text" value={slide.imageNote || ''} onChange={e => onChange({ ...slide, imageNote: e.target.value })}
                placeholder="Ej: [ Mapa de América del Sur ]" style={inputStyle} />
            </div>
          )}
          {slide.type === 'two_columns' && (
            <>
              <div>
                <label style={labelStyle}>Columna izquierda (uno por línea)</label>
                <textarea value={slide.bodyLeft || ''} onChange={e => onChange({ ...slide, bodyLeft: e.target.value })}
                  rows={3} placeholder="Ventajas\nFácil de implementar\nGratuito"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </div>
              <div>
                <label style={labelStyle}>Columna derecha (uno por línea)</label>
                <textarea value={slide.bodyRight || ''} onChange={e => onChange({ ...slide, bodyRight: e.target.value })}
                  rows={3} placeholder="Desventajas\nRequiere preparación\nDepende del grupo"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </div>
            </>
          )}
          {slide.type === 'quote' && (
            <>
              <div>
                <label style={labelStyle}>Cita o frase destacada</label>
                <textarea value={slide.quote || ''} onChange={e => onChange({ ...slide, quote: e.target.value })}
                  rows={3} placeholder="La educación es el arma más poderosa que podés usar para cambiar el mundo."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={labelStyle}>Autor <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
                <input type="text" value={slide.author || ''} onChange={e => onChange({ ...slide, author: e.target.value })}
                  placeholder="Nelson Mandela" style={inputStyle} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function PresentacionGeneratorPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle } = useAuth();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [step, setStep] = useState<1|2>(1);

  // Configuración general
  const [presTitle, setPresTitle] = useState('');
  const [subject,   setSubject]   = useState('');
  const [grade,     setGrade]     = useState('');
  const [paletteId, setPaletteId] = useState<PaletteId>('midnight');
  const [fontId,    setFontId]    = useState<FontId>('modern');

  // Diapositivas
  const [slides, setSlides] = useState<SlideConfig[]>([
    { id: uid(), type: 'cover',   title: '', subtitle: '' },
    { id: uid(), type: 'text',    title: '', body: '' },
    { id: uid(), type: 'closing', title: 'Conclusiones', body: '' },
  ]);

  // Generación
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [downloaded,    setDownloaded]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [showLoginWall, setShowLoginWall] = useState(false);

  const selectedPalette = PALETTES.find(p => p.id === paletteId)!;
  const canGoStep2 = presTitle.trim() !== '';
  const canGenerate = slides.length > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const addSlide = (type: SlideTypeId = 'text') => {
    setSlides(prev => [...prev, { id: uid(), type, title: '', body: '' }]);
  };

  const updateSlide = (id: string, updated: SlideConfig) => {
    setSlides(prev => prev.map(s => s.id === id ? updated : s));
  };

  const deleteSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  const moveSlide = (index: number, dir: -1 | 1) => {
    const newSlides = [...slides];
    const target = index + dir;
    if (target < 0 || target >= newSlides.length) return;
    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    setSlides(newSlides);
  };

  const handleLoginAndContinue = async () => {
    try { await loginWithGoogle(); setShowLoginWall(false); }
    catch (e) { console.error(e); }
  };

  const handleGenerate = async () => {
    if (!user && getFreemiumUses() >= FREEMIUM_LIMIT) { setShowLoginWall(true); return; }

    setIsGenerating(true);
    setError(null);
    setDownloaded(false);

    try {
      const fn = httpsCallable(getFunctions(app), 'generatePresentation');
      const result: any = await fn({
        presentationTitle: presTitle.trim(),
        subject: subject.trim(),
        grade: grade.trim(),
        paletteId, fontId,
        slides: slides.map(({ id: _, ...rest }) => rest),
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

  // ─── Freemium wall ────────────────────────────────────────────────────────────

  if (showLoginWall) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 28px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Límite de uso gratuito</h2>
            <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
              Generaste {FREEMIUM_LIMIT} presentaciones sin iniciar sesión.<br />
              Iniciá sesión para seguir <strong>sin límite</strong>.
            </p>
            <button onClick={handleLoginAndContinue} style={{ ...btnPrimary, fontSize: 15, padding: '14px 32px' }}>Continuar con Google</button>
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
      <div style={{ ...cardStyle, maxWidth: step === 2 ? 720 : 640 }}>

        {/* Header */}
        <div style={{ background: theme.primaryGradient, padding: '20px 28px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Generador de Presentaciones</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>Presentaciones PowerPoint listas para usar</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LanguageSelector compact />
            <button onClick={() => navigate('/')} style={closeBtnStyle}>✕</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', padding: '16px 28px', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
          {[{ n: 1, label: 'Estilo y configuración' }, { n: 2, label: 'Diapositivas' }].map(s => {
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
        <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: '62vh', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ══ STEP 1 ══ */}
          {step === 1 && (
            <>
              <div>
                <label style={labelStyle}>Título de la presentación *</label>
                <input type="text" value={presTitle} onChange={e => setPresTitle(e.target.value)}
                  placeholder="Ej: La Revolución de Mayo — Causas y consecuencias"
                  style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Materia <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Ej: Historia" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Año/Grado <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
                  <input type="text" value={grade} onChange={e => setGrade(e.target.value)}
                    placeholder="Ej: 3° B Secundaria" style={inputStyle} />
                </div>
              </div>

              {/* Paleta de colores */}
              <div>
                <label style={labelStyle}>Paleta de colores</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {PALETTES.map(p => (
                    <button key={p.id} onClick={() => setPaletteId(p.id)}
                      style={{ padding: '12px 10px', borderRadius: 12, border: paletteId === p.id ? `3px solid ${p.primary}` : '2px solid #e2e8f0', backgroundColor: paletteId === p.id ? `${p.primary}12` : 'white', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
                        {p.preview.map((c, i) => (
                          <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: paletteId === p.id ? p.primary : '#475569' }}>{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuente */}
              <div>
                <label style={labelStyle}>Fuente tipográfica</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {FONTS.map(f => (
                    <button key={f.id} onClick={() => setFontId(f.id)}
                      style={{ flex: 1, padding: '12px 10px', borderRadius: 12, border: fontId === f.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: fontId === f.id ? `${theme.primary}12` : 'white', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: fontId === f.id ? theme.primary : '#1e293b', marginBottom: 3 }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{f.sample}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview de la paleta */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: `linear-gradient(135deg, ${selectedPalette.primary} 0%, ${selectedPalette.preview[1]} 100%)`, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{presTitle || 'Título de la presentación'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{subject || 'Materia'} {grade ? `— ${grade}` : ''}</div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
                  {selectedPalette.name}
                </div>
              </div>
            </>
          )}

          {/* ══ STEP 2: Diapositivas ══ */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {slides.length} diapositiva{slides.length !== 1 ? 's' : ''} configurada{slides.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SLIDE_TYPES.map(t => (
                    <button key={t.id} onClick={() => addSlide(t.id)}
                      title={`Agregar: ${t.label}`}
                      style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${selectedPalette.primary}`, backgroundColor: 'white', color: selectedPalette.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {t.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {slides.map((slide, i) => (
                  <SlideEditor
                    key={slide.id}
                    slide={slide}
                    index={i}
                    total={slides.length}
                    onChange={updated => updateSlide(slide.id, updated)}
                    onDelete={() => deleteSlide(slide.id)}
                    onMoveUp={() => moveSlide(i, -1)}
                    onMoveDown={() => moveSlide(i, 1)}
                    primaryColor={selectedPalette.primary}
                  />
                ))}
              </div>

              <button onClick={() => addSlide('text')}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                + Agregar diapositiva
              </button>

              {/* Aviso de tipos */}
              <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>
                💡 Los botones de tipos arriba agregan diapositivas rápido. Las imágenes se insertan como marcadores de posición — los reemplazás en PowerPoint.
              </div>

              {!user && (
                <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                  💡 Podés generar {FREEMIUM_LIMIT - getFreemiumUses()} presentación{FREEMIUM_LIMIT - getFreemiumUses() !== 1 ? 'es' : ''} más sin iniciar sesión.
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Generando presentación…</div>
                    <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>Puede tardar unos segundos según la cantidad de diapositivas.</div>
                  </div>
                </div>
              )}

              {downloaded && (
                <div style={{ padding: '14px 18px', backgroundColor: '#f0fdf4', borderRadius: 10, border: '2px solid #86efac', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>¡Presentación descargada!</div>
                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                      Abrila en PowerPoint o Google Slides. Los placeholders de imagen los reemplazás con tus fotos.
                    </div>
                  </div>
                </div>
              )}

              {downloaded && (
                <div style={{ padding: '18px 22px', backgroundColor: '#f0fdf4', borderRadius: 14, border: '2px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                        🚦 ¿Querés generar una dinámica áulica con un juego para que los alumnos aprendan este tema?
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                        Creá una actividad con el Juego del Semáforo para que tus alumnos trabajen y debatan el contenido antes de la evaluación.
                      </p>
                    </div>
                    <button onClick={() => navigate('/setup')}
                      style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', cursor: 'pointer', flexShrink: 0 }}>
                      Crear juego →
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
              Configurar diapositivas →
            </button>
          ) : (
            <button onClick={handleGenerate} disabled={!canGenerate || isGenerating}
              style={{ ...btnPrimary, opacity: (!canGenerate || isGenerating) ? 0.5 : 1, minWidth: 220 }}>
              {isGenerating ? '⏳ Generando…' : '📥 Descargar presentación .pptx'}
            </button>
          )}
        </div>
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