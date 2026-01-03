// src/App.tsx

import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "./firebase.config";

import { SetupScreen } from "./components/SetupScreen";
import { GameController } from "./components/GameController";
import { SoundToggle } from "./components/SoundToggle";
import { AdminRoute } from "./components/admin/AdminRoute";
import { AdminMetricsPage } from "./pages/admin/AdminMetricsPage";
import { AdminLibraryUploadPage } from "./pages/admin/AdminLibraryUploadPage";
import { AdminBulkUploadPage } from "./pages/admin/AdminBulkUploadPage";
import { AdminLibraryFixPage } from "./pages/admin/AdminLibraryFixPage";

// ✅ PÁGINAS
import { DashboardPage } from "./pages/DashboardPage";
import { AboutPage } from "./pages/AboutPage";
import { LibraryPage } from "./pages/LibraryPage";
import { JoinGamePage } from "./pages/JoinGamePage";

// ✅ NUEVO: Componentes de propuestas
import { SetupFlowManager } from "./components/setup/SetupFlowManager";
import { ProposalStudentView } from "./components/Stage0/ProposalStudentView";

// ✅ CLASSROOM VIEWS REALES
import { Stage1ClassroomView } from "./components/Stage1/Stage1ClassroomView";
import { ClassroomView as Stage2ClassroomView } from "./components/Stage2/ClassroomView";

import "./App.css";

// ✅ AUTH + ROUTER + GAME MODE + I18N
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { GameModeProvider } from "./contexts/GameModeContext";
import { I18nProvider } from "./i18n";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";

import type { Game } from "./types/game";

// ✅ CORREGIDO: ClassroomView real para Stage 1
function ClassroomRouteWrapper() {
  const { gameId } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = ref(database, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setGame(snapshot.val());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  if (!gameId) return <div style={{ padding: 20 }}>❌ gameId no encontrado</div>;

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: '#64748b' }}>Cargando juego...</div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 18, color: '#ef4444' }}>Juego no encontrado</div>
        <p style={{ color: '#64748b' }}>gameId: {gameId}</p>
      </div>
    );
  }

  return <Stage1ClassroomView game={game} gameId={gameId} />;
}

// ✅ CORREGIDO: ClassroomView real para Stage 2
function Stage2ClassroomRouteWrapper() {
  const { gameId } = useParams();

  if (!gameId) return <div style={{ padding: 20 }}>❌ gameId no encontrado</div>;

  return <Stage2ClassroomView gameId={gameId} />;
}

// ✅ Rutas de alumnos
function TeamRouteWrapper() {
  const { gameId, teamId } = useParams();
  if (!gameId || !teamId) return <div>Ruta inválida</div>;

  return (
    <div className="App">
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
        <SoundToggle />
      </div>
      <GameController gameId={gameId} teamId={teamId} />
    </div>
  );
}

// ✅ NUEVO: Wrapper para vista de propuestas del alumno
function ProposalRouteWrapper() {
  const { gameId, teamId } = useParams();
  const [teamData, setTeamData] = useState<{ name: string; emoji: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!gameId || !teamId) return;
    
    const teamRef = ref(database, `games/${gameId}/teams/${teamId}`);
    const unsubscribe = onValue(teamRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTeamData({ name: data.name, emoji: data.emoji });
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [gameId, teamId]);
  
  if (!gameId || !teamId) return <div>Ruta inválida</div>;
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: '#64748b' }}>Cargando...</div>
        </div>
      </div>
    );
  }
  if (!teamData) return <div>Equipo no encontrado</div>;
  
  return (
    <ProposalStudentView
      gameId={gameId}
      teamId={teamId}
      teamName={teamData.name}
      teamEmoji={teamData.emoji}
    />
  );
}

// ✅ NUEVO: Wrapper para SetupFlowManager
function SetupFlowManagerWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ Detectar si viene de biblioteca
  const fromLibrary = location.state?.fromLibrary === true;
  
  // ✅ Si viene de biblioteca, ir directo al SetupScreen tradicional
  useEffect(() => {
    if (fromLibrary) {
      console.log("🟢 Detected fromLibrary, redirecting to /setup-traditional");
      navigate('/setup-traditional', { state: { fromLibrary: true } });
    }
  }, [fromLibrary, navigate]);
  
  const handleGameCreated = (newGameId: string) => {
    console.log("Game created with ID:", newGameId);
    navigate(`/classroom/${newGameId}`);
  };
  
  // Si viene de biblioteca, mostrar loading mientras redirige
  if (fromLibrary) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }
  
  return (
    <div className="App">
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
        <SoundToggle />
      </div>
      <SetupFlowManager onGameCreated={handleGameCreated} />
    </div>
  );
}

type AppView = "setup" | "game";

/**
 * ✅ App original del docente (setup/game) - Flujo tradicional
 * ⚠️ NOTA: Esta vista contiene elementos de debug que deberían ocultarse en producción
 */
