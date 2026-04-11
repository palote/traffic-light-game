// src/contexts/GameModeContext.tsx
// Contexto para manejar el modo de juego (Traffic Light vs Coopetition)

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================
// TIPOS
// ============================================

export type GameMode = 'traffic-light' | 'coopetition';

export interface GameModeTheme {
  // Identidad
  name: string;
  tagline: string;
  icon: string;

  // Colores principales
  primary: string;
  primaryGradient: string;
  secondary: string;

  // UI
  cardBorder: string;
  cardHoverBg: string;

  // Textos
  welcomeTitle: string;
  welcomeSubtitle: string;
}

interface GameModeContextType {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  theme: GameModeTheme;
  getLocalizedTheme: (language: string) => GameModeTheme;
}

// ============================================
// TEMAS BASE (colores y estructura)
// ============================================

const baseThemes: Record<GameMode, Omit<GameModeTheme, 'name' | 'tagline' | 'welcomeTitle' | 'welcomeSubtitle'>> = {
  'traffic-light': {
    icon: '🚦',
    primary: '#22c55e',
    primaryGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    secondary: '#fbbf24',
    cardBorder: '#22c55e',
    cardHoverBg: '#f0fdf4',
  },
  'coopetition': {
    icon: '🎯',
    primary: '#6366f1',
    primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    secondary: '#8b5cf6',
    cardBorder: '#6366f1',
    cardHoverBg: '#eef2ff',
  },
};

// ============================================
// TEXTOS POR IDIOMA
// ============================================

const localizedTexts: Record<string, Record<GameMode, { name: string; tagline: string; welcomeTitle: string; welcomeSubtitle: string }>> = {
  es: {
    'traffic-light': {
      name: 'El Juego del Semáforo',
      tagline: 'Donde aprendemos todos juntos',  // ← CAMBIADO
      welcomeTitle: '¡Bienvenido/a! 👋',
      welcomeSubtitle: '¿Qué querés hacer hoy?',
    },
    'coopetition': {
      name: 'El Juego de la Coopetición',
      tagline: 'Donde la competencia encuentra la colaboración',
      welcomeTitle: '¡Bienvenido/a! 👋',
      welcomeSubtitle: '¿Qué querés hacer hoy?',
    },
  },
  en: {
    'traffic-light': {
      name: 'Traffic Light Game',
      tagline: 'Where learning is fun',
      welcomeTitle: 'Welcome! 👋',
      welcomeSubtitle: 'What would you like to do today?',
    },
    'coopetition': {
      name: 'The Coopetition Game',
      tagline: 'Where competition meets collaboration',
      welcomeTitle: 'Welcome! 👋',
      welcomeSubtitle: 'What would you like to do today?',
    },
  },
  pt: {
    'traffic-light': {
      name: 'O Jogo do Semáforo',
      tagline: 'Onde aprender é divertido',
      welcomeTitle: 'Bem-vindo/a! 👋',
      welcomeSubtitle: 'O que você quer fazer hoje?',
    },
    'coopetition': {
      name: 'O Jogo da Coopetição',
      tagline: 'Onde a competição encontra a colaboração',
      welcomeTitle: 'Bem-vindo/a! 👋',
      welcomeSubtitle: 'O que você quer fazer hoje?',
    },
  },
};

// ============================================
// CONTEXTO
// ============================================

const GameModeContext = createContext<GameModeContextType | null>(null);

function getInitialGameMode(): GameMode {
  // 1. URL param (para testing)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    if (modeParam === 'coopetition' || modeParam === 'traffic-light') {
      return modeParam as GameMode;
    }
  } catch {
    // ignore
  }

  // 2. Detectar por dominio
  try {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('coopetition')) {
      return 'coopetition';
    }
    if (hostname.includes('trafficlight') || hostname.includes('traffic-light')) {
      return 'traffic-light';
    }
  } catch {
    // ignore
  }

  // 3. localStorage
  try {
    const saved = localStorage.getItem('tlg_gameMode');
    if (saved === 'coopetition' || saved === 'traffic-light') {
      return saved as GameMode;
    }
  } catch {
    // ignore
  }

  // 4. Default
  return 'traffic-light';
}

function buildTheme(mode: GameMode, language: string): GameModeTheme {
  const base = baseThemes[mode];
  const texts = localizedTexts[language]?.[mode] || localizedTexts['es'][mode];
  
  return {
    ...base,
    ...texts,
  };
}

export function GameModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<GameMode>(() => getInitialGameMode());

  useEffect(() => {
    localStorage.setItem('tlg_gameMode', mode);
  }, [mode]);

  const setMode = (newMode: GameMode) => {
    setModeState(newMode);
  };

  // Obtener idioma del localStorage o default
  const getLanguage = (): string => {
    try {
      return localStorage.getItem('tlg_language') || 'es';
    } catch {
      return 'es';
    }
  };

  const theme = buildTheme(mode, getLanguage());

  const getLocalizedTheme = (language: string): GameModeTheme => {
    return buildTheme(mode, language);
  };

  return (
    <GameModeContext.Provider value={{ mode, setMode, theme, getLocalizedTheme }}>
      {children}
    </GameModeContext.Provider>
  );
}

export function useGameMode() {
  const context = useContext(GameModeContext);
  if (!context) {
    throw new Error('useGameMode must be used within GameModeProvider');
  }
  return context;
}

// ============================================
// HELPER: Obtener tema por modo (sin contexto)
// ============================================

export function getThemeByMode(mode: GameMode, language: string = 'es'): GameModeTheme {
  return buildTheme(mode, language);
}