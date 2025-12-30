// src/components/SetupScreen.tsx

import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SetupScreen.css";

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
  { emoji: '🦁', name: 'Leones', nameEn: 'Lions' },
  { emoji: '🐯', name: 'Tigres', nameEn: 'Tigers' },
  { emoji: '🐻', name: 'Osos', nameEn: 'Bears' },
  { emoji: '🦅', name: 'Águilas', nameEn: 'Eagles' },
  { emoji: '🦊', name: 'Zorros', nameEn: 'Foxes' },
  { emoji: '🐺', name: 'Lobos', nameEn: 'Wolves' },
  { emoji: '🦒', name: 'Jirafas', nameEn: 'Giraffes' },
  { emoji: '🐘', name: 'Elefantes', nameEn: 'Elephants' },
  { emoji: '🦓', name: 'Cebras', nameEn: 'Zebras' },
  { emoji: '🦘', name: 'Canguros', nameEn: 'Kangaroos' },
];

// 🎯 Nombres de equipos profesionales (Coopetition - adolescentes/adultos)
const TEAM_PROFESSIONAL = [
  { emoji: '🔷', name: 'Estrategas', nameEn: 'Strategists' },
  { emoji: '🔶', name: 'Innovadores', nameEn: 'Innovators' },
  { emoji: '💎', name: 'Vanguardia', nameEn: 'Vanguard' },
  { emoji: '⚡', name: 'Impulso', nameEn: 'Momentum' },
  { emoji: '🎯', name: 'Enfoque', nameEn: 'Focus' },
  { emoji: '🚀', name: 'Pioneros', nameEn: 'Pioneers' },
  { emoji: '💡', name: 'Creativos', nameEn: 'Creatives' },
  { emoji: '🔥', name: 'Impacto', nameEn: 'Impact' },
  { emoji: '⭐', name: 'Élite', nameEn: 'Elite' },
  { emoji: '🌟', name: 'Líderes', nameEn: 'Leaders' },
];

interface SetupScreenProps {
  onGameCreated: (gameId: string) => void;
}

