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

export function GameModeProvider({ children }: { children: ReactNode }) {
  // Persistir en localStorage
  const [mode, setModeState] = useState<GameMode>(() => {
    const saved = localStorage.getItem('gameMode');
    return (saved as GameMode) || 'traffic-light';
  });

  useEffect(() => {
    localStorage.setItem('gameMode', mode);
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