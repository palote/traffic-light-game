// src/types/game.ts

// ============================================
// ENUMS Y TIPOS BÁSICOS
// ============================================

export type GameLevel = "primary" | "secondary";
export type Language = "en" | "es";
export type RatingColor = "green" | "yellow" | "red";

export interface GameStatus {
  status:
  | "setup"
  | "stage1"
  | "stage1-complete"
  | "transition"
  | "stage2"
  | "finished";
  currentStage: 1 | 2;
  currentRound: number;
  currentQuestionIndex: number;
  updatedAt: number;
}

// Realtime DB a veces guarda arrays como objetos indexados.
// Para no pelearte con eso, permitimos ambas formas en el objeto Game.
export type Collection<T> = T[] | Record<string, T>;

// ============================================
// JUGADOR
// ============================================

export interface Player {
  id: string;
  name: string;
  score: number;
  consecutiveLastPlace: number; // Para alertas de rezago
}

// ============================================
// EQUIPO
// ============================================

export interface Team {
  id: string;
  name: string;

  // En el front suele ser array; en RTDB puede venir como objeto.
  players: Player[];

  totalScore: number;
  stage0Bonus: number;
  stage1Completed?: boolean;

  // Stage 2 – rotación de representantes
  representativesUsed?: string[];
}

// ============================================
// PREGUNTA
// ============================================

export interface Question {
  id: string;
  text: string;
  hint: string;
  suggestedStage: 1 | 2;
}

// ============================================
// CALIFICACIÓN (Stage 1)
// ============================================

export interface Rating {
  playerId: string;
  playerName: string;
  color: RatingColor;
  validated: boolean;
}

// ============================================
// RONDA (Stage 1)
// ============================================

export interface Round {
  roundNumber: number;
  questionId: string;

  respondingPlayerId: string;
  respondingPlayerName: string;

  captainId: string;
  captainName: string;

  ratings: Record<string, Rating>;
  pointsAwarded: Record<string, number>;

  timestamp: number;
  hasResponded?: boolean;
  pointsConfirmed?: boolean;
}

// ============================================
// CONFIGURACIÓN DEL JUEGO
// ============================================

export interface GameConfig {
  id: string;
  level: GameLevel;
  language: Language;

  className: string;
  subject: string;

  numberOfTeams: number;
  studentsPerTeam: number;

  csvFileName?: string;

  ratingMode: "devices" | "physical-cards";

  timers: {
    stage1Rating: number;
    stage2Hint: number;
    stage2Answer: number;
    stage2Help: number;
  };

  createdAt: number;
  createdBy?: string;
}

// ============================================
// STAGE 2 CONFIG + TYPES (DEFINITIVO)
// ============================================

// 🆕 CALIFICACIÓN SIMULTÁNEA - Fases simplificadas
export type Stage2Phase =
  | "hint"
  | "designated"
  | "question_revealed"
  | "responding"
  | "responding_with_help"
  | "rating"
  | "rating_reveal"
  | "justification"
  | "validation_response" // 🆕 docente valida respuesta
  | "validation_ratings"  // 🆕 antes era "validation"
  | "results";


export interface Stage2Config {
  hintDuration: number; // default 60
  helpDuration: number; // default 60
  ratingDuration: number; // default 120 (🆕)
}

// ================================
// RESPOND
// ================================

export interface Stage2RespondingTeam {
  teamId: string;
  playerId: string;
  playerName: string;

  helpRequested: boolean;
  helpStartedAt: number | null;
  helpDuration: number;

  // 🆕 para pausa/reanudar (docente)
  helpRemainingSec: number | null;

  responseGiven: boolean;
}

// ================================
// CALIFICA (🆕 SIMPLIFICADO)
// ================================

export interface Stage2RatingTeam {
  teamId: string;
  teamName: string;

  playerId: string;
  playerName: string;

  // ❌ ELIMINADO: order, helpRequested, helpStartedAt, helpDuration

  // ✅ Solo lo esencial para calificación simultánea:
  rating: RatingColor | null;
  ratedAt: number | null;     // 🆕 Timestamp cuando calificó
  justification: string | null;
  validated: boolean | null;
}

// ================================
// RONDA STAGE 2 (🆕 CALIFICACIÓN SIMULTÁNEA)
// ================================

export interface Stage2Round {
  roundNumber: number;
  questionId: string;
  phase: Stage2Phase;

  // Timers
  hintStartedAt: number;
  hintDuration: number;

  questionRevealedAt: number | null;

  // Designación
  respondingTeam: Stage2RespondingTeam | null;
  ratingTeams: Record<string, Stage2RatingTeam>;


  responseValidated: boolean | null; // true correcta, false incorrecta, null pendiente

  // ❌ ELIMINADO: raterOrder, currentRaterIndex (era secuencial)

  // 🆕 CALIFICACIÓN SIMULTÁNEA
  ratingStartedAt: number | null;
  ratingTimerActive: boolean;
  ratingsRevealed: boolean;  // Para controlar revelación

  // 🆕 JUSTIFICACIÓN SECUENCIAL
  justificationOrder?: string[];  // Array de teamIds en orden
  currentJustificationIndex?: number;  // Índice actual

  // Resultados
  pointsAwarded: Record<string, number>;

  timestamp: number;
  validation?: {
    [raterId: string]: {
      raterId: string;
      validated: boolean;
      teacherComment?: string;
      validatedAt: number;
    };
  };
}

// ================================
// ESTADO STAGE 2
// ================================

export interface Stage2State {
  currentRound: number;
  currentQuestionIndex: number;
  rounds: Record<number, Stage2Round>;
}

// ============================================
// GAME (EXPORT FALTANTE - FIX PRINCIPAL)
// ============================================

export interface Game {
  id: string;

  // ============================
  // CONFIGURACIÓN Y ESTADO
  // ============================
  config: GameConfig;
  status: GameStatus;

  // ============================
  // DATOS PRINCIPALES (RTDB)
  // ============================
  // Usamos Collection<> para soportar array u objeto en Realtime DB
  teams: Collection<Team>;
  questions: Collection<Question>;
  rounds: Collection<Round>;

  // ============================
  // STAGE 1
  // ============================
  stage1Rounds?: Record<number, Round>;

  // ============================
  // STAGE 2
  // ============================
  stage2Config?: Stage2Config;
  stage2?: Stage2State;

  // ============================
  // FLAGS DE TRANSICIÓN
  // ============================
  stage0BonusApplied?: boolean;

  // ============================
  // METADATA
  // ============================
  createdAt: number;
  updatedAt: number;
}