// src/components/Stage0/ProposalCurationView.tsx
// Pantalla donde el profesor cura las propuestas de los equipos
// ✅ ACTUALIZADO: Incluye campo de hint para Stage 2

import { useState, useEffect } from "react";
import { ref, onValue, off, update, get } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { Team, Question } from "../../types/game";

interface Proposal {
  id: string;
  teamId: string;
  teamName: string;
  teamEmoji: string;
  questionText: string;
  suggestedStage: 1 | 2;
  status: 'pending' | 'accepted' | 'rejected' | 'edited';
  assignedStage?: 1 | 2;
  editedText?: string;
  createdAt: number;
}

// ✅ NUEVO: Tipo para propuesta seleccionada con hint
interface SelectedProposal {
  stage: 1 | 2;
  text: string;
  hint: string;
}

interface ProposalCurationViewProps {
  gameId: string;
  teams: Team[];
  onComplete: (questions: Question[], bonusPoints: Record<string, number>) => void;
  onBack: () => void;
}

export function ProposalCurationView({ gameId, teams, onComplete, onBack }: ProposalCurationViewProps) {
  const { language } = useI18n();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  // ✅ MODIFICADO: Ahora incluye hint
  const [selectedProposals, setSelectedProposals] = useState<Map<string, SelectedProposal>>(new Map());
  const [bonusPoints, setBonusPoints] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editHint, setEditHint] = useState('');
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualHint, setManualHint] = useState('');
  const [manualStage, setManualStage] = useState<1 | 2>(1);

  // Traducciones
  const t = {
    title: language === 'es' ? 'Curado de propuestas' : 'Proposal curation',
    subtitle: language === 'es' ? 'Seleccioná las consignas para el juego' : 'Select questions for the game',
    
    received: language === 'es' ? 'recibidas' : 'received',
    selected: language === 'es' ? 'seleccionadas' : 'selected',
    
    filterAll: language === 'es' ? 'Todas' : 'All',
    filterPending: language === 'es' ? 'Pendientes' : 'Pending',
    filterAccepted: language === 'es' ? 'Aceptadas' : 'Accepted',
    
    tipTitle: language === 'es' ? '💡 Para Etapa 2' : '💡 For Stage 2',
    tipContent: language === 'es'
      ? 'Priorizá consignas que impliquen comprensión profunda, relaciones entre ideas, explicaciones, justificaciones o puntos de vista.'
      : 'Prioritize prompts that involve deep understanding, relationships between ideas, explanations, justifications, or points of view.',
    
    stage1: language === 'es' ? 'Etapa 1' : 'Stage 1',
    stage2: language === 'es' ? 'Etapa 2' : 'Stage 2',
    
    accept: language === 'es' ? 'Aceptar' : 'Accept',
    edit: language === 'es' ? 'Editar' : 'Edit',
    reject: language === 'es' ? 'Rechazar' : 'Reject',
    save: language === 'es' ? 'Guardar' : 'Save',
    cancel: language === 'es' ? 'Cancelar' : 'Cancel',
    
    addManual: language === 'es' ? '+ Agregar consigna propia' : '+ Add own question',
    manualPlaceholder: language === 'es' ? 'Escribí tu consigna...' : 'Write your question...',
    
    // ✅ NUEVO: Traducciones para hint
    hint: language === 'es' ? 'Pista' : 'Hint',
    hintPlaceholder: language === 'es' ? 'Pista opcional para Etapa 2 (se muestra antes de responder)' : 'Optional hint for Stage 2 (shown before answering)',
    hintDesc: language === 'es' ? 'La pista ayuda a orientar la respuesta en Etapa 2' : 'The hint helps guide the answer in Stage 2',
    addHint: language === 'es' ? '+ Agregar pista' : '+ Add hint',
    
    summary: language === 'es' ? 'Resumen' : 'Summary',
    stage1Questions: language === 'es' ? 'consignas Etapa 1' : 'Stage 1 questions',
    stage2Questions: language === 'es' ? 'consignas Etapa 2' : 'Stage 2 questions',
    minimum: language === 'es' ? 'mínimo' : 'minimum',
    
    bonusTitle: language === 'es' ? 'Puntos bonus por equipo' : 'Bonus points by team',
    bonusDesc: language === 'es' 
      ? 'Asigná puntos bonus según el aporte de cada equipo'
      : 'Assign bonus points based on each team\'s contribution',
    points: language === 'es' ? 'pts' : 'pts',
    
    finish: language === 'es' ? '✓ Finalizar curado y comenzar' : '✓ Finish curation and start',
    needMore: language === 'es' 
      ? 'Necesitás al menos 10 consignas por etapa'
      : 'You need at least 10 questions per stage',
    
    back: language === 'es' ? '← Volver' : '← Back',
  };

  // Cargar propuestas
  useEffect(() => {
    const proposalsRef = ref(database, `games/${gameId}/stage0/proposals`);
    
    const unsubscribe = onValue(proposalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: Proposal[] = Object.entries(data).map(([id, p]: [string, any]) => ({
          id,
          ...p,
        }));
        list.sort((a, b) => a.createdAt - b.createdAt);
        setProposals(list);
      }
    });

    return () => off(proposalsRef);
  }, [gameId]);

  // Inicializar bonus points
  useEffect(() => {
    const initial: Record<string, number> = {};
    teams.forEach(team => {
      initial[team.id] = 0;
    });
    setBonusPoints(initial);
  }, [teams]);

  // Filtrar propuestas
  const filteredProposals = proposals.filter(p => {
    if (filter === 'pending') return !selectedProposals.has(p.id);
    if (filter === 'accepted') return selectedProposals.has(p.id);
    return true;
  });

  // Contar por etapa
  const stage1Count = Array.from(selectedProposals.values()).filter(s => s.stage === 1).length;
  const stage2Count = Array.from(selectedProposals.values()).filter(s => s.stage === 2).length;

  // Aceptar propuesta
  const handleAccept = (proposal: Proposal, stage: 1 | 2) => {
    const newSelected = new Map(selectedProposals);
    const existing = newSelected.get(proposal.id);
    newSelected.set(proposal.id, { 
      stage, 
      text: existing?.text || proposal.editedText || proposal.questionText,
      hint: existing?.hint || '',
    });
    setSelectedProposals(newSelected);
  };

  // Rechazar propuesta
  const handleReject = (proposalId: string) => {
    const newSelected = new Map(selectedProposals);
    newSelected.delete(proposalId);
    setSelectedProposals(newSelected);
  };

  // Editar propuesta
  const handleStartEdit = (proposal: Proposal) => {
    const selectedData = selectedProposals.get(proposal.id);
    setEditingId(proposal.id);
    setEditText(selectedData?.text || proposal.questionText);
    setEditHint(selectedData?.hint || '');
  };

  const handleSaveEdit = (proposalId: string) => {
    const current = selectedProposals.get(proposalId);
    if (current) {
      const newSelected = new Map(selectedProposals);
      newSelected.set(proposalId, { 
        ...current, 
        text: editText,
        hint: editHint,
      });
      setSelectedProposals(newSelected);
    }
    setEditingId(null);
    setEditText('');
    setEditHint('');
  };

  // ✅ NUEVO: Actualizar solo el hint
  const handleUpdateHint = (proposalId: string, hint: string) => {
    const current = selectedProposals.get(proposalId);
    if (current) {
      const newSelected = new Map(selectedProposals);
      newSelected.set(proposalId, { ...current, hint });
      setSelectedProposals(newSelected);
    }
  };

  // Agregar consigna manual
  const handleAddManual = () => {
    if (!manualQuestion.trim()) return;
    
    const manualId = `manual_${Date.now()}`;
    const newProposal: Proposal = {
      id: manualId,
      teamId: 'teacher',
      teamName: language === 'es' ? 'Profesor' : 'Teacher',
      teamEmoji: '👨‍🏫',
      questionText: manualQuestion.trim(),
      suggestedStage: manualStage,
      status: 'accepted',
      createdAt: Date.now(),
    };
    
    setProposals(prev => [...prev, newProposal]);
    
    const newSelected = new Map(selectedProposals);
    newSelected.set(manualId, { 
      stage: manualStage, 
      text: manualQuestion.trim(),
      hint: manualHint.trim(),
    });
    setSelectedProposals(newSelected);
    
    setManualQuestion('');
    setManualHint('');
    setManualStage(1);
    setShowAddManual(false);
  };

  // Finalizar curado
  const handleComplete = () => {
    const questions: Question[] = [];
    let order = 1;
    
    // Primero las de etapa 1
    selectedProposals.forEach((value, id) => {
      if (value.stage === 1) {
        questions.push({
          id: `q_${order}`,
          questionText: value.text,
          hint: value.hint || '',
          stage: 1,
          order: order,
        });
        order++;
      }
    });
    
    // Luego las de etapa 2
    selectedProposals.forEach((value, id) => {
      if (value.stage === 2) {
        questions.push({
          id: `q_${order}`,
          questionText: value.text,
          hint: value.hint || '',
          stage: 2,
          order: order,
        });
        order++;
      }
    });
    
    onComplete(questions, bonusPoints);
  };

  const canFinish = stage1Count >= 10 && stage2Count >= 10;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            📋 {t.title}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
            {proposals.length} {t.received} • {selectedProposals.size} {t.selected}
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            backgroundColor: '#e2e8f0',
            color: '#475569',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {t.back}
        </button>
      </div>

      {/* Tip */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto 20px',
        padding: '14px 20px',
        backgroundColor: '#ede9fe',
        borderRadius: 12,
        border: '1px solid #c4b5fd',
      }}>
        <span style={{ fontWeight: 600, color: '#7c3aed' }}>{t.tipTitle}: </span>
        <span style={{ color: '#6d28d9' }}>{t.tipContent}</span>
      </div>

      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 24,
      }}>
        {/* Columna izquierda: Propuestas */}
        <div>
          {/* Filtros */}
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'pending', 'accepted'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: filter === f ? 700 : 500,
                    backgroundColor: filter === f ? '#8b5cf6' : 'white',
                    color: filter === f ? 'white' : '#64748b',
                    border: '1px solid',
                    borderColor: filter === f ? '#8b5cf6' : '#e2e8f0',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  {f === 'all' ? t.filterAll : f === 'pending' ? t.filterPending : t.filterAccepted}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowAddManual(true)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #86efac',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {t.addManual}
            </button>
          </div>

          {/* Modal agregar manual */}
          {showAddManual && (
            <div style={{
              marginBottom: 16,
              padding: 20,
              backgroundColor: 'white',
              borderRadius: 12,
              border: '2px solid #22c55e',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              <textarea
                value={manualQuestion}
                onChange={(e) => setManualQuestion(e.target.value)}
                placeholder={t.manualPlaceholder}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  resize: 'none',
                  marginBottom: 12,
                  boxSizing: 'border-box',
                }}
              />
              
              {/* ✅ NUEVO: Campo de hint en manual */}
              {manualStage === 2 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>
                    💡 {t.hint} ({t.stage2})
                  </label>
                  <input
                    type="text"
                    value={manualHint}
                    onChange={(e) => setManualHint(e.target.value)}
                    placeholder={t.hintPlaceholder}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      border: '1px solid #c4b5fd',
                      borderRadius: 6,
                      backgroundColor: '#faf5ff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <select
                  value={manualStage}
                  onChange={(e) => setManualStage(Number(e.target.value) as 1 | 2)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                  }}
                >
                  <option value={1}>{t.stage1}</option>
                  <option value={2}>{t.stage2}</option>
                </select>
                <button
                  onClick={handleAddManual}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {t.save}
                </button>
                <button
                  onClick={() => { setShowAddManual(false); setManualQuestion(''); setManualHint(''); }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    backgroundColor: '#e2e8f0',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Lista de propuestas */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 12,
            maxHeight: '60vh',
            overflow: 'auto',
          }}>
            {filteredProposals.map(proposal => {
              const isSelected = selectedProposals.has(proposal.id);
              const selectedData = selectedProposals.get(proposal.id);
              const isEditing = editingId === proposal.id;
              const isStage2 = selectedData?.stage === 2;
              
              return (
                <div
                  key={proposal.id}
                  style={{
                    padding: 16,
                    backgroundColor: isSelected ? '#f0fdf4' : 'white',
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? '#22c55e' : '#e2e8f0'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{proposal.teamEmoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                        {proposal.teamName}
                      </span>
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
                    
                    {isSelected && (
                      <span style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        backgroundColor: selectedData?.stage === 2 ? '#8b5cf6' : '#22c55e',
                        color: 'white',
                      }}>
                        ✓ {selectedData?.stage === 2 ? t.stage2 : t.stage1}
                      </span>
                    )}
                  </div>

                  {/* Texto */}
                  {isEditing ? (
                    <div style={{ marginBottom: 12 }}>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: 14,
                          border: '2px solid #8b5cf6',
                          borderRadius: 8,
                          resize: 'none',
                          boxSizing: 'border-box',
                          marginBottom: 8,
                        }}
                      />
                      
                      {/* ✅ NUEVO: Campo de hint en edición */}
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>
                          💡 {t.hint}
                        </label>
                        <input
                          type="text"
                          value={editHint}
                          onChange={(e) => setEditHint(e.target.value)}
                          placeholder={t.hintPlaceholder}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: 13,
                            border: '1px solid #c4b5fd',
                            borderRadius: 6,
                            backgroundColor: '#faf5ff',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleSaveEdit(proposal.id)}
                          style={{
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          {t.save}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditHint(''); }}
                          style={{
                            padding: '6px 14px',
                            fontSize: 12,
                            backgroundColor: '#e2e8f0',
                            color: '#64748b',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: 15,
                        color: '#1e293b',
                        lineHeight: 1.5,
                      }}>
                        "{selectedData?.text || proposal.questionText}"
                      </p>
                      
                      {/* ✅ NUEVO: Mostrar hint si existe y está seleccionada para Stage 2 */}
                      {isSelected && isStage2 && (
                        <div style={{ marginBottom: 12 }}>
                          {selectedData?.hint ? (
                            <div style={{
                              padding: '8px 12px',
                              backgroundColor: '#faf5ff',
                              borderRadius: 6,
                              border: '1px solid #e9d5ff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}>
                              <span style={{ fontSize: 14 }}>💡</span>
                              <span style={{ fontSize: 13, color: '#7c3aed', flex: 1 }}>
                                {selectedData.hint}
                              </span>
                              <button
                                onClick={() => handleStartEdit(proposal)}
                                style={{
                                  padding: '2px 8px',
                                  fontSize: 11,
                                  backgroundColor: 'transparent',
                                  color: '#8b5cf6',
                                  border: '1px solid #c4b5fd',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                }}
                              >
                                ✏️
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(proposal)}
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                backgroundColor: '#faf5ff',
                                color: '#8b5cf6',
                                border: '1px dashed #c4b5fd',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              💡 {t.addHint}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Acciones */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {!isSelected ? (
                        <>
                          <button
                            onClick={() => handleAccept(proposal, 1)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            ✓ {t.stage1}
                          </button>
                          <button
                            onClick={() => handleAccept(proposal, 2)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#ede9fe',
                              color: '#7c3aed',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            ✓ {t.stage2}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(proposal)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#f0f9ff',
                              color: '#0369a1',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ {t.edit}
                          </button>
                          <button
                            onClick={() => handleAccept(proposal, selectedData?.stage === 1 ? 2 : 1)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              backgroundColor: '#f8fafc',
                              color: '#64748b',
                              border: '1px solid #e2e8f0',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            → {selectedData?.stage === 1 ? t.stage2 : t.stage1}
                          </button>
                          <button
                            onClick={() => handleReject(proposal.id)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: '#fee2e2',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            ✕ {t.reject}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: Resumen y bonus */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Resumen */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              📊 {t.summary}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: stage1Count >= 10 ? '#dcfce7' : '#fef3c7',
                borderRadius: 10,
                border: `1px solid ${stage1Count >= 10 ? '#86efac' : '#fde68a'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#1e293b' }}>{t.stage1}</span>
                  <span style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: stage1Count >= 10 ? '#15803d' : '#b45309',
                  }}>
                    {stage1Count}/10
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  ({t.minimum} 10)
                </div>
              </div>
              
              <div style={{
                padding: '12px 16px',
                backgroundColor: stage2Count >= 10 ? '#ede9fe' : '#fef3c7',
                borderRadius: 10,
                border: `1px solid ${stage2Count >= 10 ? '#c4b5fd' : '#fde68a'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#1e293b' }}>{t.stage2}</span>
                  <span style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: stage2Count >= 10 ? '#7c3aed' : '#b45309',
                  }}>
                    {stage2Count}/10
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  ({t.minimum} 10)
                </div>
              </div>
            </div>
          </div>

          {/* Bonus points */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              ⭐ {t.bonusTitle}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>
              {t.bonusDesc}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {teams.map(team => {
                const teamProposalCount = proposals.filter(p => p.teamId === team.id).length;
                const teamAcceptedCount = Array.from(selectedProposals.entries())
                  .filter(([id]) => proposals.find(p => p.id === id)?.teamId === team.id)
                  .length;
                
                return (
                  <div
                    key={team.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{(team as any).emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                        {team.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {teamAcceptedCount}/{teamProposalCount} {language === 'es' ? 'aceptadas' : 'accepted'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={bonusPoints[team.id] || 0}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(50, Number(e.target.value) || 0));
                          setBonusPoints(prev => ({ ...prev, [team.id]: value }));
                        }}
                        style={{
                          width: 50,
                          padding: '6px 8px',
                          fontSize: 14,
                          fontWeight: 600,
                          textAlign: 'center',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#64748b' }}>{t.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón finalizar */}
          <button
            onClick={handleComplete}
            disabled={!canFinish}
            style={{
              padding: '18px 24px',
              fontSize: 17,
              fontWeight: 700,
              backgroundColor: canFinish ? '#8b5cf6' : '#e2e8f0',
              color: canFinish ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: 12,
              cursor: canFinish ? 'pointer' : 'not-allowed',
            }}
          >
            {t.finish}
          </button>
          
          {!canFinish && (
            <p style={{ 
              margin: '-8px 0 0 0', 
              fontSize: 12, 
              color: '#f59e0b', 
              textAlign: 'center',
            }}>
              {t.needMore}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}