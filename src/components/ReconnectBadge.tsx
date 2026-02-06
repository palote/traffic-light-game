// src/components/ReconnectBadge.tsx
// 🔗 Badge con código y link para reconexión de equipos

import { useState } from "react";
import { useI18n } from "../i18n";

interface ReconnectBadgeProps {
  gameId: string;
  roomCode?: string;
}

export function ReconnectBadge({ gameId, roomCode }: ReconnectBadgeProps) {
  const { language } = useI18n();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [expanded, setExpanded] = useState(false);

  const texts = {
    es: {
      reconnect: "Reconectar equipos",
      code: "Código",
      copyCode: "Copiar código",
      copyLink: "Copiar link",
      copied: "¡Copiado!",
      instructions: "Si un equipo se desconecta, pueden volver a unirse con este código o link.",
    },
    en: {
      reconnect: "Reconnect teams",
      code: "Code",
      copyCode: "Copy code",
      copyLink: "Copy link",
      copied: "Copied!",
      instructions: "If a team disconnects, they can rejoin using this code or link.",
    },
    pt: {
      reconnect: "Reconectar equipes",
      code: "Código",
      copyCode: "Copiar código",
      copyLink: "Copiar link",
      copied: "Copiado!",
      instructions: "Se uma equipe se desconectar, pode voltar a entrar com este código ou link.",
    },
  };

  const t = texts[language] || texts.es;

  const joinLink = `${window.location.origin}/join?code=${roomCode || gameId}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode || gameId);
      setCopied("code");
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Error copying code:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Error copying link:", err);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 9999,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Badge colapsado */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            backgroundColor: "#1e293b",
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span>🔗</span>
          <span style={{ fontFamily: "monospace", letterSpacing: 1 }}>
            {roomCode || gameId.slice(0, 6).toUpperCase()}
          </span>
        </button>
      )}

      {/* Panel expandido */}
      {expanded && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            minWidth: 280,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 16 }}>
              🔗 {t.reconnect}
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                color: "#94a3b8",
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>

          {/* Instrucciones */}
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>
            {t.instructions}
          </p>

          {/* Código */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>
              {t.code}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  backgroundColor: "#f1f5f9",
                  borderRadius: 8,
                  fontFamily: "monospace",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 2,
                  textAlign: "center",
                  color: "#1e293b",
                }}
              >
                {roomCode || gameId.slice(0, 6).toUpperCase()}
              </div>
              <button
                onClick={handleCopyCode}
                style={{
                  padding: "12px 16px",
                  backgroundColor: copied === "code" ? "#22c55e" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                {copied === "code" ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {/* Link */}
          <button
            onClick={handleCopyLink}
            style={{
              width: "100%",
              padding: "12px 16px",
              backgroundColor: copied === "link" ? "#22c55e" : "#f1f5f9",
              color: copied === "link" ? "white" : "#3b82f6",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {copied === "link" ? (
              <>✓ {t.copied}</>
            ) : (
              <>🔗 {t.copyLink}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}