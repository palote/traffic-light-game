// src/services/promptGeneratorService.ts
// Servicio para generar prompts de consignas educativas

import type { 
  PromptConfig, 
  EducationLevel,
  ContentCategory,
  PromptLanguage,
} from '../types/promptGenerator';

import {
  PRIMARY_SUBJECTS_ES,
  SECONDARY_SUBJECTS_ES,
  PRIMARY_SUBJECTS_EN,
  SECONDARY_SUBJECTS_EN,
  HISTORICAL_EVENTS,
  BOOKS,
  MEDIA_CONTENT,
} from '../types/promptGenerator';

// ============================================
// OBTENER NOMBRE DEL CONTENIDO SELECCIONADO
// ============================================

export function getSelectionName(
  category: ContentCategory,
  selection: string,
  customSelection: string | undefined,
  language: PromptLanguage
): string {
  if (selection === 'custom' && customSelection) {
    return customSelection;
  }

  switch (category) {
    case 'subject':
      return selection;
    
    case 'history':
      const event = HISTORICAL_EVENTS.find(e => e.id === selection);
      return event ? (language === 'es' ? event.nameEs : event.nameEn) : selection;
    
    case 'book':
      const book = BOOKS.find(b => b.id === selection);
      return book ? `"${book.title}" de ${book.author}` : selection;
    
    case 'fun':
      const media = MEDIA_CONTENT.find(m => m.id === selection);
      return media ? media.title : selection;
    
    default:
      return selection;
  }
}

// ============================================
// OBTENER TEMAS RELACIONADOS
// ============================================

function getRelatedThemes(
  category: ContentCategory,
  selection: string,
  language: PromptLanguage
): string[] {
  switch (category) {
    case 'book':
      const book = BOOKS.find(b => b.id === selection);
      return book?.themes || [];
    
    case 'fun':
      const media = MEDIA_CONTENT.find(m => m.id === selection);
      return media?.themes || [];
    
    default:
      return [];
  }
}

// ============================================
// GENERAR PROMPT EN ESPAÑOL
// ============================================

