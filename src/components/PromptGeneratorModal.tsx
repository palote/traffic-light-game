// src/components/PromptGeneratorModal.tsx
// ✅ Generación directa via Firebase Functions (Claude Haiku)
// ✅ Vista de preguntas editable antes de cargar al juego
// ✅ Sección de capacidades colapsada por defecto
// ✅ Mensaje de espera prominente durante generación

import { useState, useMemo, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useGameMode } from '../contexts/GameModeContext';
import type { PromptConfig, ContentCategory, PromptLanguage, SavedPreset } from '../types/promptGenerator';
import {
  DEFAULT_CONFIG,
  PRIMARY_SUBJECTS_ES, SECONDARY_SUBJECTS_ES, HIGHER_SUBJECTS_ES,
  PRIMARY_SUBJECTS_EN, SECONDARY_SUBJECTS_EN, HIGHER_SUBJECTS_EN,
  PRIMARY_SUBJECTS_PT, SECONDARY_SUBJECTS_PT, HIGHER_SUBJECTS_PT,
  HISTORICAL_EVENTS, BOOKS, MEDIA_CONTENT,
} from '../types/promptGenerator';
import { generatePrompt, copyToClipboard, openInGemini, getSavedPresets, savePreset, deletePreset } from '../services/promptGeneratorService';
import * as mammoth from 'mammoth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase.config';

type CapacityType = 'critical-thinking' | 'problem-solving' | 'communication' | 'collaboration' | null;

interface CognitiveOperation {
  id: string; labelEs: string; labelEn: string; labelPt: string;
  promptInstructionEs: string; promptInstructionEn: string; promptInstructionPt: string;
}
interface CapacityDefinition {
  id: CapacityType; icon: string; labelEs: string; labelEn: string; labelPt: string;
  operations: CognitiveOperation[];
}
interface GeneratedQuestion { id: string; text: string; hint?: string; }
interface PromptGeneratorModalProps {
  isOpen: boolean; onClose: () => void;
  onQuestionsGenerated?: (questions: GeneratedQuestion[]) => void;
}

const CAPACITIES: CapacityDefinition[] = [
  {
    id: 'critical-thinking', icon: '🧠', labelEs: 'Pensamiento crítico', labelEn: 'Critical thinking', labelPt: 'Pensamento crítico',
    operations: [
      { id: 'evaluate-evidence', labelEs: 'Evaluar evidencia', labelEn: 'Evaluate evidence', labelPt: 'Avaliar evidências', promptInstructionEs: 'presentar dos o más fuentes/datos y pedir que el alumno determine cuál es más confiable o válida, justificando su respuesta', promptInstructionEn: 'present two or more sources/data and ask the student to determine which is more reliable or valid, justifying their answer', promptInstructionPt: 'apresentar duas ou mais fontes/dados e pedir que o aluno determine qual é mais confiável ou válida, justificando sua resposta' },
      { id: 'detect-errors', labelEs: 'Detectar errores', labelEn: 'Detect errors', labelPt: 'Detectar erros', promptInstructionEs: 'presentar una afirmación o procedimiento con un error conceptual y pedir que el alumno lo identifique y corrija', promptInstructionEn: 'present a statement or procedure with a conceptual error and ask the student to identify and correct it', promptInstructionPt: 'apresentar uma afirmação ou procedimento com um erro conceitual e pedir que o aluno o identifique e corrija' },
      { id: 'compare-arguments', labelEs: 'Comparar argumentos', labelEn: 'Compare arguments', labelPt: 'Comparar argumentos', promptInstructionEs: 'presentar dos posiciones o argumentos diferentes sobre un tema y pedir que el alumno analice fortalezas y debilidades de cada uno', promptInstructionEn: 'present two different positions or arguments on a topic and ask the student to analyze strengths and weaknesses of each', promptInstructionPt: 'apresentar duas posições ou argumentos diferentes sobre um tema e pedir que o aluno analise pontos fortes e fracos de cada um' },
      { id: 'question-assumptions', labelEs: 'Cuestionar supuestos', labelEn: 'Question assumptions', labelPt: 'Questionar suposições', promptInstructionEs: 'presentar una afirmación común o creencia y pedir que el alumno identifique qué supuestos asume y si son válidos', promptInstructionEn: 'present a common statement or belief and ask the student to identify what assumptions it makes and whether they are valid', promptInstructionPt: 'apresentar uma afirmação comum ou crença e pedir que o aluno identifique quais suposições ela assume e se são válidas' },
    ],
  },
  {
    id: 'problem-solving', icon: '🔍', labelEs: 'Resolución de problemas', labelEn: 'Problem solving', labelPt: 'Resolução de problemas',
    operations: [
      { id: 'identify-problem', labelEs: 'Identificar el problema', labelEn: 'Identify the problem', labelPt: 'Identificar o problema', promptInstructionEs: 'presentar una situación compleja y pedir que el alumno identifique cuál es el problema central a resolver', promptInstructionEn: 'present a complex situation and ask the student to identify what is the central problem to solve', promptInstructionPt: 'apresentar uma situação complexa e pedir que o aluno identifique qual é o problema central a resolver' },
      { id: 'propose-solutions', labelEs: 'Proponer soluciones', labelEn: 'Propose solutions', labelPt: 'Propor soluções', promptInstructionEs: 'presentar un problema y pedir que el alumno proponga al menos dos soluciones posibles, explicando cada una', promptInstructionEn: 'present a problem and ask the student to propose at least two possible solutions, explaining each one', promptInstructionPt: 'apresentar um problema e pedir que o aluno proponha pelo menos duas soluções possíveis, explicando cada uma' },
      { id: 'evaluate-alternatives', labelEs: 'Evaluar alternativas', labelEn: 'Evaluate alternatives', labelPt: 'Avaliar alternativas', promptInstructionEs: 'presentar varias soluciones posibles a un problema y pedir que el alumno evalúe ventajas y desventajas de cada una', promptInstructionEn: 'present several possible solutions to a problem and ask the student to evaluate advantages and disadvantages of each', promptInstructionPt: 'apresentar várias soluções possíveis para um problema e pedir que o aluno avalie vantagens e desvantagens de cada uma' },
      { id: 'design-plan', labelEs: 'Diseñar un plan', labelEn: 'Design a plan', labelPt: 'Elaborar um plano', promptInstructionEs: 'presentar un objetivo y pedir que el alumno diseñe un plan paso a paso para lograrlo', promptInstructionEn: 'present a goal and ask the student to design a step-by-step plan to achieve it', promptInstructionPt: 'apresentar um objetivo e pedir que o aluno elabore um plano passo a passo para alcançá-lo' },
    ],
  },
  {
    id: 'communication', icon: '💬', labelEs: 'Comunicación', labelEn: 'Communication', labelPt: 'Comunicação',
    operations: [
      { id: 'explain-to-others', labelEs: 'Explicar a otros', labelEn: 'Explain to others', labelPt: 'Explicar para outros', promptInstructionEs: 'pedir que el alumno explique un concepto como si se lo explicara a alguien que no sabe nada del tema', promptInstructionEn: 'ask the student to explain a concept as if explaining it to someone who knows nothing about the topic', promptInstructionPt: 'pedir que o aluno explique um conceito como se estivesse explicando para alguém que não sabe nada sobre o tema' },
      { id: 'argue-position', labelEs: 'Argumentar posición', labelEn: 'Argue a position', labelPt: 'Argumentar posição', promptInstructionEs: 'pedir que el alumno tome una posición sobre un tema y la defienda con al menos tres argumentos', promptInstructionEn: 'ask the student to take a position on a topic and defend it with at least three arguments', promptInstructionPt: 'pedir que o aluno tome uma posição sobre um tema e a defenda com pelo menos três argumentos' },
      { id: 'synthesize-info', labelEs: 'Sintetizar información', labelEn: 'Synthesize information', labelPt: 'Sintetizar informação', promptInstructionEs: 'presentar información extensa o múltiples datos y pedir que el alumno los resuma en las ideas principales', promptInstructionEn: 'present extensive information or multiple data and ask the student to summarize them into main ideas', promptInstructionPt: 'apresentar informação extensa ou múltiplos dados e pedir que o aluno os resuma nas ideias principais' },
      { id: 'adapt-audience', labelEs: 'Adaptar al público', labelEn: 'Adapt to audience', labelPt: 'Adaptar ao público', promptInstructionEs: 'pedir que el alumno explique el mismo concepto de dos formas diferentes: para un experto y para un niño', promptInstructionEn: 'ask the student to explain the same concept in two different ways: for an expert and for a child', promptInstructionPt: 'pedir que o aluno explique o mesmo conceito de duas formas diferentes: para um especialista e para uma criança' },
    ],
  },
  {
    id: 'collaboration', icon: '🤝', labelEs: 'Trabajo colaborativo', labelEn: 'Collaborative work', labelPt: 'Trabalho colaborativo',
    operations: [
      { id: 'integrate-perspectives', labelEs: 'Integrar perspectivas', labelEn: 'Integrate perspectives', labelPt: 'Integrar perspectivas', promptInstructionEs: 'presentar diferentes perspectivas sobre un tema y pedir que el alumno encuentre puntos en común o una síntesis', promptInstructionEn: 'present different perspectives on a topic and ask the student to find common ground or a synthesis', promptInstructionPt: 'apresentar diferentes perspectivas sobre um tema e pedir que o aluno encontre pontos em comum ou uma síntese' },
      { id: 'negotiate-consensus', labelEs: 'Negociar consenso', labelEn: 'Negotiate consensus', labelPt: 'Negociar consenso', promptInstructionEs: 'presentar un dilema donde hay posiciones opuestas y pedir que el alumno proponga una solución que considere ambas partes', promptInstructionEn: 'present a dilemma with opposing positions and ask the student to propose a solution that considers both sides', promptInstructionPt: 'apresentar um dilema onde há posições opostas e pedir que o aluno proponha uma solução que considere ambas as partes' },
      { id: 'distribute-roles', labelEs: 'Distribuir roles', labelEn: 'Distribute roles', labelPt: 'Distribuir papéis', promptInstructionEs: 'presentar un proyecto grupal y pedir que el alumno proponga cómo distribuir las tareas según las fortalezas de cada integrante', promptInstructionEn: 'present a group project and ask the student to propose how to distribute tasks according to each member\'s strengths', promptInstructionPt: 'apresentar um projeto em grupo e pedir que o aluno proponha como distribuir as tarefas segundo as forças de cada integrante' },
      { id: 'give-receive-feedback', labelEs: 'Dar/recibir feedback', labelEn: 'Give/receive feedback', labelPt: 'Dar/receber feedback', promptInstructionEs: 'presentar un trabajo o respuesta de otro estudiante (ficticio) y pedir que el alumno dé feedback constructivo', promptInstructionEn: 'present another student\'s (fictional) work or answer and ask the student to give constructive feedback', promptInstructionPt: 'apresentar um trabalho ou resposta de outro estudante (fictício) e pedir que o aluno dê feedback construtivo' },
    ],
  },
];

