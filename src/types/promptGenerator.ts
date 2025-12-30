// src/types/promptGenerator.ts
// Tipos para el generador de prompts de consignas

export type EducationLevel = 'primary' | 'secondary';

export type PrimaryGrade = '3°' | '4°' | '5°' | '6°' | '7°';
export type SecondaryGrade = '1°' | '2°' | '3°' | '4°' | '5°' | '6°';

export type ContentCategory = 'subject' | 'history' | 'book' | 'fun';

export type PromptLanguage = 'es' | 'en';

// ============================================
// MATERIAS CURRICULARES
// ============================================

export const PRIMARY_SUBJECTS_ES = [
  'Lengua',
  'Matemática',
  'Ciencias Naturales',
  'Ciencias Sociales',
] as const;

export const SECONDARY_SUBJECTS_ES = [
  'Lengua y Literatura',
  'Matemática',
  'Física',
  'Química',
  'Biología',
  'Historia',
  'Geografía',
  'Educación Cívica',
  'Inglés',
  'Economía',
  'Filosofía',
] as const;

export const PRIMARY_SUBJECTS_EN = [
  'Language Arts',
  'Mathematics',
  'Natural Sciences',
  'Social Studies',
] as const;

export const SECONDARY_SUBJECTS_EN = [
  'Language & Literature',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Civics',
  'Spanish',
  'Economics',
  'Philosophy',
] as const;

// ============================================
// HECHOS HISTÓRICOS
// ============================================

export interface HistoricalEvent {
  id: string;
  nameEs: string;
  nameEn: string;
  category: 'universal' | 'argentina' | 'americas';
  level: 'primary' | 'secondary' | 'both';
}

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  // Universales
  { id: 'french-revolution', nameEs: 'Revolución Francesa', nameEn: 'French Revolution', category: 'universal', level: 'both' },
  { id: 'ww1', nameEs: 'Primera Guerra Mundial', nameEn: 'World War I', category: 'universal', level: 'secondary' },
  { id: 'ww2', nameEs: 'Segunda Guerra Mundial', nameEn: 'World War II', category: 'universal', level: 'both' },
  { id: 'moon-landing', nameEs: 'Llegada del hombre a la Luna', nameEn: 'Moon Landing', category: 'universal', level: 'both' },
  { id: 'berlin-wall', nameEs: 'Caída del Muro de Berlín', nameEn: 'Fall of the Berlin Wall', category: 'universal', level: 'secondary' },
  { id: 'industrial-revolution', nameEs: 'Revolución Industrial', nameEn: 'Industrial Revolution', category: 'universal', level: 'secondary' },
  { id: 'renaissance', nameEs: 'Renacimiento', nameEn: 'Renaissance', category: 'universal', level: 'secondary' },
  { id: 'ancient-egypt', nameEs: 'Antiguo Egipto', nameEn: 'Ancient Egypt', category: 'universal', level: 'both' },
  { id: 'ancient-greece', nameEs: 'Antigua Grecia', nameEn: 'Ancient Greece', category: 'universal', level: 'both' },
  { id: 'roman-empire', nameEs: 'Imperio Romano', nameEn: 'Roman Empire', category: 'universal', level: 'both' },
  
  // Argentina
  { id: 'revolucion-mayo', nameEs: 'Revolución de Mayo (1810)', nameEn: 'May Revolution (1810)', category: 'argentina', level: 'both' },
  { id: 'independencia-arg', nameEs: 'Independencia Argentina (9 de Julio)', nameEn: 'Argentine Independence (July 9)', category: 'argentina', level: 'both' },
  { id: 'inmigracion-europea', nameEs: 'Inmigración europea (1880-1930)', nameEn: 'European Immigration (1880-1930)', category: 'argentina', level: 'secondary' },
  { id: 'malvinas', nameEs: 'Guerra de Malvinas', nameEn: 'Falklands War', category: 'argentina', level: 'secondary' },
  { id: 'democracia-1983', nameEs: 'Retorno a la democracia (1983)', nameEn: 'Return to Democracy (1983)', category: 'argentina', level: 'secondary' },
  { id: 'conquista-desierto', nameEs: 'Conquista del Desierto', nameEn: 'Conquest of the Desert', category: 'argentina', level: 'secondary' },
  
  // Américas
  { id: 'us-independence', nameEs: 'Independencia de Estados Unidos', nameEn: 'US Independence', category: 'americas', level: 'both' },
  { id: 'columbus', nameEs: 'Llegada de Colón a América', nameEn: 'Columbus arrives in America', category: 'americas', level: 'both' },
  { id: 'aztec-empire', nameEs: 'Imperio Azteca', nameEn: 'Aztec Empire', category: 'americas', level: 'both' },
  { id: 'inca-empire', nameEs: 'Imperio Inca', nameEn: 'Inca Empire', category: 'americas', level: 'both' },
];