function generatePromptES(config: PromptConfig): string {
  const levelText = config.level === 'primary' ? 'Primaria' : 'Secundario';
  const selectionName = getSelectionName(
    config.category, 
    config.selection, 
    config.customSelection,
    'es'
  );
  
  const themes = getRelatedThemes(config.category, config.selection, 'es');
  const themesText = themes.length > 0 
    ? `\nTemas sugeridos para explorar: ${themes.join(', ')}`
    : '';

  const categoryContext = getCategoryContextES(config.category, selectionName);

  return `Estoy desarrollando contenidos educativos para el **Juego del Semáforo**, un método pedagógico basado en consignas orales, trabajo en pizarrón y evaluación dinámica.

Quiero que generes **UN JUEGO DE CONSIGNAS** siguiendo estrictamente todas las reglas, formatos y criterios que se detallan a continuación.

NO improvises.
NO simplifiques.
Si algo no está claro, pedí aclaración antes de generar el contenido.

────────────────────────────────
🎯 1. PARÁMETROS CONFIGURABLES
────────────────────────────────

Usá estos parámetros como configuración del juego:

- Nivel educativo: ${levelText}
- Grado/Año: ${config.grade}
- ${categoryContext}
- Tema principal: ${selectionName}${themesText}
- Subtemas que DEBEN incluirse: ${config.subtopicsInclude || '[A definir por el docente]'}
- Subtemas que NO deben incluirse: ${config.subtopicsExclude || '[Ninguno especificado]'}
${config.culturalContext ? `- Contexto geográfico/cultural: ${config.culturalContext}
  (Adaptá los ejemplos, referencias y situaciones al contexto indicado)` : ''}

- Cantidad total de consignas: ${config.totalQuestions}

Distribución por etapa:
- Stage 1: 50% de las consignas (${Math.floor(config.totalQuestions / 2)} consignas)
- Stage 2: 50% de las consignas (${Math.ceil(config.totalQuestions / 2)} consignas)

Distribución por tipo de consigna:
- Consignas de producción (hacer, resolver, representar, escribir, dibujar, explicar en pizarrón):
  - Stage 1: ${config.stage1ProductionPercent}%
  - Stage 2: ${config.stage2ProductionPercent}%
- Consignas de explicación/análisis:
  - Stage 1: ${100 - config.stage1ProductionPercent}%
  - Stage 2: ${100 - config.stage2ProductionPercent}%

Tipo de consignas preferidas: ${getStyleTextES(config.preferredStyle)}

Idioma del juego: Español
(NUNCA mezclar idiomas dentro del mismo archivo)

────────────────────────────────
🚦 2. CONTEXTO PEDAGÓGICO DEL JUEGO
────────────────────────────────

**STAGE 1 - Preparación Interna del Equipo**
- NO es competitivo entre equipos
- Cada equipo trabaja internamente para nivelarse
- Las consignas son más introductorias y diagnósticas
- Los errores son oportunidades de aprendizaje grupal
- Todos los integrantes rotan para responder
- Objetivo: que todo el equipo domine los conceptos básicos

**STAGE 2 - Competencia Colaborativa**
- Competencia entre equipos
- Consignas más desafiantes y de producción
- Se aplica el conocimiento construido en Stage 1
- Colaboración interna + competencia externa
- Cada equipo elige estratégicamente quién responde

────────────────────────────────
📋 3. REGLAS PEDAGÓGICAS OBLIGATORIAS
────────────────────────────────

Todas las consignas deben cumplir:

1. **Autonomía total**
   - Cada consigna debe entenderse sola.
   - NO puede depender de una consigna anterior.
   - NO puede decir "como en la pregunta anterior".

2. **Consistencia pedagógica**
   - La consigna debe indicar claramente:
     - qué hacer
     - con qué contenido
     - bajo qué criterio
   - No dejar decisiones clave "al azar".

3. **Viabilidad áulica**
   - Debe poder resolverse:
     - oralmente
     - frente al pizarrón
     - en tiempo razonable
   - Evitar consignas imposibles de ejecutar en clase.

4. **Nivel cognitivo adecuado**
   - Acorde al nivel y edad indicados.
   - Con desafío real, pero sin ambigüedad.

5. **Producción ≠ responder**
   - Producción implica hacer algo concreto:
     - resolver una cuenta
     - construir un esquema
     - escribir una frase
     - representar un proceso
     - ordenar información
   - Explicar sin producir NO cuenta como producción.

────────────────────────────────
💡 4. HINT / PISTA (COLUMNA OBLIGATORIA)
────────────────────────────────

- El hint:
  - NO es un título
  - NO es la respuesta
  - NO repite el texto de la consigna
- Función:
  - indicar qué repasar antes de responder
  - orientar el pensamiento previo
- Extensión:
  - 1 a 5 palabras máximo
- Puede repetirse entre consignas si el foco cognitivo es el mismo.

Ejemplos válidos:
- "criterio de clasificación"
- "relación causa–efecto"
- "pasos de resolución"
- "uso de conectores"
- "lectura de datos"

────────────────────────────────
📄 5. FORMATO OBLIGATORIO DE ENTREGA (CSV)
────────────────────────────────

El resultado debe entregarse **EN UN CUADRO ÚNICO**, listo para copiar y pegar en Google Sheets.

Encabezados OBLIGATORIOS (primera fila):

id	text	hint	suggestedStage

- id:
  - usar exactamente: q1 a q${config.totalQuestions}
- text:
  - consigna completa, clara y autónoma
- hint:
  - pista cognitiva (ver reglas)
- suggestedStage:
  - SOLO usar valores: 1 o 2

NO agregar columnas extra.
NO cambiar los encabezados.
NO numerar fuera del campo id.

────────────────────────────────
📌 6. ARCHIVO FUENTE (OPCIONAL)
────────────────────────────────

Antes de generar consignas:
- Evaluá si es NECESARIO un texto fuente.

Si NO es necesario:
- NO lo incluyas.

Si SÍ es necesario:
- Incluí UN SOLO texto
- Longitud:
  - Primaria: breve
  - Secundario: mínimo media carilla
- Entregar el texto:
  - en un CUADRO SEPARADO
  - listo para copiar y pegar
- Las consignas deben referirse al texto SIN ambigüedad.

────────────────────────────────
📤 7. ORDEN DE ENTREGA
────────────────────────────────

1. CUADRO con el nombre del archivo (.csv)
2. (Opcional) CUADRO con texto fuente
3. CUADRO con la tabla completa de consignas (q1 a q${config.totalQuestions})

────────────────────────────────
🧪 8. CONTROL DE CALIDAD (ANTES DE ENTREGAR)
────────────────────────────────

Antes de mostrar el resultado:
- Revisá una por una todas las consignas.
- Si alguna:
  - es ambigua
  - está incompleta
  - no se puede hacer en pizarrón
  - no tiene sentido pedagógico
→ REFORMULARLA.

La calidad es prioritaria a la velocidad.

────────────────────────────────
📎 9. INSTRUCCIONES POST-ENTREGA
────────────────────────────────

Fuera del cuadro, después de entregar el juego, incluí:

- Instrucciones claras para:
  - copiar y pegar en Google Sheets
  - verificar separación por columnas
  - exportar el archivo como CSV

────────────────────────────────
▶️ INICIO
────────────────────────────────

Generá el juego completo siguiendo exactamente estas reglas.`;
}

