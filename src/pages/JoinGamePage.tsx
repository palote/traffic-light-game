// src/pages/JoinGamePage.tsx
// Página para que los alumnos ingresen el código de sala
// ✅ MODIFICADO: Detecta si el juego está en fase de propuestas
// ✅ NUEVO: Soporte para reconexión de equipos

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../firebase.config";
import {
  lookupRoomCode,
  parseCodeFromInput,
  formatCodeForDisplay,
} from "../services/roomCodeService";
import { useI18n } from "../i18n";

// ✅ NUEVO: Claves para localStorage
const STORAGE_KEYS = {
  GAME_ID: "tlg_gameId",
  TEAM_ID: "tlg_teamId",
  TEAM_NAME: "tlg_teamName",
  ROOM_CODE: "tlg_roomCode",
  JOINED_AT: "tlg_joinedAt",
};

// ✅ NUEVO: Tipo para sesión guardada
interface SavedSession {
  gameId: string;
  teamId: string;
  teamName: string;
  roomCode: string;
  joinedAt: number;
}

// ✅ NUEVO: Guardar sesión en localStorage
function saveSession(session: SavedSession) {
  localStorage.setItem(STORAGE_KEYS.GAME_ID, session.gameId);
  localStorage.setItem(STORAGE_KEYS.TEAM_ID, session.teamId);
  localStorage.setItem(STORAGE_KEYS.TEAM_NAME, session.teamName);
  localStorage.setItem(STORAGE_KEYS.ROOM_CODE, session.roomCode);
  localStorage.setItem(STORAGE_KEYS.JOINED_AT, session.joinedAt.toString());
}

// ✅ NUEVO: Obtener sesión de localStorage
function getSavedSession(): SavedSession | null {
  const gameId = localStorage.getItem(STORAGE_KEYS.GAME_ID);
  const teamId = localStorage.getItem(STORAGE_KEYS.TEAM_ID);
  const teamName = localStorage.getItem(STORAGE_KEYS.TEAM_NAME);
  const roomCode = localStorage.getItem(STORAGE_KEYS.ROOM_CODE);
  const joinedAt = localStorage.getItem(STORAGE_KEYS.JOINED_AT);

  if (gameId && teamId && teamName && roomCode) {
    return {
      gameId,
      teamId,
      teamName,
      roomCode,
      joinedAt: joinedAt ? parseInt(joinedAt, 10) : Date.now(),
    };
  }
  return null;
}

// ✅ NUEVO: Limpiar sesión de localStorage
function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.GAME_ID);
  localStorage.removeItem(STORAGE_KEYS.TEAM_ID);
  localStorage.removeItem(STORAGE_KEYS.TEAM_NAME);
  localStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
  localStorage.removeItem(STORAGE_KEYS.JOINED_AT);
}

// ✅ NUEVO: Verificar si el juego sigue activo
async function isGameActive(gameId: string): Promise<boolean> {
  try {
    const gameSnapshot = await get(ref(database, `games/${gameId}`));
    if (!gameSnapshot.exists()) return false;

    const game = gameSnapshot.val();
    // Verificar que el juego no haya terminado
    const status = game.status?.status;
    return status !== "finished" && status !== "ended";
  } catch {
    return false;
  }
}

