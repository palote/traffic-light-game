// src/components/DashboardBanners.tsx
// Banners para referidos y webinars en el dashboard del docente

import { useState, useEffect } from "react";
import { ref, onValue, get } from "firebase/database";
import { database } from "../firebase.config";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useAuth } from "../contexts/AuthContext";

interface ReferralConfig {
  active: boolean;
  formUrl: string;
  rewards: string;
  requireFinishedGame?: boolean;  // ✅ AGREGADO
}

interface WebinarConfig {
  active: boolean;
  title: string;
  topic: string;
  date: string;
  timezone: string;
  formUrl: string;
  dismissible: boolean;
  language?: string;
  requireFinishedGame?: boolean;
}

export function DashboardBanners() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const { user } = useAuth();
  const [referralConfig, setReferralConfig] = useState<ReferralConfig | null>(null);
  const [webinarConfig, setWebinarConfig] = useState<WebinarConfig | null>(null);
  const [webinarDismissed, setWebinarDismissed] = useState(false);
  const [hasFinishedGame, setHasFinishedGame] = useState<boolean | null>(null);
  const [checkingGames, setCheckingGames] = useState(true);

  // Cargar configuración de Firebase
  useEffect(() => {
    const configRef = ref(database, "config");
    const unsub = onValue(configRef, (snapshot) => {
      const config = snapshot.val();
      if (config?.referral) {
        setReferralConfig(config.referral);
      }
      if (config?.webinar) {
        setWebinarConfig(config.webinar);
      }
    });
    return () => unsub();
  }, []);

  // Verificar si el usuario tiene al menos un juego completado
  useEffect(() => {
    async function checkFinishedGames() {
      if (!user?.uid) {
        setCheckingGames(false);
        setHasFinishedGame(false);
        return;
      }

      try {
        // Buscar en teacherGames del usuario
        const teacherGamesRef = ref(database, `teacherGames/${user.uid}`);
        const snapshot = await get(teacherGamesRef);

        if (!snapshot.exists()) {
          setHasFinishedGame(false);
          setCheckingGames(false);
          return;
        }

        const games = snapshot.val();
        let foundFinished = false;

        // Verificar cada juego
        for (const gameId of Object.keys(games)) {
          const gameRef = ref(database, `games/${gameId}/status`);
          const gameSnapshot = await get(gameRef);
          const statusData = gameSnapshot.val();
          const status = typeof statusData === "object" ? statusData?.status : statusData;
          if (status === "finished" || status === "ended" || status === "game_complete") {
            foundFinished = true;
            break;
          }
        }

        setHasFinishedGame(foundFinished);
      } catch (error) {
        console.error("Error checking finished games:", error);
        setHasFinishedGame(false);
      }

      setCheckingGames(false);
    }

    checkFinishedGames();
  }, [user?.uid]);

  // Verificar si el webinar fue cerrado en esta sesión
  useEffect(() => {
    const dismissed = sessionStorage.getItem("webinar_dismissed");
    if (dismissed === "true") {
      setWebinarDismissed(true);
    }
  }, []);

  const handleDismissWebinar = () => {
    setWebinarDismissed(true);
    sessionStorage.setItem("webinar_dismissed", "true");
  };

  const formatWebinarDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      };
      const locale = language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US";
      return date.toLocaleDateString(locale, options);
    } catch {
      return dateString;
    }
  };

  // Determinar si mostrar el banner de webinar
  const shouldShowWebinar = (): boolean => {
    // No mostrar si no está activo o fue cerrado
    if (!webinarConfig?.active || webinarDismissed) return false;

    // Filtro por idioma: si está configurado, solo mostrar si coincide
    if (webinarConfig.language && webinarConfig.language !== language) {
      return false;
    }

    // Filtro por juego completado: si está activado, verificar
    if (webinarConfig.requireFinishedGame) {
      // Mientras está verificando, no mostrar
      if (checkingGames) return false;
      // Si no tiene juegos completados, no mostrar
      if (!hasFinishedGame) return false;
    }

    return true;
  };

  const texts = {
    referral: {
      title:
        language === "es"
          ? "INVITÁ A UN COLEGA"
          : language === "pt"
            ? "CONVIDE UM COLEGA"
            : "INVITE A COLLEAGUE",
      subtitle:
        language === "es"
          ? "Compartí el Juego del Semáforo y recibí:"
          : language === "pt"
            ? "Compartilhe o Jogo do Semáforo e receba:"
            : "Share the Traffic Light Game and receive:",
      button: language === "es" ? "INVITAR AHORA" : language === "pt" ? "CONVIDAR AGORA" : "INVITE NOW",
    },
    webinar: {
      title: language === "es" ? "WEBINAR GRATUITO" : language === "pt" ? "WEBINAR GRATUITO" : "FREE WEBINAR",
      button: language === "es" ? "INSCRIBIRME" : language === "pt" ? "INSCREVER-ME" : "REGISTER",
    },
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 32,
      }}
    >
      {/* Banner de Webinar (con filtros de idioma y juego completado) */}
      {shouldShowWebinar() && webinarConfig && (
        <div
          style={{
            padding: "20px 24px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            color: "white",
            boxShadow: "0 4px 20px rgba(139, 92, 246, 0.3)",
            position: "relative",
          }}
        >
          {webinarConfig.dismissible && (
            <button
              onClick={handleDismissWebinar}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                cursor: "pointer",
                color: "white",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Cerrar"
            >
              ✕
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 40 }}>🎥</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: 0.9,
                  marginBottom: 4,
                  letterSpacing: 1,
                }}
              >
                {texts.webinar.title}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{webinarConfig.title}</div>
              <div style={{ fontSize: 14, opacity: 0.9, display: "flex", alignItems: "center", gap: 8 }}>
                <span>📅</span>
                <span>{formatWebinarDate(webinarConfig.date)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (webinarConfig.formUrl.startsWith("/")) {
                  navigate(webinarConfig.formUrl);
                } else {
                  window.open(webinarConfig.formUrl, "_blank");
                }
              }}
              style={{
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: "2px solid white",
                backgroundColor: "white",
                color: "#6366f1",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.9)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {texts.webinar.button}
            </button>
          </div>
        </div>
      )}

      {/* Banner de Referidos (con filtro opcional de juego completado) */}
      {referralConfig?.active && (
        // Si requiere juego completado, verificar
        (!referralConfig.requireFinishedGame || (hasFinishedGame && !checkingGames))
      ) && (
        <div
          style={{
            padding: "20px 24px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
            color: "white",
            boxShadow: "0 4px 20px rgba(245, 158, 11, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 40 }}>👥</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: 0.9,
                  marginBottom: 4,
                  letterSpacing: 1,
                }}
              >
                {texts.referral.title}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{texts.referral.subtitle}</div>
              <div style={{ fontSize: 14, opacity: 0.95 }}>{referralConfig.rewards}</div>
            </div>
            <button
              onClick={() => {
                if (referralConfig.formUrl.startsWith("/")) {
                  navigate(referralConfig.formUrl);
                } else {
                  window.open(referralConfig.formUrl, "_blank");
                }
              }}
              style={{
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: "2px solid white",
                backgroundColor: "white",
                color: "#f59e0b",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.9)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {texts.referral.button}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}