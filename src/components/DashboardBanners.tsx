// src/components/DashboardBanners.tsx
// Banners para referidos y webinars en el dashboard del docente
// ✅ ACTUALIZADO: Soporte para dos webinars independientes (primaria y secundaria)

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
  requireFinishedGame?: boolean;
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
  const [webinarConfig2, setWebinarConfig2] = useState<WebinarConfig | null>(null); // ✅ NUEVO

  const [webinarDismissed, setWebinarDismissed] = useState(false);
  const [webinarDismissed2, setWebinarDismissed2] = useState(false); // ✅ NUEVO

  const [hasFinishedGame, setHasFinishedGame] = useState<boolean | null>(null);
  const [checkingGames, setCheckingGames] = useState(true);

  // Cargar configuración de Firebase
  useEffect(() => {
    const configRef = ref(database, "config");
    const unsub = onValue(configRef, (snapshot) => {
      const config = snapshot.val();
      if (config?.referral) setReferralConfig(config.referral);
      if (config?.webinar) setWebinarConfig(config.webinar);
      if (config?.webinar2) setWebinarConfig2(config.webinar2); // ✅ NUEVO
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
        const teacherGamesRef = ref(database, `teacherGames/${user.uid}`);
        const snapshot = await get(teacherGamesRef);
        if (!snapshot.exists()) {
          setHasFinishedGame(false);
          setCheckingGames(false);
          return;
        }
        const games = snapshot.val();
        let foundFinished = false;
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

  // Recuperar dismissed de sessionStorage al montar
  useEffect(() => {
    if (sessionStorage.getItem("webinar_dismissed") === "true") setWebinarDismissed(true);
    if (sessionStorage.getItem("webinar2_dismissed") === "true") setWebinarDismissed2(true); // ✅ NUEVO
  }, []);

  const handleDismissWebinar = () => {
    setWebinarDismissed(true);
    sessionStorage.setItem("webinar_dismissed", "true");
  };

  const handleDismissWebinar2 = () => { // ✅ NUEVO
    setWebinarDismissed2(true);
    sessionStorage.setItem("webinar2_dismissed", "true");
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

  // Helper reutilizable para evaluar si mostrar un webinar
  const shouldShowWebinar = (config: WebinarConfig | null, dismissed: boolean): boolean => {
    if (!config?.active || dismissed) return false;
    if (config.language && config.language !== language) return false;
    if (config.requireFinishedGame) {
      if (checkingGames) return false;
      if (!hasFinishedGame) return false;
    }
    return true;
  };

  const texts = {
    referral: {
      title:
        language === "es" ? "INVITÁ A UN COLEGA"
        : language === "pt" ? "CONVIDE UM COLEGA"
        : "INVITE A COLLEAGUE",
      subtitle:
        language === "es" ? "Compartí el Juego del Semáforo y recibí:"
        : language === "pt" ? "Compartilhe o Jogo do Semáforo e receba:"
        : "Share the Traffic Light Game and receive:",
      button: language === "es" ? "INVITAR AHORA" : language === "pt" ? "CONVIDAR AGORA" : "INVITE NOW",
    },
    webinar: {
      title: language === "es" ? "WEBINAR GRATUITO" : language === "pt" ? "WEBINAR GRATUITO" : "FREE WEBINAR",
      button: language === "es" ? "INSCRIBIRME" : language === "pt" ? "INSCREVER-ME" : "REGISTER",
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>

      {/* ── Webinar 1 (primaria) — violeta/índigo ── */}
      {shouldShowWebinar(webinarConfig, webinarDismissed) && webinarConfig && (
        <WebinarBanner
          config={webinarConfig}
          onDismiss={handleDismissWebinar}
          onNavigate={(url) => url.startsWith("/") ? navigate(url) : window.open(url, "_blank")}
          formatDate={formatWebinarDate}
          texts={texts.webinar}
          gradient="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
          shadow="rgba(139, 92, 246, 0.3)"
          buttonColor="#6366f1"
        />
      )}

      {/* ── Webinar 2 (secundaria) — azul ── */}
      {shouldShowWebinar(webinarConfig2, webinarDismissed2) && webinarConfig2 && (
        <WebinarBanner
          config={webinarConfig2}
          onDismiss={handleDismissWebinar2}
          onNavigate={(url) => url.startsWith("/") ? navigate(url) : window.open(url, "_blank")}
          formatDate={formatWebinarDate}
          texts={texts.webinar}
          gradient="linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)"
          shadow="rgba(37, 99, 235, 0.3)"
          buttonColor="#2563eb"
        />
      )}

      {/* ── Banner de Referidos ── */}
      {referralConfig?.active &&
        (!referralConfig.requireFinishedGame || (hasFinishedGame && !checkingGames)) && (
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
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 4, letterSpacing: 1 }}>
                {texts.referral.title}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{texts.referral.subtitle}</div>
              <div style={{ fontSize: 14, opacity: 0.95 }}>{referralConfig.rewards}</div>
            </div>
            <button
              onClick={() => referralConfig.formUrl.startsWith("/") ? navigate(referralConfig.formUrl) : window.open(referralConfig.formUrl, "_blank")}
              style={{ padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "2px solid white", backgroundColor: "white", color: "#f59e0b", cursor: "pointer" }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.9)"; e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              {texts.referral.button}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Componente interno reutilizable para cada banner de webinar ──
function WebinarBanner({
  config,
  onDismiss,
  onNavigate,
  formatDate,
  texts,
  gradient,
  shadow,
  buttonColor,
}: {
  config: WebinarConfig;
  onDismiss: () => void;
  onNavigate: (url: string) => void;
  formatDate: (date: string) => string;
  texts: { title: string; button: string };
  gradient: string;
  shadow: string;
  buttonColor: string;
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRadius: 16,
        background: gradient,
        color: "white",
        boxShadow: `0 4px 20px ${shadow}`,
        position: "relative",
      }}
    >
      {config.dismissible && (
        <button
          onClick={onDismiss}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.2)", border: "none",
            borderRadius: "50%", width: 28, height: 28,
            cursor: "pointer", color: "white", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Cerrar"
        >
          ✕
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 40 }}>🎥</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 4, letterSpacing: 1 }}>
            {texts.title}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{config.title}</div>
          <div style={{ fontSize: 14, opacity: 0.9, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📅</span>
            <span>{formatDate(config.date)}</span>
          </div>
        </div>
        <button
          onClick={() => onNavigate(config.formUrl)}
          style={{
            padding: "12px 24px", fontSize: 14, fontWeight: 700,
            borderRadius: 10, border: "2px solid white",
            backgroundColor: "white", color: buttonColor, cursor: "pointer",
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.9)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          {texts.button}
        </button>
      </div>
    </div>
  );
}