// src/components/Stage2/TeamDeviceView.tsx

import { useEffect, useMemo, useState } from "react";
import type { Game, Team } from "../../types/game";

import {
  submitRating,
  getCurrentJustifyingTeamId,
} from "../../services/stage2Repository";

interface TeamDeviceViewProps {
  game: Game;
  teamId: string;
}

export function TeamDeviceView({ game, teamId }: TeamDeviceViewProps) {
  // Estados locales
  const [hasRated, setHasRated] = useState(false);
  const [isMyTurnToJustify, setIsMyTurnToJustify] = useState(false);

  // GameId seguro (evita crashes raros en renders intermedios)
  const gameId = (game as any)?.id ?? "";

  // Stage 2
  const stage2: any = (game as any)?.stage2;
  const currentRoundIndex: number = stage2?.currentRound ?? 0;
  const round: any = stage2?.rounds?.[currentRoundIndex] ?? null;
  const phase: string | null = round?.phase ?? null;

  // =========================
  // Teams (ROBUSTO)
  // - Filtra undefined/huecos de RTDB
  // - Evita t.id sobre t undefined
  // =========================
  const teams: Team[] = useMemo(() => {
    const raw: any = (game as any)?.teams;
    if (!raw) return [];

    const arr: any[] = Array.isArray(raw)
      ? raw
      : typeof raw === "object"
        ? Object.values(raw)
        : [];

    return arr.filter(
      (t): t is Team => !!t && typeof t === "object" && !!(t as any).id
    );
  }, [game]);

  const team: Team | undefined = useMemo(() => {
    if (!teamId) return undefined;
    return teams.find((t) => t.id === teamId);
  }, [teams, teamId]);

  // Preguntas (robusto a object/array)
  const questions: any[] = useMemo(() => {
    const raw: any = (game as any)?.questions;
    if (!raw) return [];

    const arr: any[] = Array.isArray(raw)
      ? raw
      : typeof raw === "object"
        ? Object.values(raw)
        : [];

    return arr.filter((q) => !!q && typeof q === "object" && !!(q as any).id);
  }, [game]);

  const currentQuestion: any = useMemo(() => {
    if (!round?.questionId) return null;
    return questions.find((q) => q?.id === round.questionId) ?? null;
  }, [questions, round?.questionId]);

  // Datos del equipo que respondió
  const responding: any = round?.respondingTeam ?? null;

  const respondingTeamName = useMemo(() => {
    if (!responding?.teamId) return "—";
    // OJO: teams puede cambiar; protegemos el acceso
    return teams.find((t) => t?.id === responding.teamId)?.name ?? responding.teamId;
  }, [responding?.teamId, teams]);

  const isRespondingTeam = responding?.teamId === teamId;

  // Mi rating (del equipo)
  const myRating: any = round?.ratingTeams?.[teamId] ?? null;

  // Detectar si ya calificamos
  useEffect(() => {
    if (myRating?.rating) setHasRated(true);
    else setHasRated(false);
  }, [myRating?.rating]);

  // Detectar si es mi turno de justificar (poll cada 2s)
  useEffect(() => {
    if (phase !== "justification") {
      setIsMyTurnToJustify(false);
      return;
    }

    // Si por alguna razón todavía no tenemos gameId, no poll
    if (!gameId) {
      setIsMyTurnToJustify(false);
      return;
    }

    let alive = true;

    const checkTurn = async () => {
      try {
        const currentTeamId = await getCurrentJustifyingTeamId(gameId);
        if (!alive) return;
        setIsMyTurnToJustify(currentTeamId === teamId);
      } catch (e) {
        console.error("Error checking justification turn:", e);
      }
    };

    checkTurn();
    const interval = window.setInterval(checkTurn, 2000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [phase, gameId, teamId]);

  // Guards (orden importante: antes de usar team.name)
  if (!team) return <div style={{ padding: 16 }}>⏳ Cargando equipo…</div>;

  if (!stage2 || !round) {
    return (
      <div style={{ padding: 16 }}>
        <h2>{team.name}</h2>
        <p>Stage 2 todavía no empezó.</p>
        <p style={{ opacity: 0.8 }}>
          Volvé a Stage 1 o esperá al docente.
        </p>
      </div>
    );
  }

  // UI helpers
  const headerBoxStyle: React.CSSProperties = {
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  };

  const infoRow: React.CSSProperties = { marginBottom: 6 };
  const prettyPhase = phase ?? "—";

  const ratingLabel = (r: any) => {
    if (r === "green") return "🟩 VERDE";
    if (r === "yellow") return "🟨 AMARILLO";
    if (r === "red") return "🟥 ROJO";
    return "—";
  };

  const ratingEmoji = (r: any) => {
    if (r === "green") return "🟩";
    if (r === "yellow") return "🟨";
    if (r === "red") return "🟥";
    return "—";
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div style={{ padding: 16 }}>
      {/* HEADER SIEMPRE VISIBLE */}
      <div style={headerBoxStyle}>
        <div style={infoRow}>
          <strong>Equipo:</strong> {team.name} ({teamId})
        </div>
        <div style={infoRow}>
          <strong>Puntaje total:</strong> {(team as any).totalScore ?? 0} pts
        </div>
        <div style={infoRow}>
          <strong>Ronda:</strong> {currentRoundIndex + 1}
        </div>
        <div style={infoRow}>
          <strong>Fase:</strong> {prettyPhase}
        </div>
      </div>

      {/* BLOQUE: PREGUNTA / CONTEXTO (en fases relevantes) */}
      {(phase === "responding" ||
        phase === "responding_with_help" ||
        phase === "rating" ||
        phase === "rating_reveal" ||
        phase === "justification" ||
        phase === "validation_response" ||
        phase === "validation_ratings" ||
        phase === "results") && (
        <div
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 12,
            backgroundColor: "#f5f5f5",
            fontSize: 14,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong>Pregunta:</strong> {currentQuestion?.text ?? "—"}
          </div>
          <div>
            <strong>Respondió:</strong>{" "}
            {responding
              ? `${responding.playerName ?? "—"} (${respondingTeamName})`
              : "—"}
          </div>
        </div>
      )}

      {/* =========================
          RESPONDING / RESPONDING_WITH_HELP
         ========================= */}
      {(phase === "responding" || phase === "responding_with_help") && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          {isRespondingTeam ? (
            <>
              <h3 style={{ marginTop: 0 }}>🎤 TU TURNO: RESPONDER</h3>
              <p>Respondé oralmente al frente.</p>

              {/* Mensaje pedagógico sobre ayuda */}
              <div
                style={{
                  padding: 12,
                  backgroundColor: "#fff3cd",
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 14,
                }}
              >
                💡 Podés pedir ayuda a tu equipo con un{" "}
                <strong>descuento de 3 puntos</strong> (12 pts → 9 pts)
              </div>

              {phase === "responding_with_help" && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "#ffe0b2",
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  ⚠️ Estás respondiendo CON ayuda (máx. 9 pts)
                </div>
              )}

              <p style={{ marginTop: 12, opacity: 0.8, fontSize: 14 }}>
                ⏳ El docente controla el ritmo y avanzará cuando corresponda.
              </p>
            </>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>👂 ESCUCHANDO</h3>
              <p>Otro equipo está respondiendo. Escuchá atentamente.</p>
            </>
          )}
        </div>
      )}

      {/* =========================
          RATING (COMPLETO)
         ========================= */}
      {phase === "rating" && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ fontSize: 24, margin: 0, marginBottom: 16 }}>
            🎨 CALIFICAR RESPUESTA
          </h3>

          {!hasRated ? (
            <>
              {/* Leyenda */}
              <div
                style={{
                  padding: 12,
                  backgroundColor: "#e3f2fd",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  🟩 <strong>VERDE:</strong> Correcta, nada que agregar (5 pts)
                </div>
                <div style={{ marginBottom: 4 }}>
                  🟨 <strong>AMARILLO:</strong> Correcta, pero tengo algo importante
                  que agregar (10 pts)
                </div>
                <div>
                  🟥 <strong>ROJO:</strong> Incorrecta, voy a explicar por qué (10
                  pts si aceptado)
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={async () => {
                    try {
                      await submitRating(gameId, teamId, "green");
                      setHasRated(true);
                    } catch (e) {
                      console.error(e);
                      alert("Error al calificar");
                    }
                  }}
                  style={{
                    padding: 20,
                    fontSize: 18,
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  🟩 VERDE
                </button>

                <button
                  onClick={async () => {
                    try {
                      await submitRating(gameId, teamId, "yellow");
                      setHasRated(true);
                    } catch (e) {
                      console.error(e);
                      alert("Error al calificar");
                    }
                  }}
                  style={{
                    padding: 20,
                    fontSize: 18,
                    backgroundColor: "#FFC107",
                    color: "black",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  🟨 AMARILLO
                </button>

                <button
                  onClick={async () => {
                    try {
                      await submitRating(gameId, teamId, "red");
                      setHasRated(true);
                    } catch (e) {
                      console.error(e);
                      alert("Error al calificar");
                    }
                  }}
                  style={{
                    padding: 20,
                    fontSize: 18,
                    backgroundColor: "#F44336",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  🟥 ROJO
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                padding: 20,
                backgroundColor: "#4CAF50",
                color: "white",
                borderRadius: 8,
                textAlign: "center",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              ✅ CALIFICACIÓN ENVIADA
              <div style={{ fontSize: 14, marginTop: 8, fontWeight: 400 }}>
                Esperá a que el docente continúe…
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================
          RATING_REVEAL (MUESTRA TU COLOR)
         ========================= */}
      {phase === "rating_reveal" && myRating && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ fontSize: 24, marginBottom: 16, textAlign: "center" }}>
            🎨 TU CALIFICACIÓN
          </h3>

          <div
            style={{
              padding: 40,
              backgroundColor:
                myRating.rating === "green"
                  ? "#4CAF50"
                  : myRating.rating === "yellow"
                    ? "#FFC107"
                    : "#F44336",
              color: myRating.rating === "yellow" ? "black" : "white",
              borderRadius: 8,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {ratingEmoji(myRating.rating)}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {myRating.rating === "green" && "VERDE"}
              {myRating.rating === "yellow" && "AMARILLO"}
              {myRating.rating === "red" && "ROJO"}
            </div>
            <div style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>
              Tu equipo calificó: <strong>{ratingLabel(myRating.rating)}</strong>
            </div>
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 14,
              opacity: 0.8,
            }}
          >
            ⏳ Esperando que el docente continúe...
          </p>
        </div>
      )}

      {/* =========================
          JUSTIFICATION (CON TURNOS)
         ========================= */}
      {phase === "justification" && myRating && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ fontSize: 24, marginBottom: 16 }}>💬 JUSTIFICACIÓN</h3>

          {/* Recordatorio */}
          <div
            style={{
              padding: 12,
              backgroundColor: "#f5f5f5",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <strong>Pregunta:</strong> {currentQuestion?.text ?? "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Respondió:</strong> {responding?.playerName ?? "—"} (
              {respondingTeamName})
            </div>
            <div>
              <strong>Tu calificación:</strong> {ratingLabel(myRating.rating)}
            </div>
          </div>

          {myRating.rating === "green" ? (
            <div
              style={{
                padding: 16,
                backgroundColor: "#4CAF50",
                color: "white",
                borderRadius: 8,
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              ✅ No necesitás justificar
              <br />
              (Verde = auto-aceptado)
            </div>
          ) : isMyTurnToJustify ? (
            <div
              style={{
                padding: 20,
                backgroundColor: "#FF5722",
                color: "white",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 48, textAlign: "center", marginBottom: 8 }}>
                🎤
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, textAlign: "center" }}>
                ES TU TURNO DE JUSTIFICAR
              </div>
              <p style={{ textAlign: "center", marginTop: 8, fontSize: 16 }}>
                Justificá oralmente al frente AHORA
              </p>
            </div>
          ) : (
            <div
              style={{
                padding: 16,
                backgroundColor: "#fff3cd",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              ⏳ Esperá tu turno para justificar
            </div>
          )}
        </div>
      )}

      {/* =========================
          VALIDATION_RESPONSE (DOCENTE)
         ========================= */}
      {phase === "validation_response" && (
        <div
          style={{
            padding: 16,
            border: "2px solid #FF5722",
            borderRadius: 8,
            backgroundColor: "#fff3cd",
          }}
        >
          <h3 style={{ marginTop: 0 }}>⚖️ Validación de la respuesta</h3>
          <p>
            El docente está decidiendo si la respuesta fue <strong>correcta</strong>{" "}
            o <strong>incorrecta</strong>.
          </p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            ⏳ Esperá… esta decisión define cómo se reparten los puntos.
          </p>
        </div>
      )}

      {/* =========================
          VALIDATION_RATINGS (DOCENTE)
         ========================= */}
      {phase === "validation_ratings" && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>⚖️ Validación de calificaciones</h3>
          <p>
            El docente está validando las calificaciones <strong>amarillas</strong>{" "}
            y <strong>rojas</strong>.
          </p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            ⏳ Esperá… cuando termine, aparecerán los resultados.
          </p>
        </div>
      )}

      {/* =========================
          RESULTS (PUNTOS GANADOS + TOTAL)
         ========================= */}
      {phase === "results" && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ fontSize: 24, marginBottom: 16, textAlign: "center" }}>
            🏁 RESULTADOS
          </h3>

          {/* Puntos ganados */}
          <div
            style={{
              padding: 16,
              backgroundColor: "#4CAF50",
              color: "white",
              borderRadius: 8,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>
              Tu equipo ganó en esta ronda:
            </div>
            <div style={{ fontSize: 48, fontWeight: 700 }}>
              +{round?.pointsAwarded?.[teamId] ?? 0}
            </div>
            <div style={{ fontSize: 16, marginTop: 4 }}>puntos</div>
          </div>

          {/* Puntaje total */}
          <div
            style={{
              padding: 16,
              backgroundColor: "#f5f5f5",
              borderRadius: 8,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>
              Puntaje total del equipo:
            </div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>
              {(team as any).totalScore ?? 0} pts
            </div>
          </div>

          {/* Info adicional */}
          <div
            style={{
              padding: 12,
              backgroundColor: "#fff3cd",
              borderRadius: 8,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0 }}>
              📊 Mirá la pantalla principal para ver el ranking completo
            </p>
          </div>

          <p
            style={{
              marginTop: 16,
              fontSize: 14,
              opacity: 0.8,
              textAlign: "center",
            }}
          >
            ⏳ El docente iniciará la próxima ronda
          </p>
        </div>
      )}

      {/* =========================
          FALLBACK
         ========================= */}
      {phase &&
        phase !== "responding" &&
        phase !== "responding_with_help" &&
        phase !== "rating" &&
        phase !== "rating_reveal" &&
        phase !== "justification" &&
        phase !== "validation_response" &&
        phase !== "validation_ratings" &&
        phase !== "results" && (
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3>🚧 En construcción</h3>
            <p>Fase actual: {phase}</p>
          </div>
        )}
    </div>
  );
}