// ============================================
// GENERAR PROMPT EN INGLÉS
// ============================================

function generatePromptEN(config: PromptConfig): string {
  const levelText = config.level === 'primary' ? 'Elementary' : 'Secondary/High School';
  const selectionName = getSelectionName(
    config.category, 
    config.selection, 
    config.customSelection,
    'en'
  );
  
  const themes = getRelatedThemes(config.category, config.selection, 'en');
  const themesText = themes.length > 0 
    ? `\nSuggested themes to explore: ${themes.join(', ')}`
    : '';

  const categoryContext = getCategoryContextEN(config.category, selectionName);

  return `I am developing educational content for the **Traffic Light Game**, a pedagogical method based on oral prompts, whiteboard work, and dynamic assessment.

I want you to generate **ONE SET OF PROMPTS** strictly following all the rules, formats, and criteria detailed below.

DO NOT improvise.
DO NOT simplify.
If something is unclear, ask for clarification before generating content.

────────────────────────────────
🎯 1. CONFIGURABLE PARAMETERS
────────────────────────────────

Use these parameters as game configuration:

- Education level: ${levelText}
- Grade/Year: ${config.grade}
- ${categoryContext}
- Main topic: ${selectionName}${themesText}
- Subtopics that MUST be included: ${config.subtopicsInclude || '[To be defined by teacher]'}
- Subtopics that must NOT be included: ${config.subtopicsExclude || '[None specified]'}
${config.culturalContext ? `- Geographic/cultural context: ${config.culturalContext}
  (Adapt examples, references and situations to the indicated context)` : ''}

- Total number of prompts: ${config.totalQuestions}

Distribution by stage:
- Stage 1: 50% of prompts (${Math.floor(config.totalQuestions / 2)} prompts)
- Stage 2: 50% of prompts (${Math.ceil(config.totalQuestions / 2)} prompts)

Distribution by prompt type:
- Production prompts (do, solve, represent, write, draw, explain on whiteboard):
  - Stage 1: ${config.stage1ProductionPercent}%
  - Stage 2: ${config.stage2ProductionPercent}%
- Explanation/analysis prompts:
  - Stage 1: ${100 - config.stage1ProductionPercent}%
  - Stage 2: ${100 - config.stage2ProductionPercent}%

Preferred prompt style: ${getStyleTextEN(config.preferredStyle)}

Game language: English
(NEVER mix languages within the same file)

────────────────────────────────
🚦 2. PEDAGOGICAL CONTEXT OF THE GAME
────────────────────────────────

**STAGE 1 - Internal Team Preparation**
- NOT competitive between teams
- Each team works internally to level up
- Prompts are more introductory and diagnostic
- Mistakes are opportunities for group learning
- All team members rotate to answer
- Goal: entire team masters basic concepts

**STAGE 2 - Collaborative Competition**
- Competition between teams
- More challenging and production-focused prompts
- Apply knowledge built in Stage 1
- Internal collaboration + external competition
- Each team strategically chooses who answers

────────────────────────────────
📋 3. MANDATORY PEDAGOGICAL RULES
────────────────────────────────

All prompts must comply with:

1. **Total autonomy**
   - Each prompt must be understood on its own.
   - CANNOT depend on a previous prompt.
   - CANNOT say "as in the previous question".

2. **Pedagogical consistency**
   - The prompt must clearly indicate:
     - what to do
     - with what content
     - under what criteria
   - Do not leave key decisions "to chance".

3. **Classroom feasibility**
   - Must be solvable:
     - orally
     - at the whiteboard
     - in reasonable time
   - Avoid prompts impossible to execute in class.

4. **Appropriate cognitive level**
   - According to the indicated level and age.
   - With real challenge, but without ambiguity.

5. **Production ≠ answering**
   - Production means doing something concrete:
     - solving a calculation
     - building a diagram
     - writing a sentence
     - representing a process
     - organizing information
   - Explaining without producing does NOT count as production.

────────────────────────────────
💡 4. HINT (MANDATORY COLUMN)
────────────────────────────────

- The hint:
  - is NOT a title
  - is NOT the answer
  - does NOT repeat the prompt text
- Function:
  - indicate what to review before answering
  - guide prior thinking
- Length:
  - 1 to 5 words maximum
- Can repeat between prompts if the cognitive focus is the same.

Valid examples:
- "classification criteria"
- "cause-effect relationship"
- "resolution steps"
- "use of connectors"
- "data reading"

────────────────────────────────
📄 5. MANDATORY DELIVERY FORMAT (CSV)
────────────────────────────────

The result must be delivered **IN A SINGLE TABLE**, ready to copy and paste into Google Sheets.

MANDATORY headers (first row):

id	text	hint	suggestedStage

- id:
  - use exactly: q1 to q${config.totalQuestions}
- text:
  - complete, clear, and autonomous prompt
- hint:
  - cognitive hint (see rules)
- suggestedStage:
  - ONLY use values: 1 or 2

DO NOT add extra columns.
DO NOT change headers.
DO NOT number outside the id field.

────────────────────────────────
📌 6. SOURCE FILE (OPTIONAL)
────────────────────────────────

Before generating prompts:
- Evaluate if a source text is NECESSARY.

If NOT necessary:
- DO NOT include it.

If necessary:
- Include ONE SINGLE text
- Length:
  - Elementary: brief
  - Secondary: minimum half page
- Deliver the text:
  - in a SEPARATE TABLE
  - ready to copy and paste
- Prompts must refer to the text WITHOUT ambiguity.

────────────────────────────────
📤 7. DELIVERY ORDER
────────────────────────────────

1. TABLE with file name (.csv)
2. (Optional) TABLE with source text
3. TABLE with complete prompt table (q1 to q${config.totalQuestions})

────────────────────────────────
🧪 8. QUALITY CONTROL (BEFORE DELIVERY)
────────────────────────────────

Before showing the result:
- Review each prompt one by one.
- If any:
  - is ambiguous
  - is incomplete
  - cannot be done at whiteboard
  - makes no pedagogical sense
→ REFORMULATE IT.

Quality is priority over speed.

────────────────────────────────
📎 9. POST-DELIVERY INSTRUCTIONS
────────────────────────────────

Outside the table, after delivering the game, include:

- Clear instructions for:
  - copying and pasting into Google Sheets
  - verifying column separation
  - exporting the file as CSV

────────────────────────────────
▶️ START
────────────────────────────────

Generate the complete game following exactly these rules.`;
}

