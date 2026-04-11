// src/components/HelpPanel.tsx
// Panel lateral de ayuda con videos de YouTube embebidos
// Botón flotante "?" en esquina inferior derecha
// Soporta ES / EN / PT

import { useState } from "react";
import { useI18n } from "../i18n";

// ============================================
// VIDEOS — reemplazá YOUTUBE_ID_X por el ID real
// cuando los subas a YouTube (la parte final de la URL)
// Ejemplo: https://youtube.com/watch?v=dQw4w9WgXcQ → "dQw4w9WgXcQ"
// ============================================

interface Video {
  id: string;
  youtubeId: string; // ← reemplazar cuando estén subidos
  duration: string;
  title: { es: string; en: string; pt: string };
  desc: { es: string; en: string; pt: string };
}

const VIDEOS_CONOCE: Video[] = [
  {
    id: "v1",
    youtubeId: "L4NE_OX2blA",
    duration: "1:37",
    title: {
      es: "¿Qué es el Juego del Semáforo?",
      en: "What is the Traffic Light Game?",
      pt: "O que é o Jogo do Semáforo?",
    },
    desc: {
      es: "Dinámica áulica de dos etapas y sus características principales.",
      en: "Two-stage classroom dynamic and its main features.",
      pt: "Dinâmica de sala de aula em duas etapas e suas características.",
    },
  },
  {
    id: "v2",
    youtubeId: "aBfGz3Uc2u8",
    duration: "2:16",
    title: {
      es: "Las dos etapas: colaborativa y competitiva",
      en: "The two stages: collaborative and competitive",
      pt: "As duas etapas: colaborativa e competitiva",
    },
    desc: {
      es: "Secuencia de calificación, justificación y validación. El lugar de la IA.",
      en: "Rating, justification and validation sequence. The role of AI.",
      pt: "Sequência de avaliação, justificativa e validação. O papel da IA.",
    },
  },
  {
    id: "v3",
    youtubeId: "KMGiDZH-RVY",
    duration: "2:00",
    title: {
      es: "Fundamentos teóricos",
      en: "Theoretical foundations",
      pt: "Fundamentos teóricos",
    },
    desc: {
      es: "Sugata Mitra, Perkins y la coopetición como base pedagógica.",
      en: "Sugata Mitra, Perkins and coopetition as a pedagogical foundation.",
      pt: "Sugata Mitra, Perkins e a coopetição como base pedagógica.",
    },
  },
  {
    id: "v4",
    youtubeId: "kKVDvubDtSE",
    duration: "2:51",
    title: {
      es: "Sistemas coopetitivos vs. otros modelos",
      en: "Coopetitive systems vs. other models",
      pt: "Sistemas coopetitivos vs. outros modelos",
    },
    desc: {
      es: "Cómo se diferencia el modelo coopetitivo de otras dinámicas de aula.",
      en: "How the coopetitive model differs from other classroom dynamics.",
      pt: "Como o modelo coopetitivo se diferencia de outras dinâmicas.",
    },
  },
  {
    id: "v5",
    youtubeId: "vY2OE2jvL4I",
    duration: "4:11",
    title: {
      es: "El origen de la coopetición",
      en: "The origin of coopetition",
      pt: "A origem da coopetição",
    },
    desc: {
      es: "Nueva explicación de coopetición y de dónde surge la idea.",
      en: "New explanation of coopetition and where the idea comes from.",
      pt: "Nova explicação da coopetição e de onde surgiu a ideia.",
    },
  },
];

const VIDEOS_COMO: Video[] = [
  {
    id: "v6",
    youtubeId: "OlKN9DDxdvc",
    duration: "7:34",
    title: {
      es: "Cómo crear un juego desde cero con IA",
      en: "How to create a game from scratch with AI",
      pt: "Como criar um jogo do zero com IA",
    },
    desc: {
      es: "Paso a paso: configuración, preguntas generadas con IA y lanzamiento.",
      en: "Step by step: setup, AI-generated questions and launch.",
      pt: "Passo a passo: configuração, perguntas geradas com IA e lançamento.",
    },
  },
  {
    id: "v7",
    youtubeId: "d6A7bZwaZXc",
    duration: "6:57",
    title: {
      es: "Demo completa — Etapa 1",
      en: "Full demo — Stage 1",
      pt: "Demo completo — Etapa 1",
    },
    desc: {
      es: "Cómo funciona el juego en el aula: roles, calificación y puntaje.",
      en: "How the game works in the classroom: roles, rating and scoring.",
      pt: "Como o jogo funciona em sala: papéis, avaliação e pontuação.",
    },
  },
  {
    id: "v8",
    youtubeId: "6m4B4Tk_S94",
    duration: "2:44",
    title: {
      es: "Demo completa — Etapa 2",
      en: "Full demo — Stage 2",
      pt: "Demo completo — Etapa 2",
    },
    desc: {
      es: "La etapa competitiva: cómo funciona y cómo se determina el ganador.",
      en: "The competitive stage: how it works and how the winner is determined.",
      pt: "A etapa competitiva: como funciona e como o vencedor é determinado.",
    },
  },
];