// ============================================
// LIBROS
// ============================================

export interface Book {
  id: string;
  title: string;
  author: string;
  level: 'primary' | 'secondary' | 'both';
  themes: string[]; // temas que se pueden trabajar
}

export const BOOKS: Book[] = [
  // Primaria
  { id: 'principito', title: 'El Principito', author: 'Antoine de Saint-Exupéry', level: 'both', themes: ['amistad', 'valores', 'imaginación'] },
  { id: 'charlie-chocolate', title: 'Charlie y la fábrica de chocolate', author: 'Roald Dahl', level: 'primary', themes: ['familia', 'valores', 'fantasía'] },
  { id: 'matilda', title: 'Matilda', author: 'Roald Dahl', level: 'primary', themes: ['superación', 'lectura', 'justicia'] },
  { id: 'cuentos-selva', title: 'Cuentos de la selva', author: 'Horacio Quiroga', level: 'primary', themes: ['naturaleza', 'animales', 'aventura'] },
  { id: 'naranja-lima', title: 'Mi planta de naranja lima', author: 'José Mauro de Vasconcelos', level: 'primary', themes: ['infancia', 'pobreza', 'imaginación'] },
  { id: 'harry-potter-1', title: 'Harry Potter y la piedra filosofal', author: 'J.K. Rowling', level: 'primary', themes: ['amistad', 'magia', 'valentía'] },
  { id: 'momo', title: 'Momo', author: 'Michael Ende', level: 'primary', themes: ['tiempo', 'amistad', 'valores'] },
  { id: 'historia-interminable', title: 'La historia interminable', author: 'Michael Ende', level: 'both', themes: ['fantasía', 'lectura', 'imaginación'] },
  
  // Secundaria
  { id: '1984', title: '1984', author: 'George Orwell', level: 'secondary', themes: ['totalitarismo', 'libertad', 'vigilancia'] },
  { id: 'tunel', title: 'El túnel', author: 'Ernesto Sábato', level: 'secondary', themes: ['obsesión', 'soledad', 'existencialismo'] },
  { id: 'martin-fierro', title: 'Martín Fierro', author: 'José Hernández', level: 'secondary', themes: ['identidad', 'injusticia', 'gauchesca'] },
  { id: 'cronica-muerte', title: 'Crónica de una muerte anunciada', author: 'Gabriel García Márquez', level: 'secondary', themes: ['honor', 'destino', 'sociedad'] },
  { id: 'aleph', title: 'El Aleph', author: 'Jorge Luis Borges', level: 'secondary', themes: ['infinito', 'tiempo', 'literatura'] },
  { id: 'fahrenheit', title: 'Fahrenheit 451', author: 'Ray Bradbury', level: 'secondary', themes: ['censura', 'libros', 'sociedad'] },
  { id: 'senor-moscas', title: 'El señor de las moscas', author: 'William Golding', level: 'secondary', themes: ['civilización', 'poder', 'naturaleza humana'] },
  { id: 'juegos-hambre', title: 'Los juegos del hambre', author: 'Suzanne Collins', level: 'secondary', themes: ['supervivencia', 'poder', 'revolución'] },
  { id: 'casa-espiritus', title: 'La casa de los espíritus', author: 'Isabel Allende', level: 'secondary', themes: ['familia', 'historia', 'política'] },
  { id: 'rayuela', title: 'Rayuela', author: 'Julio Cortázar', level: 'secondary', themes: ['existencialismo', 'amor', 'literatura'] },
];

// ============================================
// PELÍCULAS Y SERIES
// ============================================

export interface MediaContent {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'documentary';
  level: 'primary' | 'secondary' | 'both';
  themes: string[];
  year?: number;
}

