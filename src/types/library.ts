// src/types/library.ts
// Tipos para la Biblioteca de CSVs

export type Grade = '3°' | '4°' | '5°' | '6°' | '7°';

export type Subject = 
  | 'Lengua' 
  | 'Matemática' 
  | 'Ciencias Naturales' 
  | 'Ciencias Sociales';

export interface CSVLibraryItem {
  id: string;
  title: string;
  grade: Grade;
  subject: Subject;
  content: string;          // Descripción del contenido
  language: 'es' | 'en';
  storagePath: string;      // Ruta en Firebase Storage
  questionCount?: number;   // Cantidad de preguntas (opcional)
  createdAt: number;
  updatedAt: number;
  createdBy?: string;       // UID del admin que lo subió
}

// Para filtros
export interface LibraryFilters {
  grade: Grade | 'all';
  subject: Subject | 'all';
  search: string;
}

// Para crear nuevo item (sin id ni timestamps)
export type NewCSVLibraryItem = Omit<CSVLibraryItem, 'id' | 'createdAt' | 'updatedAt'>;