export function SetupScreen({ onGameCreated }: SetupScreenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode: gameMode, theme } = useGameMode();
  const { user } = useAuth();
  const { t: appT } = useI18n(); // Traducciones globales de la app

  // Estado del formulario
  const [level] = useState<GameLevel>('primary');
  const [ratingMode] = useState<'devices' | 'physical-cards'>('devices');
  const [language, setLanguage] = useState<Language>(gameMode === 'coopetition' ? 'en' : 'es');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState(6);
  const [studentsPerTeam, setStudentsPerTeam] = useState(5);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Texto de estudiantes
  const [studentsText, setStudentsText] = useState('');

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
  const [roomCode, setRoomCode] = useState('');
  const [createdGameId, setCreatedGameId] = useState<string>('');

  // Estado para CSV de biblioteca
  const [libraryCSVLoaded, setLibraryCSVLoaded] = useState(false);
  const [libraryCSVTitle, setLibraryCSVTitle] = useState<string | null>(null);
  
  // Estado para guardar juego
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [csvContentForSave, setCsvContentForSave] = useState<string>('');
  const [gameSaved, setGameSaved] = useState(false);

  // Estado para generador de prompts
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);

  // Actualizar idioma cuando cambia el modo
  useEffect(() => {
    setLanguage(gameMode === 'coopetition' ? 'en' : 'es');
  }, [gameMode]);

  // Detectar si viene de la biblioteca
  useEffect(() => {
    const fromLibrary = location.state?.fromLibrary;
    
    if (fromLibrary) {
      const csvContent = sessionStorage.getItem('library_csv_content');
      const csvFilename = sessionStorage.getItem('library_csv_filename');
      const csvTitle = sessionStorage.getItem('library_csv_title');
      const csvSubject = sessionStorage.getItem('library_csv_subject');
      
      if (csvContent && csvFilename) {
        if (csvSubject && !subject) {
          setSubject(csvSubject);
        }
        
        setLibraryCSVTitle(csvTitle || csvFilename);
        setCurrentStep(2);
        processLibraryCSV(csvContent, csvFilename);
        
        sessionStorage.removeItem('library_csv_content');
        sessionStorage.removeItem('library_csv_filename');
        sessionStorage.removeItem('library_csv_title');
        sessionStorage.removeItem('library_csv_subject');
        sessionStorage.removeItem('library_csv_grade');
      }
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const processLibraryCSV = async (content: string, filename: string) => {
    setIsParsing(true);
    setCsvError(null);
    setCsvContentForSave(content); // Guardar para SaveGameModal

    try {
      const result = await parseCSV(content);
      setParseResult(result);
      setShowPreview(true);
      setLibraryCSVLoaded(true);
      
      const blob = new Blob([content], { type: "text/csv" });
      const file = new File([blob], filename, { type: "text/csv" });
      setCsvFile(file);
      
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

  const parsedNamesInfo = useMemo(() => {
    const raw = studentsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

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
  const t = language === 'es'
    ? {
      title: appT.setup.title,
      step1: appT.setup.step1,
      step2: appT.setup.step2,
      step3: appT.setup.step3,
      step4: appT.setup.step4,
      lang: appT.setup.language,
      spanish: appT.setup.spanish,
      english: appT.setup.english,
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
    : {
      title: 'Setup New Game',
      step1: 'Step 1: Basic Information',
      step2: 'Step 2: Questions',
      step3: 'Step 3: Setup Teams',
      step4: 'Step 4: Ready to Play!',
      lang: 'Language',
      spanish: 'Español',
      english: 'English',
      className: 'Class name',
      subject: 'Subject',
      numTeams: 'Number of teams',
      studentsPerTeam: 'Students per team',
      uploadCSV: 'Upload CSV file',
      continue: 'Continue',
      back: 'Back',
      createGame: 'Create Game',
      assignRandom: 'Assign randomly',
      enterNames: 'Enter names (one per line)',
      roomCode: 'Room Code',
      shareCode: 'Share this code with your students',
      startGame: 'Start Game',
      totalStudents: 'Total:',
      uniqueStudents: 'Unique:',
      duplicates: 'Duplicates:',
      duplicatesNote: 'Duplicates are ignored when building teams.',
      chooseFromLibrary: 'Choose from library',
      orUploadFile: 'Or upload your own file:',
      loadedFromLibrary: 'Loaded from library:',
      stage0Section: 'Stage 0: Preparation (optional)',
      stage0Enable: 'Enable group preparation stage',
      stage0Desc: 'Teams will have access to study material before starting the game.',
      stage0Warning: '💡 First time playing? We recommend skipping Stage 0 and using a game from the library. Stage 0 is designed for students who already understand the game dynamics.',
      stage0MaterialType: 'Material type',
      stage0MaterialLink: 'External link',
      stage0MaterialText: 'Text',
      stage0MaterialTitle: 'Material title',
      stage0MaterialContent: 'Content',
      stage0MaterialLinkPlaceholder: 'https://docs.google.com/...',
      stage0MaterialTextPlaceholder: 'Paste here the text that teams should read...',
      stage0GeneratePrompt: 'Need to generate material? Use this prompt with ChatGPT',
    };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setLibraryCSVLoaded(false);
    setLibraryCSVTitle(null);

    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = (e.target?.result as string) || "";
      setCsvContentForSave(text); // Guardar para SaveGameModal

      setIsParsing(true);
      setCsvError(null);

      try {
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

    reader.readAsText(file);
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
    const teamNames = gameMode === 'coopetition' ? TEAM_PROFESSIONAL : TEAM_ANIMALS;

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

      newTeams.push({
        id: teamId,
        name: `${teamNames[i].emoji} ${language === 'es' ? teamNames[i].name : teamNames[i].nameEn}`,
        players: teamPlayers,
        totalScore: 0,
        stage0Bonus: 0,
      });
    }

    setTeams(newTeams);
  };

  const moveStudentToTeam = (studentId: string, fromTeamId: string, toTeamId: string) => {
    const updatedTeams = teams.map(team => {
      if (team.id === fromTeamId) {
        return {
          ...team,
          players: team.players.filter(p => p.id !== studentId),
        };
      } else if (team.id === toTeamId) {
        const studentToMove = teams
          .find(t => t.id === fromTeamId)
          ?.players.find(p => p.id === studentId);

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
    if (!className || !subject) {
      alert(appT.errors.completeFields);
      return;
    }

    if (questions.length === 0) {
      alert(appT.errors.uploadCSV);
      return;
    }

    if (teams.length === 0) {
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

      const gameId = await createGame(config);
      setCreatedGameId(gameId);

      await addTeams(gameId, teams);
      await addQuestions(gameId, questions);

      // El RoomCodeDisplay genera el código automáticamente
      setCurrentStep(4);
      setIsCreating(false);

      setTimeout(() => {
        onGameCreated(gameId);
      }, 2000);
    } catch (error) {
      console.error('Error creating game:', error);
      alert(appT.errors.creatingGame);
      setIsCreating(false);
    }
  };

  return (
    <div className="setup-screen">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 32 }}>{theme.icon}</span>
        <h1 style={{ margin: 0 }}>{t.title}</h1>
      </div>
      <p style={{ 
        textAlign: 'center', 
        color: theme.primary, 
        fontWeight: 600,
        marginBottom: 24,
        fontSize: 14,
      }}>
        {theme.tagline}
      </p>

      <div className="progress-steps">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`} style={currentStep >= 1 ? { backgroundColor: theme.primary } : {}}>1</div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''}`} style={currentStep >= 2 ? { backgroundColor: theme.primary } : {}}>2</div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`} style={currentStep >= 3 ? { backgroundColor: theme.primary } : {}}>3</div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''}`} style={currentStep >= 4 ? { backgroundColor: theme.primary } : {}}>4</div>
      </div>

      {/* STEP 1 */}
      {currentStep === 1 && (
        <div className="step-content">
          <h2>{t.step1}</h2>

          <div className="form-group">
            <label>{t.lang}</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="es"
                  checked={language === 'es'}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                />
                {t.spanish}
              </label>
              <label>
                <input
                  type="radio"
                  value="en"
                  checked={language === 'en'}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                />
                {t.english}
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>{t.className}</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder={language === 'es' ? "3°A - Matemática" : "Grade 3A - Math"}
            />
          </div>

          <div className="form-group">
            <label>{t.subject}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={language === 'es' ? "Matemática" : "Mathematics"}
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
      )}

      {/* STEP 2 */}
      {currentStep === 2 && (
        <div className="step-content">
          <h2>{t.step2}</h2>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <button
              className="btn-library"
              onClick={() => navigate('/library')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: `2px solid ${theme.primary}`,
                background: theme.cardHoverBg,
                color: theme.primary,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = theme.primaryGradient;
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = theme.cardHoverBg;
                e.currentTarget.style.color = theme.primary;
              }}
            >
              📚 {t.chooseFromLibrary}
            </button>

            {/* Botón Generar con IA */}
            <button
              onClick={() => setShowPromptGenerator(true)}
              style={{
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 600,
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                border: '2px solid #22c55e',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#f0fdf4';
                e.currentTarget.style.color = '#16a34a';
              }}
            >
              🤖 {language === 'es' ? 'Generar con IA' : 'Generate with AI'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            margin: '20px 0',
            color: '#94a3b8',
          }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.orUploadFile}</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          </div>

          <div className="form-group">
            <label>{t.uploadCSV}</label>
            <input type="file" accept=".csv" onChange={handleCSVUpload} />
          </div>
          {isParsing && <div style={{ marginTop: 10 }}>{language === 'es' ? 'Analizando CSV...' : 'Analyzing CSV...'}</div>}

          {csvError && (
            <div style={{ marginTop: 10, color: "#c0392b" }}>
              <strong>Error CSV:</strong> {csvError}
            </div>
          )}

          {libraryCSVLoaded && libraryCSVTitle && (
            <div style={{
              marginTop: 12,
              padding: '12px 16px',
              backgroundColor: theme.cardHoverBg,
              borderRadius: 10,
              border: `2px solid ${theme.primary}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>📚</span>
              <div>
                <div style={{ fontSize: 12, color: theme.primary, fontWeight: 600 }}>
                  {t.loadedFromLibrary}
                </div>
                <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>
                  {libraryCSVTitle}
                </div>
              </div>
            </div>
          )}

          {questions.length > 0 && (
            <div className="questions-preview">
              <h3>✅ {questions.length} {language === 'es' ? 'preguntas cargadas' : 'questions loaded'}</h3>
              <ul>
                {questions.slice(0, 3).map(q => (
                  <li key={q.id}>{q.text}</li>
                ))}
                {questions.length > 3 && <li>... {language === 'es' ? `y ${questions.length - 3} más` : `and ${questions.length - 3} more`}</li>}
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
              placeholder={language === 'es' ? 'María\nPedro\nAna\n...' : 'John\nMary\nPeter\n...'}
            />
            <small>
              {t.totalStudents} {parsedNamesInfo.rawCount} · {t.uniqueStudents} {parsedNamesInfo.uniqueCount} · {t.duplicates} {parsedNamesInfo.duplicateCount}
              {parsedNamesInfo.duplicateCount > 0 ? ` — ${t.duplicatesNote}` : ''}
            </small>
            {parsedNamesInfo.duplicateCount > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#c0392b' }}>
                <strong>{language === 'es' ? 'Duplicados detectados:' : 'Duplicates found:'}</strong>{' '}
                {parsedNamesInfo.duplicates.slice(0, 8).join(', ')}
                {parsedNamesInfo.duplicates.length > 8 ? '…' : ''}
              </div>
            )}
          </div>

          <button className="btn-secondary" onClick={assignStudentsRandomly} disabled={parsedNamesInfo.uniqueCount === 0}>
            {t.assignRandom}
          </button>

          {teams.length > 0 && (
            <div className="teams-preview">
              <h3>✅ {language === 'es' ? 'Equipos configurados' : 'Teams configured'}</h3>
              <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '15px' }}>
                {language === 'es'
                  ? 'Podés mover estudiantes entre equipos seleccionando el equipo destino'
                  : 'You can move students between teams by selecting the destination team'}
              </p>
              <div className="teams-grid">
                {teams.map(team => (
                  <div key={team.id} className="team-card">
                    <h4>{team.name}</h4>
                    <ul>
                      {team.players.map(p => (
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
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
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
            <button className="btn-secondary" onClick={() => setCurrentStep(2)}>{t.back}</button>
            <button
              className="btn-primary"
              onClick={handleCreateGame}
              disabled={teams.length === 0 || isCreating}
              style={{ background: theme.primaryGradient }}
            >
              {isCreating ? '...' : t.createGame}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {currentStep === 4 && (
        <div className="step-content step-ready">
          <h2>🎉 {t.step4}</h2>
          {/* ✅ NUEVO: Código de sala con QR */}
          <RoomCodeDisplay gameId={createdGameId} />

          {/* Guardar juego en biblioteca personal */}
          {user && csvContentForSave && !gameSaved && (
            <div style={{
              marginBottom: 20,
              padding: 16,
              backgroundColor: '#f0f9ff',
              borderRadius: 12,
              border: '2px solid #0ea5e9',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 24 }}>💾</span>
              <p style={{ margin: '8px 0 12px', fontSize: 14, color: '#0369a1' }}>
                {language === 'es' 
                  ? '¿Querés guardar este juego para usarlo después?'
                  : 'Do you want to save this game for later use?'}
              </p>
              <button
                onClick={() => setShowSaveModal(true)}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                💾 {appT.teacherLibrary.saveGame}
              </button>
            </div>
          )}

          {gameSaved && (
            <div style={{
              marginBottom: 20,
              padding: 16,
              backgroundColor: '#f0fdf4',
              borderRadius: 12,
              border: '2px solid #22c55e',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#16a34a' }}>
                {language === 'es' 
                  ? '¡Juego guardado en tu biblioteca!'
                  : 'Game saved to your library!'}
              </p>
            </div>
          )}

          <button
            className="btn-primary btn-large"
            onClick={async () => {
              try {
                await startGame(createdGameId);
                onGameCreated(createdGameId);
              } catch (error) {
                console.error('Error starting game:', error);
                alert(language === 'es' ? 'Error al iniciar el juego' : 'Error starting game');
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

      {/* Save Game Modal */}
      {showSaveModal && user && (
        <SaveGameModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          csvContent={csvContentForSave}
          csvFileName={csvFile?.name}
          initialData={{
            title: libraryCSVTitle || csvFile?.name?.replace('.csv', '') || '',
            topic: subject,
            language: language as 'es' | 'en',
          }}
          onSave={async (gameData: NewTeacherGame, csvContent: string) => {
            await saveTeacherGame(
              user.uid,
              user.displayName || 'Docente',
              user.email || '',
              gameData,
              csvContent
            );
            setGameSaved(true);
            setShowSaveModal(false);
          }}
        />
      )}

      {/* Prompt Generator Modal */}
      <PromptGeneratorModal
        isOpen={showPromptGenerator}
        onClose={() => setShowPromptGenerator(false)}
      />
    </div>
  );
}