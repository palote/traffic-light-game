// src/components/Stage2/TeamDeviceViewAdapter.tsx

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebase.config";
import { TeamDeviceView } from "./TeamDeviceView";
import type { Game } from "../../types/game";

interface TeamDeviceViewAdapterProps {
  gameId: string;
  teamId: string;
}

export function TeamDeviceViewAdapter({ gameId, teamId }: TeamDeviceViewAdapterProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gameRef = ref(database, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      setGame(data || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 18 }}>Cargando...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 18 }}>No se encontró el juego</div>
      </div>
    );
  }

  return <TeamDeviceView gameId={gameId} teamId={teamId} />;

}