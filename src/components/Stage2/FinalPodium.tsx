// src/components/Stage2/FinalPodium.tsx
// 🏆 Pantalla final con podio estilo Kahoot
// ✅ NUEVO: Botón de autoevaluación con sistema de referidos

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../../firebase.config";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../i18n";
import type { Team } from "../../types/game";

interface FinalPodiumProps {
  teams: Team[];
  gameId: string;
}

export function FinalPodium({ teams, gameId }: FinalPodiumProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useI18n();

  const [showSelfEvalModal, setShowSelfEvalModal] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [selfEvalActive, setSelfEvalActive] = useState(false);

  const texts = {
    es: {
      gameOver: "¡JUEGO TERMINADO!",
      finalResults: "Resultados finales",
      champion: "CAMPEÓN",
      otherParticipants: "Otros participantes",
      backToDashboard: "Volver al Dashboard",
      selfEvalButton: "📝 Activar Autoevaluación",
      selfEvalActive: "✅ Autoevaluación Activa",
      modalTitle: "Autoevaluación Colaborativa",
      modalDesc1: "Esta función permite que cada alumno reflexione sobre:",
      modalPoint1: "Qué aprendió durante el juego",
      modalPoint2: "De quién recibió ayuda",
      modalPoint3: "A quién ayudó a aprender",
      betaTitle: "🎁 DISPONIBLE EN FASE DE PRUEBA",
      betaDesc: "Desbloqueá esta función invitando a un colega docente.",
      inviteButton: "👥 Invitar colega y desbloquear",
      alreadyInvited: "✅ Ya referí a alguien",
      checkingReferral: "Verificando...",
      noReferralYet: "Todavía no tenés referidos registrados. ¡Invitá a un colega!",
      activateButton: "🚀 Activar ahora",
      close: "Cerrar",
      selfEvalInstructions: "Los alumnos pueden escanear el QR en la pantalla de su equipo",
    },
    en: {
      gameOver: "GAME OVER!",
      finalResults: "Final results",
      champion: "CHAMPION",
      otherParticipants: "Other participants",
      backToDashboard: "Back to Dashboard",
      selfEvalButton: "📝 Activate Self-Evaluation",
      selfEvalActive: "✅ Self-Evaluation Active",
      modalTitle: "Collaborative Self-Evaluation",
      modalDesc1: "This feature allows each student to reflect on:",
      modalPoint1: "What they learned during the game",
      modalPoint2: "Who helped them",
      modalPoint3: "Who they helped learn",
      betaTitle: "🎁 AVAILABLE IN BETA",
      betaDesc: "Unlock this feature by inviting a fellow teacher.",
      inviteButton: "👥 Invite colleague and unlock",
      alreadyInvited: "✅ I already referred someone",
      checkingReferral: "Checking...",
      noReferralYet: "You don't have registered referrals yet. Invite a colleague!",
      activateButton: "🚀 Activate now",
      close: "Close",
      selfEvalInstructions: "Students can scan the QR on their team's screen",
    },
    pt: {
      gameOver: "FIM DE JOGO!",
      finalResults: "Resultados finais",
      champion: "CAMPEÃO",
      otherParticipants: "Outros participantes",
      backToDashboard: "Voltar ao Dashboard",
      selfEvalButton: "📝 Ativar Autoavaliação",
      selfEvalActive: "✅ Autoavaliação Ativa",
      modalTitle: "Autoavaliação Colaborativa",
      modalDesc1: "Esta função permite que cada aluno reflita sobre:",
      modalPoint1: "O que aprendeu durante o jogo",
      modalPoint2: "De quem recebeu ajuda",
      modalPoint3: "A quem ajudou a aprender",
      betaTitle: "🎁 DISPONÍVEL EM FASE DE TESTE",
      betaDesc: "Desbloqueie esta função convidando um colega professor.",
      inviteButton: "👥 Convidar colega e desbloquear",
      alreadyInvited: "✅ Já indiquei alguém",
      checkingReferral: "Verificando...",
      noReferralYet: "Você ainda não tem indicações registradas. Convide um colega!",
      activateButton: "🚀 Ativar agora",
      close: "Fechar",
      selfEvalInstructions: "Os alunos podem escanear o QR na tela de sua equipe",
    },
  };

  const t = texts[language] || texts.es;

  // Verificar si el docente tiene acceso (envió al menos 1 referido no rechazado)
  const checkAccess = async () => {
    if (!user?.uid) {
      setHasAccess(false);
      return;
    }

    setCheckingAccess(true);

    try {
      const referralsSnap = await get(ref(database, "referrals"));

      if (!referralsSnap.exists()) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      const referrals = referralsSnap.val();
      let foundValidReferral = false;

      for (const referral of Object.values(referrals) as any[]) {
        // ✅ CORREGIDO: Dar acceso si envió un referido (cualquier status excepto "rejected")
        if (referral.referrerId === user.uid && referral.status !== "rejected") {
          foundValidReferral = true;
          break;
        }
      }

      setHasAccess(foundValidReferral);
    } catch (error) {
      console.error("Error checking referral access:", error);
      // ✅ NUEVO: Si hay error de permisos, intentar dar acceso temporal para testing
      // En producción podrías querer manejar esto diferente
      setHasAccess(false);
    }

    setCheckingAccess(false);
  };
  const handleSelfEvalClick = () => {
    setShowSelfEvalModal(true);
    if (hasAccess === null) {
      checkAccess();
    }
  };

  const handleActivateSelfEval = async () => {
    try {
      const { update } = await import("firebase/database");
      await update(ref(database, `games/${gameId}`), {
        selfEvaluationActive: true,
        selfEvaluationActivatedAt: Date.now()
      });
      setSelfEvalActive(true);
      setShowSelfEvalModal(false);
    } catch (error) {
      console.error("Error activating self-evaluation:", error);
      alert("Error al activar la autoevaluación");
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
            color: "rgba(255,255,255,0.8)",
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
                backgroundColor: "#94a3b8",
                borderRadius: "16px 16px 0 0",
                padding: "20px 16px",
                width: "100%",
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 -4px 20px rgba(148, 163, 184, 0.4)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>{second.name?.split(" ")[0] || "🐯"}</div>
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
              <div style={{ fontSize: 36, marginBottom: 4 }}>{first.name?.split(" ")[0] || "🦁"}</div>
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
                  color: "rgba(255,255,255,0.9)",
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
                backgroundColor: "#cd7c32",
                borderRadius: "16px 16px 0 0",
                padding: "20px 16px",
                width: "100%",
                minHeight: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 -4px 20px rgba(205, 124, 50, 0.4)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>{third.name?.split(" ")[0] || "🐻"}</div>
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
              color: "rgba(255,255,255,0.9)",
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
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
                {index + 4}. {team.name}
              </span>
              <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{team.totalScore ?? 0} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* ✅ NUEVO: Botón de Autoevaluación */}
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
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{t.selfEvalInstructions}</div>
          </div>
        ) : (
          <button
            onClick={handleSelfEvalClick}
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

      {/* Botón volver */}
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

      {/* ✅ NUEVO: Modal de Autoevaluación */}
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
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 32,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>{t.modalTitle}</h2>
            </div>

            {/* Descripción */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: "#64748b", marginBottom: 12 }}>{t.modalDesc1}</p>
              <ul style={{ margin: 0, paddingLeft: 24, color: "#374151" }}>
                <li style={{ marginBottom: 6 }}>✨ {t.modalPoint1}</li>
                <li style={{ marginBottom: 6 }}>🤝 {t.modalPoint2}</li>
                <li style={{ marginBottom: 6 }}>💡 {t.modalPoint3}</li>
              </ul>
            </div>

            {/* Sección Beta/Premium */}
            <div
              style={{
                backgroundColor: "#fef3c7",
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
                border: "2px solid #f59e0b",
              }}
            >
              <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 8, textAlign: "center" }}>
                {t.betaTitle}
              </div>
              <p style={{ color: "#a16207", fontSize: 14, textAlign: "center", margin: 0 }}>{t.betaDesc}</p>
            </div>

            {/* Verificación de acceso */}
            {checkingAccess ? (
              <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>{t.checkingReferral}</div>
            ) : hasAccess ? (
              /* Tiene acceso - mostrar botón de activar */
              <button
                onClick={handleActivateSelfEval}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  fontSize: 16,
                  fontWeight: 700,
                  backgroundColor: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                {t.activateButton}
              </button>
            ) : (
              /* No tiene acceso - mostrar opciones de referir */
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={() => {
                    setShowSelfEvalModal(false);
                    navigate(`/referir?returnTo=${gameId}`);
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    fontSize: 16,
                    fontWeight: 700,
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  {t.inviteButton}
                </button>

                <button
                  onClick={checkAccess}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    fontSize: 16,
                    fontWeight: 600,
                    backgroundColor: "white",
                    color: "#374151",
                    border: "2px solid #e2e8f0",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  {t.alreadyInvited}
                </button>

                {hasAccess === false && (
                  <p style={{ color: "#dc2626", fontSize: 13, textAlign: "center", margin: "8px 0 0 0" }}>
                    {t.noReferralYet}
                  </p>
                )}
              </div>
            )}

            {/* Botón cerrar */}
            <button
              onClick={() => setShowSelfEvalModal(false)}
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
                marginTop: 8,
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

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