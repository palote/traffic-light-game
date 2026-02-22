// src/components/SetupScreen.tsx

import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SetupScreen.css";
import { ref as storageRef, getBlob } from "firebase/storage";
import { storage } from "../firebase.config";

import type {
  GameLevel,
  Language,
  GameConfig,
  Team,
  Player,
  Question,
  GameMode,
  PedagogicalDevices,
} from "../types/game";

import {
  createGame,
  addTeams,
  addQuestions,
  startGame,
} from "../services/gameRepository";

import { CSVPreview } from "./CSVPreview";
import { SaveGameModal } from "./library/SaveGameModal";
import { PromptGeneratorModal } from "./PromptGeneratorModal";
import { RoomCodeDisplay } from "./RoomCodeDisplay";
import { useGameMode } from "../contexts/GameModeContext";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";

import { StudentConfigValidator, useStudentValidation } from './StudentConfigValidator';
import { ClassSelectorModal } from './ClassSelectorModal';
import { ImportFromClassroomModal } from "../components/ImportFromClassroomModal";
// 🆕 Import del nuevo modal para Google Sheets
import { ImportFromSheetsModal } from "./ImportFromSheetsModal";

import { parseCSV } from "../utils/csvParser";
import type { ParseResult, ParsedQuestion } from "../utils/csvParser";

import { saveTeacherGame } from "../services/teacherLibraryService";
import type { NewTeacherGame } from "../types/teacherLibrary";

// 🆕 Import del nuevo modal
import { GameStartAnnouncementModal } from "./GameStartAnnouncementModal";

// 🦁 Nombres de equipos con animales (Traffic Light - niños)
const TEAM_ANIMALS = [
  { emoji: "🦁", name: "Leones", nameEn: "Lions", namePt: "Leões" },
  { emoji: "🐯", name: "Tigres", nameEn: "Tigers", namePt: "Tigres" },
  { emoji: "🐻", name: "Osos", nameEn: "Bears", namePt: "Ursos" },
  { emoji: "🦅", name: "Águilas", nameEn: "Eagles", namePt: "Águias" },
  { emoji: "🦊", name: "Zorros", nameEn: "Foxes", namePt: "Raposas" },
  { emoji: "🐺", name: "Lobos", nameEn: "Wolves", namePt: "Lobos" },
  { emoji: "🦒", name: "Jirafas", nameEn: "Giraffes", namePt: "Girafas" },
  { emoji: "🐘", name: "Elefantes", nameEn: "Elephants", namePt: "Elefantes" },
  { emoji: "🦓", name: "Cebras", nameEn: "Zebras", namePt: "Zebras" },
  { emoji: "🦘", name: "Canguros", nameEn: "Kangaroos", namePt: "Cangurus" },
];

// 🎯 Nombres de equipos neutrales (Coopetition - adolescentes/adultos)
const TEAM_PROFESSIONAL = [
  { emoji: "1️⃣", name: "Equipo 1", nameEn: "Team 1", namePt: "Equipe 1" },
  { emoji: "2️⃣", name: "Equipo 2", nameEn: "Team 2", namePt: "Equipe 2" },
  { emoji: "3️⃣", name: "Equipo 3", nameEn: "Team 3", namePt: "Equipe 3" },
  { emoji: "4️⃣", name: "Equipo 4", nameEn: "Team 4", namePt: "Equipe 4" },
  { emoji: "5️⃣", name: "Equipo 5", nameEn: "Team 5", namePt: "Equipe 5" },
  { emoji: "6️⃣", name: "Equipo 6", nameEn: "Team 6", namePt: "Equipe 6" },
  { emoji: "7️⃣", name: "Equipo 7", nameEn: "Team 7", namePt: "Equipe 7" },
  { emoji: "8️⃣", name: "Equipo 8", nameEn: "Team 8", namePt: "Equipe 8" },
  { emoji: "9️⃣", name: "Equipo 9", nameEn: "Team 9", namePt: "Equipe 9" },
  { emoji: "🔟", name: "Equipo 10", nameEn: "Team 10", namePt: "Equipe 10" },
];

interface SetupScreenProps {
  onGameCreated: (gameId: string) => void;
}

/**
 * =========================================================
 * ✅ Helpers de diagnóstico/encoding (best effort)
 * - Para "fromLibrary" recibimos un string ya decodificado (no tenemos bytes).
 * - Para "Upload CSV" sí tenemos bytes: hacemos decode robusto con TextDecoder.
 * =========================================================
 */

function hasMojibakeMarkers(text: string): boolean {
  return /Ã|Â|â€/.test(text);
}

function hasVisibleBadReplacement(text: string): boolean {
  return /\uFFFD/.test(text);
}

function scoreText(text: string): number {
  const repl = (text.match(/\uFFFD/g) || []).length;
  const mojibake = (text.match(/Ã|Â|â€/g) || []).length;
  const visible = repl;
  return repl * 10 + visible * 8 + mojibake * 3;
}

function repairLatin1ToUtf8(text: string): string {
  const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0) & 0xff));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function maybeFixEncodingString(
  input: string
): { text: string; changed: boolean; reason: string } {
  const original = input ?? "";
  const origScore = scoreText(original);

  if (!hasMojibakeMarkers(original) && !hasVisibleBadReplacement(original)) {
    return { text: original, changed: false, reason: "no_markers" };
  }

  const replCount = (original.match(/\uFFFD/g) || []).length;
  if (replCount >= 3 && !hasMojibakeMarkers(original)) {
    return { text: original, changed: false, reason: "has_replacement_no_bytes" };
  }

  let candidate = original;
  try {
    candidate = repairLatin1ToUtf8(original);
  } catch {
    candidate = original;
  }
  const score = scoreText(candidate);

  if (score < origScore) {
    return { text: candidate, changed: true, reason: "repair(latin1→utf8)" };
  }

  return { text: original, changed: false, reason: "no_improvement" };
}

async function decodeFileBestEffort(
  file: File
): Promise<{
  text: string;
  chosen: string;
  candidates: Array<{ encoding: string; score: number; hasReplacement: boolean; sample: string }>;
}> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  const encodings = ["utf-8", "windows-1252", "iso-8859-1"] as const;

  const candidates = encodings.map((enc) => {
    let decoded = "";
    try {
      decoded = new TextDecoder(enc, { fatal: false }).decode(bytes);
    } catch {
      decoded = "";
    }
    const score = scoreText(decoded);
    return {
      encoding: enc,
      score,
      hasReplacement: /\uFFFD/.test(decoded),
      sample: decoded.slice(0, 120),
    };
  });

  const sorted = [...candidates].sort((a, b) => a.score - b.score);
  const bestScore = sorted[0]?.score ?? 0;
  const bestEncodings = sorted.filter((c) => c.score === bestScore).map((c) => c.encoding);
  const chosen =
    bestEncodings.includes("utf-8") ? "utf-8" : (sorted[0]?.encoding ?? "utf-8");

  let text = "";
  try {
    text = new TextDecoder(chosen, { fatal: false }).decode(bytes);
  } catch {
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  return { text, chosen, candidates };
}