// ============================================
// TEXTOS i18n
// ============================================

const TEXTS = {
  es: {
    buttonTitle: "Ayuda en video",
    panelTitle: "Centro de ayuda",
    panelSubtitle: "Videos explicativos del juego",
    sectionKnow: "📖 Conocé el juego",
    sectionHow: "🎮 Cómo usarlo",
    close: "Cerrar",
    watch: "Ver video",
    pending: "Próximamente",
  },
  en: {
    buttonTitle: "Video help",
    panelTitle: "Help center",
    panelSubtitle: "Explanatory videos about the game",
    sectionKnow: "📖 About the game",
    sectionHow: "🎮 How to use it",
    close: "Close",
    watch: "Watch",
    pending: "Coming soon",
  },
  pt: {
    buttonTitle: "Ajuda em vídeo",
    panelTitle: "Central de ajuda",
    panelSubtitle: "Vídeos explicativos do jogo",
    sectionKnow: "📖 Conheça o jogo",
    sectionHow: "🎮 Como usar",
    close: "Fechar",
    watch: "Assistir",
    pending: "Em breve",
  },
};

// ============================================
// SUB-COMPONENTE: Tarjeta de video
// ============================================

function VideoCard({
  video,
  language,
  onPlay,
  isPlaying,
  texts,
}: {
  video: Video;
  language: "es" | "en" | "pt";
  onPlay: (v: Video) => void;
  isPlaying: boolean;
  texts: typeof TEXTS.es;
}) {
  const isPending = video.youtubeId.startsWith("YOUTUBE_ID_");

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: isPlaying ? "2px solid #22c55e" : "2px solid #e2e8f0",
        backgroundColor: isPlaying ? "#f0fdf4" : "white",
        transition: "all 0.2s",
      }}
    >
      {/* Thumbnail / player */}
      {isPlaying && !isPending ? (
        <div style={{ position: "relative", paddingTop: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          onClick={() => !isPending && onPlay(video)}
          disabled={isPending}
          style={{
            width: "100%",
            padding: 0,
            border: "none",
            background: "none",
            cursor: isPending ? "default" : "pointer",
            display: "block",
          }}
        >
          <div
            style={{
              position: "relative",
              paddingTop: "56.25%",
              backgroundColor: isPending ? "#f1f5f9" : "#0f172a",
              overflow: "hidden",
            }}
          >
            {!isPending && (
              <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                alt={video.title[language]}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.85,
                }}
              />
            )}

            {isPending ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 8,
                  color: "#94a3b8",
                }}
              >
                <span style={{ fontSize: 28 }}>🎬</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{texts.pending}</span>
              </div>
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: "rgba(220,38,38,0.92)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <span style={{ fontSize: 16, marginLeft: 3 }}>▶</span>
                </div>
              </div>
            )}

            {/* Duración badge */}
            <div
              style={{
                position: "absolute",
                bottom: 6,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.75)",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {video.duration}
            </div>
          </div>
        </button>
      )}

      {/* Info */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1e293b",
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          {video.title[language]}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
          {video.desc[language]}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL: HelpPanel
// ============================================

export function HelpPanel() {
  const { language } = useI18n();
  const lang = (["es", "en", "pt"].includes(language) ? language : "es") as "es" | "en" | "pt";
  const texts = TEXTS[lang];

  const [isOpen, setIsOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = (video: Video) => {
    setPlayingId(playingId === video.id ? null : video.id);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={texts.buttonTitle}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(22,163,74,0.5)",
          zIndex: 9000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          transform: isOpen ? "rotate(45deg)" : "none",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = isOpen ? "rotate(45deg) scale(1.1)" : "scale(1.1)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = isOpen ? "rotate(45deg)" : "none";
        }}
      >
        {isOpen ? "✕" : "?"}
      </button>

      {/* Overlay para cerrar */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.25)",
            zIndex: 9001,
          }}
        />
      )}

      {/* Panel lateral */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 100vw)",
          backgroundColor: "#f8fafc",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
          zIndex: 9002,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header del panel */}
        <div
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            padding: "20px 20px 16px",
            color: "white",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>🎬 {texts.panelTitle}</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{texts.panelSubtitle}</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {texts.close}
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 32px",
          }}
        >
          {/* Sección 1 */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: 12,
                padding: "6px 10px",
                backgroundColor: "#dcfce7",
                borderRadius: 8,
                borderLeft: "3px solid #16a34a",
              }}
            >
              {texts.sectionKnow}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {VIDEOS_CONOCE.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  language={lang}
                  onPlay={handlePlay}
                  isPlaying={playingId === video.id}
                  texts={texts}
                />
              ))}
            </div>
          </div>

          {/* Sección 2 */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: 12,
                padding: "6px 10px",
                backgroundColor: "#dbeafe",
                borderRadius: 8,
                borderLeft: "3px solid #2563eb",
              }}
            >
              {texts.sectionHow}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {VIDEOS_COMO.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  language={lang}
                  onPlay={handlePlay}
                  isPlaying={playingId === video.id}
                  texts={texts}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}