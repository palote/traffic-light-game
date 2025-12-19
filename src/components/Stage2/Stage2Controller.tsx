// src/components/Stage2/Stage2Controller.tsx

import { ClassroomView } from "./ClassroomView";
import { TeamDeviceViewAdapter } from "./TeamDeviceViewAdapter";

interface Stage2ControllerProps {
  gameId: string;
  teamId?: string; // si existe => dispositivo de equipo
}

export function Stage2Controller({ gameId, teamId }: Stage2ControllerProps) {
  const cleanTeamId = (teamId || "").trim();

  // PROYECTOR (docente): sin teamId
  if (!cleanTeamId) {
    return <ClassroomView gameId={gameId} />;
  }

  // DISPOSITIVO DE EQUIPO: con teamId
  return <TeamDeviceViewAdapter gameId={gameId} teamId={cleanTeamId} />;
}
