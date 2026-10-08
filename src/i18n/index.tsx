// src/i18n/index.ts
// Sistema de internacionalización

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { es } from './es';
import { en } from './en';
import { pt } from './pt';
import type { TranslationKeys } from './es';
import { esRutaArbitro, esRutaAlumnoArbitro } from '../utils/arbitroRoutes';
import { normalizarIdiomaSesion, localeDeIdioma, type IdiomaSesion } from '../utils/idiomaSesion';
import { formatearPuntos, type IdiomaPuntos } from '../utils/formatoPuntos';
import { almacenLocal } from "../utils/almacenSeguro";
import { resolverIdiomaInicial } from "../utils/idiomaInicial";

// ============================================
// TIPOS
// ============================================

export type Language = 'es' | 'en' | 'pt';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  // Idioma de la sesión del árbitro que está abierta en las pantallas de los
  // alumnos (null = ninguna cargada todavía). Ver useIdiomaSesion.
  sessionLanguage: IdiomaSesion | null;
  setSessionLanguage: (lang: IdiomaSesion | null) => void;
}

// ============================================
// TRADUCCIONES
// ============================================

const translations: Record<Language, TranslationKeys> = {
  es,
  en,
  pt: pt as unknown as TranslationKeys, // Cast necesario por diferencias menores
};

// ============================================
// HELPER: idioma inicial
// Prioridad: localStorage > dominio > navigator.language > 'en'
// Clave: tlg_language
// ============================================

function getInitialLanguage(): Language {
  // Prioridad: elección explícita (localStorage) > dominio > idioma del navegador > 'en'.
  // La lógica vive en utils/idiomaInicial.ts (pura, con prueba en verificar-dominio-idioma.cjs).
  let guardado: string | null = null;
  try { guardado = almacenLocal.getItem('tlg_language'); } catch { /* sin acceso a localStorage */ }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const idiomaNavegador = typeof navigator !== 'undefined' ? (navigator.language || navigator.languages?.[0] || '') : '';
  return resolverIdiomaInicial({ guardado, hostname, idiomaNavegador });
}

// ============================================
// CONTEXTO
// ============================================

const I18nContext = createContext<I18nContextType | null>(null);

// ============================================
// HELPER: valor de <html lang> según la ruta
// ============================================

// En las rutas de los alumnos (/sesion/*, /arbitro-juego/*) manda el idioma de la sesión
// (español mientras no se cargó). En el resto de /arbitro* (configuración, panel, info,
// landing) manda el idioma de la interfaz; el portugués, que no tiene textos del árbitro,
// cae en español. Fuera del árbitro, el idioma elegido.
export function htmlLangForPath(
  pathname: string,
  language: Language,
  sessionLanguage: IdiomaSesion | null = null,
): Language {
  if (!esRutaArbitro(pathname)) return language;
  if (esRutaAlumnoArbitro(pathname)) return sessionLanguage ?? 'es';
  return language === 'en' ? 'en' : 'es';
}

