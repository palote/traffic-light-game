// src/i18n/index.ts
// Sistema de internacionalización

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { es } from './es';
import type { TranslationKeys } from './es';
import { en } from './en';

// ============================================
// TIPOS
// ============================================

export type Language = 'es' | 'en';

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
};

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
  // Intentar recuperar del localStorage o usar default
  const [language, setLanguageState] = useState<Language>(() => {
    if (defaultLanguage) return defaultLanguage;
    
    const stored = localStorage.getItem('app_language');
    if (stored === 'es' || stored === 'en') return stored;
    
    // Detectar idioma del navegador
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' ? 'es' : 'en';
  });

  // Guardar cambios en localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  // Actualizar atributo lang del HTML
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
  
  if (compact) {
    return (
      <button
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
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
        title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        {language === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
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
    </div>
  );
}

// Re-export types
export type { TranslationKeys };