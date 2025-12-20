// src/components/Stage2/TeamDeviceView.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase.config";
import type { Game, Team, Question, RatingColor } from "../../types/game";
import {
  setRespondingHelpRequested,
  setRespondingResponseGiven,
  submitRating,
  setRaterJustification,
  getCurrentJustifyingTeamId,
} from "../../services/stage2Repository";

interface TeamDeviceViewProps {
  gameId: string;
  teamId: string;
}

export function TeamDeviceView({ gameId, teamId }: TeamDeviceViewProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [localJustification, setLocalJustification] = useState("");
  const [now, setNow] = useState(() => Date.now());
  
  // 🆕 Estado local para saber si ya calificó
  const [hasRated, setHasRated] = useState(false);
  
  // 🆕 Estado para saber si es su turno de justificar
  const [isMyTurnToJustify, setIsMyTurnToJustify] = useState(false);

  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const gameRef = ref(database, `games/${gameId}`);
    const unsub = onValue(gameRef, (snap) => {
      setGame(snap.val() ?? null);
    });
    return () => unsub();
  }, [gameId]);

  // Team robusto para RTDB
  const team = useMemo(() => {
    const raw: any = (game as any)?.teams;
    if (!raw) return null;
    if (raw[teamId]) return raw[teamId] as Team;

    const teamsArray: Team[] = Array.isArray(raw)
      ? (raw as any)
      : typeof raw === "object"
        ? (Object.values(raw) as any)
        : [];

    return (teamsArray.find((t: any) => t?.id === teamId) as any) ?? null;
  }, [game, teamId]);

  const round = useMemo(() => {
    if (!game?.stage2) return null;
    return game.stage2.rounds?.[game.stage2.currentRound] ?? null;
  }, [game]);

  const phase = round?.phase ?? null;
  const responding = round?.respondingTeam ?? null;

  const isRespondingTeam = responding?.teamId === teamId;
  const isRaterTeam = !!round?.ratingTeams?.[teamId];
  const myRaterData = isRaterTeam ? round?.ratingTeams?.[teamId] ?? null : null;

  const roleLabel = isRespondingTeam
    ? "🎤 Tu equipo RESPONDE"
    : isRaterTeam
      ? "✍️ Tu equipo CALIFICA"
      : "👀 Observando";

  // Pregunta actual
  const currentQuestion = useMemo(() => {
    if (!game || !round) return null;
    const raw: any = (game as any).questions;
    const questionsArray: Question[] = Array.isArray(raw)
      ? (raw as any)
      : raw && typeof raw === "object"
        ? (Object.values(raw) as any)
        : [];

    const found = questionsArray.find((q: any) => q?.id === round.questionId);

    if (!found && raw && typeof raw === "object") {
      const byKey = raw[round.questionId];
      return byKey ? ({ id: round.questionId, ...byKey } as any) : null;
    }
    return (found as any) ?? null;
  }, [game, round]);

  // Sincroniza justificación desde RTDB
  useEffect(() => {
    if (myRaterData?.justification != null) {
      setLocalJustification(myRaterData.justification);
    }
  }, [myRaterData?.justification]);

  // 🆕 Sincroniza estado de calificación desde RTDB
  useEffect(() => {
    if (myRaterData?.rating != null) {
      setHasRated(true);
    } else {
      setHasRated(false);
    }
  }, [myRaterData?.rating]);

  // 🆕 Detectar si es el turno de justificar de este equipo
  useEffect(() => {
    if (phase !== "justification") {
      setIsMyTurnToJustify(false);
      return;
    }

    const checkTurn = async () => {
      try {
        const currentTeamId = await getCurrentJustifyingTeamId(gameId);
        setIsMyTurnToJustify(currentTeamId === teamId);
      } catch (e) {
        console.error("Error checking justification turn:", e);
        setIsMyTurnToJustify(false);
      }
    };

    checkTurn();
  }, [gameId, teamId, phase, round?.currentJustificationIndex]);

  // Countdown para responding help
  const needsRespondingCountdown = useMemo(() => {
    return phase === "responding_with_help" && isRespondingTeam && !!responding?.helpStartedAt;
  }, [phase, isRespondingTeam, responding?.helpStartedAt]);

  useEffect(() => {
    if (tickIntervalRef.current) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    if (!needsRespondingCountdown) return;

    tickIntervalRef.current = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      if (tickIntervalRef.current) {
        window.clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [needsRespondingCountdown]);

  const respondingHelpRemaining = useMemo(() => {
    if (phase !== "responding_with_help") return null;
    if (!isRespondingTeam) return null;
    if (!responding?.helpStartedAt) return null;

    const elapsedMs = now - responding.helpStartedAt;
    const totalMs = (responding.helpDuration ?? 60) * 1000;
    const left = Math.max(0, totalMs - elapsedMs);
    return Math.ceil(left / 1000);
  }, [phase, isRespondingTeam, responding?.helpStartedAt, responding?.helpDuration, now]);

  // Returns tempranos
  if (!game) return <div style={{ padding: 24 }}>⏳ Cargando…</div>;

  if (!team) {
    return (
      <div style={{ padding: 24 }}>
        ❌ No encuentro el equipo <b>{teamId}</b> en Firebase.
      </div>
    );
  }

  if (!game.stage2 || !round) {
    return (
      <div style={{ padding: 24 }}>
        <h2>STAGE 2 – DISPOSITIVO DE EQUIPO</h2>
        <p>
          Equipo: <b>{team?.name ?? "—"}</b> ({teamId})
        </p>
        <p>Stage 2 todavía no está iniciado. Esperá al docente…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>STAGE 2 – DISPOSITIVO DE EQUIPO</h2>

      <div style={{ marginBottom: 12 }}>
        <div>
          Equipo: <b>{team.name}</b> ({teamId})
        </div>
        <div>
          Puntaje: <b>{team.totalScore ?? 0}</b> pts
        </div>
        <div>
          Ronda: <b>{game.stage2.currentRound + 1}</b>
        </div>
        <div>
          Fase: <b>{phase}</b>
        </div>
        <div>
          Rol: <b>{roleLabel}</b>
        </div>
      </div>

      {/* Mostrar pregunta/hint */}
      <div style={{ padding: 12, border: "1px solid #ddd", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {phase === "hint" ? "💡 PISTA" : 
           phase === "designated" ? "👥 REPRESENTANTES" :
           "📝 PREGUNTA"}
        </div>
        <div style={{ fontSize: 16 }}>
          {phase === "hint" ? (
            currentQuestion?.hint ?? "—"
          ) : phase === "designated" ? (
            "Esperando que el docente revele la pregunta..."
          ) : (
            currentQuestion?.text ?? "—"
          )}
        </div>
      </div>

      {/* HINT */}
      {phase === "hint" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          <p>💬 Discutan en equipo la estrategia mientras corre el tiempo.</p>
          <p>⏳ Esperá a que el docente designe representantes.</p>
        </div>
      )}

      {/* DESIGNATED */}
      {phase === "designated" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          <h3>👤 REPRESENTANTES</h3>

          {isRespondingTeam && responding && (
            <p>
              Tu representante es: <b>{responding.playerName}</b>. Pasá al frente debajo de tu equipo.
            </p>
          )}

          {isRaterTeam && myRaterData && (
            <p>
              Tu representante es: <b>{myRaterData.playerName}</b>. Pasá al frente debajo de tu equipo.
            </p>
          )}

          {!isRespondingTeam && !isRaterTeam && (
            <p>Tu equipo no tiene representante en esta ronda. Observá y ayudá.</p>
          )}

          <p>⏳ Esperá a que el docente revele la pregunta.</p>
        </div>
      )}

      {/* QUESTION REVEALED */}
      {phase === "question_revealed" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          <h3>📝 PREGUNTA REVELADA</h3>
          {isRespondingTeam ? (
            <p>⏳ Esperando que el docente inicie la fase de respuesta…</p>
          ) : isRaterTeam ? (
            <p>👂 Escuchá la respuesta. Prepárate para calificar.</p>
          ) : (
            <p>👀 Observá la proyección y ayudá a tu equipo desde el lugar.</p>
          )}
        </div>
      )}

      {/* RESPONDING */}
      {phase === "responding" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          {isRespondingTeam ? (
            <>
              <h3>🎤 TU TURNO: RESPONDER</h3>
              <p>Respondé oralmente al frente.</p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  onClick={async () => {
                    try {
                      await setRespondingHelpRequested(gameId, true);
                    } catch (e) {
                      console.error(e);
                      alert("Error pidiendo ayuda.");
                    }
                  }}
                >
                  🆘 CON AYUDA
                </button>

                <button
                  onClick={async () => {
                    try {
                      await setRespondingResponseGiven(gameId, true);
                    } catch (e) {
                      console.error(e);
                      alert("Error marcando respuesta dada.");
                    }
                  }}
                >
                  ✅ RESPUESTA DADA
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>👂 ESCUCHANDO</h3>
              <p>⏳ Esperando que responda el equipo que está al frente.</p>
            </>
          )}
        </div>
      )}

      {/* RESPONDING WITH HELP */}
      {phase === "responding_with_help" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          {isRespondingTeam ? (
            <>
              <h3>🤝 AYUDA ACTIVADA</h3>
              <p>
                💬 Discutí con tu equipo. Tiempo restante: <b>{respondingHelpRemaining ?? "—"}</b> s
              </p>
              <p style={{ marginTop: 12, opacity: 0.8 }}>
                ⏳ El docente controlará el timer y avanzará cuando esté listo.
              </p>
            </>
          ) : (
            <p>⏳ Esperando… (el equipo que responde pidió ayuda)</p>
          )}
        </div>
      )}

      {/* 🆕 RATING (CALIFICACIÓN SIMULTÁNEA) */}
      {phase === "rating" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          {isRaterTeam ? (
            <>
              <h3>✍️ CALIFICÁ LA RESPUESTA</h3>

              <div style={{ 
                padding: 12, 
                backgroundColor: "#f5f5f5", 
                marginBottom: 12,
                borderRadius: 4 
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Pregunta:</div>
                <div style={{ marginBottom: 8 }}>{currentQuestion?.text ?? "—"}</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Respuesta escuchada:</div>
                <div style={{ fontStyle: "italic" }}>(lo que dijo el representante)</div>
              </div>

              {!hasRated ? (
                <>
                  <div style={{ marginBottom: 12, fontSize: 14 }}>
                    Elegí un color según la calidad de la respuesta:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button
                      onClick={async () => {
                        try {
                          await submitRating(gameId, teamId, "green");
                          setHasRated(true);
                        } catch (e) {
                          console.error(e);
                          alert("Error enviando calificación VERDE.");
                        }
                      }}
                      style={{
                        padding: 16,
                        fontSize: 18,
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      🟩 VERDE<br/>
                      <span style={{ fontSize: 14 }}>Correcta y completa</span>
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          await submitRating(gameId, teamId, "yellow");
                          setHasRated(true);
                        } catch (e) {
                          console.error(e);
                          alert("Error enviando calificación AMARILLO.");
                        }
                      }}
                      style={{
                        padding: 16,
                        fontSize: 18,
                        backgroundColor: "#FFC107",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      🟨 AMARILLO<br/>
                      <span style={{ fontSize: 14 }}>Correcta pero incompleta</span>
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          await submitRating(gameId, teamId, "red");
                          setHasRated(true);
                        } catch (e) {
                          console.error(e);
                          alert("Error enviando calificación ROJO.");
                        }
                      }}
                      style={{
                        padding: 16,
                        fontSize: 18,
                        backgroundColor: "#F44336",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      🟥 ROJO<br/>
                      <span style={{ fontSize: 14 }}>Incorrecta</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ 
                  padding: 16, 
                  backgroundColor: "#4CAF50", 
                  color: "white",
                  borderRadius: 8,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 700,
                }}>
                  ✅ CALIFICACIÓN ENVIADA
                  <div style={{ fontSize: 14, marginTop: 8, fontWeight: 400 }}>
                    Esperá a que el docente finalice la fase
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 16, textAlign: "center" }}>
              <p>👀 Observando fase de calificación</p>
              <p style={{ fontSize: 14, opacity: 0.8 }}>
                {isRespondingTeam 
                  ? "Tu equipo respondió, ahora esperá las calificaciones"
                  : "Tu equipo no participa en esta ronda"
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🆕 RATING REVEAL */}
      {phase === "rating_reveal" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          <h3>📊 CALIFICACIONES REVELADAS</h3>
          
          {isRaterTeam && myRaterData ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8 }}>Tu calificación fue:</div>
              <div style={{ 
                fontSize: 48, 
                textAlign: "center",
                padding: 16,
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
              }}>
                {myRaterData.rating === "green" ? "🟩 VERDE" :
                 myRaterData.rating === "yellow" ? "🟨 AMARILLO" :
                 myRaterData.rating === "red" ? "🟥 ROJO" : "—"}
              </div>
            </div>
          ) : (
            <p>👀 Mirá la pantalla principal para ver todas las calificaciones</p>
          )}

          <p style={{ marginTop: 12, fontSize: 14, opacity: 0.8 }}>
            ⏳ El docente avanzará a la siguiente fase
          </p>
        </div>
      )}

      {/* JUSTIFICATION */}
      {phase === "justification" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          {isRaterTeam && myRaterData && (myRaterData.rating === "yellow" || myRaterData.rating === "red") ? (
            <>
              {isMyTurnToJustify && (
                <div style={{
                  padding: 16,
                  backgroundColor: "#FF9800",
                  color: "white",
                  borderRadius: 8,
                  textAlign: "center",
                  marginBottom: 16,
                  fontSize: 20,
                  fontWeight: 700,
                }}>
                  🎤 ES TU TURNO DE JUSTIFICAR
                </div>
              )}

              <h3>📝 JUSTIFICÁ TU CALIFICACIÓN</h3>
              
              <div style={{ marginBottom: 12 }}>
                <div>Calificaste: 
                  <span style={{ 
                    marginLeft: 8,
                    fontSize: 24,
                  }}>
                    {myRaterData.rating === "yellow" ? "🟨 AMARILLO" : "🟥 ROJO"}
                  </span>
                </div>
              </div>

              <div style={{ 
                padding: 12, 
                backgroundColor: "#fff3cd",
                borderRadius: 4,
                marginBottom: 12,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {myRaterData.rating === "yellow" 
                    ? "Explicá qué le falta o qué puede mejorarse"
                    : "Explicá cuál es el error en la respuesta"
                  }
                </div>
              </div>

              <textarea
                value={localJustification}
                onChange={(e) => setLocalJustification(e.target.value)}
                placeholder="Escribí tu justificación (opcional, podés justificar solo oralmente)"
                rows={4}
                style={{ 
                  width: "100%", 
                  padding: 10,
                  fontSize: 16,
                  borderRadius: 4,
                  border: "1px solid #ddd",
                }}
              />

              <button
                style={{ 
                  marginTop: 12,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  width: "100%",
                }}
                onClick={async () => {
                  try {
                    await setRaterJustification(gameId, teamId, localJustification);
                    alert("✅ Justificación guardada");
                  } catch (e) {
                    console.error(e);
                    alert("Error guardando justificación.");
                  }
                }}
              >
                💾 GUARDAR JUSTIFICACIÓN
              </button>

              <div style={{ 
                marginTop: 12,
                padding: 12,
                backgroundColor: isMyTurnToJustify ? "#e3f2fd" : "#f5f5f5",
                borderRadius: 4,
              }}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  {isMyTurnToJustify ? (
                    <>💬 <strong>Justificá oralmente al frente AHORA</strong></>
                  ) : (
                    <>⏳ Esperá tu turno para justificar oralmente</>
                  )}
                </p>
              </div>
            </>
          ) : isRaterTeam && myRaterData?.rating === "green" ? (
            <div style={{ 
              padding: 16, 
              backgroundColor: "#4CAF50",
              color: "white",
              borderRadius: 8,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🟩</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Calificaste VERDE
              </div>
              <div style={{ marginTop: 8, fontSize: 14 }}>
                No necesitás justificar (verde = auto-aceptado)
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 16 }}>
              <p>👀 Observando justificaciones</p>
              <p style={{ fontSize: 14, opacity: 0.8 }}>
                Mirá la pantalla principal
              </p>
            </div>
          )}
        </div>
      )}

      {/* VALIDATION */}
      {phase === "validation" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          <h3>⚖️ VALIDACIÓN</h3>
          <p>El docente está validando las calificaciones.</p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            ⏳ Esperá a ver los resultados finales
          </p>
        </div>
      )}

      {/* RESULTS */}
      {phase === "results" && (
        <div style={{ padding: 16, border: "1px solid #ddd" }}>
          <h3 style={{ fontSize: 24, marginBottom: 16, textAlign: "center" }}>
            🏁 RESULTADOS
          </h3>

          {/* Puntos ganados por este equipo */}
          <div style={{
            padding: 16,
            backgroundColor: "#4CAF50",
            color: "white",
            borderRadius: 8,
            marginBottom: 16,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>
              Tu equipo ganó en esta ronda:
            </div>
            <div style={{ fontSize: 48, fontWeight: 700 }}>
              +{round.pointsAwarded?.[teamId] ?? 0}
            </div>
            <div style={{ fontSize: 16, marginTop: 4 }}>
              puntos
            </div>
          </div>

          {/* Puntaje total actualizado */}
          <div style={{
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
            marginBottom: 16,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>
              Puntaje total del equipo:
            </div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>
              {team.totalScore ?? 0} pts
            </div>
          </div>

          {/* Información adicional */}
          <div style={{ 
            padding: 12, 
            backgroundColor: "#fff3cd",
            borderRadius: 8,
            fontSize: 14,
            textAlign: "center",
          }}>
            <p style={{ margin: 0 }}>
              📊 Mirá la pantalla principal para ver:
            </p>
            <ul style={{ 
              listStyle: "none", 
              padding: 0, 
              margin: "8px 0 0 0",
              textAlign: "left",
            }}>
              <li>• Ganador de la ronda</li>
              <li>• Puntos de todos los equipos</li>
              <li>• Ranking actualizado</li>
              <li>• Resumen pedagógico</li>
            </ul>
          </div>

          <p style={{ marginTop: 16, fontSize: 14, opacity: 0.8, textAlign: "center" }}>
            ⏳ El docente iniciará la próxima ronda
          </p>
        </div>
      )}

      {/* Otras fases no implementadas */}
      {phase &&
        phase !== "hint" &&
        phase !== "designated" &&
        phase !== "question_revealed" &&
        phase !== "responding" &&
        phase !== "responding_with_help" &&
        phase !== "rating" &&
        phase !== "rating_reveal" &&
        phase !== "justification" &&
        phase !== "validation" &&
        phase !== "results" && (
          <div style={{ padding: 16, border: "1px solid #ddd" }}>
            <h3>🚧 En construcción</h3>
            <p>Esta fase todavía no está implementada en el dispositivo.</p>
          </div>
        )}
    </div>
  );
}
