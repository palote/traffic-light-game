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
import { RoomCodeDisplay } from "./RoomCodeDisplay"; // ✅ NUEVO
import { useGameMode } from "../contexts/GameModeContext";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";

import { parseCSV } from "../utils/csvParser";
import type { ParseResult, ParsedQuestion } from "../utils/csvParser";

import { saveTeacherGame } from "../services/teacherLibraryService";
import type { NewTeacherGame } from "../types/teacherLibrary";

// 🦁 Nombres de equipos con animales (Traffic Light - niños)
const TEAM_ANIMALS = [
  { emoji: "🦁", name: "Leones", nameEn: "Lions" },
  { emoji: "🐯", name: "Tigres", nameEn: "Tigers" },
  { emoji: "🐻", name: "Osos", nameEn: "Bears" },
  { emoji: "🦅", name: "Águilas", nameEn: "Eagles" },
  { emoji: "🦊", name: "Zorros", nameEn: "Foxes" },
  { emoji: "🐺", name: "Lobos", nameEn: "Wolves" },
  { emoji: "🦒", name: "Jirafas", nameEn: "Giraffes" },
  { emoji: "🐘", name: "Elefantes", nameEn: "Elephants" },
  { emoji: "🦓", name: "Cebras", nameEn: "Zebras" },
  { emoji: "🦘", name: "Canguros", nameEn: "Kangaroos" },
];

// 🎯 Nombres de equipos profesionales (Coopetition - adolescentes/adultos)
const TEAM_PROFESSIONAL = [
  { emoji: "🔷", name: "Estrategas", nameEn: "Strategists" },
  { emoji: "🔶", name: "Innovadores", nameEn: "Innovators" },
  { emoji: "💎", name: "Vanguardia", nameEn: "Vanguard" },
  { emoji: "⚡", name: "Impulso", nameEn: "Momentum" },
  { emoji: "🎯", name: "Enfoque", nameEn: "Focus" },
  { emoji: "🚀", name: "Pioneros", nameEn: "Pioneers" },
  { emoji: "💡", name: "Creativos", nameEn: "Creatives" },
  { emoji: "🔥", name: "Impacto", nameEn: "Impact" },
  { emoji: "⭐", name: "Élite", nameEn: "Elite" },
  { emoji: "🌟", name: "Líderes", nameEn: "Leaders" },
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

// típicos cuando se ve “Ã¡”, “Â¿”, “â€””, etc.
function hasMojibakeMarkers(text: string): boolean {
  return /Ã|Â|â€/.test(text);
}

// caso típico: carácter de reemplazo "�" (U+FFFD)
function hasVisibleBadReplacement(text: string): boolean {
  return /\uFFFD/.test(text);
}

// score más alto = peor
function scoreText(text: string): number {
  const repl = (text.match(/\uFFFD/g) || []).length;
  const mojibake = (text.match(/Ã|Â|â€/g) || []).length;
  const visible = repl;
  return repl * 10 + visible * 8 + mojibake * 3;
}

// Reparación clásica: latin1-string → bytes → decode UTF-8
// Sirve para transformar "DecÃ­" → "Decí"
function repairLatin1ToUtf8(text: string): string {
  const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0) & 0xff));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * Intenta “mejorar” el string si parece mojibake.
 * Importante: si el texto YA viene con '�' fuerte,
 * puede estar corrupto y no hay arreglo perfecto: por eso solo aplicamos si mejora el score.
 */
