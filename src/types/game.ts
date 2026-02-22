// src/types/game.ts

// ============================================
// ENUMS Y TIPOS BÁSICOS
// ============================================

export type GameLevel = "primary" | "secondary";
export type Language = "en" | "es" | "pt";
export type RatingColor = "green" | "yellow" | "red";

// ✅ NUEVO: Modo de juego
export type GameMode = "traffic-light" | "coopetition";

export interface GameStatus {
  status:
  | "setup"
  | "stage0"        // ✅ NUEVO: Etapa de preparación
  | "stage1"
  | "stage1-complete"
  | "transition"
  | "stage2"
  | "finished";
  currentStage: 0 | 1 | 2;  // ✅ MODIFICADO: incluye 0
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
// STAGE 0 CONFIG (v1.1 - Completo)
// ============================================

// Tipos de consigna propuesta
export type ProposalType = 
  | 'comprehension'   // Comprensión básica
  | 'relation'        // Relación con otros temas
  | 'application'     // Aplicación práctica
  | 'analysis'        // Análisis / Opinión
  | 'production';     // Producción

// Propuesta de consigna de un equipo
export interface Stage0Proposal {
  id: string;
  teamId: string;
  teamName: string;
  
  // Contenido
  type: ProposalType;
  questionText: string;
  hint?: string;
  
  // Para tipo 'relation' - con qué tema se conecta
  relatedTopic?: string;
  
  // Metadata
  submittedAt: number;
  submittedBy?: string;  // nombre del estudiante que la escribió
  
  // Review del docente
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  bonusPoints: number;  // puntos asignados por el docente (0+)
  teacherComment?: string;
  editedText?: string;   // si el docente la editó
  reviewedAt?: number;
  savedToLibrary?: boolean;
}

// Estado de Stage 0 durante el juego
export type Stage0Phase = 'reading' | 'proposing' | 'reviewing' | 'results';

export interface Stage0State {
  phase: Stage0Phase;
  proposals: Record<string, Stage0Proposal>;
  timerStartedAt?: number;
  readyTeams: string[];  // equipos que terminaron de proponer
}

// Configuración de Stage 0
export interface Stage0Config {
  enabled: boolean;
  material?: {
    type: 'text' | 'link' | 'file';
    content: string;              // texto, URL, o path en Storage
    title?: string;               // título opcional del material
  };
  
  // Propuestas de consignas (v1.1)
  proposalsEnabled: boolean;
  maxProposalsPerTeam: number;  // 1-10, default 5
  timerMinutes?: number;        // tiempo límite opcional
  
  // Puntos - el docente los asigna manualmente al aprobar
  // (no hay puntos predefinidos por tipo)
}

// ============================================
// 🆕 DISPOSITIVOS PEDAGÓGICOS (Post-Game)
// ============================================

export type GroupReflectionStrategy = 'top3' | 'onePerTeam' | 'manual';

export interface PedagogicalDevices {
  // Módulo 1: Reflexión Inicial (antes de empezar)
  preReflection?: {
    enabled: boolean;
  };
  
  // Módulo 2: Autoevaluación Individual (después del podio)
  selfEvaluation?: {
    enabled: boolean;
    includeMetacognition: boolean;   // preguntas metacognitivas adicionales
    requiresValidation: boolean;     // requiere que el docente valide
  };
  
  // Módulo 3: Reflexión Grupal (cierre pedagógico)
  groupReflection?: {
    enabled: boolean;
    strategy: GroupReflectionStrategy;
    timeMinutes: number;             // tiempo asignado para la reflexión
  };
}

// ============================================
// CONFIGURACIÓN DEL JUEGO
// ============================================

export interface GameConfig {
  id: string;
  level: GameLevel;
  language: Language;
  
  // ✅ NUEVO: Modo de juego
  gameMode: GameMode;

  className: string;
  subject: string;

  numberOfTeams: number;
  studentsPerTeam: number;

  csvFileName?: string;
  
  // ✅ Path al material de texto complementario (si existe)
  sourceTextPath?: string;

  ratingMode: "devices" | "physical-cards";

  // ✅ Configuración Stage 0
  stage0Config?: Stage0Config;
  
  // 🆕 Dispositivos Pedagógicos Opcionales
  pedagogicalDevices?: PedagogicalDevices;

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

export type Stage2Phase =
  | "hint"
  | "designated"
  | "question_revealed"
  | "responding"
  | "responding_with_help"
  | "rating"
  | "rating_reveal"
  | "justification"
  | "validation_response"
  | "validation_ratings"
  | "validation"
  | "results";

export interface Stage2Config {
  hintDuration: number;
  helpDuration: number;
  ratingDuration: number;
}

export interface Stage2RespondingTeam {
  teamId: string;
  playerId: string;
  playerName: string;

  helpRequested: boolean;
  helpStartedAt: number | null;
  helpDuration: number;
  
  // ✅ CORREGIDO: helpRemainingSec debe ser number (no null)
  // - Cuando no hay tiempo restante, es 0
  // - Cuando no hay ayuda activa, es helpDuration (ej: 60)
  helpRemainingSec: number;
  
  // ✅ CLAVE: indica si el docente CONFIRMÓ que usaron ayuda
  helpUsed?: boolean; // ? = opcional (para compatibilidad con rondas antiguas)

  responseGiven: boolean;
}

export interface Stage2RatingTeam {
  teamId: string;
  teamName: string;

  playerId: string;
  playerName: string;

  rating: RatingColor | null;
  ratedAt: number | null;
  justification: string | null;
  validated: boolean | null;
}

export interface Stage2Round {
  roundNumber: number;
  questionId: string;
  phase: Stage2Phase;

  hintStartedAt: number;
  hintDuration: number;

  questionRevealedAt: number | null;

  respondingTeam: Stage2RespondingTeam | null;
  ratingTeams: Record<string, Stage2RatingTeam>;

  ratingStartedAt: number | null;
  ratingTimerActive: boolean;
  ratingsRevealed: boolean;

  justificationOrder?: string[];
  currentJustificationIndex?: number;

  responseValidated?: boolean | null;

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

export interface Stage2State {
  currentRound: number;
  currentQuestionIndex: number;
  rounds: Record<number, Stage2Round>;
}

// ============================================
// GAME
// ============================================

export interface Game {
  id: string;

  config: GameConfig;
  status: GameStatus;

  teams: Collection<Team>;
  questions: Collection<Question>;
  rounds: Collection<Round>;

  stage1Rounds?: Record<number, Round>;

  stage2Config?: Stage2Config;
  stage2?: Stage2State;

  // Stage 0 state (v1.1)
  stage0?: Stage0State;
  stage0BonusApplied?: boolean;

  createdAt: number;
  updatedAt: number;
}