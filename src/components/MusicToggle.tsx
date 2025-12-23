import { useState } from "react";
import {
  isCountdownMusicEnabled,
  toggleCountdownMusic,
} from "../hooks/useCountdownMusic";

interface MusicToggleProps {
  style?: React.CSSProperties;
}

export function MusicToggle({ style }: MusicToggleProps) {
  const [enabled, setEnabled] = useState(isCountdownMusicEnabled());

  const handleToggle = () => {
    const next = toggleCountdownMusic();
    setEnabled(next);
  };

  return (
    <button
      onClick={handleToggle}
      title={enabled ? "Desactivar música" : "Activar música"}
      style={{
        padding: "8px 12px",
        fontSize: 20,
        backgroundColor: enabled ? "#673ab7" : "#9e9e9e",
        color: "white",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {enabled ? "🎵" : "🚫🎵"}
      <span style={{ fontSize: 14 }}>{enabled ? "MUSIC ON" : "MUSIC OFF"}</span>
    </button>
  );
}