export function JoinGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();

  // Estado
  const [code, setCode] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [availableTeams, setAvailableTeams] = useState<
    Array<{ id: string; name: string; emoji: string }>
  >([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"code" | "team">("code");

  // ✅ Estado para detectar fase del juego
  const [gamePhase, setGamePhase] = useState<"normal" | "proposals" | "waiting">("normal");

  // ✅ NUEVO: Estado para reconexión
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ✅ NUEVO: Verificar sesión guardada al cargar
  useEffect(() => {
    const checkSavedSession = async () => {
      const session = getSavedSession();

      if (session) {
        // Verificar si el juego sigue activo
        const isActive = await isGameActive(session.gameId);

        if (isActive) {
          setSavedSession(session);
          setSessionValid(true);
        } else {
          // Juego terminó, limpiar sesión
          clearSession();
          setSavedSession(null);
          setSessionValid(false);
        }
      }

      setCheckingSession(false);
    };

    checkSavedSession();
  }, []);

  // Auto-focus en el input
  useEffect(() => {
    if (step === "code" && !checkingSession && !sessionValid) {
      inputRef.current?.focus();
    }
  }, [step, checkingSession, sessionValid]);

  // Si viene código en URL, procesarlo automáticamente
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode && !checkingSession) {
      setCode(urlCode);
      handleCodeSubmit(urlCode);
    }
  }, [searchParams, checkingSession]);

  // ✅ NUEVO: Reconectar a sesión guardada
  const handleReconnect = async () => {
    if (!savedSession) return;

    setLoading(true);

    try {
      // Verificar el estado actual del juego
      const stage0Snapshot = await get(ref(database, `games/${savedSession.gameId}/stage0`));
      const statusSnapshot = await get(ref(database, `games/${savedSession.gameId}/status`));

      let targetRoute = `/team/${savedSession.gameId}/${savedSession.teamId}`;

      if (stage0Snapshot.exists()) {
        const phase = stage0Snapshot.val().phase;
        if (phase === "collecting" || phase === "waiting" || phase === "curating") {
          targetRoute = `/propose/${savedSession.gameId}/${savedSession.teamId}`;
        }
      }

      // Verificar si está en Stage 2
      if (statusSnapshot.exists()) {
        const status = statusSnapshot.val().status;
        if (status === "stage2") {
          targetRoute = `/stage2/team/${savedSession.gameId}/${savedSession.teamId}`;
        }
      }

      navigate(targetRoute);
    } catch (err) {
      console.error("Error reconnecting:", err);
      setError(t.join.couldntReconnect);
      clearSession();
      setSavedSession(null);
      setSessionValid(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Comenzar nueva sesión (ignorar guardada)
  const handleNewSession = () => {
    clearSession();
    setSavedSession(null);
    setSessionValid(false);
    inputRef.current?.focus();
  };

  // Buscar código
  const handleCodeSubmit = async (inputCode?: string) => {
    const codeToUse = parseCodeFromInput(inputCode || code);

    if (codeToUse.length !== 6) {
      setError(t.join.codeMustBe6);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await lookupRoomCode(codeToUse);

      if (!result.success) {
        setError(result.message || t.join.invalidCode);
        setLoading(false);
        return;
      }

      // Código válido, cargar equipos y detectar fase
      setGameId(result.gameId!);
      await loadTeamsAndDetectPhase(result.gameId!);
      setStep("team");
    } catch (err) {
      console.error("Error looking up code:", err);
      setError(t.join.lookupError);
    } finally {
      setLoading(false);
    }
  };

  // Cargar equipos y detectar fase del juego
  const loadTeamsAndDetectPhase = async (gId: string) => {
    // Cargar equipos
    const teamsSnapshot = await get(ref(database, `games/${gId}/teams`));

    if (!teamsSnapshot.exists()) {
      setError(t.join.noTeamsConfigured);
      return;
    }

    const teamsData = teamsSnapshot.val();
    const teams = Object.entries(teamsData).map(([id, data]: [string, any]) => ({
      id,
      name: data.name || id,
      emoji: data.emoji || "📦",
    }));

    setAvailableTeams(teams);

    // Detectar fase del juego
    const stage0Snapshot = await get(ref(database, `games/${gId}/stage0`));

    if (stage0Snapshot.exists()) {
      const stage0Data = stage0Snapshot.val();
      const phase = stage0Data.phase;

      if (phase === "collecting") {
        setGamePhase("proposals");
      } else if (phase === "waiting") {
        setGamePhase("waiting");
      } else if (phase === "curating") {
        setGamePhase("waiting");
      } else {
        setGamePhase("normal");
      }
    } else {
      setGamePhase("normal");
    }
  };

  // ✅ MODIFICADO: Unirse al juego y guardar sesión
  const handleJoinGame = () => {
    if (!gameId || !selectedTeam) return;

    // Obtener nombre del equipo seleccionado
    const team = availableTeams.find((t) => t.id === selectedTeam);
    const teamName = team?.name || selectedTeam;

    // ✅ NUEVO: Guardar sesión
    saveSession({
      gameId,
      teamId: selectedTeam,
      teamName,
      roomCode: code,
      joinedAt: Date.now(),
    });

    if (gamePhase === "proposals") {
      navigate(`/propose/${gameId}/${selectedTeam}`);
    } else if (gamePhase === "waiting") {
      navigate(`/propose/${gameId}/${selectedTeam}`);
    } else {
      navigate(`/team/${gameId}/${selectedTeam}`);
    }
  };

  // Colores de equipos
  const teamColors: Record<string, { bg: string; border: string; emoji: string }> = {
    team_1: { bg: "#fef2f2", border: "#ef4444", emoji: "🦁" },
    team_2: { bg: "#eff6ff", border: "#3b82f6", emoji: "🐯" },
    team_3: { bg: "#f0fdf4", border: "#22c55e", emoji: "🐻" },
    team_4: { bg: "#fefce8", border: "#eab308", emoji: "🦅" },
    team_5: { bg: "#faf5ff", border: "#a855f7", emoji: "🐺" },
    team_6: { bg: "#fff7ed", border: "#f97316", emoji: "🦊" },
    team_7: { bg: "#f0fdfa", border: "#14b8a6", emoji: "🦒" },
    team_8: { bg: "#fdf2f8", border: "#ec4899", emoji: "🐘" },
    // Legacy
    teamA: { bg: "#fef2f2", border: "#ef4444", emoji: "🔴" },
    teamB: { bg: "#f0fdf4", border: "#22c55e", emoji: "🟢" },
    teamC: { bg: "#eff6ff", border: "#3b82f6", emoji: "🔵" },
    teamD: { bg: "#fefce8", border: "#eab308", emoji: "🟡" },
    teamE: { bg: "#faf5ff", border: "#a855f7", emoji: "🟣" },
    teamF: { bg: "#fff7ed", border: "#f97316", emoji: "🟠" },
  };

  const getTeamStyle = (teamId: string, teamEmoji?: string) => {
    const defaultStyle = teamColors[teamId] || {
      bg: "#f8fafc",
      border: "#94a3b8",
      emoji: teamEmoji || "📦",
    };
    return { ...defaultStyle, emoji: teamEmoji || defaultStyle.emoji };
  };

  // Texto del botón según la fase
  const getJoinButtonText = () => {
    if (gamePhase === "proposals") return t.join.joinProposals;
    if (gamePhase === "waiting") return t.join.joinWaiting;
    return t.join.joinNormal;
  };

  // ✅ NUEVO: Mostrar loading mientras verifica sesión
  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18 }}>{t.common.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: "40px 32px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Logo/Título */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🚦</div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t.join.appTitle}
          </h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14 }}>
            {sessionValid && step === "code"
              ? t.join.welcomeBack
              : step === "code"
              ? t.join.enterRoomCode
              : t.join.selectTeam}
          </p>
        </div>

        {/* ✅ NUEVO: Opción de reconectar */}
        {sessionValid && savedSession && step === "code" && (
          <div
            style={{
              marginBottom: 24,
              padding: 20,
              backgroundColor: "#f0fdf4",
              borderRadius: 16,
              border: "2px solid #22c55e",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 32 }}>🔄</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}>
                  {t.join.previousSessionFound}
                </div>
                <div style={{ fontSize: 13, color: "#16a34a" }}>{savedSession.teamName}</div>
                <div style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>
                  {t.join.codeLabel}: {savedSession.roomCode}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleReconnect}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: "12px 16px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "white",
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  border: "none",
                  borderRadius: 10,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? t.join.reconnecting : t.join.goBackToGame}
              </button>

              <button
                onClick={handleNewSession}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#64748b",
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                {t.join.newSession}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Ingresar código */}
        {step === "code" && (
          <>
            {/* Separador si hay sesión guardada */}
            {sessionValid && savedSession && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  margin: "0 0 20px 0",
                  color: "#94a3b8",
                }}
              >
                <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                <span style={{ fontSize: 12 }}>{t.join.orEnterNewCode}</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6);
                  setCode(val);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCodeSubmit();
                }}
                placeholder="ABC123"
                maxLength={6}
                style={{
                  width: "100%",
                  padding: "20px 24px",
                  fontSize: 32,
                  fontWeight: 800,
                  textAlign: "center",
                  letterSpacing: 8,
                  border: error ? "3px solid #ef4444" : "3px solid #e2e8f0",
                  borderRadius: 16,
                  outline: "none",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#667eea")}
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = error ? "#ef4444" : "#e2e8f0")
                }
              />

              {error && (
                <p
                  style={{
                    margin: "12px 0 0",
                    color: "#ef4444",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  ❌ {error}
                </p>
              )}
            </div>

            <button
              onClick={() => handleCodeSubmit()}
              disabled={code.length !== 6 || loading}
              style={{
                width: "100%",
                padding: "16px 24px",
                fontSize: 18,
                fontWeight: 700,
                color: "white",
                background:
                  code.length === 6 && !loading
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "#cbd5e1",
                border: "none",
                borderRadius: 12,
                cursor: code.length === 6 && !loading ? "pointer" : "not-allowed",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseOver={(e) => {
                if (code.length === 6 && !loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(102, 126, 234, 0.4)";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? <span>{t.join.searching}</span> : <span>{t.join.findRoom}</span>}
            </button>

            <p
              style={{
                margin: "24px 0 0",
                textAlign: "center",
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              {t.join.codeOnTeacherScreen}
            </p>
          </>
        )}

        {/* STEP 2: Seleccionar equipo */}
        {step === "team" && (
          <>
            {/* Mostrar código actual */}
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#f0fdf4",
                borderRadius: 10,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: "#64748b" }}>{t.join.codeLabel}:</span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#22c55e",
                }}
              >
                {formatCodeForDisplay(code)}
              </span>
            </div>

            {/* Indicador de fase de propuestas */}
            {gamePhase === "proposals" && (
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#ede9fe",
                  borderRadius: 10,
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 18, marginRight: 8 }}>📝</span>
                <span style={{ fontSize: 14, color: "#7c3aed", fontWeight: 600 }}>
                  {t.join.proposalsActive}
                </span>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8b5cf6" }}>
                  {t.join.proposalsDesc}
                </p>
              </div>
            )}

            {gamePhase === "waiting" && (
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#fef3c7",
                  borderRadius: 10,
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 18, marginRight: 8 }}>⏳</span>
                <span style={{ fontSize: 14, color: "#b45309", fontWeight: 600 }}>
                  {t.join.waitingTeacher}
                </span>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#d97706" }}>
                  {t.join.waitingDesc}
                </p>
              </div>
            )}

            {/* Lista de equipos */}
            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              {availableTeams.map((team) => {
                const style = getTeamStyle(team.id, team.emoji);
                const isSelected = selectedTeam === team.id;

                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    style={{
                      padding: "16px 20px",
                      backgroundColor: isSelected ? style.bg : "white",
                      border: `3px solid ${isSelected ? style.border : "#e2e8f0"}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{style.emoji}</span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? style.border : "#334155",
                      }}
                    >
                      {team.name}
                    </span>
                    {isSelected && <span style={{ marginLeft: "auto", fontSize: 20 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  setStep("code");
                  setSelectedTeam(null);
                  setGameId(null);
                  setAvailableTeams([]);
                  setGamePhase("normal");
                }}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#64748b",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                {t.join.changeCode}
              </button>

              <button
                onClick={handleJoinGame}
                disabled={!selectedTeam}
                style={{
                  flex: 2,
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "white",
                  background: selectedTeam
                    ? gamePhase === "proposals"
                      ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                      : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                    : "#cbd5e1",
                  border: "none",
                  borderRadius: 10,
                  cursor: selectedTeam ? "pointer" : "not-allowed",
                }}
              >
                {getJoinButtonText()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
