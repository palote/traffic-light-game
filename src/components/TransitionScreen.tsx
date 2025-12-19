import { useMemo, useState } from "react";
import type { Team } from "../types/game";
import "./TransitionScreen.css";

interface TransitionScreenProps {
  teams: Team[];
  onStartStage2: () => void | Promise<void>;
}

export function TransitionScreen({ teams, onStartStage2 }: TransitionScreenProps) {
  const [isStarting, setIsStarting] = useState(false);

  const rankedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aBonus = a.stage0Bonus ?? 0;
      const bBonus = b.stage0Bonus ?? 0;
      return bBonus - aBonus;
    });
  }, [teams]);

  const medal = (idx: number) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return "";
  };

  const handleStartStage2 = async () => {
    if (isStarting) return; // ✅ anti doble click
    setIsStarting(true);

    try {
      await onStartStage2();
      // ✅ si onStartStage2 cambia el status en Firebase, esta pantalla se va sola
    } catch (err) {
      console.error("Error starting Stage 2:", err);
      alert("Error al iniciar Stage 2");
      setIsStarting(false); // solo re-habilitar si falló
    }
  };

  return (
    <div className="transition-screen">
      <div className="ts-card">
        <div className="ts-header">
          <h1>🏆 TODOS LOS EQUIPOS COMPLETARON</h1>
          <h2>STAGE 1 (PRÁCTICA)</h2>
        </div>

        <div className="ts-section">
          <h3>📊 Puntajes iniciales (Stage 0 Bonus)</h3>
          <p className="ts-sub">(Bonus de preparación previa)</p>

          <div className="ts-list">
            {rankedTeams.map((t, idx) => {
              const name = t.name || `Equipo ${idx + 1}`;
              const bonus = t.stage0Bonus ?? 0;
              const currentTotal = t.totalScore ?? 0;

              // Por si todavía NO aplicaste el bonus a totalScore:
              const projectedTotal = currentTotal + bonus;

              return (
                <div
                  key={t.id}
                  className={`ts-row ${idx < 3 ? "ts-top" : ""}`}
                  aria-label={`Equipo ${name}, bonus ${bonus} puntos`}
                >
                  <span className="ts-pos">
                    {idx + 1}. {medal(idx)}
                  </span>

                  <span className="ts-name">{name}</span>

                  <span className="ts-score">
                    +{bonus} pts
                    <span className="ts-score-sub">
                      {" "}
                      (Total actual: {currentTotal} | Total inicial: {projectedTotal})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ts-section ts-motiv">
          <h3>💪 Ahora comienza Stage 2</h3>
          <p>Competencia entre equipos aplicando lo aprendido.</p>
          <p>Coordinen, ayúdense y argumenten con claridad.</p>
        </div>

        <button
          className="ts-start"
          onClick={handleStartStage2}
          disabled={isStarting}
          aria-disabled={isStarting}
        >
          {isStarting ? "INICIANDO STAGE 2..." : "COMENZAR STAGE 2 →"}
        </button>
      </div>
    </div>
  );
}