export function SetupScreen({ onGameCreated }: SetupScreenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode: gameMode, theme } = useGameMode();
  const { user } = useAuth();
  const { t: appT, language: appLanguage } = useI18n();

  const [level] = useState<GameLevel>("primary");
  const [ratingMode] = useState<"devices" | "physical-cards">("devices");
  const [language, setLanguage] = useState<Language>(
    appLanguage as Language
  );
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState(6);
  const [studentsPerTeam, setStudentsPerTeam] = useState(5);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const [studentsText, setStudentsText] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const [stage1RatingTimer] = useState(30);
  const [stage2HintTimer] = useState(60);
  const [stage2AnswerTimer] = useState(45);
  const [stage2HelpTimer] = useState(30);

  const [teams, setTeams] = useState<Team[]>([]);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCreating, setIsCreating] = useState(false);
  // 🆕 Estado para roomCode
  const [roomCode, setRoomCode] = useState("");
  const [createdGameId, setCreatedGameId] = useState<string>("");

  const [libraryCSVLoaded, setLibraryCSVLoaded] = useState(false);
  const [libraryCSVTitle, setLibraryCSVTitle] = useState<string | null>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [csvContentForSave, setCsvContentForSave] = useState<string>("");
  const [gameSaved, setGameSaved] = useState(false);

  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  const [sourceTextPath, setSourceTextPath] = useState<string | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialContent, setMaterialContent] = useState<string | null>(null);
  const [loadingMaterial, setLoadingMaterial] = useState(false);

  const [pedagogicalDevices, setPedagogicalDevices] = useState<PedagogicalDevices>({
    preReflection: { enabled: false },
    selfEvaluation: { 
      enabled: false, 
      includeMetacognition: false, 
      requiresValidation: false 
    },
    groupReflection: { 
      enabled: false, 
      strategy: 'top3', 
      timeMinutes: 15 
    },
  });

  const [showCapacitySection, setShowCapacitySection] = useState(false);
  const [selectedCapacitySetup, setSelectedCapacitySetup] = useState<string | null>(null);

  const [showClassSelector, setShowClassSelector] = useState(false);

  const [showClassroomModal, setShowClassroomModal] = useState(false);

  // 🆕 Estado para el modal de Google Sheets
  const [showImportSheets, setShowImportSheets] = useState(false);

  // 🆕 Estado para el modal de anuncio
  const [showGameStartAnnouncement, setShowGameStartAnnouncement] = useState(false);

  const handleDeviceChange = (
    module: keyof PedagogicalDevices, 
    field: string, 
    value: any
  ) => {
    setPedagogicalDevices(prev => ({
      ...prev,
      [module]: {
        ...(prev[module] as any),
        [field]: value
      }
    }));
  };

  const handleImportFromClassroom = (studentNames: string[]) => {
    const currentNames = studentsText.trim();
    const newNames = studentNames.join("\n");
    
    if (currentNames) {
      setStudentsText(currentNames + "\n" + newNames);
    } else {
      setStudentsText(newNames);
    }
  };

  console.log("🟣 SetupScreen render", {
    pathname: location.pathname,
    state: location.state,
  });

  useEffect(() => {
    setLanguage(appLanguage as Language);
  }, [appLanguage]);

  useEffect(() => {
    const state = location.state as any;
    console.log("🔵 useEffect triggered - state:", state);
    const fromLibrary = state?.fromLibrary;
    if (fromLibrary) {
      const csvContent =
        state?.csvContent || sessionStorage.getItem("library_csv_content");
      const csvFilename =
        state?.csvFilename || sessionStorage.getItem("library_csv_filename");
      const csvTitle =
        state?.csvTitle || sessionStorage.getItem("library_csv_title");
      const csvSubject =
        state?.csvSubject || sessionStorage.getItem("library_csv_subject");
      const txtPath = state?.sourceTextPath || null;

      if (txtPath) {
        setSourceTextPath(txtPath);
        console.log("🟢 fromLibrary - sourceTextPath:", txtPath);
      }

      console.log("🟢 fromLibrary - got ", {
        hasContent: !!csvContent,
        contentLength: csvContent?.length,
        csvFilename,
        sourceTextPath: txtPath,
      });

      if (csvTitle && !className) {
        setClassName(csvTitle);
      }

      if (csvSubject && !subject) {
        setSubject(csvSubject);
      }

      if (csvContent && csvFilename) {
        setLibraryCSVTitle(csvTitle || csvFilename);
        processLibraryCSV(csvContent, csvFilename);
      }

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  const processLibraryCSV = async (content: string, filename: string) => {
    console.log("🟢 processLibraryCSV start", {
      filename,
      contentLength: content.length,
    });

    setIsParsing(true);
    setCsvError(null);

    const probe = {
      hasMojibake: hasMojibakeMarkers(content),
      hasBadReplacement: hasVisibleBadReplacement(content),
      score: scoreText(content),
      sample: content.slice(0, 180),
    };
    console.log("🟡 processLibraryCSV encoding probe (before):", {
      filename,
      ...probe,
    });

    const fixed = maybeFixEncodingString(content);

    if (fixed.changed) {
      console.log("🟠 processLibraryCSV encoding fix applied:", {
        filename,
        beforeScore: scoreText(content),
        afterScore: scoreText(fixed.text),
      });
    } else {
      console.log("🟢 processLibraryCSV encoding fix not applied:", {
        filename,
        reason: fixed.reason,
        score: scoreText(content),
      });
    }

    const finalContent = fixed.text;

    if (hasVisibleBadReplacement(finalContent)) {
      console.warn(
        "⚠️ [SetupScreen] El contenido sigue teniendo caracteres de reemplazo tras el best-effort. Posible corrupción previa en el CSV guardado."
      );
    }

    setCsvContentForSave(finalContent);

    try {
      const result = await parseCSV(finalContent);
      console.log("🟢 parseCSV OK", {
        questions: (result as any)?.questions?.length,
        hasResult: !!result,
      });

      setParseResult(result);
      setShowPreview(true);
      setLibraryCSVLoaded(true);

      const blob = new Blob([finalContent], { type: "text/csv;charset=utf-8" });
      const file = new File([blob], filename, { type: "text/csv" });
      setCsvFile(file);

      console.log("🟢 File created and setCsvFile done", {
        name: file.name,
        size: file.size,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al parsear CSV";

      console.log("🔴 parseCSV ERROR", { message, err });

      setParseResult(null);
      setShowPreview(false);
      setCsvError(message);
    } finally {
      setIsParsing(false);
      console.log("🟢 processLibraryCSV end (isParsing false)");
    }
  };

  const parsedNamesInfo = useMemo(() => {
    const raw = studentsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const normalizeKey = (s: string) =>
      s.toLowerCase().replace(/\s+/g, " ").trim();

    const seen = new Set<string>();
    const unique: string[] = [];
    const duplicates: string[] = [];

    for (const name of raw) {
      const key = normalizeKey(name);
      if (seen.has(key)) {
        duplicates.push(name);
      } else {
        seen.add(key);
        unique.push(name);
      }
    }

    return {
      rawCount: raw.length,
      unique,
      uniqueCount: unique.length,
      duplicates,
      duplicateCount: duplicates.length,
    };
  }, [studentsText]);

  const { canProceed: studentsConfigValid } = useStudentValidation(
    numberOfTeams,
    studentsPerTeam,
    parsedNamesInfo.uniqueCount
  );

  // Textos según idioma del juego (language) usando traducciones globales + nuevas claves
  const t =
    language === "es"
      ? {
        title: appT.setup.title,
        step1: appT.setup.step1,
        step2: appT.setup.step2,
        step3: appT.setup.step3,
        step4: appT.setup.step4,
        lang: appT.setup.language,
        spanish: appT.setup.spanish,
        english: appT.setup.english,
        portuguese: appT.setup.portuguese,
        className: appT.setup.className,
        subject: appT.setup.subject,
        numTeams: appT.setup.numTeams,
        studentsPerTeam: appT.setup.studentsPerTeam,
        uploadCSV: appT.setup.uploadCSV,
        continue: appT.common.continue,
        back: appT.common.back,
        createGame: appT.setup.createGame,
        assignRandom: appT.setup.assignRandom,
        enterNames: appT.setup.enterNames,
        roomCode: appT.setup.roomCode,
        shareCode: appT.setup.shareCode,
        startGame: appT.setup.startGame,
        totalStudents: appT.setup.totalStudents,
        uniqueStudents: appT.setup.uniqueStudents,
        duplicates: appT.setup.duplicates,
        duplicatesNote: appT.setup.duplicatesNote,
        chooseFromLibrary: appT.setup.chooseFromLibrary,
        orUploadFile: appT.setup.orUploadFile,
        loadedFromLibrary: appT.setup.loadedFromLibrary,
        stage0Section: appT.setup.stage0Section,
        stage0Enable: appT.setup.stage0Enable,
        stage0Desc: appT.setup.stage0Desc,
        stage0Warning: appT.setup.stage0Warning,
        stage0MaterialType: appT.setup.stage0MaterialType,
        stage0MaterialLink: appT.setup.stage0MaterialLink,
        stage0MaterialText: appT.setup.stage0MaterialText,
        stage0MaterialTitle: appT.setup.stage0MaterialTitle,
        stage0MaterialContent: appT.setup.stage0MaterialContent,
        stage0MaterialLinkPlaceholder: appT.setup.stage0MaterialLinkPlaceholder,
        stage0MaterialTextPlaceholder: appT.setup.stage0MaterialTextPlaceholder,
        stage0GeneratePrompt: appT.setup.stage0GeneratePrompt,
        pedagogicalDevicesSection: "🛠️ Dispositivos Pedagógicos Opcionales",
        pedagogicalDevicesDesc: "Configura módulos adicionales según la complejidad del tema y tiempo disponible",
        preReflection: "💭 Reflexión Inicial (5 min antes de comenzar)",
        preReflectionHelp: "Los estudiantes reflexionan sobre su interés en el tema antes de empezar",
        selfEvaluation: "📝 Autoevaluación Individual",
        selfEvalMetacognition: "Incluir preguntas metacognitivas",
        selfEvalValidation: "Requiere validación del profesor",
        groupReflection: "🎤 Reflexión Grupal (Cierre Pedagógico)",
        groupReflectionStrategy: "Estrategia:",
        groupReflectionStrategyTop3: "Top 3 más mencionados",
        groupReflectionStrategyOnePerTeam: "Uno por equipo",
        groupReflectionStrategyManual: "Selección manual del profesor",
        groupReflectionTime: "Tiempo (minutos):",
        recommendationsTitle: "💡 Recomendaciones",
        recommendationPrimary: "Primaria: Juego básico sin módulos adicionales es suficiente",
        recommendationSecondary: "Secundaria: Activa autoevaluación para temas complejos",
        generateWithAI: "Generar con IA",
        analyzingCSV: "Analizando CSV...",
        questionsLoaded: "preguntas cargadas",
        andXMore: "y {count} más",
        loadSaveClass: "Cargar / Guardar curso",
        importFromClassroom: "📚 Importar desde Google Classroom",
        // 🆕 Nueva clave para Google Sheets
        importFromSheets: "📊 Importar desde Google Sheets",
        duplicatesFound: "Duplicados detectados:",
        moveStudentsHint: "Podés mover estudiantes entre equipos seleccionando el equipo destino",
        teamsConfigured: "Equipos configurados",
        saveGamePrompt: "¿Querés guardar este juego para usarlo después?",
        gameSaved: "¡Juego guardado en tu biblioteca!",
        startGameError: "Error al iniciar el juego",
        materialTitle: "Material complementario",
        loadingMaterial: "Cargando material...",
        materialAvailableHint: "Este material estará disponible para los estudiantes durante el juego",
        close: "Cerrar",
        pedagogicalObjectiveTitle: "🎯 Objetivo pedagógico (opcional)",
        pedagogicalObjectiveQuestion: "¿Hacia qué capacidad querés orientar este juego?",
        capacityReminder: "Recordá: en el Generador de Prompts con IA podés crear consignas con operaciones cognitivas orientadas a esta capacidad.",
        goToAIGenerator: "Ir al Generador de IA",
        selfEvaluationTooltip: '💡 Tip importante: Antes de empezar el juego, avisá a tus alumnos que lleven registro mental de quién los ayudó y a quién ayudaron. Esto mejora significativamente la calidad de las respuestas en la autoevaluación.',
        selfEvaluationGuideLink: '📖 Ver guía completa',
        // 🆕 Nueva clave para el botón de anunciar
        announceInClassroom: "📢 Anunciar en Google Classroom",
      }
      : language === "pt"
        ? {
          title: "Configurar Novo Jogo",
          step1: "Passo 1: Informações Básicas",
          step2: "Passo 2: Perguntas",
          step3: "Passo 3: Configurar Equipes",
          step4: "Passo 4: Pronto para Jogar!",
          lang: "Idioma",
          spanish: "Espanhol",
          english: "Inglês",
          portuguese: "Português",
          className: "Nome da turma",
          subject: "Matéria",
          numTeams: "Número de equipes",
          studentsPerTeam: "Alunos por equipe",
          uploadCSV: "Carregar arquivo CSV",
          continue: "Continuar",
          back: "Voltar",
          createGame: "Criar Jogo",
          assignRandom: "Atribuir aleatoriamente",
          enterNames: "Digite os nomes (um por linha)",
          roomCode: "Código da Sala",
          shareCode: "Compartilhe este código com seus alunos",
          startGame: "Iniciar Jogo",
          totalStudents: "Total:",
          uniqueStudents: "Únicos:",
          duplicates: "Duplicados:",
          duplicatesNote: "Duplicados são ignorados na formação das equipes.",
          chooseFromLibrary: "Escolher da biblioteca",
          orUploadFile: "Ou carregue seu próprio arquivo:",
          loadedFromLibrary: "Carregado da biblioteca:",
          stage0Section: "Fase 0: Preparação (opcional)",
          stage0Enable: "Ativar fase de preparação em grupo",
          stage0Desc:
            "As equipes terão acesso ao material de estudo antes de iniciar o jogo.",
          stage0Warning:
            "💡 Primeira vez jogando? Recomendamos pular a Fase 0 e usar um jogo da biblioteca. A Fase 0 é projetada para alunos que já entendem a dinâmica do jogo.",
          stage0MaterialType: "Tipo de material",
          stage0MaterialLink: "Link externo",
          stage0MaterialText: "Texto",
          stage0MaterialTitle: "Título do material",
          stage0MaterialContent: "Conteúdo",
          stage0MaterialLinkPlaceholder: "https://docs.google.com/...",
          stage0MaterialTextPlaceholder:
            "Cole aqui o texto que as equipes devem ler...",
          stage0GeneratePrompt:
            "Precisa de gerar material? Use este prompt com ChatGPT",
          pedagogicalDevicesSection: "🛠️ Dispositivos Pedagógicos Opcionais",
          pedagogicalDevicesDesc: "Configure módulos adicionais conforme a complexidade do tema e tempo disponível",
          preReflection: "💭 Reflexão Inicial (5 min antes de começar)",
          preReflectionHelp: "Os estudantes refletem sobre seu interesse no tema antes de começar",
          selfEvaluation: "📝 Autoavaliação Individual",
          selfEvalMetacognition: "Incluir perguntas metacognitivas",
          selfEvalValidation: "Requer validação do professor",
          groupReflection: "🎤 Reflexão em Grupo (Fechamento Pedagógico)",
          groupReflectionStrategy: "Estratégia:",
          groupReflectionStrategyTop3: "Top 3 mais mencionados",
          groupReflectionStrategyOnePerTeam: "Um por equipe",
          groupReflectionStrategyManual: "Seleção manual do professor",
          groupReflectionTime: "Tempo (minutos):",
          recommendationsTitle: "💡 Recomendações",
          recommendationPrimary: "Ensino fundamental: Jogo básico sem módulos adicionais é suficiente",
          recommendationSecondary: "Ensino médio: Ative a autoavaliação para temas complexos",
          generateWithAI: "Gerar com IA",
          analyzingCSV: "Analisando CSV...",
          questionsLoaded: "perguntas carregadas",
          andXMore: "e mais {count}",
          loadSaveClass: "Carregar / Salvar turma",
          importFromClassroom: "📚 Importar do Google Classroom",
          // 🆕 Nova chave para Google Sheets
          importFromSheets: "📊 Importar do Google Sheets",
          duplicatesFound: "Duplicados detectados:",
          moveStudentsHint: "Você pode mover estudantes entre equipes selecionando a equipe de destino",
          teamsConfigured: "Equipes configuradas",
          saveGamePrompt: "Quer salvar este jogo para usar depois?",
          gameSaved: "Jogo salvo na sua biblioteca!",
          startGameError: "Erro ao iniciar o jogo",
          materialTitle: "Material complementar",
          loadingMaterial: "Carregando material...",
          materialAvailableHint: "Este material estará disponível para os estudantes durante o jogo",
          close: "Fechar",
          pedagogicalObjectiveTitle: "🎯 Objetivo pedagógico (opcional)",
          pedagogicalObjectiveQuestion: "Para qual capacidade você quer orientar este jogo?",
          capacityReminder: "Lembre-se: no Gerador de Prompts com IA você pode criar consignas com operações cognitivas orientadas a esta capacidade.",
          goToAIGenerator: "Ir ao Gerador de IA",
          selfEvaluationTooltip: '💡 Dica importante: Antes de começar o jogo, avise seus alunos para manterem um registro mental de quem os ajudou e quem eles ajudaram. Isso melhora significativamente a qualidade das respostas na autoavaliação.',
          selfEvaluationGuideLink: '📖 Ver guia completo',
          // 🆕 Nova chave
          announceInClassroom: "📢 Anunciar no Google Classroom",
        }
        : {
          title: "Setup New Game",
          step1: "Step 1: Basic Information",
          step2: "Step 2: Questions",
          step3: "Step 3: Setup Teams",
          step4: "Step 4: Ready to Play!",
          lang: "Language",
          spanish: "Español",
          english: "English",
          portuguese: "Português",
          className: "Class name",
          subject: "Subject",
          numTeams: "Number of teams",
          studentsPerTeam: "Students per team",
          uploadCSV: "Upload CSV file",
          continue: "Continue",
          back: "Back",
          createGame: "Create Game",
          assignRandom: "Assign randomly",
          enterNames: "Enter names (one per line)",
          roomCode: "Room Code",
          shareCode: "Share this code with your students",
          startGame: "Start Game",
          totalStudents: "Total:",
          uniqueStudents: "Unique:",
          duplicates: "Duplicates:",
          duplicatesNote: "Duplicates are ignored when building teams.",
          chooseFromLibrary: "Choose from library",
          orUploadFile: "Or upload your own file:",
          loadedFromLibrary: "Loaded from library:",
          stage0Section: "Stage 0: Preparation (optional)",
          stage0Enable: "Enable group preparation stage",
          stage0Desc:
            "Teams will have access to study material before starting the game.",
          stage0Warning:
            "💡 First time playing? We recommend skipping Stage 0 and using a game from the library. Stage 0 is designed for students who already understand the game dynamics.",
          stage0MaterialType: "Material type",
          stage0MaterialLink: "External link",
          stage0MaterialText: "Text",
          stage0MaterialTitle: "Material title",
          stage0MaterialContent: "Content",
          stage0MaterialLinkPlaceholder: "https://docs.google.com/...",
          stage0MaterialTextPlaceholder:
            "Paste here the text that teams should read...",
          stage0GeneratePrompt:
            "Need to generate material? Use this prompt with ChatGPT",
          pedagogicalDevicesSection: "🛠️ Optional Pedagogical Devices",
          pedagogicalDevicesDesc: "Configure additional modules based on topic complexity and available time",
          preReflection: "💭 Initial Reflection (5 min before starting)",
          preReflectionHelp: "Students reflect on their interest in the topic before starting",
          selfEvaluation: "📝 Individual Self-Evaluation",
          selfEvalMetacognition: "Include metacognitive questions",
          selfEvalValidation: "Requires teacher validation",
          groupReflection: "🎤 Group Reflection (Pedagogical Closure)",
          groupReflectionStrategy: "Strategy:",
          groupReflectionStrategyTop3: "Top 3 most mentioned",
          groupReflectionStrategyOnePerTeam: "One per team",
          groupReflectionStrategyManual: "Teacher's manual selection",
          groupReflectionTime: "Time (minutes):",
          recommendationsTitle: "💡 Recommendations",
          recommendationPrimary: "Primary: Basic game without additional modules is sufficient",
          recommendationSecondary: "Secondary: Enable self-evaluation for complex topics",
          generateWithAI: "Generate with AI",
          analyzingCSV: "Analyzing CSV...",
          questionsLoaded: "questions loaded",
          andXMore: "and {count} more",
          loadSaveClass: "Load / Save class",
          importFromClassroom: "📚 Import from Google Classroom",
          // 🆕 New key for Google Sheets
          importFromSheets: "📊 Import from Google Sheets",
          duplicatesFound: "Duplicates found:",
          moveStudentsHint: "You can move students between teams by selecting the destination team",
          teamsConfigured: "Teams configured",
          saveGamePrompt: "Do you want to save this game for later use?",
          gameSaved: "Game saved to your library!",
          startGameError: "Error starting game",
          materialTitle: "Supplementary material",
          loadingMaterial: "Loading material...",
          materialAvailableHint: "This material will be available to students during the game",
          close: "Close",
          pedagogicalObjectiveTitle: "🎯 Pedagogical objective (optional)",
          pedagogicalObjectiveQuestion: "What capacity do you want to focus this game on?",
          capacityReminder: "Remember: in the AI Prompt Generator you can create questions with cognitive operations oriented to this capacity.",
          goToAIGenerator: "Go to AI Generator",
          selfEvaluationTooltip: '💡 Important tip: Before starting the game, tell your students to keep a mental record of who helped them and who they helped. This significantly improves the quality of responses in the self-evaluation.',
          selfEvaluationGuideLink: '📖 See full guide',
          // 🆕 New key
          announceInClassroom: "📢 Announce on Google Classroom",
        };

  // ✅ LOGS DE VERIFICACIÓN
  console.log('🌐 Idioma actual:', language);
  console.log('📦 Clave pedagogicalDevicesSection:', t.pedagogicalDevicesSection);
  console.log('📦 Clave preReflection:', t.preReflection);

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setLibraryCSVLoaded(false);
    setLibraryCSVTitle(null);

    setIsParsing(true);
    setCsvError(null);

    try {
      const decoded = await decodeFileBestEffort(file);

      console.log("🧪 [SetupScreen] upload decode candidates:", {
        fileName: file.name,
        chosen: decoded.chosen,
        candidates: decoded.candidates,
      });

      let text = decoded.text;

      const fixed = maybeFixEncodingString(text);
      if (fixed.changed) {
        console.log("🟠 [SetupScreen] upload encoding fix applied:", {
          fileName: file.name,
          beforeScore: scoreText(text),
          afterScore: scoreText(fixed.text),
        });
        text = fixed.text;
      } else {
        console.log("🟢 [SetupScreen] upload encoding fix not applied:", {
          fileName: file.name,
          reason: fixed.reason,
          score: scoreText(text),
        });
      }

      if (hasVisibleBadReplacement(text)) {
        console.warn(
          "⚠️ [SetupScreen] Upload: el contenido sigue teniendo caracteres de reemplazo tras el decode+best-effort. Recomendación: guardar el CSV como UTF-8 (LibreOffice) o convertir en lote."
        );
      }

      setCsvContentForSave(text);

      const result = await parseCSV(text);
      setParseResult(result);
      setShowPreview(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al parsear CSV";
      setParseResult(null);
      setShowPreview(false);
      setCsvError(message);
    } finally {
      setIsParsing(false);
    }
  };

  const assignStudentsRandomly = () => {
    const uniqueNames = parsedNamesInfo.unique;

    if (uniqueNames.length === 0) {
      alert(appT.errors.enterStudentNames);
      return;
    }

    const shuffled = [...uniqueNames].sort(() => Math.random() - 0.5);
    const newTeams: Team[] = [];

    const teamNames =
      gameMode === "coopetition" ? TEAM_PROFESSIONAL : TEAM_ANIMALS;

    for (let i = 0; i < numberOfTeams; i++) {
      const teamId = `team${String.fromCharCode(65 + i)}`;
      const teamPlayers: Player[] = [];

      for (let j = 0; j < studentsPerTeam; j++) {
        const studentIndex = i * studentsPerTeam + j;
        if (studentIndex < shuffled.length) {
          teamPlayers.push({
            id: `player${studentIndex + 1}`,
            name: shuffled[studentIndex],
            score: 0,
            consecutiveLastPlace: 0,
          });
        }
      }

      const teamName = `${teamNames[i].emoji} ${
        language === "en" 
          ? teamNames[i].nameEn 
          : language === "pt" 
            ? (teamNames[i].namePt || teamNames[i].name) 
            : teamNames[i].name
      }`;

      newTeams.push({
        id: teamId,
        name: teamName,
        players: teamPlayers,
        totalScore: 0,
        stage0Bonus: 0,
      });
    }

    setTeams(newTeams);
  };

  const handleApplySuggestedConfig = (teams: number, perTeam: number) => {
    setNumberOfTeams(teams);
    setStudentsPerTeam(perTeam);
  };

  const moveStudentToTeam = (
    studentId: string,
    fromTeamId: string,
    toTeamId: string
  ) => {
    const updatedTeams = teams.map((team) => {
      if (team.id === fromTeamId) {
        return {
          ...team,
          players: team.players.filter((p) => p.id !== studentId),
        };
      } else if (team.id === toTeamId) {
        const studentToMove = teams
          .find((t) => t.id === fromTeamId)
          ?.players.find((p) => p.id === studentId);

        if (studentToMove) {
          return {
            ...team,
            players: [...team.players, studentToMove],
          };
        }
      }
      return team;
    });

    setTeams(updatedTeams);
  };

  const handleCreateGame = async () => {
    console.log("🔍 handleCreateGame llamado");
    console.log("🔍 className:", className, "| length:", className.length);
    console.log("🔍 subject:", subject, "| length:", subject.length);
    console.log("🔍 currentStep:", currentStep);
    console.log("🔍 pedagogicalDevices:", pedagogicalDevices);

    if (!className || !subject) {
      console.log("❌ Validación falló - className o subject vacío");
      alert(appT.errors.completeFields);
      return;
    }
    if (questions.length === 0) {
      console.log("❌ Validación falló - no hay preguntas cargadas");
      alert(appT.errors.uploadCSV);
      return;
    }
    if (teams.length === 0) {
      console.log("❌ Validación falló - no hay equipos configurados");
      alert(appT.errors.assignStudents);
      return;
    }

    setIsCreating(true);
    try {
      const config: any = {
        level,
        language,
        gameMode: gameMode,
        className,
        numberOfTeams,
        studentsPerTeam,
        subject,
        ratingMode,
        timers: {
          stage1Rating: stage1RatingTimer,
          stage2Hint: stage2HintTimer,
          stage2Answer: stage2AnswerTimer,
          stage2Help: stage2HelpTimer,
        },
        createdAt: Date.now(),
      };

      if (csvFile?.name) {
        config.csvFileName = csvFile.name;
      }
      if (sourceTextPath) {
        config.sourceTextPath = sourceTextPath;
      }
      
      const hasAnyDeviceEnabled = 
        pedagogicalDevices.preReflection?.enabled ||
        pedagogicalDevices.selfEvaluation?.enabled ||
        pedagogicalDevices.groupReflection?.enabled;
      
      if (hasAnyDeviceEnabled) {
        config.pedagogicalDevices = pedagogicalDevices;
      }

      const gameId = await createGame(config);
      setCreatedGameId(gameId);
      await addTeams(gameId, teams);
      await addQuestions(gameId, questions);
      setCurrentStep(4);
      setIsCreating(false);
      setTimeout(() => {
        onGameCreated(gameId);
      }, 2000);
    } catch (error) {
      console.error("🔴 Error creating game:", error);
      alert(appT.errors.creatingGame);
      setIsCreating(false);
    }
  };

  const handleOpenMaterial = async () => {
    if (!sourceTextPath) return;

    setShowMaterialModal(true);

    if (materialContent) return;

    setLoadingMaterial(true);
    try {
      const txtRef = storageRef(storage, sourceTextPath);
      const blob = await getBlob(txtRef);
      const text = await blob.text();
      setMaterialContent(text);
    } catch (error) {
      console.error("Error loading material:", error);
      setMaterialContent("Error al cargar el material. Intentá de nuevo.");
    } finally {
      setLoadingMaterial(false);
    }
  };

  return (
    <div className="setup-screen">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>{theme.icon}</span>
        <h1 style={{ margin: 0 }}>{t.title}</h1>
      </div>
      <p
        style={{
          textAlign: "center",
          color: theme.primary,
          fontWeight: 600,
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        {theme.tagline}
      </p>

      <div className="progress-steps">
        <div
          className={`step ${currentStep >= 1 ? "active" : ""}`}
          style={currentStep >= 1 ? { backgroundColor: theme.primary } : {}}
        >
          1
        </div>
        <div
          className={`step ${currentStep >= 2 ? "active" : ""}`}
          style={currentStep >= 2 ? { backgroundColor: theme.primary } : {}}
        >
          2
        </div>
        <div
          className={`step ${currentStep >= 3 ? "active" : ""}`}
          style={currentStep >= 3 ? { backgroundColor: theme.primary } : {}}
        >
          3
        </div>
        <div
          className={`step ${currentStep >= 4 ? "active" : ""}`}
          style={currentStep >= 4 ? { backgroundColor: theme.primary } : {}}
        >
          4
        </div>
      </div>

      {/* STEP 1 */}
      {currentStep === 1 && (
        <div className="step-content">
          <h2>{t.step1}</h2>

          <div className="form-group">
            <label>{t.lang}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setLanguage("es")}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: language === "es" ? "2px solid #f59e0b" : "2px solid #e2e8f0",
                  backgroundColor: language === "es" ? "#fef3c7" : "#f8fafc",
                  color: language === "es" ? "#b45309" : "#64748b",
                  cursor: "pointer",
                }}
              >
                🇪🇸 {t.spanish}
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: language === "en" ? "2px solid #0891b2" : "2px solid #e2e8f0",
                  backgroundColor: language === "en" ? "#cffafe" : "#f8fafc",
                  color: language === "en" ? "#0e7490" : "#64748b",
                  cursor: "pointer",
                }}
              >
                🇺🇸 {t.english}
              </button>
              <button
                type="button"
                onClick={() => setLanguage("pt")}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: language === "pt" ? "2px solid #22c55e" : "2px solid #e2e8f0",
                  backgroundColor: language === "pt" ? "#dcfce7" : "#f8fafc",
                  color: language === "pt" ? "#16a34a" : "#64748b",
                  cursor: "pointer",
                }}
              >
                🇧🇷 {t.portuguese}
              </button>
            </div>

            <div className="form-group">
              <label>{t.className}</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder={
                  language === "es"
                    ? "3°A - Matemática"
                    : language === "pt"
                      ? "3°A - Matemática"
                      : "Grade 3A - Math"
                }
              />
            </div>

            <div className="form-group">
              <label>{t.subject}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  language === "es"
                    ? "Matemática"
                    : language === "pt"
                      ? "Matemática"
                      : "Mathematics"
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t.numTeams}</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={numberOfTeams}
                  onChange={(e) => setNumberOfTeams(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>{t.studentsPerTeam}</label>
                <input
                  type="number"
                  min="3"
                  max="8"
                  value={studentsPerTeam}
                  onChange={(e) => setStudentsPerTeam(Number(e.target.value))}
                />
              </div>
            </div>

            {/* 🆕 NUEVA SECCIÓN: Dispositivos Pedagógicos Opcionales */}
            <div 
              className="pedagogical-devices-section"
              style={{
                marginTop: 32,
                padding: 20,
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ 
                margin: "0 0 8px 0", 
                fontSize: 16, 
                fontWeight: 700,
                color: "#334155",
              }}>
                {t.pedagogicalDevicesSection}
              </h3>
              <p style={{ 
                margin: "0 0 20px 0", 
                fontSize: 13, 
                color: "#64748b",
              }}>
                {t.pedagogicalDevicesDesc}
              </p>

              {/* Módulo 1: Reflexión Inicial */}
              <div className="device-option" style={{ marginBottom: 16 }}>
                <label 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={pedagogicalDevices.preReflection?.enabled || false}
                    onChange={(e) => handleDeviceChange('preReflection', 'enabled', e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{t.preReflection}</span>
                </label>
                <p style={{ 
                  margin: "6px 0 0 28px", 
                  fontSize: 12, 
                  color: "#94a3b8",
                }}>
                  {t.preReflectionHelp}
                </p>
              </div>

              {/* Módulo 2: Autoevaluación Individual */}
              <div className="device-option" style={{ marginBottom: 16 }}>
                <label 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={pedagogicalDevices.selfEvaluation?.enabled || false}
                    onChange={(e) => handleDeviceChange('selfEvaluation', 'enabled', e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{t.selfEvaluation}</span>
                </label>
                
                {pedagogicalDevices.selfEvaluation?.enabled && (
                  <div 
                    className="sub-options" 
                    style={{ 
                      marginLeft: 28, 
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <label 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={pedagogicalDevices.selfEvaluation?.includeMetacognition || false}
                        onChange={(e) => handleDeviceChange('selfEvaluation', 'includeMetacognition', e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>{t.selfEvalMetacognition}</span>
                    </label>
                    
                    <label 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 8,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={pedagogicalDevices.selfEvaluation?.requiresValidation || false}
                        onChange={(e) => handleDeviceChange('selfEvaluation', 'requiresValidation', e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>{t.selfEvalValidation}</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 🆕 TOOLTIP PARA AUTOEVALUACIÓN (aparece cuando está activada) */}
              {pedagogicalDevices.selfEvaluation?.enabled && (
                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  color: '#92400e',
                  padding: '12px',
                  borderRadius: '8px',
                  marginTop: '12px',
                  fontSize: '0.95rem',
                  marginLeft: '28px', // alineado con sub-opciones
                }}>
                  <p style={{ margin: '0 0 8px 0' }}>{t.selfEvaluationTooltip}</p>
                  <a 
                    href="/teacher-guide#seccion-13" 
                    style={{ 
                      color: '#92400e', 
                      fontWeight: 'bold',
                      textDecoration: 'underline'
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.selfEvaluationGuideLink}
                  </a>
                </div>
              )}

              {/* Módulo 3: Reflexión Grupal */}
              <div className="device-option" style={{ marginBottom: 16 }}>
                <label 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={pedagogicalDevices.groupReflection?.enabled || false}
                    onChange={(e) => handleDeviceChange('groupReflection', 'enabled', e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{t.groupReflection}</span>
                </label>
                
                {pedagogicalDevices.groupReflection?.enabled && (
                  <div 
                    className="sub-options" 
                    style={{ 
                      marginLeft: 28, 
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                        {t.groupReflectionStrategy}
                      </label>
                      <select
                        value={pedagogicalDevices.groupReflection?.strategy || 'top3'}
                        onChange={(e) => handleDeviceChange('groupReflection', 'strategy', e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: 13,
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        <option value="top3">{t.groupReflectionStrategyTop3}</option>
                        <option value="onePerTeam">{t.groupReflectionStrategyOnePerTeam}</option>
                        <option value="manual">{t.groupReflectionStrategyManual}</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                        {t.groupReflectionTime}
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="30"
                        value={pedagogicalDevices.groupReflection?.timeMinutes || 15}
                        onChange={(e) => handleDeviceChange('groupReflection', 'timeMinutes', parseInt(e.target.value))}
                        style={{
                          width: 80,
                          padding: "8px 12px",
                          fontSize: 13,
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div 
                className="recommendations-box"
                style={{
                  marginTop: 16,
                  padding: 12,
                  backgroundColor: "#fef3c7",
                  borderRadius: 8,
                  border: "1px solid #fbbf24",
                }}
              >
                <h4 style={{ margin: "0 0 6px 0", fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                  {t.recommendationsTitle}
                </h4>
                <p style={{ margin: 0, fontSize: 12, color: "#a16207" }}>
                  {level === 'primary' ? t.recommendationPrimary : t.recommendationSecondary}
                </p>
              </div>
            </div>

            {/* 🆕 NUEVA SECCIÓN: Objetivo Pedagógico (Capacidades) */}
            <div 
              className="pedagogical-objective-section"
              style={{
                marginTop: 24,
                padding: 20,
                backgroundColor: "#faf5ff",
                borderRadius: 12,
                border: "2px solid #c4b5fd",
              }}
            >
              <div 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => setShowCapacitySection(!showCapacitySection)}
              >
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 16, 
                  fontWeight: 700,
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  {t.pedagogicalObjectiveTitle}
                </h3>
                <span style={{ fontSize: 14, color: "#7c3aed" }}>
                  {showCapacitySection ? "▲" : "▼"}
                </span>
              </div>

              {showCapacitySection && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ 
                    margin: "0 0 16px 0", 
                    fontSize: 13, 
                    color: "#64748b",
                  }}>
                    {t.pedagogicalObjectiveQuestion}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {[
                      { id: "critical-thinking", icon: "🧠", labelEs: "Pensamiento crítico", labelEn: "Critical thinking", labelPt: "Pensamento crítico" },
                      { id: "problem-solving", icon: "🔍", labelEs: "Resolución de problemas", labelEn: "Problem solving", labelPt: "Resolução de problemas" },
                      { id: "communication", icon: "💬", labelEs: "Comunicación", labelEn: "Communication", labelPt: "Comunicação" },
                      { id: "collaboration", icon: "🤝", labelEs: "Trabajo colaborativo", labelEn: "Collaborative work", labelPt: "Trabalho colaborativo" },
                    ].map((cap) => (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => setSelectedCapacitySetup(
                          selectedCapacitySetup === cap.id ? null : cap.id
                        )}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: selectedCapacitySetup === cap.id 
                            ? "3px solid #8b5cf6" 
                            : "2px solid #e2e8f0",
                          backgroundColor: selectedCapacitySetup === cap.id 
                            ? "#ede9fe" 
                            : "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: selectedCapacitySetup === cap.id ? 600 : 400,
                          color: selectedCapacitySetup === cap.id ? "#7c3aed" : "#475569",
                        }}
                      >
                        <span>{cap.icon}</span>
                        <span>
                          {language === "es" 
                            ? cap.labelEs 
                            : language === "pt" 
                            ? cap.labelPt 
                            : cap.labelEn}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedCapacitySetup && (
                    <div style={{
                      marginTop: 16,
                      padding: 14,
                      backgroundColor: "#f0fdf4",
                      borderRadius: 10,
                      border: "2px solid #86efac",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                        💡 {t.capacityReminder}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPromptGenerator(true)}
                        style={{
                          padding: "10px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: "none",
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        🤖 {t.goToAIGenerator}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="btn-primary"
              onClick={() => setCurrentStep(2)}
              disabled={!className || !subject}
              style={{ marginTop: 24, background: theme.primaryGradient }}
            >
              {t.continue}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {currentStep === 2 && (
        <div className="step-content">
          <h2>{t.step2}</h2>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <button
              className="btn-library"
              onClick={() => navigate("/library")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: `2px solid ${theme.primary}`,
                background: theme.cardHoverBg,
                color: theme.primary,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = theme.primaryGradient;
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = theme.cardHoverBg;
                e.currentTarget.style.color = theme.primary;
              }}
            >
              📚 {t.chooseFromLibrary}
            </button>

            <button
              onClick={() => setShowPromptGenerator(true)}
              style={{
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 600,
                backgroundColor: "#f0fdf4",
                color: "#16a34a",
                border: "2px solid #22c55e",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#f0fdf4";
                e.currentTarget.style.color = "#16a34a";
              }}
            >
              🤖 {t.generateWithAI}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              margin: "20px 0",
              color: "#94a3b8",
            }}
          >
            <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.orUploadFile}</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
          </div>

          <div className="form-group">
            <label>{t.uploadCSV}</label>
            <input type="file" accept=".csv" onChange={handleCSVUpload} />
          </div>

          {isParsing && (
            <div style={{ marginTop: 10 }}>
              {t.analyzingCSV}
            </div>
          )}

          {csvError && (
            <div style={{ marginTop: 10, color: "#c0392b" }}>
              <strong>Error CSV:</strong> {csvError}
            </div>
          )}

          {libraryCSVLoaded && libraryCSVTitle && (
            <div
              className="library-loaded"
              style={{
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              <div>
                ✅ {t.loadedFromLibrary} <strong>{libraryCSVTitle}</strong>
              </div>

              {sourceTextPath && (
                <button
                  onClick={handleOpenMaterial}
                  style={{
                    marginTop: 10,
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: "#f0f9ff",
                    color: "#0369a1",
                    border: "2px solid #0ea5e9",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  📄 {t.materialTitle}
                </button>
              )}
            </div>
          )}

          {questions.length > 0 && (
            <div className="questions-preview">
              <h3>
                ✅ {questions.length} {t.questionsLoaded}
              </h3>
              <ul>
                {questions.slice(0, 3).map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
                {questions.length > 3 && (
                  <li>
                    {t.andXMore.replace('{count}', (questions.length - 3).toString())}
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
              {t.back}
            </button>
            <button
              className="btn-primary"
              onClick={() => setCurrentStep(3)}
              disabled={questions.length === 0}
              style={{ background: theme.primaryGradient }}
            >
              {t.continue}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {currentStep === 3 && (
        <div className="step-content">
          <h2>{t.step3}</h2>

          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowClassSelector(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: `2px solid ${theme.primary}`,
                backgroundColor: "white",
                color: theme.primary,
                cursor: "pointer",
              }}
            >
              📂 {t.loadSaveClass}
            </button>
          </div>

          <div className="form-group">
            <label>{t.enterNames}</label>

            {/* Botón Google Classroom */}
            <button
              type="button"
              onClick={() => setShowClassroomModal(true)}
              style={{
                width: "100%",
                padding: "12px 16px",
                marginBottom: 12,
                backgroundColor: "#fff",
                border: "2px solid #4285f4",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "#4285f4",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4285f4";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.color = "#4285f4";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              {t.importFromClassroom}
            </button>

            {/* 🆕 Botón Google Sheets */}
            <button
              type="button"
              onClick={() => setShowImportSheets(true)}
              style={{
                width: "100%",
                padding: "12px 16px",
                marginBottom: 12,
                backgroundColor: "#fff",
                border: "2px solid #34a853",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "#34a853",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#34a853";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.color = "#34a853";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
              </svg>
              {t.importFromSheets}
            </button>

            <textarea
              rows={10}
              value={studentsText}
              onChange={(e) => setStudentsText(e.target.value)}
              placeholder={
                language === "es"
                  ? "María\nPedro\nAna\n..."
                  : language === "pt"
                    ? "Maria\nPedro\nAna\n..."
                    : "John\nMary\nPeter\n..."
              }
            />
            <small>
              {t.totalStudents} {parsedNamesInfo.rawCount} · {t.uniqueStudents}{" "}
              {parsedNamesInfo.uniqueCount} · {t.duplicates}{" "}
              {parsedNamesInfo.duplicateCount}
              {parsedNamesInfo.duplicateCount > 0 ? ` — ${t.duplicatesNote}` : ""}
            </small>
            {parsedNamesInfo.duplicateCount > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#c0392b" }}>
                <strong>{t.duplicatesFound}</strong>{" "}
                {parsedNamesInfo.duplicates.slice(0, 8).join(", ")}
                {parsedNamesInfo.duplicates.length > 8 ? "…" : ""}
              </div>
            )}

            <StudentConfigValidator
              numberOfTeams={numberOfTeams}
              studentsPerTeam={studentsPerTeam}
              uniqueStudentsCount={parsedNamesInfo.uniqueCount}
              language={language}
              onSuggestConfig={handleApplySuggestedConfig}
            />
          </div>

          <button
            className="btn-secondary"
            onClick={assignStudentsRandomly}
            disabled={!studentsConfigValid}
          >
            {t.assignRandom}
          </button>

          {teams.length > 0 && (
            <div className="teams-preview">
              <h3>✅ {t.teamsConfigured}</h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#7f8c8d",
                  marginBottom: "15px",
                }}
              >
                {t.moveStudentsHint}
              </p>
              <div className="teams-grid">
                {teams.map((team) => (
                  <div key={team.id} className="team-card">
                    <h4>{team.name}</h4>
                    <ul>
                      {team.players.map((p) => (
                        <li key={p.id} className="editable-player">
                          <span>{p.name}</span>
                          <select
                            className="team-selector"
                            value={team.id}
                            onChange={(e) => {
                              if (e.target.value !== team.id) {
                                moveStudentToTeam(p.id, team.id, e.target.value);
                              }
                            }}
                          >
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(2)}>
              {t.back}
            </button>
            <button
              className="btn-primary"
              onClick={handleCreateGame}
              disabled={teams.length === 0 || isCreating}
              style={{ background: theme.primaryGradient }}
            >
              {isCreating ? "..." : t.createGame}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {currentStep === 4 && (
        <div className="step-content step-ready">
          <h2>🎉 {t.step4}</h2>
          {/* 🆕 Se agrega el callback onCodeCreated para capturar el código real */}
          <RoomCodeDisplay 
            gameId={createdGameId} 
            onCodeCreated={(code) => setRoomCode(code)} 
          />

          {/* Botón para anunciar en Classroom */}
          <div style={{ 
            marginTop: 20, 
            marginBottom: 20,
            display: "flex",
            justifyContent: "center",
          }}>
            <button
              onClick={() => setShowGameStartAnnouncement(true)}
              style={{
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: "2px solid #4285f4",
                backgroundColor: "white",
                color: "#4285f4",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4285f4";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "#4285f4";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              {t.announceInClassroom}
            </button>
          </div>

          {user && csvContentForSave && !gameSaved && (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                backgroundColor: "#f0f9ff",
                borderRadius: 12,
                border: "2px solid #0ea5e9",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 24 }}>💾</span>
              <p
                style={{
                  margin: "8px 0 12px",
                  fontSize: 14,
                  color: "#0369a1",
                }}
              >
                {t.saveGamePrompt}
              </p>
              <button
                onClick={() => setShowSaveModal(true)}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "#0ea5e9",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                💾 {appT.teacherLibrary.saveGame}
              </button>
            </div>
          )}

          {gameSaved && (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                backgroundColor: "#f0fdf4",
                borderRadius: 12,
                border: "2px solid #22c55e",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 24 }}>✅</span>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  color: "#16a34a",
                }}
              >
                {t.gameSaved}
              </p>
            </div>
          )}

          <button
            className="btn-primary btn-large"
            onClick={async () => {
              try {
                await startGame(createdGameId);
                navigate(`/classroom/${createdGameId}`);
              } catch (error) {
                console.error("Error starting game:", error);
                alert(t.startGameError);
              }
            }}
            style={{ background: theme.primaryGradient }}
          >
            {t.startGame}
          </button>
        </div>
      )}

      {showPreview && parseResult && (
        <CSVPreview
          parseResult={parseResult}
          onConfirm={(parsedQuestions: ParsedQuestion[]) => {
            const converted: Question[] = parsedQuestions.map((q) => ({
              id: q.id,
              text: q.text,
              hint: q.hint ?? "",
              suggestedStage: q.suggestedStage,
            }));
            setQuestions(converted);
            setShowPreview(false);
            setParseResult(null);
          }}
          onCancel={() => {
            setShowPreview(false);
            setParseResult(null);
          }}
          onOpenPromptGenerator={() => {
            setShowPreview(false);
            setParseResult(null);
            setShowPromptGenerator(true);
          }}
          onGoToStage0={() => {
            setShowPreview(false);
            setParseResult(null);
            navigate('/setup');
          }}
        />
      )}

      {showSaveModal && user && (
        <SaveGameModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          csvContent={csvContentForSave}
          csvFileName={csvFile?.name}
          initialData={{
            title: libraryCSVTitle || csvFile?.name?.replace(".csv", "") || "",
            topic: subject,
            language: language as "es" | "en" | "pt",
          }}
          onSave={async (gameData: NewTeacherGame, csvContent: string) => {
            await saveTeacherGame(
              user.uid,
              user.displayName || "Docente",
              user.email || "",
              gameData,
              csvContent
            );
            setGameSaved(true);
            setShowSaveModal(false);
          }}
        />
      )}

      {showMaterialModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 10000,
          }}
          onClick={() => setShowMaterialModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              width: "100%",
              maxWidth: 700,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f0f9ff",
                borderRadius: "16px 16px 0 0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0369a1",
                }}
              >
                📄 {t.materialTitle}
              </h3>
              <button
                onClick={() => setShowMaterialModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 24,
              }}
            >
              {loadingMaterial ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#64748b",
                  }}
                >
                  ⏳ {t.loadingMaterial}
                </div>
              ) : (
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    fontFamily: "inherit",
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "#334155",
                  }}
                >
                  {materialContent}
                </pre>
              )}
            </div>

            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "#64748b" }}>
                💡 {t.materialAvailableHint}
              </span>
              <button
                onClick={() => setShowMaterialModal(false)}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: "#0ea5e9",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClassSelectorModal
        isOpen={showClassSelector}
        onClose={() => setShowClassSelector(false)}
        onSelectClass={(students, teams, perTeam) => {
          setStudentsText(students.join('\n'));
          setNumberOfTeams(teams);
          setStudentsPerTeam(perTeam);
        }}
        currentStudents={parsedNamesInfo.unique}
        currentTeams={numberOfTeams}
        currentStudentsPerTeam={studentsPerTeam}
        language={language}
      />

      <ImportFromClassroomModal
        isOpen={showClassroomModal}
        onClose={() => setShowClassroomModal(false)}
        onImport={handleImportFromClassroom}
        language={language}
      />

      {/* 🆕 Modal de Google Sheets */}
      <ImportFromSheetsModal
        isOpen={showImportSheets}
        onClose={() => setShowImportSheets(false)}
        onImport={(students) => {
          setStudentsText(students.join('\n'));
          setShowImportSheets(false);
        }}
        language={language}
      />

      <PromptGeneratorModal
        isOpen={showPromptGenerator}
        onClose={() => setShowPromptGenerator(false)}
      />

      {/* 🆕 Modal de anuncio de inicio de juego (con roomCode real) */}
      <GameStartAnnouncementModal
        isOpen={showGameStartAnnouncement}
        onClose={() => setShowGameStartAnnouncement(false)}
        gameId={createdGameId}
        roomCode={roomCode}  // ← ahora se pasa el código real capturado
        gameName={className || "Traffic Light Game"}
        language={language}
      />
    </div>
  );
}