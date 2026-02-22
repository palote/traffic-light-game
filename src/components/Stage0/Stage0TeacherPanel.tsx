// src/components/Stage0/Stage0TeacherPanel.tsx
// Panel del docente para revisar propuestas de consignas en Stage 0
// ✅ CORREGIDO: Internacionalización completa con portugués y textos faltantes

import { useState, useMemo } from 'react';
import type { Game, Stage0Proposal, ProposalType } from '../../types/game';
import {
  approveProposal,
  rejectProposal,
  setStage0Phase,
  finishStage0AndStartStage1,
  getProposalTypeLabel,
  saveProposalToLibrary,
} from '../../services/stage0Service';
import { useAuth } from '../../contexts/AuthContext';

interface Stage0TeacherPanelProps {
  game: Game;
  onStartStage1?: () => void;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function Stage0TeacherPanel({ game, onStartStage1 }: Stage0TeacherPanelProps) {
  const { user } = useAuth();
  const config = game.config;
  const stage0State = game.stage0;
  const language = config.language || 'es';
  const currentPhase = stage0State?.phase || 'reading';

  // Get all proposals
  const allProposals: Stage0Proposal[] = useMemo(() => {
    if (!stage0State?.proposals) return [];
    return Object.values(stage0State.proposals).sort((a, b) => a.submittedAt - b.submittedAt);
  }, [stage0State?.proposals]);

  // State
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [bonusPoints, setBonusPoints] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const t = language === 'es'
    ? {
        title: 'Panel Stage 0',
        subtitle: 'Revisá las propuestas de los equipos',
        
        // Phases
        phaseReading: 'Fase: Lectura',
        phaseProposing: 'Fase: Propuestas',
        phaseReviewing: 'Fase: Revisión',
        phaseResults: 'Fase: Resultados',
        
        // Actions
        startProposals: 'Iniciar propuestas',
        startReview: 'Iniciar revisión',
        finishAndStart: 'Finalizar y comenzar Stage 1',
        
        // Filters
        filterAll: 'Todas',
        filterPending: 'Pendientes',
        filterApproved: 'Aprobadas',
        filterRejected: 'Rechazadas',
        allTeams: 'Todos los equipos',
        
        // Stats
        totalProposals: 'Total propuestas',
        pendingCount: 'Pendientes',
        approvedCount: 'Aprobadas',
        rejectedCount: 'Rechazadas',
        teamsReady: 'Equipos listos',
        
        // Proposal card
        proposedBy: 'Propuesto por',
        relatedTo: 'Relacionado con',
        hint: 'Pista',
        
        // Actions
        approve: 'Aprobar',
        reject: 'Rechazar',
        edit: 'Editar',
        saveEdit: 'Guardar',
        cancelEdit: 'Cancelar',
        bonusLabel: 'Puntos bonus',
        
        // Status
        pending: 'Pendiente',
        approved: 'Aprobada',
        rejected: 'Rechazada',
        edited: 'Editada',
        
        // Empty
        noProposals: 'No hay propuestas todavía',
        noProposalsFiltered: 'No hay propuestas con estos filtros',
        
        // Warnings
        pendingWarning: 'Hay propuestas pendientes de revisar',
        confirmStart: '¿Iniciar Stage 1? Los puntos bonus se aplicarán automáticamente.',
        
        // Save to library
        saveToLibrary: 'Guardar',
        savedToLibrary: '¡Guardada!',

        // ✅ NUEVAS CLAVES
        moreProposals: 'propuestas más...',
        points: 'pts',
        bonusPoints: 'puntos bonus',
      }
    : language === 'pt'
    ? {
        title: 'Painel Stage 0',
        subtitle: 'Revise as propostas das equipes',
        
        // Phases
        phaseReading: 'Fase: Leitura',
        phaseProposing: 'Fase: Propostas',
        phaseReviewing: 'Fase: Revisão',
        phaseResults: 'Fase: Resultados',
        
        // Actions
        startProposals: 'Iniciar propostas',
        startReview: 'Iniciar revisão',
        finishAndStart: 'Finalizar e começar Stage 1',
        
        // Filters
        filterAll: 'Todas',
        filterPending: 'Pendentes',
        filterApproved: 'Aprovadas',
        filterRejected: 'Rejeitadas',
        allTeams: 'Todas as equipes',
        
        // Stats
        totalProposals: 'Total propostas',
        pendingCount: 'Pendentes',
        approvedCount: 'Aprovadas',
        rejectedCount: 'Rejeitadas',
        teamsReady: 'Equipes prontas',
        
        // Proposal card
        proposedBy: 'Proposto por',
        relatedTo: 'Relacionado a',
        hint: 'Dica',
        
        // Actions
        approve: 'Aprovar',
        reject: 'Rejeitar',
        edit: 'Editar',
        saveEdit: 'Salvar',
        cancelEdit: 'Cancelar',
        bonusLabel: 'Pontos bônus',
        
        // Status
        pending: 'Pendente',
        approved: 'Aprovada',
        rejected: 'Rejeitada',
        edited: 'Editada',
        
        // Empty
        noProposals: 'Ainda não há propostas',
        noProposalsFiltered: 'Nenhuma proposta com esses filtros',
        
        // Warnings
        pendingWarning: 'Há propostas pendentes de revisão',
        confirmStart: 'Iniciar Stage 1? Os pontos bônus serão aplicados automaticamente.',
        
        // Save to library
        saveToLibrary: 'Salvar',
        savedToLibrary: 'Salva!',

        // ✅ NUEVAS CLAVES
        moreProposals: 'propostas a mais...',
        points: 'pts',
        bonusPoints: 'pontos bônus',
      }
    : {
        title: 'Stage 0 Panel',
        subtitle: 'Review team proposals',
        
        // Phases
        phaseReading: 'Phase: Reading',
        phaseProposing: 'Phase: Proposals',
        phaseReviewing: 'Phase: Review',
        phaseResults: 'Phase: Results',
        
        // Actions
        startProposals: 'Start proposals',
        startReview: 'Start review',
        finishAndStart: 'Finish and start Stage 1',
        
        // Filters
        filterAll: 'All',
        filterPending: 'Pending',
        filterApproved: 'Approved',
        filterRejected: 'Rejected',
        allTeams: 'All teams',
        
        // Stats
        totalProposals: 'Total proposals',
        pendingCount: 'Pending',
        approvedCount: 'Approved',
        rejectedCount: 'Rejected',
        teamsReady: 'Teams ready',
        
        // Proposal card
        proposedBy: 'Proposed by',
        relatedTo: 'Related to',
        hint: 'Hint',
        
        // Actions
        approve: 'Approve',
        reject: 'Reject',
        edit: 'Edit',
        saveEdit: 'Save',
        cancelEdit: 'Cancel',
        bonusLabel: 'Bonus points',
        
        // Status
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        edited: 'Edited',
        
        // Empty
        noProposals: 'No proposals yet',
        noProposalsFiltered: 'No proposals match these filters',
        
        // Warnings
        pendingWarning: 'There are pending proposals to review',
        confirmStart: 'Start Stage 1? Bonus points will be applied automatically.',
        
        // Save to library
        saveToLibrary: 'Save',
        savedToLibrary: 'Saved!',

        // ✅ NUEVAS CLAVES
        moreProposals: 'more proposals...',
        points: 'pts',
        bonusPoints: 'bonus points',
      };

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return allProposals.filter(p => {
      if (filterStatus !== 'all') {
        if (filterStatus === 'approved' && p.status !== 'approved' && p.status !== 'edited') return false;
        if (filterStatus === 'pending' && p.status !== 'pending') return false;
        if (filterStatus === 'rejected' && p.status !== 'rejected') return false;
      }
      if (filterTeam !== 'all' && p.teamId !== filterTeam) return false;
      return true;
    });
  }, [allProposals, filterStatus, filterTeam]);

  // Stats
  const stats = useMemo(() => {
    const pending = allProposals.filter(p => p.status === 'pending').length;
    const approved = allProposals.filter(p => p.status === 'approved' || p.status === 'edited').length;
    const rejected = allProposals.filter(p => p.status === 'rejected').length;
    return { total: allProposals.length, pending, approved, rejected };
  }, [allProposals]);

  // Teams
  const teams = useMemo(() => {
    const teamMap = new Map<string, string>();
    allProposals.forEach(p => teamMap.set(p.teamId, p.teamName));
    return Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }));
  }, [allProposals]);

  // Ready teams count
  const readyTeamsCount = stage0State?.readyTeams?.length || 0;
  const totalTeams = Array.isArray(game.teams) ? game.teams.length : Object.keys(game.teams || {}).length;

  // Colors
  const isCoopetition = config.gameMode === 'coopetition';
  const primaryColor = isCoopetition ? '#6366f1' : '#22c55e';
  const bgColor = isCoopetition ? '#eef2ff' : '#f0fdf4';

  // Handlers
  const handlePhaseChange = async (phase: 'reading' | 'proposing' | 'reviewing' | 'results') => {
    setIsProcessing(true);
    try {
      await setStage0Phase(game.id, phase, config.stage0Config?.timerMinutes);
    } catch (err) {
      console.error('Error changing phase:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (proposal: Stage0Proposal) => {
    const points = bonusPoints[proposal.id] || 0;
    try {
      await approveProposal(game.id, proposal.id, points);
    } catch (err) {
      console.error('Error approving:', err);
    }
  };

  const handleReject = async (proposal: Stage0Proposal) => {
    try {
      await rejectProposal(game.id, proposal.id);
    } catch (err) {
      console.error('Error rejecting:', err);
    }
  };

  const handleEditStart = (proposal: Stage0Proposal) => {
    setEditingId(proposal.id);
    setEditText(proposal.editedText || proposal.questionText);
  };

  const handleEditSave = async (proposal: Stage0Proposal) => {
    const points = bonusPoints[proposal.id] || 0;
    try {
      await approveProposal(game.id, proposal.id, points, editText);
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error('Error saving edit:', err);
    }
  };

  const handleFinishStage0 = async () => {
    if (stats.pending > 0) {
      const confirm = window.confirm(t.pendingWarning + '\n\n' + t.confirmStart);
      if (!confirm) return;
    } else {
      const confirm = window.confirm(t.confirmStart);
      if (!confirm) return;
    }

    setIsProcessing(true);
    try {
      await finishStage0AndStartStage1(game.id);
      onStartStage1?.();
    } catch (err) {
      console.error('Error finishing stage 0:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToLibrary = async (proposal: Stage0Proposal) => {
    if (!user?.uid) return;
    
    try {
      await saveProposalToLibrary(user.uid, proposal, {
        gameId: game.id,
        topic: config.subject,
      });
      setSavedIds(prev => new Set([...prev, proposal.id]));
    } catch (err) {
      console.error('Error saving to library:', err);
    }
  };

  // Get status badge
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
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
      }}>
        {s.label}
      </span>
    );
  };

  // Get phase label
  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'reading': return t.phaseReading;
      case 'proposing': return t.phaseProposing;
      case 'reviewing': return t.phaseReviewing;
      case 'results': return t.phaseResults;
      default: return currentPhase;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${bgColor} 0%, white 100%)`,
      padding: 24,
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 1000,
        margin: '0 auto 24px',
        textAlign: 'center',
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: '#1e293b' }}>
          🎓 {t.title}
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: '#64748b' }}>{t.subtitle}</p>
      </div>

      {/* Phase indicator + Actions */}
      <div style={{
        maxWidth: 1000,
        margin: '0 auto 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          padding: '10px 20px',
          backgroundColor: primaryColor,
          color: 'white',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
        }}>
          {getPhaseLabel()}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {currentPhase === 'reading' && (
            <button
              onClick={() => handlePhaseChange('proposing')}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              ▶️ {t.startProposals}
            </button>
          )}

          {currentPhase === 'proposing' && (
            <button
              onClick={() => handlePhaseChange('reviewing')}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#f59e0b',
                color: 'white',
                cursor: 'pointer',
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              📝 {t.startReview}
            </button>
          )}

          {(currentPhase === 'reviewing' || currentPhase === 'proposing') && (
            <button
              onClick={handleFinishStage0}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                cursor: 'pointer',
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              ✓ {t.finishAndStart}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        maxWidth: 1000,
        margin: '0 auto 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 12,
      }}>
        <StatCard value={stats.total} label={t.totalProposals} color="#6366f1" />
        <StatCard value={stats.pending} label={t.pendingCount} color="#f59e0b" />
        <StatCard value={stats.approved} label={t.approvedCount} color="#22c55e" />
        <StatCard value={stats.rejected} label={t.rejectedCount} color="#ef4444" />
        <StatCard value={`${readyTeamsCount}/${totalTeams}`} label={t.teamsReady} color="#8b5cf6" />
      </div>

      {/* Filters */}
      <div style={{
        maxWidth: 1000,
        margin: '0 auto 24px',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4, backgroundColor: 'white', padding: 4, borderRadius: 10 }}>
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                backgroundColor: filterStatus === status ? primaryColor : 'transparent',
                color: filterStatus === status ? 'white' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {status === 'all' ? t.filterAll :
               status === 'pending' ? `${t.filterPending} (${stats.pending})` :
               status === 'approved' ? `${t.filterApproved} (${stats.approved})` :
               `${t.filterRejected} (${stats.rejected})`}
            </button>
          ))}
        </div>

        {/* Team filter */}
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            borderRadius: 10,
            border: '2px solid #e2e8f0',
            backgroundColor: 'white',
          }}
        >
          <option value="all">{t.allTeams}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      {/* Proposals list */}
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {filteredProposals.length === 0 ? (
          <div style={{
            padding: 48,
            backgroundColor: 'white',
            borderRadius: 16,
            textAlign: 'center',
            color: '#64748b',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <p>{allProposals.length === 0 ? t.noProposals : t.noProposalsFiltered}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                style={{
                  padding: 20,
                  backgroundColor: 'white',
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: proposal.status === 'pending' ? `2px solid ${primaryColor}` : '2px solid transparent',
                }}
              >
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: bgColor,
                      borderRadius: 8,
                      fontWeight: 600,
                      color: primaryColor,
                      fontSize: 14,
                    }}>
                      {proposal.teamName}
                    </span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>
                      {getProposalTypeLabel(proposal.type, language)}
                    </span>
                  </div>
                  {getStatusBadge(proposal.status)}
                </div>

                {/* Content */}
                {editingId === proposal.id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 15,
                      borderRadius: 10,
                      border: `2px solid ${primaryColor}`,
                      marginBottom: 12,
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <p style={{
                    margin: '0 0 12px',
                    fontSize: 15,
                    color: '#1e293b',
                    lineHeight: 1.6,
                  }}>
                    {proposal.editedText || proposal.questionText}
                  </p>
                )}

                {/* Metadata */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                  {proposal.relatedTopic && (
                    <div style={{ fontSize: 13, color: '#6366f1' }}>
                      🔗 <strong>{t.relatedTo}:</strong> {proposal.relatedTopic}
                    </div>
                  )}
                  {proposal.hint && (
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      💡 <strong>{t.hint}:</strong> {proposal.hint}
                    </div>
                  )}
                  {proposal.submittedBy && (
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      👤 <strong>{t.proposedBy}:</strong> {proposal.submittedBy}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {proposal.status === 'pending' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    paddingTop: 12,
                    borderTop: '1px solid #e2e8f0',
                  }}>
                    {/* Bonus points input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                        {t.bonusLabel}:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={bonusPoints[proposal.id] || 0}
                        onChange={(e) => setBonusPoints(prev => ({
                          ...prev,
                          [proposal.id]: parseInt(e.target.value) || 0
                        }))}
                        style={{
                          width: 60,
                          padding: '6px 10px',
                          fontSize: 14,
                          borderRadius: 8,
                          border: '2px solid #e2e8f0',
                          textAlign: 'center',
                        }}
                      />
                    </div>

                    <div style={{ flex: 1 }} />

                    {editingId === proposal.id ? (
                      <>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 8,
                            border: '2px solid #e2e8f0',
                            backgroundColor: 'white',
                            color: '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          {t.cancelEdit}
                        </button>
                        <button
                          onClick={() => handleEditSave(proposal)}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ {t.saveEdit}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStart(proposal)}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 8,
                            border: '2px solid #3b82f6',
                            backgroundColor: 'white',
                            color: '#3b82f6',
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ {t.edit}
                        </button>
                        <button
                          onClick={() => handleReject(proposal)}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                        >
                          ❌ {t.reject}
                        </button>
                        <button
                          onClick={() => handleApprove(proposal)}
                          style={{
                            padding: '8px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: '#22c55e',
                            color: 'white',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ {t.approve} {(bonusPoints[proposal.id] || 0) > 0 && `(+${bonusPoints[proposal.id]} ${t.points})`}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Show bonus if already reviewed */}
                {(proposal.status === 'approved' || proposal.status === 'edited') && (
                  <div style={{
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    {proposal.bonusPoints > 0 && (
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#92400e',
                        fontWeight: 500,
                      }}>
                        ⭐ +{proposal.bonusPoints} {t.bonusPoints}
                      </div>
                    )}
                    
                    {/* Save to library button */}
                    {!proposal.savedToLibrary && !savedIds.has(proposal.id) ? (
                      <button
                        onClick={() => handleSaveToLibrary(proposal)}
                        style={{
                          padding: '8px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: '2px solid #8b5cf6',
                          backgroundColor: 'white',
                          color: '#8b5cf6',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        📚 {t.saveToLibrary}
                      </button>
                    ) : (
                      <span style={{
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        backgroundColor: '#f3e8ff',
                        color: '#7c3aed',
                      }}>
                        ✓ {t.savedToLibrary}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component
function StatCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: 'white',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}