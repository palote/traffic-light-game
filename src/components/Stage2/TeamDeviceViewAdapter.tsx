// src/components/Stage2/TeamDeviceViewAdapter.tsx

import { useEffect, useState } from "react";
import type { Game } from "../../types/game";
import { subscribeToGame } from "../../services/gameRepository";
import { TeamDeviceView } from "./TeamDeviceView";

interface TeamDeviceViewAdapterProps {
  gameId: string;
  teamId: string;
}

export function TeamDeviceViewAdapter({ gameId, teamId }: TeamDeviceViewAdapterProps) {
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    const unsub = subscribeToGame(gameId, (g) => setGame((g as Game) ?? null));
    return () => unsub();
  }, [gameId]);

  if (!game) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Stage 2 – Team Device</h2>
        <p>Cargando juego…</p>
      </div>
    );
  }

  // 👇 Acá está la magia: TeamDeviceView recibe `game` (como te pide TS)
  return <TeamDeviceView game={game} teamId={teamId} />;
}
