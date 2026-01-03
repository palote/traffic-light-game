// src/components/Stage2/FinalPodium.tsx
// 🏆 Pantalla final con podio estilo Kahoot

import { useNavigate } from "react-router-dom";
import type { Team } from "../../types/game";

interface FinalPodiumProps {
  teams: Team[];
  gameId: string;
}

export function FinalPodium({ teams, gameId }: FinalPodiumProps) {
  const navigate = useNavigate();

  // Ordenar equipos por puntaje total (mayor a menor)
  const sortedTeams = [...teams].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

  const first = sortedTeams[0];
  const second = sortedTeams[1];
  const third = sortedTeams[2];
  const rest = sortedTeams.slice(3);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Título */}
      <div style={{
        textAlign: "center",
        marginBottom: 40,
      }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
        <h1 style={{
          fontSize: 42,
          fontWeight: 800,
          color: "white",
          margin: 0,
          textShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
          ¡JUEGO TERMINADO!
        </h1>
        <p style={{
          fontSize: 18,
          color: "rgba(255,255,255,0.8)",
          marginTop: 8,
        }}>
          Resultados finales
        </p>
      </div>

      {/* Podio */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 16,
        marginBottom: 40,
        width: "100%",
        maxWidth: 600,
      }}>
        {/* 2do lugar */}
        {second && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <div style={{
              fontSize: 48,
              marginBottom: 8,
            }}>
              🥈
            </div>
            <div style={{
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
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {second.name?.split(' ')[0] || '🐯'}
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: "white",
                textAlign: "center",
                wordBreak: "break-word",
              }}>
                {second.name?.split(' ').slice(1).join(' ') || second.name}
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: "white",
                marginTop: 8,
              }}>
                {second.totalScore ?? 0} pts
              </div>
            </div>
          </div>
        )}

        {/* 1er lugar */}
        {first && (
          <div style={{
            flex: 1.2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <div style={{
              fontSize: 64,
              marginBottom: 8,
              animation: "bounce 1s ease infinite",
            }}>
              👑
            </div>
            <div style={{
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
            }}>
              <div style={{ fontSize: 36, marginBottom: 4 }}>
                {first.name?.split(' ')[0] || '🦁'}
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: "white",
                textAlign: "center",
                wordBreak: "break-word",
              }}>
                {first.name?.split(' ').slice(1).join(' ') || first.name}
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                color: "white",
                marginTop: 8,
              }}>
                {first.totalScore ?? 0} pts
              </div>
              <div style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.9)",
                marginTop: 4,
                fontWeight: 600,
              }}>
                🏆 CAMPEÓN
              </div>
            </div>
          </div>
        )}

        {/* 3er lugar */}
        {third && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <div style={{
              fontSize: 48,
              marginBottom: 8,
            }}>
              🥉
            </div>
            <div style={{
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
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {third.name?.split(' ')[0] || '🐻'}
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: "white",
                textAlign: "center",
                wordBreak: "break-word",
              }}>
                {third.name?.split(' ').slice(1).join(' ') || third.name}
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: "white",
                marginTop: 8,
              }}>
                {third.totalScore ?? 0} pts
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resto de equipos */}
      {rest.length > 0 && (
        <div style={{
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 20,
          width: "100%",
          maxWidth: 500,
          marginBottom: 32,
        }}>
          <h3 style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 12,
            textAlign: "center",
          }}>
            Otros participantes
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
              <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>
                {team.totalScore ?? 0} pts
              </span>
            </div>
          ))}
        </div>
      )}

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
        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        🏠 Volver al Dashboard
      </button>

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