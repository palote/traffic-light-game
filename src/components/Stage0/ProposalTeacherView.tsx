// src/components/Stage0/ProposalTeacherView.tsx
// Vista del profesor durante la etapa donde los equipos envían propuestas
// ✅ CORREGIDO: Internacionalización completa con portugués y textos faltantes

import { useState, useEffect } from "react";
import { ref, onValue, off, update } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { Team } from "../../types/game";

interface Proposal {
  id: string;
  teamId: string;
  teamName: string;
  teamEmoji: string;
  questionText: string;
  suggestedStage: 1 | 2;
  createdAt: number;
}

interface ProposalTeacherViewProps {
  gameId: string;
  config: {
    maxProposalsPerTeam: number;
    timerMinutes: number | null;
    showLiveProposals: boolean;
  };
  onCloseProposals: () => void;
}

export function ProposalTeacherView({ gameId, config, onCloseProposals }: ProposalTeacherViewProps) {
  const { language } = useI18n();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    config.timerMinutes ? config.timerMinutes * 60 : null
  );
  const [timerStarted, setTimerStarted] = useState(false);
  const [proposalCounts, setProposalCounts] = useState<Record<string, number>>({});

  // Traducciones
  const t = {
    title: language === 'es' ? 'Etapa de propuestas' : language === 'pt' ? 'Etapa de propostas' : 'Proposal stage',
    timeRemaining: language === 'es' ? 'Tiempo restante' : language === 'pt' ? 'Tempo restante' : 'Time remaining',
    noTimeLimit: language === 'es' ? 'Sin límite de tiempo' : language === 'pt' ? 'Sem limite de tempo' : 'No time limit',
    
    proposalsByTeam: language === 'es' ? 'Propuestas por equipo' : language === 'pt' ? 'Propostas por equipe' : 'Proposals by team',
    totalProposals: language === 'es' ? 'propuestas recibidas' : language === 'pt' ? 'propostas recebidas' : 'proposals received',
    
    lastProposals: language === 'es' ? 'Últimas propuestas' : language === 'pt' ? 'Últimas propostas' : 'Latest proposals',
    noProposalsYet: language === 'es' 
      ? 'Esperando propuestas de los equipos...'
      : language === 'pt'
      ? 'Aguardando propostas das equipes...'
      : 'Waiting for team proposals...',
    
    closeProposals: language === 'es' ? '⏹️ Cerrar propuestas y curar' : language === 'pt' ? '⏹️ Encerrar propostas e curar' : '⏹️ Close proposals and curate',
    closeConfirm: language === 'es' 
      ? '¿Cerrar la recepción de propuestas? Los equipos ya no podrán enviar más.'
      : language === 'pt'
      ? 'Encerrar o recebimento de propostas? As equipes não poderão enviar mais.'
      : 'Close proposal reception? Teams will no longer be able to submit.',
    
    stage1: language === 'es' ? 'Etapa 1' : language === 'pt' ? 'Etapa 1' : 'Stage 1',
    stage2: language === 'es' ? 'Etapa 2' : language === 'pt' ? 'Etapa 2' : 'Stage 2',

    // ✅ NUEVAS CLAVES
    allTeams: language === 'es' ? 'Todos los equipos' : language === 'pt' ? 'Todas as equipes' : 'All teams',
    moreProposals: language === 'es' ? 'propuestas más...' : language === 'pt' ? 'propostas a mais...' : 'more proposals...',
  };

  // Escuchar equipos
  useEffect(() => {
    const teamsRef = ref(database, `games/${gameId}/teams`);
    
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const teamsData = snapshot.val();
        const teamsList: Team[] = Object.entries(teamsData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));
        setTeams(teamsList);
      }
    });

    return () => off(teamsRef);
  }, [gameId]);

  // Escuchar propuestas
  useEffect(() => {
    const proposalsRef = ref(database, `games/${gameId}/stage0/proposals`);
    
    const unsubscribe = onValue(proposalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const proposalsData = snapshot.val();
        const proposalsList: Proposal[] = Object.entries(proposalsData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));
        
        proposalsList.sort((a, b) => b.createdAt - a.createdAt);
        setProposals(proposalsList);
        
        const counts: Record<string, number> = {};
        proposalsList.forEach(p => {
          counts[p.teamId] = (counts[p.teamId] || 0) + 1;
        });
        setProposalCounts(counts);
      }
    });

    return () => off(proposalsRef);
  }, [gameId]);

  // Timer
  useEffect(() => {
    if (!timerStarted || timeRemaining === null) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          handleCloseProposals();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, timeRemaining]);

  // Iniciar timer al montar
  useEffect(() => {
    if (config.timerMinutes) {
      update(ref(database, `games/${gameId}/stage0`), {
        timerStartedAt: Date.now(),
        phase: 'collecting',
      });
      setTimerStarted(true);
    }
  }, []);

  const handleCloseProposals = () => {
    if (!confirm(t.closeConfirm)) return;
    
    update(ref(database, `games/${gameId}/stage0`), {
      phase: 'curating',
      closedAt: Date.now(),
    });
    
    onCloseProposals();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = (teamId: string): number => {
    const count = proposalCounts[teamId] || 0;
    return Math.min((count / config.maxProposalsPerTeam) * 100, 100);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      {/* Header con timer */}
      <div style={{
        maxWidth: 1000,
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            📝 {t.title}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
            {proposals.length} {t.totalProposals}
          </p>
        </div>
        
        {/* Timer */}
        <div style={{ textAlign: 'center' }}>
          {timeRemaining !== null ? (
            <>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                {t.timeRemaining}
              </div>
              <div style={{
                fontSize: 36,
                fontWeight: 800,
                fontFamily: 'monospace',
                color: timeRemaining < 60 ? '#ef4444' : timeRemaining < 180 ? '#f59e0b' : '#1e293b',
              }}>
                {formatTime(timeRemaining)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {t.noTimeLimit}
            </div>
          )}
        </div>

        <button
          onClick={handleCloseProposals}
          style={{
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 700,
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          {t.closeProposals}
        </button>
      </div>

      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
      }}>
        {/* Columna izquierda: Propuestas por equipo */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            📊 {t.proposalsByTeam}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {teams.map(team => {
              const count = proposalCounts[team.id] || 0;
              const percent = getProgressPercent(team.id);
              const isFull = count >= config.maxProposalsPerTeam;
              
              return (
                <div key={team.id}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{team.emoji}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                        {team.name}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: 14, 
                      fontWeight: 700, 
                      color: isFull ? '#22c55e' : '#64748b',
                    }}>
                      {count}/{config.maxProposalsPerTeam}
                    </span>
                  </div>
                  
                  <div style={{
                    height: 12,
                    backgroundColor: '#f1f5f9',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      backgroundColor: isFull ? '#22c55e' : '#8b5cf6',
                      borderRadius: 6,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: Últimas propuestas */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          maxHeight: '60vh',
          overflow: 'auto',
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            💬 {t.lastProposals}
          </h3>
          
          {proposals.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 14,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              {t.noProposalsYet}  {/* ✅ CORREGIDO */}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {proposals.slice(0, 10).map(proposal => (
                <div
                  key={proposal.id}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderLeft: `4px solid ${proposal.suggestedStage === 2 ? '#8b5cf6' : '#22c55e'}`,
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{proposal.teamEmoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                        {proposal.teamName}
                      </span>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 4,
                      backgroundColor: proposal.suggestedStage === 2 ? '#ede9fe' : '#dcfce7',
                      color: proposal.suggestedStage === 2 ? '#7c3aed' : '#16a34a',
                    }}>
                      {proposal.suggestedStage === 2 ? t.stage2 : t.stage1}
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    color: '#1e293b',
                    lineHeight: 1.5,
                  }}>
                    "{proposal.questionText}"
                  </p>
                </div>
              ))}
              
              {proposals.length > 10 && (
                <div style={{
                  padding: '8px 16px',
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 8,
                }}>
                  +{proposals.length - 10} {t.moreProposals}  {/* ✅ CORREGIDO */}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}