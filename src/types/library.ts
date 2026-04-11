// types/library.ts

export type LibraryLanguage = 'es' | 'en' | 'pt';

// Corregido: 'Matemática' estaba duplicado
export type Area =
  | 'Lengua'
  | 'Matemática'  // Español
  | 'Ciencias Naturales'
  | 'Ciencias Sociales'
  | 'Language Arts'
  | 'Mathematics'
  | 'Natural Sciences'
  | 'Social Studies'
  | 'Língua Portuguesa'
  | 'Ciências da Natureza'  // Portugués
  | 'Ciências Humanas';

// Corregido: 'Matemática' está una sola vez, usada tanto para ES como PT
export type Subject =
  | 'Lengua'
  | 'Matemática'
  | 'Biología'
  | 'Química'
  | 'Física'
  | 'Historia'
  | 'Geografía'
  | 'Economía'
  | 'Language Arts'
  | 'Mathematics'
  | 'Biology'
  | 'Chemistry'
  | 'Physics'
  | 'History'
  | 'Geography'
  | 'Economics'
  | 'Língua Portuguesa'
  | 'Biologia'
  | 'História'
  | 'Geografia'
  | 'Economia';

export type GradeLevel = 'Primary' | 'Secondary' | 'University';

export interface Resource {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  gradeLevel: GradeLevel;
  language: LibraryLanguage;
  fileUrl: string;
  thumbnailUrl?: string;
  uploadDate: Date;
  downloadCount: number;
  tags: string[];
}

export interface UserFavorite {
  userId: string;
  resourceId: string;
  addedAt: Date;
}

// Collections for each language
export const AREAS_ES: Area[] = ['Lengua', 'Matemática', 'Ciencias Naturales', 'Ciencias Sociales'];
export const SUBJECTS_ES: Subject[] = ['Lengua', 'Matemática', 'Biología', 'Química', 'Física', 'Historia', 'Geografía', 'Economía'];

export const AREAS_EN: Area[] = ['Language Arts', 'Mathematics', 'Natural Sciences', 'Social Studies'];
export const SUBJECTS_EN: Subject[] = ['Language Arts', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Economics'];

// Corregido: 'Matemática' cambia por 'Ciências da Natureza' y 'Ciências Humanas'
export const AREAS_PT: Area[] = ['Língua Portuguesa', 'Ciências da Natureza', 'Ciências Humanas'];
export const SUBJECTS_PT: Subject[] = ['Língua Portuguesa', 'Matemática', 'Biologia', 'Química', 'Física', 'História', 'Geografia', 'Economia'];

// ============================================
// GRADES
// ============================================
export type PrimaryGrade = '3°' | '4°' | '5°' | '6°' | '7°';
export const PRIMARY_GRADES: PrimaryGrade[] = ['3°', '4°', '5°', '6°', '7°'];

// ============================================
// GAME MODES
// ============================================
export type LibraryGameMode = 'traffic-light' | 'coopetition';
export type SecondaryLevel = 'secondary' | 'higher';

// ============================================
// CSV LIBRARY ITEM
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
  mainContents?: string;
  mainSkills?: string;
  
  // Storage
  storagePath: string;
  sourceTextPath?: string;
  
  // Metadata
  questionCount?: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export type NewCSVLibraryItem = Omit<CSVLibraryItem, 'id' | 'createdAt' | 'updatedAt'>;

// Mapping subjects to their respective areas - CORREGIDO
export const SUBJECT_TO_AREA: Record<Subject, Area> = {
  // Spanish subjects
  'Lengua': 'Lengua',
  'Matemática': 'Matemática',
  'Biología': 'Ciencias Naturales',
  'Química': 'Ciencias Naturales',
  'Física': 'Ciencias Naturales',
  'Historia': 'Ciencias Sociales',
  'Geografía': 'Ciencias Sociales',
  'Economía': 'Ciencias Sociales',
  
  // English subjects
  'Language Arts': 'Language Arts',
  'Mathematics': 'Mathematics',
  'Biology': 'Natural Sciences',
  'Chemistry': 'Natural Sciences',
  'Physics': 'Natural Sciences',
  'History': 'Social Studies',
  'Geography': 'Social Studies',
  'Economics': 'Social Studies',
  
  // Portuguese subjects
  'Língua Portuguesa': 'Língua Portuguesa',
  'Matemática': 'Matemática',  // Usa 'Matemática' del español
  'Biologia': 'Ciências da Natureza',
  'Química': 'Ciências da Natureza',  // Usa 'Química' del español
  'Física': 'Ciências da Natureza',  // Usa 'Física' del español
  'História': 'Ciências Humanas',
  'Geografia': 'Ciências Humanas',
  'Economia': 'Ciências Humanas',
};

// Helper function to get subjects by language
export function getSubjectsByLanguage(language: LibraryLanguage): Subject[] {
  switch (language) {
    case 'es':
      return SUBJECTS_ES;
    case 'en':
      return SUBJECTS_EN;
    case 'pt':
      return SUBJECTS_PT;
    default:
      return SUBJECTS_ES;
  }
}

// Helper function to get areas by language
export function getAreasByLanguage(language: LibraryLanguage): Area[] {
  switch (language) {
    case 'es':
      return AREAS_ES;
    case 'en':
      return AREAS_EN;
    case 'pt':
      // 'Matemática' no está en AREAS_PT, solo 'Ciências da Natureza' y 'Ciências Humanas'
      return AREAS_PT;
    default:
      return AREAS_ES;
  }
}

// Helper function to get area for a subject
export function getAreaForSubject(subject: Subject): Area {
  return SUBJECT_TO_AREA[subject];
}

// Type guard to check if a string is a valid Subject
export function isSubject(value: string): value is Subject {
  return Object.keys(SUBJECT_TO_AREA).includes(value);
}

// Type guard to check if a string is a valid Area
export function isArea(value: string): value is Area {
  const allAreas = [...AREAS_ES, ...AREAS_EN, ...AREAS_PT];
  return allAreas.includes(value as Area);
}

// Type guard to check if a string is a valid LibraryLanguage
export function isLibraryLanguage(value: string): value is LibraryLanguage {
  return value === 'es' || value === 'en' || value === 'pt';
}

// Utility function to filter resources by language and subject
export function filterResources(
  resources: Resource[],
  language?: LibraryLanguage,
  subject?: Subject
): Resource[] {
  return resources.filter(resource => {
    const languageMatch = !language || resource.language === language;
    const subjectMatch = !subject || resource.subject === subject;
    return languageMatch && subjectMatch;
  });
}

// Sample data for testing
export const sampleResources: Resource[] = [
  {
    id: '1',
    title: 'Introducción a la Biología',
    description: 'Conceptos básicos de biología celular',
    subject: 'Biología',
    gradeLevel: 'Secondary',
    language: 'es',
    fileUrl: '/resources/bio-intro.pdf',
    thumbnailUrl: '/thumbnails/bio-intro.jpg',
    uploadDate: new Date('2024-01-15'),
    downloadCount: 150,
    tags: ['biología', 'células', 'secundaria']
  },
  {
    id: '2',
    title: 'Algebra Fundamentals',
    description: 'Basic algebra concepts and exercises',
    subject: 'Mathematics',
    gradeLevel: 'Secondary',
    language: 'en',
    fileUrl: '/resources/algebra-fundamentals.pdf',
    uploadDate: new Date('2024-02-10'),
    downloadCount: 89,
    tags: ['algebra', 'mathematics', 'exercises']
  }
];