// ============================================
// HELPERS
// ============================================

function getCategoryContextES(category: ContentCategory, selection: string): string {
  switch (category) {
    case 'subject':
      return `Materia: ${selection}`;
    case 'history':
      return `Área: Historia / Ciencias Sociales\nHecho histórico: ${selection}`;
    case 'book':
      return `Área: Lengua y Literatura\nObra literaria: ${selection}`;
    case 'fun':
      return `Contenido audiovisual educativo: ${selection}\n(Usar como disparador para trabajar temas curriculares)`;
    default:
      return `Tema: ${selection}`;
  }
}

function getCategoryContextEN(category: ContentCategory, selection: string): string {
  switch (category) {
    case 'subject':
      return `Subject: ${selection}`;
    case 'history':
      return `Area: History / Social Studies\nHistorical event: ${selection}`;
    case 'book':
      return `Area: Language & Literature\nLiterary work: ${selection}`;
    case 'fun':
      return `Educational audiovisual content: ${selection}\n(Use as a trigger to work on curricular topics)`;
    default:
      return `Topic: ${selection}`;
  }
}

function getStyleTextES(style: 'practical' | 'analytical' | 'mixed'): string {
  switch (style) {
    case 'practical':
      return 'Más prácticas (hacer, resolver, representar)';
    case 'analytical':
      return 'Más analíticas (explicar, comparar, argumentar)';
    case 'mixed':
      return 'Mixtas (equilibrio entre prácticas y analíticas)';
  }
}