function TeacherAppLegacy() {
  const [currentView, setCurrentView] = useState<AppView>("setup");
  const [gameId, setGameId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState("teamA");
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

  // ✅ Detectar si estamos en producción
  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    if (!gameId) return;

    const teamsRef = ref(database, `games/${gameId}/teams`);
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      const teams = snapshot.val();
      if (teams) {
        const teamIds = Object.keys(teams);
        setAvailableTeams(teamIds);

        if (teamIds.length > 0 && !teamIds.includes(teamId)) {
          setTeamId(teamIds[0]);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, teamId]);

  const handleGameCreated = (newGameId: string) => {
    console.log("Game created with ID:", newGameId);
    setGameId(newGameId);
  };

  const handleStartGame = () => {
    if (gameId) setCurrentView("game");
  };

  // SETUP VIEW
  if (currentView === "setup") {
    return (
      <div className="App">
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
          <SoundToggle />
        </div>

        <SetupScreen onGameCreated={handleGameCreated} />

        {/* ⚠️ Botón de testing - solo en desarrollo */}
        {gameId && !isProduction && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              background: "#27ae60",
              padding: "15px 30px",
              borderRadius: "8px",
              cursor: "pointer",
              color: "white",
              fontWeight: "bold",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            }}
            onClick={handleStartGame}
          >
            🎮 IR AL JUEGO (Testing)
          </div>
        )}
      </div>
    );
  }

  // GAME VIEW
  if (currentView === "game" && gameId) {
    return (
      <div className="App">
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
          <SoundToggle />
        </div>

        {/* ⚠️ Consola del profesor - solo en desarrollo */}
        {!isProduction && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              left: "20px",
              zIndex: 10000,
              background: "white",
              padding: "12px 16px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>
              🎮 CONSOLA DEL PROFESOR (DEV)
            </div>

            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "2px solid #3498db",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {availableTeams.map((tId) => (
                <option key={tId} value={tId}>
                  {tId === "teamA" && "🔴 Team A"}
                  {tId === "teamB" && "🟢 Team B"}
                  {tId === "teamC" && "🔵 Team C"}
                  {tId === "teamD" && "🟡 Team D"}
                  {tId === "teamE" && "🟣 Team E"}
                  {tId === "teamF" && "🟠 Team F"}
                  {!["teamA", "teamB", "teamC", "teamD", "teamE", "teamF"].includes(tId) && `📦 ${tId}`}
                </option>
              ))}
            </select>

            <div style={{ fontSize: "11px", color: "#999" }}>
              Equipo actual: <strong>{teamId}</strong>
            </div>
          </div>
        )}

        <GameController key={teamId} gameId={gameId} teamId={teamId} />

        {/* ⚠️ Botón volver - solo en desarrollo */}
        {!isProduction && (
          <button
            style={{
              position: "fixed",
              bottom: "20px",
              left: "20px",
              background: "#95a5a6",
              color: "white",
              padding: "10px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: 9999,
            }}
            onClick={() => setCurrentView("setup")}
          >
            ← Volver a Setup
          </button>
        )}
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <GameModeProvider>
          <BrowserRouter>
            <Routes>
              {/* Login */}
              <Route path="/login" element={<LoginPage />} />

              {/* DASHBOARD */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* ABOUT / FAQ */}
              <Route
                path="/about"
                element={
                  <ProtectedRoute>
                    <AboutPage />
                  </ProtectedRoute>
                }
              />

              {/* BIBLIOTECA */}
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <LibraryPage />
                  </ProtectedRoute>
                }
              />

              {/* ADMIN: métricas */}
              <Route
                path="/admin/metrics"
                element={
                  <AdminRoute>
                    <AdminMetricsPage />
                  </AdminRoute>
                }
              />

              {/* ADMIN: subir CSVs */}
              <Route
                path="/admin/library/upload"
                element={
                  <AdminRoute>
                    <AdminLibraryUploadPage />
                  </AdminRoute>
                }
              />

              {/* ADMIN: bulk upload */}
              <Route
                path="/admin/library/bulk"
                element={
                  <AdminRoute>
                    <AdminBulkUploadPage />
                  </AdminRoute>
                }
              />

              {/* ✅ ADMIN: corregir biblioteca */}
              <Route
                path="/admin/library/fix"
                element={
                  <AdminRoute>
                    <AdminLibraryFixPage />
                  </AdminRoute>
                }
              />

              {/* ✅ DOCENTE: Setup - Selector de modalidad (NUEVO) */}
              <Route
                path="/setup"
                element={
                  <ProtectedRoute>
                    <SetupFlowManagerWrapper />
                  </ProtectedRoute>
                }
              />

              {/* ✅ DOCENTE: Setup tradicional (profesor crea las preguntas) */}
              <Route
                path="/setup-traditional"
                element={
                  <ProtectedRoute>
                    <TeacherAppLegacy />
                  </ProtectedRoute>
                }
              />

              {/* DOCENTE: Classroom Stage 1 */}
              <Route
                path="/classroom/:gameId"
                element={
                  <ProtectedRoute>
                    <ClassroomRouteWrapper />
                  </ProtectedRoute>
                }
              />

              {/* DOCENTE: Stage 2 Classroom */}
              <Route
                path="/stage2/classroom/:gameId"
                element={
                  <ProtectedRoute>
                    <Stage2ClassroomRouteWrapper />
                  </ProtectedRoute>
                }
              />

              {/* ALUMNOS / EQUIPOS: SIN LOGIN */}
              <Route path="/join" element={<JoinGamePage />} />
              
              {/* ✅ ALUMNOS: Vista de propuestas (NUEVO) */}
              <Route path="/propose/:gameId/:teamId" element={<ProposalRouteWrapper />} />
              
              <Route path="/team/:gameId/:teamId" element={<TeamRouteWrapper />} />
              <Route path="/stage2/team/:gameId/:teamId" element={<TeamRouteWrapper />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </GameModeProvider>
      </I18nProvider>
    </AuthProvider>
  );
}

export default App;