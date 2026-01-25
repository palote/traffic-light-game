// src/i18n/index.ts
// Sistema de internacionalización

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { es } from './es';
import { en } from './en';
import { pt } from './pt';
import type { TranslationKeys } from './es';

// ============================================
// TIPOS
// ============================================

export type Language = 'es' | 'en' | 'pt';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
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
// Prioridad: localStorage > navigator.language > 'en'
// Clave: tlg_language
// ============================================

function getInitialLanguage(): Language {
  // 1. Verificar localStorage
  const saved = localStorage.getItem('tlg_language');
  if (saved === 'es' || saved === 'en' || saved === 'pt') {
    return saved;
  }

  // 2. Detectar del navegador
  const browserLang = (navigator.language || navigator.languages?.[0] || '').toLowerCase();
  if (browserLang.startsWith('es')) {
    return 'es';
  }
  if (browserLang.startsWith('pt')) {
    return 'pt';
  }

  // 3. Default
  return 'en';
}

// ============================================
// CONTEXTO
// ============================================

const I18nContext = createContext<I18nContextType | null>(null);

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
    localStorage.setItem('tlg_language', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
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

// ============================================
// HELPER: Selector de idioma compacto
// ============================================

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
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
  
  if (compact) {
    return (
      <button
        onClick={() => setLanguage(nextLanguage())}
        style={{
          padding: '6px 12px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 8,
          border: '2px solid rgba(255,255,255,0.3)',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        title="Change language"
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