const PRIMARY_GRADES = ['3°', '4°', '5°', '6°', '7°'];
const SECONDARY_GRADES = ['1°', '2°', '3°', '4°', '5°', '6°'];
const HIGHER_GRADES = ['1° año', '2° año', '3° año', '4° año', '5° año'];

export function PromptGeneratorModal({ isOpen, onClose, onQuestionsGenerated }: PromptGeneratorModalProps) {
  const { t, language: appLang } = useI18n();
  const { theme } = useGameMode();

  const [config, setConfig] = useState<PromptConfig>({ ...DEFAULT_CONFIG, language: appLang as PromptLanguage });
  useEffect(() => { setConfig(prev => ({ ...prev, language: appLang as PromptLanguage, selection: '' })); }, [appLang]);

  const [selectedCapacity, setSelectedCapacity] = useState<CapacityType>(null);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [showCapacidades, setShowCapacidades] = useState(false); // ← colapsado por defecto
  const [auxiliaryText, setAuxiliaryText] = useState('');
  const [auxiliaryFileName, setAuxiliaryFileName] = useState<string | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [auxiliaryCase, setAuxiliaryCase] = useState('');
  const [auxiliaryCaseFileName, setAuxiliaryCaseFileName] = useState<string | null>(null);
  const [processingCaseFile, setProcessingCaseFile] = useState(false);
  const [auxiliaryOpen, setAuxiliaryOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showStageInfo, setShowStageInfo] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<SavedPreset[]>(getSavedPresets());
  const [isGeneratingDirect, setIsGeneratingDirect] = useState(false);
  const [directQuestions, setDirectQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'universal' | 'argentina' | 'americas'>('all');
  const [bookFilter, setBookFilter] = useState<'all' | 'primary' | 'secondary'>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'movie' | 'series' | 'documentary'>('all');
  const [incluirTextoPropio, setIncluirTextoPropio] = useState(false);

  const subjects = useMemo(() => {
    if (config.level === 'primary') { if (config.language === 'pt') return [...PRIMARY_SUBJECTS_PT]; if (config.language === 'en') return [...PRIMARY_SUBJECTS_EN]; return [...PRIMARY_SUBJECTS_ES]; }
    if (config.level === 'higher') { if (config.language === 'pt') return [...HIGHER_SUBJECTS_PT]; if (config.language === 'en') return [...HIGHER_SUBJECTS_EN]; return [...HIGHER_SUBJECTS_ES]; }
    if (config.language === 'pt') return [...SECONDARY_SUBJECTS_PT];
    if (config.language === 'en') return [...SECONDARY_SUBJECTS_EN];
    return [...SECONDARY_SUBJECTS_ES];
  }, [config.level, config.language]);

  const grades = config.level === 'primary' ? PRIMARY_GRADES : config.level === 'higher' ? HIGHER_GRADES : SECONDARY_GRADES;
  const filteredEvents = useMemo(() => { let e = HISTORICAL_EVENTS.filter(e => e.level === 'both' || e.level === config.level); if (historyFilter !== 'all') e = e.filter(ev => ev.category === historyFilter); return e; }, [config.level, historyFilter]);
  const filteredBooks = useMemo(() => { let b = [...BOOKS]; if (bookFilter === 'primary') b = b.filter(x => x.level === 'primary' || x.level === 'both'); else if (bookFilter === 'secondary') b = b.filter(x => x.level === 'secondary' || x.level === 'both'); return b; }, [bookFilter]);
  const filteredMedia = useMemo(() => { let m = MEDIA_CONTENT.filter(m => m.level === 'both' || m.level === config.level); if (mediaFilter !== 'all') m = m.filter(x => x.type === mediaFilter); return m; }, [config.level, mediaFilter]);
  const currentCapacity = useMemo(() => CAPACITIES.find(c => c.id === selectedCapacity) || null, [selectedCapacity]);

  const capacityTexts = useMemo(() => {
    const lang = config.language;
    return {
      sectionTitle: lang === 'es' ? '🎯 Tipo de pensamiento a desarrollar (opcional)' : lang === 'pt' ? '🎯 Tipo de pensamento a desenvolver (opcional)' : '🎯 Type of thinking to develop (optional)',
      sectionDesc: lang === 'es' ? 'Seleccioná una capacidad para incluir operaciones cognitivas específicas en el prompt' : lang === 'pt' ? 'Selecione uma capacidade para incluir operações cognitivas específicas no prompt' : 'Select a capacity to include specific cognitive operations in the prompt',
      operationsTitle: lang === 'es' ? 'Operaciones cognitivas' : lang === 'pt' ? 'Operações cognitivas' : 'Cognitive operations',
      operationsDesc: lang === 'es' ? 'Seleccioná las operaciones que querés incluir:' : lang === 'pt' ? 'Selecione as operações:' : 'Select operations to include:',
      selectAll: lang === 'es' ? 'Seleccionar todas' : lang === 'pt' ? 'Selecionar todas' : 'Select all',
      clearAll: lang === 'es' ? 'Limpiar' : lang === 'pt' ? 'Limpar' : 'Clear',
      noCapacity: lang === 'es' ? 'Sin enfoque específico' : lang === 'pt' ? 'Sem foco específico' : 'No specific focus',
      culturalContextLabel: lang === 'es' ? '🌍 Contexto geográfico/cultural (opcional)' : lang === 'pt' ? '🌍 Contexto geográfico/cultural (opcional)' : '🌍 Geographic/cultural context (optional)',
      culturalContextPlaceholder: lang === 'es' ? 'Ej: México, Oaxaca / España, Cataluña' : lang === 'pt' ? 'Ex: Brasil, Minas Gerais' : 'E.g.: Mexico, rural Oaxaca',
      culturalContextHint: lang === 'es' ? 'Los ejemplos se adaptarán a este contexto' : lang === 'pt' ? 'Os exemplos serão adaptados' : 'Examples will be adapted to this context',
      operationsSelectedMessage: (count: number) => lang === 'es' ? `✅ ${count} operaciones seleccionadas` : lang === 'pt' ? `✅ ${count} operações selecionadas` : `✅ ${count} operations selected`,
    };
  }, [config.language]);

  if (!isOpen) return null;

  const updateConfig = (updates: Partial<PromptConfig>) => setConfig(prev => ({ ...prev, ...updates }));
  const toggleOperation = (opId: string) => setSelectedOperations(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  const selectAllOperations = () => { if (currentCapacity) setSelectedOperations(currentCapacity.operations.map(op => op.id)); };
  const clearOperations = () => setSelectedOperations([]);

  const generateOperationsInstructions = (): string => {
    if (!selectedOperations.length || !currentCapacity) return '';
    const lang = config.language;
    const selectedOps = currentCapacity.operations.filter(op => selectedOperations.includes(op.id));
    if (!selectedOps.length) return '';
    const intro = lang === 'es' ? `\n\nOPERACIONES COGNITIVAS:\nPara desarrollar ${currentCapacity.labelEs}, incluí consignas que requieran:` : `\n\nCOGNITIVE OPERATIONS:\nTo develop ${currentCapacity.labelEn}, include questions that require:`;
    const pct = Math.round(60 / selectedOps.length);
    const list = selectedOps.map(op => { const ins = lang === 'es' ? op.promptInstructionEs : op.promptInstructionEn; const lbl = lang === 'es' ? op.labelEs : op.labelEn; return `- ${pct}% deben requerir ${lbl.toUpperCase()}: ${ins}`; }).join('\n');
    return intro + '\n' + list;
  };

  const buildFullPrompt = (): string => {
    let prompt = generatePrompt(config);
    const ops = generateOperationsInstructions();
    if (ops) { const ip = prompt.lastIndexOf('---'); prompt = ip > 0 ? prompt.slice(0, ip) + ops + '\n\n' + prompt.slice(ip) : prompt + ops; }
    if (auxiliaryText.trim()) prompt += (config.language === 'es' ? '\n\n---\nFUNDAMENTO DEL TEMA:\n' : '\n\n---\nTHEME FOUNDATION:\n') + auxiliaryText.trim();
    if (auxiliaryCase.trim()) prompt += (config.language === 'es' ? '\n\n---\nCASO O EJEMPLO:\n' : '\n\n---\nILLUSTRATIVE CASE:\n') + auxiliaryCase.trim();
    return prompt;
  };

  const handleGenerate = () => setGeneratedPrompt(buildFullPrompt());

  const handleGenerateDirect = async () => {
    setIsGeneratingDirect(true);
    setDirectError(null);
    setDirectQuestions(null);
    const lang = config.language;
    const nivel = config.level === 'primary' ? 'primaria' : config.level === 'secondary' ? 'secundaria' : 'superior';
    const tema = config.selection === 'custom' ? config.customSelection : config.selection;
    const cantidad = config.totalQuestions || 20;

    const instruccionTextoPropio = incluirTextoPropio && lang === 'es'
      ? `\n\nINSTRUCCIÓN ESPECIAL — TEXTOS POR CONSIGNA: Cada consigna debe comenzar con un texto breve original (3-5 oraciones para primaria, 5-8 para secundaria), diferente en cada caso, seguido de la pregunta de interpretación. El texto debe ser autocontenido — el alumno no necesita información externa para responderlo. Formato de cada consigna: primero el texto entre comillas, luego la pregunta.\n`
      : incluirTextoPropio && lang === 'en'
      ? `\n\nSPECIAL INSTRUCTION: Each question must start with a short original text (3-5 sentences for primary, 5-8 for secondary), different each time, followed by the interpretation question. The text must be self-contained.\n`
      : '';

    const promptDirecto = lang === 'es'
      ? `Generá ${cantidad} consignas educativas para alumnos de ${nivel}, grado ${config.grade}, sobre el tema: "${tema}".

Criterio de etapas del juego:
- ETAPA 1 (aproximadamente el 50%): preguntas de aproximación al tema — comprensión inicial, identificación, descripción. El alumno puede responder con conocimiento parcial del tema.
- ETAPA 2 (aproximadamente el 50%): preguntas que requieren relaciones más complejas — análisis, comparación, justificación, aplicación. Requieren comprensión más profunda.

Cada consigna debe ser clara y desafiante para el nivel indicado. Entre 15 y 60 palabras. Incluir una pista pedagógica breve (máximo 15 palabras) que ayude al alumno a pensar sin revelar la respuesta. La pista debe orientar la atención hacia algo relevante de la consigna — una palabra clave, una relación entre datos, o una pregunta que invite a releer — pero nunca debe anticipar qué hacer ni cómo resolverlo. Ejemplo correcto: "¿Qué relación hay entre los dos datos?" Ejemplo incorrecto: "Hay dos cantidades que debes comparar restando."

${auxiliaryText.trim() ? `Contexto conceptual:\n${auxiliaryText.trim()}\n\n` : ''}${auxiliaryCase.trim() ? `Caso o ejemplo:\n${auxiliaryCase.trim()}\n\n` : ''}${instruccionTextoPropio}Respondé ÚNICAMENTE con un array JSON válido, sin texto adicional, sin markdown:
[{"id":"q1","text":"texto de la consigna","hint":"pista breve","stage":1},{"id":"q2","text":"...","hint":"...","stage":2}]`
      : `Generate ${cantidad} educational questions for ${nivel} students, grade ${config.grade}, about: "${tema}".

Stage criteria:
- STAGE 1 (~50%): approximation questions — initial comprehension, identification, description.
- STAGE 2 (~50%): complex relational questions — analysis, comparison, justification, application.

Clear, concrete, challenging. Include a brief pedagogical hint (max 15 words) that guides thinking without revealing the answer. Good example: "What relationship exists between the two pieces of information?" Bad example: "There are two amounts you need to compare by subtracting."

${auxiliaryText.trim() ? `Context:\n${auxiliaryText.trim()}\n\n` : ''}${instruccionTextoPropio}Respond ONLY with a valid JSON array: [{"id":"q1","text":"question","hint":"hint","stage":1},{"id":"q2","text":"...","hint":"...","stage":2}]`;

    try {
      const fi = getFunctions(app);
      const fn = httpsCallable(fi, 'generateQuestions');
      const result: any = await fn({ prompt: promptDirecto });
      const raw = result.data.content?.find((b: any) => b.type === 'text')?.text || '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      let questions: GeneratedQuestion[];
      try {
        questions = JSON.parse(cleaned);
      } catch {
        const lastComplete = cleaned.lastIndexOf('},');
        if (lastComplete > 0) {
          const repaired = cleaned.slice(0, lastComplete + 1) + ']';
          questions = JSON.parse(repaired);
        } else {
          throw new Error(lang === 'es' ? 'Respuesta incompleta — probá con menos consignas (20-25 recomendado)' : 'Incomplete response — try fewer questions');
        }
      }
      if (!Array.isArray(questions) || !questions.length) throw new Error('Formato inesperado');
      setDirectQuestions(questions.map((q, i) => ({
        id: q.id || `q${i + 1}`,
        text: q.text,
        hint: q.hint || '',
        suggestedStage: (q as any).stage === 2 ? 2 : 1,
      })));
    } catch (err: any) {
      setDirectError(lang === 'es' ? `Error: ${err.message}. Podés usar el flujo manual copiando el prompt.` : `Error: ${err.message}.`);
    } finally {
      setIsGeneratingDirect(false);
    }
  };

  const handleUseDirect = () => {
    if (directQuestions && onQuestionsGenerated) {
      onQuestionsGenerated(directQuestions.map(q => ({ ...q, suggestedStage: q.suggestedStage ?? 1 })));
      onClose();
    }
  };

  const handleCopy = async () => { if (generatedPrompt) { const ok = await copyToClipboard(generatedPrompt); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); } } };
  const handleOpenGemini = () => { if (generatedPrompt) openInGemini(generatedPrompt); };
  const handleSavePreset = () => { if (!presetName.trim()) return; savePreset({ name: presetName.trim(), level: config.level, grade: config.grade, category: config.category, selection: config.selection, customSelection: config.customSelection, language: config.language }); setPresets(getSavedPresets()); setPresetName(''); };
  const handleLoadPreset = (p: SavedPreset) => { updateConfig({ level: p.level, grade: p.grade, category: p.category, selection: p.selection, customSelection: p.customSelection, language: p.language }); setShowPresets(false); };
  const handleDeletePreset = (id: string) => { deletePreset(id); setPresets(getSavedPresets()); };
  const canProceed = config.selection !== '' && (config.selection !== 'custom' || config.customSelection);

  // ============================================
  // VISTA: Preguntas generadas — EDITABLE
  // ============================================
  if (directQuestions) {
    const lang = config.language;
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, maxWidth: 720 }}>
          <div style={{ ...headerStyle, background: theme.primaryGradient }}>
            <div>
              <h2 style={headerTitleStyle}>✅ {lang === 'es' ? 'Preguntas generadas' : lang === 'pt' ? 'Perguntas geradas' : 'Questions generated'}</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
                {lang === 'es' ? `${directQuestions.length} consignas — editá antes de cargar` : `${directQuestions.length} questions — edit before loading`}
              </p>
            </div>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>
          </div>

          <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Aviso de cantidad faltante */}
            {directQuestions.length < (config.totalQuestions || 20) && (
              <div style={{ marginBottom: 12, padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: 8, fontSize: 13, color: '#92400e', border: '1px solid #fde68a' }}>
                ⚠️ {lang === 'es'
                  ? `Se generaron ${directQuestions.length} de ${config.totalQuestions || 20}. Podés agregar las que faltan con el botón de abajo.`
                  : `Generated ${directQuestions.length} of ${config.totalQuestions || 20}. You can add the missing ones below.`}
              </div>
            )}
            {/* Aviso de edición */}
            <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
              ✏️ {lang === 'es' ? 'Podés editar el texto de cada pregunta y su pista antes de cargarlas al juego. También podés eliminar las que no quieras.' : 'You can edit each question and hint before loading. You can also delete unwanted questions.'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {directQuestions.map((q, i) => (
                <div key={q.id} style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    {/* Número */}
                    <span style={{ padding: '2px 8px', backgroundColor: theme.primary, color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>{i + 1}</span>
                    {/* Botón eliminar */}
                    <button
                      onClick={() => setDirectQuestions(prev => prev!.filter((_, idx) => idx !== i))}
                      title={lang === 'es' ? 'Eliminar pregunta' : 'Delete question'}
                      style={{ padding: '2px 7px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', flexShrink: 0, marginTop: 3 }}>
                      ✕
                    </button>
                    <div style={{ flex: 1 }}>
                      {/* Texto editable */}
                      <textarea
                        value={q.text}
                        onChange={(e) => setDirectQuestions(prev => prev!.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item))}
                        rows={2}
                        style={{ width: '100%', fontSize: 14, color: '#1e293b', lineHeight: 1.5, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit', backgroundColor: '#fff', boxSizing: 'border-box' }}
                      />
                      {/* Pista editable */}
                      <textarea
                        value={q.hint || ''}
                        onChange={(e) => setDirectQuestions(prev => prev!.map((item, idx) => idx === i ? { ...item, hint: e.target.value } : item))}
                        rows={1}
                        placeholder={lang === 'es' ? '💡 Pista pedagógica (opcional)' : '💡 Pedagogical hint (optional)'}
                        style={{ width: '100%', fontSize: 12, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', resize: 'none', fontFamily: 'inherit', backgroundColor: '#f8fafc', marginTop: 6, boxSizing: 'border-box' }}
                      />
                      {/* Selector de etapa */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {lang === 'es' ? 'Etapa:' : 'Stage:'}
                        </span>
                        {([1, 2] as const).map(stage => (
                          <button key={stage}
                            onClick={() => setDirectQuestions(prev => prev!.map((item, idx) =>
                              idx === i ? { ...item, suggestedStage: stage } : item
                            ))}
                            style={{
                              padding: '3px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20,
                              border: 'none', cursor: 'pointer',
                              backgroundColor: (q.suggestedStage ?? 1) === stage
                                ? (stage === 1 ? '#22c55e' : '#ef4444')
                                : '#f1f5f9',
                              color: (q.suggestedStage ?? 1) === stage ? 'white' : '#94a3b8',
                            }}>
                            {stage === 1 ? `🟢 ${lang === 'es' ? 'Etapa 1' : 'Stage 1'}` : `🔴 ${lang === 'es' ? 'Etapa 2' : 'Stage 2'}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón agregar pregunta vacía */}
            <button
              onClick={() => setDirectQuestions(prev => [...(prev || []), {
                id: `q${Date.now()}`,
                text: '',
                hint: '',
                suggestedStage: 1,
              }])}
              style={{
                marginTop: 8,
                width: '100%',
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 10,
                border: '2px dashed #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                cursor: 'pointer',
              }}>
              ➕ {lang === 'es' ? 'Agregar pregunta' : lang === 'pt' ? 'Adicionar pergunta' : 'Add question'}
            </button>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b', flex: 1 }}>
              {directQuestions.length} {lang === 'es' ? 'preguntas' : 'questions'}
            </span>
            {onQuestionsGenerated && (
              <button onClick={handleUseDirect} disabled={directQuestions.length === 0}
                style={{ flex: 2, minWidth: 200, padding: '14px 20px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: directQuestions.length === 0 ? '#94a3b8' : theme.primaryGradient, color: 'white', cursor: directQuestions.length === 0 ? 'not-allowed' : 'pointer' }}>
                ✅ {lang === 'es' ? 'Usar estas preguntas' : lang === 'pt' ? 'Usar estas perguntas' : 'Use these questions'}
              </button>
            )}
            <button onClick={() => { setDirectQuestions(null); setDirectError(null); }}
              style={{ flex: 1, minWidth: 120, padding: '14px 20px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>
              ← {lang === 'es' ? 'Volver' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista del prompt generado (flujo manual)
  if (generatedPrompt) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, maxWidth: 800 }}>
          <div style={{ ...headerStyle, background: theme.primaryGradient }}>
            <h2 style={headerTitleStyle}>✅ {t.promptGenerator.promptReady}</h2>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>
          </div>
          <div style={{ padding: 24 }}>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 14 }}>{t.promptGenerator.promptReadyDesc}</p>
            <div style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 16, maxHeight: 400, overflowY: 'auto', marginBottom: 20 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace' }}>{generatedPrompt}</pre>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={handleCopy} style={{ flex: 1, minWidth: 200, padding: '14px 20px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: copied ? '#22c55e' : theme.primaryGradient, color: 'white', cursor: 'pointer' }}>
                {copied ? '✓' : '📋'} {copied ? t.promptGenerator.copied : t.promptGenerator.copyToClipboard}
              </button>
              <button onClick={handleOpenGemini} style={{ flex: 1, minWidth: 200, padding: '14px 20px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)', color: 'white', cursor: 'pointer' }}>
                ✨ {t.promptGenerator.openInGemini}
              </button>
            </div>
            <button onClick={() => setGeneratedPrompt(null)} style={{ width: '100%', marginTop: 12, padding: '12px 20px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>
              ← {t.common.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  const renderContentSelection = () => {
    const renderOption = (id: string, label: string, subtitle?: string) => (
      <button key={id} onClick={() => updateConfig({ selection: id })}
        style={{ padding: '12px 16px', borderRadius: 10, border: config.selection === id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: config.selection === id ? `${theme.primary}15` : 'white', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: config.selection === id ? 600 : 400, color: config.selection === id ? theme.primary : '#475569' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
      </button>
    );
    const renderCustom = () => (
      <>
        <button onClick={() => updateConfig({ selection: 'custom' })}
          style={{ padding: '12px 16px', borderRadius: 10, border: config.selection === 'custom' ? `3px solid ${theme.primary}` : '2px dashed #cbd5e1', backgroundColor: config.selection === 'custom' ? `${theme.primary}15` : '#f8fafc', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#64748b' }}>
          ➕ {t.promptGenerator.other}
        </button>
        {config.selection === 'custom' && (
          <input type="text" value={config.customSelection || ''} onChange={(e) => updateConfig({ customSelection: e.target.value })} placeholder={t.promptGenerator.customPlaceholder} style={{ ...inputStyle, marginTop: 8 }} autoFocus />
        )}
      </>
    );
    const filterBtns = (filters: readonly string[], curr: string, setter: (v: any) => void, labels: Record<string, string>) => (
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(f => <button key={f} onClick={() => setter(f)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', backgroundColor: curr === f ? theme.primary : '#f1f5f9', color: curr === f ? 'white' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{labels[f]}</button>)}
      </div>
    );
    switch (config.category) {
      case 'subject': return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{subjects.map(s => renderOption(s, s))}{renderCustom()}</div>;
      case 'history': return <div>{filterBtns(['all','universal','argentina','americas'] as const, historyFilter, setHistoryFilter, { all: t.promptGenerator.showAll, universal: t.promptGenerator.universal, argentina: t.promptGenerator.argentina, americas: t.promptGenerator.americas })}<div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>{filteredEvents.map(e => renderOption(e.id, config.language === 'es' ? e.nameEs : e.nameEn))}{renderCustom()}</div></div>;
      case 'book': return <div>{filterBtns(['all','primary','secondary'] as const, bookFilter, setBookFilter, { all: t.promptGenerator.showAll, primary: t.promptGenerator.forPrimary, secondary: t.promptGenerator.forSecondary })}<div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>{filteredBooks.map(b => renderOption(b.id, `📖 ${b.title}`, b.author))}{renderCustom()}</div></div>;
      case 'fun': return <div>{filterBtns(['all','movie','series','documentary'] as const, mediaFilter, setMediaFilter, { all: t.promptGenerator.showAll, movie: t.promptGenerator.movies, series: t.promptGenerator.series, documentary: t.promptGenerator.documentaries })}<div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>{filteredMedia.map(m => renderOption(m.id, `${m.type==='movie'?'🎬':m.type==='series'?'📺':'🎥'} ${m.title}`, m.themes.slice(0,3).join(' • ')))}{renderCustom()}</div></div>;
      default: return null;
    }
  };

  const renderCapacitiesSection = () => {
    const lang = config.language;
    return (
      <div style={{ marginBottom: 24, borderRadius: 12, border: '2px solid #c4b5fd', overflow: 'hidden' }}>
        <button onClick={() => setShowCapacidades(!showCapacidades)}
          style={{ width: '100%', padding: '14px 20px', backgroundColor: selectedCapacity ? '#ede9fe' : '#faf5ff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>{capacityTexts.sectionTitle}</span>
            {selectedCapacity && currentCapacity && (
              <span style={{ fontSize: 12, color: '#8b5cf6', marginLeft: 10 }}>
                ✅ {lang === 'es' ? currentCapacity.labelEs : lang === 'pt' ? currentCapacity.labelPt : currentCapacity.labelEn}
                {selectedOperations.length > 0 && ` · ${selectedOperations.length} op.`}
              </span>
            )}
          </div>
          <span style={{ color: '#7c3aed', fontSize: 13, flexShrink: 0 }}>{showCapacidades ? '▲' : '▼'}</span>
        </button>

        {showCapacidades && (
          <div style={{ padding: 20, backgroundColor: '#faf5ff' }}>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>{capacityTexts.sectionDesc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
              <button onClick={() => { setSelectedCapacity(null); setSelectedOperations([]); }}
                style={{ padding: '12px 14px', borderRadius: 10, border: selectedCapacity === null ? '3px solid #8b5cf6' : '2px solid #e2e8f0', backgroundColor: selectedCapacity === null ? '#ede9fe' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: selectedCapacity === null ? 600 : 400, color: selectedCapacity === null ? '#7c3aed' : '#64748b' }}>
                <span>➖</span><span>{capacityTexts.noCapacity}</span>
              </button>
              {CAPACITIES.map(cap => (
                <button key={cap.id} onClick={() => { setSelectedCapacity(cap.id); setSelectedOperations([]); }}
                  style={{ padding: '12px 14px', borderRadius: 10, border: selectedCapacity === cap.id ? '3px solid #8b5cf6' : '2px solid #e2e8f0', backgroundColor: selectedCapacity === cap.id ? '#ede9fe' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: selectedCapacity === cap.id ? 600 : 400, color: selectedCapacity === cap.id ? '#7c3aed' : '#475569' }}>
                  <span>{cap.icon}</span><span>{lang === 'es' ? cap.labelEs : lang === 'pt' ? cap.labelPt : cap.labelEn}</span>
                </button>
              ))}
            </div>
            {selectedCapacity && currentCapacity && (
              <div style={{ marginTop: 16, padding: 16, backgroundColor: 'white', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>{capacityTexts.operationsTitle}</h5>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={selectAllOperations} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid #8b5cf6', backgroundColor: 'white', color: '#8b5cf6', cursor: 'pointer' }}>{capacityTexts.selectAll}</button>
                    <button onClick={clearOperations} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>{capacityTexts.clearAll}</button>
                  </div>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#64748b' }}>{capacityTexts.operationsDesc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentCapacity.operations.map(op => {
                    const isSel = selectedOperations.includes(op.id);
                    const lbl = lang === 'es' ? op.labelEs : lang === 'pt' ? op.labelPt : op.labelEn;
                    return (
                      <button key={op.id} onClick={() => toggleOperation(op.id)}
                        style={{ padding: '10px 14px', borderRadius: 8, border: isSel ? '2px solid #8b5cf6' : '2px solid #e2e8f0', backgroundColor: isSel ? '#f5f3ff' : '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                        <span style={{ width: 20, height: 20, borderRadius: 4, border: isSel ? 'none' : '2px solid #cbd5e1', backgroundColor: isSel ? '#8b5cf6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, flexShrink: 0 }}>{isSel && '✓'}</span>
                        <span style={{ fontSize: 13, fontWeight: isSel ? 600 : 400, color: isSel ? '#7c3aed' : '#475569' }}>{lbl}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedOperations.length > 0 && (
                  <div style={{ marginTop: 12, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>
                    {capacityTexts.operationsSelectedMessage(selectedOperations.length)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAuxiliarySection = () => {
    const lang = config.language;
    const LIMIT = 1000;
    const texts = {
      sectionLabel: lang === 'es' ? '📎 Material adicional' : lang === 'pt' ? '📎 Material adicional' : '📎 Additional material',
      sectionHint: lang === 'es' ? 'opcional · el prompt funciona sin esto' : lang === 'pt' ? 'opcional' : 'optional',
      f1Title: lang === 'es' ? '📘 Fundamento del tema' : lang === 'pt' ? '📘 Fundamento do tema' : '📘 Theme foundation',
      f1Desc: lang === 'es'
        ? 'Orientá el tema en pocas palabras. Este texto es solo para la IA — si querés darle material de lectura a tus alumnos durante el juego, usá el link de Drive en la configuración del juego.'
        : lang === 'pt'
        ? 'Oriente o tema em poucas palavras. Este texto é só para a IA — para dar material de leitura aos alunos, use o link do Drive na configuração do jogo.'
        : 'Guide the topic briefly. This text is only for the AI — to give reading material to students during the game, use the Drive link in the game settings.',
      f1Ph: lang === 'es' ? 'Describí brevemente el foco del tema...' : lang === 'pt' ? 'Descreva brevemente o foco do tema...' : 'Briefly describe the topic focus...',
      f2Title: lang === 'es' ? '📋 Caso o ejemplo ilustrativo' : lang === 'pt' ? '📋 Caso ou exemplo' : '📋 Illustrative case',
      f2Desc: lang === 'es' ? 'Un caso real o problema concreto para contextualizar alguna consigna.' : lang === 'pt' ? 'Um caso real ou problema concreto.' : 'A real case or concrete problem.',
      f2Ph: lang === 'es' ? 'Pegá el caso o ejemplo aquí...' : lang === 'pt' ? 'Cole o caso ou exemplo aqui...' : 'Paste case here...',
      clear: lang === 'es' ? 'Limpiar' : lang === 'pt' ? 'Limpar' : 'Clear',
      charLimit: lang === 'es' ? 'caracteres' : 'characters',
      limitWarning: lang === 'es' ? 'Límite alcanzado' : lang === 'pt' ? 'Limite atingido' : 'Limit reached',
    };
    const hasContent = auxiliaryText.trim() || auxiliaryCase.trim();
    const f1OverLimit = auxiliaryText.length > LIMIT;

    return (
      <div style={{ marginBottom: 24, borderRadius: 12, border: `2px solid ${hasContent ? '#86efac' : '#e2e8f0'}`, overflow: 'hidden' }}>
        <button onClick={() => setAuxiliaryOpen(!auxiliaryOpen)}
          style={{ width: '100%', padding: '14px 16px', backgroundColor: hasContent ? '#f0fdf4' : '#f8fafc', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>{texts.sectionLabel}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{hasContent ? `✅ ${[auxiliaryText, auxiliaryCase].filter(x => x.trim()).length} campo(s)` : texts.sectionHint}</span>
          </div>
          <span style={{ color: '#64748b', fontSize: 13 }}>{auxiliaryOpen ? '▲' : '▼'}</span>
        </button>
        {auxiliaryOpen && (
          <div style={{ padding: 16, backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Campo 1 — Fundamento del tema, sin upload, con límite */}
            <div style={{ padding: 14, backgroundColor: '#eff6ff', borderRadius: 10, border: `1px solid ${f1OverLimit ? '#fca5a5' : '#bfdbfe'}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e40af', marginBottom: 4 }}>{texts.f1Title}</div>
              <p style={{ margin: '0 0 10px 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{texts.f1Desc}</p>
              <textarea
                rows={4}
                value={auxiliaryText}
                onChange={(e) => { if (e.target.value.length <= LIMIT) setAuxiliaryText(e.target.value); }}
                placeholder={texts.f1Ph}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, borderColor: f1OverLimit ? '#fca5a5' : undefined }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: f1OverLimit ? '#dc2626' : '#94a3b8' }}>
                  {f1OverLimit ? `⚠️ ${texts.limitWarning}` : ''}
                </span>
                <span style={{ fontSize: 11, color: auxiliaryText.length > LIMIT * 0.85 ? '#f59e0b' : '#94a3b8' }}>
                  {auxiliaryText.length} / {LIMIT} {texts.charLimit}
                </span>
              </div>
              {auxiliaryText && (
                <button onClick={() => setAuxiliaryText('')}
                  style={{ marginTop: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>
                  {texts.clear}
                </button>
              )}
            </div>

            {/* Campo 2 — Caso ilustrativo, sin límite estricto */}
            <div style={{ padding: 14, backgroundColor: '#fefce8', borderRadius: 10, border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>{texts.f2Title}</div>
              <p style={{ margin: '0 0 10px 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{texts.f2Desc}</p>
              <textarea rows={4} value={auxiliaryCase} onChange={(e) => setAuxiliaryCase(e.target.value)} placeholder={texts.f2Ph}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              {auxiliaryCase && (
                <button onClick={() => setAuxiliaryCase('')}
                  style={{ marginTop: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>
                  {texts.clear}
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    );
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ ...headerStyle, background: theme.primaryGradient }}>
          <div>
            <h2 style={headerTitleStyle}>🤖 {t.promptGenerator.title}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>{t.promptGenerator.subtitle}</p>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={{ display: 'flex', padding: '16px 24px', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
          {[1, 2, 3].map(step => (
            <div key={step} onClick={() => step <= currentStep && setCurrentStep(step as 1 | 2 | 3)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, backgroundColor: currentStep === step ? theme.primary : currentStep > step ? '#dcfce7' : '#f1f5f9', color: currentStep === step ? 'white' : currentStep > step ? '#16a34a' : '#94a3b8', fontSize: 12, fontWeight: 600, textAlign: 'center', cursor: step <= currentStep ? 'pointer' : 'default' }}>
              {step}. {t.promptGenerator[`step${step}` as keyof typeof t.promptGenerator]}
            </div>
          ))}
        </div>

        <div style={{ padding: 24, maxHeight: '55vh', overflowY: 'auto' }}>

          {/* Step 1 */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.level}</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {([
                    { id: 'primary', icon: '🎒', labelEs: 'Primaria', labelEn: 'Primary', labelPt: 'Fundamental' },
                    { id: 'secondary', icon: '🎓', labelEs: 'Secundaria', labelEn: 'Secondary', labelPt: 'Médio' },
                    { id: 'higher', icon: '🏛️', labelEs: 'Superior', labelEn: 'Higher Ed', labelPt: 'Superior' },
                  ] as const).map(level => (
                    <button key={level.id} onClick={() => updateConfig({ level: level.id, grade: level.id === 'primary' ? '6°' : level.id === 'higher' ? '1° año' : '3°', selection: '' })}
                      style={{ flex: 1, padding: '16px', borderRadius: 12, border: config.level === level.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: config.level === level.id ? `${theme.primary}15` : 'white', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{level.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: config.level === level.id ? theme.primary : '#1e293b' }}>{config.language === 'en' ? level.labelEn : config.language === 'pt' ? level.labelPt : level.labelEs}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{config.level === 'higher' ? 'Año' : t.promptGenerator.grade}</label>
                <select value={config.grade} onChange={(e) => updateConfig({ grade: e.target.value })} style={selectStyle}>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.promptLanguage}</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['es', 'en', 'pt'] as const).map(lang => (
                    <button key={lang} onClick={() => updateConfig({ language: lang, selection: '' })}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: config.language === lang ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: config.language === lang ? `${theme.primary}15` : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{lang === 'es' ? '🇪🇸' : lang === 'en' ? '🇺🇸' : '🇧🇷'}</span>
                      <span style={{ fontWeight: 600, color: config.language === lang ? theme.primary : '#475569' }}>{t.promptGenerator[lang === 'es' ? 'spanish' : lang === 'en' ? 'english' : 'portuguese']}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button onClick={() => setShowPresets(!showPresets)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '2px dashed #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: 14 }}>
                  <span>💾 {t.promptGenerator.savedPresets}</span><span>{showPresets ? '▲' : '▼'}</span>
                </button>
                {showPresets && (
                  <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    {presets.length === 0 ? <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>{t.promptGenerator.noPresets}</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {presets.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleLoadPreset(p)} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', backgroundColor: theme.primary, color: 'white', cursor: 'pointer' }}>{t.promptGenerator.loadPreset}</button>
                              <button onClick={() => handleDeletePreset(p.id)} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.category}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {([
                    { id: 'subject' as ContentCategory, icon: '📚', label: t.promptGenerator.subject },
                    { id: 'history' as ContentCategory, icon: '📜', label: t.promptGenerator.history },
                    { id: 'book' as ContentCategory, icon: '📖', label: t.promptGenerator.book },
                    { id: 'fun' as ContentCategory, icon: '🎬', label: t.promptGenerator.fun },
                  ]).map(cat => (
                    <button key={cat.id} onClick={() => updateConfig({ category: cat.id, selection: '' })}
                      style={{ padding: '16px', borderRadius: 12, border: config.category === cat.id ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: config.category === cat.id ? `${theme.primary}15` : 'white', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: config.category === cat.id ? theme.primary : '#1e293b' }}>{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  {config.category === 'subject' && t.promptGenerator.selectSubject}
                  {config.category === 'history' && t.promptGenerator.selectEvent}
                  {config.category === 'book' && t.promptGenerator.selectBook}
                  {config.category === 'fun' && t.promptGenerator.selectMedia}
                </label>
                {renderContentSelection()}
              </div>
              <div style={{ padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <div onClick={() => setShowStageInfo(!showStageInfo)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 600, color: '#1e40af', fontSize: 14 }}>💡 {t.promptGenerator.stageExplanation}</span>
                  <span style={{ color: '#1e40af' }}>{showStageInfo ? '▲' : '▼'}</span>
                </div>
                {showStageInfo && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 12 }}><div style={{ fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>🟢 {t.promptGenerator.stage1Title}</div><p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{t.promptGenerator.stage1Desc}</p></div>
                    <div><div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>🔴 {t.promptGenerator.stage2Title}</div><p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{t.promptGenerator.stage2Desc}</p></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div>
              {/* Checkbox texto propio por consigna */}
              <div style={{ marginBottom: 24, padding: '16px 20px', backgroundColor: '#fefce8', borderRadius: 12, border: `2px solid ${incluirTextoPropio ? '#f59e0b' : '#e2e8f0'}` }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={incluirTextoPropio} onChange={(e) => setIncluirTextoPropio(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                      {config.language === 'es' ? '📄 Cada consigna incluye su propio texto para interpretar' : '📄 Each question includes its own short text to interpret'}
                    </div>
                    <div style={{ fontSize: 12, color: '#a16207', marginTop: 4 }}>
                      {config.language === 'es'
                        ? 'Recomendado para temas de lengua y comprensión lectora. La IA genera un texto breve diferente para cada consigna.'
                        : 'Recommended for language and reading comprehension topics.'}
                    </div>
                  </div>
                </label>
              </div>

              {renderCapacitiesSection()}
              {renderAuxiliarySection()}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.totalQuestions}</label>
                <input type="number" value={config.totalQuestions} onChange={(e) => updateConfig({ totalQuestions: parseInt(e.target.value) || 20 })} min={5} max={100} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.preferredStyle}</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['practical', 'analytical', 'mixed'] as const).map(style => (
                    <button key={style} onClick={() => updateConfig({ preferredStyle: style })}
                      style={{ flex: 1, padding: '12px', borderRadius: 10, border: config.preferredStyle === style ? `3px solid ${theme.primary}` : '2px solid #e2e8f0', backgroundColor: config.preferredStyle === style ? `${theme.primary}15` : 'white', cursor: 'pointer', fontSize: 13, fontWeight: config.preferredStyle === style ? 600 : 400, color: config.preferredStyle === style ? theme.primary : '#475569' }}>
                      {t.promptGenerator[style]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{capacityTexts.culturalContextLabel}</label>
                <input type="text" value={config.culturalContext || ''} onChange={(e) => updateConfig({ culturalContext: e.target.value })} placeholder={capacityTexts.culturalContextPlaceholder} style={inputStyle} />
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>{capacityTexts.culturalContextHint}</p>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.subtopicsInclude}</label>
                <input type="text" value={config.subtopicsInclude || ''} onChange={(e) => updateConfig({ subtopicsInclude: e.target.value })} placeholder={t.promptGenerator.subtopicsPlaceholder} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{t.promptGenerator.subtopicsExclude}</label>
                <input type="text" value={config.subtopicsExclude || ''} onChange={(e) => updateConfig({ subtopicsExclude: e.target.value })} placeholder={t.promptGenerator.subtopicsPlaceholder} style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {currentStep > 1 && (
            <div>
              <button onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3)}
                style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>
                ← {t.common.back}
              </button>
            </div>
          )}

          {currentStep < 3 ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { if (currentStep === 2 && !canProceed) { alert(t.promptGenerator.selectContent); return; } setCurrentStep((currentStep + 1) as 1 | 2 | 3); }}
                style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', background: theme.primaryGradient, color: 'white', cursor: 'pointer' }}>
                {t.common.continue} →
              </button>
            </div>
          ) : (
            <>
              {/* Aviso prominente durante generación */}
              {isGeneratingDirect && (
                <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fbbf24', fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>⏳</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{config.language === 'es' ? 'Generando preguntas con IA...' : 'Generating questions with AI...'}</div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>{config.language === 'es' ? 'Puede tardar hasta 1 minuto. No cierres esta ventana.' : 'May take up to 1 minute. Do not close this window.'}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={handleGenerate}
                  style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: `2px solid ${theme.primary}`, backgroundColor: 'white', color: theme.primary, cursor: 'pointer' }}>
                  📋 {config.language === 'es' ? 'Ver prompt' : 'View prompt'}
                </button>
                <button onClick={handleGenerateDirect} disabled={isGeneratingDirect}
                  style={{ padding: '14px 28px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none', background: isGeneratingDirect ? '#94a3b8' : theme.primaryGradient, color: 'white', cursor: isGeneratingDirect ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
                  {isGeneratingDirect
                    ? <>⏳ {config.language === 'es' ? 'Generando...' : 'Generating...'}</>
                    : <>✨ {config.language === 'es' ? 'Generar preguntas' : config.language === 'pt' ? 'Gerar perguntas' : 'Generate questions'}</>}
                </button>
              </div>

              {directError && (
                <div style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626', border: '1px solid #fecaca' }}>
                  {directError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' };
const headerStyle: React.CSSProperties = { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white' };
const headerTitleStyle: React.CSSProperties = { margin: 0, fontSize: 20, fontWeight: 700 };
const closeButtonStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#475569' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' };