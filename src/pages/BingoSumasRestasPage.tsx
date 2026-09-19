import { useEffect, useRef, useState } from "react";

const VIDEOS = ["67hAyJO9oh0","TLnxNnDJBD0","UGhqLI-DySA","go6yyBOkrrg","z_by5FpWvZ8"];

const CONFIG = {
  titulo: "Bingo de",
  subtitulo: "Sumas y Restas",
  descripcion: "Resultados hasta el número 20 — ¡Para jugar en familia!",
  emojis: ["➕","➖","➕","➖","➕"],
  colorPrimario: "#00BCD4",
  colorSombra: "#0097A7",
  colorBorde: "#80DEEA",
  colorTexto: "#006064",
  colorSubtexto: "#00838F",
  bgPage: "linear-gradient(160deg, #e0f7fa 0%, #b2ebf2 50%, #80deea 100%)",
  bgCard: "#fff",
  bgLink: "#E0F7FA",
};

const playerDivId = "yt-player-sumasrestas";

declare global { interface Window { YT: any; onYouTubeIframeAPIReady: () => void; } }

export default function BingoSumasRestasPage() {
  const [open, setOpen] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pendientes = useRef([...VIDEOS]);
  const usados = useRef<string[]>([]);
  const playerRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Cargar YouTube IFrame API una sola vez
  useEffect(() => {
    if (!document.getElementById("yt-api-script")) {
      const tag = document.createElement("script");
      tag.id = "yt-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  // Escuchar cambios de fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Crear player cuando se abre el modal
  useEffect(() => {
    if (!open || !videoId) return;

    const createPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      playerRef.current = new window.YT.Player(playerDivId, {
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === 0) cerrarModal(); // 0 = video terminado
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [open, videoId]);

  const abrirPartida = () => {
    if (pendientes.current.length === 0) {
      pendientes.current = [...VIDEOS];
      usados.current = [];
    }
    const rand = Math.floor(Math.random() * pendientes.current.length);
    const id = pendientes.current.splice(rand, 1)[0];
    usados.current.push(id);
    setVideoId(id);
    setOpen(true);
  };

  const cerrarModal = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setVideoId("");
    setOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: CONFIG.bgPage, padding: "2.5rem 1.5rem 3rem", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "system-ui, sans-serif", position: "relative" }}>

      {/* Botón pantalla completa */}
      <button onClick={toggleFullscreen} title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        style={{ position: "fixed", top: 12, right: 12, zIndex: 999, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 8, color: "white", width: 36, height: 36, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isFullscreen ? "⊡" : "⛶"}
      </button>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.2rem" }}>
        {CONFIG.emojis.map((s, i) => (
          <div key={i} style={{ width: 30, height: 30, background: CONFIG.colorPrimario, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "white", boxShadow: `0 2px 0 ${CONFIG.colorSombra}` }}>{s}</div>
        ))}
      </div>

      <h1 style={{ fontSize: "2rem", fontWeight: 700, color: CONFIG.colorTexto, textAlign: "center", lineHeight: 1.2, marginBottom: "0.5rem" }}>
        {CONFIG.titulo}<br /><span style={{ color: CONFIG.colorSubtexto }}>{CONFIG.subtitulo}</span>
      </h1>
      <p style={{ fontSize: "1.05rem", color: CONFIG.colorTexto, textAlign: "center", marginBottom: "3rem", maxWidth: 360, lineHeight: 1.6 }}>
        {CONFIG.descripcion}
      </p>

      <button onClick={abrirPartida}
        style={{ background: CONFIG.colorPrimario, border: "none", borderRadius: 22, padding: "1.2rem 3.2rem", fontSize: "1.5rem", fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: `0 7px 0 ${CONFIG.colorSombra}`, display: "flex", alignItems: "center", gap: 14, marginBottom: "3.5rem", transition: "transform 0.1s" }}
        onMouseDown={e => (e.currentTarget.style.transform = "translateY(4px)")}
        onMouseUp={e => (e.currentTarget.style.transform = "none")}
        onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
        <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>▶</div>
        ¡Juguemos!
      </button>

      <div style={{ background: "#fff", borderRadius: 20, border: `2px solid ${CONFIG.colorBorde}`, padding: "1.5rem 2rem", maxWidth: 400, width: "100%", textAlign: "center" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: CONFIG.colorTexto, marginBottom: "0.4rem" }}>¿Todavía no tenés los cartones?</h2>
        <p style={{ fontSize: "0.9rem", color: CONFIG.colorSubtexto, lineHeight: 1.5 }}>Descargá gratis los cartones y fichas para jugar con tu grupo.</p>
        <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "1rem", background: CONFIG.bgLink, color: CONFIG.colorTexto, borderRadius: 10, padding: "0.55rem 1.2rem", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", border: `1.5px solid ${CONFIG.colorBorde}` }}>
          ↓ Conseguí los cartones y fichas acá
        </a>
      </div>

      {/* Modal con YouTube IFrame API */}
      {open && (
        <div ref={modalRef} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#000", borderRadius: 0, padding: 0, width: "100vw", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
            <button onClick={cerrarModal} style={{ position: "absolute", top: 16, right: 16, zIndex: 10, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", color: "#fff", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <div style={{ position: "relative", width: "100%", height: "calc(100vh - 60px)", background: "#000" }}>
              <div id={playerDivId} style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
