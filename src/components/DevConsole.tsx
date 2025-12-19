import "./DevConsole.css";

type DevStage2ViewMode = "auto" | "classroom" | "team";

interface DevConsoleProps {
  onSetStage1: () => void;
  onSetStage2: () => void;

  // 🆕 Stage 2 view override (solo DEV, no Firebase)
  stage2ViewMode: DevStage2ViewMode;
  setStage2ViewMode: (v: DevStage2ViewMode) => void;

  stage2TeamId: string;
  setStage2TeamId: (v: string) => void;
}

export function DevConsole({
  onSetStage1,
  onSetStage2,
  stage2ViewMode,
  setStage2ViewMode,
  stage2TeamId,
  setStage2TeamId,
}: DevConsoleProps) {
  // Solo visible en desarrollo
  if (import.meta.env.MODE !== "development") return null;

  return (
    <div className="dev-console">
      <strong>DEV CONSOLE</strong>

      <div className="dev-row">
        <button onClick={onSetStage1}>⏮️ Forzar Stage 1</button>
        <button onClick={onSetStage2}>⏭️ Forzar Stage 2</button>
      </div>

      <hr className="dev-sep" />

      <div className="dev-section">
        <div className="dev-title">Stage 2 – Vista</div>

        <div className="dev-row">
          <button
            className={stage2ViewMode === "auto" ? "dev-active" : ""}
            onClick={() => setStage2ViewMode("auto")}
            title="Usa el teamId normal"
          >
            Auto
          </button>

          <button
            className={stage2ViewMode === "classroom" ? "dev-active" : ""}
            onClick={() => setStage2ViewMode("classroom")}
            title="Fuerza vista de Classroom (sin teamId)"
          >
            Classroom
          </button>

          <button
            className={stage2ViewMode === "team" ? "dev-active" : ""}
            onClick={() => setStage2ViewMode("team")}
            title="Fuerza vista de TeamDevice (con teamId elegido)"
          >
            Team
          </button>
        </div>

        {stage2ViewMode === "team" && (
          <div className="dev-row">
            <span style={{ fontSize: 12, opacity: 0.85 }}>Team ID:</span>
            <input
              value={stage2TeamId}
              onChange={(e) => setStage2TeamId(e.target.value)}
              placeholder="teamA"
              className="dev-input"
            />
          </div>
        )}

        <div className="dev-note">
          Esto solo cambia la vista local (DEV). No toca Firebase.
        </div>
      </div>
    </div>
  );
}
