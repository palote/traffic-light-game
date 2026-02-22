// src/components/Stage2/FinalPodium.tsx
// 🏆 Pantalla final con podio estilo Kahoot
// ✅ SIMPLIFICADO: Autoevaluación directa sin sistema de referidos
// 🎯 FIX CONTRASTE WCAG: Textos semi-transparentes → white sólido

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, update } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { Team, GameConfig } from "../../types/game";
// 1. Import actualizado
import { SelfEvalShareModal } from "../SelfEvalShareModal";

interface FinalPodiumProps {
  teams: Team[];
  gameId: string;
  config?: GameConfig;
}

export function FinalPodium({ teams, gameId, config: propConfig }: FinalPodiumProps) {
  const navigate = useNavigate();
  const { language } = useI18n();

  const [showSelfEvalModal, setShowSelfEvalModal] = useState(false);
  const [selfEvalActive, setSelfEvalActive] = useState(false);
  const [activating, setActivating] = useState(false);
  
  // 2. Estado renombrado
  const [showSelfEvalShare, setShowSelfEvalShare] = useState(false);
  
  // Estado para el config
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(propConfig || null);
  const [loadingConfig, setLoadingConfig] = useState(!propConfig);

  // Cargar config de Firebase si no viene como prop
  useEffect(() => {
    if (propConfig) {
      setGameConfig(propConfig);
      setLoadingConfig(false);
      return;
    }

    const loadConfig = async () => {
      try {
        const configSnap = await get(ref(database, `games/${gameId}/config`));
        if (configSnap.exists()) {
          setGameConfig(configSnap.val());
        }
        
        // También verificar si ya está activa
        const gameSnap = await get(ref(database, `games/${gameId}/selfEvaluationActive`));
        if (gameSnap.exists() && gameSnap.val() === true) {
          setSelfEvalActive(true);
        }
      } catch (error) {
        console.error("Error loading game config:", error);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();
  }, [gameId, propConfig]);

  // Verificar si autoevaluación está habilitada en config
  const isSelfEvalEnabled = gameConfig?.pedagogicalDevices?.selfEvaluation?.enabled ?? false;

  const texts = {
    es: {
      gameOver: "¡JUEGO TERMINADO!",
      finalResults: "Resultados finales",
      champion: "CAMPEÓN",
      otherParticipants: "Otros participantes",
      backToDashboard: "Volver al Dashboard",
      selfEvalButton: "📝 Activar Autoevaluación",
      selfEvalActive: "✅ Autoevaluación Activa",
      modalTitle: "Activar Autoevaluación",
      modalDesc: "Al activar, tus alumnos podrán completar su autoevaluación desde sus dispositivos.",
      modalPoint1: "Reflexionarán sobre qué aprendieron",
      modalPoint2: "Indicarán quién los ayudó",
      modalPoint3: "Reconocerán a quién ayudaron",
      activateButton: "🚀 Activar ahora",
      activating: "Activando...",
      close: "Cancelar",
      selfEvalInstructions: "Los alumnos pueden acceder desde la pantalla de su equipo",
      newGame: "🎮 Nuevo Juego",
      viewEvaluations: "📋 Ver Autoevaluaciones",
      notifyClassroom: "📢 Notificar por Google Classroom",
      // 3. Nueva clave shareEvalLinks
      shareEvalLinks: "📋 Compartir links",
    },
    en: {
      gameOver: "GAME OVER!",
      finalResults: "Final results",
      champion: "CHAMPION",
      otherParticipants: "Other participants",
      backToDashboard: "Back to Dashboard",
      selfEvalButton: "📝 Activate Self-Evaluation",
      selfEvalActive: "✅ Self-Evaluation Active",
      modalTitle: "Activate Self-Evaluation",
      modalDesc: "When activated, your students can complete their self-evaluation from their devices.",
      modalPoint1: "They'll reflect on what they learned",
      modalPoint2: "They'll indicate who helped them",
      modalPoint3: "They'll recognize who they helped",
      activateButton: "🚀 Activate now",
      activating: "Activating...",
      close: "Cancel",
      selfEvalInstructions: "Students can access from their team's screen",
      newGame: "🎮 New Game",
      viewEvaluations: "📋 View Evaluations",
      notifyClassroom: "📢 Notify via Google Classroom",
      // 3. Nueva clave shareEvalLinks
      shareEvalLinks: "📋 Share links",
    },
    pt: {
      gameOver: "FIM DE JOGO!",
      finalResults: "Resultados finais",
      champion: "CAMPEÃO",
      otherParticipants: "Outros participantes",
      backToDashboard: "Voltar ao Dashboard",
      selfEvalButton: "📝 Ativar Autoavaliação",
      selfEvalActive: "✅ Autoavaliação Ativa",
      modalTitle: "Ativar Autoavaliação",
      modalDesc: "Ao ativar, seus alunos poderão completar a autoavaliação em seus dispositivos.",
      modalPoint1: "Refletirão sobre o que aprenderam",
      modalPoint2: "Indicarão quem os ajudou",
      modalPoint3: "Reconhecerão quem ajudaram",
      activateButton: "🚀 Ativar agora",
      activating: "Ativando...",
      close: "Cancelar",
      selfEvalInstructions: "Os alunos podem acessar pela tela de sua equipe",
      newGame: "🎮 Novo Jogo",
      viewEvaluations: "📋 Ver Avaliações",
      notifyClassroom: "📢 Notificar pelo Google Classroom",
      // 3. Nueva clave shareEvalLinks
      shareEvalLinks: "📋 Compartilhar links",
    },
  };

  const t = texts[language] || texts.es;

  // ✅ SIMPLIFICADO: Activar directamente sin verificación de referidos
  const handleActivateSelfEval = async () => {
    if (activating) return;
    
    setActivating(true);
    try {
      await update(ref(database, `games/${gameId}`), {
        selfEvaluationActive: true,
        selfEvaluationActivatedAt: Date.now()
      });
      setSelfEvalActive(true);
      setShowSelfEvalModal(false);
    } catch (error) {
      console.error("Error activating self-evaluation:", error);
      alert(language === "es" 
        ? "Error al activar la autoevaluación" 
        : language === "pt"
          ? "Erro ao ativar a autoavaliação"
          : "Error activating self-evaluation"
      );
    } finally {
      setActivating(false);
    }
  };

  // Ordenar equipos por puntaje total (mayor a menor)
  const sortedTeams = [...teams].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

  const first = sortedTeams[0];
  const second = sortedTeams[1];
  const third = sortedTeams[2];
  const rest = sortedTeams.slice(3);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Título */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "white",
            margin: 0,
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {t.gameOver}
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "white",
            marginTop: 8,
          }}
        >
          {t.finalResults}
        </p>
      </div>

      {/* Podio */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 16,
          marginBottom: 40,
          width: "100%",
          maxWidth: 600,
        }}
      >
        {/* 2do lugar */}
        {second && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🥈</div>
            <div
              style={{
                backgroundColor: "#64748b",
                borderRadius: "16px 16px 0 0",
                padding: "20px 16px",
                width: "100%",
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 -4px 20px rgba(100, 116, 139, 0.4)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4, color: "white" }}>{second.name?.split(" ")[0] || "🐯"}</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "white",
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {second.name?.split(" ").slice(1).join(" ") || second.name}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "white",
                  marginTop: 8,
                }}
              >
                {second.totalScore ?? 0} pts
              </div>
            </div>
          </div>
        )}

        {/* 1er lugar */}
        {first && (
          <div
            style={{
              flex: 1.2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 64,
                marginBottom: 8,
                animation: "bounce 1s ease infinite",
              }}
            >
              👑
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                borderRadius: "16px 16px 0 0",
                padding: "24px 16px",
                width: "100%",
                minHeight: 160,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 -4px 30px rgba(251, 191, 36, 0.5)",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 4, color: "white" }}>{first.name?.split(" ")[0] || "🦁"}</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "white",
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {first.name?.split(" ").slice(1).join(" ") || first.name}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "white",
                  marginTop: 8,
                }}
              >
                {first.totalScore ?? 0} pts
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "white",
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                🏆 {t.champion}
              </div>
            </div>
          </div>
        )}

        {/* 3er lugar */}
        {third && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🥉</div>
            <div
              style={{
                backgroundColor: "#b45309",
                borderRadius: "16px 16px 0 0",
                padding: "20px 16px",
                width: "100%",
                minHeight: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 -4px 20px rgba(180, 83, 9, 0.4)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4, color: "white" }}>{third.name?.split(" ")[0] || "🐻"}</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "white",
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {third.name?.split(" ").slice(1).join(" ") || third.name}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "white",
                  marginTop: 8,
                }}
              >
                {third.totalScore ?? 0} pts
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resto de equipos */}
      {rest.length > 0 && (
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 20,
            width: "100%",
            maxWidth: 500,
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {t.otherParticipants}
          </h3>
          {rest.map((team, index) => (
            <div
              key={team.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ color: "white", fontSize: 14 }}>
                {index + 4}. {team.name}
              </span>
              <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{team.totalScore ?? 0} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Botón de Autoevaluación - CONDICIONAL */}
      {!loadingConfig && isSelfEvalEnabled && (
        <div style={{ marginBottom: 24 }}>
          {selfEvalActive ? (
            <div
              style={{
                padding: "16px 32px",
                backgroundColor: "rgba(34, 197, 94, 0.2)",
                border: "2px solid #22c55e",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {t.selfEvalActive}
              </div>
              <div style={{ color: "white", fontSize: 13, marginBottom: 12 }}>{t.selfEvalInstructions}</div>
              
              {/* Botones de acción */}
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {/* 4. Botón modificado */}
                <button
                  onClick={() => setShowSelfEvalShare(true)}
                  style={{
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: "rgba(66, 133, 244, 0.2)",
                    color: "white",
                    border: "1px solid #4285f4",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  📋 {t.shareEvalLinks}
                </button>

                {/* Botón Ver evaluaciones */}
                <button
                  onClick={() => navigate(`/teacher/evaluations/${gameId}`)}
                  style={{
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  {t.viewEvaluations}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSelfEvalModal(true)}
              style={{
                padding: "16px 32px",
                fontSize: 16,
                fontWeight: 700,
                backgroundColor: "rgba(139, 92, 246, 0.3)",
                color: "white",
                border: "2px solid #8b5cf6",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.5)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.3)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {t.selfEvalButton}
            </button>
          )}
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "16px 48px",
            fontSize: 18,
            fontWeight: 700,
            backgroundColor: "white",
            color: "#4c1d95",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            transition: "transform 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          🏠 {t.backToDashboard}
        </button>

        <button
          onClick={() => navigate("/setup")}
          style={{
            padding: "16px 48px",
            fontSize: 18,
            fontWeight: 700,
            backgroundColor: "transparent",
            color: "white",
            border: "2px solid white",
            borderRadius: 12,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {t.newGame}
        </button>
      </div>

      {/* ✅ MODAL SIMPLIFICADO - Sin referidos */}
      {showSelfEvalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() => !activating && setShowSelfEvalModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 32,
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
                {t.modalTitle}
              </h2>
            </div>

            {/* Descripción */}
            <p style={{ color: "#334155", marginBottom: 16, textAlign: "center" }}>
              {t.modalDesc}
            </p>

            {/* Puntos */}
            <div
              style={{
                backgroundColor: "#f0fdf4",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <ul style={{ margin: 0, paddingLeft: 20, color: "#166534" }}>
                <li style={{ marginBottom: 8 }}>✨ {t.modalPoint1}</li>
                <li style={{ marginBottom: 8 }}>🤝 {t.modalPoint2}</li>
                <li>💡 {t.modalPoint3}</li>
              </ul>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={handleActivateSelfEval}
                disabled={activating}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  fontSize: 16,
                  fontWeight: 700,
                  backgroundColor: activating ? "#9ca3af" : "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: activating ? "wait" : "pointer",
                }}
              >
                {activating ? t.activating : t.activateButton}
              </button>

              <button
                onClick={() => setShowSelfEvalModal(false)}
                disabled={activating}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: "transparent",
                  color: "#64748b",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal reemplazado */}
      <SelfEvalShareModal
        isOpen={showSelfEvalShare}
        onClose={() => setShowSelfEvalShare(false)}
        gameId={gameId}
        gameName={gameConfig?.className || "Traffic Light Game"}
        teams={teams}
        language={language as "es" | "en" | "pt"}
      />

      {/* CSS para animación */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}