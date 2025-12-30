// src/types/teacherLibrary.ts
// Tipos para la biblioteca personal y compartida de docentes

import type { Area, Subject, PrimaryGrade, LibraryLanguage, LibraryGameMode } from './library';

// ============================================
// TEACHER GAME - Juego guardado por un docente
// ============================================

export interface TeacherGame {
  id: string;
  
  // Dueño
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  
  // Visibilidad
  visibility: 'private' | 'public';
  
  // Metadata del juego
  title: string;
  description: string;
  gameMode: LibraryGameMode;
  language: LibraryLanguage;
  
  // Clasificación
  area: Area;
  subject?: Subject;
  grade?: PrimaryGrade;
  level?: 'secondary';
  topic: string;
  mainContents: string;
  mainSkills: string;
  
  // Archivo
  storagePath: string;
  questionCount: number;
  
  // Rating (solo para públicos)
  ratingSum: number;
  ratingCount: number;
  ratingAvg: number;
  
  // Stats
  timesUsed: number;
  timesCopied: number;
  
  // Reportes
  reportCount: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  publishedAt?: number; // Cuando se hizo público
}

// ============================================
// RATING - Voto de un docente
// ============================================

export interface GameRating {
  oderId: string;      // Quién votó
  gameId: string;      // Juego votado
  stars: number;       // 1-5 estrellas
  comment?: string;    // Comentario opcional
  createdAt: number;
}

// ============================================
// REPORT - Reporte de contenido inapropiado
// ============================================

export type ReportReason = 
  | 'inappropriate' 
  | 'incorrect' 
  | 'spam' 
  | 'copyright' 
  | 'other';

export interface GameReport {
  id: string;
  oderId: string;
  gameId: string;
  reason: ReportReason;
  details?: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

// ============================================
// NEW TEACHER GAME - Para crear
// ============================================

export interface NewTeacherGame {
  title: string;
  description: string;
  gameMode: LibraryGameMode;
  language: LibraryLanguage;
  area: Area;
  subject?: Subject;
  grade?: PrimaryGrade;
  level?: 'secondary';
  topic: string;
  mainContents: string;
  mainSkills: string;
  visibility: 'private' | 'public';
}

// ============================================
// FILTROS
// ============================================

export interface TeacherLibraryFilters {
  tab: 'my-games' | 'community' | 'official';
  gameMode?: LibraryGameMode | 'all';
  grade?: PrimaryGrade | 'all';
  area?: Area | 'all';
  subject?: Subject | 'all';
  language?: LibraryLanguage | 'all';
  sortBy?: 'recent' | 'rating' | 'popular';
  search?: string;
}

// ============================================
// LÍMITES
// ============================================

export const TEACHER_LIMITS = {
  maxPrivateGames: 20,
  maxPublicGames: Infinity, // Sin límite
  minRatingToShow: 3, // Mínimo de votos para mostrar promedio
};

// ============================================
// HELPERS
// ============================================

export function canPublishMore(privateCount: number): boolean {
  return privateCount < TEACHER_LIMITS.maxPrivateGames;
}

export function getDisplayRating(game: TeacherGame): string | null {
  if (game.ratingCount < TEACHER_LIMITS.minRatingToShow) {
    return null; // No mostrar rating aún
  }
  return game.ratingAvg.toFixed(1);
}

export function getRatingStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}