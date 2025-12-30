// src/components/Stage0/ProposalStudentView.tsx
// Vista del alumno/equipo para crear y enviar propuestas de consignas

import { useState, useEffect } from "react";
import { ref, onValue, off, push, get, update, set } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";

interface MaterialItem {
  id: string;
  type: 'file' | 'text' | 'link';
  name: string;
  content: string;
}

interface ProposalStudentViewProps {
  gameId: string;
  teamId: string;
  teamName: string;
  teamEmoji: string;
}

export function ProposalStudentView({ gameId, teamId, teamName, teamEmoji }: ProposalStudentViewProps) {
  const { language } = useI18n();
  
  const [proposalText, setProposalText] = useState('');
  const [suggestedStage, setSuggestedStage] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myProposals, setMyProposals] = useState<any[]>([]);
  const [maxProposals, setMaxProposals] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [showMaterial, setShowMaterial] = useState<string | null>(null);
  // ✅ CORREGIDO: Agregar 'waiting' como fase válida
  const [phase, setPhase] = useState<'waiting' | 'collecting' | 'curating' | 'done'>('waiting');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Traducciones
  const t = {
    title: language === 'es' ? 'Proponé consignas' : 'Propose questions',
    timeRemaining: language === 'es' ? 'Tiempo restante' : 'Time remaining',
    
    materials: language === 'es' ? 'Material de referencia' : 'Reference material',
    viewMaterial: language === 'es' ? 'Ver' : 'View',
    closeMaterial: language === 'es' ? 'Cerrar' : 'Close',
    
    tipTitle: language === 'es' ? '💡 Podés proponer:' : '💡 You can propose:',
    tipItems: language === 'es' 
      ? [
          'Preguntas de comprensión',
          'Consignas que pidan relacionar ideas',
          'Actividades: "Explicá...", "Compará...", "Justificá..."',
        ]
      : [
          'Comprehension questions',
          'Prompts that ask to relate ideas',
          'Activities: "Explain...", "Compare...", "Justify..."',
        ],
    tipStage2: language === 'es'
      ? 'Para Etapa 2 pensá en consignas más profundas que requieran explicar, relacionar o dar puntos de vista.'
      : 'For Stage 2, think of deeper prompts that require explaining, relating, or giving points of view.',
    
    yourProposal: language === 'es' ? 'Tu propuesta' : 'Your proposal',
    proposalPlaceholder: language === 'es' 
      ? 'Escribí una pregunta o consigna basada en el material...'
      : 'Write a question or prompt based on the material...',
    
    suggestedStage: language === 'es' ? 'Sugerencia de etapa' : 'Suggested stage',
    stage1: language === 'es' ? 'Etapa 1 (básica)' : 'Stage 1 (basic)',
    stage2: language === 'es' ? 'Etapa 2 (profunda)' : 'Stage 2 (deep)',
    
    submit: language === 'es' ? 'Enviar propuesta' : 'Submit proposal',
    submitted: language === 'es' ? '✓ Enviada' : '✓ Submitted',
    
    yourProposals: language === 'es' ? 'Tus propuestas enviadas' : 'Your submitted proposals',
    noProposalsYet: language === 'es' 
      ? 'Todavía no enviaste propuestas'
      : 'You haven\'t submitted proposals yet',
    
    proposalsCount: language === 'es' ? 'enviadas' : 'submitted',
    maxReached: language === 'es' ? '¡Llegaste al máximo!' : 'You reached the maximum!',
    
    closed: language === 'es' 
      ? 'Se cerró la recepción de propuestas'
      : 'Proposal reception is closed',
    waitingCuration: language === 'es'
      ? 'Esperá mientras el profesor organiza el juego...'
      : 'Wait while the teacher organizes the game...',
    
    // ✅ NUEVO: Mensajes para fase waiting
    waitingToStart: language === 'es'
      ? 'Esperando que el profesor inicie la etapa de propuestas...'
      : 'Waiting for teacher to start the proposal stage...',
    connected: language === 'es' ? '¡Conectado!' : 'Connected!',
    waitingHint: language === 'es'
      ? 'Cuando el profesor inicie, vas a poder proponer consignas para el juego.'
      : 'When the teacher starts, you will be able to propose questions for the game.',
  };

  // ✅ NUEVO: Registrar conexión del equipo al montar
  useEffect(() => {
    const registerConnection = async () => {
      // Usar un ID único pero estable para esta sesión
      const sessionId = sessionStorage.getItem('playerSessionId') || `player_${Date.now()}`;
      sessionStorage.setItem('playerSessionId', sessionId);
      
      try {
        // Registrar el jugador en el equipo
        const playerRef = ref(database, `games/${gameId}/teams/${teamId}/players/${sessionId}`);
        await set(playerRef, {
          connectedAt: Date.now(),
          name: 'Jugador',
          active: true,
        });
        
        // También marcar el equipo como conectado
        await update(ref(database, `games/${gameId}/teams/${teamId}`), {
          connected: true,
          lastActivity: Date.now(),
        });
        
        console.log('Player registered:', sessionId, 'in team:', teamId);
      } catch (error) {
        console.error('Error registering player:', error);
      }
    };
    
    registerConnection();
  }, [gameId, teamId]);

  // Cargar configuración del juego
  useEffect(() => {
    const configRef = ref(database, `games/${gameId}/config/stage0Config`);
    get(configRef).then(snapshot => {
      if (snapshot.exists()) {
        const config = snapshot.val();
        setMaxProposals(config.maxProposalsPerTeam || 10);
        
        // Cargar materiales si existen
        if (config.materials) {
          setMaterials(Object.values(config.materials));
        }
      }
    });
  }, [gameId]);

  // Escuchar fase y timer
  useEffect(() => {
    const stage0Ref = ref(database, `games/${gameId}/stage0`);
    
    const unsubscribe = onValue(stage0Ref, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // ✅ CORREGIDO: Manejar todas las fases correctamente
        const currentPhase = data.phase || 'waiting';
        setPhase(currentPhase);
        
        // Calcular tiempo restante si hay timer y estamos en collecting
        if (currentPhase === 'collecting' && data.timerStartedAt && data.timerMinutes) {
          const elapsed = Math.floor((Date.now() - data.timerStartedAt) / 1000);
          const remaining = (data.timerMinutes * 60) - elapsed;
          setTimeRemaining(Math.max(0, remaining));
        }
      }
    });

    return () => off(stage0Ref);
  }, [gameId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || phase !== 'collecting') return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => prev !== null ? Math.max(0, prev - 1) : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, phase]);

  // Escuchar mis propuestas
  useEffect(() => {
    const proposalsRef = ref(database, `games/${gameId}/stage0/proposals`);
    
    const unsubscribe = onValue(proposalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allProposals = snapshot.val();
        const mine = Object.entries(allProposals)
          .filter(([_, p]: [string, any]) => p.teamId === teamId)
          .map(([id, p]: [string, any]) => ({ id, ...p }))
          .sort((a: any, b: any) => b.createdAt - a.createdAt);
        setMyProposals(mine);
      }
    });

    return () => off(proposalsRef);
  }, [gameId, teamId]);

  // Enviar propuesta
  const handleSubmit = async () => {
    if (!proposalText.trim() || isSubmitting) return;
    if (myProposals.length >= maxProposals) return;
    
    setIsSubmitting(true);
    
    try {
      const proposalsRef = ref(database, `games/${gameId}/stage0/proposals`);
      await push(proposalsRef, {
        teamId,
        teamName,
        teamEmoji,
        questionText: proposalText.trim(),
        suggestedStage,
        status: 'pending',
        createdAt: Date.now(),
      });
      
      setProposalText('');
      setSuggestedStage(1);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2000);
    } catch (error) {
      console.error('Error submitting proposal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSubmit = proposalText.trim().length > 0 && myProposals.length < maxProposals && phase === 'collecting';
  const isMaxReached = myProposals.length >= maxProposals;

  // ✅ NUEVO: Pantalla de espera antes de que el profesor inicie
  if (phase === 'waiting') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}>
        {/* Header del equipo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 32,
          padding: '16px 24px',
          backgroundColor: '#f0fdf4',
          borderRadius: 16,
          border: '2px solid #22c55e',
        }}>
          <span style={{ fontSize: 40 }}>{teamEmoji}</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>{teamName}</div>
            <div style={{ fontSize: 14, color: '#22c55e' }}>✓ {t.connected}</div>
          </div>
        </div>

        <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
        <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          {t.waitingToStart}
        </h2>
        <p style={{ margin: 0, fontSize: 16, color: '#64748b', maxWidth: 400 }}>
          {t.waitingHint}
        </p>
      </div>
    );
  }

  // Pantalla de espera durante curación
  if (phase === 'curating' || phase === 'done') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
        <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          {t.closed}
        </h2>
        <p style={{ margin: 0, fontSize: 16, color: '#64748b' }}>
          {t.waitingCuration}
        </p>
        <div style={{
          marginTop: 32,
          padding: '16px 24px',
          backgroundColor: '#f0fdf4',
          borderRadius: 12,
          border: '1px solid #86efac',
        }}>
          <span style={{ fontSize: 14, color: '#15803d' }}>
            ✓ {myProposals.length} {t.proposalsCount}
          </span>
        </div>
      </div>
    );
  }

  // Vista principal de propuestas (phase === 'collecting')
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: '16px 20px',
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{teamEmoji}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{teamName}</div>
              <div style={{ fontSize: 13, color: isMaxReached ? '#22c55e' : '#64748b' }}>
                {myProposals.length}/{maxProposals} {t.proposalsCount}
                {isMaxReached && ` - ${t.maxReached}`}
              </div>
            </div>
          </div>
          
          {timeRemaining !== null && (
            <div style={{
              padding: '8px 16px',
              backgroundColor: timeRemaining < 60 ? '#fee2e2' : timeRemaining < 180 ? '#fef3c7' : '#f0f9ff',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                {t.timeRemaining}
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                fontFamily: 'monospace',
                color: timeRemaining < 60 ? '#ef4444' : timeRemaining < 180 ? '#f59e0b' : '#0369a1',
              }}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Materiales */}
      {materials.length > 0 && (
        <div style={{
          backgroundColor: '#f0f9ff',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          border: '1px solid #bae6fd',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>
            📚 {t.materials}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {materials.map(m => (
              <button
                key={m.id}
                onClick={() => setShowMaterial(showMaterial === m.id ? null : m.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: showMaterial === m.id ? '#0369a1' : 'white',
                  color: showMaterial === m.id ? 'white' : '#0369a1',
                  border: '1px solid #0369a1',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {m.type === 'file' ? '📄' : m.type === 'link' ? '🔗' : '📝'} {m.name}
              </button>
            ))}
          </div>
          
          {showMaterial && (
            <div style={{
              marginTop: 12,
              padding: 16,
              backgroundColor: 'white',
              borderRadius: 8,
              maxHeight: 200,
              overflow: 'auto',
            }}>
              {materials.find(m => m.id === showMaterial)?.type === 'link' ? (
                <a 
                  href={materials.find(m => m.id === showMaterial)?.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0369a1', textDecoration: 'underline' }}
                >
                  {materials.find(m => m.id === showMaterial)?.content}
                </a>
              ) : (
                <pre style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', color: '#475569' }}>
                  {materials.find(m => m.id === showMaterial)?.content}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      <div style={{
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 16,
        border: '1px solid #fbbf24',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
          {t.tipTitle}
        </div>
        <ul style={{ margin: '0 0 8px 0', paddingLeft: 20, fontSize: 12, color: '#92400e' }}>
          {t.tipItems.map((item, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{item}</li>
          ))}
        </ul>
        <p style={{ margin: 0, fontSize: 12, color: '#b45309', fontStyle: 'italic' }}>
          {t.tipStage2}
        </p>
      </div>

      {/* Formulario de propuesta */}
      {!isMaxReached && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            {t.yourProposal}
          </label>
          <textarea
            value={proposalText}
            onChange={(e) => setProposalText(e.target.value)}
            placeholder={t.proposalPlaceholder}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              border: '2px solid #e2e8f0',
              borderRadius: 10,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Sugerencia de etapa */}
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 8 }}>
              {t.suggestedStage}
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                padding: '8px 14px',
                backgroundColor: suggestedStage === 1 ? '#dcfce7' : '#f8fafc',
                borderRadius: 8,
                border: `2px solid ${suggestedStage === 1 ? '#22c55e' : '#e2e8f0'}`,
                flex: 1,
                justifyContent: 'center',
              }}>
                <input
                  type="radio"
                  checked={suggestedStage === 1}
                  onChange={() => setSuggestedStage(1)}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: 14, color: suggestedStage === 1 ? '#15803d' : '#64748b' }}>
                  {t.stage1}
                </span>
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                padding: '8px 14px',
                backgroundColor: suggestedStage === 2 ? '#ede9fe' : '#f8fafc',
                borderRadius: 8,
                border: `2px solid ${suggestedStage === 2 ? '#8b5cf6' : '#e2e8f0'}`,
                flex: 1,
                justifyContent: 'center',
              }}>
                <input
                  type="radio"
                  checked={suggestedStage === 2}
                  onChange={() => setSuggestedStage(2)}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: 14, color: suggestedStage === 2 ? '#7c3aed' : '#64748b' }}>
                  {t.stage2}
                </span>
              </label>
            </div>
          </div>

          {/* Botón enviar */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 700,
              backgroundColor: submitSuccess ? '#22c55e' : canSubmit ? '#8b5cf6' : '#e2e8f0',
              color: canSubmit || submitSuccess ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: 10,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {submitSuccess ? t.submitted : isSubmitting ? '...' : t.submit}
          </button>
        </div>
      )}

      {/* Mensaje de máximo alcanzado */}
      {isMaxReached && (
        <div style={{
          backgroundColor: '#f0fdf4',
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
          textAlign: 'center',
          border: '2px solid #86efac',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d' }}>
            {t.maxReached}
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#22c55e' }}>
            {language === 'es' 
              ? 'Esperá a que el profesor cierre la recepción de propuestas.'
              : 'Wait for the teacher to close proposal reception.'}
          </p>
        </div>
      )}

      {/* Mis propuestas */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
          ✅ {t.yourProposals}
        </h3>
        
        {myProposals.length === 0 ? (
          <p style={{ 
            margin: 0, 
            fontSize: 14, 
            color: '#94a3b8', 
            textAlign: 'center',
            padding: '20px 0',
          }}>
            {t.noProposalsYet}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myProposals.map((proposal, index) => (
              <div
                key={proposal.id}
                style={{
                  padding: '12px 14px',
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
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    #{myProposals.length - index}
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
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#1e293b',
                  lineHeight: 1.5,
                }}>
                  {proposal.questionText}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}