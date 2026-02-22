// src/components/Stage0/Stage0TeamView.tsx
// Vista del equipo en Stage 0 - Material + Propuestas de consignas

import { useState, useEffect } from 'react';
import type { Game, Team, ProposalType } from '../../types/game';
import { 
  submitProposal, 
  deleteProposal,
  markTeamReady,
  unmarkTeamReady,
  getProposalTypeLabel,
  getProposalTypeDescription,
} from '../../services/stage0Service';
import { useI18n } from '../../i18n'; // ✅ Hook global

interface Stage0TeamViewProps {
  game: Game;
  team: Team;
  onReady?: () => void;
}

const PROPOSAL_TYPES: ProposalType[] = [
  'comprehension',
  'relation', 
  'application',
  'analysis',
  'production',
];

export function Stage0TeamView({ game, team }: Stage0TeamViewProps) {
  const { language } = useI18n(); // ✅ Idioma desde el hook

  const config = game.config;
  const stage0Config = config.stage0Config;
  const stage0State = game.stage0;
  const material = stage0Config?.material;
  const maxProposals = stage0Config?.maxProposalsPerTeam || 5;
  const proposalsEnabled = stage0Config?.proposalsEnabled ?? false;

  // Propuestas del equipo
  const teamProposals = stage0State?.proposals 
    ? Object.values(stage0State.proposals).filter(p => p.teamId === team.id)
    : [];

  const isTeamReady = stage0State?.readyTeams?.includes(team.id) ?? false;
  const currentPhase = stage0State?.phase || 'reading';

  // Estado del formulario
  const [showForm, setShowForm] = useState(false);
  const [proposalType, setProposalType] = useState<ProposalType>('comprehension');
  const [questionText, setQuestionText] = useState('');
  const [hint, setHint] = useState('');
  const [relatedTopic, setRelatedTopic] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Temporizador
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // 📦 Textos traducidos (es, en, pt)
  const texts = {
    es: {
      title: 'Etapa 0: Preparación',
      subtitle: 'Lean el material antes de comenzar el juego',
      teamName: 'Equipo:',
      materialTitle: 'Material de estudio',
      openLink: 'Abrir material',
      waiting: 'Esperando que el docente inicie el juego...',
      noMaterial: 'El docente no ha cargado material de preparación.',
      readCarefully: 'Lean con atención, este contenido les ayudará en el juego.',
      
      proposalsTitle: 'Proponer Consignas',
      proposalsSubtitle: 'Propongan consignas basadas en el material',
      proposalCount: 'propuestas',
      addProposal: 'Agregar consigna',
      proposalType: 'Tipo de consigna',
      questionText: 'Tu consigna',
      questionPlaceholder: 'Escribí la consigna que proponés...',
      hintLabel: 'Pista para responder (opcional)',
      hintPlaceholder: 'Una pista que ayude a pensar la respuesta...',
      relatedTopicLabel: '¿Con qué tema se relaciona?',
      relatedTopicPlaceholder: 'Ej: Ciclo del agua, Fracciones...',
      submittedByLabel: '¿Quién la propone? (opcional)',
      submittedByPlaceholder: 'Nombre del integrante...',
      submit: 'Enviar consigna',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      edited: 'Editada',
      
      markReady: 'Terminamos de proponer',
      unmarkReady: 'Queremos seguir proponiendo',
      teamReady: '¡Equipo listo!',
      waitingReview: 'Esperando que el docente revise las propuestas...',
      
      timeRemaining: 'Tiempo restante',
      
      resultsTitle: 'Resultados Stage 0',
      approvedCount: 'consignas aprobadas',
      bonusPoints: 'puntos bonus',
      waitingStart: 'Esperando que el docente inicie Stage 1...',
      
      errorEmpty: 'Escribí una consigna',
      errorRelated: 'Indicá con qué tema se relaciona',
      maxReached: 'Ya enviaron el máximo de consignas',
      errorSubmit: 'Error al enviar',
    },
    en: {
      title: 'Stage 0: Preparation',
      subtitle: 'Read the material before starting the game',
      teamName: 'Team:',
      materialTitle: 'Study material',
      openLink: 'Open material',
      waiting: 'Waiting for the teacher to start the game...',
      noMaterial: 'The teacher has not uploaded preparation material.',
      readCarefully: 'Read carefully, this content will help you in the game.',
      
      proposalsTitle: 'Propose Prompts',
      proposalsSubtitle: 'Propose prompts based on the material',
      proposalCount: 'proposals',
      addProposal: 'Add prompt',
      proposalType: 'Prompt type',
      questionText: 'Your prompt',
      questionPlaceholder: 'Write your proposed prompt...',
      hintLabel: 'Hint to answer (optional)',
      hintPlaceholder: 'A hint to help think about the answer...',
      relatedTopicLabel: 'What topic does it relate to?',
      relatedTopicPlaceholder: 'E.g.: Water cycle, Fractions...',
      submittedByLabel: 'Who proposes it? (optional)',
      submittedByPlaceholder: 'Team member name...',
      submit: 'Submit prompt',
      cancel: 'Cancel',
      delete: 'Delete',
      
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      edited: 'Edited',
      
      markReady: 'We finished proposing',
      unmarkReady: 'We want to keep proposing',
      teamReady: 'Team ready!',
      waitingReview: 'Waiting for the teacher to review proposals...',
      
      timeRemaining: 'Time remaining',
      
      resultsTitle: 'Stage 0 Results',
      approvedCount: 'approved prompts',
      bonusPoints: 'bonus points',
      waitingStart: 'Waiting for the teacher to start Stage 1...',
      
      errorEmpty: 'Write a prompt',
      errorRelated: 'Indicate what topic it relates to',
      maxReached: 'Maximum proposals reached',
      errorSubmit: 'Error submitting',
    },
    pt: {
      title: 'Etapa 0: Preparação',
      subtitle: 'Leiam o material antes de começar o jogo',
      teamName: 'Equipe:',
      materialTitle: 'Material de estudo',
      openLink: 'Abrir material',
      waiting: 'Aguardando o professor iniciar o jogo...',
      noMaterial: 'O professor não carregou material de preparação.',
      readCarefully: 'Leiam com atenção, este conteúdo ajudará no jogo.',
      
      proposalsTitle: 'Propor Tarefas',
      proposalsSubtitle: 'Proponham tarefas baseadas no material',
      proposalCount: 'propostas',
      addProposal: 'Adicionar tarefa',
      proposalType: 'Tipo de tarefa',
      questionText: 'Sua tarefa',
      questionPlaceholder: 'Escreva a tarefa que você propõe...',
      hintLabel: 'Dica para responder (opcional)',
      hintPlaceholder: 'Uma dica para ajudar a pensar na resposta...',
      relatedTopicLabel: 'Com qual tema se relaciona?',
      relatedTopicPlaceholder: 'Ex: Ciclo da água, Frações...',
      submittedByLabel: 'Quem propõe? (opcional)',
      submittedByPlaceholder: 'Nome do integrante...',
      submit: 'Enviar tarefa',
      cancel: 'Cancelar',
      delete: 'Excluir',
      
      pending: 'Pendente',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
      edited: 'Editada',
      
      markReady: 'Terminamos de propor',
      unmarkReady: 'Queremos continuar propondo',
      teamReady: 'Equipe pronta!',
      waitingReview: 'Aguardando o professor revisar as propostas...',
      
      timeRemaining: 'Tempo restante',
      
      resultsTitle: 'Resultados Etapa 0',
      approvedCount: 'tarefas aprovadas',
      bonusPoints: 'pontos bônus',
      waitingStart: 'Aguardando o professor iniciar a Etapa 1...',
      
      errorEmpty: 'Escreva uma tarefa',
      errorRelated: 'Indique com qual tema se relaciona',
      maxReached: 'Máximo de propostas atingido',
      errorSubmit: 'Erro ao enviar',
    },
  };

  const t = texts[language] || texts.es;

  // Efecto del temporizador
  useEffect(() => {
    if (!stage0Config?.timerMinutes || !stage0State?.timerStartedAt) {
      setTimeRemaining(null);
      return;
    }

    const endTime = stage0State.timerStartedAt + (stage0Config.timerMinutes * 60 * 1000);
    
    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [stage0Config?.timerMinutes, stage0State?.timerStartedAt]);

  // Colores según modo de juego
  const isCoopetition = config.gameMode === 'coopetition';
  const primaryColor = isCoopetition ? '#6366f1' : '#22c55e';
  const bgColor = isCoopetition ? '#eef2ff' : '#f0fdf4';
  const icon = isCoopetition ? '🎯' : '🚦';

  // Enviar propuesta
  const handleSubmit = async () => {
    setError(null);

    if (!questionText.trim()) {
      setError(t.errorEmpty);
      return;
    }

    if (proposalType === 'relation' && !relatedTopic.trim()) {
      setError(t.errorRelated);
      return;
    }

    if (teamProposals.length >= maxProposals) {
      setError(t.maxReached);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProposal(game.id, {
        teamId: team.id,
        teamName: team.name,
        type: proposalType,
        questionText: questionText.trim(),
        hint: hint.trim() || undefined,
        relatedTopic: relatedTopic.trim() || undefined,
        submittedBy: submittedBy.trim() || undefined,
      });

      setQuestionText('');
      setHint('');
      setRelatedTopic('');
      setSubmittedBy('');
      setShowForm(false);
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setError(t.errorSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar propuesta
  const handleDelete = async (proposalId: string) => {
    try {
      await deleteProposal(game.id, proposalId);
    } catch (err) {
      console.error('Error deleting proposal:', err);
    }
  };

  // Marcar/desmarcar listo
  const handleReadyToggle = async () => {
    try {
      if (isTeamReady) {
        await unmarkTeamReady(game.id, team.id);
      } else {
        await markTeamReady(game.id, team.id);
      }
    } catch (err) {
      console.error('Error toggling ready:', err);
    }
  };

  // Badge de estado
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#fef3c7', color: '#92400e', label: t.pending },
      approved: { bg: '#dcfce7', color: '#166534', label: t.approved },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: t.rejected },
      edited: { bg: '#dbeafe', color: '#1e40af', label: t.edited },
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
      }}>
        {s.label}
      </span>
    );
  };

  // Formato de tiempo
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Resultados del equipo
  const approvedProposals = teamProposals.filter(p => p.status === 'approved' || p.status === 'edited');
  const totalBonus = approvedProposals.reduce((sum, p) => sum + (p.bonusPoints || 0), 0);

  // FASE DE RESULTADOS
  if (currentPhase === 'results') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${bgColor} 0%, white 100%)`,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 800, color: '#1e293b' }}>
          {t.resultsTitle}
        </h1>
        
        <div style={{ display: 'flex', gap: 24, marginTop: 32, marginBottom: 32 }}>
          <div style={{
            padding: '24px 32px',
            backgroundColor: 'white',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: primaryColor }}>
              {approvedProposals.length}
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>{t.approvedCount}</div>
          </div>
          
          <div style={{
            padding: '24px 32px',
            backgroundColor: 'white',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#f59e0b' }}>
              +{totalBonus}
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>{t.bonusPoints}</div>
          </div>
        </div>

        <div style={{
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
            {t.waitingStart}
          </span>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  // VISTA PRINCIPAL
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
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{icon}</div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 800, color: '#1e293b' }}>
          {t.title}
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: '#64748b' }}>{t.subtitle}</p>
      </div>

      {/* Team badge + Timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <span style={{ fontWeight: 600, color: '#64748b' }}>{t.teamName}</span>
          <span style={{ fontWeight: 700, color: primaryColor, fontSize: 18 }}>{team.name}</span>
        </div>

        {timeRemaining !== null && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            backgroundColor: timeRemaining < 60000 ? '#fee2e2' : '#fef3c7',
            borderRadius: 12,
            border: `2px solid ${timeRemaining < 60000 ? '#ef4444' : '#fbbf24'}`,
          }}>
            <span style={{ fontSize: 14, color: timeRemaining < 60000 ? '#991b1b' : '#92400e' }}>
              ⏱️ {t.timeRemaining}:
            </span>
            <span style={{ fontWeight: 700, fontSize: 18, color: timeRemaining < 60000 ? '#dc2626' : '#d97706' }}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Material Card */}
      <div style={{
        width: '100%',
        maxWidth: 700,
        backgroundColor: 'white',
        borderRadius: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: `2px solid ${primaryColor}20`,
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          padding: '16px 20px',
          backgroundColor: bgColor,
          borderBottom: `1px solid ${primaryColor}20`,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            📖 {material?.title || t.materialTitle}
          </h2>
        </div>

        <div style={{ padding: 20 }}>
          {material ? (
            material.type === 'link' ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 14 }}>
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
                    padding: '12px 24px',
                    backgroundColor: primaryColor,
                    color: 'white',
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  🔗 {t.openLink}
                </a>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: 14 }}>
                  {t.readCarefully}
                </p>
                <div style={{
                  padding: 16,
                  backgroundColor: '#f8fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  maxHeight: 250,
                  overflowY: 'auto',
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: '#334155',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {material.content}
                  </p>
                </div>
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <span style={{ fontSize: 48, opacity: 0.5 }}>📄</span>
              <p style={{ margin: '16px 0 0', color: '#94a3b8', fontSize: 14 }}>
                {t.noMaterial}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Proposals Section */}
      {proposalsEnabled && currentPhase === 'proposing' && (
        <div style={{
          width: '100%',
          maxWidth: 700,
          backgroundColor: 'white',
          borderRadius: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: `2px solid ${primaryColor}20`,
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <div style={{
            padding: '16px 20px',
            backgroundColor: bgColor,
            borderBottom: `1px solid ${primaryColor}20`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                ✍️ {t.proposalsTitle}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                {t.proposalsSubtitle}
              </p>
            </div>
            <div style={{
              padding: '6px 12px',
              backgroundColor: primaryColor,
              color: 'white',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
            }}>
              {teamProposals.length}/{maxProposals}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {/* Existing proposals */}
            {teamProposals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {teamProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    style={{
                      padding: 12,
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {getProposalTypeLabel(proposal.type, language)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getStatusBadge(proposal.status)}
                        {proposal.status === 'pending' && (
                          <button
                            onClick={() => handleDelete(proposal.id)}
                            style={{
                              padding: '2px 8px',
                              fontSize: 11,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            {t.delete}
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#1e293b' }}>
                      {proposal.editedText || proposal.questionText}
                    </p>
                    {proposal.relatedTopic && (
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6366f1' }}>
                        🔗 {proposal.relatedTopic}
                      </p>
                    )}
                    {proposal.bonusPoints > 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                        +{proposal.bonusPoints} pts
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add proposal form */}
            {showForm ? (
              <div style={{
                padding: 16,
                backgroundColor: '#f0fdf4',
                borderRadius: 12,
                border: '2px solid #22c55e',
              }}>
                {/* Proposal type selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {t.proposalType}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PROPOSAL_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setProposalType(type)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: proposalType === type ? `2px solid ${primaryColor}` : '2px solid #e2e8f0',
                          backgroundColor: proposalType === type ? `${primaryColor}15` : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13, color: proposalType === type ? primaryColor : '#1e293b' }}>
                          {getProposalTypeLabel(type, language)}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {getProposalTypeDescription(type, language)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question text */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {t.questionText} *
                  </label>
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder={t.questionPlaceholder}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 14,
                      borderRadius: 10,
                      border: '2px solid #e2e8f0',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Related topic (for 'relation' type) */}
                {proposalType === 'relation' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                      {t.relatedTopicLabel} *
                    </label>
                    <input
                      type="text"
                      value={relatedTopic}
                      onChange={(e) => setRelatedTopic(e.target.value)}
                      placeholder={t.relatedTopicPlaceholder}
                      style={{
                        width: '100%',
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: '2px solid #e2e8f0',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {/* Hint */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {t.hintLabel}
                  </label>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder={t.hintPlaceholder}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 14,
                      borderRadius: 10,
                      border: '2px solid #e2e8f0',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Submitted by */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {t.submittedByLabel}
                  </label>
                  <input
                    type="text"
                    value={submittedBy}
                    onChange={(e) => setSubmittedBy(e.target.value)}
                    placeholder={t.submittedByPlaceholder}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 14,
                      borderRadius: 10,
                      border: '2px solid #e2e8f0',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#fee2e2',
                    borderRadius: 8,
                    color: '#dc2626',
                    fontSize: 13,
                    marginBottom: 16,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 10,
                      border: '2px solid #e2e8f0',
                      backgroundColor: 'white',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    style={{
                      flex: 2,
                      padding: '12px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: primaryColor,
                      color: 'white',
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? '...' : `✓ ${t.submit}`}
                  </button>
                </div>
              </div>
            ) : (
              teamProposals.length < maxProposals && !isTeamReady && (
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: 12,
                    border: `2px dashed ${primaryColor}`,
                    backgroundColor: 'transparent',
                    color: primaryColor,
                    cursor: 'pointer',
                  }}
                >
                  + {t.addProposal}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Ready / Waiting section */}
      {proposalsEnabled && currentPhase === 'proposing' && (
        <div style={{ width: '100%', maxWidth: 700 }}>
          {isTeamReady ? (
            <div style={{
              padding: 20,
              backgroundColor: '#dcfce7',
              borderRadius: 16,
              border: '2px solid #22c55e',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#166534' }}>
                {t.teamReady}
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#15803d' }}>
                {t.waitingReview}
              </p>
              <button
                onClick={handleReadyToggle}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: '2px solid #22c55e',
                  backgroundColor: 'white',
                  color: '#16a34a',
                  cursor: 'pointer',
                }}
              >
                ← {t.unmarkReady}
              </button>
            </div>
          ) : (
            teamProposals.length > 0 && (
              <button
                onClick={handleReadyToggle}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 14,
                  border: 'none',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                }}
              >
                ✓ {t.markReady}
              </button>
            )
          )}
        </div>
      )}

      {/* Waiting indicator (reading phase or no proposals) */}
      {(!proposalsEnabled || currentPhase === 'reading') && (
        <div style={{
          marginTop: 16,
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
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}