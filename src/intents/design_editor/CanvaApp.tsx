// src/intents/design_editor/CanvaApp.tsx
// UI del panel lateral: maneja los estados idle → ready → in_progress

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Select,
  FormField,
  RadioGroup,
  Text,
  Title,
  Alert,
} from "@canva/app-ui-kit";
import { requestOpenExternalUrl } from "@canva/platform";
import { addPage, addNativeElement } from "@canva/design";
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, push, set, onValue, off } from "firebase/database";

// ─── Firebase ────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "traffic-ligths-game.firebaseapp.com",
  databaseURL: "https://traffic-ligths-game-default-rtdb.firebaseio.com",
  projectId: "traffic-ligths-game",
  storageBucket: "traffic-ligths-game.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];
const database = getDatabase(firebaseApp);

// ─── Tipos ───────────────────────────────────────────────────────────────────
type Language = "es" | "en" | "pt";
type GameMode = "teacher_prepares" | "students_propose";
type AppState = "idle" | "creating" | "ready";

interface Session {
  sessionId: string;
  gameCode: string;
  language: Language;
  teamCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateGameCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  return (
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)] +
    "-" +
    digits[Math.floor(Math.random() * digits.length)] +
    digits[Math.floor(Math.random() * digits.length)]
  );
}

const TLG_URL = "https://traffic-ligths-game.web.app";

// ─── Componente principal ─────────────────────────────────────────────────────
export function CanvaApp() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [session, setSession] = useState<Session | null>(null);
  const [teamsConnected, setTeamsConnected] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Config del formulario
  const [mode, setMode] = useState<GameMode>("teacher_prepares");
  const [language, setLanguage] = useState<Language>("es");
  const [teamCount, setTeamCount] = useState(4);

  // Escuchar equipos conectados
  useEffect(() => {
    if (!session) return;
    const teamsRef = ref(database, `sessions/${session.sessionId}/teams`);
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      setTeamsConnected(snapshot.val() ? Object.keys(snapshot.val()).length : 0);
    });
    return () => off(teamsRef, "value", unsubscribe);
  }, [session?.sessionId]);

  // Crear sesión en Firebase
  const handleCreateSession = useCallback(async () => {
    setError(null);
    setAppState("creating");
    try {
      const sessionsRef = ref(database, "sessions");
      const newRef = push(sessionsRef);
      const sessionId = newRef.key!;
      const gameCode = generateGameCode();

      await set(newRef, {
        sessionId,
        gameCode,
        config: { mode, language, teamCount },
        createdAt: Date.now(),
        source: "canva",
        status: "waiting",
      });

      setSession({ sessionId, gameCode, language, teamCount });
      setAppState("ready");
    } catch (err) {
      setError("No se pudo crear la sesión. Verificá tu conexión.");
      setAppState("idle");
    }
  }, [mode, language, teamCount]);

  // Insertar slide con código en la presentación de Canva
  const handleInsertSlide = async () => {
    if (!session) return;
    try {
      await addPage({ title: "Traffic Light Game - Instrucciones" });
      await addNativeElement({
        type: "TEXT",
        children: [`Código: ${session.gameCode}`],
        top: 100, left: 80, width: 600,
        fontSize: 64, fontWeight: "bold", color: "#1a1a1a",
      });
      await addNativeElement({
        type: "TEXT",
        children: [
          `1. Abrí ${TLG_URL}`,
          `2. Ingresá el código: ${session.gameCode}`,
          "3. Elegí tu equipo y esperá",
        ].join("\n"),
        top: 220, left: 80, width: 600,
        fontSize: 24, color: "#333333",
      });
      await addNativeElement({
        type: "TEXT",
        children: ["🚦"],
        top: 80, left: 720, width: 120, fontSize: 80,
      });
    } catch (err) {
      console.error("Error insertando slide:", err);
    }
  };

  // Abrir tablero del docente en nueva pestaña
  const handleLaunchDashboard = async () => {
    if (!session) return;
    const params = new URLSearchParams({
      sessionId: session.sessionId,
      source: "canva",
      lang: session.language,
      teams: String(session.teamCount),
    });
    const url = `${TLG_URL}/classroom?${params.toString()}`;
    try {
      await requestOpenExternalUrl({ url });
    } catch {
      window.open(url, "_blank");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box padding="2u">
      {/* Error */}
      {error && (
        <Box paddingBottom="2u">
          <Alert tone="critical" title="Error">{error}</Alert>
        </Box>
      )}

      {/* ESTADO: idle o creating → formulario de configuración */}
      {(appState === "idle" || appState === "creating") && (
        <>
          <Box paddingBottom="2u">
            <Title size="small">🚦 Traffic Light Game</Title>
          </Box>

          <FormField
            label="Modo de inicio"
            control={(props) => (
              <RadioGroup
                {...props}
                value={mode}
                onChange={(v) => setMode(v as GameMode)}
                options={[
                  { label: "Yo preparo las preguntas", value: "teacher_prepares" },
                  { label: "Los alumnos proponen", value: "students_propose" },
                ]}
              />
            )}
          />

          <FormField
            label="Idioma"
            control={(props) => (
              <Select
                {...props}
                value={language}
                onChange={(v) => setLanguage(v as Language)}
                options={[
                  { label: "Español", value: "es" },
                  { label: "English", value: "en" },
                  { label: "Português", value: "pt" },
                ]}
              />
            )}
          />

          <FormField
            label="Equipos"
            control={(props) => (
              <Select
                {...props}
                value={String(teamCount)}
                onChange={(v) => setTeamCount(Number(v))}
                options={[2,3,4,5,6,8].map(n => ({
                  label: `${n} equipos`, value: String(n),
                }))}
              />
            )}
          />

          <Box paddingTop="2u">
            <Button
              variant="primary"
              onClick={handleCreateSession}
              loading={appState === "creating"}
              stretch
            >
              ▶ Crear sesión
            </Button>
          </Box>
        </>
      )}

      {/* ESTADO: ready → sesión activa */}
      {appState === "ready" && session && (
        <>
          <Box paddingBottom="1u">
            <Title size="small">✅ Sesión lista</Title>
          </Box>

          <Box background="neutralLow" borderRadius="standard" padding="2u">
            <Text size="small" tone="secondary">Código de sala</Text>
            <Title size="medium">{session.gameCode}</Title>
            <Text size="small" tone="secondary">
              {teamsConnected > 0
                ? `${teamsConnected} equipo${teamsConnected !== 1 ? "s" : ""} conectado${teamsConnected !== 1 ? "s" : ""}`
                : "Esperando conexiones..."}
            </Text>
          </Box>

          <Box paddingTop="2u">
            <Button variant="secondary" onClick={handleInsertSlide} stretch>
              🖼 Insertar slide con código
            </Button>
          </Box>

          <Box paddingTop="1u">
            <Button variant="primary" onClick={handleLaunchDashboard} stretch>
              🚀 Abrir Tablero del Docente
            </Button>
          </Box>

          <Box paddingTop="2u">
            <Button
              variant="tertiary"
              onClick={() => { setSession(null); setAppState("idle"); setTeamsConnected(0); }}
              stretch
            >
              Nueva sesión
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
