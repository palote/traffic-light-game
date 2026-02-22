// src/components/PostGame/GroupReflectionSetup.tsx
// 🎤 Panel para configurar y gestionar la reflexión grupal (cierre pedagógico)
// El docente selecciona qué reflexiones compartir con toda la clase

import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { Team, GroupReflectionStrategy } from "../../types/game";

// Reflexión seleccionada para compartir
export interface SelectedReflection {
  odgId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  whatLearned: string;
  order: number;          // Orden de presentación
  presentedAt?: number;   // Timestamp cuando se presentó
}

interface GroupReflectionSetupProps {
  gameId: string;
  teams: Team[];
  strategy: GroupReflectionStrategy;
  timeMinutes: number;
  onStartPresentation: (reflections: SelectedReflection[]) => void;
  onClose: () => void;
}

export function GroupReflectionSetup({
  gameId,
  teams,
  strategy,
  timeMinutes,
  onStartPresentation,
  onClose,
}: GroupReflectionSetupProps) {
  const { language } = useI18n();

  // Todas las autoevaluaciones disponibles
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reflexiones seleccionadas para la presentación
  const [selectedReflections, setSelectedReflections] = useState<SelectedReflection[]>([]);

  const texts = {
    es: {
      title: "Reflexión Grupal",
      subtitle: "Seleccioná las reflexiones para compartir con toda la clase",
      loading: "Cargando reflexiones...",
      noEvaluations: "No hay autoevaluaciones disponibles",
      strategyTop3: "Estrategia: Top 3 más mencionados",
      strategyOnePerTeam: "Estrategia: Uno por equipo",
      strategyManual: "Estrategia: Selección manual",
      autoSelect: "🎯 Selección automática",
      clearSelection: "🗑️ Limpiar selección",
      selectedCount: "seleccionadas",
      timeAvailable: "Tiempo disponible",
      minutes: "minutos",
      startPresentation: "🎬 Iniciar Presentación",
      team: "Equipo",
      mentions: "menciones",
      selected: "Seleccionada",
      selectForPresentation: "Seleccionar",
      dragToReorder: "Arrastrá para reordenar",
      close: "Cerrar",
    },
    en: {
      title: "Group Reflection",
      subtitle: "Select reflections to share with the whole class",
      loading: "Loading reflections...",
      noEvaluations: "No self-evaluations available",
      strategyTop3: "Strategy: Top 3 most mentioned",
      strategyOnePerTeam: "Strategy: One per team",
      strategyManual: "Strategy: Manual selection",
      autoSelect: "🎯 Auto-select",
      clearSelection: "🗑️ Clear selection",
      selectedCount: "selected",
      timeAvailable: "Time available",
      minutes: "minutes",
      startPresentation: "🎬 Start Presentation",
      team: "Team",
      mentions: "mentions",
      selected: "Selected",
      selectForPresentation: "Select",
      dragToReorder: "Drag to reorder",
      close: "Close",
    },
    pt: {
      title: "Reflexão em Grupo",
      subtitle: "Selecione as reflexões para compartilhar com toda a turma",
      loading: "Carregando reflexões...",
      noEvaluations: "Não há autoavaliações disponíveis",
      strategyTop3: "Estratégia: Top 3 mais mencionados",
      strategyOnePerTeam: "Estratégia: Um por equipe",
      strategyManual: "Estratégia: Seleção manual",
      autoSelect: "🎯 Seleção automática",
      clearSelection: "🗑️ Limpar seleção",
      selectedCount: "selecionadas",
      timeAvailable: "Tempo disponível",
      minutes: "minutos",
      startPresentation: "🎬 Iniciar Apresentação",
      team: "Equipe",
      mentions: "menções",
      selected: "Selecionada",
      selectForPresentation: "Selecionar",
      dragToReorder: "Arraste para reordenar",
      close: "Fechar",
    },
  };

  const t = texts[language] || texts.es;

  // Cargar autoevaluaciones
  useEffect(() => {
    const evalsRef = ref(database, `games/${gameId}/selfEvaluations`);

    const unsubscribe = onValue(evalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setEvaluations(Object.values(data));
      } else {
        setEvaluations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  // Selección automática según estrategia
  const handleAutoSelect = () => {
    let selected: SelectedReflection[] = [];

    if (strategy === "top3") {
      // Contar menciones (quién fue más mencionado como "me ayudó")
      const mentionCount: Record<string, number> = {};
      evaluations.forEach((ev) => {
        (ev.helpedBy || []).forEach((id: string) => {
          mentionCount[id] = (mentionCount[id] || 0) + 1;
        });
      });

      // Ordenar por menciones y tomar top 3
      const sorted = evaluations
        .map((ev) => ({
          ...ev,
          mentions: mentionCount[ev.playerId] || 0,
        }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 3);

      selected = sorted.map((ev, index) => ({
        odgId: ev.odgId,
        playerId: ev.playerId,
        playerName: ev.playerName,
        teamId: ev.teamId,
        teamName: ev.teamName,
        whatLearned: ev.whatLearned,
        order: index + 1,
      }));
    } else if (strategy === "onePerTeam") {
      // Uno por equipo (el primero de cada equipo)
      const byTeam: Record<string, any> = {};
      evaluations.forEach((ev) => {
        if (!byTeam[ev.teamId]) {
          byTeam[ev.teamId] = ev;
        }
      });

      selected = Object.values(byTeam).map((ev: any, index) => ({
        odgId: ev.odgId,
        playerId: ev.playerId,
        playerName: ev.playerName,
        teamId: ev.teamId,
        teamName: ev.teamName,
        whatLearned: ev.whatLearned,
        order: index + 1,
      }));
    }
    // Si es manual, no hacemos nada automático

    setSelectedReflections(selected);
  };

  // Agregar/quitar de selección manual
  const toggleSelection = (ev: any) => {
    const exists = selectedReflections.find((s) => s.odgId === ev.odgId);
    
    if (exists) {
      setSelectedReflections((prev) => prev.filter((s) => s.odgId !== ev.odgId));
    } else {
      setSelectedReflections((prev) => [
        ...prev,
        {
          odgId: ev.odgId,
          playerId: ev.playerId,
          playerName: ev.playerName,
          teamId: ev.teamId,
          teamName: ev.teamName,
          whatLearned: ev.whatLearned,
          order: prev.length + 1,
        },
      ]);
    }
  };

  // Guardar selección y comenzar
  const handleStartPresentation = async () => {
    try {
      await update(ref(database, `games/${gameId}`), {
        groupReflection: {
          active: true,
          startedAt: Date.now(),
          timeMinutes,
          reflections: selectedReflections,
          currentIndex: 0,
        },
      });
      onStartPresentation(selectedReflections);
    } catch (error) {
      console.error("Error starting group reflection:", error);
    }
  };

  const strategyText =
    strategy === "top3"
      ? t.strategyTop3
      : strategy === "onePerTeam"
      ? t.strategyOnePerTeam
      : t.strategyManual;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          width: "100%",
          maxWidth: 800,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                🎤 {t.title}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>{t.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              ✕
            </button>
          </div>

          {/* Info bar */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: "#f0f9ff",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "#0369a1" }}>{strategyText}</span>
            <span style={{ fontSize: 13, color: "#0369a1" }}>
              ⏱️ {t.timeAvailable}: {timeMinutes} {t.minutes}
            </span>
          </div>
        </div>

        {/* Actions bar */}
        <div
          style={{
            padding: "12px 24px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleAutoSelect}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t.autoSelect}
            </button>
            <button
              onClick={() => setSelectedReflections([])}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: "#f1f5f9",
                color: "#64748b",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t.clearSelection}
            </button>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>
            {selectedReflections.length} {t.selectedCount}
          </span>
        </div>

        {/* Content - Lista de evaluaciones */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              ⏳ {t.loading}
            </div>
          ) : evaluations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              📭 {t.noEvaluations}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {evaluations.map((ev) => {
                const isSelected = selectedReflections.find((s) => s.odgId === ev.odgId);
                const order = isSelected?.order;

                return (
                  <div
                    key={ev.odgId}
                    onClick={() => toggleSelection(ev)}
                    style={{
                      padding: 16,
                      backgroundColor: isSelected ? "#eff6ff" : "white",
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {isSelected && (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {order}
                          </div>
                        )}
                        <div>
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{ev.playerName}</span>
                          <span style={{ color: "#64748b", marginLeft: 8, fontSize: 13 }}>
                            {ev.teamName}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: isSelected ? "#3b82f6" : "#f1f5f9",
                          color: isSelected ? "white" : "#64748b",
                        }}
                      >
                        {isSelected ? t.selected : t.selectForPresentation}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "12px 0 0",
                        fontSize: 14,
                        color: "#334155",
                        lineHeight: 1.5,
                      }}
                    >
                      "{ev.whatLearned}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {t.close}
          </button>
          <button
            onClick={handleStartPresentation}
            disabled={selectedReflections.length === 0}
            style={{
              padding: "12px 32px",
              fontSize: 14,
              fontWeight: 700,
              backgroundColor: selectedReflections.length > 0 ? "#22c55e" : "#e2e8f0",
              color: selectedReflections.length > 0 ? "white" : "#94a3b8",
              border: "none",
              borderRadius: 8,
              cursor: selectedReflections.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            {t.startPresentation}
          </button>
        </div>
      </div>
    </div>
  );
}