// src/App.tsx

import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "./firebase.config";

import { SetupScreen } from "./components/SetupScreen";
import { GameController } from "./components/GameController";
import { SoundToggle } from "./components/SoundToggle";
import { AdminRoute } from "./components/admin/AdminRoute";
import { AdminMetricsPage } from "./pages/admin/AdminMetricsPage";
import { AdminLibraryUploadPage } from "./pages/admin/AdminLibraryUploadPage"; // ✅ NUEVO

// ✅ PÁGINAS
import { DashboardPage } from "./pages/DashboardPage";
import { AboutPage } from "./pages/AboutPage";
import { LibraryPage } from "./pages/LibraryPage"; // ✅ NUEVO

import "./App.css";

// ✅ AUTH + ROUTER
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";

// Placeholders para ClassroomView (reemplazar con los reales)
function ClassroomRouteWrapper() {
  const { gameId } = useParams();
  return (
    <div style={{ padding: 20 }}>
      <h2>ClassroomView</h2>
      <p>gameId: {gameId}</p>
      <p>Acá va tu ClassroomView real.</p>
    </div>
  );
}

function Stage2ClassroomRouteWrapper() {
  const { gameId } = useParams();
  return (
    <div style={{ padding: 20 }}>
      <h2>Stage 2 ClassroomView</h2>
      <p>gameId: {gameId}</p>
      <p>Acá va tu Stage2 ClassroomView real.</p>
    </div>
  );
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

type AppView = "setup" | "game";

/**
 * ✅ App original del docente (setup/game)
 */
function TeacherAppLegacy() {
  const [currentView, setCurrentView] = useState<AppView>("setup");
  const [gameId, setGameId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState("teamA");
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

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

        {gameId && (
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
            🎮 CONSOLA DEL PROFESOR
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

        <GameController key={teamId} gameId={gameId} teamId={teamId} />

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
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ✅ Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* ✅ DASHBOARD (nueva home protegida) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ ABOUT / FAQ (protegido) */}
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <AboutPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ BIBLIOTECA (NUEVO - página real) */}
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <LibraryPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ ADMIN: métricas (solo admin) */}
          <Route
            path="/admin/metrics"
            element={
              <AdminRoute>
                <AdminMetricsPage />
              </AdminRoute>
            }
          />

          {/* ✅ ADMIN: subir CSVs a biblioteca (solo admin) */}
          <Route
            path="/admin/library/upload"
            element={
              <AdminRoute>
                <AdminLibraryUploadPage />
              </AdminRoute>
            }
          />

          {/* ✅ DOCENTE: Setup (protegido) */}
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <TeacherAppLegacy />
              </ProtectedRoute>
            }
          />

          {/* ✅ DOCENTE: Classroom (protegido) */}
          <Route
            path="/classroom/:gameId"
            element={
              <ProtectedRoute>
                <ClassroomRouteWrapper />
              </ProtectedRoute>
            }
          />

          {/* ✅ DOCENTE: Stage 2 Classroom (protegido) */}
          <Route
            path="/stage2/classroom/:gameId"
            element={
              <ProtectedRoute>
                <Stage2ClassroomRouteWrapper />
              </ProtectedRoute>
            }
          />

          {/* ✅ ALUMNOS / EQUIPOS: SIN LOGIN */}
          <Route path="/team/:gameId/:teamId" element={<TeamRouteWrapper />} />
          <Route path="/stage2/team/:gameId/:teamId" element={<TeamRouteWrapper />} />

          {/* ✅ Fallback: manda a dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;