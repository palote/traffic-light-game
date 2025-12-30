// src/components/setup/SetupFlowManager.tsx
// Componente principal que maneja la selección de modalidad y orquesta los flujos

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameModeSelector, type QuestionSource } from "./GameModeSelector";
import { ProposalFlowOrchestrator } from "./ProposalFlowOrchestrator";

interface SetupFlowManagerProps {
  onGameCreated: (gameId: string) => void;
  // Si viene de biblioteca, ir directo al flujo tradicional
  fromLibrary?: boolean;
}

export function SetupFlowManager({ onGameCreated, fromLibrary }: SetupFlowManagerProps) {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<QuestionSource | null>(
    fromLibrary ? 'teacher-creates' : null
  );

  // Handler: Selección de modalidad
  const handleModeSelect = (mode: QuestionSource) => {
    if (mode === 'teacher-creates') {
      // Redirigir al SetupScreen tradicional
      navigate('/setup-traditional');
    } else {
      // Usar el flujo de propuestas
      setSelectedMode('students-propose');
    }
  };

  // Handler: Volver a la selección
  const handleBackToSelection = () => {
    setSelectedMode(null);
  };

  // Si viene de biblioteca o eligió flujo tradicional, no mostrar esto
  // (el App.tsx manejará la redirección)
  
  // Si no hay modo seleccionado, mostrar selector
  if (!selectedMode) {
    return <GameModeSelector onSelect={handleModeSelect} />;
  }

  // Si eligió propuestas de alumnos
  if (selectedMode === 'students-propose') {
    return (
      <ProposalFlowOrchestrator
        onBack={handleBackToSelection}
        onGameCreated={onGameCreated}
      />
    );
  }

  return null;
}