function getStyleTextEN(style: 'practical' | 'analytical' | 'mixed'): string {
  switch (style) {
    case 'practical':
      return 'More practical (do, solve, represent)';
    case 'analytical':
      return 'More analytical (explain, compare, argue)';
    case 'mixed':
      return 'Mixed (balance between practical and analytical)';
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

export function generatePrompt(config: PromptConfig): string {
  if (config.language === 'en') {
    return generatePromptEN(config);
  }
  return generatePromptES(config);
}

// ============================================
// ABRIR EN GEMINI
// ============================================

export function openInGemini(prompt: string): void {
  // Gemini usa URL con el prompt como parámetro
  const encodedPrompt = encodeURIComponent(prompt);
  const geminiUrl = `https://gemini.google.com/app?q=${encodedPrompt}`;
  window.open(geminiUrl, '_blank');
}

// ============================================
// COPIAR AL CLIPBOARD
// ============================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error copying to clipboard:', err);
    return false;
  }
}

// ============================================
// GUARDAR/CARGAR PRESETS (localStorage)
// ============================================

const PRESETS_KEY = 'prompt_generator_presets';
const MAX_PRESETS = 5;

export function getSavedPresets(): import('../types/promptGenerator').SavedPreset[] {
  try {
    const data = localStorage.getItem(PRESETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePreset(preset: Omit<import('../types/promptGenerator').SavedPreset, 'id' | 'createdAt'>): boolean {
  try {
    const presets = getSavedPresets();
    
    if (presets.length >= MAX_PRESETS) {
      // Eliminar el más antiguo
      presets.sort((a, b) => a.createdAt - b.createdAt);
      presets.shift();
    }
    
    const newPreset: import('../types/promptGenerator').SavedPreset = {
      ...preset,
      id: `preset_${Date.now()}`,
      createdAt: Date.now(),
    };
    
    presets.push(newPreset);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    return true;
  } catch {
    return false;
  }
}

export function deletePreset(id: string): boolean {
  try {
    const presets = getSavedPresets();
    const filtered = presets.filter(p => p.id !== id);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}