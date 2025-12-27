// src/components/Stage0/Stage0TeamView.tsx
// Vista del equipo en Stage 0 - Material de preparación

import type { Game, Team } from "../../types/game";

interface Stage0TeamViewProps {
  game: Game;
  team: Team;
  onReady?: () => void;
}

export function Stage0TeamView({ game, team, onReady }: Stage0TeamViewProps) {
  const config = game.config;
  const stage0Config = config.stage0Config;
  const material = stage0Config?.material;
  const language = config.language || 'en';

  const t = language === 'es'
    ? {
      title: 'Etapa 0: Preparación',
      subtitle: 'Lean el material antes de comenzar el juego',
      teamName: 'Equipo:',
      materialTitle: 'Material de estudio',
      openLink: 'Abrir material',
      waiting: 'Esperando que el docente inicie el juego...',
      noMaterial: 'El docente no ha cargado material de preparación.',
      readCarefully: 'Lean con atención, este contenido les ayudará en el juego.',
    }
    : {
      title: 'Stage 0: Preparation',
      subtitle: 'Read the material before starting the game',
      teamName: 'Team:',
      materialTitle: 'Study material',
      openLink: 'Open material',
      waiting: 'Waiting for the teacher to start the game...',
      noMaterial: 'The teacher has not uploaded preparation material.',
      readCarefully: 'Read carefully, this content will help you in the game.',
    };

  // Colores según modo de juego
  const isCoopetition = config.gameMode === 'coopetition';
  const primaryColor = isCoopetition ? '#6366f1' : '#22c55e';
  const bgColor = isCoopetition ? '#eef2ff' : '#f0fdf4';
  const icon = isCoopetition ? '🎯' : '🚦';

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${bgColor} 0%, white 100%)`,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: 32,
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{icon}</div>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: 28,
          fontWeight: 800,
          color: '#1e293b',
        }}>
          {t.title}
        </h1>
        <p style={{
          margin: 0,
          fontSize: 16,
          color: '#64748b',
        }}>
          {t.subtitle}
        </p>
      </div>

      {/* Team badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        backgroundColor: 'white',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 32,
      }}>
        <span style={{ fontWeight: 600, color: '#64748b' }}>{t.teamName}</span>
        <span style={{ fontWeight: 700, color: primaryColor, fontSize: 18 }}>{team.name}</span>
      </div>

      {/* Material Card */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        backgroundColor: 'white',
        borderRadius: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: `2px solid ${primaryColor}20`,
        overflow: 'hidden',
      }}>
        {/* Card Header */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: bgColor,
          borderBottom: `1px solid ${primaryColor}20`,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            📖 {material?.title || t.materialTitle}
          </h2>
        </div>

        {/* Card Content */}
        <div style={{ padding: 24 }}>
          {material ? (
            <>
              {material.type === 'link' ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    margin: '0 0 20px 0',
                    color: '#64748b',
                    fontSize: 14,
                  }}>
                    {t.readCarefully}
                  </p>
                  <a
                    href={material.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '14px 28px',
                      backgroundColor: primaryColor,
                      color: 'white',
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: 16,
                      boxShadow: `0 4px 12px ${primaryColor}40`,
                      transition: 'transform 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    🔗 {t.openLink}
                  </a>
                </div>
              ) : (
                <div>
                  <p style={{
                    margin: '0 0 16px 0',
                    color: '#64748b',
                    fontSize: 14,
                  }}>
                    {t.readCarefully}
                  </p>
                  <div style={{
                    padding: 20,
                    backgroundColor: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    maxHeight: 400,
                    overflowY: 'auto',
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: 15,
                      lineHeight: 1.7,
                      color: '#334155',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {material.content}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <span style={{ fontSize: 48, opacity: 0.5 }}>📄</span>
              <p style={{
                margin: '16px 0 0',
                color: '#94a3b8',
                fontSize: 14,
              }}>
                {t.noMaterial}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Waiting indicator */}
      <div style={{
        marginTop: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        border: '2px solid #fbbf24',
      }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: '#f59e0b',
          animation: 'pulse 1.5s infinite',
        }} />
        <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>
          {t.waiting}
        </span>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}