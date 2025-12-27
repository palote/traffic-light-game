// src/types/library.ts
// Tipos para la Biblioteca de CSVs - Traffic Light y Coopetition

// ============================================
// GRADOS Y NIVELES
// ============================================

export type PrimaryGrade = '3°' | '4°' | '5°' | '6°' | '7°';
export type SecondaryLevel = 'secondary';

// ============================================
// ÁREAS
// ============================================

export type Area = 
  | 'Lengua' | 'Matemática' | 'Ciencias Naturales' | 'Ciencias Sociales'
  | 'Language Arts' | 'Mathematics' | 'Natural Sciences' | 'Social Studies';

// ============================================
// MATERIAS (solo Coopetition/Secundario)
// ============================================

export type Subject = 
  | 'Lengua' | 'Matemática' | 'Biología' | 'Química' | 'Física' | 'Historia' | 'Geografía' | 'Economía'
  | 'Language Arts' | 'Mathematics' | 'Biology' | 'Chemistry' | 'Physics' | 'History' | 'Geography' | 'Economics';

// ============================================
// IDIOMA Y MODO
// ============================================

export type LibraryLanguage = 'es' | 'en';
export type LibraryGameMode = 'traffic-light' | 'coopetition';

// ============================================
// ITEM DE BIBLIOTECA
// ============================================

export interface CSVLibraryItem {
  id: string;
  gameMode: LibraryGameMode;
  
  // Traffic Light (primaria)
  grade?: PrimaryGrade;
  
  // Coopetition (secundario)
  level?: SecondaryLevel;
  subject?: Subject;
  
  // Común
  area: Area;
  language: LibraryLanguage;
  
  // Contenido
  title: string;
  fileName: string;
  topic: string;
  mainContents: string;
  mainSkills: string;
  
  // Storage
  storagePath: string;
  sourceTextPath?: string;
  
  // Metadata
  questionCount?: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

// ============================================
// FILTROS
// ============================================

export interface LibraryFilters {
  gameMode: LibraryGameMode | 'all';
  grade: PrimaryGrade | 'all';
  level: SecondaryLevel | 'all';
  area: Area | 'all';
  subject: Subject | 'all';
  language: LibraryLanguage | 'all';
  search: string;
}

export type NewCSVLibraryItem = Omit<CSVLibraryItem, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================
// MAPEOS
// ============================================

export const SUBJECT_TO_AREA: Record<Subject, Area> = {
  'Lengua': 'Lengua',
  'Matemática': 'Matemática',
  'Biología': 'Ciencias Naturales',
  'Química': 'Ciencias Naturales',
  'Física': 'Ciencias Naturales',
  'Historia': 'Ciencias Sociales',
  'Geografía': 'Ciencias Sociales',
  'Economía': 'Ciencias Sociales',
  'Language Arts': 'Language Arts',
  'Mathematics': 'Mathematics',
  'Biology': 'Natural Sciences',
  'Chemistry': 'Natural Sciences',
  'Physics': 'Natural Sciences',
  'History': 'Social Studies',
  'Geography': 'Social Studies',
  'Economics': 'Social Studies',
};

export const PRIMARY_GRADES: PrimaryGrade[] = ['3°', '4°', '5°', '6°', '7°'];
export const AREAS_ES: Area[] = ['Lengua', 'Matemática', 'Ciencias Naturales', 'Ciencias Sociales'];
export const AREAS_EN: Area[] = ['Language Arts', 'Mathematics', 'Natural Sciences', 'Social Studies'];
export const SUBJECTS_ES: Subject[] = ['Lengua', 'Matemática', 'Biología', 'Química', 'Física', 'Historia', 'Geografía', 'Economía'];
export const SUBJECTS_EN: Subject[] = ['Language Arts', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Economics'];