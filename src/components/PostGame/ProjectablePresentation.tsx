// src/components/PostGame/ProjectablePresentation.tsx
// 📽️ Vista optimizada para proyector con las reflexiones seleccionadas
// Muestra una reflexión a la vez con controles para el docente

import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { SelectedReflection } from "./GroupReflectionSetup";

interface ProjectablePresentationProps {
  gameId: string;
  reflections: SelectedReflection[];
  timeMinutes: number;
  onEnd: () => void;
}

export function ProjectablePresentation({
  gameId,
  reflections,
  timeMinutes,
  onEnd,
}: ProjectablePresentationProps) {
  const { language } = useI18n();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeMinutes * 60); // en segundos
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const texts = {
    es: {
      reflection: "Reflexión",
      of: "de",
      team: "Equipo",
      whatLearned: "Lo que aprendí...",
      previous: "← Anterior",
      next: "Siguiente →",
      pause: "⏸️ Pausar",
      resume: "▶️ Continuar",
      end: "🏁 Finalizar",
      timeRemaining: "Tiempo restante",
      pressSpaceForControls: "Presioná ESPACIO para mostrar/ocultar controles",
      thankYou: "¡Gracias por compartir!",
      endMessage: "Reflexión grupal finalizada",
    },
    en: {
      reflection: "Reflection",
      of: "of",
      team: "Team",
      whatLearned: "What I learned...",
      previous: "← Previous",
      next: "Next →",
      pause: "⏸️ Pause",
      resume: "▶️ Resume",
      end: "🏁 End",
      timeRemaining: "Time remaining",
      pressSpaceForControls: "Press SPACE to show/hide controls",
      thankYou: "Thanks for sharing!",
      endMessage: "Group reflection ended",
    },
    pt: {
      reflection: "Reflexão",
      of: "de",
      team: "Equipe",
      whatLearned: "O que aprendi...",
      previous: "← Anterior",
      next: "Próximo →",
      pause: "⏸️ Pausar",
      resume: "▶️ Continuar",
      end: "🏁 Finalizar",
      timeRemaining: "Tempo restante",
      pressSpaceForControls: "Pressione ESPAÇO para mostrar/ocultar controles",
      thankYou: "Obrigado por compartilhar!",
      endMessage: "Reflexão em grupo finalizada",
    },
  };

  const t = texts[language] || texts.es;

  const currentReflection = reflections[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === reflections.length - 1;

  // Timer countdown
  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          setShowControls((prev) => !prev);
          break;
        case "ArrowRight":
        case "n":
          if (!isLast) goNext();
          break;
        case "ArrowLeft":
        case "p":
          if (!isFirst) goPrevious();
          break;
        case "Escape":
          onEnd();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isFirst, isLast]);

  // Sincronizar con Firebase
  useEffect(() => {
    update(ref(database, `games/${gameId}/groupReflection`), {
      currentIndex,
    }).catch(console.error);
  }, [currentIndex, gameId]);

  const goPrevious = () => {
    if (!isFirst) setCurrentIndex((prev) => prev - 1);
  };

  const goNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleEnd = async () => {
    try {
      await update(ref(database, `games/${gameId}/groupReflection`), {
        active: false,
        endedAt: Date.now(),
      });
      onEnd();
    } catch (error) {
      console.error("Error ending presentation:", error);
    }
  };

  // Formatear tiempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Si no hay reflexiones
  if (reflections.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#1e1b4b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <p>{t.endMessage}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header con progreso y timer - solo visible con controles */}
      {showControls && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 100,
          }}
        >
          {/* Progreso */}
          <div style={{ color: "white", fontSize: 18, fontWeight: 600 }}>
            {t.reflection} {currentIndex + 1} {t.of} {reflections.length}
          </div>

          {/* Timer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 16px",
              backgroundColor: timeLeft < 60 ? "rgba(239, 68, 68, 0.3)" : "rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          >
            <span style={{ color: "white", fontSize: 14 }}>{t.timeRemaining}:</span>
            <span
              style={{
                color: timeLeft < 60 ? "#fca5a5" : "white",
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      )}

      {/* Contenido principal - La reflexión */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 48px",
        }}
      >
        {/* Emoji grande */}
        <div
          style={{
            fontSize: 80,
            marginBottom: 24,
            animation: "float 3s ease-in-out infinite",
          }}
        >
          💭
        </div>

        {/* Nombre y equipo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "white",
              margin: 0,
              textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            {currentReflection.playerName}
          </h1>
          <p
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.8)",
              margin: "8px 0 0",
            }}
          >
            {currentReflection.teamName}
          </p>
        </div>

        {/* La reflexión */}
        <div
          style={{
            maxWidth: 800,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 16,
            }}
          >
            {t.whatLearned}
          </p>
          <blockquote
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "white",
              lineHeight: 1.5,
              margin: 0,
              padding: "0 20px",
              borderLeft: "4px solid rgba(255,255,255,0.3)",
              textAlign: "left",
            }}
          >
            "{currentReflection.whatLearned}"
          </blockquote>
        </div>
      </div>

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: showControls ? 100 : 40,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          transition: "bottom 0.3s",
        }}
      >
        {reflections.map((_, index) => (
          <div
            key={index}
            style={{
              width: index === currentIndex ? 32 : 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: index === currentIndex ? "white" : "rgba(255,255,255,0.3)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      {/* Controles del docente - solo visibles con showControls */}
      {showControls && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 24px",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            onClick={goPrevious}
            disabled={isFirst}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: isFirst ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
              color: isFirst ? "rgba(255,255,255,0.3)" : "white",
              border: "none",
              borderRadius: 8,
              cursor: isFirst ? "not-allowed" : "pointer",
            }}
          >
            {t.previous}
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {isPaused ? t.resume : t.pause}
          </button>

          {isLast ? (
            <button
              onClick={handleEnd}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t.end}
            </button>
          ) : (
            <button
              onClick={goNext}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t.next}
            </button>
          )}
        </div>
      )}

      {/* Hint de controles */}
      {!showControls && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
          }}
        >
          {t.pressSpaceForControls}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}