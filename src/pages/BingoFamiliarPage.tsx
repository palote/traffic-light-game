import { useState, useCallback } from "react";

const VIDEOS = [
  "3GfeTj4a_7I",
  "4JizXE0plDo",
  "BlfnKE9a7IA",
  "DwHN2b38MoM",
  "GV3kcMRrKp0",
  "NIcNTAyIe7A",
  "QxWtakixqgg",
  "VGDjajKk6Jw",
  "Vf393njEDjY",
  "VnCQrEUqlZM",
  "WX-11HUvotw",
  "h-j5DQJler4",
  "kIvdbjLXccU",
  "tuuWpon5aLk",
  "zF_lV162y5Q",
  "IOhgXM6FABM",
  "UxwmQbIRdUA",
  "mUYoFg5GyFU",
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BingoFamiliarPage() {
  const [queue, setQueue] = useState<string[]>(() => shuffleArray(VIDEOS));
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);

  const handleStarted = (value: boolean) => {
    setStarted(value);
    if (value) {
      // Solicitar fullscreen después de que se renderice el video
      setTimeout(() => {
        const el = document.getElementById("video-modal-container");
        if (el?.requestFullscreen) {
          el.requestFullscreen();
        }
      }, 100);
    }
  };

  const played = current;
  const remaining = queue.length - current;

  const handleNext = useCallback(() => {
    if (current + 1 >= queue.length) {
      // All played — reshuffle for a new round
      setQueue(shuffleArray(VIDEOS));
      setCurrent(0);
    } else {
      setCurrent((c) => c + 1);
    }
  }, [current, queue.length]);

  const handleRestart = useCallback(() => {
    setQueue(shuffleArray(VIDEOS));
    setCurrent(0);
    setStarted(false);
  }, []);

  const videoId = queue[current];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #2D1B69 0%, #4A1942 50%, #6B2D3E 100%)",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 600 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎰</div>
        <h1 style={{
          color: "#FFD700",
          fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
          fontWeight: 800,
          margin: "0 0 8px",
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          letterSpacing: 1,
        }}>
          BINGO FAMILIAR
        </h1>
        <p style={{
          color: "#E8C5FF",
          fontSize: "1rem",
          margin: 0,
          opacity: 0.9,
        }}>
          Ideal para jugar en familia · 18 jugadas únicas · Sin repetición
        </p>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex",
        gap: 16,
        marginBottom: 24,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {[
          { label: "Jugadas", value: played, icon: "✅" },
          { label: "Restantes", value: remaining, icon: "🎯" },
          { label: "Total", value: VIDEOS.length, icon: "🎲" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: "rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "10px 20px",
            textAlign: "center",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,215,0,0.3)",
          }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ color: "#FFD700", fontWeight: 700, fontSize: "1.3rem" }}>{value}</div>
            <div style={{ color: "#E8C5FF", fontSize: "0.75rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Video player */}
      {!started ? (
        <div style={{
          background: "rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "40px 32px",
          textAlign: "center",
          border: "2px solid rgba(255,215,0,0.4)",
          maxWidth: 480,
          width: "100%",
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <p style={{ color: "#E8C5FF", marginBottom: 24, fontSize: "1.05rem" }}>
            Se sortearán las <strong style={{ color: "#FFD700" }}>18 jugadas</strong> de forma aleatoria, sin repetir ninguna.
          </p>
          <button
            onClick={() => handleStarted(true)}
            style={{
              background: "linear-gradient(135deg, #FFD700, #FF8C00)",
              color: "#1a0a00",
              border: "none",
              borderRadius: 14,
              padding: "16px 48px",
              fontSize: "1.15rem",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(255,215,0,0.5)",
              letterSpacing: 1,
            }}
          >
            ¡COMENZAR!
          </button>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 700 }}>
          {/* Progress bar */}
          <div style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 999,
            height: 8,
            marginBottom: 16,
            overflow: "hidden",
          }}>
            <div style={{
              width: `${((played) / VIDEOS.length) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #FFD700, #FF8C00)",
              borderRadius: 999,
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* YouTube embed */}
          <div id="video-modal-container" style={{
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            border: "2px solid rgba(255,215,0,0.4)",
            background: "#000",
            aspectRatio: "16/9",
          }}>
            <iframe
              key={videoId}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={`Jugada ${played + 1}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ display: "block", width: "100%", aspectRatio: "16/9" }}
            />
          </div>

          {/* Jugada label */}
          <div style={{
            textAlign: "center",
            marginTop: 12,
            color: "#FFD700",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: 1,
          }}>
            Jugada {played + 1} de {VIDEOS.length}
          </div>

          {/* Buttons */}
          <div style={{
            display: "flex",
            gap: 12,
            marginTop: 20,
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            <button
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                color: "#1a0a00",
                border: "none",
                borderRadius: 12,
                padding: "14px 36px",
                fontSize: "1.05rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(255,215,0,0.4)",
              }}
            >
              {current + 1 >= VIDEOS.length ? "🔁 Nueva ronda" : "▶ Siguiente jugada"}
            </button>
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                }
                handleRestart();
              }}
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#E8C5FF",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 12,
                padding: "14px 24px",
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              ↺ Reiniciar
            </button>
          </div>
        </div>
      )}

      {/* Back link */}
      <a href="/herramientas" style={{
        marginTop: 36,
        color: "rgba(232,197,255,0.6)",
        fontSize: "0.85rem",
        textDecoration: "none",
      }}>
        ← Volver al inicio
      </a>
    </div>
  );
}