export const MEDIA_CONTENT: MediaContent[] = [
  // Primaria - Películas
  { id: 'coco', title: 'Coco', type: 'movie', level: 'primary', themes: ['familia', 'cultura mexicana', 'memoria'], year: 2017 },
  { id: 'encanto', title: 'Encanto', type: 'movie', level: 'primary', themes: ['familia', 'diversidad', 'identidad'], year: 2021 },
  { id: 'intensamente', title: 'Intensamente (Inside Out)', type: 'movie', level: 'both', themes: ['emociones', 'crecimiento', 'memoria'], year: 2015 },
  { id: 'nemo', title: 'Buscando a Nemo', type: 'movie', level: 'primary', themes: ['familia', 'océano', 'perseverancia'], year: 2003 },
  { id: 'walle', title: 'Wall-E', type: 'movie', level: 'both', themes: ['ecología', 'tecnología', 'amor'], year: 2008 },
  { id: 'moana', title: 'Moana', type: 'movie', level: 'primary', themes: ['identidad', 'naturaleza', 'mitología'], year: 2016 },
  { id: 'ratatouille', title: 'Ratatouille', type: 'movie', level: 'primary', themes: ['perseverancia', 'arte', 'sueños'], year: 2007 },
  { id: 'up', title: 'Up: Una aventura de altura', type: 'movie', level: 'both', themes: ['aventura', 'amistad', 'sueños'], year: 2009 },
  { id: 'zootopia', title: 'Zootopia', type: 'movie', level: 'both', themes: ['prejuicios', 'diversidad', 'justicia'], year: 2016 },
  
  // Secundaria - Películas
  { id: 'social-network', title: 'The Social Network', type: 'movie', level: 'secondary', themes: ['tecnología', 'ética', 'emprendimiento'], year: 2010 },
  { id: 'hidden-figures', title: 'Hidden Figures (Talentos ocultos)', type: 'movie', level: 'secondary', themes: ['ciencia', 'discriminación', 'historia'], year: 2016 },
  { id: 'imitation-game', title: 'The Imitation Game', type: 'movie', level: 'secondary', themes: ['matemática', 'historia', 'criptografía'], year: 2014 },
  { id: 'october-sky', title: 'October Sky', type: 'movie', level: 'secondary', themes: ['ciencia', 'superación', 'sueños'], year: 1999 },
  { id: 'dead-poets', title: 'Dead Poets Society', type: 'movie', level: 'secondary', themes: ['literatura', 'pensamiento crítico', 'educación'], year: 1989 },
  { id: 'interstellar', title: 'Interstellar', type: 'movie', level: 'secondary', themes: ['física', 'espacio', 'humanidad'], year: 2014 },
  { id: 'good-will', title: 'Good Will Hunting', type: 'movie', level: 'secondary', themes: ['matemática', 'psicología', 'potencial'], year: 1997 },
  { id: 'schindler', title: "Schindler's List", type: 'movie', level: 'secondary', themes: ['holocausto', 'humanidad', 'historia'], year: 1993 },
  { id: '12-angry-men', title: '12 Angry Men', type: 'movie', level: 'secondary', themes: ['justicia', 'prejuicios', 'argumentación'], year: 1957 },
  
  // Documentales/Series
  { id: 'cosmos', title: 'Cosmos', type: 'documentary', level: 'both', themes: ['ciencia', 'universo', 'historia'], year: 2014 },
  { id: 'planet-earth', title: 'Planet Earth', type: 'documentary', level: 'both', themes: ['naturaleza', 'ecología', 'biodiversidad'], year: 2006 },
  { id: 'our-planet', title: 'Our Planet', type: 'documentary', level: 'both', themes: ['ecología', 'cambio climático', 'naturaleza'], year: 2019 },
  { id: 'black-mirror', title: 'Black Mirror', type: 'series', level: 'secondary', themes: ['tecnología', 'ética', 'futuro'], year: 2011 },
];

// ============================================
// PRESET GUARDADO
// ============================================

export interface SavedPreset {
  id: string;
  name: string;
  level: EducationLevel;
  grade: string;
  category: ContentCategory;
  selection: string;
  customSelection?: string;
  language: PromptLanguage;
  createdAt: number;
}

// ============================================
// CONFIGURACIÓN DEL PROMPT
// ============================================

export interface PromptConfig {
  level: EducationLevel;
  grade: string;
  language: PromptLanguage;
  category: ContentCategory;
  selection: string; // ID del item seleccionado o 'custom'
  customSelection?: string; // Si eligió "Otro"
  
  // ✅ NUEVO: Contexto geográfico/cultural
  culturalContext?: string; // Ej: "México, zona rural de Oaxaca"
  
  // Configuración avanzada
  totalQuestions: number;
  stage1ProductionPercent: number;
  stage2ProductionPercent: number;
  subtopicsInclude?: string;
  subtopicsExclude?: string;
  preferredStyle: 'practical' | 'analytical' | 'mixed';
}

export const DEFAULT_CONFIG: PromptConfig = {
  level: 'primary',
  grade: '6°',
  language: 'es',
  category: 'subject',
  selection: '',
  totalQuestions: 44,
  stage1ProductionPercent: 30,
  stage2ProductionPercent: 50,
  preferredStyle: 'mixed',
};