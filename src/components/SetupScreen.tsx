// src/components/SetupScreen.tsx

import { useMemo, useState } from "react";
import "./SetupScreen.css";

import type {
  GameLevel,
  Language,
  GameConfig,
  Team,
  Player,
  Question,
} from "../types/game";

import {
  createGame,
  addTeams,
  addQuestions,
  generateRoomCode,
  startGame,
} from "../services/gameRepository";

import { CSVPreview } from "./CSVPreview";

import { parseCSV } from "../utils/csvParser";
import type { ParseResult, ParsedQuestion } from "../utils/csvParser";


// 🦁 Nombres de equipos con animales
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

interface SetupScreenProps {
  onGameCreated: (gameId: string) => void;
}

export function SetupScreen({ onGameCreated }: SetupScreenProps) {
  // Estado del formulario
  const [level] = useState<GameLevel>('primary'); // ← Fijo, no se cambia
  const [ratingMode] = useState<'devices' | 'physical-cards'>('devices'); // ← Fijo
  const [language, setLanguage] = useState<Language>('es');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState(6);
  const [studentsPerTeam, setStudentsPerTeam] = useState(5);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);


  // ✅ Texto crudo del textarea (ENTER funciona siempre)
  const [studentsText, setStudentsText] = useState('');

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Timers
  const [stage1RatingTimer, setStage1RatingTimer] = useState(30);
  const [stage2HintTimer, setStage2HintTimer] = useState(60);
  const [stage2AnswerTimer, setStage2AnswerTimer] = useState(45);
  const [stage2HelpTimer, setStage2HelpTimer] = useState(30);

  // Equipos y jugadores
  const [teams, setTeams] = useState<Team[]>([]);

  // UI State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [createdGameId, setCreatedGameId] = useState<string>('');

  // -----------------------------
  // ✅ Parsing de nombres + duplicados
  // -----------------------------
  const parsedNamesInfo = useMemo(() => {
    const raw = studentsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    // Normalizamos para detectar duplicados (minúsculas + espacios colapsados)
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

  // Textos según idioma
  const t =
    language === 'es'
      ? {
        title: 'Configurar Nuevo Juego',
        step1: 'Paso 1: Información Básica',
        step2: 'Paso 2: Preguntas',
        step3: 'Paso 3: Configurar Equipos',
        step4: 'Paso 4: ¡Listo para Jugar!',
        level: 'Nivel',
        primary: 'Primaria',
        secondary: 'Secundaria',
        lang: 'Idioma',
        spanish: 'Español',
        english: 'English',
        className: 'Nombre de la clase',
        subject: 'Materia',
        numTeams: 'Cantidad de equipos',
        studentsPerTeam: 'Alumnos por equipo',
        uploadCSV: 'Subir archivo CSV',
        continue: 'Continuar',
        back: 'Atrás',
        createGame: 'Crear Juego',
        assignRandom: 'Asignar aleatoriamente',
        enterNames: 'Ingresá los nombres (uno por línea)',
        roomCode: 'Código de sala',
        shareCode: 'Compartí este código con tus estudiantes',
        startGame: 'Comenzar Juego',
        ratingModeLabel: 'Modo de calificación:',
        ratingDevices: 'Con dispositivos individuales (celulares/tablets)',
        ratingCards: 'Con tarjetas físicas (verde/amarillo/rojo)',
        totalStudents: 'Total:',
        uniqueStudents: 'Únicos:',
        duplicates: 'Duplicados:',
        duplicatesNote: 'Se ignoran duplicados al armar los equipos.',
      }
      : {
        title: 'Setup New Game',
        step1: 'Step 1: Basic Information',
        step2: 'Step 2: Questions',
        step3: 'Step 3: Setup Teams',
        step4: 'Step 4: Ready to Play!',
        level: 'Level',
        primary: 'Primary',
        secondary: 'Secondary',
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
        ratingModeLabel: 'Rating mode:',
        ratingDevices: 'Individual devices (phones/tablets)',
        ratingCards: 'Physical cards (green/yellow/red)',
        totalStudents: 'Total:',
        uniqueStudents: 'Unique:',
        duplicates: 'Duplicates:',
        duplicatesNote: 'Duplicates are ignored when building teams.',
      };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = (e.target?.result as string) || "";

      setIsParsing(true);
      setCsvError(null);

      try {
        const result = await parseCSV(text); // ✅ parseCSV importado (Promise<ParseResult>)
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



  // ✅ Asignar estudiantes aleatoriamente (usa UNIQUE, ignora duplicados)
  const assignStudentsRandomly = () => {
    const uniqueNames = parsedNamesInfo.unique;

    if (uniqueNames.length === 0) {
      alert(language === 'es'
        ? 'Primero ingresá los nombres de los estudiantes'
        : 'First enter student names');
      return;
    }

    const shuffled = [...uniqueNames].sort(() => Math.random() - 0.5);
    const newTeams: Team[] = [];

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
        name: `${TEAM_ANIMALS[i].emoji} ${language === 'es' ? TEAM_ANIMALS[i].name : TEAM_ANIMALS[i].nameEn}`,
        players: teamPlayers,
        totalScore: 0,
        stage0Bonus: 0,
      });
    }

    setTeams(newTeams);
  };

  // Mover estudiante a otro equipo
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

  // Crear el juego en Firebase
  const handleCreateGame = async () => {
    if (!className || !subject) {
      alert(language === 'es'
        ? 'Completá el nombre de la clase y la materia'
        : 'Complete class name and subject');
      return;
    }

    if (questions.length === 0) {
      alert(language === 'es'
        ? 'Subí un archivo CSV con preguntas'
        : 'Upload a CSV file with questions');
      return;
    }

    if (teams.length === 0) {
      alert(language === 'es'
        ? 'Asigná los estudiantes a los equipos'
        : 'Assign students to teams');
      return;
    }

    setIsCreating(true);

    try {
      const config = {
        id: '',
        level,
        language,
        className,
        numberOfTeams,
        studentsPerTeam,
        subject,
        ratingMode,
        csvFileName: csvFile?.name,
        timers: {
          stage1Rating: stage1RatingTimer,
          stage2Hint: stage2HintTimer,
          stage2Answer: stage2AnswerTimer,
          stage2Help: stage2HelpTimer,
        },
        createdAt: Date.now(),
      } as Omit<GameConfig, 'createdAt' | 'updatedAt'>;

      const gameId = await createGame(config);
      setCreatedGameId(gameId);

      await addTeams(gameId, teams);
      await addQuestions(gameId, questions);

      const code = generateRoomCode();
      setRoomCode(code);

      setCurrentStep(4);
      setIsCreating(false);

      setTimeout(() => {
        onGameCreated(gameId);
      }, 2000);
    } catch (error) {
      console.error('Error creating game:', error);
      alert(language === 'es' ? 'Error al crear el juego' : 'Error creating game');
      setIsCreating(false);
    }
  };

  return (
    <div className="setup-screen">
      <h1>{t.title}</h1>

      <div className="progress-steps">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>4</div>
      </div>

      {/* STEP 1 */}
      {currentStep === 1 && (
        <div className="step-content">
          <h2>{t.step1}</h2>

          {/* ✅ IDIOMA - SE MANTIENE */}
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

          {/* ❌ NIVEL - OCULTO (siempre primary) */}
          {/* ❌ MODO CALIFICACIÓN - OCULTO (siempre devices) */}

          <div className="form-group">
            <label>{t.className}</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="3°A - Matemática"
            />
          </div>

          <div className="form-group">
            <label>{t.subject}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Matemática"
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
          >
            {t.continue}
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {currentStep === 2 && (
        <div className="step-content">
          <h2>{t.step2}</h2>

          <div className="form-group">
            <label>{t.uploadCSV}</label>
            <input type="file" accept=".csv" onChange={handleCSVUpload} />
          </div>
          {isParsing && <div style={{ marginTop: 10 }}>Analizando CSV...</div>}

          {csvError && (
            <div style={{ marginTop: 10, color: "#c0392b" }}>
              <strong>Error CSV:</strong> {csvError}
            </div>
          )}

          {questions.length > 0 && (
            <div className="questions-preview">
              <h3>✅ {questions.length} preguntas cargadas</h3>
              <ul>
                {questions.slice(0, 3).map(q => (
                  <li key={q.id}>{q.text}</li>
                ))}
                {questions.length > 3 && <li>... y {questions.length - 3} más</li>}
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
              placeholder={'María\nPedro\nAna\n...'}
            />

            {/* ✅ Contadores */}
            <small>
              {t.totalStudents} {parsedNamesInfo.rawCount} · {t.uniqueStudents} {parsedNamesInfo.uniqueCount} · {t.duplicates} {parsedNamesInfo.duplicateCount}
              {parsedNamesInfo.duplicateCount > 0 ? ` — ${t.duplicatesNote}` : ''}
            </small>

            {/* ✅ Lista corta de duplicados */}
            {parsedNamesInfo.duplicateCount > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#c0392b' }}>
                <strong>{language === 'es' ? 'Duplicados detectados:' : 'Duplicates found:'}</strong>{' '}
                {parsedNamesInfo.duplicates.slice(0, 8).join(', ')}
                {parsedNamesInfo.duplicates.length > 8 ? '…' : ''}
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
              <h3>✅ Equipos configurados</h3>
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

          <div className="room-code-display">
            <label>{t.roomCode}</label>
            <div className="code">{roomCode || 'ABC123'}</div>
            <p>{t.shareCode}</p>
          </div>

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
          >
            {t.startGame}
          </button>
        </div>
      )}
      {showPreview && parseResult && (
        <CSVPreview
          parseResult={parseResult}
          onConfirm={(parsedQuestions: ParsedQuestion[]) => {
            // Convertimos ParsedQuestion -> Question (tu estado es Question[])
            const converted: Question[] = parsedQuestions.map((q) => ({
              id: q.id,
              text: q.text,
              hint: q.hint ?? "",
              suggestedStage: q.suggestedStage,
            }));

            setQuestions(converted);     // ✅ ahora sí “acepta” el CSV
            setShowPreview(false);       // ✅ cierra el modal
            setParseResult(null);        // limpia
          }}
          onCancel={() => {
            setShowPreview(false);
            setParseResult(null);
          }}
        />
      )}

    </div>
  );
}