function maybeFixEncodingString(
  input: string
): { text: string; changed: boolean; reason: string } {
  const original = input ?? "";
  const origScore = scoreText(original);

  // Si no hay señales, no tocamos nada
  if (!hasMojibakeMarkers(original) && !hasVisibleBadReplacement(original)) {
    return { text: original, changed: false, reason: "no_markers" };
  }

  // Si ya tiene muchos '�', sin bytes no hay magia: no intentamos "repair" a ciegas.
  // (Evita empeorar textos que ya están dañados.)
  const replCount = (original.match(/\uFFFD/g) || []).length;
  if (replCount >= 3 && !hasMojibakeMarkers(original)) {
    return { text: original, changed: false, reason: "has_replacement_no_bytes" };
  }

  // Intento: repair latin1→utf8
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

/**
 * ✅ Decode robusto para archivos locales (tenemos bytes).
 * Probamos UTF-8 y fallbacks comunes (windows-1252 / iso-8859-1)
 * y elegimos el que minimiza scoreText().
 */
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

  // elegir el mejor score; si empatan, priorizar utf-8
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
  const { t: appT } = useI18n(); // Traducciones globales de la app

  // Estado del formulario
  const [level] = useState<GameLevel>("primary");
  const [ratingMode] = useState<"devices" | "physical-cards">("devices");
  const [language, setLanguage] = useState<Language>(
    gameMode === "coopetition" ? "en" : "es"
  );
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState(6);
  const [studentsPerTeam, setStudentsPerTeam] = useState(5);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Texto de estudiantes
  const [studentsText, setStudentsText] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Timers
  const [stage1RatingTimer] = useState(30);
  const [stage2HintTimer] = useState(60);
  const [stage2AnswerTimer] = useState(45);
  const [stage2HelpTimer] = useState(30);

  // Equipos y jugadores
  const [teams, setTeams] = useState<Team[]>([]);

  // UI State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [createdGameId, setCreatedGameId] = useState<string>("");

  // Estado para CSV de biblioteca
  const [libraryCSVLoaded, setLibraryCSVLoaded] = useState(false);
  const [libraryCSVTitle, setLibraryCSVTitle] = useState<string | null>(null);

  // Estado para guardar juego
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [csvContentForSave, setCsvContentForSave] = useState<string>("");
  const [gameSaved, setGameSaved] = useState(false);

  // Estado para generador de prompts
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  // ✅ NUEVO: Material complementario (TXT)
  const [sourceTextPath, setSourceTextPath] = useState<string | null>(null);
  // ✅ NUEVO: Modal de material complementario para el profesor
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialContent, setMaterialContent] = useState<string | null>(null);
  const [loadingMaterial, setLoadingMaterial] = useState(false);

  // 🔴 debug render
  console.log("🟣 SetupScreen render", {
    pathname: location.pathname,
    state: location.state,
  });

  // Actualizar idioma cuando cambia el modo
  useEffect(() => {
    setLanguage(gameMode === "coopetition" ? "en" : "es");
  }, [gameMode]);

  // Detectar si viene de la biblioteca
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

      // ✅ Pre-llenar className con csvTitle si está vacío
      if (csvTitle && !className) {
        setClassName(csvTitle);
      }

      // ✅ Pre-llenar subject si está vacío
      if (csvSubject && !subject) {
        setSubject(csvSubject);
      }

      // ✅ Procesar CSV, pero NO avanzar automáticamente al Paso 2
      if (csvContent && csvFilename) {
        setLibraryCSVTitle(csvTitle || csvFilename);
        processLibraryCSV(csvContent, csvFilename);
        // ⚠️ REMOVIDO: setCurrentStep(2);
      }

      window.history.replaceState({}, document.title);
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const processLibraryCSV = async (content: string, filename: string) => {
    console.log("🟢 processLibraryCSV start", {
      filename,
      contentLength: content.length,
    });

    setIsParsing(true);
    setCsvError(null);

    // ✅ Guardar para SaveGameModal (guardamos el contenido “mejorado” si mejora)
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

    // ✅ Best effort: corregir solo si mejora (con string; no tenemos bytes)
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

    // ⚠️ Si sigue habiendo '�' acá, es señal de corrupción previa (ya no es "solo decode")
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

      // ✅ File para compatibilidad con tu flujo
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

  // Textos según idioma del juego (language) usando traducciones globales
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
        portuguese: "Portugués", // ✅ Añadido
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
          portuguese: "Português", // ✅ Añadido
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
            "Precisa gerar material? Use este prompt com ChatGPT",
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
          portuguese: "Português", // ✅ Añadido
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
        };

  /**
   * ✅ SUBIDA LOCAL: ahora leemos BYTES y decodificamos con fallback.
   * Esto arregla el caso "LibreOffice se ve bien pero en la app aparece Nombre cortado".
   */
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

      // 1) string decodificado por bytes (robusto)
      let text = decoded.text;

      // 2) si aun así hay mojibake, intentamos reparación de string (solo si mejora)
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

      // ⚠️ Si sigue habiendo '�', te lo avisamos: probablemente el archivo esté realmente dañado
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

    // ✅ Elegir nombres según el modo de juego
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

      let teamName = "";
      if (language === "es") {
        teamName = `${teamNames[i].emoji} ${teamNames[i].name}`;
      } else if (language === "pt") {
        // Para portugués, usa los nombres en inglés como base (puedes personalizar si tienes nombres en portugués)
        teamName = `${teamNames[i].emoji} ${teamNames[i].nameEn}`;
      } else {
        teamName = `${teamNames[i].emoji} ${teamNames[i].nameEn}`;
      }

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
    // 🔍 DEBUG - agregar temporalmente
    console.log("🔍 handleCreateGame llamado");
    console.log("🔍 className:", className, "| length:", className.length);
    console.log("🔍 subject:", subject, "| length:", subject.length);
    console.log("🔍 currentStep:", currentStep);

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

      // Solo agregar si tiene valor
      if (csvFile?.name) {
        config.csvFileName = csvFile.name;
      }
      // ✅ NUEVO: guardar sourceTextPath si existe
      if (sourceTextPath) {
        config.sourceTextPath = sourceTextPath;
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

  // ✅ NUEVO: Cargar material complementario
  const handleOpenMaterial = async () => {
    if (!sourceTextPath) return;

    setShowMaterialModal(true);

    if (materialContent) return; // Ya lo cargamos antes

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
            {/* Reemplazamos los radio buttons por botones */}
            {/* Idioma del juego */}
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
                🇪🇸 {appT.setup?.spanish || "Español"}
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
                🇺🇸 {appT.setup?.english || "English"}
              </button>
              {/* ✅ NUEVO: Portugués */}
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
                🇧🇷 {appT.setup?.portuguese || "Português"}
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
              🤖
              {language === "es"
                ? "Generar con IA"
                : language === "pt"
                  ? "Gerar com IA"
                  : "Generate with AI"}
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
              {language === "es"
                ? "Analizando CSV..."
                : language === "pt"
                  ? "Analisando CSV..."
                  : "Analyzing CSV..."}
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

              {/* ✅ NUEVO: Botón para ver material complementario */}
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
                  📄{" "}
                  {language === "es"
                    ? "Ver material complementario"
                    : language === "pt"
                      ? "Ver material complementar"
                      : "View supplementary material"}
                </button>
              )}
            </div>
          )}

          {questions.length > 0 && (
            <div className="questions-preview">
              <h3>
                ✅ {questions.length}{" "}
                {language === "es"
                  ? "preguntas cargadas"
                  : language === "pt"
                    ? "perguntas carregadas"
                    : "questions loaded"}
              </h3>
              <ul>
                {questions.slice(0, 3).map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
                {questions.length > 3 && (
                  <li>
                    ...
                    {language === "es"
                      ? `y ${questions.length - 3} más`
                      : language === "pt"
                        ? `e mais ${questions.length - 3}`
                        : `and ${questions.length - 3} more`}
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

          <div className="form-group">
            <label>{t.enterNames}</label>
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
                <strong>
                  {language === "es"
                    ? "Duplicados detectados:"
                    : language === "pt"
                      ? "Duplicados detectados:"
                      : "Duplicates found:"}
                </strong>{" "}
                {parsedNamesInfo.duplicates.slice(0, 8).join(", ")}
                {parsedNamesInfo.duplicates.length > 8 ? "…" : ""}
              </div>
            )}
          </div>

          <button
            className="btn-secondary"
            onClick={assignStudentsRandomly}
            disabled={parsedNamesInfo.uniqueCount === 0}
          >
            {t.assignRandom}
          </button>

          {teams.length > 0 && (
            <div className="teams-preview">
              <h3>
                ✅{" "}
                {language === "es"
                  ? "Equipos configurados"
                  : language === "pt"
                    ? "Equipes configuradas"
                    : "Teams configured"}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#7f8c8d",
                  marginBottom: "15px",
                }}
              >
                {language === "es"
                  ? "Podés mover estudiantes entre equipos seleccionando el equipo destino"
                  : language === "pt"
                    ? "Você pode mover estudantes entre equipes selecionando a equipe de destino"
                    : "You can move students between teams by selecting the destination team"}
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
          <RoomCodeDisplay gameId={createdGameId} />

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
                {language === "es"
                  ? "¿Querés guardar este juego para usarlo después?"
                  : language === "pt"
                    ? "Quer salvar este jogo para usar depois?"
                    : "Do you want to save this game for later use?"}
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
                {language === "es"
                  ? "¡Juego guardado en tu biblioteca!"
                  : language === "pt"
                    ? "Jogo salvo na sua biblioteca!"
                    : "Game saved to your library!"}
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
                alert(
                  language === "es"
                    ? "Error al iniciar el juego"
                    : language === "pt"
                      ? "Erro ao iniciar o jogo"
                      : "Error starting game"
                );
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

      {/* ✅ NUEVO: Modal de material complementario */}
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
            {/* Header */}
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
                📄{" "}
                {language === "es"
                  ? "Material complementario"
                  : language === "pt"
                    ? "Material complementar"
                    : "Supplementary material"}
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

            {/* Content */}
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
                  ⏳{" "}
                  {language === "es"
                    ? "Cargando material..."
                    : language === "pt"
                      ? "Carregando material..."
                      : "Loading material..."}
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

            {/* Footer */}
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
                💡{" "}
                {language === "es"
                  ? "Este material estará disponible para los estudiantes durante el juego"
                  : language === "pt"
                    ? "Este material estará disponível para os estudantes durante o jogo"
                    : "This material will be available to students during the game"}
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
                {language === "es"
                  ? "Cerrar"
                  : language === "pt"
                    ? "Fechar"
                    : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PromptGeneratorModal
        isOpen={showPromptGenerator}
        onClose={() => setShowPromptGenerator(false)}
      />
    </div>
  );
}