// ============================================
// PROVIDER
// ============================================

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function I18nProvider({ children, defaultLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (defaultLanguage) return defaultLanguage;
    return getInitialLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    almacenLocal.setItem('tlg_language', lang);
  };

  // Idioma de la sesión abierta en las pantallas de los alumnos (no se guarda: sale
  // de la sesión cada vez que se carga).
  const [sessionLanguage, setSessionLanguage] = useState<IdiomaSesion | null>(null);

  // En las rutas del árbitro (/arbitro*, /sesion/*) el idioma del documento no sale
  // del navegador: es "es", o el de la sesión en las pantallas de los alumnos. Al
  // navegar dentro de la app lo actualiza ArbitroLangManager (App.tsx), que usa el
  // mismo helper.
  useEffect(() => {
    document.documentElement.lang = htmlLangForPath(window.location.pathname, language, sessionLanguage);
  }, [language, sessionLanguage]);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
    sessionLanguage,
    setSessionLanguage,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Textos del árbitro (sección `arbitro`). En las pantallas de los alumnos siguen el idioma
// de la sesión; en el resto (docente) siguen el de la interfaz. El portugués no tiene
// sección `arbitro`: usa la española.
export function useArbitroT(): TranslationKeys['arbitro'] {
  const { language, sessionLanguage } = useI18n();
  const idioma = htmlLangForPath(window.location.pathname, language, sessionLanguage);
  return idioma === 'en' ? en.arbitro : es.arbitro;
}

// Título de la pestaña (<title>) de la pantalla; al salir se restaura el anterior.
export function useTituloPagina(titulo: string): void {
  useEffect(() => {
    const anterior = document.title;
    document.title = titulo;
    return () => { document.title = anterior; };
  }, [titulo]);
}

// Las pantallas de los alumnos llaman a esto con el `idioma` que devuelve
// getSesionArbitro. Mientras la sesión no cargó (idioma undefined) queda en español;
// al salir de la pantalla se libera. Una sesión vieja, sin idioma, cuenta como 'es'.
export function useIdiomaSesion(idioma: string | null | undefined, sesionCargada: boolean): void {
  const { setSessionLanguage } = useI18n();
  useEffect(() => {
    if (!sesionCargada) return;
    setSessionLanguage(normalizarIdiomaSesion(idioma));
    return () => setSessionLanguage(null);
  }, [idioma, sesionCargada, setSessionLanguage]);
}

// Formatea un puntaje para mostrarlo: hasta 2 decimales y coma/punto según el idioma
// ("0,25" en español, "0.25" en inglés). En /arbitro* y /sesion/* sigue la misma regla
// que el <html lang> (htmlLangForPath).
export function useFormatoPuntos(): (valor: number) => string {
  const { language, sessionLanguage } = useI18n();
  const idioma = htmlLangForPath(window.location.pathname, language, sessionLanguage) as IdiomaPuntos;
  return (valor: number) => formatearPuntos(valor, idioma);
}

// Configuración regional para fechas y números del árbitro ('es-AR' o 'en-US'): la misma
// regla que el <html lang> (htmlLangForPath).
export function useLocaleArbitro(): 'es-AR' | 'en-US' {
  const { language, sessionLanguage } = useI18n();
  return localeDeIdioma(htmlLangForPath(window.location.pathname, language, sessionLanguage));
}

// Diccionario del árbitro de un idioma dado (para los documentos exportados, que siguen el idioma de la SESIÓN
// aunque la pantalla que los arma siga el de la interfaz).
export function arbitroDic(idioma: string | null | undefined): TranslationKeys['arbitro'] {
  return normalizarIdiomaSesion(idioma) === 'en' ? en.arbitro : es.arbitro;
}

// Reemplaza {nombre} en un texto con los valores indicados.
export function fillArbitro(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

// ============================================
// HELPER: Selector de idioma compacto
// ============================================

// tone: 'onDark' (por defecto, el de siempre: blanco translúcido), 'onColor' (cabeceras de color de las pantallas del
// árbitro: fondo oscuro translúcido + borde blanco, igual que sus otros botones) y 'onLight' (fondo claro).
export function LanguageSelector({ compact = false, tone = 'onDark' }: { compact?: boolean; tone?: 'onDark' | 'onColor' | 'onLight' }) {
  const { language, setLanguage } = useI18n();
  
  // Ciclo de idiomas: es -> en -> pt -> es
  const nextLanguage = (): Language => {
    if (language === 'es') return 'en';
    if (language === 'en') return 'pt';
    return 'es';
  };

  const flags: Record<Language, string> = {
    es: '🇪🇸',
    en: '🇺🇸',
    pt: '🇧🇷',
  };

  const labels: Record<Language, string> = {
    es: 'ES',
    en: 'EN',
    pt: 'PT',
  };
  
  const tonos = {
    onDark: { border: '2px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' },
    onColor: { border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(0,0,0,0.25)', color: '#ffffff' },
    onLight: { border: '2px solid #cbd5e1', backgroundColor: 'white', color: '#334155' },
  } as const;
  const nombreAccesible: Record<Language, string> = {
    es: 'ES · Cambiar idioma',
    en: 'EN · Change language',
    pt: 'PT · Mudar idioma',
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setLanguage(nextLanguage())}
        style={{
          padding: '6px 12px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: tone === 'onColor' ? 20 : 8,
          ...tonos[tone],
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
        title="Change language"
        aria-label={nombreAccesible[language]}
      >
        {flags[language]} {labels[language]}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => setLanguage('es')}
        style={{
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 8,
          border: language === 'es' ? '2px solid #6366f1' : '2px solid #e2e8f0',
          backgroundColor: language === 'es' ? '#eef2ff' : 'white',
          color: language === 'es' ? '#6366f1' : '#64748b',
          cursor: 'pointer',
        }}
      >
        🇪🇸 Español
      </button>
      <button
        onClick={() => setLanguage('en')}
        style={{
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 8,
          border: language === 'en' ? '2px solid #6366f1' : '2px solid #e2e8f0',
          backgroundColor: language === 'en' ? '#eef2ff' : 'white',
          color: language === 'en' ? '#6366f1' : '#64748b',
          cursor: 'pointer',
        }}
      >
        🇺🇸 English
      </button>
      <button
        onClick={() => setLanguage('pt')}
        style={{
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 8,
          border: language === 'pt' ? '2px solid #6366f1' : '2px solid #e2e8f0',
          backgroundColor: language === 'pt' ? '#eef2ff' : 'white',
          color: language === 'pt' ? '#6366f1' : '#64748b',
          cursor: 'pointer',
        }}
      >
        🇧🇷 Português
      </button>
    </div>
  );
}

// Re-export types
export type { TranslationKeys };
