// src/components/setup/ProposalWaitingRoom.tsx
// Sala de espera donde los equipos se conectan antes de comenzar las propuestas

import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import { RoomCodeDisplay } from "../RoomCodeDisplay";

// Tipo local para config (evitar problemas de import)
interface ProposalConfig {
  gameName: string;
  subject: string;
  numberOfTeams: number;
  materials: Array<{
    id: string;
    type: 'file' | 'text' | 'link';
    name: string;
    content: string;
  }>;
  maxProposalsPerTeam: number;
  timerMinutes: number | null;
  showLiveProposals: boolean;
}

interface TeamData {
  id: string;
  name: string;
  emoji: string;
  color: string;
  players?: Record<string, any>;
  connected?: boolean;
}

interface ProposalWaitingRoomProps {
  gameId: string;
  config: ProposalConfig;
  onStartProposals: () => void;
  onBack: () => void;
}

export function ProposalWaitingRoom({ gameId, config, onStartProposals, onBack }: ProposalWaitingRoomProps) {
  const { language } = useI18n();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);

  // Escuchar cambios en equipos
  useEffect(() => {
    const teamsRef = ref(database, `games/${gameId}/teams`);
    
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const teamsData = snapshot.val();
        const teamsList: TeamData[] = [];
        let connected = 0;
        
        Object.entries(teamsData).forEach(([id, data]: [string, any]) => {
          // ✅ CORREGIDO: Verificar si players existe y tiene contenido real
          const hasPlayers = data.players && 
            typeof data.players === 'object' && 
            Object.keys(data.players).length > 0;
          
          // También verificar flag de conexión
          const isConnected = hasPlayers || data.connected === true;
          
          if (isConnected) {
            connected++;
          }
          
          teamsList.push({
            id,
            name: data.name || id,
            emoji: data.emoji || '📦',
            color: data.color || '#64748b',
            players: data.players,
            connected: isConnected,
          });
        });
        
        setTeams(teamsList);
        setConnectedCount(connected);
        
        console.log('Teams updated:', teamsList.map(t => ({ 
          name: t.name, 
          connected: t.connected,
          playersCount: t.players ? Object.keys(t.players).length : 0 
        })));
      }
    });

    return () => off(teamsRef);
  }, [gameId]);

  // Traducciones
  const t = {
    title: language === 'es' ? 'Sala de espera' : 'Waiting room',
    subtitle: language === 'es' 
      ? 'Esperá a que los equipos se conecten'
      : 'Wait for teams to connect',
    
    teamsConnected: language === 'es' ? 'Equipos conectados' : 'Teams connected',
    waiting: language === 'es' ? 'Esperando...' : 'Waiting...',
    connected: language === 'es' ? 'Conectado' : 'Connected',
    players: language === 'es' ? 'jugadores' : 'players',
    
    materials: language === 'es' ? 'Material compartido' : 'Shared material',
    noMaterials: language === 'es' ? 'Sin material de referencia' : 'No reference material',
    
    configSummary: language === 'es' ? 'Configuración' : 'Settings',
    proposalsPerTeam: language === 'es' ? 'propuestas por equipo' : 'proposals per team',
    timeLimit: language === 'es' ? 'Tiempo límite' : 'Time limit',
    noTimeLimit: language === 'es' ? 'Sin límite' : 'No limit',
    minutes: language === 'es' ? 'minutos' : 'minutes',
    
    startButton: language === 'es' ? '🚀 Comenzar etapa de propuestas' : '🚀 Start proposal stage',
    waitingHint: language === 'es' 
      ? '(Podés empezar cuando quieras, no es necesario esperar a todos)'
      : '(You can start whenever you want, no need to wait for everyone)',
    
    back: language === 'es' ? '← Cancelar' : '← Cancel',
  };

  const someTeamsConnected = connectedCount > 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 900,
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            🎮 {config.gameName}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
            {t.subtitle}
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            backgroundColor: '#fee2e2',
            color: '#ef4444',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {t.back}
        </button>
      </div>

      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
      }}>
        {/* Columna izquierda: Código y equipos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Código de sala */}
          <RoomCodeDisplay gameId={gameId} />

          {/* Equipos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              {t.teamsConnected} ({connectedCount}/{config.numberOfTeams})
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {teams.map(team => {
                const isConnected = team.connected;
                const playerCount = team.players ? Object.keys(team.players).length : 0;
                
                return (
                  <div
                    key={team.id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: isConnected ? '#f0fdf4' : '#f8fafc',
                      borderRadius: 10,
                      border: `2px solid ${isConnected ? '#22c55e' : '#e2e8f0'}`,
                      transition: 'all 0.3s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{team.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: 14, 
                          fontWeight: 600, 
                          color: isConnected ? '#15803d' : '#64748b',
                        }}>
                          {team.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          {isConnected 
                            ? `${playerCount} ${t.players}` 
                            : t.waiting
                          }
                        </div>
                      </div>
                      {isConnected && (
                        <span style={{ color: '#22c55e', fontSize: 18 }}>✓</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna derecha: Materiales y config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Materiales */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              📚 {t.materials}
            </h3>
            
            {config.materials && config.materials.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {config.materials.map(m => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>
                      {m.type === 'file' ? '📄' : m.type === 'link' ? '🔗' : '📝'}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, color: '#1e293b' }}>{m.name}</span>
                    {m.type === 'link' && (
                      <a 
                        href={m.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#6366f1' }}
                      >
                        Ver ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', fontStyle: 'italic' }}>
                {t.noMaterials}
              </p>
            )}
          </div>

          {/* Configuración */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              ⚙️ {t.configSummary}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>{t.proposalsPerTeam}:</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{config.maxProposalsPerTeam}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>{t.timeLimit}:</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  {config.timerMinutes ? `${config.timerMinutes} ${t.minutes}` : t.noTimeLimit}
                </span>
              </div>
            </div>
          </div>

          {/* Botón de inicio */}
          <button
            onClick={onStartProposals}
            disabled={!someTeamsConnected}
            style={{
              padding: '18px 24px',
              fontSize: 17,
              fontWeight: 700,
              backgroundColor: someTeamsConnected ? '#8b5cf6' : '#e2e8f0',
              color: someTeamsConnected ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: 12,
              cursor: someTeamsConnected ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {t.startButton}
          </button>
          
          {someTeamsConnected && (
            <p style={{ 
              margin: '-8px 0 0 0', 
              fontSize: 12, 
              color: '#22c55e', 
              textAlign: 'center',
            }}>
              {t.waitingHint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}