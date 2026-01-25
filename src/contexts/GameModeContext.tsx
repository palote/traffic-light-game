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
}

// ============================================
// TEMAS
// ============================================

const themes: Record<GameMode, GameModeTheme> = {
  'traffic-light': {
    // Identidad
    name: 'Traffic Light Game',
    tagline: 'El Juego del Semáforo',
    icon: '🚦',

    // Colores - Vibrantes y amigables para niños
    primary: '#22c55e',
    primaryGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    secondary: '#fbbf24',

    // UI
    cardBorder: '#22c55e',
    cardHoverBg: '#f0fdf4',

    // Textos
    welcomeTitle: '¡Bienvenido/a! 👋',
    welcomeSubtitle: '¿Qué querés hacer hoy?',
  },

  'coopetition': {
    // Identidad
    name: 'The Coopetition Game',
    tagline: 'Where competition meets collaboration',
    icon: '🎯',

    // Colores - Más sobrios y profesionales
    primary: '#6366f1',
    primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    secondary: '#8b5cf6',

    // UI
    cardBorder: '#6366f1',
    cardHoverBg: '#eef2ff',

    // Textos
    welcomeTitle: 'Welcome! 👋',
    welcomeSubtitle: 'What would you like to do today?',
  },
};

// ============================================
// CONTEXTO
// ============================================

const GameModeContext = createContext<GameModeContextType | null>(null);

// ✅ NUEVO: Determinar modo inicial con prioridad:
// 1) URL param (?mode=coopetition | traffic-light) - testing
// 2) Dominio (hostname)
// 3) localStorage (tlg_gameMode)
// 4) Default ('traffic-light')
function getInitialGameMode(): GameMode { // ✅ NUEVO
  // 1. URL param (para testing)
  try { // ✅ NUEVO
    const urlParams = new URLSearchParams(window.location.search); // ✅ NUEVO
    const modeParam = urlParams.get('mode'); // ✅ NUEVO
    if (modeParam === 'coopetition' || modeParam === 'traffic-light') { // ✅ NUEVO
      return modeParam as GameMode; // ✅ NUEVO
    }
  } catch {
    // ignore (por ejemplo, SSR)
  }

  // 2. Detectar por dominio
  try { // ✅ NUEVO
    const hostname = window.location.hostname.toLowerCase(); // ✅ NUEVO
    if (hostname.includes('coopetition')) { // ✅ NUEVO
      return 'coopetition'; // ✅ NUEVO
    }
    if (hostname.includes('trafficlight') || hostname.includes('traffic-light')) { // ✅ NUEVO
      return 'traffic-light'; // ✅ NUEVO
    }
  } catch {
    // ignore
  }

  // 3. localStorage (clave correcta: tlg_gameMode)
  try { // ✅ NUEVO
    const saved = localStorage.getItem('tlg_gameMode'); // ✅ NUEVO
    if (saved === 'coopetition' || saved === 'traffic-light') { // ✅ NUEVO
      return saved as GameMode; // ✅ NUEVO
    }
  } catch {
    // ignore
  }

  // 4. Default
  return 'traffic-light'; // ✅ NUEVO
}

export function GameModeProvider({ children }: { children: ReactNode }) {
  // Persistir en localStorage
  const [mode, setModeState] = useState<GameMode>(() => { // ✅ MODIFICADO
    return getInitialGameMode(); // ✅ MODIFICADO
  });

  useEffect(() => { // ✅ MODIFICADO
    localStorage.setItem('tlg_gameMode', mode); // ✅ MODIFICADO
  }, [mode]);

  const setMode = (newMode: GameMode) => {
    setModeState(newMode);
  };

  const theme = themes[mode];

  return (
    <GameModeContext.Provider value={{ mode, setMode, theme }}>
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

export function getThemeByMode(mode: GameMode): GameModeTheme {
  return themes[mode];
}
